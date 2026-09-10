/**
 * Tool registrations for the Storyblok MCP server.
 *
 * Tools are registered using the high-level McpServer.registerTool() API
 * with Zod schemas for inputSchema. The Zod schemas (defined in config.ts)
 * include .describe() annotations that are preserved in the JSON Schema
 * sent to LLM clients.
 *
 * Each tool is registered individually via server.registerTool(), which:
 * - Accepts Zod schemas and converts them to JSON Schema with descriptions
 * - Supports _meta for ext-apps UI integration
 * - Supports outputSchema for structured tool results
 * - Provides the `extra` parameter with sendNotification and sendRequest
 *
 * Handler functions use closure to capture `deps` and `server`, keeping
 * the callback signature clean: (args, extra) => Promise<CallToolResult>
 *
 * @see McpServer.registerTool() in @modelcontextprotocol/sdk
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { OUTPUT_SCHEMAS, createWriteAnnotations } from "./output-schemas.js";
import {
  tryElicit,
  elicitDeleteConfirmation,
  elicitComponentType,
  elicitSectionApproval,
  elicitPageConfirmation,
} from "./elicitation.js";
import { ProgressReporter, type ProgressExtra } from "./progress.js";
import {
  SECTION_PREVIEW_URI,
  PAGE_BUILDER_URI,
  PLAN_REVIEW_URI,
  AUDIT_REPORT_URI,
  clientSupportsExtApps,
} from "./ui/capability.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
// Lazy-loaded to avoid ESM directory import errors from kickstartDS at startup.
// The render module imports @kickstartds/design-system components which
// internally use CJS-style directory imports (e.g. `@kickstartds/base/lib/button`)
// that are not supported in strict ESM resolution. By lazy-loading, the server
// starts successfully and render failures are handled gracefully at call sites.
let _renderModule: typeof import("./ui/render.js") | null = null;
async function getRenderModule() {
  if (!_renderModule) {
    _renderModule = await import("./ui/render.js");
  }
  return _renderModule;
}
import { schemas } from "./config.js";
import {
  StoryblokService,
  ContentGenerationService,
  scrapeUrl,
  PAGE_VALIDATION_RULES,
  registry,
  analyzeContentPatterns,
  checkCompositionalQuality,
  planPageContent,
  generateSectionContent,
  PLACEHOLDER_IMAGE_INSTRUCTIONS,
  runContentAudit,
  type ContentPatternAnalysis,
  type SectionRecipes,
  type PlanPageResult,
  type GenerateSectionResult,
  type RunAuditOptions,
  type ValidationRules,
  stripEmptyAssetFields,
} from "./services.js";
import {
  formatErrorResponse,
  ValidationError,
  ConfigurationError,
} from "./errors.js";

// ── Types ──────────────────────────────────────────────────────────

export interface ToolRegistrationDeps {
  storyblokService: StoryblokService;
  contentService: ContentGenerationService;
  cachedPatterns: { current: ContentPatternAnalysis | null };
  sectionRecipes: Record<string, any>;
  availableIcons: string[];
  /** Global branding token CSS from the Storyblok settings story. */
  globalTokenCss: { current: string | null };
}

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Build a short human-readable summary of a generated section
 * for display in the section approval elicitation message.
 */
function buildSectionSummary(sectionResult: GenerateSectionResult): string {
  const props = sectionResult.designSystemProps;
  if (!props || typeof props !== "object") return "";

  const lines: string[] = [];

  // Extract key text fields for a quick overview
  if (props.headline) lines.push(`Headline: "${props.headline}"`);
  if (props.sub) lines.push(`Subheadline: "${props.sub}"`);

  // Count sub-items (features, FAQs, testimonials, etc.)
  for (const [key, value] of Object.entries(props)) {
    if (Array.isArray(value) && value.length > 0) {
      lines.push(
        `${key}: ${value.length} item${value.length !== 1 ? "s" : ""}`,
      );
    }
  }

  return lines.length > 0 ? lines.join("\n") : "";
}

/**
 * Extract component types from sections for display in the page
 * confirmation elicitation message.
 */
function extractSectionTypes(sections: Record<string, any>[]): string[] {
  return sections.map((s) => {
    if (s.component === "section" && Array.isArray(s.components)) {
      return s.components[0]?.component || "section";
    }
    return s.component || "unknown";
  });
}

/**
 * Run compositional quality checks on sections and return warnings.
 * Non-blocking — failures are logged and return empty array.
 */
function getCompositionalWarnings(
  sections: Record<string, any>[],
  contentType?: string,
): Array<{
  level: string;
  message: string;
  path?: string;
  suggestion?: string;
}> {
  try {
    const rules =
      contentType && registry.has(contentType)
        ? registry.get(contentType).rules
        : PAGE_VALIDATION_RULES;
    return checkCompositionalQuality(sections, rules, {
      format: "auto",
    });
  } catch (err) {
    console.error(`[MCP] Warning: Compositional check failed: ${err}`);
    return [];
  }
}

/**
 * Build a tool result for write operations with resource link annotations.
 */
function buildWriteResult(
  storyblokService: StoryblokService,
  data: Record<string, any>,
  result: Record<string, any>,
): Record<string, any> {
  const storyId = result?.id || result?.story?.id;
  const storyName = result?.name || result?.story?.name;
  const response: Record<string, any> = {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };

  if (storyId) {
    const { annotations, resourceLinks } = createWriteAnnotations(
      storyblokService.getSpaceId(),
      storyId,
      storyName,
    );
    response.content[0].annotations = annotations;
    response._meta = { resourceLinks };
  }

  return response;
}

// ── Tool descriptions ──────────────────────────────────────────────
// Rich multi-line descriptions for LLM comprehension.
// Passed to server.registerTool() alongside the Zod schemas from config.ts.

