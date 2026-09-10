/**
 * Unit tests for schema-tree.ts — JSON Schema → tree model parsing.
 *
 * Tests cover: scalar fields, nested objects, arrays, polymorphic slots,
 * allOf merging, enum fields, format metadata, $ref warnings, and
 * schema order assignment.
 */

import { describe, it, expect } from "vitest";
import {
  parseField,
  parseComponent,
  parseContentType,
} from "../src/app/lib/schema-tree.js";

// ─── parseField ─────────────────────────────────────────────────────────────

describe("parseField", () => {
  it("parses a simple string field", () => {
    const field = parseField(
      "headline",
      { type: "string", title: "Headline" },
      "",
      new Set()
    );
    expect(field.kind).toBe("field");
    expect(field.meta.name).toBe("headline");
    expect(field.meta.path).toBe("headline");
    expect(field.meta.type).toBe("string");
    expect(field.meta.title).toBe("Headline");
    expect(field.children).toEqual([]);
    expect(field.isPolymorphic).toBe(false);
  });

  it("parses a boolean field", () => {
    const field = parseField("active", { type: "boolean" }, "", new Set());
    expect(field.meta.type).toBe("boolean");
    expect(field.children).toEqual([]);
  });

  it("parses a number field", () => {
    const field = parseField("count", { type: "number" }, "", new Set());
    expect(field.meta.type).toBe("number");
  });

  it("parses an integer field", () => {
    const field = parseField("index", { type: "integer" }, "", new Set());
    expect(field.meta.type).toBe("integer");
  });

  it("assigns schemaOrder", () => {
    const field = parseField("headline", { type: "string" }, "", new Set(), 5);
    expect(field.meta.schemaOrder).toBe(5);
  });

  it("defaults schemaOrder to 0", () => {
    const field = parseField("headline", { type: "string" }, "", new Set());
    expect(field.meta.schemaOrder).toBe(0);
  });

  it("parses format metadata", () => {
    const field = parseField(
      "url",
      { type: "string", format: "uri" },
      "",
      new Set()
    );
    expect(field.meta.format).toBe("uri");
  });

  it("parses enum values", () => {
    const field = parseField(
      "align",
      { type: "string", enum: ["left", "center", "right"] },
      "",
      new Set()
    );
    expect(field.meta.enumValues).toEqual(["left", "center", "right"]);
  });

  it("parses default value", () => {
    const field = parseField(
      "visible",
      { type: "boolean", default: true },
      "",
      new Set()
    );
    expect(field.meta.defaultValue).toBe(true);
  });

  it("marks required fields", () => {
    const field = parseField(
      "label",
      { type: "string" },
      "",
      new Set(["label"])
    );
    expect(field.meta.required).toBe(true);
  });

  it("marks non-required fields", () => {
    const field = parseField(
      "label",
      { type: "string" },
      "",
      new Set(["other"])
    );
    expect(field.meta.required).toBe(false);
  });

  it("builds correct dot-path with parent", () => {
    const field = parseField(
      "srcMobile",
      { type: "string" },
      "image",
      new Set()
    );
    expect(field.meta.path).toBe("image.srcMobile");
  });

  // ── Nested objects ──

  it("parses an object with nested properties", () => {
    const field = parseField(
      "image",
      {
        type: "object",
        properties: {
          src: { type: "string", title: "Source" },
          alt: { type: "string" },
        },
        required: ["src"],
      },
      "",
      new Set()
    );

    expect(field.meta.type).toBe("object");
    expect(field.children).toHaveLength(2);

    const srcChild = field.children.find((c) => c.meta.name === "src");
    expect(srcChild).toBeDefined();
    expect(srcChild!.meta.path).toBe("image.src");
    expect(srcChild!.meta.title).toBe("Source");
    expect(srcChild!.meta.required).toBe(true);

    const altChild = field.children.find((c) => c.meta.name === "alt");
    expect(altChild).toBeDefined();
    expect(altChild!.meta.path).toBe("image.alt");
    expect(altChild!.meta.required).toBe(false);
  });

  it("assigns schemaOrder to children by index", () => {
    const field = parseField(
      "image",
      {
        type: "object",
        properties: {
          src: { type: "string" },
          alt: { type: "string" },
          indent: { type: "string" },
        },
      },
      "",
      new Set()
    );

    expect(field.children[0].meta.schemaOrder).toBe(0);
    expect(field.children[1].meta.schemaOrder).toBe(1);
    expect(field.children[2].meta.schemaOrder).toBe(2);
  });

  it("parses deeply nested objects (3 levels)", () => {
    const field = parseField(
      "config",
      {
        type: "object",
        properties: {
          layout: {
            type: "object",
            properties: {
              spacing: { type: "number" },
            },
          },
        },
      },
      "",
      new Set()
    );

    expect(field.meta.type).toBe("object");
    expect(field.children).toHaveLength(1);
    const layout = field.children[0];
    expect(layout.meta.path).toBe("config.layout");
    expect(layout.children).toHaveLength(1);
    const spacing = layout.children[0];
    expect(spacing.meta.path).toBe("config.layout.spacing");
    expect(spacing.meta.type).toBe("number");
  });

  // ── Arrays ──

  it("parses an array with object items", () => {
    const field = parseField(
      "buttons",
      {
        type: "array",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            icon: { type: "string" },
          },
          required: ["label"],
        },
      },
      "",
      new Set()
    );

    expect(field.meta.type).toBe("array");
    expect(field.children).toHaveLength(2);
    expect(field.children[0].meta.path).toBe("buttons[].label");
    expect(field.children[0].meta.required).toBe(true);
    expect(field.children[1].meta.path).toBe("buttons[].icon");
  });

  it("parses an array with scalar items as a leaf", () => {
    const field = parseField(
      "tags",
      {
        type: "array",
        items: { type: "string" },
      },
      "",
      new Set()
    );

    expect(field.meta.type).toBe("array");
    expect(field.children).toEqual([]);
  });

  it("parses a polymorphic array (anyOf items)", () => {
    const field = parseField(
      "components",
      {
        type: "array",
        items: {
          anyOf: [
            {
              type: "object",
              title: "hero",
              properties: { headline: { type: "string" } },
            },
            {
              type: "object",
              title: "cta",
              properties: { label: { type: "string" } },
            },
            {
              type: "object",
              title: "faq",
              properties: { question: { type: "string" } },
            },
          ],
        },
      },
      "",
      new Set()
    );

    expect(field.meta.type).toBe("array");
    expect(field.isPolymorphic).toBe(true);
    expect(field.polymorphicVariants).toEqual(["hero", "cta", "faq"]);
    expect(field.children).toEqual([]);
  });

  it("parses a polymorphic array (oneOf items)", () => {
    const field = parseField(
      "items",
      {
        type: "array",
        items: {
          oneOf: [
            {
              type: "object",
              title: "text",
              properties: { body: { type: "string" } },
            },
            {
              type: "object",
              title: "image",
              properties: { src: { type: "string" } },
            },
          ],
        },
      },
      "",
      new Set()
    );

    expect(field.isPolymorphic).toBe(true);
    expect(field.polymorphicVariants).toEqual(["text", "image"]);
  });

  it("extracts variant names from $id", () => {
    const field = parseField(
      "components",
      {
        type: "array",
        items: {
          anyOf: [
            {
              type: "object",
              $id: "http://schema.example.com/hero.schema.json",
              properties: { h: { type: "string" } },
            },
            {
              type: "object",
              $id: "http://schema.example.com/cta.schema.json",
              properties: { c: { type: "string" } },
            },
          ],
        },
      },
      "",
      new Set()
    );

    expect(field.polymorphicVariants).toEqual(["hero", "cta"]);
  });

  // ── Direct polymorphic field (not in array items) ──

  it("marks a direct polymorphic field", () => {
    const field = parseField(
      "content",
      {
        anyOf: [
          {
            type: "object",
            title: "text",
            properties: { body: { type: "string" } },
          },
          {
            type: "object",
            title: "image",
            properties: { src: { type: "string" } },
          },
        ],
      },
      "",
      new Set()
    );

    expect(field.isPolymorphic).toBe(true);
    expect(field.meta.type).toBe("polymorphic");
    expect(field.polymorphicVariants).toEqual(["text", "image"]);
  });

  it("treats single-variant anyOf as non-polymorphic", () => {
    const field = parseField(
      "content",
      {
        anyOf: [{ type: "string", title: "text" }],
      },
      "",
      new Set()
    );

    expect(field.isPolymorphic).toBe(false);
    expect(field.meta.type).toBe("string");
  });

  it("treats same-type anyOf variants as non-polymorphic", () => {
    const field = parseField(
      "value",
      {
        anyOf: [{ type: "string" }, { type: "string" }],
      },
      "",
      new Set()
    );

    // Both variants are strings, so it resolves to string
    expect(field.meta.type).toBe("string");
    // Not polymorphic since they don't have properties
    expect(field.isPolymorphic).toBe(false);
  });

  // ── allOf merging ──

  it("merges allOf schemas", () => {
    const field = parseField(
      "combined",
      {
        allOf: [
          {
            type: "object",
            properties: { a: { type: "string" } },
            required: ["a"],
          },
          { properties: { b: { type: "number" } } },
        ],
      },
      "",
      new Set()
    );

    expect(field.meta.type).toBe("object");
    expect(field.children).toHaveLength(2);
    expect(field.children.find((c) => c.meta.name === "a")?.meta.required).toBe(
      true
    );
    expect(field.children.find((c) => c.meta.name === "b")).toBeDefined();
  });

  it("infers type from properties when type is missing", () => {
    const field = parseField(
      "implicit",
      {
        properties: {
          foo: { type: "string" },
        },
      },
      "",
      new Set()
    );

    expect(field.meta.type).toBe("object");
    expect(field.children).toHaveLength(1);
  });

  it("infers type from items when type is missing", () => {
    const field = parseField(
      "list",
      {
        items: { type: "string" },
      },
      "",
      new Set()
    );

    expect(field.meta.type).toBe("array");
  });
});

