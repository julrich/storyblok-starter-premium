import { describe, it, expect } from "@jest/globals";
import { flattenNestedObjects } from "../src/transform.js";
import { normalizeAssetFieldNames } from "../src/assets.js";
import { buildValidationRules } from "../src/validate.js";

// ─── Minimal schema fixtures ──────────────────────────────────────────

/**
 * Minimal dereferenced schema with two components:
 * - hero: image is a nested object { src, alt }
 * - teaser-card: image is a flat string with format: "image"
 */
const testSchema = {
  type: "object",
  properties: {
    section: {
      type: "array",
      items: {
        $id: "http://schema.test/section.schema.json",
        type: "object",
        properties: {
          type: { type: "string", const: "section" },
          components: {
            type: "array",
            items: {
              anyOf: [
                {
                  $id: "http://schema.test/hero.schema.json",
                  type: "object",
                  properties: {
                    type: { type: "string", const: "hero" },
                    headline: { type: "string" },
                    image: {
                      type: "object",
                      properties: {
                        src: { type: "string", format: "image" },
                        alt: { type: "string" },
                      },
                    },
                  },
                },
                {
                  $id: "http://schema.test/teaser-card.schema.json",
                  type: "object",
                  properties: {
                    type: { type: "string", const: "teaser-card" },
                    headline: { type: "string" },
                    image: { type: "string", format: "image" },
                  },
                },
                {
                  $id: "http://schema.test/cta.schema.json",
                  type: "object",
                  properties: {
                    type: { type: "string", const: "cta" },
                    headline: { type: "string" },
                    image: {
                      type: "object",
                      properties: {
                        src: { type: "string", format: "image" },
                        alt: { type: "string" },
                      },
                    },
                    backgroundImage: { type: "string", format: "image" },
                  },
                },
              ],
            },
          },
        },
      },
    },
  },
};

// ─── Tests ────────────────────────────────────────────────────────────

describe("flatAssetFields extraction", () => {
  const rules = buildValidationRules(testSchema);

  it("identifies flat asset fields per component", () => {
    expect(rules.flatAssetFields.size).toBeGreaterThan(0);
    expect(rules.flatAssetFields.get("teaser-card")).toEqual(
      new Set(["image"])
    );
    expect(rules.flatAssetFields.get("cta")).toEqual(
      new Set(["backgroundImage"])
    );
    // hero.image is nested (type: object), NOT a flat asset field
    expect(rules.flatAssetFields.has("hero")).toBe(false);
  });
});

describe("flattenNestedObjects with skipFields", () => {
  it("skips flat asset fields when skipFields is provided", () => {
    const value = {
      component: "teaser-card",
      headline: "Test",
      image: "https://example.com/photo.jpg",
      button: { label: "Click", hidden: false },
    };

    flattenNestedObjects(value, new Set(["image"]));

    // image should be preserved as-is (not flattened)
    expect(value.image).toBe("https://example.com/photo.jpg");
    // button should still be flattened (not in skipFields)
    expect((value as any).button_label).toBe("Click");
    expect((value as any).button_hidden).toBe(false);
    expect((value as any).button).toBeUndefined();
  });

  it("still flattens nested objects when field is an object and NOT in skipFields", () => {
    const value = {
      component: "hero",
      headline: "Test",
      image: { src: "https://example.com/hero.jpg", alt: "Hero" },
    };

    flattenNestedObjects(value);

    expect((value as any).image_src).toBe("https://example.com/hero.jpg");
    expect((value as any).image_alt).toBe("Hero");
    expect((value as any).image).toBeUndefined();
  });

  it("protects flat image field even when it accidentally holds a nested object", () => {
    // This simulates the bug case: LLM provides { image: { src: "url" } }
    // for a component where image should be a flat string
    const value = {
      component: "teaser-card",
      headline: "Test",
      image: { src: "https://example.com/photo.jpg" },
    };

    flattenNestedObjects(value, new Set(["image"]));

    // image should NOT be flattened into image_src — it's in skipFields
    expect((value as any).image_src).toBeUndefined();
    expect((value as any).image).toEqual({
      src: "https://example.com/photo.jpg",
    });
  });
});

// Note: processForStoryblok integration tests are skipped because
// object-traversal has ESM/CJS import issues in the Jest test environment.
// The runtime behaviour is verified via the Node.js CJS build.
// The unit tests for flattenNestedObjects and normalizeAssetFieldNames
// cover the core logic that was changed.