const TOOL_DESCRIPTIONS: Record<string, string> = {
  generate_content: `Generate structured content using AI (OpenAI GPT-4).

This is the recommended way to produce content that is guaranteed to comply with
the Design System's JSON Schema. The schema is auto-derived and enforced by
OpenAI's structured output. Content produced by this tool can be passed directly
to \`create_page_with_content\` or \`import_content_at_position\`.

You can either:
- Provide a custom JSON schema via the 'schema' parameter (advanced), OR
- Let the tool auto-derive the schema by providing 'componentType' and/or 'sectionCount'

When using auto-derived schemas, the tool automatically:
1. Prepares the Design System schema for OpenAI compatibility
2. Generates content via OpenAI
3. Post-processes the response back to Design System format
4. Flattens the content for Storyblok import

Example use cases:
- Generate a hero section with headline, text, and CTA
- Create a features section with multiple feature items
- Generate FAQ content with questions and answers
- Create testimonials with quotes and author info`,

  import_content: `Import generated content into a Storyblok story.

This tool replaces a prompter component in a story with new section content.
It's used after generating content with AI to persist it into the CMS.

Content is validated against the Design System's JSON Schema before import.
Invalid component nesting (e.g. placing a sub-component directly in a
top-level container) will be rejected with an actionable error message.
Use \`generate_content\` to produce schema-valid content, or consult
\`list_components\` to check the \`allowedIn\` field for each component.

The tool:
1. Validates content against the Design System schema
2. Fetches the current story
3. Finds the prompter component by its UID
4. Replaces it with the new sections
5. Saves the story as a draft`,

  import_content_at_position: `Import content into an existing Storyblok story at a specific position.

Inserts section content at a given index in the story's section array without
removing any existing content. This is useful for adding new sections to an
existing page without replacing anything.

Content is validated against the Design System's JSON Schema before import.
Invalid component nesting (e.g. placing a sub-component directly in a
top-level container) will be rejected with an actionable error message.
Use \`generate_content\` to produce schema-valid content, or consult
\`list_components\` to check the \`allowedIn\` field for each component.

Position semantics:
- 0 = insert at the beginning
- -1 = append at the end
- Any other number = insert at that index (clamped to bounds)`,

  create_page_with_content: `Create a new page in Storyblok pre-populated with section content.

This is the recommended way to create a brand new page with AI-generated or
pre-built content. It handles all the boilerplate:
1. Validates sections against the Design System's JSON Schema
2. Auto-generates _uid fields for every nested component that is missing one
3. Wraps sections in a standard "page" component envelope
4. Presents a page preview for user confirmation before creating
5. Creates the story in Storyblok

Before creating the page, a confirmation gate ensures the user reviews:

- When the response contains \`awaitUserAction: true\`, a page builder UI
  preview with all sections is displayed. STOP and do NOT create the page
  or call any other tool. Wait for the user to reorder/remove sections and
  then save or discard via the UI (which triggers the save_page app-only tool).
- When elicitation is available (no UI preview), the user is asked to choose:
  save as draft, publish immediately, or discard entirely.
- Otherwise, the page is created using the explicit \`publish\` parameter.
  Present the result to the user for confirmation.

Sections are validated against the Design System's JSON Schema before saving.
Each container slot (e.g. a section's component list) only accepts the component
types defined by the schema. Sub-components that belong inside a parent component
cannot be placed directly at the top level. Use \`generate_content\` to produce
schema-valid content, or consult \`list_components\` to check the \`allowedIn\`
field for each component.

Supports automatic folder creation via the 'path' parameter: provide a
forward-slash-separated folder path (e.g. 'en/services/consulting') and
missing intermediate folders are created automatically, like mkdir -p.

Before calling this tool, ensure you have generated SEO metadata using
\`generate_seo\` and passed it via \`rootFields: { seo: <result> }\`.
For hybrid content types (e.g. blog-post), also use \`generate_root_field\`
for each root field (head, aside, cta) before creating the page.

Use this instead of create_story when you have section content ready to go.`,

  get_ideas: `Fetch ideas from the Storyblok space.

Ideas in Storyblok are suggestions or notes that can be associated with stories.
This tool retrieves all ideas in the space for review or processing.`,

  list_stories: `List stories in the Storyblok space with optional filtering.

Use this to browse content, find stories by type, or paginate through large collections.

Returns story metadata by default (id, slug, name, timestamps, published status).
Pass excludeContent: false to include the full content tree — use sparingly, as
it significantly increases response size (~5,000 tokens per story).`,

  get_story: `Get a single story with its full content.

Retrieves the complete story including all nested components and content.
Useful for inspecting existing content or getting a template structure.`,

  create_story: `Create a new story in Storyblok.

Creates a new page, blog post, or other content type with the specified content.
The content should match the component schema for the content type.

Content is validated against the Design System's JSON Schema before saving.
Component nesting must comply with the schema's composition rules —
sub-components can only appear inside their designated parent slots.

Supports automatic folder creation via the 'path' parameter: provide a
forward-slash-separated folder path (e.g. 'en/blog') and missing intermediate
folders are created automatically, like mkdir -p.`,

  update_story: `Update an existing story in Storyblok.

Modifies story content, name, or slug. Can optionally publish the changes.

Content is validated against the Design System's JSON Schema before saving.
Component nesting must comply with the schema's composition rules —
sub-components can only appear inside their designated parent slots.`,

  delete_story: `Delete a story from Storyblok.

Permanently removes the story. This action cannot be undone.`,

  list_components: `List all components defined in the Storyblok space.

Returns all component schemas including:
- Component name and display name
- Field definitions and types
- Validation rules
- Available presets
- Nesting constraints (allowedIn, isSubComponent)

Note: Not all components can be used everywhere. Check the \`allowedIn\` and
\`isSubComponent\` fields to understand where each component can be placed.
Sub-components can only be used inside their parent component's designated
slot — they cannot be placed directly into a top-level container.

Useful for understanding what content structures are available.`,

  get_component: `Get detailed information about a specific component.

Returns the full component schema including:
- All field definitions
- Field types (text, bloks, asset, etc.)
- Restrictions and validations
- Default values
- Composition rules (where the component can be placed, child slots)

Note: Components have nesting constraints defined by the Design System's JSON
Schema. Check the \`composition_rules\` field to understand where a component
can be placed and which sub-components it accepts.

Use this to understand how to structure content for a component.`,

  list_assets: `List assets (images, files) in the Storyblok space.

Returns asset metadata including:
- Filename and URL
- File type and size
- Alt text
- Folder location`,

  search_content: `Search for content across all stories.

Performs a full-text search across story content.
Useful for finding specific text, topics, or references.`,

  scrape_url: `Fetch a web page and convert it to Markdown.

Use this tool to scrape content from any public URL and get clean Markdown output.
This is useful as a preparation step before creating new content in Storyblok —
the extracted Markdown (including images) can be used as input for content generation.

The tool:
1. Fetches the page HTML with a browser-like User-Agent
2. Parses into a full DOM via JSDOM
3. Runs @mozilla/readability to isolate the main article content
   (falls back to CSS-selector / <main> / <body> if Readability returns nothing)
4. Converts the readable HTML to clean Markdown using Turndown
5. Extracts images from <img>, <picture>/<source>, CSS background-image,
   lazy-loading data attributes, and Open Graph / meta tags

Returns the page title, source URL, Markdown content, and a structured images
array with src, alt, and context (content / background / meta / picture-source).`,

  list_icons: `List all available icon identifiers.

Returns the complete set of icon names that can be used in component icon fields
(e.g. hero cta_icon, feature icon, contact-info icon).

Use this tool before generating or importing content that includes icon fields
to ensure only valid icon identifiers are used.`,

  analyze_content_patterns: `Analyze content patterns across all published stories in the Storyblok space.

This tool reads all existing stories and extracts structural patterns —
no AI call needed, pure structural analysis. Use this BEFORE creating new
content to understand the site's established style and produce content that
feels native.

Returns:
- Component frequency (which components are actually used and how often)
- Common section sequences (which components typically follow each other)
- Section compositions (which components are grouped together in sections)
- Sub-component item counts (e.g. features typically has 4 items on this site)
- Page archetypes (recurring full-page patterns)
- Unused components (available but never used on this site)

This is the single most important tool for creating consistent content.
Call it before planning any new page.`,

  list_recipes: `List curated section recipes, page templates, and anti-patterns.

Returns proven component combinations merged with live patterns from the
current Storyblok space (when includePatterns is true).

Use this tool when planning a page to understand:
- Which component combinations work well together (recipes)
- Ready-made page templates for common page types
- Anti-patterns to avoid (e.g. duplicate heroes, sparse stats)
- How this specific site uses components (live patterns)

This combines universal best practices with site-specific intelligence.`,

  plan_page: `Plan a page structure with AI-assisted section selection.

Returns a recommended section sequence based on the page intent, available
components, and the site's existing content patterns. Does NOT generate
content — only plans the structure.

After planning, a review gate ensures the user can approve or modify the plan:

- When the response contains \`awaitUserAction: true\`, a plan review UI is
  displayed. STOP and do NOT call any further tools until the user has acted
  via the UI (which triggers approve_plan).
- Otherwise, present the plan to the user and wait for their approval before
  generating sections.

Use the returned plan to generate each section individually with
\`generate_content(componentType=...)\` for best results.

Requires OpenAI API key for the planning AI call.`,

  generate_section: `Generate a single section with site-aware context.

A convenience wrapper around \`generate_content\` that automatically:
1. Analyzes the site's content patterns
2. Injects site-specific context into the system prompt (e.g. typical sub-item counts)
3. Accepts optional previous/next section context for better transitions
4. Validates the output against recipe anti-patterns
5. Presents the section for user review before proceeding

After generating the section, a review gate ensures the user has a chance
to approve, modify, or reject before you continue:

- When the response contains \`awaitUserAction: true\`, a UI preview with
  approve/modify/reject buttons is displayed. STOP and do NOT call any
  further tools until the user clicks a button (which triggers
  approve_section, modify_section, or reject_section).
- When the response contains \`action: "modify_requested"\`, the user wants
  changes. Ask what they'd like to change and call generate_section again.
- When the response contains \`action: "rejected"\`, the user rejected.
  Ask if they want a different component type or prompt.
- Otherwise, the section data is returned with \`awaitUserAction: true\`.
  Present the generated section to the user and WAIT for them to approve,
  request modifications, or reject before continuing to the next section.

IMPORTANT: NEVER generate the next section until the user has explicitly
approved the current one. Always present each section and wait for feedback.

Use this instead of \`generate_content\` when building a page section-by-section.
For best results, call \`plan_page\` first, then \`generate_section\` for each
planned section.

Requires OpenAI API key.`,

  generate_root_field: `Generate content for a single root-level field on a content type.

Used for non-section root fields that exist alongside the section array on
hybrid content types. For example, blog-post has root fields \`head\`, \`aside\`,
\`cta\`, and \`seo\` alongside its \`section\` array.

This tool extracts the field's sub-schema from the content type, prepares it
for OpenAI structured output, generates content, and returns it ready for
merging into \`rootFields\` on \`create_page_with_content\`.

Typical workflow:
1. \`plan_page\` → returns sections + rootFields to generate
2. \`generate_section\` for each section
3. \`generate_root_field\` for each root field (head, aside, cta)
4. \`generate_seo\` for SEO metadata
5. \`create_page_with_content(sections: [...], rootFields: { head, aside, cta, seo })\`

Requires OpenAI API key.`,

  generate_seo: `Generate optimized SEO metadata for a content type.

Produces title, description, keywords, and optionally an OG image for the
\`seo\` root field. Designed as a post-generation step: call it AFTER
generating sections and root fields, and pass a summary of the page content
so the SEO metadata accurately reflects the actual content.

The generated SEO content can be merged into \`rootFields.seo\` when calling
\`create_page_with_content\`.

Works with any content type that has a \`seo\` field in its schema (page,
blog-post, blog-overview).

Requires OpenAI API key.`,

  replace_section: `Replace a single section at a specific index in a Storyblok story.

This is a convenience tool for surgically updating one section without needing
to fetch, modify, and re-submit the entire story content via \`update_story\`.
It handles the fetch-merge-save cycle internally.

Use this when you need to regenerate or swap out a specific section (e.g. the
hero, a features block, or the CTA) while leaving all other sections untouched.

Content is validated against the Design System's JSON Schema before saving.

Position semantics:
- 0 = first section
- -1 = last section
- Any other number = that index (clamped to bounds)`,

  update_seo: `Update SEO metadata on an existing Storyblok story.

This is a convenience tool for setting or updating a story's SEO fields
(title, description, keywords, image, cardImage) without needing to fetch
and re-submit the entire story content via \`update_story\`.

If the story has no SEO component yet, one is created automatically.
Only the fields you provide are updated — omitted fields keep their
existing values.

Supports automatic asset upload: pass image URLs (e.g. from placehold.co,
DALL·E, or any public URL) and set \`uploadAssets: true\` to have them
downloaded and uploaded to Storyblok as native assets automatically.`,

  ensure_path: `Ensure a folder path exists in Storyblok, creating missing folders.

Works like \`mkdir -p\`: given a path like "en/services/consulting", it walks
each segment, checks if the folder exists, and creates it if not. Returns
the numeric ID of the deepest (last) folder.

This is useful for sitemap migration workflows where you need to establish
a folder hierarchy before creating pages. The returned folder ID can be
passed as \`parentId\` to \`create_page_with_content\` or \`create_story\`.

Idempotent: calling with an already-existing path simply returns its ID.`,

  content_audit: `Run a comprehensive content quality audit across all stories.

Analyzes every published story for content quality issues across five categories:
- **Images**: Missing alt text, empty src, placeholder/external URLs
- **Content**: Short text, empty sections, missing headlines, thin pages, duplicate heroes
- **SEO**: Missing metadata, title/description length, missing OG images
- **Freshness**: Stale content, never-published drafts, unpublished changes
- **Composition**: Structural anti-patterns from Design System quality rules — duplicate heroes, sparse sub-items, adjacent same-type sections, missing CTAs, redundant section headlines, competing CTA buttons, first-section spacing

Returns a structured report with:
- Health score (0–100) based on findings severity
- Findings grouped by category and severity (high/medium/low)
- Top offenders (stories with the most issues)
- Summary statistics by category, severity, and rule

Composition findings are prefixed with \`composition-\` (e.g. \`composition-sparse-sub-items\`, \`composition-missing-cta\`) and come from the same \`checkCompositionalQuality()\` engine used during content generation.

Use this tool for periodic content quality reviews or before major site updates.`,
};