// ─── parseComponent ─────────────────────────────────────────────────────────

describe("parseComponent", () => {
  it("parses a simple component schema", () => {
    const comp = parseComponent("hero", {
      $id: "http://schema.example.com/hero.schema.json",
      type: "object",
      properties: {
        headline: { type: "string", title: "Headline" },
        text: { type: "string" },
        image: {
          type: "object",
          properties: {
            src: { type: "string" },
            alt: { type: "string" },
          },
        },
      },
      required: ["headline"],
    });

    expect(comp.kind).toBe("component");
    expect(comp.name).toBe("hero");
    expect(comp.schemaId).toBe("http://schema.example.com/hero.schema.json");
    expect(comp.fields).toHaveLength(3);
    expect(comp.fields[0].meta.name).toBe("headline");
    expect(comp.fields[0].meta.required).toBe(true);
  });

  it("skips 'type' and 'component' internal fields", () => {
    const comp = parseComponent("hero", {
      type: "object",
      properties: {
        type: { type: "string", const: "default" },
        component: { type: "string", const: "hero" },
        headline: { type: "string" },
      },
    });

    expect(comp.fields).toHaveLength(1);
    expect(comp.fields[0].meta.name).toBe("headline");
  });

  it("assigns schemaOrder sequentially (skipping internal fields)", () => {
    const comp = parseComponent("hero", {
      type: "object",
      properties: {
        type: { type: "string" },
        headline: { type: "string" },
        text: { type: "string" },
        image: { type: "object", properties: { src: { type: "string" } } },
      },
    });

    expect(comp.fields[0].meta.schemaOrder).toBe(0); // headline
    expect(comp.fields[1].meta.schemaOrder).toBe(1); // text
    expect(comp.fields[2].meta.schemaOrder).toBe(2); // image
  });

  it("handles empty properties", () => {
    const comp = parseComponent("empty", { type: "object" });
    expect(comp.fields).toEqual([]);
  });

  it("handles missing $id", () => {
    const comp = parseComponent("test", { type: "object", properties: {} });
    expect(comp.schemaId).toBe("");
  });
});

