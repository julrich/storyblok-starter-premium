/**
 * Server-side rendering pipeline for kickstartDS components.
 *
 * Uses `renderToStaticMarkup` from `react-dom/server` to render actual
 * kickstartDS Design System React components to clean HTML strings.
 * The output is identical to what the website produces — same DOM
 * structure, same CSS class names, same `data-*` attributes.
 *
 * This pipeline does NOT require a browser or Puppeteer. The kickstartDS
 * components are pure functional React components with no browser API
 * dependencies. `DsaProviders` supplies rendering-time context (theme
 * providers, component context overrides) without needing a DOM.
 *
 * The rendered HTML is passed to ext-apps UI resources as `renderedHtml`
 * in `structuredContent`, where the host's sandboxed iframe inserts it
 * into the DOM and applies the inlined CSS.
 *
 * Input data is in **Storyblok format** (flattened keys like `image_src`,
 * asset objects like `{ filename, fieldtype: "asset" }`). Before passing
 * to React components, data is transformed back to **Design System format**
 * (nested objects like `{ image: { src } }`, plain URL strings).
 *
 * @see PRD Section 6.3 — Server-Side Rendering with renderToStaticMarkup
 */

import React, { type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// ── Storyblok → Design System data preparation ────────────────────

/**
 * Resolve a Storyblok asset object to a plain URL string.
 *
 * Storyblok stores image fields as `{ filename: "https://...", fieldtype: "asset", ... }`.
 * kickstartDS React components expect plain URL strings.
 * Protocol-relative URLs (`//a.storyblok.com/...`) are prefixed with `https:`.
 */
function resolveAssetUrl(value: unknown): string | null {
  if (typeof value === "string") {
    return value.startsWith("//") ? `https:${value}` : value;
  }
  if (
    value &&
    typeof value === "object" &&
    "filename" in value &&
    typeof (value as any).filename === "string" &&
    (value as any).filename.length > 0
  ) {
    const url = (value as any).filename;
    return url.startsWith("//") ? `https:${url}` : url;
  }
  return null;
}

/**
 * Unflatten Storyblok `key_subkey` props back to nested objects.
 *
 * Reverses the `flattenNestedObjects` transform:
 * `{ image_src: "x", image_alt: "y" }` → `{ image: { src: "x", alt: "y" } }`
 *
 * Preserves keys starting with `_` (like `_uid`) and doesn't split
 * known single-word keys that contain underscores in the component
 * name (like `image_story` — handled by leaving `component` keys intact).
 */
function unflattenProps(obj: Record<string, any>): Record<string, any> {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (key.startsWith("_")) {
      acc[key] = value;
      return acc;
    }

    const parts = key.split("_");
    if (parts.length === 1) {
      acc[key] = value;
      return acc;
    }

    // Build nested structure
    let current = acc;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (
        !current[part] ||
        typeof current[part] !== "object" ||
        Array.isArray(current[part])
      ) {
        // If the non-split key already exists (e.g. set by a previous entry),
        // don't clobber it — this key genuinely has underscores.
        if (i === 0 && key in obj && parts.length === 2) {
          // Simple heuristic: if `image_src` exists and `image` also exists
          // as a non-object, treat the whole key as flat.
          if (
            current[part] !== undefined &&
            typeof current[part] !== "object"
          ) {
            acc[key] = value;
            return acc;
          }
        }
        current[part] = {};
      }
      current = current[part];
    }
    current[parts[parts.length - 1]] = value;
    return acc;
  }, {} as Record<string, any>);
}

/**
 * Recursively prepare Storyblok-format data for rendering with React components.
 *
 * Performs three transformations at every level of the content tree:
 * 1. **Resolve asset objects** → plain URL strings
 * 2. **Unflatten keys** → nested objects (`image_src` → `image.src`)
 * 3. **Recurse into arrays and sub-component objects**
 *
 * This mirrors what the website does via `storyProcessing` + `unflatten()`.
 */