// -- Theme tool descriptions (appended after the main TOOL_DESCRIPTIONS object)
TOOL_DESCRIPTIONS.list_themes = `List all available design token themes.

Returns a list of all \`token-theme\` stories stored under \`settings/themes/\`,
including each theme's name, slug, and UUID.

Use this to discover available themes before applying one to a page or
the global settings.`;

TOOL_DESCRIPTIONS.get_theme = `Get the full configuration for a specific design token theme.

Returns the theme's branding tokens (JSON), compiled CSS custom properties,
and optional component token overrides with their compiled scoped CSS.
Supports lookup by slug (e.g. "dark-mode") or UUID.

Use this to inspect what a theme contains — colors, fonts, spacing,
and per-component token overrides — before deciding whether to apply it.`;

TOOL_DESCRIPTIONS.apply_theme = `Apply a design token theme to a page or settings story.

Sets the \`theme\` field (UUID) on the target story. The website runtime
resolves this UUID to CSS custom properties at page load, overriding
the default branding tokens.

Provide either \`themeUuid\` or \`themeSlug\` (resolved to UUID server-side).
If neither is provided, the theme is cleared (equivalent to \`remove_theme\`).

Returns the previous and new theme UUIDs for confirmation.`;

TOOL_DESCRIPTIONS.remove_theme = `Remove the design token theme from a page or settings story.

Clears the \`theme\` field, resetting the story to use the default branding
tokens defined in the global settings.

This is equivalent to calling \`apply_theme\` with no theme UUID.`;

TOOL_DESCRIPTIONS.create_theme = `Create a new design token theme from W3C DTCG branding tokens.

Accepts a theme name, a W3C Design Token Community Group (DTCG) format
branding tokens object, and optional per-component token overrides.
Compiles the tokens to CSS custom properties server-side, creates a
\`token-theme\` story under \`settings/themes/\`, and publishes it.

The theme slug is derived from the name (e.g. "Brand Blue" → "brand-blue").
System-managed themes cannot be overwritten.

After creation, use \`apply_theme\` with the returned slug or UUID to apply
the theme to a page or the global settings.`;

TOOL_DESCRIPTIONS.update_theme = `Update an existing design token theme with new W3C DTCG branding tokens.

Replaces all tokens on the theme story and recompiles the CSS custom properties.
Optionally replaces per-component token overrides and recompiles scoped CSS.
System-managed themes are protected and cannot be updated — to customize a
system theme, use \`get_theme\` to load it, modify the tokens, then \`create_theme\`
with a new name.

Lookup is by slug (e.g. "brand-blue") or UUID.`;

// ── Component usage hints ──────────────────────────────────────────

const COMPONENT_USAGE_HINTS: Record<
  string,
  {
    typicalUsage: string;
    typicalSubItemCount?: Record<string, [number, number]>;
  }
> = {
  hero: {
    typicalUsage:
      "Page opener. Usually the first section. Include 1-2 CTA buttons. Pair with features, split, or logos-companies below.",
    typicalSubItemCount: { buttons: [1, 2] },
  },
  "video-curtain": {
    typicalUsage:
      "Alternative page opener with full-width video background. Use instead of hero for video-heavy pages. Maximum one per page.",
    typicalSubItemCount: { buttons: [1, 2] },
  },
  features: {
    typicalUsage:
      "Present 3-4 key capabilities or benefits with icons. Keep text concise. Great after hero. Icons must come from list_icons.",
    typicalSubItemCount: { feature: [3, 4] },
  },
  split: {
    typicalUsage:
      "Side-by-side layout: image + text. Good for feature deep-dives. Alternate sides when using multiple splits.",
  },
  testimonials: {
    typicalUsage:
      "Social proof with 2-3 customer quotes. Include real names, roles, and companies. Place before CTA for conversion.",
    typicalSubItemCount: { testimonial: [2, 3] },
  },
  stats: {
    typicalUsage:
      "Data-driven credibility with 3-4 stat items. Use specific numbers. Place before CTA to establish proof.",
    typicalSubItemCount: { stat: [3, 4] },
  },
  cta: {
    typicalUsage:
      "Conversion point. Clear, action-oriented headline with 1-2 buttons. Usually the last section on a page.",
    typicalSubItemCount: { buttons: [1, 2] },
  },
  faq: {
    typicalUsage:
      "Answer 5-8 common questions. Great for addressing objections before CTA. Order by importance.",
    typicalSubItemCount: { questions: [5, 8] },
  },
  "logos-companies": {
    typicalUsage:
      "Trust signal with 5-8 client/partner logos. Works best after hero or before CTA. Needs density to be effective.",
    typicalSubItemCount: { logo: [5, 8] },
  },
  mosaic: {
    typicalUsage:
      "Visual grid with 4-6 tiles for portfolios, team grids, or project showcases. Each tile can have its own link.",
    typicalSubItemCount: { tile: [4, 6] },
  },
  "blog-teaser": {
    typicalUsage:
      "Article teaser card. Always group 3 blog-teasers per section for visual balance. Each must have a link_url.",
  },
  contact: {
    typicalUsage:
      "Contact details section. Include relevant channels (email, phone, address). Use icons from list_icons.",
  },
  slider: {
    typicalUsage:
      "Rotating content carousel. Minimum 3 slides. Accepts full components in its slots.",
  },
  divider: {
    typicalUsage:
      "Visual separator. Use sparingly — only between major thematic shifts. Consider section background colors instead.",
  },
};

// ── Individual tool handler implementations ────────────────────────
// Each handler receives a ToolContext (deps, server, extra) via closure
// from the registerTool callback.

/** Context passed to each handler from the registerTool callback. */
interface ToolContext {
  deps: ToolRegistrationDeps;
  server: McpServer;
  extra: ProgressExtra;
}

