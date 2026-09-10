import { createElement, FC, ReactNode } from "react";
import { Section } from "@kickstartds/design-system/section";
import { Hero } from "@kickstartds/design-system/hero";
import { VideoCurtain } from "@kickstartds/design-system/video-curtain";
import { Button } from "@kickstartds/design-system/button";
import { Headline } from "@kickstartds/design-system/headline";
import { Text } from "@kickstartds/design-system/text";
import { Html } from "@kickstartds/design-system/html";
import { Cta } from "@kickstartds/design-system/cta";
import { Faq } from "@kickstartds/design-system/faq";
import { Features } from "@kickstartds/design-system/features";
import { Stats } from "@kickstartds/design-system/stats";
import { TeaserCard } from "@kickstartds/design-system/teaser-card";
import { Testimonials } from "@kickstartds/design-system/testimonials";
import { BusinessCard } from "@kickstartds/design-system/business-card";
import { Contact } from "@kickstartds/design-system/contact";
import { BlogTeaser } from "@kickstartds/design-system/blog-teaser";
import { BlogAside } from "@kickstartds/design-system/blog-aside";
import { BlogHead } from "@kickstartds/design-system/blog-head";
import { ImageStory } from "@kickstartds/design-system/image-story";
import { ImageText } from "@kickstartds/design-system/image-text";
import { Gallery } from "@kickstartds/design-system/gallery";
import { Logos } from "@kickstartds/design-system/logos";
import { Mosaic } from "@kickstartds/design-system/mosaic";
import { Slider } from "@kickstartds/design-system/slider";
import { Divider } from "@kickstartds/design-system/divider";
import { SplitEven } from "@kickstartds/design-system/split-even";
import { SplitWeighted } from "@kickstartds/design-system/split-weighted";
import { Header } from "@kickstartds/design-system/header";
import { Footer } from "@kickstartds/design-system/footer";
import { Breadcrumb } from "@kickstartds/design-system/breadcrumb";
import { ContentNav } from "@kickstartds/design-system/content-nav";
import { NavFlyout } from "@kickstartds/design-system/nav-flyout";
import { NavToggle } from "@kickstartds/design-system/nav-toggle";
import { NavTopbar } from "@kickstartds/design-system/nav-topbar";
import { Pagination } from "@kickstartds/design-system/pagination";
import { Downloads } from "@kickstartds/design-system/downloads";
import { CookieConsent } from "@kickstartds/design-system/cookie-consent";
import { TextFieldComponent } from "@kickstartds/design-system/text-field";
import { TextAreaComponent } from "@kickstartds/design-system/text-area";
import { SelectFieldComponent } from "@kickstartds/design-system/select-field";
import { CheckboxComponent } from "@kickstartds/design-system/checkbox";
import { CheckboxGroupComponent } from "@kickstartds/design-system/checkbox-group";
import { RadioComponent } from "@kickstartds/design-system/radio";
import { RadioGroupComponent } from "@kickstartds/design-system/radio-group";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import presets from "@kickstartds/design-system/presets.json";

// ── Component registry ─────────────────────────────────────────────
// Maps component-token-catalog slug → React component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const components: Record<string, FC<any>> = {
  "blog-aside": BlogAside,
  "blog-head": BlogHead,
  "blog-teaser": BlogTeaser,
  breadcrumb: Breadcrumb,
  "business-card": BusinessCard,
  button: Button,
  checkbox: CheckboxComponent,
  "checkbox-group": CheckboxGroupComponent,
  contact: Contact,
  "content-nav": ContentNav,
  "cookie-consent": CookieConsent,
  cta: Cta,
  divider: Divider,
  downloads: Downloads,
  faq: Faq,
  features: Features,
  footer: Footer,
  gallery: Gallery,
  header: Header,
  headline: Headline,
  hero: Hero,
  html: Html,
  "image-story": ImageStory,
  "image-text": ImageText,
  logos: Logos,
  mosaic: Mosaic,
  "nav-flyout": NavFlyout,
  "nav-toggle": NavToggle,
  "nav-topbar": NavTopbar,
  pagination: Pagination,
  radio: RadioComponent,
  "radio-group": RadioGroupComponent,
  "rich-text": Html,
  section: Section,
  "select-field": SelectFieldComponent,
  slider: Slider,
  "split-even": SplitEven,
  "split-weighted": SplitWeighted,
  stats: Stats,
  "teaser-card": TeaserCard,
  testimonials: Testimonials,
  text: Text,
  "text-area": TextAreaComponent,
  "text-field": TextFieldComponent,
  "video-curtain": VideoCurtain,
};

