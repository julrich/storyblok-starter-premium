/**
 * Page structure planning for AI-guided content generation.
 *
 * Extracts the `plan_page` logic from the MCP server into a reusable
 * function that can be consumed by the MCP server, Next.js API routes,
 * n8n nodes, and the Prompter component.
 *
 * The function:
 * 1. Formats site pattern context from a `ContentPatternAnalysis`
 * 2. Resolves available components from the content type's schema
 * 3. Detects root fields for hybrid content types
 * 4. Builds a dynamic OpenAI structured-output schema with enums
 * 5. Calls OpenAI to generate the page plan
 * 6. Returns the plan with metadata and usage instructions
 *
 * Pure function — no caching, no Storyblok client, no framework deps.
 * Pattern sourcing (cache vs live) is the caller's responsibility.
 */
import type { OpenAI } from "openai";
import { generateStructuredContent } from "./openai.js";
import type { ContentTypeEntry, RootFieldMeta } from "./registry.js";
import type { ContentPatternAnalysis, SubComponentStats } from "./patterns.js";

// ─── Constants ────────────────────────────────────────────────────────

/**
 * Component types excluded from AI page planning.
 * These container components don't work well with automated generation
 * because they require manual layout decisions that AI cannot reliably make.
 */
const PLANNING_EXCLUDED_COMPONENTS = new Set(["split-even", "split-weighted"]);

// ─── Types ────────────────────────────────────────────────────────────

/** Options for planning a page structure. */
export interface PlanPageOptions {
  /** Description of the page to plan (e.g. "Product landing page for our new AI feature"). */
  intent: string;
  /** Target number of sections (default: auto-determined by AI). */
  sectionCount?: number;
  /** Pre-resolved content pattern analysis (from cache or live fetch). */
  patterns?: ContentPatternAnalysis | null;
}

/** A single section in the planned page structure. */
export interface PlannedSection {
  /** Component type (e.g. "hero", "features", "faq"). */
  componentType: string;
  /** Brief description of what this section should convey. */
  intent: string;
}

/** A single root field in the planned page structure (hybrid types). */
export interface PlannedRootField {
  /** Root field name (e.g. "head", "aside", "cta"). */
  fieldName: string;
  /** Brief description of what this field should contain. */
  intent: string;
}

/** A single field in the planned flat content structure (Tier 2 types). */
export interface PlannedField {
  /** Root field name (e.g. "title", "locations", "categories"). */
  fieldName: string;
  /** Brief description of what this field should contain. */
  intent: string;
}

/** The AI-generated page plan. */
export interface PagePlan {
  /** Ordered list of sections (Tier 1 types only). */
  sections?: PlannedSection[];
  /** Root fields to generate (hybrid types only). */
  rootFields?: PlannedRootField[];
  /** Fields to populate (Tier 2 flat types only). */
  fields?: PlannedField[];
  /** AI's reasoning for the structure choices. */
  reasoning: string;
}