async function handleGenerateContent(
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<Record<string, any>> {
  const { deps } = ctx;
  if (!deps.contentService.isConfigured()) {
    throw new ConfigurationError(
      "OpenAI API key not configured. Set OPENAI_API_KEY environment variable.",
    );
  }
  const validated = schemas.generateContent.parse(args);
  const systemWithImages = `${validated.system}\n\n${PLACEHOLDER_IMAGE_INSTRUCTIONS}`;

  if (validated.componentType || validated.sectionCount) {
    const result = await deps.contentService.generateWithSchema({
      system: systemWithImages,
      prompt: validated.prompt,
      componentType: validated.componentType,
      sectionCount: validated.sectionCount,
      contentType: validated.contentType,
    });

    // Attempt SSR preview render (best-effort)
    let structuredContent: Record<string, any> | undefined;
    try {
      // storyblokContent wraps sections under the root array field (usually "section")
      const sbContent = result.storyblokContent;
      const sections =
        sbContent?.content?.section ||
        sbContent?.section ||
        (Array.isArray(sbContent) ? sbContent : null);
      if (Array.isArray(sections)) {
        const { renderPageSectionsToHtml } = await getRenderModule();
        const rendered = renderPageSectionsToHtml(sections);
        structuredContent = {
          renderedSections: rendered,
          componentType: validated.componentType || "page",
          ...(deps.globalTokenCss.current && {
            tokenCss: deps.globalTokenCss.current,
          }),
        };
      }
    } catch (renderErr) {
      console.error(`[MCP] SSR preview render failed (non-fatal):`, renderErr);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      ...(structuredContent && { structuredContent }),
    };
  }

  if (!validated.schema) {
    throw new ConfigurationError(
      "Either 'schema' or 'componentType'/'sectionCount' must be provided.",
    );
  }
  const result = await deps.contentService.generateContent({
    system: systemWithImages,
    prompt: validated.prompt,
    schema: validated.schema,
  });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
}

async function handleImportContent(
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<Record<string, any>> {
  const { deps } = ctx;
  const validated = schemas.importContent.parse(args);
  const importContentType = validated.contentType || "page";
  const importEntry = registry.has(importContentType)
    ? registry.get(importContentType)
    : registry.page;
  const importRootField = importEntry.rules.rootArrayFields[0] || "section";
  const importSections = (validated.page?.content as Record<string, any>)?.[
    importRootField
  ];
  const warnings = getCompositionalWarnings(
    Array.isArray(importSections) ? importSections : [],
    importContentType,
  );
  const result = await deps.storyblokService.importContent({
    ...validated,
    contentType: validated.contentType,
    skipTransform: validated.skipTransform,
    uploadAssets: validated.uploadAssets,
    assetFolderName: validated.assetFolderName,
    skipValidation: validated.skipValidation,
  });
  const data = {
    success: true,
    message: "Content imported successfully",
    story: result,
    ...(warnings.length > 0 && { warnings }),
  };
  return buildWriteResult(
    deps.storyblokService,
    data,
    result as Record<string, any>,
  );
}

async function handleImportContentAtPosition(
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<Record<string, any>> {
  const { deps } = ctx;
  const validated = schemas.importContentAtPosition.parse(args);
  const warnings = getCompositionalWarnings(
    validated.sections as Record<string, any>[],
    validated.contentType,
  );
  const result = await deps.storyblokService.importContentAtPosition({
    storyUid: validated.storyUid,
    position: validated.position,
    page: { content: { section: validated.sections } },
    contentType: validated.contentType,
    targetField: validated.targetField,
    publish: validated.publish,
    skipTransform: validated.skipTransform,
    uploadAssets: validated.uploadAssets,
    assetFolderName: validated.assetFolderName,
    skipValidation: validated.skipValidation,
  });
  const data = {
    success: true,
    message: `Content imported at position ${validated.position}`,
    story: result,
    ...(warnings.length > 0 && { warnings }),
  };
  return buildWriteResult(
    deps.storyblokService,
    data,
    result as Record<string, any>,
  );
}

async function handleCreatePageWithContent(
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<Record<string, any>> {
  const { deps, server, extra } = ctx;
  const validated = schemas.createPageWithContent.parse(args);
  const createPageProgress = new ProgressReporter(extra, 4);

  // Step 1: Resolve path
  await createPageProgress.advance("Resolving folder path...");
  let parentId = validated.parentId;
  if (validated.path) {
    if (validated.parentId) {
      throw new ValidationError(
        "'path' and 'parentId' are mutually exclusive. Provide one or the other.",
      );
    }
    parentId = await deps.storyblokService.ensurePath(validated.path);
  }

  // Step 2: Pre-creation validation & preview render
  await createPageProgress.advance("Validating and rendering preview...");
  const warnings = getCompositionalWarnings(
    validated.sections as Record<string, any>[],
    validated.contentType,
  );

  // Check for missing SEO metadata
  const rootFields = validated.rootFields as
    | Record<string, unknown>
    | undefined;
  const hasSeo =
    rootFields?.seo &&
    typeof rootFields.seo === "object" &&
    Object.keys(rootFields.seo as Record<string, unknown>).length > 0;
  if (!hasSeo) {
    warnings.push({
      level: "info",
      message:
        "Page created without SEO metadata. Consider calling `generate_seo` first and passing the result via `rootFields: { seo: <result> }`.",
      suggestion:
        "Use `generate_seo` with a summary of the page content, then include the result in rootFields.seo for better search engine visibility.",
    });
  }

  // Pre-render sections for preview (best-effort, non-fatal)
  let renderedSections:
    | Array<{
        componentType: string;
        renderedHtml: string | null;
        index: number;
      }>
    | undefined;
  try {
    const sections = validated.sections as Record<string, any>[];
    if (Array.isArray(sections) && sections.length > 0) {
      const { renderPageSectionsToHtml } = await getRenderModule();
      renderedSections = renderPageSectionsToHtml(sections);
    }
  } catch (renderErr) {
    console.error(
      `[MCP] SSR page preview render failed (non-fatal):`,
      renderErr,
    );
  }

  // Pre-compute page metadata for the gate (needed by all tiers)
  const pageName = validated.name || "Untitled";
  const sectionTypes = extractSectionTypes(
    validated.sections as Record<string, any>[],
  );

  // Step 3: User confirmation gate — three tiers:
  // 1. Ext-apps UI available → page builder preview with save/discard buttons
  //    is rendered; tell the LLM to STOP and wait for the save_page app-only tool
  // 2. No ext-apps, but elicitation supported → block with elicitation form
  // 3. Neither (automation) → use explicit `publish` parameter, no gate
  const hasExtAppsUi = clientSupportsExtApps(server.server);

  if (hasExtAppsUi) {
    // Tier 1: Page builder UI preview is rendered with save/discard buttons.
    // The LLM MUST stop and wait for the user to use the UI controls.
    // The user can reorder sections, remove sections, then save or discard.
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              awaitUserAction: true,
              pageName,
              sectionCount: sectionTypes.length,
              sectionTypes,
              sections: validated.sections,
              rootFields: validated.rootFields,
              ...(warnings.length > 0 && { warnings }),
              message:
                "Page preview is now visible to the user. Do NOT respond, summarize, or describe next steps. Say nothing. Wait silently for the user's next message.",
            },
            null,
            2,
          ),
        },
      ],
      ...(renderedSections &&
        renderedSections.length > 0 && {
          structuredContent: {
            pageName,
            sectionCount: sectionTypes.length,
            renderedSections,
            ...(warnings.length > 0 && { warnings }),
            ...(deps.globalTokenCss.current && {
              tokenCss: deps.globalTokenCss.current,
            }),
          },
        }),
    };
  }

  // Tier 2: No ext-apps UI — try elicitation to block before creating
  const confirmPrompt = elicitPageConfirmation(
    pageName,
    sectionTypes.length,
    sectionTypes,
  );
  const confirmResult = await tryElicit(
    server.server,
    confirmPrompt.message,
    confirmPrompt.properties,
    confirmPrompt.required,
  );

  let shouldPublish = !!validated.publish;
  if (confirmResult.accepted) {
    const userAction = confirmResult.content?.action as string;

    if (userAction === "discard") {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: false,
                action: "discarded",
                message:
                  "Page creation cancelled by user. No changes were made in Storyblok.",
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    // Override publish based on user choice
    shouldPublish = userAction === "publish";
  }
  // Tier 3: Elicitation unsupported — use validated.publish as-is (automation)

  // Step 4: Create page in Storyblok
  await createPageProgress.advance("Creating page in Storyblok...");
  const result = await deps.storyblokService.createPageWithContent({
    ...validated,
    parentId,
    publish: shouldPublish,
    contentType: validated.contentType,
    rootFields: validated.rootFields as Record<string, unknown> | undefined,
    skipValidation: validated.skipValidation,
    uploadAssets: validated.uploadAssets,
    assetFolderName: validated.assetFolderName,
  });

  // Step 5: Done
  await createPageProgress.complete("Page created successfully");

  const data = {
    success: true,
    message: shouldPublish
      ? "Page created and published"
      : "Page created (draft)",
    story: result,
    ...(warnings.length > 0 && { warnings }),
  };
  const writeResult = buildWriteResult(
    deps.storyblokService,
    data,
    result as Record<string, any>,
  );

  // Attach structuredContent for ext-apps page preview
  const storySlug =
    (result as any)?.slug || (result as any)?.story?.slug || validated.slug;
  const storyName =
    (result as any)?.name || (result as any)?.story?.name || validated.name;
  (writeResult as any).structuredContent = {
    ...(writeResult as any).structuredContent,
    success: true,
    message: data.message,
    storyName,
    storySlug,
    sectionCount: (validated.sections as any[])?.length || 0,
    wasPublished: shouldPublish,
    ...(renderedSections &&
      renderedSections.length > 0 && { renderedSections }),
    ...(warnings.length > 0 && { warnings }),
    ...(deps.globalTokenCss.current && {
      tokenCss: deps.globalTokenCss.current,
    }),
  };

  return writeResult;
}

async function handleGetIdeas(
  _args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<Record<string, any>> {
  const { deps } = ctx;
  const result = await deps.storyblokService.getIdeas();
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
}

async function handleListStories(
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<Record<string, any>> {
  const { deps } = ctx;
  const validated = schemas.listStories.parse(args);
  const result = await deps.storyblokService.listStories(validated);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(stripEmptyAssetFields(result), null, 2),
      },
    ],
  };
}

async function handleGetStory(
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<Record<string, any>> {
  const { deps, server } = ctx;
  const validated = schemas.getStory.parse(args);
  const result = await deps.storyblokService.getStory(
    validated.identifier,
    validated.findBy,
    validated.version,
  );

  const textResult = {
    content: [
      {
        type: "text",
        text: JSON.stringify(stripEmptyAssetFields(result), null, 2),
      },
    ],
  };

  // Always attach structuredContent when sections exist so the page builder
  // UI can render them. No clientSupportsExtApps guard — non-ext-apps
  // clients harmlessly ignore the extra field (same pattern as
  // generate_section and create_page_with_content).
  try {
    const story = (result as any)?.story || result;
    const storyContent = story?.content;
    // Try common root array field names
    const sections =
      storyContent?.section || storyContent?.sections || storyContent?.body;

    if (Array.isArray(sections) && sections.length > 0) {
      // SSR-render each section (best-effort — null on failure)
      let rendered: Array<{
        componentType: string;
        renderedHtml: string | null;
        index: number;
      }>;
      try {
        const { renderPageSectionsToHtml } = await getRenderModule();
        rendered = renderPageSectionsToHtml(sections);
      } catch (renderErr) {
        console.error(
          `[MCP] get_story SSR preview render failed (non-fatal):`,
          renderErr,
        );
        // Fall back to metadata-only (no rendered HTML)
        rendered = sections.map((s: any, i: number) => ({
          componentType:
            s.component === "section"
              ? s.components?.[0]?.component || "section"
              : s.component || "unknown",
          renderedHtml: null,
          index: i,
        }));
      }

      (textResult as any).structuredContent = {
        story: {
          uid: story.uuid || story.uid,
          name: story.name,
          slug: story.full_slug || story.slug,
          id: story.id,
        },
        sections: rendered.map(
          (
            r: {
              componentType: string;
              renderedHtml: string | null;
              index: number;
            },
            i: number,
          ) => ({
            componentType: r.componentType || "section",
            renderedHtml: r.renderedHtml || null,
            sectionData: sections[i],
          }),
        ),
        // Per-story token CSS (from content.token) with global settings fallback
        ...((storyContent?.token || deps.globalTokenCss.current) && {
          tokenCss: storyContent?.token || deps.globalTokenCss.current,
        }),
      };
    }
  } catch (err) {
    console.error(
      `[MCP] get_story structuredContent assembly failed (non-fatal):`,
      err,
    );
  }

  return textResult;
}

async function handleCreateStory(
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<Record<string, any>> {
  const { deps } = ctx;
  const validated = schemas.createStory.parse(args);
  let parentId = validated.parentId;
  if (validated.path) {
    if (validated.parentId) {
      throw new ValidationError(
        "'path' and 'parentId' are mutually exclusive. Provide one or the other.",
      );
    }
    parentId = await deps.storyblokService.ensurePath(validated.path);
  }
  const result = await deps.storyblokService.createStory({
    ...validated,
    parentId,
    skipValidation: validated.skipValidation,
  });
  const data = {
    success: true,
    message: "Story created successfully",
    story: result,
  };
  return buildWriteResult(
    deps.storyblokService,
    data,
    result as Record<string, any>,
  );
}

async function handleUpdateStory(
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<Record<string, any>> {
  const { deps } = ctx;
  const validated = schemas.updateStory.parse(args);
  const result = await deps.storyblokService.updateStory(
    validated.storyId,
    {
      content: validated.content,
      name: validated.name,
      slug: validated.slug,
    },
    validated.publish,
    validated.skipValidation,
  );
  const data = {
    success: true,
    message: validated.publish
      ? "Story updated and published"
      : "Story updated (draft)",
    story: result,
  };
  return buildWriteResult(
    deps.storyblokService,
    data,
    result as Record<string, any>,
  );
}

async function handleDeleteStory(
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<Record<string, any>> {
  const { deps, server } = ctx;
  const validated = schemas.deleteStory.parse(args);

  // Try to elicit confirmation for destructive action
  const deleteConfirmation = elicitDeleteConfirmation(
    `Story #${validated.storyId}`,
  );
  const elicitResult = await tryElicit(
    server.server,
    deleteConfirmation.message,
    deleteConfirmation.properties,
    deleteConfirmation.required,
  );

  // If elicitation was supported and user cancelled/declined, abort
  if (
    elicitResult.reason === "cancelled" ||
    elicitResult.reason === "declined" ||
    (elicitResult.accepted && elicitResult.content?.confirm !== "delete")
  ) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { success: false, message: "Deletion cancelled by user" },
            null,
            2,
          ),
        },
      ],
    };
  }

  // Guard: reject deletion of system-managed token-theme stories
  try {
    const story = (await deps.storyblokService.getStoryManagement(
      String(validated.storyId),
    )) as Record<string, any>;
    if (
      story?.content?.component === "token-theme" &&
      story?.content?.system === true
    ) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: false,
                error: `Cannot delete story #${validated.storyId}: it is a system-managed theme and is protected from deletion.`,
              },
              null,
              2,
            ),
          },
        ],
        isError: true,
      };
    }
  } catch {
    // Story not found or fetch failed — let deleteStory handle it
  }

  await deps.storyblokService.deleteStory(validated.storyId);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            message: `Story ${validated.storyId} deleted successfully`,
          },
          null,
          2,
        ),
      },
    ],
  };
}

