# PRD: Component Token Editing in Design Tokens Editor

**Status:** 📋 Draft
**Date:** 2026-04-01
**Related:** [design-tokens-editor-migration-prd.md](design-tokens-editor-migration-prd.md), [design-token-theming-prd.md](design-token-theming-prd.md), [unified-theming-prd.md](unified-theming-prd.md)

---

## 1. Background & Problem Statement

### Current State

The Design Tokens Editor (`packages/design-tokens-editor/`) provides a browser-based WYSIWYG interface for editing **branding tokens** (Tier 1: `--ks-brand-*` — colors, typography, spacing, borders, shadows, transitions). These ~62 branding token values cascade through a 3-tier token architecture:

| Tier         | Namespace      | Purpose                                               | Editable in Editor?  |
| ------------ | -------------- | ----------------------------------------------------- | -------------------- |
| 1. Branding  | `--ks-brand-*` | Core brand values (colors, fonts, spacing factors)    | ✅ Yes               |
| 2. Semantic  | `--ks-*`       | Purpose-based tokens derived from branding            | ❌ No (auto-derived) |
| 3. Component | `--dsa-*`      | Component-specific tokens referencing semantic tokens | ❌ No                |

Themes are stored as `token-theme` stories in Storyblok under `settings/themes/`, each containing a `tokens` field (W3C DTCG JSON) and a pre-compiled `css` field (`:root { --ks-brand-*: value; }`).

### Problem

While branding tokens control the overall look and feel, **component tokens** (`--dsa-*`) control the fine-grained visual details of each of the 50+ components: button padding, hero min-heights, card border-radii, headline font sizes, etc. Currently, there is **no way to override component tokens per theme** — they are baked into the design system CSS at build time and apply uniformly across all themes.

Editors wanting to adjust component-level styling for a specific theme (e.g., larger hero min-height for a "bold" brand, tighter button padding for a "compact" theme) have no tool to do so — they must either:

- Write raw CSS in the manual `token` text field (error-prone, no preview, no validation)
- Request a design system code change (defeats the purpose of tokens)

### Vision

Extend the Design Tokens Editor with a **"Components" view** where editors can:

1. Browse all 50 component token files organized by category
2. Select which components to customize per theme (on-demand)
3. Override individual tokens with live preview — including responsive breakpoints
4. Choose between raw CSS values and a semantic token reference picker
5. Have **only the overridden values** saved to the theme — no duplication of defaults

---

## 2. Goals & Non-Goals

### Goals

1. **Component token catalog** — Build-time extraction of all 50 component token SCSS files into a structured JSON catalog with responsive breakpoint metadata, shipped in `dist/tokens/`
2. **Selective override storage** — Only user-modified tokens are persisted in a new `componentTokens` field on the `token-theme` content type, compiled to scoped CSS in a `componentCss` field
3. **Components view in editor** — Separate "Branding" vs "Components" view toggle with component browsing, per-token editing, and live preview
4. **Dual-mode value input** — Both raw CSS value entry and a semantic token reference picker (`var(--ks-*)`)
5. **Responsive override support** — Override tokens at specific `@container` and `@media` breakpoints
6. **CSS cascade integration** — Component CSS injected after branding CSS in the `<style>` tag: global defaults → branding theme CSS → component theme CSS → manual token overrides
7. **Full-stack integration** — Editor backend, website theme resolution, MCP tools, and shared services all updated

### Non-Goals

- Creating new component tokens (only overriding existing ones)
- Visual component previews/screenshots in the component editor sidebar
- Undo/redo history for component token edits
- Bulk operations (e.g., "reset all button tokens")
- n8n node theme tool updates (can follow MCP pattern later)
- Redesigning the branding token editor UI
- Multi-theme diffing or comparison views

---

## 3. Design Decisions

