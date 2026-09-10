/**
 * Tests for structured output schemas and annotation helpers.
 *
 * Verifies that output schemas are correctly defined for all mapped
 * tools and that annotation helpers produce valid resource links.
 *
 * The output schemas are Zod schemas — tests use `.shape` and
 * `.isOptional()` for introspection, not plain JSON Schema properties.
 *
 * @see src/output-schemas.ts
 */

import { z } from "zod";

import {
  OUTPUT_SCHEMAS,
  planPageOutputSchema,
  generateSectionOutputSchema,
  generateContentOutputSchema,
  analyzeContentPatternsOutputSchema,
  listStoriesOutputSchema,
  getStoryOutputSchema,
  listComponentsOutputSchema,
  getComponentOutputSchema,
  writeResultOutputSchema,
  buildStoryblokEditorUrl,
  createWriteAnnotations,
} from "../src/output-schemas.js";

// ── OUTPUT_SCHEMAS map ─────────────────────────────────────────────

describe("OUTPUT_SCHEMAS", () => {
  it("is a non-empty object", () => {
    expect(typeof OUTPUT_SCHEMAS).toBe("object");
    expect(Object.keys(OUTPUT_SCHEMAS).length).toBeGreaterThan(0);
  });

  it("contains schemas for all 13 mapped tools", () => {
    // list_stories, get_story, list_components are excluded —
    // they return raw Storyblok API shapes that don't conform to a stable object schema
    const expectedTools = [
      "plan_page",
      "generate_section",
      "generate_content",
      "analyze_content_patterns",
      "get_component",
      "content_audit",
      "import_content",
      "import_content_at_position",
      "create_page_with_content",
      "create_story",
      "update_story",
      "replace_section",
      "update_seo",
    ];
    expectedTools.forEach((tool) => {
      expect(OUTPUT_SCHEMAS).toHaveProperty(tool);
    });
    expect(Object.keys(OUTPUT_SCHEMAS)).toHaveLength(expectedTools.length);
  });

  it("every schema is a Zod schema with safeParse", () => {
    Object.entries(OUTPUT_SCHEMAS).forEach(([_name, schema]) => {
      expect(schema).toBeDefined();
      expect(typeof (schema as any).safeParse).toBe("function");
    });
  });

  it("write operations all share the same schema instance", () => {
    const writeTools = [
      "import_content",
      "import_content_at_position",
      "create_page_with_content",
      "create_story",
      "update_story",
      "replace_section",
      "update_seo",
    ];
    writeTools.forEach((tool) => {
      expect(OUTPUT_SCHEMAS[tool]).toBe(writeResultOutputSchema);
    });
  });
});

// ── Individual schemas ─────────────────────────────────────────────

describe("planPageOutputSchema", () => {
  const shape = planPageOutputSchema.shape;

  it("has plan, contentType, and note fields", () => {
    expect(shape).toHaveProperty("plan");
    expect(shape).toHaveProperty("contentType");
    expect(shape).toHaveProperty("note");
  });

  it("has rootFieldMeta as an optional property", () => {
    expect(shape).toHaveProperty("rootFieldMeta");
    expect(shape.rootFieldMeta.isOptional()).toBe(true);
  });

  it("accepts passthrough keys for additional fields", () => {
    const result = planPageOutputSchema.safeParse({
      plan: {},
      contentType: "page",
      note: "next steps",
      extraField: "should be allowed",
    });
    expect(result.success).toBe(true);
  });
});

describe("generateSectionOutputSchema", () => {
  const shape = generateSectionOutputSchema.shape;

  it("has section, designSystemProps, componentType, and note fields", () => {
    expect(shape).toHaveProperty("section");
    expect(shape).toHaveProperty("designSystemProps");
    expect(shape).toHaveProperty("componentType");
    expect(shape).toHaveProperty("note");
  });

  it("validates a typical section result", () => {
    const result = generateSectionOutputSchema.safeParse({
      section: { component: "hero", headline: "Test" },
      designSystemProps: { type: "hero", headline: "Test" },
      componentType: "hero",
      note: "Use import_content to add this section",
    });
    expect(result.success).toBe(true);
  });
});

describe("generateContentOutputSchema", () => {
  const shape = generateContentOutputSchema.shape;

  it("has content, usage, and storyblokContent properties", () => {
    expect(shape).toHaveProperty("content");
    expect(shape).toHaveProperty("usage");
    expect(shape).toHaveProperty("storyblokContent");
  });

  it("has designSystemProps and rawResponse properties", () => {
    expect(shape).toHaveProperty("designSystemProps");
    expect(shape).toHaveProperty("rawResponse");
  });
});

describe("analyzeContentPatternsOutputSchema", () => {
  const shape = analyzeContentPatternsOutputSchema.shape;

  it("has required totalStoriesAnalyzed and componentFrequency", () => {
    expect(shape).toHaveProperty("totalStoriesAnalyzed");
    expect(shape.totalStoriesAnalyzed.isOptional()).toBe(false);
    expect(shape).toHaveProperty("componentFrequency");
    expect(shape.componentFrequency.isOptional()).toBe(false);
  });

  it("includes pattern analysis fields", () => {
    expect(shape).toHaveProperty("commonSequences");
    expect(shape).toHaveProperty("sectionCompositions");
    expect(shape).toHaveProperty("subComponentCounts");
    expect(shape).toHaveProperty("pageArchetypes");
    expect(shape).toHaveProperty("unusedComponents");
    expect(shape).toHaveProperty("fieldProfiles");
  });

  it("pattern analysis fields are optional", () => {
    expect(shape.commonSequences.isOptional()).toBe(true);
    expect(shape.sectionCompositions.isOptional()).toBe(true);
    expect(shape.subComponentCounts.isOptional()).toBe(true);
    expect(shape.pageArchetypes.isOptional()).toBe(true);
    expect(shape.unusedComponents.isOptional()).toBe(true);
    expect(shape.fieldProfiles.isOptional()).toBe(true);
  });
});