async function handleReplaceSection(
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<Record<string, any>> {
  const { deps } = ctx;
  const validated = schemas.replaceSection.parse(args);
  const warnings = getCompositionalWarnings(
    [validated.section as Record<string, any>],
    validated.contentType,
  );
  const result = await deps.storyblokService.replaceSection({
    storyUid: validated.storyUid,
    position: validated.position,
    section: validated.section as Record<string, any>,
    contentType: validated.contentType,
    publish: validated.publish,
    skipTransform: validated.skipTransform,
    uploadAssets: validated.uploadAssets,
    assetFolderName: validated.assetFolderName,
    skipValidation: validated.skipValidation,
  });
  const replacedIndex = (result as any).replacedIndex;
  const data = {
    success: true,
    message: `Section at position ${replacedIndex} replaced successfully${
      validated.publish ? " and published" : " (draft)"
    }`,
    story: result,
    ...(warnings.length > 0 && { warnings }),
  };
  return buildWriteResult(
    deps.storyblokService,
    data,
    result as Record<string, any>,
  );
}

async function handleUpdateSeo(
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<Record<string, any>> {
  const { deps } = ctx;
  const validated = schemas.updateSeo.parse(args);
  const result = await deps.storyblokService.updateSeo({
    storyUid: validated.storyUid,
    seo: validated.seo as {
      title?: string;
      description?: string;
      keywords?: string;
      image?: string | Record<string, unknown>;
      cardImage?: string | Record<string, unknown>;
    },
    publish: validated.publish,
    uploadAssets: validated.uploadAssets,
    assetFolderName: validated.assetFolderName,
  });
  const data = {
    success: true,
    message: `SEO metadata updated${
      validated.publish ? " and published" : " (draft)"
    }`,
    story: result,
  };
  return buildWriteResult(
    deps.storyblokService,
    data,
    result as Record<string, any>,
  );
}

async function handleListComponents(
  _args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<Record<string, any>> {
  const { deps } = ctx;
  const result = await deps.storyblokService.listComponents();

  // Annotate each component with nesting rules from the schema
  const allContentTypes = registry.listContentTypes();
  const annotated = (result as Array<{ name: string }>).map((comp) => {
    const name = comp.name;
    const allSlots = new Set<string>();
    for (const ct of allContentTypes) {
      const entry = registry.get(ct);
      const slots = entry.rules.componentToSlots.get(name) || [];
      slots.forEach((s: string) => allSlots.add(s));
    }
    const slots = [...allSlots];

    const isSubComponent =
      slots.length > 0 &&
      slots.every((s: string) => {
        const parts = s.split(".");
        return !allContentTypes.some((ct: string) => {
          const entry = registry.get(ct);
          return (
            parts.length === 2 && entry.rules.rootArrayFields.includes(parts[0])
          );
        });
      });
    const parentComponents = isSubComponent
      ? [...new Set(slots.map((s) => s.split(".")[0]))]
      : undefined;

    const annotation: Record<string, any> = {
      ...comp,
      allowedIn: slots.length > 0 ? slots : undefined,
      isSubComponent,
    };

    const hints = COMPONENT_USAGE_HINTS[name];
    if (hints) {
      annotation.typicalUsage = hints.typicalUsage;
      if (hints.typicalSubItemCount) {
        annotation.typicalSubItemCount = hints.typicalSubItemCount;
      }
    }

    if (isSubComponent && parentComponents?.length) {
      annotation.parentComponent =
        parentComponents.length === 1 ? parentComponents[0] : parentComponents;
      annotation.note = `This component cannot be used as a direct child of a top-level container. It must be nested inside ${
        parentComponents.length === 1
          ? `a '${parentComponents[0]}'`
          : `one of: ${parentComponents.map((p) => `'${p}'`).join(", ")}`
      } component.`;
    }

    return annotation;
  });

  return {
    content: [{ type: "text", text: JSON.stringify(annotated, null, 2) }],
  };
}

async function handleGetComponent(
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<Record<string, any>> {
  const { deps } = ctx;
  const validated = schemas.getComponent.parse(args);
  const result = await deps.storyblokService.getComponent(
    validated.componentName,
  );
  const name = validated.componentName;
  const allCTs = registry.listContentTypes();
  const allComponentSlots = new Set<string>();
  for (const ct of allCTs) {
    const entry = registry.get(ct);
    const s = entry.rules.componentToSlots.get(name) || [];
    s.forEach((slot: string) => allComponentSlots.add(slot));
  }
  const slots = [...allComponentSlots];

  const childSlots: Record<
    string,
    { slotPath: string; allowedTypes: string[]; note: string }
  > = {};
  for (const ct of allCTs) {
    const entry = registry.get(ct);
    for (const [slotPath, allowedTypes] of entry.rules.containerSlots) {
      const parts = slotPath.split(".");
      if (parts.length === 2 && parts[0] === name) {
        if (!childSlots[parts[1]]) {
          childSlots[parts[1]] = {
            slotPath,
            allowedTypes: [...allowedTypes],
            note: `Array of ${[...allowedTypes].join("/")} sub-component(s)`,
          };
        } else {
          for (const t of allowedTypes) {
            if (!childSlots[parts[1]].allowedTypes.includes(t)) {
              childSlots[parts[1]].allowedTypes.push(t);
            }
          }
        }
      }
    }
  }

  const compositionRules = {
    allowedIn:
      slots.length > 0 ? slots : ["any (no specific constraints found)"],
    childSlots: Object.keys(childSlots).length > 0 ? childSlots : undefined,
  };

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          { composition_rules: compositionRules, schema: result },
          null,
          2,
        ),
      },
    ],
  };
}

async function handleListAssets(
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<Record<string, any>> {
  const { deps } = ctx;
  const validated = schemas.listAssets.parse(args);
  const result = await deps.storyblokService.listAssets(validated);
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
}

async function handleSearchContent(
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<Record<string, any>> {
  const { deps } = ctx;
  const validated = schemas.searchContent.parse(args);
  const result = await deps.storyblokService.searchContent(
    validated.query,
    validated.contentType,
  );
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(stripEmptyAssetFields(result), null, 2),
      },
    ],
  };
}

async function handleScrapeUrl(
  args: Record<string, unknown>,
  _ctx: ToolContext,
): Promise<Record<string, any>> {
  const validated = schemas.scrapeUrl.parse(args);
  const result = await scrapeUrl(validated);
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
}

async function handleListIcons(
  _args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<Record<string, any>> {
  const { deps } = ctx;
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            icons: deps.availableIcons,
            count: deps.availableIcons.length,
            usage:
              "Use these identifiers for any icon field in component content (e.g. hero cta_icon, feature icon, contact-info icon).",
          },
          null,
          2,
        ),
      },
    ],
  };
}

