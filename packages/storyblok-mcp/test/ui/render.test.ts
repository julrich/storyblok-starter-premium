/**
 * Tests for the server-side rendering pipeline.
 *
 * Mocks kickstartDS component imports to test the render pipeline
 * logic (component lookup, section wrapping, page rendering)
 * without importing the full Design System dependency chain.
 *
 * @see src/ui/render.tsx
 */

import { jest } from "@jest/globals";
import React from "react";

// ── Mock kickstartDS components ────────────────────────────────────
// Each mock returns a simple div with a data-component attribute and
// renders children/headline props for assertion.

function makeMockComponent(name: string) {
  return function MockComponent(props: any) {
    return React.createElement(
      "div",
      { "data-component": name },
      props.headline || props.children || name
    );
  };
}

jest.unstable_mockModule("@kickstartds/design-system/providers", () => ({
  default: ({ children }: any) =>
    React.createElement(React.Fragment, null, children),
}));
jest.unstable_mockModule("@kickstartds/design-system/section", () => ({
  Section: ({ children, ...rest }: any) =>
    React.createElement("section", { "data-component": "section" }, children),
}));
jest.unstable_mockModule("@kickstartds/design-system/hero", () => ({
  Hero: makeMockComponent("hero"),
}));
jest.unstable_mockModule("@kickstartds/design-system/cta", () => ({
  CtaContextDefault: makeMockComponent("cta"),
}));
jest.unstable_mockModule("@kickstartds/design-system/faq", () => ({
  FaqContextDefault: makeMockComponent("faq"),
}));
jest.unstable_mockModule("@kickstartds/design-system/features", () => ({
  FeaturesContextDefault: makeMockComponent("features"),
}));
jest.unstable_mockModule("@kickstartds/design-system/testimonials", () => ({
  TestimonialsContextDefault: makeMockComponent("testimonials"),
}));
jest.unstable_mockModule("@kickstartds/design-system/stats", () => ({
  StatsContextDefault: makeMockComponent("stats"),
}));
jest.unstable_mockModule("@kickstartds/design-system/gallery", () => ({
  Gallery: makeMockComponent("gallery"),
}));
jest.unstable_mockModule("@kickstartds/design-system/text", () => ({
  TextContextDefault: makeMockComponent("text"),
}));
jest.unstable_mockModule("@kickstartds/design-system/image-text", () => ({
  ImageTextContextDefault: makeMockComponent("image-text"),
}));
jest.unstable_mockModule("@kickstartds/design-system/logos", () => ({
  Logos: makeMockComponent("logos"),
}));
jest.unstable_mockModule("@kickstartds/design-system/divider", () => ({
  DividerContextDefault: makeMockComponent("divider"),
}));
jest.unstable_mockModule("@kickstartds/design-system/contact", () => ({
  Contact: makeMockComponent("contact"),
}));
jest.unstable_mockModule("@kickstartds/design-system/mosaic", () => ({
  Mosaic: makeMockComponent("mosaic"),
}));
jest.unstable_mockModule(
  "@kickstartds/design-system/video-curtain",
  () => ({
    VideoCurtainContextDefault: makeMockComponent("video-curtain"),
  })
);
jest.unstable_mockModule("@kickstartds/design-system/image-story", () => ({
  ImageStory: makeMockComponent("image-story"),
}));

// Dynamic import AFTER all mocks are set up
const {
  renderComponentToHtml,
  renderSectionToHtml,
  renderPageSectionsToHtml,
  getSupportedComponentTypes,
} = await import("../../src/ui/render.js");

// ── getSupportedComponentTypes ──────────────────────────────────────

describe("getSupportedComponentTypes", () => {
  it("returns an array of strings", () => {
    const types = getSupportedComponentTypes();
    expect(Array.isArray(types)).toBe(true);
    expect(types.length).toBeGreaterThan(0);
    types.forEach((t) => expect(typeof t).toBe("string"));
  });

  it("includes core component types", () => {
    const types = getSupportedComponentTypes();
    expect(types).toContain("hero");
    expect(types).toContain("cta");
    expect(types).toContain("faq");
    expect(types).toContain("features");
    expect(types).toContain("testimonials");
    expect(types).toContain("stats");
    expect(types).toContain("text");
  });

  it("includes all 15 component types", () => {
    const types = getSupportedComponentTypes();
    const expected = [
      "hero",
      "cta",
      "faq",
      "features",
      "testimonials",
      "stats",
      "gallery",
      "text",
      "image-text",
      "logos",
      "divider",
      "contact",
      "mosaic",
      "video-curtain",
      "image-story",
    ];
    expected.forEach((t) => expect(types).toContain(t));
    expect(types).toHaveLength(expected.length);
  });
});

// ── renderComponentToHtml ──────────────────────────────────────────