/** Result of the page planning function. */
export interface PlanPageResult {
  /** The AI-generated page plan. */
  plan: PagePlan;
  /** The content type that was planned for. */
  contentType: string;
  /** Whether this is a flat (Tier 2) content type. */
  isFlat: boolean;
  /** Root field metadata for hybrid types (when generatable root fields exist). */
  rootFieldMeta?: Array<{
    name: string;
    type: string;
    priority: string;
    title?: string;
  }>;
  /** Instructions for the next steps in the generation workflow. */
  usage: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Format a `ContentPatternAnalysis` into a text block suitable for
 * injection into an AI system prompt.
 *
 * Shared by `planPageContent()` and `generateSectionContent()`.
 *
 * @returns A formatted string like `"\n\nSite patterns:\n- Most used: ..."`,
 *   or an empty string when no patterns are available.
 */
export function formatPatternsContext(
  patterns: ContentPatternAnalysis | null | undefined
): string {
  if (!patterns) return "";

  const topComponents = patterns.componentFrequency
    .slice(0, 10)
    .map(
      (c: { component: string; count: number }) =>
        `${c.component} (used ${c.count}x)`
    )
    .join(", ");

  const topSequences = patterns.commonSequences
    .slice(0, 8)
    .map(
      (s: { from: string; to: string; count: number }) =>
        `${s.from} → ${s.to} (${s.count}x)`
    )
    .join(", ");

  const subItems = Object.entries(patterns.subComponentCounts)
    .map(
      ([component, s]) =>
        `${component}: median ${(s as SubComponentStats).median} items (${
          (s as SubComponentStats).min
        }-${(s as SubComponentStats).max})`
    )
    .join(", ");

  return `\n\nSite patterns:\n- Most used: ${topComponents}\n- Common sequences: ${topSequences}\n- Sub-item counts: ${subItems}`;
}

// ─── Main function ────────────────────────────────────────────────────

/**
 * Plan a page structure using AI.
 *
 * Determines the optimal section sequence (Tier 1) or field population plan
 * (Tier 2) for the given intent. For hybrid content types (e.g. blog-post),
 * also identifies root-level fields that need separate generation.
 *
 * @param client - OpenAI client instance.
 * @param entry - The registered content type entry from the schema registry.
 * @param options - Planning options (intent, sectionCount, patterns).
 * @returns The structured plan with metadata and usage instructions.
 */
export async function planPageContent(
  client: OpenAI,
  entry: ContentTypeEntry,
  options: PlanPageOptions
): Promise<PlanPageResult> {
  const { intent, sectionCount, patterns } = options;
  const contentType = entry.name;
  const rules = entry.rules;

  const patternsContext = formatPatternsContext(patterns);

  // ── Resolve available components / fields ────────────────────────
  let componentNames: string[];
  let isFlat = false;

  if (entry.hasSections) {
    // Tier 1 (section-based): look up the primary container slot
    const primaryArrayField = rules.rootArrayFields[0];
    const sectionSlot = primaryArrayField
      ? [...rules.containerSlots.entries()].find(([path]) =>
          path.startsWith(`${primaryArrayField}.`)
        )?.[1]
      : undefined;
    componentNames = (
      sectionSlot ? [...sectionSlot] : [...rules.allKnownComponents]
    ).filter((c) => !PLANNING_EXCLUDED_COMPONENTS.has(c));
  } else {
    // Tier 2 (flat): list root fields as planning targets
    isFlat = true;
    componentNames = rules.rootArrayFields;
  }

  // ── Detect root fields for hybrid types ──────────────────────────
  const rootFieldMeta = entry.rootFieldMeta || [];
  const generatableRootFields = rootFieldMeta.filter(
    (f: RootFieldMeta) => f.priority !== "excluded" && !f.isSectionArray
  );
  const hasRootFields = generatableRootFields.length > 0;

  // ── Build prompt & schema ────────────────────────────────────────
  let planPrompt: string;
  let planSchema: {
    name: string;
    schema: Record<string, unknown>;
    strict: boolean;
  };

  if (isFlat) {
    // Tier 2 (flat content types): plan which root fields to populate
    const allRootFieldNames = rootFieldMeta
      .filter((f: RootFieldMeta) => f.priority !== "excluded")
      .map((f: RootFieldMeta) => f.name);
    const fieldDescriptions = rootFieldMeta
      .filter((f: RootFieldMeta) => f.priority !== "excluded")
      .map(
        (f: RootFieldMeta) =>
          `- ${f.name} (${f.type}${f.schemaRequired ? ", required" : ""}): ${
            f.description || f.title || "no description"
          }`
      )
      .join("\n");

    planPrompt = `You are a content structure planner for "${contentType}" content. Given an intent, suggest which root fields to populate and what content each should contain.

Available root fields:
${fieldDescriptions}
${patternsContext}

Respond with a JSON object:
{
  "fields": [
    { "fieldName": "title", "intent": "brief description of what this field should contain" }
  ],
  "reasoning": "brief explanation of the structure choices"
}`;

    planSchema = {
      name: `${contentType.replace(/-/g, "_")}_plan`,
      schema: {
        type: "object",
        properties: {
          fields: {
            type: "array",
            items: {
              type: "object",
              properties: {
                fieldName: {
                  type: "string",
                  enum:
                    allRootFieldNames.length > 0
                      ? allRootFieldNames
                      : componentNames,
                },
                intent: { type: "string" },
              },
              required: ["fieldName", "intent"],
              additionalProperties: false,
            },
          },
          reasoning: { type: "string" },
        },
        required: ["fields", "reasoning"],
        additionalProperties: false,
      },
      strict: true,
    };
  } else {
    // Tier 1 (section-based): plan section sequence
    let rootFieldsInstruction = "";
    if (hasRootFields) {
      const fieldDescriptions = generatableRootFields
        .map(
          (f: RootFieldMeta) =>
            `- ${f.name} (${f.type}, priority: ${f.priority}): ${
              f.description || f.title || "no description"
            }`
        )
        .join("\n");
      rootFieldsInstruction = `\n\nThis content type also has root-level fields that should be generated separately via generate_root_field:\n${fieldDescriptions}\n\nInclude these in your "rootFields" array — indicate which ones to generate and a brief intent for each. Fields with priority "required" must always be included.`;
    }

    planPrompt = `You are a web page structure planner. Given a page intent, suggest an ordered list of sections for content type "${contentType}".

Available section component types: ${componentNames.join(", ")}
${patternsContext}

Recipes resource is also available with proven combinations.

Rules:
- Start most pages with "hero" or "video-curtain"
- End conversion pages with a CTA section
- Use "divider" sparingly, only between thematically different blocks
- Prefer variety: don't repeat the same component type in adjacent sections
- ${
      sectionCount
        ? `Target exactly ${sectionCount} sections`
        : "Choose an appropriate number of sections (typically 4-8)"
    }${rootFieldsInstruction}

Respond with a JSON object:
{
  "sections": [
    { "componentType": "hero", "intent": "brief description of what this section should convey" }
  ],${
    hasRootFields
      ? `
  "rootFields": [
    { "fieldName": "head", "intent": "brief description of what this field should contain" }
  ],`
      : ""
  }
  "reasoning": "brief explanation of the structure choices"
}`;

    // Build schema — include rootFields array for hybrid types
    const planProperties: Record<string, unknown> = {
      sections: {
        type: "array",
        items: {
          type: "object",
          properties: {
            componentType: {
              type: "string",
              enum: componentNames,
            },
            intent: { type: "string" },
          },
          required: ["componentType", "intent"],
          additionalProperties: false,
        },
      },
      reasoning: { type: "string" },
    };
    const planRequired: string[] = ["sections", "reasoning"];

    if (hasRootFields) {
      const rootFieldNames = generatableRootFields.map(
        (f: RootFieldMeta) => f.name
      );
      planProperties.rootFields = {
        type: "array",
        items: {
          type: "object",
          properties: {
            fieldName: {
              type: "string",
              enum: rootFieldNames,
            },
            intent: { type: "string" },
          },
          required: ["fieldName", "intent"],
          additionalProperties: false,
        },
      };
      planRequired.push("rootFields");
    }

    planSchema = {
      name: `${contentType.replace(/-/g, "_")}_plan`,
      schema: {
        type: "object",
        properties: planProperties,
        required: planRequired,
        additionalProperties: false,
      },
      strict: true,
    };
  }

  // ── Call OpenAI ──────────────────────────────────────────────────
  const response = (await generateStructuredContent(client as any, {
    system: planPrompt,
    prompt: `Plan ${isFlat ? "content" : "a page"} for: ${intent}`,
    schema: planSchema,
  })) as unknown as PagePlan;

  // ── Build result ─────────────────────────────────────────────────
  let usage: string;
  if (isFlat) {
    usage =
      "Use generate_root_field(fieldName=..., contentType=...) for each field, then create_page_with_content with rootFields.";
  } else if (hasRootFields) {
    usage =
      "Use generate_section for each section, generate_root_field for each root field (head, aside, cta), and generate_seo for SEO metadata. Then assemble with create_page_with_content(sections: [...], rootFields: { head, aside, cta, seo }).";
  } else {
    usage =
      "Use generate_section or generate_content(componentType=...) for each section in order. Pass previousSection/nextSection for better transitions.";
  }

  const result: PlanPageResult = {
    plan: response,
    contentType,
    isFlat,
    usage,
  };

  if (hasRootFields) {
    result.rootFieldMeta = generatableRootFields.map((f: RootFieldMeta) => ({
      name: f.name,
      type: f.type,
      priority: f.priority,
      title: f.title,
    }));
  }

  return result;
}