function prepareForRender(data: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (key === "component" || key === "type" || key === "_uid") {
      result[key] = value;
      continue;
    }

    if (Array.isArray(value)) {
      result[key] = value.map((item) => {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          // Sub-component or nested object
          if (item.component || item.type) {
            return prepareForRender(item);
          }
          // Asset object
          const url = resolveAssetUrl(item);
          if (url) return url;
          // Regular nested object — recurse
          return prepareForRender(item);
        }
        return item;
      });
      continue;
    }

    // Asset object → plain URL
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      (value as any).fieldtype === "asset"
    ) {
      const url = resolveAssetUrl(value);
      result[key] = url || "";
      continue;
    }

    // Protocol-relative URL string
    if (typeof value === "string" && value.startsWith("//")) {
      result[key] = `https:${value}`;
      continue;
    }

    // Nested object without component/type — keep as-is (will be unflattened later)
    result[key] = value;
  }

  // Now unflatten: image_src → image.src
  return unflattenProps(result);
}

// ── kickstartDS component imports ──────────────────────────────────

import DsaProviders from "@kickstartds/design-system/providers";
import { Section } from "@kickstartds/design-system/section";
import { Hero } from "@kickstartds/design-system/hero";
import { CtaContextDefault } from "@kickstartds/design-system/cta";
import { FaqContextDefault } from "@kickstartds/design-system/faq";
import { FeaturesContextDefault } from "@kickstartds/design-system/features";
import { TestimonialsContextDefault } from "@kickstartds/design-system/testimonials";
import { StatsContextDefault } from "@kickstartds/design-system/stats";
import { Gallery } from "@kickstartds/design-system/gallery";
import { TextContextDefault } from "@kickstartds/design-system/text";
import { ImageTextContextDefault } from "@kickstartds/design-system/image-text";
import { Logos } from "@kickstartds/design-system/logos";
import { DividerContextDefault } from "@kickstartds/design-system/divider";
import { Contact } from "@kickstartds/design-system/contact";
import { Mosaic } from "@kickstartds/design-system/mosaic";
import { VideoCurtainContextDefault } from "@kickstartds/design-system/video-curtain";
import { ImageStory } from "@kickstartds/design-system/image-story";

// ── Component registry ─────────────────────────────────────────────

/**
 * Maps Storyblok/Design System component names to their React components.
 *
 * Uses the same component selection as the website's `components` map
 * in `packages/website/components/index.tsx`, but without Next.js
 * dynamic imports or Storyblok editability wrappers.
 *
 * Components that are sub-components (feature, stat, testimonial, etc.)
 * are NOT included here — they are rendered as children by their parent
 * container components (features, stats, testimonials).
 */
const COMPONENT_MAP: Record<string, ComponentType<any>> = {
  hero: Hero,
  cta: CtaContextDefault,
  faq: FaqContextDefault,
  features: FeaturesContextDefault,
  testimonials: TestimonialsContextDefault,
  stats: StatsContextDefault,
  gallery: Gallery,
  text: TextContextDefault,
  "image-text": ImageTextContextDefault,
  logos: Logos,
  divider: DividerContextDefault,
  contact: Contact,
  mosaic: Mosaic,
  "video-curtain": VideoCurtainContextDefault,
  "image-story": ImageStory,
};

// ── Render functions ───────────────────────────────────────────────

/**
 * Post-process rendered HTML to eagerly load lazy images.
 *
 * kickstartDS components use lazysizes for lazy loading: images get
 * `class="lazyload"` and `data-src` / `data-srcset` instead of `src` /
 * `srcset`. In the preview iframe there is no lazysizes runtime, so
 * images would never load. This function:
 * 1. Moves `data-src` → `src` and `data-srcset` → `srcset`
 * 2. Removes the `lazyload` class
 * 3. Strips `<noscript>` fallbacks (no longer needed)
 */
