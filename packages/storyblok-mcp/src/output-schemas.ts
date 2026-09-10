/**
 * Zod output schemas for MCP tools that return structured data.
 *
 * Per ADR-002, output schemas are added selectively to the tools with
 * well-defined, stable return shapes. Tools with dynamic/opaque returns
 * (e.g., generate_content with user-supplied schema) are excluded.
 *
 * These schemas enable the MCP SDK to validate tool output and clients
 * to parse tool results programmatically via `structuredContent`.
 *
 * Uses Zod v3 (matching the project's pinned version) so the SDK can
 * call `normalizeObjectSchema()` / `safeParseAsync()` on them.
 *
 * @see PRD Section 3.2 and ADR-002
 */

import { z } from "zod";

// ── Output schemas (Zod) ───────────────────────────────────────────

/** Output schema for plan_page */
export const planPageOutputSchema = z
  .object({
    plan: z
      .record(z.unknown())
      .optional()
      .describe("The AI-generated page plan with section sequence"),
    contentType: z
      .string()
      .optional()
      .describe("The content type that was planned for"),
    rootFieldMeta: z
      .record(z.unknown())
      .optional()
      .describe(
        "Root field metadata with priority annotations (for hybrid content types like blog-post)",
      ),
    reviewStatus: z
      .string()
      .optional()
      .describe("Plan review status from elicitation (approved/modify)"),
    usage: z
      .string()
      .optional()
      .describe("Next-step instructions for the caller"),
    note: z.string().optional().describe("Instructions for next steps"),
    // Cancel path fields
    success: z.boolean().optional(),
    message: z.string().optional(),
  })
  .passthrough();

/** Output schema for generate_section */
export const generateSectionOutputSchema = z
  .object({
    section: z
      .record(z.unknown())
      .optional()
      .describe("Storyblok-ready section object (flattened for import)"),
    designSystemProps: z
      .record(z.unknown())
      .optional()
      .describe(
        "Design System shape before Storyblok flattening (for preview/debugging)",
      ),
    componentType: z
      .string()
      .optional()
      .describe("The component type that was generated"),
    note: z
      .string()
      .optional()
      .describe("Usage instructions for the generated section"),
    // Cancel path fields
    success: z.boolean().optional(),
    message: z.string().optional(),
  })
  .passthrough();

/** Output schema for generate_content (auto-schema path only) */
export const generateContentOutputSchema = z
  .object({
    designSystemProps: z
      .record(z.unknown())
      .optional()
      .describe("Design System shape of the generated content"),
    storyblokContent: z
      .record(z.unknown())
      .optional()
      .describe("Content transformed for Storyblok import"),
    rawResponse: z
      .record(z.unknown())
      .optional()
      .describe("Raw OpenAI response object"),
    content: z
      .record(z.unknown())
      .optional()
      .describe("Generated content matching the requested schema"),
    usage: z
      .record(z.unknown())
      .optional()
      .describe("OpenAI API usage statistics"),
  })
  .passthrough();

/** Output schema for analyze_content_patterns */
export const analyzeContentPatternsOutputSchema = z
  .object({
    totalStoriesAnalyzed: z
      .number()
      .describe("Total number of stories analyzed"),
    componentFrequency: z
      .array(
        z.object({
          component: z.string(),
          count: z.number(),
          percentage: z.number(),
        }),
      )
      .describe("Array of component usage frequencies"),
    commonSequences: z
      .array(z.record(z.unknown()))
      .optional()
      .describe("Common section sequences found across pages"),
    sectionCompositions: z
      .array(z.record(z.unknown()))
      .optional()
      .describe("Common component groupings within sections"),
    subComponentCounts: z
      .record(z.unknown())
      .optional()
      .describe(
        "Typical sub-component item counts (e.g., features typically has 4 items)",
      ),
    pageArchetypes: z
      .array(z.record(z.unknown()))
      .optional()
      .describe("Recurring full-page patterns"),
    unusedComponents: z
      .array(z.string())
      .optional()
      .describe("Components available but never used"),
    fieldProfiles: z
      .array(z.record(z.unknown()))
      .optional()
      .describe("Field value distributions across components"),
  })
  .passthrough();