// ─── parseContentType ───────────────────────────────────────────────────────

describe("parseContentType", () => {
  it("classifies a section-based content type", () => {
    const ct = parseContentType("page", {
      type: "object",
      properties: {
        type: { type: "string" },
        component: { type: "string" },
        seo: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
          },
        },
        token: { type: "string" },
        section: {
          type: "array",
          items: {
            type: "object",
            properties: {
              width: { type: "string" },
              components: {
                type: "array",
                items: {
                  anyOf: [
                    {
                      type: "object",
                      title: "hero",
                      properties: { h: { type: "string" } },
                    },
                    {
                      type: "object",
                      title: "cta",
                      properties: { c: { type: "string" } },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    });

    expect(ct.name).toBe("page");
    expect(ct.hasSections).toBe(true);
    expect(ct.sectionComponents).toContain("hero");
    expect(ct.sectionComponents).toContain("cta");
  });

  it("classifies root fields correctly", () => {
    const ct = parseContentType("page", {
      type: "object",
      properties: {
        seo: {
          type: "object",
          properties: {
            title: { type: "string" },
          },
        },
        token: { type: "string" },
        tags: {
          type: "array",
          items: { type: "string" },
        },
        section: {
          type: "array",
          items: {
            type: "object",
            properties: {
              components: {
                type: "array",
                items: {
                  anyOf: [
                    {
                      type: "object",
                      title: "hero",
                      properties: { h: { type: "string" } },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    });

    const seoField = ct.rootFields.find((rf) => rf.name === "seo");
    expect(seoField).toBeDefined();
    expect(seoField!.fieldType).toBe("object");

    const tokenField = ct.rootFields.find((rf) => rf.name === "token");
    expect(tokenField).toBeDefined();
    expect(tokenField!.fieldType).toBe("scalar");

    const tagsField = ct.rootFields.find((rf) => rf.name === "tags");
    expect(tagsField).toBeDefined();
    expect(tagsField!.fieldType).toBe("array");
  });

  it("excludes section array from root fields", () => {
    const ct = parseContentType("page", {
      type: "object",
      properties: {
        section: {
          type: "array",
          items: {
            type: "object",
            properties: {
              components: {
                type: "array",
                items: {
                  anyOf: [
                    {
                      type: "object",
                      title: "hero",
                      properties: { h: { type: "string" } },
                    },
                    {
                      type: "object",
                      title: "cta",
                      properties: { c: { type: "string" } },
                    },
                  ],
                },
              },
            },
          },
        },
        headline: { type: "string" },
      },
    });

    const names = ct.rootFields.map((rf) => rf.name);
    expect(names).toContain("headline");
    expect(names).not.toContain("section");
  });

  it("classifies a flat content type (no sections)", () => {
    const ct = parseContentType("event-detail", {
      type: "object",
      properties: {
        title: { type: "string" },
        categories: {
          type: "array",
          items: { type: "string" },
        },
        description: { type: "string" },
        locations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              address: { type: "string" },
            },
          },
        },
      },
    });

    expect(ct.name).toBe("event-detail");
    expect(ct.hasSections).toBe(false);
    expect(ct.sectionComponents).toEqual([]);
    expect(ct.rootFields).toHaveLength(4);

    const titleField = ct.rootFields.find((rf) => rf.name === "title");
    expect(titleField!.fieldType).toBe("scalar");

    const locationsField = ct.rootFields.find((rf) => rf.name === "locations");
    expect(locationsField!.fieldType).toBe("array");
  });

  it("skips 'type' and 'component' internal fields", () => {
    const ct = parseContentType("settings", {
      type: "object",
      properties: {
        type: { type: "string" },
        component: { type: "string" },
        header: { type: "object", properties: { logo: { type: "string" } } },
      },
    });

    const names = ct.rootFields.map((rf) => rf.name);
    expect(names).not.toContain("type");
    expect(names).not.toContain("component");
    expect(names).toContain("header");
  });

  it("handles empty properties", () => {
    const ct = parseContentType("search", { type: "object" });
    expect(ct.hasSections).toBe(false);
    expect(ct.rootFields).toEqual([]);
    expect(ct.sectionComponents).toEqual([]);
  });

  it("extracts component names from $id in anyOf", () => {
    const ct = parseContentType("page", {
      type: "object",
      properties: {
        section: {
          type: "array",
          items: {
            type: "object",
            properties: {
              components: {
                type: "array",
                items: {
                  anyOf: [
                    {
                      type: "object",
                      $id: "http://schema.example.com/hero.schema.json",
                      properties: { h: { type: "string" } },
                    },
                    {
                      type: "object",
                      $id: "http://schema.example.com/faq.schema.json",
                      properties: { q: { type: "string" } },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    });

    expect(ct.sectionComponents).toEqual(["hero", "faq"]);
  });
});
