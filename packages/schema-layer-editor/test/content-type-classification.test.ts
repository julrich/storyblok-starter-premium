/**
 * Unit tests for content type classification and the isContentType helper.
 */

import { describe, it, expect } from "vitest";
import { isContentType, parseContentType } from "../src/app/lib/schema-tree.js";

// ─── isContentType ──────────────────────────────────────────────────────────

describe("isContentType", () => {
  it("returns true for all known content types", () => {
    const known = [
      "page",
      "blog-post",
      "blog-overview",
      "settings",
      "event-detail",
      "event-list",
      "search",
    ];
    for (const name of known) {
      expect(isContentType(name)).toBe(true);
    }
  });

  it("returns false for component names", () => {
    expect(isContentType("hero")).toBe(false);
    expect(isContentType("cta")).toBe(false);
    expect(isContentType("section")).toBe(false);
    expect(isContentType("testimonials")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isContentType("")).toBe(false);
  });

  it("returns false for similar-but-wrong names", () => {
    expect(isContentType("pages")).toBe(false);
    expect(isContentType("blog_post")).toBe(false);
    expect(isContentType("blogpost")).toBe(false);
    expect(isContentType("Page")).toBe(false);
  });
});

// ─── Content type classification: section-based vs flat ─────────────────────

describe("content type classification", () => {
  const sectionArraySchema = {
    type: "object" as const,
    properties: {
      section: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            width: { type: "string" as const },
            components: {
              type: "array" as const,
              items: {
                anyOf: [
                  {
                    type: "object" as const,
                    title: "hero",
                    properties: { headline: { type: "string" as const } },
                  },
                  {
                    type: "object" as const,
                    title: "cta",
                    properties: { label: { type: "string" as const } },
                  },
                  {
                    type: "object" as const,
                    title: "features",
                    properties: { heading: { type: "string" as const } },
                  },
                ],
              },
            },
          },
        },
      },
      seo: {
        type: "object" as const,
        properties: {
          title: { type: "string" as const },
          description: { type: "string" as const },
        },
      },
      header: {
        type: "object" as const,
        properties: {
          logo: { type: "string" as const },
        },
      },
    },
  };

  const flatSchema = {
    type: "object" as const,
    properties: {
      title: { type: "string" as const },
      categories: {
        type: "array" as const,
        items: { type: "string" as const },
      },
      intro: { type: "string" as const },
      locations: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            name: { type: "string" as const },
            address: { type: "string" as const },
          },
        },
      },
    },
  };

  describe("section-based types", () => {
    it("identifies 'page' as section-based", () => {
      const ct = parseContentType("page", sectionArraySchema);
      expect(ct.hasSections).toBe(true);
    });

    it("identifies 'blog-post' as section-based", () => {
      const ct = parseContentType("blog-post", sectionArraySchema);
      expect(ct.hasSections).toBe(true);
    });

    it("identifies 'blog-overview' as section-based", () => {
      const ct = parseContentType("blog-overview", sectionArraySchema);
      expect(ct.hasSections).toBe(true);
    });

    it("extracts section component names", () => {
      const ct = parseContentType("page", sectionArraySchema);
      expect(ct.sectionComponents).toEqual(
        expect.arrayContaining(["hero", "cta", "features"])
      );
      expect(ct.sectionComponents).toHaveLength(3);
    });

    it("separates root fields from the section array", () => {
      const ct = parseContentType("page", sectionArraySchema);
      const rootFieldNames = ct.rootFields.map((rf) => rf.name);
      expect(rootFieldNames).toContain("seo");
      expect(rootFieldNames).toContain("header");
      expect(rootFieldNames).not.toContain("section");
    });
  });

  describe("flat types", () => {
    it("identifies 'event-detail' as flat", () => {
      const ct = parseContentType("event-detail", flatSchema);
      expect(ct.hasSections).toBe(false);
      expect(ct.sectionComponents).toEqual([]);
    });

    it("classifies scalar root fields", () => {
      const ct = parseContentType("event-detail", flatSchema);
      const titleField = ct.rootFields.find((rf) => rf.name === "title");
      expect(titleField).toBeDefined();
      expect(titleField!.fieldType).toBe("scalar");
    });

    it("classifies array root fields", () => {
      const ct = parseContentType("event-detail", flatSchema);
      const locationsField = ct.rootFields.find(
        (rf) => rf.name === "locations"
      );
      expect(locationsField).toBeDefined();
      expect(locationsField!.fieldType).toBe("array");
    });

    it("classifies scalar-item arrays as arrays", () => {
      const ct = parseContentType("event-detail", flatSchema);
      const categoriesField = ct.rootFields.find(
        (rf) => rf.name === "categories"
      );
      expect(categoriesField).toBeDefined();
      expect(categoriesField!.fieldType).toBe("array");
    });
  });

  describe("all 7 content types classification", () => {
    it("correctly classifies section-based vs flat for all types", () => {
      // Section-based get identified with section schema
      for (const name of ["page", "blog-post", "blog-overview"] as const) {
        const ct = parseContentType(name, sectionArraySchema);
        expect(ct.hasSections).toBe(true);
      }

      // Flat types with flat schema
      for (const name of [
        "settings",
        "event-detail",
        "event-list",
        "search",
      ] as const) {
        const ct = parseContentType(name, flatSchema);
        expect(ct.hasSections).toBe(false);
      }
    });
  });

  describe("edge cases", () => {
    it("handles content type with only internal fields", () => {
      const ct = parseContentType("search", {
        type: "object",
        properties: {
          type: { type: "string" },
          component: { type: "string" },
        },
      });
      expect(ct.rootFields).toEqual([]);
      expect(ct.hasSections).toBe(false);
    });

    it("handles array without components (not a section)", () => {
      const ct = parseContentType("event-list", {
        type: "object",
        properties: {
          events: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
              },
            },
          },
        },
      });

      expect(ct.hasSections).toBe(false);
      expect(ct.rootFields).toHaveLength(1);
      expect(ct.rootFields[0].fieldType).toBe("array");
    });

    it("handles array with components but no anyOf (not a section)", () => {
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
                    type: "object",
                    properties: { text: { type: "string" } },
                  },
                },
              },
            },
          },
        },
      });

      // No anyOf on components → not detected as polymorphic section
      expect(ct.hasSections).toBe(false);
    });

    it("needs at least 2 variants in anyOf to count as section", () => {
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
                    ],
                  },
                },
              },
            },
          },
        },
      });

      // Only 1 variant → not polymorphic enough
      expect(ct.hasSections).toBe(false);
    });
  });
});