async function handleAnalyzeContentPatterns(
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<Record<string, any>> {
  const { deps } = ctx;
  const validated = schemas.analyzeContentPatterns.parse(args);
  const isDefaultQuery =
    validated.contentType === "page" && !validated.startsWith;
  console.error(
    `[MCP] Analyzing content patterns (contentType: ${
      validated.contentType
    }, startsWith: ${validated.startsWith || "all"}, refresh: ${
      validated.refresh
    }, cached: ${isDefaultQuery && !!deps.cachedPatterns.current})...`,
  );

  let analysis: ContentPatternAnalysis;
  if (isDefaultQuery && deps.cachedPatterns.current && !validated.refresh) {
    analysis = deps.cachedPatterns.current;
  } else {
    const contentTypeForAnalysis = validated.contentType || "page";
    const registryEntry = registry.has(contentTypeForAnalysis)
      ? registry.get(contentTypeForAnalysis)
      : null;
    const rules = registryEntry?.rules ?? PAGE_VALIDATION_RULES;
    const derefSchema = registryEntry?.schema;
    analysis = await analyzeContentPatterns(
      deps.storyblokService.getContentClient(),
      rules,
      { ...validated, derefSchema },
    );
    if (isDefaultQuery) {
      deps.cachedPatterns.current = analysis;
    }
  }
  return {
    content: [{ type: "text", text: JSON.stringify(analysis, null, 2) }],
  };
}

async function handleListRecipes(
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<Record<string, any>> {
  const { deps } = ctx;
  const validated = schemas.listRecipes.parse(args);
  console.error(
    `[MCP] Listing recipes (intent: ${
      validated.intent || "all"
    }, contentType: ${validated.contentType || "all"}, includePatterns: ${
      validated.includePatterns
    })...`,
  );

  const filterContentType = validated.contentType;
  const filteredRecipes = filterContentType
    ? (deps.sectionRecipes.recipes as Array<Record<string, unknown>>).filter(
        (r) => !r.contentType || r.contentType === filterContentType,
      )
    : deps.sectionRecipes.recipes;
  const filteredTemplates = filterContentType
    ? (
        deps.sectionRecipes.pageTemplates as Array<Record<string, unknown>>
      ).filter((t) => !t.contentType || t.contentType === filterContentType)
    : deps.sectionRecipes.pageTemplates;
  const filteredAntiPatterns = filterContentType
    ? (
        deps.sectionRecipes.antiPatterns as Array<Record<string, unknown>>
      ).filter((a) => !a.contentType || a.contentType === filterContentType)
    : deps.sectionRecipes.antiPatterns;

  const result: Record<string, unknown> = {
    recipes: filteredRecipes,
    pageTemplates: filteredTemplates,
    antiPatterns: filteredAntiPatterns,
  };

  if (validated.includePatterns && deps.cachedPatterns.current) {
    result.livePatterns = {
      componentFrequency: deps.cachedPatterns.current.componentFrequency.slice(
        0,
        15,
      ),
      commonSequences: deps.cachedPatterns.current.commonSequences.slice(0, 10),
      subComponentCounts: deps.cachedPatterns.current.subComponentCounts,
      note: "Live patterns from startup cache. Use analyze_content_patterns(refresh: true) to update after publishing.",
    };
  } else if (validated.includePatterns) {
    result.livePatterns = {
      error:
        "Pattern cache not available. Call analyze_content_patterns first to populate it.",
    };
  }

  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
}

async function handlePlanPage(
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<Record<string, any>> {
  const { deps, server } = ctx;
  const validated = schemas.planPage.parse(args);
  const planContentType = validated.contentType || "page";
  console.error(`[MCP] Planning page structure for: "${validated.intent}"...`);

  if (!deps.contentService.isConfigured()) {
    throw new ConfigurationError(
      "OpenAI API key is required for plan_page. Set OPENAI_API_KEY environment variable.",
    );
  }

  let patternsSource: ContentPatternAnalysis | null = null;
  if (validated.startsWith) {
    const planEntry = registry.has(planContentType)
      ? registry.get(planContentType)
      : registry.page;
    console.error(
      `[MCP] plan_page: fetching filtered patterns (startsWith: ${validated.startsWith})...`,
    );
    patternsSource = await analyzeContentPatterns(
      deps.storyblokService.getContentClient(),
      planEntry.rules,
      {
        contentType: planContentType,
        startsWith: validated.startsWith,
        derefSchema: planEntry.schema,
      },
    );
  } else {
    patternsSource = deps.cachedPatterns.current;
  }

  const planEntry = registry.has(planContentType)
    ? registry.get(planContentType)
    : registry.page;

  const planResult: PlanPageResult = await planPageContent(
    deps.contentService.getClient(),
    planEntry,
    {
      intent: validated.intent,
      sectionCount: validated.sectionCount,
      patterns: patternsSource,
    },
  );

  // Plan review gate — two tiers:
  // 1. Ext-apps UI available → plan review UI with approve/modify buttons;
  //    tell the LLM to STOP and wait for the approve_plan app-only tool
  // 2. No ext-apps → return plan data for conversational review by the LLM
  const hasExtAppsUi = clientSupportsExtApps(server.server);

  const planResponseData = {
    plan: planResult.plan,
    contentType: planResult.contentType,
    ...(planResult.rootFieldMeta && {
      rootFieldMeta: planResult.rootFieldMeta,
    }),
    usage: planResult.usage,
  };

  if (hasExtAppsUi) {
    // Tier 1: Plan review UI is rendered with approve/modify controls.
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              ...planResponseData,
              awaitUserAction: true,
              message:
                "Plan review is now visible to the user. Do NOT respond, summarize, or describe next steps. Say nothing. Wait silently for the user's next message.",
            },
            null,
            2,
          ),
        },
      ],
      structuredContent: {
        plan: planResult.plan,
        contentType: planResult.contentType,
      },
    };
  }

  // Tier 2: No ext-apps UI — return plan for conversational review
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(planResponseData, null, 2),
      },
    ],
    structuredContent: {
      plan: planResult.plan,
      contentType: planResult.contentType,
    },
  };
}

async function handleGenerateSection(
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<Record<string, any>> {
  const { deps, server, extra } = ctx;
  const validated = schemas.generateSection.parse(args);
  const sectionContentType = validated.contentType || "page";

  // If componentType was not provided, try to elicit it from the user
  let resolvedComponentType = validated.componentType;
  if (!resolvedComponentType) {
    // Get available top-level section components from the registry
    const sectionEntry = registry.has(sectionContentType)
      ? registry.get(sectionContentType)
      : registry.page;
    const sectionSlotKey = `section.components`;
    const availableSet = sectionEntry.rules.containerSlots.get(sectionSlotKey);
    const availableComponents = availableSet
      ? [...availableSet].filter((c) => c !== "section").sort()
      : [];

    if (availableComponents.length === 0) {
      throw new ValidationError(
        `No section components found for content type "${sectionContentType}". ` +
          `Please provide componentType explicitly.`,
      );
    }

    const picker = elicitComponentType(availableComponents);
    const elicitResult = await tryElicit(
      server.server,
      picker.message,
      picker.properties,
      picker.required,
    );

    if (elicitResult.accepted && elicitResult.content?.componentType) {
      resolvedComponentType = elicitResult.content.componentType as string;
    } else if (
      elicitResult.reason === "cancelled" ||
      elicitResult.reason === "declined"
    ) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: false,
                message: "Section generation cancelled by user",
              },
              null,
              2,
            ),
          },
        ],
      };
    } else {
      // Elicitation unsupported — return helpful error
      throw new ValidationError(
        `componentType is required. Available types for ${sectionContentType}: ${availableComponents.join(
          ", ",
        )}`,
      );
    }
  }

  const sectionProgress = new ProgressReporter(extra, 3);
  console.error(
    `[MCP] Generating section: ${resolvedComponentType} (contentType: ${sectionContentType})...`,
  );

  if (!deps.contentService.isConfigured()) {
    throw new ConfigurationError(
      "OpenAI API key is required for generate_section. Set OPENAI_API_KEY environment variable.",
    );
  }

  // Step 1: Resolve patterns
  await sectionProgress.advance("Resolving content patterns...");
  let sectionPatternsSource: ContentPatternAnalysis | null = null;
  if (validated.startsWith) {
    const sectionEntry = registry.has(sectionContentType)
      ? registry.get(sectionContentType)
      : registry.page;
    console.error(
      `[MCP] generate_section: fetching filtered patterns (startsWith: ${validated.startsWith})...`,
    );
    sectionPatternsSource = await analyzeContentPatterns(
      deps.storyblokService.getContentClient(),
      sectionEntry.rules,
      {
        contentType: sectionContentType,
        startsWith: validated.startsWith,
        derefSchema: sectionEntry.schema,
      },
    );
  } else {
    sectionPatternsSource = deps.cachedPatterns.current;
  }

  const sectionEntry = registry.has(sectionContentType)
    ? registry.get(sectionContentType)
    : registry.page;

  // Step 2: Generate section via OpenAI
  await sectionProgress.advance(
    `Generating ${resolvedComponentType} section...`,
  );
  const sectionResult: GenerateSectionResult = await generateSectionContent(
    deps.contentService.getClient(),
    sectionEntry,
    {
      componentType: resolvedComponentType,
      prompt: validated.prompt,
      system: validated.system || undefined,
      previousSection: validated.previousSection,
      nextSection: validated.nextSection,
      patterns: sectionPatternsSource,
      recipes: deps.sectionRecipes as SectionRecipes,
      scopeLabel: validated.startsWith || undefined,
    },
  );

  // Step 3: Render preview HTML (best-effort, non-blocking)
  let renderedHtml: string | null = null;
  try {
    const { renderSectionToHtml } = await getRenderModule();
    renderedHtml = renderSectionToHtml(sectionResult.section);
  } catch (renderErr) {
    console.error(`[MCP] SSR preview render failed (non-fatal):`, renderErr);
  }

  // Step 4: Complete
  await sectionProgress.complete("Section generated successfully");

  const responseData = {
    section: sectionResult.section,
    designSystemProps: sectionResult.designSystemProps,
    componentType: sectionResult.componentType,
    note: "Use import_content_at_position or create_page_with_content to add this section to a story. The 'section' field contains a single Storyblok-ready section object (with component: 'section' and nested components). Collect multiple section objects into an array and pass as 'sections' to create_page_with_content.",
  };

  // Build structuredContent once — always include it when renderedHtml is
  // available so the ext-apps UI preview works regardless of which gate tier
  // fires (the app's ontoolresult handler needs this data to render).
  const structuredContent = renderedHtml
    ? {
        renderedHtml,
        componentType: sectionResult.componentType,
        sectionData: sectionResult.section,
        ...(deps.globalTokenCss.current && {
          tokenCss: deps.globalTokenCss.current,
        }),
      }
    : undefined;

  // Step 5: User review gate — three tiers:
  // 1. Ext-apps UI available → preview with approve/modify/reject buttons
  //    is rendered; tell the LLM to STOP and wait for the app-only tool call
  // 2. No ext-apps, but elicitation supported → block with elicitation form
  // 3. Neither → return with awaitUserAction so the LLM asks the user
  const hasExtAppsUi = clientSupportsExtApps(server.server);

  if (hasExtAppsUi) {
    // Tier 1: UI preview is rendered with inline action buttons.
    // The LLM MUST stop and wait for the user to click approve/modify/reject
    // in the UI, which triggers app-only tools (approve_section, etc.).
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              ...responseData,
              awaitUserAction: true,
              message:
                "Section preview is now visible to the user. Do NOT respond, summarize, or describe next steps. Say nothing. Wait silently for the user's next message.",
            },
            null,
            2,
          ),
        },
      ],
      ...(structuredContent && { structuredContent }),
    };
  }

  // Tier 2: No ext-apps UI — try elicitation to block until user reviews
  const sectionSummary = buildSectionSummary(sectionResult);
  const approvalPrompt = elicitSectionApproval(
    sectionResult.componentType,
    sectionSummary,
  );
  const approvalResult = await tryElicit(
    server.server,
    approvalPrompt.message,
    approvalPrompt.properties,
    approvalPrompt.required,
  );

  if (approvalResult.accepted) {
    const userAction = approvalResult.content?.action as string;

    if (userAction === "reject") {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                action: "rejected",
                componentType: sectionResult.componentType,
                message:
                  "Section rejected by user. Ask if they want to try a different component type or prompt.",
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    if (userAction === "modify") {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                action: "modify_requested",
                componentType: sectionResult.componentType,
                section: sectionResult.section,
                designSystemProps: sectionResult.designSystemProps,
                message:
                  "User wants modifications. Ask what changes they'd like, then call generate_section again with an updated prompt.",
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    // userAction === "approve" — fall through to normal return
  }

  // Tier 3: No ext-apps UI and no elicitation — return section data with
  // awaitUserAction flag so the LLM presents the section to the user and
  // waits for explicit approval before continuing. Automation clients (e.g.
  // n8n) process the JSON programmatically and ignore the flag.
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            ...responseData,
            awaitUserAction: true,
            message:
              "Section generated successfully. Present this section to the user and WAIT for their explicit approval before generating the next section or calling any other tool. Ask the user if they want to: (1) approve and continue, (2) request modifications, or (3) reject and try a different approach.",
          },
          null,
          2,
        ),
      },
    ],
    ...(structuredContent && { structuredContent }),
  };
}