| Decision            | Choice                                               | Rationale                                                                                             |
| ------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Component scope     | User picks per theme (all 50 available)              | Maximum flexibility; editors only see components they care about                                      |
| Responsive support  | Full (container queries + media queries)             | 9 components use `@container`, 5 use `@media` — must support both                                     |
| Editor UI           | Separate page/view toggle                            | Keeps branding and component editing conceptually distinct; avoids overloading existing tabs          |
| Value editing       | Both raw CSS and token reference picker              | Raw for literals (`0.75em 1.5em`), picker for semantic refs (`var(--ks-spacing-m)`)                   |
| CSS output          | Scoped selectors with `@container`/`@media` wrappers | Matches source format; relies on cascade order, not specificity hacks                                 |
| Extraction strategy | Parse SCSS source directly via gonzales-pe           | Captures `@include container.size()` and `@media` context that compiled CSS loses in selector nesting |
| Storage             | New `componentTokens` JSON field on `token-theme`    | Parallel to `tokens` (branding); keeps concerns separated; backward compatible                        |

---

## 4. Architecture Overview

```
SCSS Source Files (50 components)
  ↓ (build-time extraction via gonzales-pe SCSS parser)
Component Token Catalog (JSON: tokens + responsive metadata)
  ↓ (published in design-system dist/tokens/)
Design Tokens Editor (runtime)
  ↓ (user edits subset of tokens)
componentTokens JSON (only overridden values) → stored in Storyblok token-theme story
  ↓ (compilation via componentTokensToCss)
componentCss string (scoped CSS) → stored alongside branding css field
  ↓ (runtime application in Next.js)
Injected after branding CSS in <style> tag → overrides component defaults
```

### CSS Cascade Order

```
1. Design System defaults     (global.css — baked at build time)
2. Branding theme CSS         (token-theme.css — :root { --ks-brand-*: value; })
3. Component theme CSS        (token-theme.componentCss — .dsa-button { --dsa-button--*: value; })
4. Manual token overrides     (page/settings token field — raw CSS escape hatch)
```

### Component Token Naming Convention

```
--dsa-{component}[__{element}][_{variant}]--{property}[_{state}]

Examples:
  --dsa-button--padding                     (root property)
  --dsa-button_small--font                  (size variant)
  --dsa-button_primary--color_hover         (variant + state)
  --dsa-hero__textbox--background-color     (element property)
```

---

## 5. Token Statistics

| Metric                            | Count                                                                                                |
| --------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Total component token files       | 50                                                                                                   |
| Components with container queries | 9 (hero, teaser-card, blog-teaser, blog-aside, business-card, logos, contact, section, testimonials) |
| Components with media queries     | 5 (footer, header, pagination, cookie-consent, teaser-card)                                          |
| Typical tokens per component      | 7–42 (average ~20)                                                                                   |
| Estimated total tokens            | ~1,000                                                                                               |
| Estimated catalog JSON size       | ~50–80 KB                                                                                            |

---

## 6. Implementation Plan

### Phase 1: Component Token Extraction Pipeline

**Goal:** Parse SCSS source files to produce a structured catalog of all component tokens with responsive contexts.

**Step 1 — Create extraction script** `packages/design-system/scripts/extractComponentTokenCatalog.cjs`:

- Read each of the 50 `*-tokens.scss` source files
- Use `gonzales-pe` (already a transitive dep via `custom-property-extract`) to parse the SCSS AST
- For each file, extract:
  - **Component name** from selector `.dsa-{name}`
  - **Base tokens**: all `--dsa-*` declarations at root rule level
  - **Responsive tokens**: tokens inside `@include container.size(...)` or `@media` blocks, tagged with the resolved query string
  - **Token metadata**: default value, value type (`literal` / `semantic-ref` / `component-ref`), referenced token name
- Output a single `component-token-catalog.json`

**Step 2 — Define catalog schema** (output format):

```json
{
  "button": {
    "displayName": "Button",
    "selector": ".dsa-button",
    "category": "Forms",
    "tokens": {
      "--dsa-button--padding": {
        "defaultValue": "0.75em 1.5em",
        "valueType": "literal",
        "referencedToken": null
      },
      "--dsa-button--border-width": {
        "defaultValue": "var(--ks-border-width-default)",
        "valueType": "semantic-ref",
        "referencedToken": "--ks-border-width-default"
      }
    },
    "responsiveTokens": {
      "@container hero (min-width: 640px)": {
        "--dsa-hero--min-height": {
          "defaultValue": "24rem",
          "valueType": "literal",
          "referencedToken": null
        }
      }
    }
  }
}
```

