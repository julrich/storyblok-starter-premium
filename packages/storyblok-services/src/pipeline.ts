/**
 * High-level content generation pipeline.
 *
 * Orchestrates the full flow:
 *   User prompt → schema preparation → OpenAI generation →
 *   response post-processing → Storyblok flattening
 *
 * Consumers who want fine-grained control can call the individual
 * functions from `schema.ts`, `openai.ts`, and `transform.ts` directly.
 */
import type { OpenAI } from "openai";
import { generateStructuredContent } from "./openai.js";
import {
  prepareSchemaForOpenAi,
  getRootFieldSchema,
  type PrepareSchemaOptions,
  type PreparedSchema,
} from "./schema.js";
import {
  processOpenAiResponse,
  processForStoryblok,
  flattenNestedObjects,
  injectRootFieldComponentTypes,
  type TransformedContent,
} from "./transform.js";

// ─── Constants ────────────────────────────────────────────────────────

/**
 * Instructions for generating placeholder images via placehold.co.
 *
 * When no real image URLs are available (e.g. during AI content generation),
 * these instructions tell the model to produce descriptive placeholder URLs
 * so that generated pages always render visible images instead of blank areas.
 *
 * Used by: MCP server (generate_section, generate_content), n8n node (generateSection).
 */
export const PLACEHOLDER_IMAGE_INSTRUCTIONS = `
For every image field in the generated content, you MUST provide a placeholder URL using placehold.co:
- Format: https://placehold.co/1200x600?text=Dynamic+Web+Evolution
  where after the domain you specify dimensions (width x height) and a "text" query parameter
- The text should be a short, descriptive phrase for a fitting image (it doubles as alt text)
- Use "+" for spaces in the text parameter
- If the image field is called "backgroundImage" or is inside a Hero component's "image" field,
  add "transparent/999999" after the dimensions:
  e.g. https://placehold.co/1200x600/transparent/999999?text=Dynamic+Web+Evolution
- Never append any other parameters or path segments beyond what is described here
- Always fill image fields — never leave them empty or omit them
`.trim();

// ─── Types ────────────────────────────────────────────────────────────

/** Options for the end-to-end generation pipeline. */
export interface GenerateAndPrepareOptions {
  /** System prompt guiding the AI persona. */
  system: string;
  /** User prompt describing what to generate. */
  prompt: string;
  /** The fully dereferenced page JSON Schema. */
  pageSchema: Record<string, any>;
  /** Schema preparation options (section count, component filter, etc.). */
  schemaOptions?: PrepareSchemaOptions;
  /** OpenAI model identifier. @default "gpt-4o-2024-08-06" */
  model?: string;
  /**
   * Optional function to derive default prop values from a JSON Schema.
   * When provided, defaults are merged into the AI response.
   * Signature matches `defaultObjectForSchema` from `@kickstartds/cambria`.
   */
  defaultObjectForSchema?: (schema: object) => Record<string, any>;
  /**
   * Optional deep-merge function.
   * When provided, used for merging defaults into generated content.
   */
  deepMerge?: (a: any, b: any) => any;
  /**
   * Optional map of component name → set of flat asset field names.
   * When provided, these fields are skipped during `flattenNestedObjects`
   * so that scalar URL fields are not incorrectly underscore-split.
   */
  flatAssetFields?: Map<string, Set<string>>;
}

/** Result of the end-to-end pipeline. */
export interface GenerateAndPrepareResult extends TransformedContent {
  /** The raw JSON returned by OpenAI (before any processing). */
  rawResponse: Record<string, any>;
  /** The prepared schema that was sent to OpenAI. */
  preparedSchema: PreparedSchema;
}

// ─── Pipeline ─────────────────────────────────────────────────────────

/**
 * End-to-end content generation pipeline.
 *
 * 1. Prepares the page schema for OpenAI
 * 2. Calls OpenAI to generate content
 * 3. Post-processes the response back to DS shape
 * 4. Flattens for Storyblok import
 *
 * @returns Both Design System–shaped props and Storyblok-ready content.
 */