/** Full-width components rendered without a wrapping Section. */
const FULL_WIDTH = new Set([
  "hero",
  "video-curtain",
  "header",
  "footer",
  "cta",
]);

// ── Reconstruct serialized React elements ──────────────────────────
// Storybook story args for split components contain serialized React
// elements whose `type` (component ref) was lost during JSON.stringify.
// We identify each child's component from its prop signature and
// reconstruct a live React element.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PropMatcher = (props: Record<string, any>) => FC<any> | null;

const propMatchers: PropMatcher[] = [
  (p) => ("questions" in p ? Faq : null),
  (p) => ("logosPerRow" in p || "logo" in p ? Logos : null),
  (p) => ("title" in p && "links" in p ? Contact : null),
  (p) =>
    "url" in p && "headline" in p && ("image" in p || "layout" in p)
      ? TeaserCard
      : null,
  (p) => ("headline" in p && "text" in p && "buttons" in p ? ImageText : null),
  (p) => ("level" in p && "text" in p ? Headline : null),
  (p) => ("label" in p && !("url" in p) ? TextFieldComponent : null),
  (p) => ("highlightText" in p && "text" in p ? Text : null),
  (p) => ("text" in p && Object.keys(p).length <= 2 ? Text : null),
  (p) => ("image" in p && "text" in p ? ImageText : null),
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function identifyComponent(props: Record<string, any>): FC<any> | null {
  for (const matcher of propMatchers) {
    const result = matcher(props);
    if (result) return result;
  }
  return null;
}

/**
 * Reconstruct a live ReactNode from a serialized React element object.
 * Handles both wrapper elements (have only `children` in props) and
 * direct elements (have component props directly).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function reconstruct(serialized: any, key?: number): ReactNode {
  if (!serialized || typeof serialized !== "object") return null;

  // It's a serialized React element if it has _owner + props
  if ("_owner" in serialized && "props" in serialized) {
    const { children, ...ownProps } = serialized.props;

    // Wrapper element (no meaningful own props, just forwarding children)
    if (Object.keys(ownProps).length === 0 && children) {
      if (Array.isArray(children)) {
        return children.map((c: unknown, i: number) => reconstruct(c, i));
      }
      return reconstruct(children, key);
    }

    // Direct element — identify component from props
    const Comp = identifyComponent(ownProps);
    if (Comp) {
      return createElement(Comp, { ...ownProps, key: key ?? undefined });
    }

    // Unknown component — render as Text fallback
    return createElement(Text, {
      key: key ?? undefined,
      text: ownProps.text || ownProps.headline || JSON.stringify(ownProps),
    });
  }

  return null;
}

/** Props that hold serialized React element children per component. */
const SERIALIZED_KEYS: Record<string, string[]> = {
  "split-even": ["firstComponents", "secondComponents"],
  "split-weighted": ["main", "aside"],
};

/**
 * Components whose Storybook stories provide children via a render function
 * rather than args. We provide matching default children.
 */
const defaultChildren: ReactNode[] = [
  <TeaserCard
    key={0}
    layout="row"
    headline="Collaborative Workspaces"
    text="Bring teams together with flexible tools for planning, sharing, and staying aligned across every project."
    image="img/close-up-young-business-team-working.png"
    url="#"
    button={{ label: "Learn More", hidden: true }}
  />,
  <TeaserCard
    key={1}
    layout="row"
    headline="Modern Team Collaboration"
    text="A connected platform that keeps everyone on the same page, from first draft to final delivery."
    image="img/full-shot-different-people-working-together.png"
    url="#"
    button={{ label: "Learn More", hidden: true }}
  />,
  <TeaserCard
    key={2}
    layout="row"
    headline="Creative Brainstorming"
    text="Turn ideas into outcomes with collaborative sessions, shared boards, and real-time feedback."
    image="img/people-brainstorming-work-meeting.png"
    url="#"
    button={{ label: "Learn More", hidden: true }}
  />,
];

/** Components that receive content as JSX children (not via args). */
const NEEDS_CHILDREN = new Set(["section", "slider"]);

// ── Preset story index ─────────────────────────────────────────────
// Group presets by component slug for fast lookup
interface Preset {
  id: string;
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: Record<string, any>;
}

interface ComponentStories {
  stories: Preset[];
  byId: Map<string, Preset>;
}

/**
 * Convert a Storybook story id (e.g. "components-hero--text-below-image")
 * to a component-token-catalog slug (e.g. "hero").
 */
function storyIdToSlug(storyId: string): string {
  // Story IDs follow: "{category}-{component}--{variant}"
  const base = storyId.split("--")[0]; // "components-hero"
  // Strip known category prefixes
  for (const prefix of [
    "components-",
    "layout-",
    "blog-",
    "form-",
    "corporate-",
    "event-",
  ]) {
    if (base.startsWith(prefix)) {
      const slug = base.slice(prefix.length);
      // "blog-" prefix: story id is "blog-blog-aside" → slug "blog-aside"
      // But also "blog-" prefix on non-blog: edge case handled by checking component registry
      if (components[slug]) return slug;
    }
  }
  // Fallback: try progressively shorter suffixes
  const parts = base.split("-");
  for (let i = 0; i < parts.length; i++) {
    const candidate = parts.slice(i).join("-");
    if (components[candidate]) return candidate;
  }
  return base;
}

/** Convert PascalCase story name to readable label (e.g. "TextBelowImage" → "Text Below Image") */
function storyNameToLabel(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
}

// Build the index once at module load
const storyIndex = new Map<string, ComponentStories>();
for (const preset of presets as Preset[]) {
  if (!preset.args || Object.keys(preset.args).length === 0) continue;
  const slug = storyIdToSlug(preset.id);
  if (!storyIndex.has(slug)) {
    storyIndex.set(slug, { stories: [], byId: new Map() });
  }
  const entry = storyIndex.get(slug)!;
  entry.stories.push(preset);
  entry.byId.set(preset.id, preset);
}

/** Get all available story variants for a component. Exported for use in the editor sidebar. */
export function getComponentStories(
  componentId: string,
): { id: string; label: string }[] {
  const entry = storyIndex.get(componentId);
  if (!entry) return [];
  return entry.stories.map((s) => ({
    id: s.id,
    label: storyNameToLabel(s.name),
  }));
}

// ── Component ───────────────────────────────────────────────────────
interface ComponentPreviewPageProps {
  componentId: string;
  storyId?: string | null;
}

const ComponentPreviewPage: FC<ComponentPreviewPageProps> = ({
  componentId,
  storyId,
}) => {
  const Component = components[componentId];
  const entry = storyIndex.get(componentId);

  // Resolve args: use specified story, or fall back to first available
  const preset =
    storyId && entry?.byId.has(storyId)
      ? entry.byId.get(storyId)!
      : entry?.stories[0];

  if (!Component || !preset) {
    return (
      <Section>
        <Text
          text={`No preview available for "${componentId}". Token changes will still apply when the component is used on a page.`}
        />
      </Section>
    );
  }

  const keysToStrip = SERIALIZED_KEYS[componentId];
  let content;
  if (NEEDS_CHILDREN.has(componentId)) {
    // These components receive content as JSX children (not via args)
    content = <Component {...preset.args}>{defaultChildren}</Component>;
  } else if (keysToStrip) {
    // Reconstruct live React children from serialized element props
    const cleanArgs = { ...preset.args };
    const reconstructed: Record<string, ReactNode> = {};
    for (const k of keysToStrip) {
      if (cleanArgs[k]) {
        reconstructed[k] = reconstruct(cleanArgs[k]);
      }
      delete cleanArgs[k];
    }
    // Pass reconstructed children back as props (split components accept
    // firstComponents/secondComponents or main/aside as ReactNode props)
    content = createElement(Component, { ...cleanArgs, ...reconstructed });
  } else {
    content = createElement(Component, preset.args);
  }

  if (FULL_WIDTH.has(componentId) || componentId === "section") {
    return <>{content}</>;
  }

  return <Section width="default">{content}</Section>;
};

export default ComponentPreviewPage;
