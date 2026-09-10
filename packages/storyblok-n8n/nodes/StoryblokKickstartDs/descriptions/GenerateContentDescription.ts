import { INodeProperties } from "n8n-workflow";

/**
 * Parameter definitions for the "Generate Content" operation.
 *
 * Visible when resource = "AI Content" and operation = "Generate".
 */
export const generateContentFields: INodeProperties[] = [
  // ── System prompt ─────────────────────────────────────────────────
  {
    displayName: "System Prompt",
    name: "system",
    type: "string",
    typeOptions: { rows: 6 },
    default:
      "You are a content writer for a professional website built with the kickstartDS Design System. Create engaging, structured content that matches the provided JSON schema exactly.",
    required: true,
    description:
      "System prompt that sets the AI personality, tone, and domain expertise",
    displayOptions: {
      show: {
        resource: ["aiContent"],
        operation: ["generate"],
      },
    },
  },

  // ── User prompt ───────────────────────────────────────────────────
  {
    displayName: "Prompt",
    name: "prompt",
    type: "string",
    typeOptions: { rows: 4 },
    default: "",
    required: true,
    placeholder:
      "e.g. Create a hero section for a landing page about AI-powered content generation",
    description:
      "Describe the content you want generated. Be specific about topic, tone, and audience.",
    displayOptions: {
      show: {
        resource: ["aiContent"],
        operation: ["generate"],
      },
    },
  },

  // ── Schema mode ───────────────────────────────────────────────────
  {
    displayName: "Schema Mode",
    name: "schemaMode",
    type: "options",
    options: [
      {
        name: "Auto (Design System)",
        value: "auto",
        description:
          "Automatically derive the schema from the kickstartDS Design System. Handles schema preparation, response post-processing, and Storyblok flattening.",
      },
      {
        name: "Preset (kickstartDS Component)",
        value: "preset",
        description:
          "Choose from built-in schemas for common kickstartDS components",
      },
      {
        name: "Custom JSON Schema",
        value: "custom",
        description: "Provide your own JSON Schema for structured output",
      },
    ],
    default: "auto",
    description:
      "How to provide the JSON Schema that controls the AI output structure. Auto mode is recommended — it handles everything automatically.",
    displayOptions: {
      show: {
        resource: ["aiContent"],
        operation: ["generate"],
      },
    },
  },

  // ── Auto mode: component type ─────────────────────────────────────
  {
    displayName: "Component Type",
    name: "autoComponentType",
    type: "string",
    default: "",
    description:
      'Component type to generate (e.g. "hero", "faq", "testimonials"). Leave empty to generate a full page with multiple sections.',
    placeholder: "hero",
    displayOptions: {
      show: {
        resource: ["aiContent"],
        operation: ["generate"],
        schemaMode: ["auto"],
      },
    },
  },
  {
    displayName: "Section Count",
    name: "autoSectionCount",
    type: "number",
    default: 1,
    typeOptions: { minValue: 1, maxValue: 10 },
    description:
      "Number of sections to generate. Only used for full-page generation (when Component Type is empty).",
    displayOptions: {
      show: {
        resource: ["aiContent"],
        operation: ["generate"],
        schemaMode: ["auto"],
      },
    },
  },

  // ── Preset schema picker ──────────────────────────────────────────
  {
    displayName: "Component Schema",
    name: "presetSchema",
    type: "options",
    options: [
      {
        name: "Hero",
        value: "hero",
        description: "Hero banner with headline, text, and CTAs",
      },
      {
        name: "FAQ",
        value: "faq",
        description: "FAQ accordion with question/answer pairs",
      },
      {
        name: "Testimonials",
        value: "testimonials",
        description: "Testimonial collection with quotes and author info",
      },
      {
        name: "Features",
        value: "features",
        description: "Feature grid with icon, title, and description",
      },
      {
        name: "CTA",
        value: "cta",
        description: "Call-to-action banner with text and buttons",
      },
      { name: "Text", value: "text", description: "Rich text content block" },
      {
        name: "Blog Teaser",
        value: "blog-teaser",
        description: "Blog post preview card content",
      },
      {
        name: "Stats",
        value: "stats",
        description: "Statistics section with numbers and descriptions",
      },
      {
        name: "Image + Text",
        value: "image-text",
        description: "Image and text side-by-side layout",
      },
    ],
    default: "hero",
    description: "Select a kickstartDS component type to generate content for",
    displayOptions: {
      show: {
        resource: ["aiContent"],
        operation: ["generate"],
        schemaMode: ["preset"],
      },
    },
  },

  // ── Custom JSON schema ────────────────────────────────────────────
  {
    displayName: "Schema Name",
    name: "customSchemaName",
    type: "string",
    default: "custom_content",
    required: true,
    description: "A name for the JSON schema (used by OpenAI internally)",
    displayOptions: {
      show: {
        resource: ["aiContent"],
        operation: ["generate"],
        schemaMode: ["custom"],
      },
    },
  },
  {
    displayName: "JSON Schema",
    name: "customSchema",
    type: "json",
    default: "{}",
    required: true,
    description:
      "The JSON Schema that defines the structure of the generated content. Must be a valid JSON Schema object.",
    placeholder:
      '{ "type": "object", "properties": { "headline": { "type": "string" } }, "required": ["headline"] }',
    displayOptions: {
      show: {
        resource: ["aiContent"],
        operation: ["generate"],
        schemaMode: ["custom"],
      },
    },
  },

  // ── Model selection ───────────────────────────────────────────────
  {
    displayName: "Model",
    name: "model",
    type: "options",
    options: [
      {
        name: "GPT-4o (Latest)",
        value: "gpt-4o",
        description: "Best quality, supports structured output",
      },
      {
        name: "GPT-4o (2024-08-06)",
        value: "gpt-4o-2024-08-06",
        description: "Stable snapshot with structured output support",
      },
      {
        name: "GPT-4o Mini",
        value: "gpt-4o-mini",
        description: "Faster and cheaper, good for simpler content",
      },
    ],
    default: "gpt-4o",
    description: "OpenAI model to use for content generation",
    displayOptions: {
      show: {
        resource: ["aiContent"],
        operation: ["generate"],
      },
    },
  },
];