describe("normalizeAssetFieldNames", () => {
  const flatAssetFields = new Map([
    ["teaser-card", new Set(["image"])],
    ["cta", new Set(["backgroundImage"])],
  ]);

  it("renames image_src → image on teaser-card", () => {
    const content = [
      {
        component: "section",
        components: [
          {
            component: "teaser-card",
            headline: "Product",
            image_src: "https://example.com/photo.jpg",
          },
        ],
      },
    ];

    normalizeAssetFieldNames(content, flatAssetFields);

    const card = content[0].components[0] as any;
    expect(card.image).toBe("https://example.com/photo.jpg");
    expect(card.image_src).toBeUndefined();
  });

  it("extracts filename from wrongly-named Storyblok asset object", () => {
    const content = [
      {
        component: "section",
        components: [
          {
            component: "teaser-card",
            headline: "Product",
            image_src: {
              filename: "//a.storyblok.com/f/123/photo.jpg",
              fieldtype: "asset",
              id: 999,
            },
          },
        ],
      },
    ];

    normalizeAssetFieldNames(content, flatAssetFields);

    const card = content[0].components[0] as any;
    expect(card.image).toBe("//a.storyblok.com/f/123/photo.jpg");
    expect(card.image_src).toBeUndefined();
  });

  it("flattens nested object in flat image field to URL string", () => {
    const content = [
      {
        component: "section",
        components: [
          {
            component: "teaser-card",
            headline: "Product",
            image: { src: "https://example.com/photo.jpg", alt: "Photo" },
          },
        ],
      },
    ];

    normalizeAssetFieldNames(content, flatAssetFields);

    const card = content[0].components[0] as any;
    expect(card.image).toBe("https://example.com/photo.jpg");
  });

  it("does NOT modify hero image (which is correctly nested)", () => {
    const content = [
      {
        component: "section",
        components: [
          {
            component: "hero",
            headline: "Welcome",
            image_src: {
              filename: "//a.storyblok.com/f/123/hero.jpg",
              fieldtype: "asset",
            },
          },
        ],
      },
    ];

    normalizeAssetFieldNames(content, flatAssetFields);

    const hero = content[0].components[0] as any;
    // hero is not in flatAssetFields map, so it should be untouched
    expect(hero.image_src).toBeDefined();
    expect(hero.image_src.filename).toBe("//a.storyblok.com/f/123/hero.jpg");
  });

  it("cleans up all flattened sub-properties when renaming", () => {
    const content = [
      {
        component: "section",
        components: [
          {
            component: "teaser-card",
            headline: "Product",
            image_src: "https://example.com/photo.jpg",
            image_alt: "A photo",
            image_title: "Photo title",
          },
        ],
      },
    ];

    normalizeAssetFieldNames(content, flatAssetFields);

    const card = content[0].components[0] as any;
    expect(card.image).toBe("https://example.com/photo.jpg");
    expect(card.image_src).toBeUndefined();
    expect(card.image_alt).toBeUndefined();
    expect(card.image_title).toBeUndefined();
  });

  it("handles single content node (not array)", () => {
    const content = {
      component: "teaser-card",
      headline: "Product",
      image_src: "https://example.com/photo.jpg",
    };

    normalizeAssetFieldNames(content, flatAssetFields);

    expect((content as any).image).toBe("https://example.com/photo.jpg");
    expect((content as any).image_src).toBeUndefined();
  });

  it("is a no-op when flatAssetFields is empty", () => {
    const content = [
      {
        component: "teaser-card",
        headline: "Product",
        image_src: "https://example.com/photo.jpg",
      },
    ];
    const original = JSON.stringify(content);

    normalizeAssetFieldNames(content, new Map());

    expect(JSON.stringify(content)).toBe(original);
  });

  it("preserves existing correct image field", () => {
    const content = [
      {
        component: "section",
        components: [
          {
            component: "teaser-card",
            headline: "Product",
            image: "https://example.com/correct.jpg",
          },
        ],
      },
    ];

    normalizeAssetFieldNames(content, flatAssetFields);

    const card = content[0].components[0] as any;
    expect(card.image).toBe("https://example.com/correct.jpg");
  });
});