/** Output schema for list_stories */
export const listStoriesOutputSchema = z
  .object({
    stories: z
      .array(
        z
          .object({
            id: z.number().optional(),
            slug: z.string().optional(),
            name: z.string().optional(),
            full_slug: z.string().optional(),
            created_at: z.string().optional(),
            published_at: z.string().optional(),
            is_folder: z.boolean().optional(),
          })
          .passthrough(),
      )
      .describe("Array of story objects"),
    total: z
      .number()
      .optional()
      .describe("Total number of stories matching the filter"),
    per_page: z.number().optional(),
  })
  .passthrough();

/** Output schema for get_story */
export const getStoryOutputSchema = z
  .object({
    id: z.number().optional(),
    slug: z.string().optional(),
    name: z.string().optional(),
    full_slug: z.string().optional(),
    created_at: z.string().optional(),
    published_at: z.string().optional(),
    content: z
      .record(z.unknown())
      .optional()
      .describe("Full content tree of the story"),
  })
  .passthrough();

/** Output schema for list_components */
export const listComponentsOutputSchema = z
  .object({
    components: z
      .array(
        z
          .object({
            name: z.string().optional(),
            display_name: z.string().optional(),
            is_root: z.boolean().optional(),
            is_nestable: z.boolean().optional(),
            isSubComponent: z.boolean().optional(),
            allowedIn: z
              .array(z.string())
              .optional()
              .describe("Slot paths where this component can be placed"),
            nestingConstraint: z
              .string()
              .optional()
              .describe("Human-readable nesting constraint explanation"),
          })
          .passthrough(),
      )
      .describe("Array of annotated component definitions"),
  })
  .passthrough();

/** Output schema for get_component */
export const getComponentOutputSchema = z
  .object({
    composition_rules: z.object({
      allowedIn: z
        .array(z.string())
        .optional()
        .describe("Slot paths where this component can be placed, or 'any'"),
      childSlots: z
        .record(z.unknown())
        .optional()
        .describe(
          "Child slots this component defines and their accepted types",
        ),
    }),
    schema: z
      .record(z.unknown())
      .describe("The full component schema from Storyblok"),
  })
  .passthrough();

// ── Write operation result schemas ─────────────────────────────────

/** Shared output schema for write operations that return a story result */
export const writeResultOutputSchema = z
  .object({
    success: z.boolean(),
    message: z.string(),
    story: z
      .record(z.unknown())
      .optional()
      .describe("The created/updated story object from Storyblok"),
    warnings: z
      .array(z.record(z.unknown()))
      .optional()
      .describe("Compositional quality warnings (non-blocking)"),
  })
  .passthrough();

// ── Theme management result schema ─────────────────────────────────

/** Output schema for apply_theme and remove_theme */
export const applyThemeOutputSchema = z
  .object({
    success: z.boolean().describe("Whether the theme operation succeeded"),
    storyId: z.number().describe("The affected story's numeric ID"),
    previousTheme: z
      .string()
      .nullable()
      .describe("Previous theme UUID (null if none was set)"),
    newTheme: z
      .string()
      .nullable()
      .describe("New theme UUID (null when removing)"),
  })
  .passthrough();

/** Output schema for create_theme */
export const createThemeOutputSchema = z
  .object({
    success: z.boolean().describe("Whether the theme was created successfully"),
    storyId: z.number().describe("The new theme story's numeric ID"),
    slug: z.string().describe("The theme slug"),
    fullSlug: z
      .string()
      .describe("Full slug path (e.g. 'settings/themes/brand-blue')"),
  })
  .passthrough();