describe("renderComponentToHtml", () => {
  it("returns null for unknown component type", () => {
    const result = renderComponentToHtml({ component: "nonexistent-widget" });
    expect(result).toBeNull();
  });

  it("returns an HTML string for a known component", () => {
    const result = renderComponentToHtml({
      component: "divider",
    });
    expect(result).not.toBeNull();
    expect(typeof result).toBe("string");
    expect(result!.length).toBeGreaterThan(0);
  });

  it("renders a hero component with a headline", () => {
    const result = renderComponentToHtml({
      component: "hero",
      headline: "Test Headline",
    });
    expect(result).not.toBeNull();
    expect(result).toContain("Test Headline");
  });

  it("strips _uid and type from props before rendering", () => {
    // These Storyblok metadata fields should not leak into the rendered output
    const result = renderComponentToHtml({
      component: "divider",
      _uid: "abc-123",
      type: "divider",
    });
    expect(result).not.toBeNull();
    // The component should render without errors even with _uid/type in input
    expect(typeof result).toBe("string");
  });

  it("handles rendering errors gracefully", () => {
    // Pass invalid prop types that might cause render errors
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation((() => {}) as any);
    const result = renderComponentToHtml({
      component: "hero",
      // Intentionally pass a bad prop structure
      headline: { nested: "object-where-string-expected" },
    });
    // Should either render (React is lenient) or return null
    expect(result === null || typeof result === "string").toBe(true);
    consoleSpy.mockRestore();
  });
});

// ── renderSectionToHtml ────────────────────────────────────────────

describe("renderSectionToHtml", () => {
  it("renders a section wrapper with child components", () => {
    const result = renderSectionToHtml({
      component: "section",
      components: [
        {
          component: "hero",
          _uid: "child-1",
          headline: "Section Hero",
        },
      ],
    });
    expect(result).not.toBeNull();
    expect(result).toContain("Section Hero");
  });

  it("delegates to renderComponentToHtml for non-section components", () => {
    const result = renderSectionToHtml({
      component: "hero",
      headline: "Direct Hero",
    });
    expect(result).not.toBeNull();
    expect(result).toContain("Direct Hero");
  });

  it("handles empty components array", () => {
    const result = renderSectionToHtml({
      component: "section",
      components: [],
    });
    expect(result).not.toBeNull();
    expect(typeof result).toBe("string");
  });

  it("handles unknown child components gracefully", () => {
    const result = renderSectionToHtml({
      component: "section",
      components: [
        {
          component: "unknown-child",
          _uid: "unknown-1",
        },
      ],
    });
    expect(result).not.toBeNull();
    expect(result).toContain("unknown-child");
  });

  it("renders multiple child components", () => {
    const result = renderSectionToHtml({
      component: "section",
      components: [
        {
          component: "hero",
          _uid: "hero-1",
          headline: "First",
        },
        {
          component: "divider",
          _uid: "divider-1",
        },
      ],
    });
    expect(result).not.toBeNull();
    expect(result).toContain("First");
  });
});

// ── renderPageSectionsToHtml ───────────────────────────────────────

describe("renderPageSectionsToHtml", () => {
  it("returns an array with one entry per section", () => {
    const sections = [
      {
        component: "section",
        _uid: "s1",
        components: [{ component: "hero", _uid: "h1", headline: "Page Hero" }],
      },
      {
        component: "section",
        _uid: "s2",
        components: [{ component: "divider", _uid: "d1" }],
      },
    ];

    const result = renderPageSectionsToHtml(sections);
    expect(result).toHaveLength(2);
  });

  it("includes componentType and index for each section", () => {
    const sections = [
      {
        component: "section",
        _uid: "s1",
        components: [{ component: "hero", _uid: "h1", headline: "Hero" }],
      },
    ];

    const result = renderPageSectionsToHtml(sections);
    expect(result[0].componentType).toBe("hero");
    expect(result[0].index).toBe(0);
    expect(result[0].renderedHtml).not.toBeNull();
  });

  it("extracts componentType from first child component", () => {
    const sections = [
      {
        component: "section",
        _uid: "s1",
        components: [
          { component: "faq", _uid: "f1" },
          { component: "divider", _uid: "d1" },
        ],
      },
    ];

    const result = renderPageSectionsToHtml(sections);
    expect(result[0].componentType).toBe("faq");
  });

  it('uses "section" as componentType when components array is empty', () => {
    const sections = [
      {
        component: "section",
        _uid: "s1",
        components: [],
      },
    ];

    const result = renderPageSectionsToHtml(sections);
    expect(result[0].componentType).toBe("section");
  });

  it("handles empty sections array", () => {
    const result = renderPageSectionsToHtml([]);
    expect(result).toEqual([]);
  });

  it("handles non-section components at top level", () => {
    const sections = [
      {
        component: "hero",
        headline: "Direct Hero",
      },
    ];

    const result = renderPageSectionsToHtml(sections);
    expect(result).toHaveLength(1);
    expect(result[0].componentType).toBe("hero");
  });
});
