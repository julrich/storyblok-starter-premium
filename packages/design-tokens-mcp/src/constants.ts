import path from "path";
import { fileURLToPath } from "url";
import type {
  TokenFilesMap,
  ComponentCategoriesMap,
  ComponentTokenFilesMap,
} from "./types.js";

// ── Directory paths ─────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const TOKENS_DIR = path.join(__dirname, "..", "tokens");
export const COMPONENT_TOKENS_DIR = path.join(TOKENS_DIR, "componentToken");

// ── Token file categories with metadata ─────────────────────────────────────

export const TOKEN_FILES: TokenFilesMap = {
  branding: {
    file: "branding-tokens.css",
    description:
      "Core brand CSS custom properties (colors, fonts, spacing, factors)",
    category: "branding",
  },
  "branding-json": {
    file: "branding-tokens.json",
    description:
      "W3C DTCG branding tokens (structured source of truth for theme generation)",
    category: "branding-config",
    isJson: true,
  },
  color: {
    file: "color-token.scss",
    description: "Derived color tokens with scales and mixing",
    category: "color",
  },
  "background-color": {
    file: "background-color-token.scss",
    description: "Background color tokens for various UI states",
    category: "background-color",
  },
  "text-color": {
    file: "text-color-token.scss",
    description: "Text/foreground color tokens",
    category: "text-color",
  },
  "border-color": {
    file: "border-color-token.scss",
    description: "Border color tokens for various UI states",
    category: "border-color",
  },
  border: {
    file: "border-token.scss",
    description: "Border width and radius tokens",
    category: "border",
  },
  font: {
    file: "font-token.scss",
    description: "Font family, weight, and line-height tokens",
    category: "font",
  },
  "font-size": {
    file: "font-size-token.scss",
    description: "Font size scale tokens with responsive calculations",
    category: "font-size",
  },
  spacing: {
    file: "spacing-token.scss",
    description: "Spacing scale tokens for margins and padding",
    category: "spacing",
  },
  "box-shadow": {
    file: "box-shadow-token.scss",
    description: "Box shadow tokens for elevation",
    category: "box-shadow",
  },
  transition: {
    file: "transition-token.scss",
    description: "Animation timing and duration tokens",
    category: "transition",
  },
  scaling: {
    file: "scaling-token.scss",
    description: "Scaling factors for responsive design",
    category: "scaling",
  },
};

// ── Component categories for grouping ───────────────────────────────────────

export const COMPONENT_CATEGORIES: ComponentCategoriesMap = {
  navigation: [
    "header",
    "nav-flyout",
    "nav-toggle",
    "nav-topbar",
    "breadcrumb",
    "content-nav",
    "pagination",
  ],
  content: ["headline", "rich-text", "text", "image-text", "image-story"],
  blog: ["blog-aside", "blog-head", "blog-teaser"],
  cards: ["teaser-card", "business-card", "contact"],
  heroes: ["hero", "cta", "video-curtain"],
  forms: [
    "button",
    "checkbox",
    "checkbox-group",
    "radio",
    "radio-group",
    "text-field",
    "text-area",
    "select-field",
  ],
  layout: ["section", "split-even", "split-weighted", "mosaic", "gallery"],
  "data-display": [
    "stats",
    "features",
    "faq",
    "testimonials",
    "downloads",
    "logos",
  ],
  utility: [
    "divider",
    "lightbox",
    "slider",
    "cookie-consent",
    "footer",
    "html",
    "logo",
    "event-latest",
    "event-latest-teaser",
    "event-list-teaser",
  ],
};

// ── Component token file registry (50 files) ───────────────────────────────