**Step 3 — Wire into build pipeline**: Add `component-token-catalog` npm script to `packages/design-system/package.json` running after the existing `token` step. Add Rollup copy target for `dist/tokens/component-token-catalog.json`.

**Step 4 — Create `componentTokensToCss()` function** in `packages/design-system/scripts/componentTokensToCss.mjs`:

- Takes a sparse component overrides object (same shape as theme `componentTokens` field)
- Groups overrides by component selector
- Wraps responsive overrides in matching `@container`/`@media` rules
- Returns a CSS string

**Key files:**

- `packages/design-system/scripts/customPropertyExtract.cjs` — existing extraction (reference pattern)
- `packages/design-system/scripts/tokensToCss.mjs` — existing branding CSS compiler (reference)
- `packages/design-system/rollup.config.mjs` — add copy target for catalog
- `packages/design-system/package.json` — add build script
- `packages/design-system/src/components/**/*-tokens.scss` — 50 SCSS source files

**Verification:**

- Run extraction, verify catalog JSON contains all 50 components with correct token counts matching SCSS source
- Verify responsive tokens for hero (4 container breakpoints) and teaser-card (container + media) are correctly captured with query strings
- Run `componentTokensToCss()` with sample overrides, verify output CSS is valid and scoped

---

### Phase 2: Extend Theme Storage

**Goal:** Add `componentTokens` and `componentCss` fields to the `token-theme` content type and update all CRUD paths.

**Step 5 — Update token-theme schema**: Add two new fields to `packages/website/components/token-theme/token-theme.schema.json`:

- `componentTokens` (string/textarea) — JSON of overridden component tokens
- `componentCss` (string/textarea) — compiled scoped CSS from component overrides

**Step 6 — Push schema to Storyblok**: Run `pnpm --filter website update-storyblok-config`

**Step 7 — Update editor backend routes** in `packages/design-tokens-editor/src/server/routes.ts`:

- `PUT /api/tokens/:name` and `POST /api/tokens/:name`: accept optional `componentTokens` in body, compile via `componentTokensToCss()`, save both `componentTokens` (JSON) and `componentCss` (CSS) to Storyblok
- `GET /api/tokens/:name`: return `componentTokens` alongside `tokens`

**Step 8 — Update Storyblok client** in `packages/design-tokens-editor/src/server/storyblok.ts`:

- `createTheme()` and `updateTheme()`: accept and persist `componentTokens` + `componentCss`
- `getTheme()`: return `componentTokens` field

**Step 9 — Update website theme application**:

- In `packages/website/helpers/storyblok.ts` (`fetchPageProps`): fetch `componentCss` from theme story
- In `packages/website/pages/_document.tsx`: append `componentCss` after branding `css` in `<style>` tag

**Step 10 — Update MCP and shared services**:

- `packages/storyblok-services/src/themes.ts`: accept/return `componentTokens` in all theme functions
- `packages/storyblok-mcp/src/register-tools.ts`: update `create_theme`, `update_theme`, `get_theme`

**Key files:**

- `packages/website/components/token-theme/token-theme.schema.json`
- `packages/design-tokens-editor/src/server/routes.ts`
- `packages/design-tokens-editor/src/server/storyblok.ts`
- `packages/website/helpers/storyblok.ts`
- `packages/website/pages/_document.tsx`
- `packages/storyblok-services/src/themes.ts`
- `packages/storyblok-mcp/src/register-tools.ts`

**Verification:**

- Create a theme with component overrides via API, verify both fields stored in Storyblok
- Load a page with the theme applied, verify branding CSS + component CSS both appear in `<style>` tag
- Verify existing themes without `componentTokens` still work (backward compatible)

---

### Phase 3: Editor Frontend — Components View