async function handleGenerateRootField(
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<Record<string, any>> {
  const { deps } = ctx;
  const validated = schemas.generateRootField.parse(args);
  const rfContentType = validated.contentType || "blog-post";
  console.error(
    `[MCP] Generating root field "${validated.fieldName}" for ${rfContentType}...`,
  );

  if (!deps.contentService.isConfigured()) {
    throw new ConfigurationError(
      "OpenAI API key is required for generate_root_field. Set OPENAI_API_KEY environment variable.",
    );
  }

  let rfSystemPrompt =
    validated.system ||
    `You are an expert content writer. Generate content for the "${validated.fieldName}" field of a ${rfContentType}.`;
  rfSystemPrompt += `\n\n${PLACEHOLDER_IMAGE_INSTRUCTIONS}`;

  const rfResult = await deps.contentService.generateRootField({
    system: rfSystemPrompt,
    prompt: validated.prompt,
    fieldName: validated.fieldName,
    contentType: rfContentType,
    model: validated.model,
  });

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            fieldName: rfResult.fieldName,
            storyblokContent: rfResult.storyblokContent,
            designSystemProps: rfResult.designSystemProps,
            note: `Root field "${rfResult.fieldName}" generated for ${rfContentType}. Pass this as rootFields.${rfResult.fieldName} to create_page_with_content.`,
          },
          null,
          2,
        ),
      },
    ],
  };
}

async function handleGenerateSeo(
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<Record<string, any>> {
  const { deps } = ctx;
  const validated = schemas.generateSeo.parse(args);
  const seoContentType = validated.contentType || "page";
  console.error(`[MCP] Generating SEO metadata for ${seoContentType}...`);

  if (!deps.contentService.isConfigured()) {
    throw new ConfigurationError(
      "OpenAI API key is required for generate_seo. Set OPENAI_API_KEY environment variable.",
    );
  }

  const seoResult = await deps.contentService.generateSeo({
    prompt: validated.prompt,
    contentType: seoContentType,
    model: validated.model,
    system: validated.system,
  });

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            seo: seoResult.storyblokContent,
            designSystemProps: seoResult.designSystemProps,
            note: `SEO metadata generated for ${seoContentType}. Pass this as rootFields.seo to create_page_with_content.`,
          },
          null,
          2,
        ),
      },
    ],
  };
}

async function handleContentAudit(
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<Record<string, any>> {
  const { deps, extra } = ctx;
  const validated = schemas.contentAudit.parse(args);

  const progress = new ProgressReporter(extra, 3);

  // Build a validation-rules map from the schema registry so the audit
  // engine can run checkCompositionalQuality() on every section-based story.
  const validationRulesMap = new Map<string, ValidationRules>();
  for (const ct of [
    "page",
    "blog-post",
    "blog-overview",
    "event-detail",
    "event-list",
  ] as const) {
    if (registry.has(ct)) {
      validationRulesMap.set(ct, registry.get(ct).rules);
    }
  }

  const auditOptions: RunAuditOptions = {
    startsWith: validated.startsWith,
    config: validated.staleMonths
      ? { staleMonths: validated.staleMonths }
      : undefined,
    validationRulesMap,
    onProgress: (_step, _total, message) => {
      progress.advance(message);
    },
  };

  const auditResults = await runContentAudit(
    deps.storyblokService.getContentClient(),
    auditOptions,
  );

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(auditResults, null, 2),
      },
    ],
    structuredContent: auditResults,
  };
}

async function handleEnsurePath(
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<Record<string, any>> {
  const { deps } = ctx;
  const validated = schemas.ensurePath.parse(args);
  const folderId = await deps.storyblokService.ensurePath(validated.path);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            message: `Path "${validated.path}" ensured successfully`,
            folderId,
            path: validated.path,
          },
          null,
          2,
        ),
      },
    ],
  };
}

// ── Registration ───────────────────────────────────────────────────

// ── Theme handlers ─────────────────────────────────────────────────

async function handleListThemes(
  _args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<Record<string, any>> {
  const { deps } = ctx;
  const themes = await deps.storyblokService.listThemes();
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ themes, count: themes.length }, null, 2),
      },
    ],
  };
}

async function handleGetTheme(
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<Record<string, any>> {
  const { deps } = ctx;
  const validated = schemas.getTheme.parse(args);
  const theme = await deps.storyblokService.getTheme(validated.slugOrUuid);
  if (!theme) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: `Theme "${validated.slugOrUuid}" not found`,
              hint: "Use list_themes to see available themes.",
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }
  return {
    content: [{ type: "text", text: JSON.stringify(theme, null, 2) }],
  };
}

async function handleApplyTheme(
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<Record<string, any>> {
  const { deps } = ctx;
  const validated = schemas.applyTheme.parse(args);

  // Resolve slug to UUID if needed
  let themeUuid = validated.themeUuid || null;
  if (!themeUuid && validated.themeSlug) {
    const theme = await deps.storyblokService.getTheme(validated.themeSlug);
    if (!theme) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: `Theme with slug "${validated.themeSlug}" not found`,
                hint: "Use list_themes to see available themes.",
              },
              null,
              2,
            ),
          },
        ],
        isError: true,
      };
    }
    themeUuid = theme.uuid;
  }

  const result = await deps.storyblokService.applyTheme(
    validated.storyId,
    themeUuid,
    validated.publish,
  );

  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
}

