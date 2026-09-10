# PRD: Design Token Theming Tools for Storyblok

**Status:** ✅ Implemented (token-theme content type architecture)
**Date:** 2026-02-25
**Author:** Generated from codebase analysis
**Updated:** 2026-07-13 — Aligned with implemented `token-theme` content type architecture

---

> **Implementation Note:** The original PRD proposed storing raw CSS in a `token` field on `page`/`settings` stories. The actual implementation uses a **`token-theme` content type** stored under `settings/themes/` in Storyblok, with a `theme` UUID reference field on `page` and `settings`. Themes are managed via a dedicated **Design Tokens Editor** (Vite SPA + Express backend) that stores branding token JSON + compiled CSS in Storyblok. The MCP server and n8n node provide `list_themes`/`get_theme`/`apply_theme`/`remove_theme` tools to browse and apply themes programmatically. See `packages/design-tokens-editor/` for the editor implementation and `packages/storyblok-services/src/themes.ts` for shared theme CRUD functions.

## 1. Background & Problem Statement

### What Are Design Token Themes?

The kickstartDS Design System uses a layered token architecture:

1. **Branding tokens** (`--ks-brand-*`) — ~62 core CSS custom properties defining colors, fonts, spacing, border-radius, shadows, and durations
2. **Semantic tokens** (`--ks-*`) — purpose-based tokens derived from branding tokens
3. **Component tokens** (`--dsa-*`) — component-specific customizations for 46 components

The branding tokens are the **single point of theming** — changing them cascades through semantic and component layers, completely reskinning a site. The branding token values are managed via a structured JSON config (`branding-token.json`) with 53 configurable values organized into 7 sections: `color` (16 values), `font` (4 font types × ~5 properties), `font-weight` (4 values), `spacing` (3 values), `border-radius`, `box-shadow`, and `breakpoints`.

### How Themes Reach the Browser

The **Design Tokens MCP** (`mcp_design_system2`) provides tools to read and modify these token values and can generate CSS output. The resulting CSS custom properties are meant to be pasted into a **`token` field** that exists on certain Storyblok components:

| Component    | Field             | Type | Description                                                                     |
| ------------ | ----------------- | ---- | ------------------------------------------------------------------------------- |
| **settings** | `token`           | text | CSS custom property overrides included in **global** styles — affects all pages |
| **page**     | _(not yet added)_ | text | Per-page CSS overrides — would override global settings for a single page       |

In `_app.tsx`, the token is resolved with a fallback chain:

```tsx
const token = storyProps?.token || settings?.token || "";
```

and injected as a `<style data-tokens>` tag via `dangerouslySetInnerHTML`. This means per-page tokens already take precedence at the code level, but the **page component schema does not expose a `token` field yet**.

### The Gap

Today, creating and applying a theme to a Storyblok project is an entirely manual, multi-step process:

1. **Extract**: Use the Design Tokens MCP tools (`extract_theme_from_css`, `generate_theme_from_image`) to analyze an existing brand
2. **Configure**: Use `update_theme_config` to set each value individually (53 possible values)
3. **Export**: Mentally translate the JSON config into CSS custom properties
4. **Copy**: Manually paste the CSS into Storyblok's `settings.token` or a page's token field
5. **Verify**: Reload the site to check the result, iterate

There is **no automation** between the Design Tokens MCP and the Storyblok MCP. An AI agent must manually orchestrate between two separate MCPs, converting between JSON config format and CSS custom property format, and manually calling the Storyblok API to update the story. Key pain points:

- **No `token` field on `page`** — per-page theming isn't available in the CMS despite being supported in code
- **No format conversion** — the Design Tokens MCP works in JSON config format (`color.primary: "#ff0000"`), but Storyblok expects raw CSS (`:root { --ks-brand-color-primary: #ff0000; }`)
- **No direct Storyblok integration** — there's no tool to write a theme directly to a settings or page story
- **No theme reading** — there's no tool to read the current theme from Storyblok and load it into the Design Tokens MCP
- **No end-to-end workflow** — extracting a theme from a URL and applying it to a Storyblok space requires ~15+ manual tool calls across two MCPs

### Vision

Enable a one- or two-step workflow where an AI agent can:

- _"Apply the branding from https://acme.com to my Storyblok site"_ → theme extracted, converted, written to settings
- _"Give this landing page a dark theme"_ → per-page token override generated and applied
- _"What theme is currently active?"_ → read from Storyblok, display structured config

---

## 2. Goals & Non-Goals

### Goals

1. **Add a `token` field to the `page` component** in the CMS schema, enabling per-page theming
2. **Create MCP tools** in the Storyblok MCP server that bridge the Design Tokens MCP and Storyblok:
   - **`generate_theme_css`** — convert a structured theme config (or the current Design Tokens MCP state) into CSS custom property syntax ready for Storyblok
   - **`apply_theme`** — write a CSS token string to a Storyblok story's `token` field (settings or page)
   - **`read_theme`** — read the current token CSS from a Storyblok story and return it as structured config
   - **`extract_and_apply_theme`** — end-to-end: extract theme from a URL or image, convert to CSS, write to Storyblok
3. **Create shared service functions** in `storyblok-services` for token format conversion (JSON config ↔ CSS custom properties)
4. **Add n8n node operations** mirroring the new MCP tools for automation workflows
5. **Add Prompter support** — allow the Prompter component to optionally generate and apply a per-page token override during content generation

### Non-Goals

- Modifying the Design Tokens MCP itself — we only consume its output format
- Supporting component-level token overrides (`--dsa-*`) — branding tokens only
- Building a visual theme editor UI in Storyblok — the MCP tools are the interface
- Real-time theme preview in the Visual Editor — this would require Storyblok plugin development
- Font file upload/management — only font family names are set via tokens; actual font files are managed separately

---

## 3. Proposed Architecture

### 3.1 Token Format Conversion

The core utility converts between two formats:

**JSON config format** (as used by the Design Tokens MCP):

```json
{
  "color": {
    "primary": "#ff0000",
    "background": "#ffffff",
    "foreground": "#1a1a1a"
  },
  "font": {
    "display": { "family": "Inter, sans-serif", "font-size": 18 },
    "copy": { "family": "Georgia, serif", "font-size": 16 }
  },
  "spacing": { "base": "4px", "scale-ratio": 1.5 },
  "border-radius": "12px"
}
```