**Goal:** Add a "Components" view where users browse components, select which to customize, and edit individual tokens with live preview.

**Step 11 — Add view toggle to App.tsx**: `ViewMode` state (`"branding" | "components"`), segmented control UI. Render `<ComponentEditor>` in components mode.

**Step 12 — Create `ComponentEditor`** (`src/component-editor/ComponentEditor.tsx`):

- Left sidebar: searchable component list grouped by category (Navigation, Forms, Content, Layout, Heroes, Cards, Data Display, Utility)
- Badge indicator for components with active overrides
- Main area: token editor for selected component

**Step 13 — Create `ComponentTokenEditor`** (`src/component-editor/ComponentTokenEditor.tsx`):

- Organized into **Base tokens** section + collapsible **Responsive tokens** sections per breakpoint
- Each token row: shortened name (strip `--dsa-{component}` prefix), default value (read-only), override input, reset button, value type indicator

**Step 14 — Create `TokenValueInput`** (`src/component-editor/TokenValueInput.tsx`):

- Two modes toggled by button:
  - **Raw mode**: text input (color picker for colors, unit selector for dimensions)
  - **Reference mode**: autocomplete of semantic tokens (`--ks-*`) and component tokens (`--dsa-*`), auto-wraps in `var()`
- Smart defaults: reference mode if default is `var()`, raw mode if literal

**Step 15 — Create `ComponentTokenContext`** (`src/component-editor/ComponentTokenContext.tsx`):

- Loads catalog from `@kickstartds/design-system/tokens/component-token-catalog.json`
- Tracks overrides as sparse object: `{ [component]: { [token]: { value, query? } } }`
- Only non-empty overrides stored
- Syncs with `PresetContext` for save/load
- Computes CSS via `componentTokensToCss()` for live preview

**Step 16 — Wire into preview**:

- `TokenContext.tsx`: inject component CSS into localStorage `"componentCss"` key
- `preview-page/main.tsx`: listen for key, inject `<style data-component-tokens>` after branding style tag

**Key files:**

- `packages/design-tokens-editor/src/App.tsx`
- `packages/design-tokens-editor/src/editor/Editor.tsx` (reference)
- `packages/design-tokens-editor/src/token/TokenContext.tsx`
- `packages/design-tokens-editor/src/presets/PresetContext.tsx`
- `packages/design-tokens-editor/src/preview-page/main.tsx`

**Verification:**

- Toggle between views, verify state preserved
- Browse component list, verify tokens match catalog defaults
- Override a button color → preview updates immediately
- Override a hero responsive token → preview updates at that breakpoint
- Reset override → preview reverts
- Save/reload → only overrides persisted and restored
- Switch to reference mode → pick semantic token → renders correctly

---

### Phase 4: Semantic Token Reference Picker

**Goal:** Build an autocomplete UI for browsing and selecting semantic tokens.

**Step 17 — Build semantic token catalog**: Extract all `--ks-*` tokens from compiled `tokens.css` into `semantic-token-catalog.json` (name, computed value, category). Publish in `dist/tokens/`.

**Step 18 — Create `TokenReferencePicker`** (`src/component-editor/TokenReferencePicker.tsx`):

- Filterable dropdown grouped by category (Color, Typography, Spacing, Border, Shadow, Transition)
- Fuzzy search by token name
- Color swatches for color tokens, dimension previews for spacing
- On select: sets `var(--ks-{name})`
- Also supports `--dsa-*` cross-component references

**Key files:**

- `packages/design-system/scripts/customPropertyExtract.cjs` (reference)
- `packages/design-system/src/token/*.scss` (semantic token sources)

**Verification:**

- All semantic token categories appear
- Search "primary" → color tokens filter correctly
- Select token → `var(--ks-...)` value set, preview updates

---

### Phase 5: Polish & Integration

**Goal:** End-to-end integration, backward compatibility, and tooling updates.

**Step 19 — Theme-select field plugin**: No code changes needed — `componentCss` is concatenated server-side in `fetchPageProps()`.

**Step 20 — MCP schema tools**: Add `componentTokens` to `get_theme_schema` response. Update `validate_theme` to validate component overrides against catalog.

