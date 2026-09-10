# PRD: Expose Component Tokens via MCP

**Version:** 1.0  
**Date:** 2026-02-12  
**Status:** Draft

---

## 1. Problem Statement

The Design Token MCP server currently exposes only **global / branding tokens** — colors, fonts, spacing, borders, shadows, and other foundation-level CSS custom properties defined in the top-level `tokens/*.scss` files and the `branding-token.json` config.

There are an additional **~530 CSS custom properties** spread across **50 SCSS files** in `tokens/componentToken/` that describe the visual styling of every individual component in the design system (buttons, heroes, teasers, navigation, forms, layout primitives, etc.). These tokens form a critical **component customization layer** that sits between global branding decisions and the actual rendered UI.

**Without surfacing component tokens through the MCP:**

- An LLM-assisted workflow cannot discover which knobs exist per component.
- Users must manually inspect SCSS source files to understand customization options.
- There is no way to search, filter, or reason about component-level styling decisions alongside global tokens.
- Theming workflows stop at the branding layer and miss fine-grained component overrides.

---

## 2. Goals

| #   | Goal                                                                                      | Success Metric                                                                                  |
| --- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| G1  | **Discoverability** — make it trivial to discover which tokens exist for any component    | A single tool call returns all tokens for a named component                                     |
| G2  | **Cross-reference** — show how component tokens relate to global tokens                   | Token responses include the global token each value resolves to (when it's a `var()` reference) |
| G3  | **Search & filter** — allow free-text and structured searches across all component tokens | Existing `search_tokens` and `list_tokens` tools seamlessly include component tokens            |
| G4  | **Catalog** — provide a high-level inventory of all components and their token counts     | A dedicated tool lists every component with metadata                                            |
| G5  | **Minimal disruption** — extend, don't break, existing tools                              | All current tool contracts remain unchanged; new data is additive                               |

---

## 3. Non-Goals

- **Editing component tokens via MCP** — component tokens are authored SCSS; modifying them requires SCSS recompilation. Out of scope for this iteration (but the data model should not preclude future editing).
- **Resolving computed values** — tokens like `calc(var(--ks-spacing-xxs) * 0.5)` will be exposed as-is; runtime computation is not performed.
- **Component rendering / preview** — the MCP will not render components visually.
- **Auto-generating SCSS** — we expose existing tokens, we do not synthesize new ones.

---

## 4. Token Landscape

### 4.1 File inventory

| #   | File                            | Component           | Approx. Tokens |
| --- | ------------------------------- | ------------------- | -------------- |
| 1   | blog-aside-tokens.scss          | Blog Aside          | 18             |
| 2   | blog-head-tokens.scss           | Blog Head           | 7              |
| 3   | blog-teaser-tokens.scss         | Blog Teaser         | 16             |
| 4   | breadcrumb-tokens.scss          | Breadcrumb          | 7              |
| 5   | business-card-tokens.scss       | Business Card       | 22             |
| 6   | button-tokens.scss              | Button              | 26             |
| 7   | checkbox-group-tokens.scss      | Checkbox Group      | 4              |
| 8   | checkbox-tokens.scss            | Checkbox            | 16             |
| 9   | contact-tokens.scss             | Contact             | 22             |
| 10  | content-nav-tokens.scss         | Content Nav         | 15             |
| 11  | cookie-consent-tokens.scss      | Cookie Consent      | 42             |
| 12  | cta-tokens.scss                 | CTA                 | 13             |
| 13  | divider-tokens.scss             | Divider             | 3              |
| 14  | downloads-tokens.scss           | Downloads           | 24             |
| 15  | event-latest-teaser-tokens.scss | Event Latest Teaser | 0 (empty)      |
| 16  | event-latest-tokens.scss        | Event Latest        | 0 (empty)      |
| 17  | event-list-teaser-tokens.scss   | Event List Teaser   | 0 (empty)      |
| 18  | faq-tokens.scss                 | FAQ                 | 10             |
| 19  | features-tokens.scss            | Features            | 19             |
| 20  | footer-tokens.scss              | Footer              | 13             |
| 21  | gallery-tokens.scss             | Gallery             | 7              |
| 22  | header-tokens.scss              | Header              | 11             |
| 23  | headline-tokens.scss            | Headline            | 32             |
| 24  | hero-tokens.scss                | Hero                | 35             |
| 25  | html-tokens.scss                | HTML Embed          | 4              |
| 26  | image-story-tokens.scss         | Image Story         | 5              |
| 27  | image-text-tokens.scss          | Image Text          | 5              |
| 28  | lightbox-tokens.scss            | Lightbox            | 7              |
| 29  | logo-tokens.scss                | Logo                | 0 (empty)      |
| 30  | logos-tokens.scss               | Logos               | 7              |
| 31  | mosaic-tokens.scss              | Mosaic              | 6              |
| 32  | nav-flyout-tokens.scss          | Nav Flyout          | 24             |
| 33  | nav-toggle-tokens.scss          | Nav Toggle          | 7              |
| 34  | nav-topbar-tokens.scss          | Nav Topbar          | 20             |
| 35  | pagination-tokens.scss          | Pagination          | 14             |
| 36  | radio-group-tokens.scss         | Radio Group         | 4              |
| 37  | radio-tokens.scss               | Radio               | 15             |
| 38  | rich-text-tokens.scss           | Rich Text           | 5              |
| 39  | section-tokens.scss             | Section             | 40             |
| 40  | select-field-tokens.scss        | Select Field        | 16             |
| 41  | slider-tokens.scss              | Slider              | 12             |
| 42  | split-even-tokens.scss          | Split Even          | 14             |
| 43  | split-weighted-tokens.scss      | Split Weighted      | 16             |
| 44  | stats-tokens.scss               | Stats               | 13             |
| 45  | teaser-card-tokens.scss         | Teaser Card         | 30             |
| 46  | testimonials-tokens.scss        | Testimonials        | 19             |
| 47  | text-area-tokens.scss           | Text Area           | 14             |
| 48  | text-field-tokens.scss          | Text Field          | 16             |
| 49  | text-tokens.scss                | Text                | 5              |
| 50  | video-curtain-tokens.scss       | Video Curtain       | 15             |

**Total: ~530 unique base tokens across 46 non-empty files.**

### 4.2 Token naming convention

```
--dsa-{component}[__{element}][_{variant}]--{css-property}[_{state}]
```

- **Component:** `button`, `hero`, `section`, `teaser-card`, …
- **Element:** `__copy`, `__label`, `__icon`, `__image`, `__headline`, …
- **Variant:** `_primary`, `_secondary`, `_small`, `_large`, `_floating`, `_compact`, …
- **CSS Property:** `--font`, `--color`, `--gap`, `--padding`, `--background-color`, …
- **State:** `_hover`, `_active`, `_focus`, `_checked`, `_open`, …

### 4.3 Token value types

| Type                    | Description                                    | Example                             |
| ----------------------- | ---------------------------------------------- | ----------------------------------- |
| **Global reference**    | References a `--ks-*` global token via `var()` | `var(--ks-spacing-stack-m)`         |
| **Cross-component ref** | References another `--dsa-*` token             | `var(--dsa-headline--color)`        |
| **Literal**             | Hard-coded CSS value                           | `1.5em`, `transparent`, `16 / 9`    |
| **Calculated**          | Uses `calc()` with token references            | `calc(var(--ks-spacing-xxs) * 0.5)` |
| **Composite**           | Multiple values (shorthand CSS)                | `0.75em 1.5em`                      |

### 4.4 Component groupings

| Category            | Components                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------- |
| **Navigation**      | header, nav-flyout, nav-toggle, nav-topbar, breadcrumb, content-nav, pagination           |
| **Content / Text**  | headline, rich-text, text, image-text, image-story                                        |
| **Blog**            | blog-aside, blog-head, blog-teaser                                                        |
| **Cards / Teasers** | teaser-card, business-card, contact                                                       |
| **Heroes / CTAs**   | hero, cta, video-curtain                                                                  |
| **Forms**           | button, checkbox, checkbox-group, radio, radio-group, text-field, text-area, select-field |
| **Layout**          | section, split-even, split-weighted, mosaic, gallery                                      |
| **Data Display**    | stats, features, faq, testimonials, downloads, logos                                      |
| **Utility**         | divider, lightbox, slider, cookie-consent, footer, html                                   |

---

## 5. Proposed MCP Tool Design

### 5.1 New tool: `list_components`

**Purpose:** High-level catalog of all components that have design tokens.

```jsonc
{
  "name": "list_components",
  "description": "List all Design System components that have customizable design tokens. Returns component name, category, token count, and source file for each. Use this as the starting point to discover which components can be customized.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "category": {
        "type": "string",
        "enum": [
          "navigation",
          "content",
          "blog",
          "cards",
          "heroes",
          "forms",
          "layout",
          "data-display",
          "utility",
          "all",
        ],
        "description": "Filter by component category (default: 'all')",
      },
    },
  },
}
```

**Response shape:**

```jsonc
{
  "totalComponents": 46,
  "category": "all",
  "components": [
    {
      "name": "button",
      "slug": "button", // used in get_component_tokens
      "category": "forms",
      "file": "button-tokens.scss",
      "tokenCount": 26,
      "description": "Button component with primary/secondary/tertiary variants and three sizes",
      "hasResponsiveOverrides": false,
      "tokenPropertyTypes": [
        "color",
        "background-color",
        "font",
        "padding",
        "border-width",
        "border-radius",
        "font-weight",
        "text-transform",
      ],
    },
    // ...
  ],
}
```

### 5.2 New tool: `get_component_tokens`

**Purpose:** Detailed view of all tokens for a specific component.

```jsonc
{
  "name": "get_component_tokens",
  "description": "Get all design tokens for a specific Design System component. Returns every CSS custom property defined for that component, organized by element/variant/state, with values and references to global tokens. Use 'list_components' first to discover available component names.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "component": {
        "type": "string",
        "description": "Component name/slug (e.g., 'button', 'hero', 'teaser-card', 'section'). Use list_components to discover valid names.",
      },
      "element": {
        "type": "string",
        "description": "Filter to a specific sub-element (e.g., 'label', 'icon', 'copy', 'image')",
      },
      "property": {
        "type": "string",
        "description": "Filter by CSS property type (e.g., 'color', 'font', 'spacing', 'border')",
      },
      "statesOnly": {
        "type": "boolean",
        "description": "Only return tokens that have interactive states (hover, active, focus, checked). Default: false",
      },
    },
    "required": ["component"],
  },
}
```

**Response shape:**

```jsonc
{
  "component": "button",
  "file": "button-tokens.scss",
  "category": "forms",
  "totalTokens": 26,
  "tokens": [
    {
      "name": "--dsa-button--padding",
      "value": "0.75em 1.5em",
      "valueType": "literal", // "literal" | "global-reference" | "component-reference" | "calculated"
      "element": null, // root-level component token
      "variant": null,
      "cssProperty": "padding",
      "state": null,
      "section": "Sizes",
      "comment": null,
      "referencedToken": null, // populated when valueType is a reference
    },
    {
      "name": "--dsa-button_primary--background-color",
      "value": "var(--ks-background-color-primary-interactive)",
      "valueType": "global-reference",
      "element": null,
      "variant": "primary",
      "cssProperty": "background-color",
      "state": null,
      "section": "PRIMARY",
      "referencedToken": "--ks-background-color-primary-interactive",
    },
    {
      "name": "--dsa-button_primary--background-color_hover",
      "value": "var(--ks-background-color-primary-interactive-hover)",
      "valueType": "global-reference",
      "element": null,
      "variant": "primary",
      "cssProperty": "background-color",
      "state": "hover",
      "section": "PRIMARY",
      "referencedToken": "--ks-background-color-primary-interactive-hover",
    },
  ],
  "responsiveOverrides": [],
  "summary": {
    "variants": ["primary", "secondary", "terciary"],
    "elements": [],
    "states": ["hover", "active"],
    "propertyTypes": [
      "padding",
      "border-width",
      "border-radius",
      "font-weight",
      "text-transform",
      "font",
      "color",
      "background-color",
      "border-color",
    ],
  },
}
```

### 5.3 New tool: `search_component_tokens`

**Purpose:** Free-text search across all component tokens, complementing the existing `search_tokens` which covers global tokens.

```jsonc
{
  "name": "search_component_tokens",
  "description": "Search across all component-level design tokens by pattern. Searches token names, values, component names, and comments. Useful for finding all tokens related to a CSS property (e.g., 'border-radius'), a global token (e.g., 'ks-color-primary'), or a concept (e.g., 'hover').",
  "inputSchema": {
    "type": "object",
    "properties": {
      "pattern": {
        "type": "string",
        "description": "Search pattern (case-insensitive). Matches against token names, values, and comments.",
      },
      "searchIn": {
        "type": "string",
        "enum": ["name", "value", "both"],
        "description": "Where to search (default: 'both')",
      },
      "component": {
        "type": "string",
        "description": "Limit search to a specific component",
      },
      "category": {
        "type": "string",
        "enum": [
          "navigation",
          "content",
          "blog",
          "cards",
          "heroes",
          "forms",
          "layout",
          "data-display",
          "utility",
        ],
        "description": "Limit search to a component category",
      },
      "limit": {
        "type": "number",
        "description": "Maximum results to return (default: 50)",
      },
    },
    "required": ["pattern"],
  },
}
```

### 5.4 Extended existing tools

#### `list_tokens` — add component token inclusion

Add an optional `includeComponentTokens` boolean (default: `false` for backwards compatibility). When `true`, component tokens are merged into the result set alongside global tokens.

#### `search_tokens` — add component token inclusion

Same `includeComponentTokens` boolean.

#### `get_token_stats` — add component stats

Extend the stats response with a `componentTokens` section containing per-component counts and category breakdowns.

#### `list_files` — add component token files

Include component token files in the file listing with a `"type": "component"` discriminator.

---

## 6. Data Model

### 6.1 Component Token File Registry

A new `COMPONENT_TOKEN_FILES` map, analogous to the existing `TOKEN_FILES`:

```javascript
const COMPONENT_TOKEN_FILES = {
  button: { file: "button-tokens.scss", category: "forms", description: "..." },
  hero: { file: "hero-tokens.scss", category: "heroes", description: "..." },
  section: {
    file: "section-tokens.scss",
    category: "layout",
    description: "...",
  },
  // ... all 50 files
};
```

### 6.2 Parsed component token record

```typescript
interface ComponentToken {
  name: string; // "--dsa-button_primary--color"
  value: string; // "var(--ks-text-color-on-primary)"
  valueType:
    | "literal"
    | "global-reference"
    | "component-reference"
    | "calculated";
  component: string; // "button"
  element: string | null; // null, "copy", "label", "icon", ...
  variant: string | null; // null, "primary", "small", "floating", ...
  cssProperty: string; // "color", "font", "gap", "padding", ...
  state: string | null; // null, "hover", "active", "focus", ...
  file: string; // "button-tokens.scss"
  category: string; // "forms"
  section: string | null; // "PRIMARY" (from SCSS comments)
  comment: string | null;
  referencedToken: string | null; // "--ks-text-color-on-primary" (extracted from var())
}
```

### 6.3 Token name parsing

The BEM-like naming convention can be parsed with:

```
--dsa-{component}[__{element}][_{variant}]--{property}[_{state}]
```

A regex-based parser should extract `component`, `element`, `variant`, `cssProperty`, and `state` from every token name.

---

## 7. Implementation Architecture

### 7.1 File structure changes

All changes are in `index.js` (single-file server architecture is maintained).

### 7.2 New functions

| Function                                    | Purpose                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------ |
| `loadComponentTokenFiles()`                 | Discover and read all SCSS files in `tokens/componentToken/`                   |
| `parseComponentTokenName(name)`             | Decompose `--dsa-*` name into component / element / variant / property / state |
| `classifyTokenValue(value)`                 | Classify as literal / global-reference / component-reference / calculated      |
| `getComponentCategory(componentSlug)`       | Map component slug to its semantic category                                    |
| `getComponentDescription(componentSlug)`    | Generate or return a human-readable description                                |
| `parseAllComponentTokens(componentFilter?)` | Parse all (or one) component token files, returning enriched records           |

### 7.3 Caching strategy

Component token files are read from disk on every request (consistent with existing global token behavior). If performance becomes a concern, an in-memory cache with file-watcher invalidation can be added later.

---

## 8. UX / Developer Experience

### 8.1 Typical workflows

**Workflow A — "What can I customize on the Button?"**

1. `list_components` → find `button` in the list
2. `get_component_tokens({ component: "button" })` → see all 26 tokens with variants and states

**Workflow B — "Which components use the primary color?"**

1. `search_component_tokens({ pattern: "ks-color-primary" })` → list every component token that references the global primary color

**Workflow C — "Show me all hover states across the design system"**

1. `search_component_tokens({ pattern: "hover" })` → all interactive-state tokens

**Workflow D — "What tokens exist for form components?"**

1. `list_components({ category: "forms" })` → button, checkbox, radio, text-field, text-area, select-field, etc.
2. Pick one and drill in with `get_component_tokens`

**Workflow E — "Overview of the full token system"**

1. `get_token_stats` (now includes component stats)
2. `list_components` for component-level inventory
3. Drill into specifics as needed

---

## 9. Risks & Mitigations

| Risk                                                      | Mitigation                                                                     |
| --------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Large response payloads (some components have 40+ tokens) | Pagination and filtering built into `get_component_tokens`                     |
| Token name parsing edge cases                             | Conservative regex with fallback to raw name; unit tests for known patterns    |
| Empty component files (4 files)                           | Excluded from `list_components` or shown with `tokenCount: 0`                  |
| Responsive overrides (container/media queries)            | Captured as a separate `responsiveOverrides` array; not mixed into base tokens |
| Performance with 50 extra files                           | Lazy loading per-component; full scan only for search/stats                    |

---

## 10. Future Considerations

- **Component token editing** — once an SCSS build pipeline is connected, `update_component_token` could modify values and trigger recompilation.
- **Token dependency graph** — visualize which global tokens feed into which component tokens (and across components via `--dsa-*` cross-references).
- **Component preview** — return a Storybook or HTML preview URL alongside token data.
- **Token diff** — compare component tokens across theme variants or branches.