**CSS custom property format** (as stored in Storyblok's `token` field):

```css
:root {
  --ks-brand-color-primary: #ff0000;
  --ks-brand-color-bg: #ffffff;
  --ks-brand-color-fg: #1a1a1a;
  --ks-brand-font-family-display: Inter, sans-serif;
  --ks-brand-font-size-display-base: 18px;
  --ks-brand-font-family-copy: Georgia, serif;
  --ks-brand-font-size-copy-base: 16px;
  --ks-brand-spacing-factor: 1.5;
  --ks-brand-border-radius-factor: 12px;
}
```

The mapping between JSON paths and CSS custom property names follows a deterministic naming convention:

| JSON Path                      | CSS Custom Property                                                   |
| ------------------------------ | --------------------------------------------------------------------- |
| `color.primary`                | `--ks-brand-color-primary`                                            |
| `color.primary-inverted`       | `--ks-brand-color-primary-inverted`                                   |
| `color.background`             | `--ks-brand-color-bg`                                                 |
| `color.background-inverted`    | `--ks-brand-color-bg-inverted`                                        |
| `color.foreground`             | `--ks-brand-color-fg`                                                 |
| `color.foreground-inverted`    | `--ks-brand-color-fg-inverted`                                        |
| `color.link`                   | `--ks-brand-color-link`                                               |
| `color.link-inverted`          | `--ks-brand-color-link-inverted`                                      |
| `color.positive`               | `--ks-brand-color-positive`                                           |
| `color.negative`               | `--ks-brand-color-negative`                                           |
| `color.informative`            | `--ks-brand-color-informative`                                        |
| `color.notice`                 | `--ks-brand-color-notice`                                             |
| `color.onPrimary`              | `--ks-brand-color-onPrimary`                                          |
| `font.display.family`          | `--ks-brand-font-family-display`                                      |
| `font.display.font-size`       | `--ks-brand-font-size-display-base`                                   |
| `font.display.bp-factor.phone` | `--ks-brand-font-size-display-bp-factor` (needs special handling)     |
| `font.copy.family`             | `--ks-brand-font-family-copy`                                         |
| `font.copy.font-size`          | `--ks-brand-font-size-copy-base`                                      |
| `font.interface.family`        | `--ks-brand-font-family-interface`                                    |
| `font.mono.family`             | `--ks-brand-font-family-mono`                                         |
| `font-weight.light`            | `--ks-brand-font-weight-light`                                        |
| `font-weight.regular`          | `--ks-brand-font-weight-regular`                                      |
| `font-weight.semi-bold`        | `--ks-brand-font-weight-semi-bold`                                    |
| `font-weight.bold`             | `--ks-brand-font-weight-bold`                                         |
| `spacing.base`                 | `--ks-brand-spacing-factor` (needs clarification)                     |
| `spacing.scale-ratio`          | `--ks-brand-spacing-grow-factor` / `--ks-brand-spacing-shrink-factor` |
| `border-radius`                | `--ks-brand-border-radius-factor`                                     |
| `box-shadow.blur`              | `--ks-brand-box-shadow-blur-factor`                                   |

> **Note:** Some mappings are not 1:1. The JSON config uses semantic names (`background`, `foreground`) while the CSS properties use abbreviated names (`bg`, `fg`). The font bp-factor is a nested object in JSON but a single factor value in CSS. A mapping table must be maintained as part of the conversion utility.

### 3.2 New Shared Service Functions

Add to `packages/storyblok-services/src/tokens.ts`:

```
themeConfigToCSS(config: ThemeConfig): string
  — Converts a full or partial JSON theme config to CSS custom property string

cssToThemeConfig(css: string): Partial<ThemeConfig>
  — Parses a CSS custom property string back into a structured JSON config

diffThemeConfig(base: ThemeConfig, custom: ThemeConfig): Partial<ThemeConfig>
  — Returns only the values that differ between two configs (for minimal overrides)

mergeThemeCSS(globalCSS: string, pageCSS: string): string
  — Merges global and per-page token CSS, with page values winning
```

### 3.3 New MCP Server Tools

| Tool                      | Parameters                                                                                             | Description                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `generate_theme_css`      | `config?: object`, `fromUrl?: string`, `fromImage?: string`, `partial?: boolean`                       | Generate CSS custom properties from a theme config, URL extraction, or image analysis. If `partial` is true, only changed values are emitted. |
| `apply_theme`             | `storyUid?: string`, `slug?: string`, `target: "settings" \| "page"`, `css: string`, `merge?: boolean` | Write token CSS to a Storyblok story's `token` field. If `merge` is true, the new CSS is merged with existing tokens rather than replacing.   |
| `read_theme`              | `storyUid?: string`, `slug?: string`, `target: "settings" \| "page"`, `format?: "css" \| "config"`     | Read the current token value from a Storyblok story and return as raw CSS or structured config.                                               |
| `extract_and_apply_theme` | `url: string`, `target: "settings" \| "page"`, `storyUid?: string`, `slug?: string`, `merge?: boolean` | End-to-end: extract CSS from a website, convert to branding tokens, write to Storyblok.                                                       |

#### Tool Details

**`generate_theme_css`**

- Accepts a partial or full theme config object matching the Design Tokens MCP schema
- Alternatively accepts a `fromUrl` to extract CSS from a website (delegates to `extract_theme_from_css` logic)
- Alternatively accepts a `fromImage` (base64 or URL) to analyze visual branding (delegates to `generate_theme_from_image` logic)
- Converts the config to CSS custom property syntax using the mapping table
- If `partial` is true, only includes properties that differ from the Design System defaults
- Returns the CSS string

**`apply_theme`**

- Looks up the story by `storyUid` or `slug` (for settings, the slug is typically `settings` or the global settings story)
- For `target: "settings"`, updates the global settings story's `token` field
- For `target: "page"`, updates a specific page story's `token` field
- If `merge` is true, parses existing token CSS, merges with new values, writes the combined result
- Saves the story via the Storyblok Management API
- Optionally publishes the story

**`read_theme`**

- Fetches the story and extracts the `token` field
- If `format: "config"`, parses the CSS back into a structured JSON config
- If `format: "css"` (default), returns the raw CSS string
- For settings, also returns which properties are set (for auditability)

**`extract_and_apply_theme`**

- Fetches all CSS from the target URL
- Extracts color values, font families, font sizes, spacing metrics
- Maps extracted values to the branding token schema
- Converts to CSS custom property format
- Writes to the specified Storyblok story's `token` field
- Returns a summary of what was extracted and applied

### 3.4 Data Flow

```
                    ┌──────────────────────┐
                    │  Design Tokens MCP   │
                    │  (read-only source)  │
                    │                      │
                    │  get_theme_config    │
                    │  list_theme_values   │
                    │  get_branding_tokens │
                    │  extract_theme_css   │
                    │  generate_from_image │
                    └──────────┬───────────┘
                               │ JSON config format
                               ▼
┌─────────────────────────────────────────────────────────┐
│                storyblok-services                       │
│                                                         │
│  tokens.ts                                              │
│  ├── themeConfigToCSS()    JSON → CSS custom props      │
│  ├── cssToThemeConfig()    CSS custom props → JSON      │
│  ├── diffThemeConfig()     compute minimal diff         │
│  └── mergeThemeCSS()       merge global + page tokens   │
│                                                         │
└──────────┬──────────────────────────────┬───────────────┘
           │                              │
           ▼                              ▼
┌─────────────────────┐     ┌──────────────────────────┐
│    MCP Server        │     │      n8n Node            │
│                      │     │                          │
│  generate_theme_css  │     │  "Generate Theme CSS"    │
│  apply_theme         │     │  "Apply Theme"           │
│  read_theme          │     │  "Read Theme"            │
│  extract_and_apply   │     │  "Extract & Apply Theme" │
│                      │     │                          │
└──────────┬───────────┘     └──────────┬───────────────┘
           │                            │
           ▼                            ▼
┌───────────────────────────────────────────────────────┐
│                  Storyblok CMS                        │
│                                                       │
│  settings.token  ──→  <style data-tokens> (global)    │
│  page.token      ──→  <style data-tokens> (per-page)  │
│                       (page overrides settings)        │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### 3.5 Page Component Schema Change

Add a `token` field to the `page` component, identical to the one on `settings`:

```json
{
  "token": {
    "id": 0,
    "pos": 0,
    "display_name": "Token",
    "key": "token",
    "type": "text",
    "description": "CSS custom property overrides for this page only (overrides global settings tokens)",
    "required": false
  }
}
```

This should be placed in a tab group (e.g. "Design") alongside the existing Header/Footer tabs.

The code in `_app.tsx` already supports this via `storyProps?.token || settings?.token || ""`.

### 3.6 Prompter Integration

The Prompter can optionally generate per-page token overrides during content generation:

- In **Page mode**, add an optional "Custom theme" step where the editor can provide a URL or brand description
- The plan step can include a `theme` field that describes the intended visual style
- During generation, the theme is extracted/generated and stored alongside the page content
- On import, the token CSS is written to the page's `token` field

This is a stretch goal for a later phase.

---

## 4. Detailed Task Breakdown

### Phase 1: Foundation — Schema & Conversion Utilities

| #   | Task                                                               | Files                                             | Effort |
| --- | ------------------------------------------------------------------ | ------------------------------------------------- | ------ |
| 1.1 | Add `token` field to `page` component in CMS schema                | `packages/website/cms/components.123456.json`     | S      |
| 1.2 | Push updated component to Storyblok                                | (CLI command)                                     | S      |
| 1.3 | Regenerate TypeScript types with new `token` field                 | `packages/website/types/components-schema.d.ts`   | S      |
| 1.4 | Create `tokens.ts` in storyblok-services with `themeConfigToCSS()` | `packages/storyblok-services/src/tokens.ts`       | M      |
| 1.5 | Implement `cssToThemeConfig()` parser                              | `packages/storyblok-services/src/tokens.ts`       | M      |
| 1.6 | Implement `diffThemeConfig()` and `mergeThemeCSS()`                | `packages/storyblok-services/src/tokens.ts`       | S      |
| 1.7 | Define the JSON↔CSS mapping table as a data structure              | `packages/storyblok-services/src/tokens.ts`       | M      |
| 1.8 | Export new functions from storyblok-services index                 | `packages/storyblok-services/src/index.ts`        | S      |
| 1.9 | Unit tests for all conversion functions                            | `packages/storyblok-services/test/tokens.test.ts` | M      |

### Phase 2: MCP Server Tools

| #   | Task                                                                             | Files                                       | Effort |
| --- | -------------------------------------------------------------------------------- | ------------------------------------------- | ------ |
| 2.1 | Implement `generate_theme_css` tool                                              | `packages/storyblok-mcp/src/index.ts`       | M      |
| 2.2 | Implement `apply_theme` tool                                                     | `packages/storyblok-mcp/src/index.ts`       | M      |
| 2.3 | Implement `read_theme` tool                                                      | `packages/storyblok-mcp/src/index.ts`       | S      |
| 2.4 | Implement `extract_and_apply_theme` tool                                         | `packages/storyblok-mcp/src/index.ts`       | L      |
| 2.5 | Add CSS extraction logic (port from Design Tokens MCP or use HTTP fetch + parse) | `packages/storyblok-services/src/tokens.ts` | M      |
| 2.6 | Update MCP server README with new tool documentation                             | `packages/storyblok-mcp/README.md`          | S      |
| 2.7 | Integration tests for each tool                                                  | `packages/storyblok-mcp/test/`              | M      |

### Phase 3: n8n Node Operations

| #   | Task                                                 | Files                                                | Effort |
| --- | ---------------------------------------------------- | ---------------------------------------------------- | ------ |
| 3.1 | Add "Generate Theme CSS" operation to Theme resource | `packages/storyblok-n8n/nodes/StoryblokKickstartDs/` | M      |
| 3.2 | Add "Apply Theme" operation                          | `packages/storyblok-n8n/nodes/StoryblokKickstartDs/` | M      |
| 3.3 | Add "Read Theme" operation                           | `packages/storyblok-n8n/nodes/StoryblokKickstartDs/` | S      |
| 3.4 | Add "Extract & Apply Theme" operation                | `packages/storyblok-n8n/nodes/StoryblokKickstartDs/` | M      |
| 3.5 | Update n8n node README                               | `packages/storyblok-n8n/README.md`                   | S      |
| 3.6 | Add workflow template for brand migration            | `packages/storyblok-n8n/workflows/`                  | S      |

### Phase 4: Prompter Integration (Stretch)

| #   | Task                                                          | Files                                                 | Effort |
| --- | ------------------------------------------------------------- | ----------------------------------------------------- | ------ |
| 4.1 | Add "Custom Theme" optional step to Page mode                 | `packages/website/components/prompter/`               | M      |
| 4.2 | Add API route `/api/prompter/theme` for theme generation      | `packages/website/pages/api/prompter/theme.ts`        | M      |
| 4.3 | Wire theme CSS into import step (write to page `token` field) | `packages/website/pages/api/prompter/import.ts`       | S      |
| 4.4 | Update Prompter state machine with theme step                 | `packages/website/components/prompter/usePrompter.ts` | M      |

### Phase 5: Documentation & copilot-instructions

| #   | Task                                              | Files                                                 | Effort |
| --- | ------------------------------------------------- | ----------------------------------------------------- | ------ |
| 5.1 | Add theming skill doc                             | `docs/skills/apply-theme.md`                          | S      |
| 5.2 | Update copilot-instructions.md with theming tools | `.github/copilot-instructions.md`                     | S      |
| 5.3 | Update section-recipes with theme-aware templates | `packages/storyblok-mcp/schemas/section-recipes.json` | S      |

---

## 5. Schema Changes

### Page Component — Before

```json
{
  "name": "page",
  "schema": {
    "section": { "type": "bloks", "component_whitelist": ["section"] },
    "header_floating": { "type": "boolean" },
    "header_inverted": { "type": "boolean" },
    "footer_inverted": { "type": "boolean" },
    "seo": { "type": "bloks", "component_whitelist": ["seo"] }
  }
}
```

### Page Component — After

```json
{
  "name": "page",
  "schema": {
    "section": { "type": "bloks", "component_whitelist": ["section"] },
    "tab-header": {
      "type": "tab",
      "keys": ["header_floating", "header_inverted"]
    },
    "header_floating": { "type": "boolean" },
    "header_inverted": { "type": "boolean" },
    "tab-footer": { "type": "tab", "keys": ["footer_inverted"] },
    "footer_inverted": { "type": "boolean" },
    "tab-design": {
      "type": "tab",
      "display_name": "Design",
      "keys": ["token"],
      "description": "Design token overrides for this page"
    },
    "token": {
      "type": "text",
      "display_name": "Token",
      "description": "CSS custom property overrides for this page only (overrides global settings tokens)",
      "required": false
    },
    "seo": { "type": "bloks", "component_whitelist": ["seo"] }
  }
}
```

### ThemeConfig TypeScript Interface

```typescript
interface ThemeConfig {
  color?: {
    primary?: string;
    "primary-inverted"?: string;
    background?: string;
    "background-inverted"?: string;
    foreground?: string;
    "foreground-inverted"?: string;
    link?: string;
    "link-inverted"?: string;
    positive?: string;
    "positive-inverted"?: string;
    negative?: string;
    "negative-inverted"?: string;
    informative?: string;
    "informative-inverted"?: string;
    notice?: string;
    "notice-inverted"?: string;
  };
  font?: {
    display?: FontConfig;
    copy?: FontConfig;
    interface?: FontConfig;
    mono?: FontConfig;
  };
  "font-weight"?: {
    light?: number;
    regular?: number;
    "semi-bold"?: number;
    bold?: number;
  };
  spacing?: {
    base?: string;
    "scale-ratio"?: number;
    "bp-ratio"?: number;
  };
  "border-radius"?: string;
  "box-shadow"?: { blur?: string };
  breakpoints?: {
    phone?: number;
    tablet?: number;
    laptop?: number;
    desktop?: number;
    tv?: number;
  };
}

interface FontConfig {
  family?: string;
  "font-size"?: number;
  "line-height"?: number;
  "scale-ratio"?: number;
  "bp-factor"?: Record<string, number>;
}
```

---

## 6. Token Format Mapping Reference

The conversion between JSON config paths and CSS custom property names requires a maintained mapping. Key rules:

| Pattern          | JSON Path                    | CSS Property                                         |
| ---------------- | ---------------------------- | ---------------------------------------------------- |
| Color            | `color.{name}`               | `--ks-brand-color-{name}`                            |
| Color alias      | `color.background`           | `--ks-brand-color-bg`                                |
| Color alias      | `color.foreground`           | `--ks-brand-color-fg`                                |
| Color alias      | `color.background-inverted`  | `--ks-brand-color-bg-inverted`                       |
| Color alias      | `color.foreground-inverted`  | `--ks-brand-color-fg-inverted`                       |
| Font family      | `font.{type}.family`         | `--ks-brand-font-family-{type}`                      |
| Font size        | `font.{type}.font-size`      | `--ks-brand-font-size-{type}-base`                   |
| Font bp-factor   | `font.{type}.bp-factor.{bp}` | _(not directly mapped — influences computed tokens)_ |
| Font scale-ratio | `font.{type}.scale-ratio`    | `--ks-brand-font-size-{type}-grow-factor`            |
| Font weight      | `font-weight.{weight}`       | `--ks-brand-font-weight-{weight}`                    |
| Spacing          | `spacing.base`               | _(base unit — not a direct CSS property)_            |
| Spacing scale    | `spacing.scale-ratio`        | `--ks-brand-spacing-factor`                          |
| Border radius    | `border-radius`              | `--ks-brand-border-radius-factor`                    |
| Box shadow       | `box-shadow.blur`            | `--ks-brand-box-shadow-blur-factor`                  |

> **Open question:** Some JSON config values don't map 1:1 to CSS custom properties (e.g., `spacing.base` affects a calculation chain, not a single property). Need to validate with the Design System team which properties are safe to override via CSS custom properties alone vs. which require a rebuild.

---

## 7. Migration Path

### Backward Compatibility

- Adding `token` to the `page` component is **non-breaking** — existing pages simply have no value
- The `_app.tsx` fallback chain (`storyProps?.token || settings?.token || ""`) already handles this
- No existing content needs migration
- The new MCP tools are **additive** — all existing tools remain unchanged

### Rollout Sequence

1. Phase 1 first — schema change and conversion utilities are prerequisites for everything
2. Phase 2 can proceed independently of Phase 3
3. Phase 4 (Prompter) depends on Phase 1 + Phase 2
4. Phase 5 can happen in parallel with Phase 2/3

---

## 8. Open Questions

1. **CSS property mapping completeness** — The mapping between `branding-token.json` paths and `--ks-brand-*` CSS custom properties is not fully documented. Some values (like `spacing.base`, font bp-factors) influence computed tokens rather than being directly settable via CSS overrides. Which properties are safe to override at runtime via CSS custom properties?

2. **Theme extraction quality** — When extracting a theme from a URL, how do we map arbitrary CSS values to the branding token schema? For example, a website might use `font-size: 1rem` — how does that map to `font.copy.font-size: 16`? Should we use AI-assisted mapping (via OpenAI) for ambiguous cases?

3. **Per-page theme scope** — Should per-page tokens completely replace global tokens (current `||` behavior) or merge with them? The current code uses `storyProps?.token || settings?.token`, meaning a page token replaces the entire global token string. Should we change this to merge behavior so pages only need to specify their overrides?

4. **Theme validation** — Should we validate that token CSS contains only `--ks-brand-*` properties? Or allow arbitrary CSS custom property overrides (which could include component-level `--dsa-*` tokens)?

5. **Design Tokens MCP integration** — Should the Storyblok MCP server call the Design Tokens MCP directly (via MCP-to-MCP communication), or should we duplicate the extraction/conversion logic in storyblok-services? MCP-to-MCP adds a runtime dependency; duplication adds maintenance burden.

6. **Content type support** — Should `blog-post`, `blog-overview`, `event-detail`, and `event-list` also get `token` fields? Or is per-page theming only relevant for the `page` content type?

7. **Token field UI** — The `token` field is currently a plain `text` type in Storyblok. Should it be changed to `textarea` for better editing? Or should we add a Storyblok field plugin that provides syntax highlighting for CSS?

---

## 9. Success Metrics

- **End-to-end theme application** in ≤3 tool calls (extract → generate → apply) vs. current ~15+ calls
- **Per-page theming** works in production — a page with a `token` override displays correctly with its custom theme
- **Round-trip fidelity** — `read_theme` → `apply_theme` produces identical output (no information loss)
- **Theme extraction accuracy** — extracted themes from real websites produce visually reasonable results in ≥80% of cases
- **n8n workflow template** — a working "Brand Migration" workflow that extracts a theme from a URL and applies it

---

## 10. Dependencies

### Runtime

- `@kickstartds/storyblok-services` — shared conversion functions
- Storyblok Management API — for reading/writing story content
- OpenAI API — for AI-assisted theme extraction from images (optional)

### Development

- Access to the Design Tokens MCP server — for testing format compatibility
- Storyblok space with `settings` and `page` components — for integration testing

---

## 11. Appendix: Available Design Tokens MCP Tools

The Design Tokens MCP (`mcp_design_system2`) exposes the following tools that are relevant to this feature:

| Tool                                          | Purpose                                       | Returns                                 |
| --------------------------------------------- | --------------------------------------------- | --------------------------------------- |
| `get_theme_config(section)`                   | Read structured theme config                  | JSON config for color/font/spacing/etc. |
| `list_theme_values(filter?)`                  | List all 53 configurable values with paths    | Flat list of path → value               |
| `update_theme_config(path, value)`            | Update a single theme value                   | Updated config                          |
| `get_branding_tokens(type?)`                  | Get CSS custom properties with current values | Array of `--ks-brand-*` tokens          |
| `extract_theme_from_css(url)`                 | Fetch and analyze CSS from a website          | Colors, fonts, spacing summary          |
| `generate_theme_from_image(image)`            | Analyze screenshot/image for branding         | Color palette, typography suggestions   |
| `get_color_palette(colorType?)`               | Get all color tokens by type                  | Organized color tokens                  |
| `get_typography_tokens(fontType?, property?)` | Get font-related tokens                       | Typography tokens                       |
| `get_duration_tokens()`                       | Get animation/duration tokens                 | Duration tokens                         |
| `list_components(category?)`                  | List all 46 customizable components           | Component names with token counts       |
| `get_component_tokens(component)`             | Get tokens for a specific component           | Component-level CSS custom properties   |

### Current Token Counts

- **62 branding tokens** (`--ks-brand-*`) — the theming surface
- **53 JSON config values** — the structured config that maps to branding tokens
- **46 components** with component-level tokens — not in scope for this PRD
- **7 config sections**: color, font, font-weight, spacing, border-radius, box-shadow, breakpoints