async function handleRemoveTheme(
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<Record<string, any>> {
  const { deps } = ctx;
  const validated = schemas.removeTheme.parse(args);
  const result = await deps.storyblokService.removeTheme(
    validated.storyId,
    validated.publish,
  );
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
}

async function handleCreateTheme(
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<Record<string, any>> {
  const { deps } = ctx;
  const validated = schemas.createTheme.parse(args);
  const result = await deps.storyblokService.createTheme({
    name: validated.name,
    tokens: validated.tokens as Record<string, unknown>,
    ...(validated.componentTokens && {
      componentTokens: validated.componentTokens as Record<string, unknown>,
    }),
    publish: validated.publish,
  });
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
}

async function handleUpdateTheme(
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<Record<string, any>> {
  const { deps } = ctx;
  const validated = schemas.updateTheme.parse(args);
  const result = await deps.storyblokService.updateTheme({
    slugOrUuid: validated.slugOrUuid,
    tokens: validated.tokens as Record<string, unknown>,
    ...(validated.componentTokens && {
      componentTokens: validated.componentTokens as Record<string, unknown>,
    }),
    publish: validated.publish,
  });
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
}

// ── Registration ───────────────────────────────────────────────────

/**
 * Helper to register a single tool using the high-level McpServer API.
 *
 * Handles the common pattern of:
 * 1. Looking up the Zod schema from config.ts
 * 2. Setting the description from TOOL_DESCRIPTIONS
 * 3. Attaching Zod outputSchema from OUTPUT_SCHEMAS
 * 4. Wrapping the handler with error formatting + structuredContent extraction
 *
 * For tools with UI metadata, delegates to `registerAppTool()` from the
 * ext-apps SDK which normalizes the `_meta` key formats automatically.
 * For tools without UI, falls back to `server.registerTool()` directly.
 *
 * For tools with no input parameters, pass `undefined` as inputSchema.
 * The SDK's ToolCallback type is conditional: when inputSchema is undefined,
 * the callback is `(extra) => ...`; when present, it's `(args, extra) => ...`.
 * We use a type assertion to handle both cases uniformly.
 */
function registerSingleTool(
  server: McpServer,
  name: string,
  inputSchema: Record<string, any> | undefined,
  handler: (args: any, extra: ProgressExtra) => Promise<Record<string, any>>,
  meta?: Record<string, any>,
): void {
  const config: Record<string, any> = {
    description: TOOL_DESCRIPTIONS[name],
    ...(inputSchema && { inputSchema }),
    ...(OUTPUT_SCHEMAS[name] && { outputSchema: OUTPUT_SCHEMAS[name] }),
    ...(meta && { _meta: meta }),
  };

  const hasOutputSchema = !!OUTPUT_SCHEMAS[name];

  // The SDK uses conditional types for ToolCallback — when inputSchema is
  // undefined the callback signature is (extra) => ..., when present it's
  // (args, extra) => .... We use `as any` because our helper normalises both
  // cases into a single (args, extra) shape for consistency.
  const wrappedHandler = async (args: any, extra: any) => {
    try {
      const result = await handler(args, extra);

      // When outputSchema is declared, the SDK requires `structuredContent`.
      // Our handlers return `{ content: [{ type: "text", text: JSON.stringify(...) }] }`.
      // Automatically extract structuredContent from the first text block.
      if (hasOutputSchema && result.content && !result.structuredContent) {
        const firstText = (result.content as any[]).find(
          (c: any) => c.type === "text" && c.text,
        );
        if (firstText) {
          try {
            result.structuredContent = JSON.parse(firstText.text);
          } catch {
            // If parsing fails, skip — the SDK will report the error
          }
        }
      }

      return result;
    } catch (error) {
      // Handle Zod validation errors
      if (error && typeof error === "object" && "issues" in error) {
        const zodError = error as {
          issues: Array<{ path: string[]; message: string }>;
        };
        const validationErr = new ValidationError("Invalid input parameters", {
          issues: zodError.issues.map((i: any) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        });
        console.error(
          `[MCP Error] [VALIDATION_ERROR] Invalid input parameters:`,
          JSON.stringify(validationErr.details, null, 2),
        );
        throw validationErr;
      }

      // Re-throw MCP errors (formatErrorResponse will log them)
      if (error instanceof Error && error.name.includes("Error")) {
        return formatErrorResponse(error);
      }

      // Log unexpected errors before re-throwing
      console.error(`[MCP Error] Unexpected error:`, error);
      throw error;
    }
  };

  // Use registerAppTool() for tools with UI metadata — it normalizes the
  // _meta to include both nested and flat key formats for host compatibility.
  // For tools without UI, use server.registerTool() directly.
  if (meta?.ui?.resourceUri) {
    registerAppTool(server, name, config as any, wrappedHandler as any);
  } else {
    server.registerTool(name, config, wrappedHandler as any);
  }
}

/**
 * Register all tool handlers on the McpServer.
 *
 * Uses the high-level McpServer.registerTool() API with Zod schemas from
 * config.ts. Each tool gets rich descriptions, outputSchema, and _meta
 * for ext-apps UI integration.
 *
 * The `deps` and `server` are captured via closure, so handler callbacks
 * only need (args, extra).
 */
export function registerTools(
  server: McpServer,
  deps: ToolRegistrationDeps,
): void {
  // Build a ToolContext factory — creates context from the extra param
  const ctx = (extra: ProgressExtra): ToolContext => ({
    deps,
    server,
    extra,
  });

  // ── generate_content ─────────────────────────────────────────
  registerSingleTool(
    server,
    "generate_content",
    schemas.generateContent.shape,
    (args, extra) => handleGenerateContent(args, ctx(extra)),
    { ui: { resourceUri: PAGE_BUILDER_URI } },
  );

  // ── import_content ───────────────────────────────────────────
  registerSingleTool(
    server,
    "import_content",
    schemas.importContent.shape,
    (args, extra) => handleImportContent(args, ctx(extra)),
  );

  // ── import_content_at_position ───────────────────────────────
  registerSingleTool(
    server,
    "import_content_at_position",
    schemas.importContentAtPosition.shape,
    (args, extra) => handleImportContentAtPosition(args, ctx(extra)),
  );

  // ── create_page_with_content ─────────────────────────────────
  registerSingleTool(
    server,
    "create_page_with_content",
    schemas.createPageWithContent.shape,
    (args, extra) => handleCreatePageWithContent(args, ctx(extra)),
    { ui: { resourceUri: PAGE_BUILDER_URI } },
  );

  // ── get_ideas ────────────────────────────────────────────────
  registerSingleTool(server, "get_ideas", undefined, (args, extra) =>
    handleGetIdeas(args, ctx(extra)),
  );

  // ── list_stories ─────────────────────────────────────────────
  registerSingleTool(
    server,
    "list_stories",
    schemas.listStories.shape,
    (args, extra) => handleListStories(args, ctx(extra)),
  );

  // ── get_story ────────────────────────────────────────────────
  registerSingleTool(
    server,
    "get_story",
    schemas.getStory.shape,
    (args, extra) => handleGetStory(args, ctx(extra)),
    { ui: { resourceUri: PAGE_BUILDER_URI } },
  );

  // ── create_story ─────────────────────────────────────────────
  registerSingleTool(
    server,
    "create_story",
    schemas.createStory.shape,
    (args, extra) => handleCreateStory(args, ctx(extra)),
  );

  // ── update_story ─────────────────────────────────────────────
  registerSingleTool(
    server,
    "update_story",
    schemas.updateStory.shape,
    (args, extra) => handleUpdateStory(args, ctx(extra)),
  );

  // ── delete_story ─────────────────────────────────────────────
  registerSingleTool(
    server,
    "delete_story",
    schemas.deleteStory.shape,
    (args, extra) => handleDeleteStory(args, ctx(extra)),
  );

  // ── replace_section ──────────────────────────────────────────
  registerSingleTool(
    server,
    "replace_section",
    schemas.replaceSection.shape,
    (args, extra) => handleReplaceSection(args, ctx(extra)),
  );

  // ── update_seo ───────────────────────────────────────────────
  registerSingleTool(
    server,
    "update_seo",
    schemas.updateSeo.shape,
    (args, extra) => handleUpdateSeo(args, ctx(extra)),
  );

  // ── list_components ──────────────────────────────────────────
  registerSingleTool(server, "list_components", undefined, (args, extra) =>
    handleListComponents(args, ctx(extra)),
  );

  // ── get_component ────────────────────────────────────────────
  registerSingleTool(
    server,
    "get_component",
    schemas.getComponent.shape,
    (args, extra) => handleGetComponent(args, ctx(extra)),
  );

  // ── list_assets ──────────────────────────────────────────────
  registerSingleTool(
    server,
    "list_assets",
    schemas.listAssets.shape,
    (args, extra) => handleListAssets(args, ctx(extra)),
  );

  // ── search_content ───────────────────────────────────────────
  registerSingleTool(
    server,
    "search_content",
    schemas.searchContent.shape,
    (args, extra) => handleSearchContent(args, ctx(extra)),
  );

  // ── scrape_url ───────────────────────────────────────────────
  registerSingleTool(
    server,
    "scrape_url",
    schemas.scrapeUrl.shape,
    (args, extra) => handleScrapeUrl(args, ctx(extra)),
  );

  // ── list_icons ───────────────────────────────────────────────
  registerSingleTool(server, "list_icons", undefined, (args, extra) =>
    handleListIcons(args, ctx(extra)),
  );

  // ── analyze_content_patterns ─────────────────────────────────
  registerSingleTool(
    server,
    "analyze_content_patterns",
    schemas.analyzeContentPatterns.shape,
    (args, extra) => handleAnalyzeContentPatterns(args, ctx(extra)),
  );

  // ── list_recipes ─────────────────────────────────────────────
  registerSingleTool(
    server,
    "list_recipes",
    schemas.listRecipes.shape,
    (args, extra) => handleListRecipes(args, ctx(extra)),
  );

  // ── plan_page ────────────────────────────────────────────────
  registerSingleTool(
    server,
    "plan_page",
    schemas.planPage.shape,
    (args, extra) => handlePlanPage(args, ctx(extra)),
    { ui: { resourceUri: PLAN_REVIEW_URI } },
  );

  // ── generate_section ─────────────────────────────────────────
  registerSingleTool(
    server,
    "generate_section",
    schemas.generateSection.shape,
    (args, extra) => handleGenerateSection(args, ctx(extra)),
    { ui: { resourceUri: SECTION_PREVIEW_URI } },
  );

  // ── generate_root_field ──────────────────────────────────────
  registerSingleTool(
    server,
    "generate_root_field",
    schemas.generateRootField.shape,
    (args, extra) => handleGenerateRootField(args, ctx(extra)),
  );

  // ── generate_seo ─────────────────────────────────────────────
  registerSingleTool(
    server,
    "generate_seo",
    schemas.generateSeo.shape,
    (args, extra) => handleGenerateSeo(args, ctx(extra)),
  );

  // ── content_audit ────────────────────────────────────────────
  registerSingleTool(
    server,
    "content_audit",
    schemas.contentAudit.shape,
    (args, extra) => handleContentAudit(args, ctx(extra)),
    { ui: { resourceUri: AUDIT_REPORT_URI } },
  );

  // ── ensure_path ──────────────────────────────────────────────
  registerSingleTool(
    server,
    "ensure_path",
    schemas.ensurePath.shape,
    (args, extra) => handleEnsurePath(args, ctx(extra)),
  );

  // ── list_themes ──────────────────────────────────────────────
  registerSingleTool(
    server,
    "list_themes",
    schemas.listThemes.shape,
    (args, extra) => handleListThemes(args, ctx(extra)),
  );

  // ── get_theme ────────────────────────────────────────────────
  registerSingleTool(
    server,
    "get_theme",
    schemas.getTheme.shape,
    (args, extra) => handleGetTheme(args, ctx(extra)),
  );

  // ── apply_theme ──────────────────────────────────────────────
  registerSingleTool(
    server,
    "apply_theme",
    schemas.applyTheme.shape,
    (args, extra) => handleApplyTheme(args, ctx(extra)),
  );

  // ── remove_theme ─────────────────────────────────────────────
  registerSingleTool(
    server,
    "remove_theme",
    schemas.removeTheme.shape,
    (args, extra) => handleRemoveTheme(args, ctx(extra)),
  );

  // ── create_theme ─────────────────────────────────────────────
  registerSingleTool(
    server,
    "create_theme",
    schemas.createTheme.shape,
    (args, extra) => handleCreateTheme(args, ctx(extra)),
  );

  // ── update_theme ─────────────────────────────────────────────
  registerSingleTool(
    server,
    "update_theme",
    schemas.updateTheme.shape,
    (args, extra) => handleUpdateTheme(args, ctx(extra)),
  );
}
