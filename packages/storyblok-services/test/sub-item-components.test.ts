import { describe, it, expect } from "@jest/globals";
import {
  ensureSubItemComponents,
  ensureRootFieldBloks,
} from "../src/transform.js";
import { buildValidationRules } from "../src/validate.js";

// ─── Minimal schema fixtures ──────────────────────────────────────────

/**
 * Schema with polymorphic section → components (hero, stats, faq, cta),
 * where sub-items are monomorphic bloks fields:
 * - stats.stat (monomorphic, no $id — uses nameHint)
 * - faq.questions (monomorphic, no $id — uses nameHint)
 * - hero.buttons (monomorphic, no $id — uses nameHint)
 * - cta.buttons (monomorphic, no $id — uses nameHint)
 * Plus a root-level bloks field:
 * - seo (single object with $id)
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
                    buttons: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          label: { type: "string" },
                          url: { type: "string" },
                        },
                      },
                    },
                  },
                },
                {
                  $id: "http://schema.test/stats.schema.json",
                  type: "object",
                  properties: {
                    type: { type: "string", const: "stats" },
                    stat: {
                      type: "array",
                      items: {
                        $id: "http://schema.test/stat.schema.json",
                        type: "object",
                        properties: {
                          number: { type: "string" },
                          title: { type: "string" },
                          description: { type: "string" },
                        },
                      },
                    },
                  },
                },
                {
                  $id: "http://schema.test/faq.schema.json",
                  type: "object",
                  properties: {
                    type: { type: "string", const: "faq" },
                    questions: {
                      type: "array",
                      items: {
                        // No $id — will use nameHint "questions"
                        type: "object",
                        properties: {
                          question: { type: "string" },
                          answer: { type: "string" },
                        },
                      },
                    },
                  },
                },
                {
                  $id: "http://schema.test/cta.schema.json",
                  type: "object",
                  properties: {
                    type: { type: "string", const: "cta" },
                    headline: { type: "string" },
                    buttons: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          label: { type: "string" },
                          url: { type: "string" },
                        },
                      },
                    },
                  },
                },
                {
                  $id: "http://schema.test/testimonials.schema.json",
                  type: "object",
                  properties: {
                    type: { type: "string", const: "testimonials" },
                    testimonial: {
                      type: "array",
                      items: {
                        // No $id, no type.const — uses nameHint
                        type: "object",
                        properties: {
                          quote: { type: "string" },
                          name: { type: "string" },
                        },
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
    },
    seo: {
      $id: "http://schema.test/seo.schema.json",
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
      },
    },
  },
};

// ─── buildValidationRules: containerSlots ──────────────────────────────

describe("buildValidationRules — containerSlots for sub-items", () => {
  const rules = buildValidationRules(testSchema);

  it("discovers monomorphic stat slot", () => {
    const allowed = rules.containerSlots.get("stats.stat");
    expect(allowed).toBeDefined();
    expect(allowed!.size).toBe(1);
    expect(allowed!.has("stat")).toBe(true);
  });

  it("discovers monomorphic questions slot", () => {
    const allowed = rules.containerSlots.get("faq.questions");
    expect(allowed).toBeDefined();
    expect(allowed!.size).toBe(1);
    expect(allowed!.has("questions")).toBe(true);
  });

  it("discovers monomorphic testimonial slot", () => {
    const allowed = rules.containerSlots.get("testimonials.testimonial");
    expect(allowed).toBeDefined();
    expect(allowed!.size).toBe(1);
    expect(allowed!.has("testimonial")).toBe(true);
  });

  it("discovers monomorphic buttons slot in hero", () => {
    const allowed = rules.containerSlots.get("hero.buttons");
    expect(allowed).toBeDefined();
    expect(allowed!.size).toBe(1);
    expect(allowed!.has("buttons")).toBe(true);
  });

  it("discovers monomorphic buttons slot in cta", () => {
    const allowed = rules.containerSlots.get("cta.buttons");
    expect(allowed).toBeDefined();
    expect(allowed!.size).toBe(1);
    expect(allowed!.has("buttons")).toBe(true);
  });

  it("discovers polymorphic section.components slot", () => {
    const allowed = rules.containerSlots.get("section.components");
    expect(allowed).toBeDefined();
    expect(allowed!.size).toBe(5);
    expect(allowed!.has("hero")).toBe(true);
    expect(allowed!.has("stats")).toBe(true);
    expect(allowed!.has("faq")).toBe(true);
    expect(allowed!.has("cta")).toBe(true);
    expect(allowed!.has("testimonials")).toBe(true);
  });
});

// ─── buildValidationRules: rootBloksFields ────────────────────────────

describe("buildValidationRules — rootBloksFields", () => {
  const rules = buildValidationRules(testSchema);

  it("discovers seo as a root bloks field", () => {
    expect(rules.rootBloksFields.has("seo")).toBe(true);
    expect(rules.rootBloksFields.get("seo")).toBe("seo");
  });

  it("does not include array root fields in rootBloksFields", () => {
    expect(rules.rootBloksFields.has("section")).toBe(false);
  });

  it("includes root bloks components in allKnownComponents", () => {
    expect(rules.allKnownComponents.has("seo")).toBe(true);
  });
});

// ─── ensureSubItemComponents ──────────────────────────────────────────

describe("ensureSubItemComponents", () => {
  const rules = buildValidationRules(testSchema);

  it("injects component on stat items missing it", () => {
    const sections = [
      {
        component: "section",
        components: [
          {
            component: "stats",
            stat: [
              { number: "99%", title: "Uptime" },
              { number: "500+", title: "Clients" },
            ],
          },
        ],
      },
    ];

    ensureSubItemComponents(sections, rules.containerSlots);

    const stats = sections[0].components[0] as any;
    expect(stats.stat[0].component).toBe("stat");
    expect(stats.stat[1].component).toBe("stat");
  });

  it("injects component on questions items missing it", () => {
    const sections = [
      {
        component: "section",
        components: [
          {
            component: "faq",
            questions: [
              { question: "What?", answer: "This." },
              { question: "How?", answer: "Like that." },
            ],
          },
        ],
      },
    ];

    ensureSubItemComponents(sections, rules.containerSlots);

    const faq = sections[0].components[0] as any;
    expect(faq.questions[0].component).toBe("questions");
    expect(faq.questions[1].component).toBe("questions");
  });

  it("injects component on testimonial items missing it", () => {
    const sections = [
      {
        component: "section",
        components: [
          {
            component: "testimonials",
            testimonial: [
              { quote: "Great!", name: "Alice" },
              { quote: "Wonderful!", name: "Bob" },
            ],
          },
        ],
      },
    ];

    ensureSubItemComponents(sections, rules.containerSlots);

    const testimonials = sections[0].components[0] as any;
    expect(testimonials.testimonial[0].component).toBe("testimonial");
    expect(testimonials.testimonial[1].component).toBe("testimonial");
  });

  it("injects component on buttons in hero", () => {
    const sections = [
      {
        component: "section",
        components: [
          {
            component: "hero",
            headline: "Welcome",
            buttons: [
              { label: "Click", url: "/go" },
              { label: "More", url: "/more" },
            ],
          },
        ],
      },
    ];

    ensureSubItemComponents(sections, rules.containerSlots);

    const hero = sections[0].components[0] as any;
    expect(hero.buttons[0].component).toBe("buttons");
    expect(hero.buttons[1].component).toBe("buttons");
  });

  it("does NOT overwrite existing component", () => {
    const sections = [
      {
        component: "section",
        components: [
          {
            component: "stats",
            stat: [
              { component: "stat", number: "42", title: "Answer" },
              { number: "7", title: "Lucky" },
            ],
          },
        ],
      },
    ];

    ensureSubItemComponents(sections, rules.containerSlots);

    const stats = sections[0].components[0] as any;
    expect(stats.stat[0].component).toBe("stat");
    expect(stats.stat[1].component).toBe("stat");
  });

  it("does NOT inject component on polymorphic slot items (ambiguous)", () => {
    const sections = [
      {
        component: "section",
        components: [{ headline: "Unknown component without component field" }],
      },
    ];

    ensureSubItemComponents(sections, rules.containerSlots);

    // section.components is polymorphic (5 types) — should NOT inject
    const item = sections[0].components[0] as any;
    expect(item.component).toBeUndefined();
  });

  it("handles empty sections array", () => {
    const sections: Record<string, any>[] = [];
    expect(() =>
      ensureSubItemComponents(sections, rules.containerSlots)
    ).not.toThrow();
  });

  it("handles sections with no sub-item arrays", () => {
    const sections = [
      {
        component: "section",
        components: [{ component: "hero", headline: "Simple hero" }],
      },
    ];

    ensureSubItemComponents(sections, rules.containerSlots);

    const hero = sections[0].components[0] as any;
    expect(hero.component).toBe("hero");
    expect(hero.headline).toBe("Simple hero");
  });

  it("handles multiple sections with mixed sub-items", () => {
    const sections = [
      {
        component: "section",
        components: [
          {
            component: "stats",
            stat: [{ number: "10" }],
          },
        ],
      },
      {
        component: "section",
        components: [
          {
            component: "faq",
            questions: [{ question: "Why?" }],
          },
          {
            component: "testimonials",
            testimonial: [{ quote: "Nice" }],
          },
        ],
      },
    ];

    ensureSubItemComponents(sections, rules.containerSlots);

    expect((sections[0].components[0] as any).stat[0].component).toBe("stat");
    expect((sections[1].components[0] as any).questions[0].component).toBe(
      "questions"
    );
    expect((sections[1].components[1] as any).testimonial[0].component).toBe(
      "testimonial"
    );
  });

  it("skips non-object items in sub-item arrays", () => {
    const sections = [
      {
        component: "section",
        components: [
          {
            component: "stats",
            stat: [null, "not-an-object", 42, { number: "5" }],
          },
        ],
      },
    ];

    ensureSubItemComponents(sections, rules.containerSlots);

    // Only the real object should get component injected
    const stats = sections[0].components[0] as any;
    expect(stats.stat[0]).toBeNull();
    expect(stats.stat[1]).toBe("not-an-object");
    expect(stats.stat[2]).toBe(42);
    expect(stats.stat[3].component).toBe("stat");
  });

  it("ignores arrays that are not known container slots", () => {
    const sections = [
      {
        component: "section",
        components: [
          {
            component: "hero",
            headline: "Test",
            unknownArray: [{ foo: "bar" }],
          },
        ],
      },
    ];

    ensureSubItemComponents(sections, rules.containerSlots);

    const hero = sections[0].components[0] as any;
    expect(hero.unknownArray[0].component).toBeUndefined();
  });
});

// ─── ensureRootFieldBloks ─────────────────────────────────────────────

describe("ensureRootFieldBloks", () => {
  const rootBloksFields = new Map([
    ["seo", "seo"],
    ["head", "blog-head"],
  ]);

  it("wraps a plain object in an array and injects component", () => {
    const rootFields = {
      seo: { title: "My Page", description: "A description" },
    };

    const result = ensureRootFieldBloks(rootFields, rootBloksFields);

    expect(Array.isArray(result.seo)).toBe(true);
    const seoArray = result.seo as any[];
    expect(seoArray).toHaveLength(1);
    expect(seoArray[0].component).toBe("seo");
    expect(seoArray[0].title).toBe("My Page");
    expect(seoArray[0].description).toBe("A description");
  });

  it("injects component on items in an existing array", () => {
    const rootFields = {
      seo: [{ title: "My Page", description: "A description" }],
    };

    const result = ensureRootFieldBloks(rootFields, rootBloksFields);

    const seoArray = result.seo as any[];
    expect(seoArray).toHaveLength(1);
    expect(seoArray[0].component).toBe("seo");
    expect(seoArray[0].title).toBe("My Page");
  });

  it("does NOT overwrite existing component on array items", () => {
    const rootFields = {
      seo: [{ component: "seo", title: "Already has component" }],
    };

    const result = ensureRootFieldBloks(rootFields, rootBloksFields);

    const seoArray = result.seo as any[];
    expect(seoArray[0].component).toBe("seo");
  });

  it("does NOT overwrite existing component on plain object", () => {
    const rootFields = {
      seo: { component: "seo", title: "Already has component" },
    };

    const result = ensureRootFieldBloks(rootFields, rootBloksFields);

    const seoArray = result.seo as any[];
    expect(seoArray).toHaveLength(1);
    expect(seoArray[0].component).toBe("seo");
  });

  it("uses the correct component name from rootBloksFields map", () => {
    const rootFields = {
      head: { headline: "Blog Title" },
    };

    const result = ensureRootFieldBloks(rootFields, rootBloksFields);

    const headArray = result.head as any[];
    expect(headArray).toHaveLength(1);
    expect(headArray[0].component).toBe("blog-head");
    expect(headArray[0].headline).toBe("Blog Title");
  });

  it("skips fields not in rootBloksFields", () => {
    const rootFields = {
      title: "Plain String Field",
      seo: { title: "SEO Title" },
    };

    const result = ensureRootFieldBloks(rootFields, rootBloksFields);

    expect(result.title).toBe("Plain String Field");
    expect(Array.isArray(result.seo)).toBe(true);
  });

  it("skips null and undefined values", () => {
    const rootFields = {
      seo: null,
      head: undefined,
    };

    const result = ensureRootFieldBloks(rootFields as any, rootBloksFields);

    expect(result.seo).toBeNull();
    expect(result.head).toBeUndefined();
  });

  it("returns a new object (does not mutate input reference)", () => {
    const rootFields = {
      seo: { title: "Original" },
    };

    const result = ensureRootFieldBloks(rootFields, rootBloksFields);

    expect(result).not.toBe(rootFields);
  });

  it("handles empty rootFields", () => {
    const result = ensureRootFieldBloks({}, rootBloksFields);
    expect(result).toEqual({});
  });

  it("handles empty rootBloksFields map", () => {
    const rootFields = {
      seo: { title: "Whatever" },
    };

    const result = ensureRootFieldBloks(rootFields, new Map());

    // Nothing should change since no fields are mapped
    expect(result.seo).toEqual({ title: "Whatever" });
    expect(Array.isArray(result.seo)).toBe(false);
  });

  it("handles multiple root bloks fields at once", () => {
    const rootFields = {
      seo: { title: "SEO Title" },
      head: { headline: "Blog Title" },
    };

    const result = ensureRootFieldBloks(rootFields, rootBloksFields);

    expect((result.seo as any[])[0].component).toBe("seo");
    expect((result.head as any[])[0].component).toBe("blog-head");
  });
});

// ─── Integration: buildValidationRules + ensureSubItemComponents ──────

describe("integration: schema-driven sub-item component injection", () => {
  const rules = buildValidationRules(testSchema);

  it("end-to-end: fixes a stats section generated without component on stat items", () => {
    // Simulates the exact failure case from the original bug:
    // OpenAI generates stat items without component, processForStoryblok
    // renames type → component on the stats component itself, but stat
    // items have no type to convert.
    const sections = [
      {
        component: "section",
        components: [
          {
            component: "hero",
            headline: "Falkenberg Automotive",
            buttons: [{ label: "View Case Study", url: "/case-study" }],
          },
        ],
      },
      {
        component: "section",
        components: [
          {
            component: "stats",
            stat: [
              { number: "43%", title: "Rejection Reduction" },
              { number: "2.1M€", title: "Annual Savings" },
              { number: "99.7%", title: "Quality Rate" },
              { number: "8 weeks", title: "Implementation Time" },
            ],
          },
        ],
      },
      {
        component: "section",
        components: [
          {
            component: "faq",
            questions: [
              { question: "How long did it take?", answer: "8 weeks." },
            ],
          },
        ],
      },
    ];

    ensureSubItemComponents(sections, rules.containerSlots);

    // All stat items should now have component
    const stats = sections[1].components[0] as any;
    for (const s of stats.stat) {
      expect(s.component).toBe("stat");
    }

    // FAQ questions should also have component
    const faq = sections[2].components[0] as any;
    for (const q of faq.questions) {
      expect(q.component).toBe("questions");
    }

    // Hero buttons should also have component
    const hero = sections[0].components[0] as any;
    for (const b of hero.buttons) {
      expect(b.component).toBe("buttons");
    }
  });
});