export async function generateAndPrepareContent(
  client: OpenAI,
  options: GenerateAndPrepareOptions
): Promise<GenerateAndPrepareResult> {
  const {
    system,
    prompt,
    pageSchema,
    schemaOptions,
    model,
    defaultObjectForSchema,
    deepMerge,
    flatAssetFields,
  } = options;

  // 1. Prepare schema
  const preparedSchema = prepareSchemaForOpenAi(pageSchema, schemaOptions);

  // 1b. Pre-flight: abort if schema exceeds OpenAI structured-output limits
  const { warnings, enumValueCount, totalProperties } =
    preparedSchema.validation;
  if (warnings.length > 0) {
    const limitErrors = warnings.filter((w) =>
      w.includes("exceeds OpenAI limit")
    );
    if (limitErrors.length > 0) {
      throw new Error(
        `Schema exceeds OpenAI structured-output limits and would be rejected:\n` +
          limitErrors.join("\n") +
          `\n(totalProperties=${totalProperties}, enumValueCount=${enumValueCount})` +
          `\nConsider reducing the number of allowed components or using ` +
          `componentType to generate a single component at a time.`
      );
    }
  }

  // 2. Generate via OpenAI
  const rawResponse = await generateStructuredContent(client as any, {
    system,
    prompt,
    schema: preparedSchema.envelope,
    model,
  });

  // 3. Post-process response → DS props
  const designSystemProps = processOpenAiResponse(
    rawResponse,
    preparedSchema.schemaMap,
    defaultObjectForSchema,
    deepMerge
  );

  // 4. Flatten for Storyblok
  const storyblokContent = processForStoryblok(
    designSystemProps,
    flatAssetFields
  );

  return {
    rawResponse,
    preparedSchema,
    designSystemProps,
    storyblokContent,
  };
}

// ─── Root field generation ────────────────────────────────────────────

/** Options for generating a single root-level field. */
export interface GenerateRootFieldOptions {
  /** System prompt guiding the AI. */
  system: string;
  /** User prompt describing what to generate. */
  prompt: string;
  /** The fully dereferenced content type JSON Schema. */
  contentTypeSchema: Record<string, any>;
  /** Name of the root field to generate (e.g. `"head"`, `"aside"`, `"cta"`). */
  fieldName: string;
  /** Content type name (e.g. `"blog-post"`). @default "page" */
  contentType?: string;
  /** OpenAI model identifier. @default "gpt-4o-2024-08-06" */
  model?: string;
}

/** Result of root field generation. */
export interface GenerateRootFieldResult {
  /** The raw JSON returned by OpenAI. */
  rawResponse: Record<string, any>;
  /** The generated field content in Design System shape. */
  designSystemProps: Record<string, any>;
  /**
   * The generated field content transformed for Storyblok.
   *
   * This is an **array** (matching Storyblok bloks field format), containing
   * a single object with `component` identifier and flattened nested props.
   *
   * Example: `[{ component: "blog-head", headline: "...", tags: [...] }]`
   */
  storyblokContent: Record<string, any> | Record<string, any>[];
  /** The field name that was generated. */
  fieldName: string;
}

/**
 * Generate content for a single root-level field on a content type.
 *
 * Used for non-section root fields like `head`, `aside`, `cta` on blog-post,
 * or `filter` on event-list. Extracts the field's sub-schema, prepares it
 * for OpenAI, generates content, and transforms for Storyblok.
 *
 * The generated content is processed through the same `processForStoryblok`
 * pipeline as sections: `type` fields are injected based on the schema's
 * `$id` values, then converted to `component` identifiers, and nested value
 * objects are flattened. The result is wrapped in an array since Storyblok
 * bloks fields are always arrays.
 *
 * @returns The generated content for the field, both in DS and Storyblok shapes.
 *   `storyblokContent` is an **array** (matching Storyblok bloks field format).
 */