function eagerLoadImages(html: string): string {
  return html
    .replace(/\sdata-src="/g, ' src="')
    .replace(/\sdata-srcset="/g, ' srcset="')
    .replace(/\blazyload\b/g, "")
    .replace(/<noscript>[\s\S]*?<\/noscript>/g, "");
}

/**
 * Render a single section's inner component to static HTML.
 *
 * Takes a Design System component data object (with `component` discriminator)
 * and renders it using the actual kickstartDS React component, wrapped in
 * `DsaProviders` for context and `Section` for section-level layout.
 *
 * @param componentData - The component data object (e.g. `{ component: "hero", headline: "...", ... }`)
 * @returns Clean HTML string without React hydration markers, or null if the component type is unknown
 */
export function renderComponentToHtml(
  componentData: Record<string, any>
): string | null {
  const prepared = prepareForRender(componentData);
  const { component, type, _uid, ...props } = prepared;
  const Component = COMPONENT_MAP[component];

  if (!Component) {
    console.error(
      `[render] Unknown component type: "${component}". Available: ${Object.keys(
        COMPONENT_MAP
      ).join(", ")}`
    );
    return null;
  }

  try {
    const html = renderToStaticMarkup(
      <DsaProviders>
        <Component {...props} />
      </DsaProviders>
    );
    return eagerLoadImages(html);
  } catch (err) {
    console.error(`[render] Failed to render component "${component}":`, err);
    return null;
  }
}

/**
 * Render a complete section (Section wrapper + inner component) to static HTML.
 *
 * A "section" in the Design System is a `Section` component that wraps
 * one or more child components. The section data is expected to have the
 * Storyblok format where `component: "section"` and the inner components
 * are nested in a `components` array.
 *
 * @param sectionData - The section data object with `component: "section"` and nested `components`
 * @returns Clean HTML string, or null on failure
 */
export function renderSectionToHtml(
  sectionData: Record<string, any>
): string | null {
  const { component, components, _uid, type, ...sectionProps } = sectionData;

  // If this isn't a section wrapper, render the component directly
  if (component !== "section") {
    return renderComponentToHtml(sectionData);
  }

  // Prepare section-level props (unflatten, resolve assets)
  const preparedSectionProps = prepareForRender(sectionProps);

  try {
    // Render each child component inside the Section wrapper
    const childElements = (components || []).map(
      (child: Record<string, any>, index: number) => {
        // Prepare child data (unflatten, resolve asset objects to URLs)
        const prepared = prepareForRender(child);
        const {
          component: childComponent,
          type: childType,
          _uid: childUid,
          ...childProps
        } = prepared;
        const ChildComponent = COMPONENT_MAP[childComponent];

        if (!ChildComponent) {
          return (
            <div key={childUid || index} data-component={childComponent}>
              {`[Unknown component: ${childComponent}]`}
            </div>
          );
        }

        return <ChildComponent key={childUid || index} {...childProps} />;
      }
    );

    const html = renderToStaticMarkup(
      <DsaProviders>
        <Section {...preparedSectionProps}>{childElements}</Section>
      </DsaProviders>
    );
    return eagerLoadImages(html);
  } catch (err) {
    console.error(`[render] Failed to render section:`, err);
    return null;
  }
}

/**
 * Render multiple sections to HTML and return them as an array.
 *
 * Used for full-page preview rendering. Each section is rendered
 * independently and returned with its component type and HTML.
 *
 * @param sections - Array of section data objects
 * @returns Array of rendered sections with componentType and renderedHtml
 */
export function renderPageSectionsToHtml(
  sections: Record<string, any>[]
): Array<{
  componentType: string;
  renderedHtml: string | null;
  index: number;
}> {
  return sections.map((section, index) => {
    // Extract the primary component type for labeling
    const componentType =
      section.component === "section"
        ? section.components?.[0]?.component || "section"
        : section.component || "unknown";

    return {
      componentType,
      renderedHtml: renderSectionToHtml(section),
      index,
    };
  });
}

/**
 * Get the list of supported component types for rendering.
 */
export function getSupportedComponentTypes(): string[] {
  return Object.keys(COMPONENT_MAP);
}