/** Output schema for update_theme */
export const updateThemeOutputSchema = z
  .object({
    success: z.boolean().describe("Whether the theme was updated successfully"),
    storyId: z.number().describe("The theme story's numeric ID"),
    slug: z.string().describe("The theme slug"),
  })
  .passthrough();

// ── Content audit result schema ────────────────────────────────────

/** Output schema for content_audit */
export const contentAuditOutputSchema = z
  .object({
    generatedAt: z.string().describe("ISO timestamp of when the audit ran"),
    config: z.record(z.unknown()).describe("Audit configuration used"),
    summary: z
      .object({
        totalStories: z.number(),
        totalFindings: z.number(),
        byCategory: z
          .record(z.unknown())
          .describe(
            "Findings by category (images, content, seo, freshness, composition)",
          ),
        bySeverity: z.record(z.number()),
        byRule: z.record(z.number()),
        healthScore: z
          .number()
          .describe(
            "Health score from 0–100 — composition findings contribute to the score alongside images, content, SEO, and freshness",
          ),
      })
      .passthrough(),
    findings: z
      .array(z.record(z.unknown()))
      .describe(
        "All audit findings with rule, severity, category, and story. Composition findings are prefixed with 'composition-'",
      ),
    topOffenders: z
      .array(z.record(z.unknown()))
      .describe("Top 10 stories with the most issues"),
  })
  .passthrough();

// ── Mapping of tool name → output schema ───────────────────────────

/**
 * Map from tool name to its Zod output schema.
 * Tools not in this map have dynamic/opaque output shapes.
 *
 * The MCP SDK uses these schemas to:
 * 1. Convert to JSON Schema for the `tools/list` response
 * 2. Validate `structuredContent` in tool call responses
 */
export const OUTPUT_SCHEMAS: Record<string, z.ZodTypeAny> = {
  plan_page: planPageOutputSchema,
  generate_section: generateSectionOutputSchema,
  generate_content: generateContentOutputSchema,
  analyze_content_patterns: analyzeContentPatternsOutputSchema,
  get_component: getComponentOutputSchema,
  content_audit: contentAuditOutputSchema,

  // Write operations all share the same result shape
  import_content: writeResultOutputSchema,
  import_content_at_position: writeResultOutputSchema,
  create_page_with_content: writeResultOutputSchema,
  create_story: writeResultOutputSchema,
  update_story: writeResultOutputSchema,
  replace_section: writeResultOutputSchema,
  update_seo: writeResultOutputSchema,

  // Theme management
  apply_theme: applyThemeOutputSchema,
  remove_theme: applyThemeOutputSchema,
  create_theme: createThemeOutputSchema,
  update_theme: updateThemeOutputSchema,

  // NOTE: list_stories, get_story, list_components are excluded because
  // their handlers return raw Storyblok API shapes (arrays or passthrough
  // objects) that don't conform to a stable object schema.
};

// ── Annotation helpers ─────────────────────────────────────────────

/**
 * Build a Storyblok Editor URL for a given story.
 * Used in tool result annotations for write operations.
 *
 * @see ADR-004 for URL construction rationale
 */
export function buildStoryblokEditorUrl(
  spaceId: string | number,
  storyId: string | number,
): string {
  return `https://app.storyblok.com/#/me/spaces/${spaceId}/stories/0/0/${storyId}`;
}

/**
 * Create annotations for a write operation result.
 * Includes a resource link to the affected story in Storyblok.
 */
export function createWriteAnnotations(
  spaceId: string | number,
  storyId: string | number,
  storyName?: string,
): {
  annotations: {
    audience: string[];
  };
  resourceLinks: Array<{
    uri: string;
    name: string;
    mimeType: string;
  }>;
} {
  return {
    annotations: {
      audience: ["user", "assistant"],
    },
    resourceLinks: [
      {
        uri: buildStoryblokEditorUrl(spaceId, storyId),
        name: storyName
          ? `Open "${storyName}" in Storyblok`
          : "Open in Storyblok",
        mimeType: "text/html",
      },
    ],
  };
}
