/**
 * Single-section content generation for AI-guided workflows.
 *
 * Extracts the `generate_section` logic from the MCP server into a
 * reusable function that can be consumed by the MCP server, Next.js
 * API routes, n8n nodes, and the Prompter component.
 *
 * The function:
 * 1. Gathers site-specific context from pre-resolved patterns
 * 2. Builds a context-aware system prompt with best practices,
 *    transition context, placeholder image instructions, and
 *    field-level compositional guidance
 * 3. Generates content via the full pipeline (schema → OpenAI → transform)
 * 4. Unwraps the page-level envelope to return a single section
 *
 * Pure function — no caching, no Storyblok client, no framework deps.
 * Pattern sourcing (cache vs live) is the caller's responsibility.
 */
import type { OpenAI } from "openai";
import {
  generateAndPrepareContent,
  PLACEHOLDER_IMAGE_INSTRUCTIONS,
} from "./pipeline.js";
import type { PrepareSchemaOptions } from "./schema.js";
import type { ContentTypeEntry } from "./registry.js";
import type { ContentPatternAnalysis, SubComponentStats } from "./patterns.js";
import { assembleFieldGuidance, type SectionRecipes } from "./guidance.js";

// ─── Types ────────────────────────────────────────────────────────────

/** Options for generating a single section. */
export interface GenerateSectionOptions {
  /** Component type to generate (e.g. "hero", "features", "faq"). */
  componentType: string;
  /** Content description for this section. */
  prompt: string;
  /** System prompt override. If omitted, a default content-writer prompt is used. */
  system?: string;
  /** Component type of the section before this one (for transition context). */
  previousSection?: string | null;
  /** Component type of the section after this one (for transition context). */
  nextSection?: string | null;
  /** Pre-resolved content pattern analysis (from cache or live fetch). */
  patterns?: ContentPatternAnalysis | null;
  /** Curated section recipes for best-practice injection. */
  recipes?: SectionRecipes | null;
  /**
   * Label for pattern scope (e.g. a `startsWith` prefix like "case-studies/").
   * Passed to `assembleFieldGuidance()` for context.
   */
  scopeLabel?: string;
}

/** Result of section generation. */
export interface GenerateSectionResult {
  /** The Storyblok-ready section object (with `component: "section"` and nested components). */
  section: Record<string, any>;
  /** The section content in Design System shape (before Storyblok flattening). */
  designSystemProps: Record<string, any>;
  /** The component type that was generated. */
  componentType: string;
}

// ─── Main function ────────────────────────────────────────────────────

/**
 * Generate a single section using AI with full site-aware context.
 *
 * Builds a layered system prompt from:
 * - Base persona (content writer for the component type)
 * - Placeholder image instructions
 * - Site-specific guidance (component stats from patterns)
 * - Transition context (previous/next section types)
 * - Recipe best practices
 * - Field-level compositional guidance (distributions + recipe hints)
 *
 * @param client - OpenAI client instance.
 * @param entry - The registered content type entry from the schema registry.
 * @param options - Generation options (componentType, prompt, context).
 * @returns The generated section in both Design System and Storyblok shapes.
 */
export async function generateSectionContent(
  client: OpenAI,
  entry: ContentTypeEntry,
  options: GenerateSectionOptions
): Promise<GenerateSectionResult> {
  const {
    componentType,
    prompt,
    system,
    previousSection,
    nextSection,
    patterns,
    recipes,
    scopeLabel,
  } = options;

  // ── Site-specific context ────────────────────────────────────────
  let siteContext = "";
  if (patterns) {
    const relevantStats = patterns.subComponentCounts[componentType] as
      | SubComponentStats
      | undefined;
    if (relevantStats) {
      siteContext += `\nOn this site, ${componentType} sections typically have ${relevantStats.median} sub-items (range: ${relevantStats.min}-${relevantStats.max}).`;
    }
    const freq = patterns.componentFrequency.find(
      (c: { component: string }) => c.component === componentType
    );
    if (freq) {
      siteContext += `\nThis component is used ${freq.count} times across the site.`;
    }
  }

  // ── Build context-aware system prompt ────────────────────────────
  let systemPrompt =
    system ||
    `You are an expert content writer creating a ${componentType} section for a website.`;

  // Always inject placeholder image instructions
  systemPrompt += `\n\n${PLACEHOLDER_IMAGE_INSTRUCTIONS}`;

  if (siteContext) {
    systemPrompt += `\n\nSite-specific guidance:${siteContext}`;
  }

  if (previousSection) {
    systemPrompt += `\n\nThis section follows a "${previousSection}" section. Ensure a smooth content transition.`;
  }
  if (nextSection) {
    systemPrompt += `\n\nThis section precedes a "${nextSection}" section. Set up the transition naturally.`;
  }

  // Check best practices from recipes — prefer content-type-specific match
  if (recipes?.recipes) {
    const recipe =
      recipes.recipes.find(
        (r: { components: string[]; contentType?: string }) =>
          r.components.includes(componentType) && r.contentType === entry.name
      ) ||
      recipes.recipes.find((r: { components: string[] }) =>
        r.components.includes(componentType)
      );
    if (recipe?.notes) {
      systemPrompt += `\n\nBest practices: ${recipe.notes}`;
    }
  }

  // Assemble field-level compositional guidance from patterns + recipes
  const defaultRecipes: SectionRecipes = {
    recipes: [],
    pageTemplates: [],
    antiPatterns: [],
  };
  const fieldGuidance = assembleFieldGuidance({
    componentType,
    patterns: patterns ?? null,
    recipes: recipes ?? defaultRecipes,
    scopeLabel,
  });
  if (fieldGuidance) {
    systemPrompt += fieldGuidance;
  }

  // ── Generate via pipeline ────────────────────────────────────────
  const schemaOptions: PrepareSchemaOptions = {
    validationRules: entry.rules,
    contentType: entry.name,
    allowedComponents: [componentType, "section"],
  };

  const result = await generateAndPrepareContent(client as any, {
    system: systemPrompt,
    prompt,
    pageSchema: entry.schema,
    schemaOptions,
    flatAssetFields: entry.rules.flatAssetFields,
  });

  // ── Unwrap page-level envelope ───────────────────────────────────
  // The pipeline always returns a page wrapper like { section: [{ component: "section", ... }] }.
  // For single-section generation we need just the section object, not the wrapper.
  const rootField = entry.rootArrayFields[0] || "section";
  const storyblokSections = result.storyblokContent[rootField] || [];

  const sectionContent =
    Array.isArray(storyblokSections) && storyblokSections.length > 0
      ? storyblokSections[0]
      : result.storyblokContent;

  return {
    section: sectionContent,
    designSystemProps: result.designSystemProps,
    componentType,
  };
}