export const COMPONENT_TOKEN_FILES: ComponentTokenFilesMap = {
  "blog-aside": {
    file: "blog-aside-tokens.scss",
    category: "blog",
    description: "Blog sidebar with author info, metadata, and share bar",
  },
  "blog-head": {
    file: "blog-head-tokens.scss",
    category: "blog",
    description: "Blog article header with date, headline, and spacing",
  },
  "blog-teaser": {
    file: "blog-teaser-tokens.scss",
    category: "blog",
    description:
      "Blog teaser card with image, topic, copy, and author metadata",
  },
  breadcrumb: {
    file: "breadcrumb-tokens.scss",
    category: "navigation",
    description: "Breadcrumb navigation with icon separators",
  },
  "business-card": {
    file: "business-card-tokens.scss",
    category: "cards",
    description: "Business card with image, contact info, avatar, and links",
  },
  button: {
    file: "button-tokens.scss",
    category: "forms",
    description:
      "Button with primary/secondary/tertiary variants and small/medium/large sizes",
  },
  "checkbox-group": {
    file: "checkbox-group-tokens.scss",
    category: "forms",
    description: "Checkbox group container with label styling",
  },
  checkbox: {
    file: "checkbox-tokens.scss",
    category: "forms",
    description: "Checkbox input with checked/hover/focus states and label",
  },
  contact: {
    file: "contact-tokens.scss",
    category: "cards",
    description:
      "Contact card with image, title, copy, and linked contact items",
  },
  "content-nav": {
    file: "content-nav-tokens.scss",
    category: "navigation",
    description: "Content navigation panel with links, image, and toggle",
  },
  "cookie-consent": {
    file: "cookie-consent-tokens.scss",
    category: "utility",
    description:
      "Cookie consent banner/dialog with options, toggles, and overlay",
  },
  cta: {
    file: "cta-tokens.scss",
    category: "heroes",
    description:
      "Call-to-action section with headline, copy, image, and color variants",
  },
  divider: {
    file: "divider-tokens.scss",
    category: "utility",
    description: "Visual divider/separator with accent variant",
  },
  downloads: {
    file: "downloads-tokens.scss",
    category: "data-display",
    description: "Downloads list with file items, icons, and hover states",
  },
  "event-latest-teaser": {
    file: "event-latest-teaser-tokens.scss",
    category: "utility",
    description: "Event latest teaser (placeholder — no tokens defined)",
  },
  "event-latest": {
    file: "event-latest-tokens.scss",
    category: "utility",
    description: "Event latest component (placeholder — no tokens defined)",
  },
  "event-list-teaser": {
    file: "event-list-teaser-tokens.scss",
    category: "utility",
    description: "Event list teaser (placeholder — no tokens defined)",
  },
  faq: {
    file: "faq-tokens.scss",
    category: "data-display",
    description: "FAQ accordion with summary/answer styling and expand icon",
  },
  features: {
    file: "features-tokens.scss",
    category: "data-display",
    description:
      "Features list with icons, titles, copy, and links at multiple sizes",
  },
  footer: {
    file: "footer-tokens.scss",
    category: "utility",
    description: "Page footer with logo, byline, and navigation links",
  },
  gallery: {
    file: "gallery-tokens.scss",
    category: "layout",
    description: "Image gallery with configurable tile sizes and aspect ratios",
  },
  header: {
    file: "header-tokens.scss",
    category: "navigation",
    description:
      "Page header with logo, floating variant, and responsive spacing",
  },
  headline: {
    file: "headline-tokens.scss",
    category: "content",
    description:
      "Headline component with h1–h4 levels, subheadline, and highlight styling",
  },
  hero: {
    file: "hero-tokens.scss",
    category: "heroes",
    description:
      "Hero banner with textbox, overlay gradients, and responsive min-height",
  },
  html: {
    file: "html-tokens.scss",
    category: "utility",
    description: "HTML embed container with consent overlay styling",
  },
  "image-story": {
    file: "image-story-tokens.scss",
    category: "content",
    description: "Image-story (storytelling) layout with copy and spacing",
  },
  "image-text": {
    file: "image-text-tokens.scss",
    category: "content",
    description: "Image-text block with standard and highlight variants",
  },
  lightbox: {
    file: "lightbox-tokens.scss",
    category: "utility",
    description:
      "Lightbox overlay with counter, buttons, and placeholder background",
  },
  logo: {
    file: "logo-tokens.scss",
    category: "utility",
    description: "Logo component (placeholder — no tokens defined)",
  },
  logos: {
    file: "logos-tokens.scss",
    category: "data-display",
    description: "Logo grid with tagline, responsive columns, and gap control",
  },
  mosaic: {
    file: "mosaic-tokens.scss",
    category: "layout",
    description: "Mosaic layout with headline, copy, and content padding",
  },
  "nav-flyout": {
    file: "nav-flyout-tokens.scss",
    category: "navigation",
    description:
      "Flyout navigation menu with labels, sublist, transitions, and dimmed states",
  },
  "nav-toggle": {
    file: "nav-toggle-tokens.scss",
    category: "navigation",
    description: "Navigation hamburger toggle with floating variant",
  },
  "nav-topbar": {
    file: "nav-topbar-tokens.scss",
    category: "navigation",
    description:
      "Top navigation bar with label styling, icons, and floating variant",
  },
  pagination: {
    file: "pagination-tokens.scss",
    category: "navigation",
    description: "Pagination controls with active state and responsive border",
  },
  "radio-group": {
    file: "radio-group-tokens.scss",
    category: "forms",
    description: "Radio button group container with label styling",
  },
  radio: {
    file: "radio-tokens.scss",
    category: "forms",
    description: "Radio button input with checked/hover/focus states and label",
  },
  "rich-text": {
    file: "rich-text-tokens.scss",
    category: "content",
    description: "Rich text block with headline and body copy styling",
  },
  section: {
    file: "section-tokens.scss",
    category: "layout",
    description:
      "Section layout with columns, gutters, content widths, backgrounds, and slider",
  },
  "select-field": {
    file: "select-field-tokens.scss",
    category: "forms",
    description: "Select dropdown with border states, label, and placeholder",
  },
  slider: {
    file: "slider-tokens.scss",
    category: "utility",
    description: "Content slider with arrow and bullet navigation controls",
  },
  "split-even": {
    file: "split-even-tokens.scss",
    category: "layout",
    description:
      "Even-split layout with configurable gutters and content widths",
  },
  "split-weighted": {
    file: "split-weighted-tokens.scss",
    category: "layout",
    description:
      "Weighted-split layout with main/aside areas and gutter control",
  },
  stats: {
    file: "stats-tokens.scss",
    category: "data-display",
    description:
      "Statistics display with icon, number, topic, and copy styling",
  },
  "teaser-card": {
    file: "teaser-card-tokens.scss",
    category: "cards",
    description:
      "Teaser card with image, topic, label, copy, and compact variant",
  },
  testimonials: {
    file: "testimonials-tokens.scss",
    category: "data-display",
    description:
      "Testimonial quotes with source, byline, image, and quote icon",
  },
  "text-area": {
    file: "text-area-tokens.scss",
    category: "forms",
    description: "Textarea input with border states, label, and placeholder",
  },
  "text-field": {
    file: "text-field-tokens.scss",
    category: "forms",
    description:
      "Text input field with border states, shadow, label, and placeholder",
  },
  text: {
    file: "text-tokens.scss",
    category: "content",
    description: "Text block with highlight variant and multi-column support",
  },
  "video-curtain": {
    file: "video-curtain-tokens.scss",
    category: "heroes",
    description:
      "Video curtain hero with headline, copy, textbox, and overlay gradients",
  },
};

// ── Reverse lookup: component slug → category ───────────────────────────────

export const COMPONENT_CATEGORY_MAP: Record<string, string> = {};
for (const [category, components] of Object.entries(COMPONENT_CATEGORIES)) {
  for (const slug of components) {
    COMPONENT_CATEGORY_MAP[slug] = category;
  }
}