**Step 21 — Cascade documentation**: Add inline help in editor UI explaining: Branding CSS → Component CSS → Manual token overrides.

**Step 22 — Catalog versioning**: On editor load, validate overrides against current catalog, flag/strip orphaned overrides from renamed or removed tokens.

**Verification:**

- Full E2E: create theme → branding edits → switch to Components → override 3 button tokens + 1 responsive hero token → save → apply to page → renders correctly
- Existing themes without `componentTokens` load and work unchanged
- Orphan handling: manually add fake override → flagged/stripped on load
- MCP round-trip: `create_theme` with `componentTokens` → `get_theme` returns them

---

## 7. Data Model Changes

### token-theme content type (Storyblok)

| Field             | Type     | Status   | Description                                |
| ----------------- | -------- | -------- | ------------------------------------------ |
| `name`            | string   | Existing | Theme display name                         |
| `tokens`          | textarea | Existing | W3C DTCG branding tokens JSON              |
| `css`             | textarea | Existing | Compiled branding CSS                      |
| `system`          | boolean  | Existing | System-managed flag                        |
| `componentTokens` | textarea | **New**  | Sparse JSON of overridden component tokens |
| `componentCss`    | textarea | **New**  | Compiled scoped component CSS              |

### componentTokens field format

```json
{
  "button": {
    "--dsa-button--padding": "1em 2em",
    "--dsa-button_primary--background-color": "var(--ks-background-color-bold)"
  },
  "hero": {
    "--dsa-hero--min-height": "20rem",
    "@container hero (min-width: 640px)": {
      "--dsa-hero--min-height": "28rem"
    }
  }
}
```

### componentCss field output

```css
.dsa-button {
  --dsa-button--padding: 1em 2em;
  --dsa-button_primary--background-color: var(--ks-background-color-bold);
}
.dsa-hero {
  --dsa-hero--min-height: 20rem;
}
@container hero (min-width: 640px) {
  .dsa-hero {
    --dsa-hero--min-height: 28rem;
  }
}
```

---

## 8. Risks & Mitigations

| Risk                                                      | Impact                                            | Mitigation                                                                                                 |
| --------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| gonzales-pe SCSS parsing is fragile for `@include` mixins | Extraction fails for 9 container-query components | Token SCSS files follow predictable patterns; fall back to regex if AST parsing is unreliable              |
| Catalog size (~80KB) slows editor load                    | Slow initial render in Components view            | Lazy-load per-component on sidebar selection; only bundle the component index                              |
| CSS specificity conflicts with component defaults         | Overrides don't apply                             | Enforce injection order in `_document.tsx`; component CSS always after global CSS                          |
| Stale overrides after design-system update                | Orphaned tokens produce dead CSS                  | Validate overrides on load; flag/strip orphans with user notification                                      |
| Component token count overwhelms editors                  | UX confusion with ~1,000 tokens                   | Category grouping + search + only show selected components; hide responsive tokens in collapsible sections |

---

## 9. Dependencies

| Dependency                                  | Package                                  | Status                           |
| ------------------------------------------- | ---------------------------------------- | -------------------------------- |
| gonzales-pe                                 | `custom-property-extract` transitive dep | ✅ Already installed             |
| Design Tokens Editor migration to Storyblok | `design-tokens-editor`                   | ✅ Completed (see migration PRD) |
| token-theme content type                    | `website`                                | ✅ Exists                        |
| MCP theme tools                             | `storyblok-mcp`                          | ✅ Exists (needs extension)      |
| Shared theme services                       | `storyblok-services`                     | ✅ Exists (needs extension)      |

---

## 10. Open Questions

1. **Category assignment** — Should component categories (Navigation, Forms, Content, etc.) be hardcoded in the extraction script or derived from directory structure / component metadata?
2. **Cross-theme comparison** — Should editors be able to see which component tokens differ between two themes? (Future enhancement candidate)
3. **Import/export** — Should component token overrides be exportable as standalone CSS/JSON for use outside the editor?