export async function generateRootFieldContent(
  client: OpenAI,
  options: GenerateRootFieldOptions
): Promise<GenerateRootFieldResult> {
  const {
    system,
    prompt,
    contentTypeSchema,
    fieldName,
    contentType = "page",
    model,
  } = options;

  // Keep a reference to the original field schema (with $id values intact)
  // before getRootFieldSchema strips them during OpenAI cleanup.
  const originalFieldSchema = contentTypeSchema.properties?.[fieldName];

  // Extract the field's sub-schema (cleaned for OpenAI)
  const fieldSchemaEnvelope = getRootFieldSchema(
    contentTypeSchema,
    fieldName,
    contentType
  );
  if (!fieldSchemaEnvelope) {
    throw new Error(
      `Root field "${fieldName}" not found in ${contentType} schema. ` +
        `Available properties: ${Object.keys(
          contentTypeSchema.properties || {}
        ).join(", ")}`
    );
  }

  // Generate via OpenAI
  const rawResponse = await generateStructuredContent(client as any, {
    system,
    prompt,
    schema: fieldSchemaEnvelope,
    model,
  });

  // The response IS the field content (no envelope to unwrap)
  const designSystemProps = structuredClone(rawResponse);

  // Transform for Storyblok:
  // 1. Inject `type` discriminators using the original schema ($id values)
  // 2. Run processForStoryblok to convert type → component and flatten
  // 3. Wrap in array (Storyblok bloks fields are always arrays)
  let storyblokContent: Record<string, any> | Record<string, any>[];
  if (originalFieldSchema && originalFieldSchema.$id) {
    // Full pipeline: inject component types → processForStoryblok
    const withTypes = injectRootFieldComponentTypes(
      structuredClone(rawResponse),
      originalFieldSchema
    );
    const processed = processForStoryblok(withTypes);
    storyblokContent = [processed];
  } else {
    // Fallback for fields without $id: basic flattening + array wrap
    const flat = structuredClone(rawResponse);
    if (typeof flat === "object" && flat !== null && !Array.isArray(flat)) {
      flattenNestedObjects(flat);
    }
    storyblokContent = [flat];
  }

  return {
    rawResponse,
    designSystemProps,
    storyblokContent,
    fieldName,
  };
}

// ─── SEO generation ──────────────────────────────────────────────────

/** Options for generating SEO metadata. */
export interface GenerateSeoOptions {
  /** User prompt / page summary to derive SEO from. */
  prompt: string;
  /** The fully dereferenced content type JSON Schema (must have a `seo` field). */
  contentTypeSchema: Record<string, any>;
  /** Content type name (e.g. `"blog-post"`). @default "page" */
  contentType?: string;
  /** OpenAI model identifier. @default "gpt-4o-2024-08-06" */
  model?: string;
  /**
   * Optional system prompt override. Defaults to an SEO-specialist prompt.
   */
  system?: string;
}

/** Result of SEO generation. */
export interface GenerateSeoResult {
  /** The raw JSON returned by OpenAI. */
  rawResponse: Record<string, any>;
  /** The generated SEO content in Design System shape. */
  designSystemProps: Record<string, any>;
  /**
   * The generated SEO content transformed for Storyblok.
   * Array format matching Storyblok bloks field convention.
   */
  storyblokContent: Record<string, any> | Record<string, any>[];
}

/** Default system prompt for SEO generation. */
const SEO_SYSTEM_PROMPT = `You are an SEO specialist. Generate optimized SEO metadata for a web page based on the provided content summary.

Guidelines:
- Title: 50-60 characters, include primary keyword near the start
- Description: 150-160 characters, compelling and action-oriented
- Keywords: 5-8 relevant keywords, comma-separated
- Image: If an image field is available, provide a descriptive placeholder URL using placehold.co (e.g. https://placehold.co/1200x630?text=Page+Title+OG+Image)

The SEO metadata should accurately represent the page content while being optimized for search engines and social media sharing.`;

/**
 * Generate SEO metadata for a content type.
 *
 * Extracts the `seo` field's sub-schema from the content type schema,
 * generates optimized SEO content via OpenAI, and returns it ready for
 * merging into `rootFields`.
 *
 * This is designed as a post-generation step: call it AFTER generating
 * sections and root fields, passing a summary of the page content as
 * the prompt so the SEO metadata accurately reflects the actual content.
 *
 * @returns The generated SEO content for the `seo` field.
 */
export async function generateSeoContent(
  client: OpenAI,
  options: GenerateSeoOptions
): Promise<GenerateSeoResult> {
  const {
    prompt,
    contentTypeSchema,
    contentType = "page",
    model,
    system = SEO_SYSTEM_PROMPT,
  } = options;

  return generateRootFieldContent(client, {
    system,
    prompt,
    contentTypeSchema,
    fieldName: "seo",
    contentType,
    model,
  });
}