describe("listStoriesOutputSchema", () => {
  const shape = listStoriesOutputSchema.shape;

  it("has stories field", () => {
    expect(shape).toHaveProperty("stories");
  });

  it("is not included in the OUTPUT_SCHEMAS map", () => {
    expect(OUTPUT_SCHEMAS).not.toHaveProperty("list_stories");
  });

  it("validates a typical stories result", () => {
    const result = listStoriesOutputSchema.safeParse({
      stories: [{ id: 1, slug: "test", name: "Test", full_slug: "test" }],
      total: 1,
    });
    expect(result.success).toBe(true);
  });
});

describe("getStoryOutputSchema", () => {
  const shape = getStoryOutputSchema.shape;

  it("has story metadata fields", () => {
    expect(shape).toHaveProperty("id");
    expect(shape).toHaveProperty("slug");
    expect(shape).toHaveProperty("name");
    expect(shape).toHaveProperty("content");
  });

  it("is not included in the OUTPUT_SCHEMAS map", () => {
    expect(OUTPUT_SCHEMAS).not.toHaveProperty("get_story");
  });
});

describe("listComponentsOutputSchema", () => {
  const shape = listComponentsOutputSchema.shape;

  it("has components field", () => {
    expect(shape).toHaveProperty("components");
  });

  it("is not included in the OUTPUT_SCHEMAS map", () => {
    expect(OUTPUT_SCHEMAS).not.toHaveProperty("list_components");
  });
});

describe("getComponentOutputSchema", () => {
  const shape = getComponentOutputSchema.shape;

  it("has required composition_rules and schema fields", () => {
    expect(shape).toHaveProperty("composition_rules");
    expect(shape.composition_rules.isOptional()).toBe(false);
    expect(shape).toHaveProperty("schema");
    expect(shape.schema.isOptional()).toBe(false);
  });

  it("composition_rules has allowedIn and childSlots", () => {
    const rulesShape = (shape.composition_rules as z.ZodObject<any>).shape;
    expect(rulesShape).toHaveProperty("allowedIn");
    expect(rulesShape).toHaveProperty("childSlots");
  });
});

describe("writeResultOutputSchema", () => {
  const shape = writeResultOutputSchema.shape;

  it("has required success and message fields", () => {
    expect(shape).toHaveProperty("success");
    expect(shape.success.isOptional()).toBe(false);
    expect(shape).toHaveProperty("message");
    expect(shape.message.isOptional()).toBe(false);
  });

  it("has optional story and warnings fields", () => {
    expect(shape).toHaveProperty("story");
    expect(shape.story.isOptional()).toBe(true);
    expect(shape).toHaveProperty("warnings");
    expect(shape.warnings.isOptional()).toBe(true);
  });

  it("validates a typical write result", () => {
    const result = writeResultOutputSchema.safeParse({
      success: true,
      message: "Page created (draft)",
      story: { id: 123, slug: "test" },
    });
    expect(result.success).toBe(true);
  });

  it("validates a write result with warnings", () => {
    const result = writeResultOutputSchema.safeParse({
      success: true,
      message: "Created",
      warnings: [{ level: "warning", message: "Sparse section" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = writeResultOutputSchema.safeParse({ story: {} });
    expect(result.success).toBe(false);
  });
});

// ── Annotation helpers ─────────────────────────────────────────────

describe("buildStoryblokEditorUrl", () => {
  it("returns a valid Storyblok editor URL", () => {
    const url = buildStoryblokEditorUrl("123456", "789");
    expect(url).toBe(
      "https://app.storyblok.com/#/me/spaces/123456/stories/0/0/789"
    );
  });

  it("handles numeric IDs", () => {
    const url = buildStoryblokEditorUrl(123456, 789);
    expect(url).toBe(
      "https://app.storyblok.com/#/me/spaces/123456/stories/0/0/789"
    );
  });
});

describe("createWriteAnnotations", () => {
  it("returns annotations with audience", () => {
    const result = createWriteAnnotations("123456", "789");
    expect(result.annotations.audience).toEqual(["user", "assistant"]);
  });

  it("returns a resource link with editor URL", () => {
    const result = createWriteAnnotations("123456", "789");
    expect(result.resourceLinks).toHaveLength(1);
    expect(result.resourceLinks[0].uri).toContain(
      "app.storyblok.com/#/me/spaces/123456/stories/0/0/789"
    );
    expect(result.resourceLinks[0].mimeType).toBe("text/html");
  });

  it("uses story name in link text when provided", () => {
    const result = createWriteAnnotations("123456", "789", "My Page");
    expect(result.resourceLinks[0].name).toContain("My Page");
  });

  it("uses generic text when story name is not provided", () => {
    const result = createWriteAnnotations("123456", "789");
    expect(result.resourceLinks[0].name).toContain("Open in Storyblok");
  });
});
