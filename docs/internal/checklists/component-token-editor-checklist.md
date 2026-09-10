# Component Token Editor — Implementation Checklist

**PRD:** [component-token-editor-prd.md](../prd/component-token-editor-prd.md)
**ADR:** [adr-component-token-editor.md](../../adr/adr-component-token-editor.md)
**Started:** 2026-04-01

---

## Phase 1: Component Token Extraction Pipeline

> Build-time extraction of SCSS source files into a structured JSON catalog with responsive metadata.

- [x] **1.1** Create `packages/design-system/scripts/extractComponentTokenCatalog.cjs`
  - Parse 50 `*-tokens.scss` files via regex-based parser (gonzales-pe can't parse `@include ... { }` blocks)
  - Extract component name, base tokens, responsive tokens (container + media), value metadata
  - Output `component-token-catalog.json` (49 components, 793 tokens, 38 responsive)
- [x] **1.2** Wire `component-token-catalog` npm script into `packages/design-system/package.json` (after `token` step)
- [x] **1.3** Add Rollup copy target for `dist/tokens/component-token-catalog.json` + `componentTokensToCss.mjs`
- [x] **1.4** Create `packages/design-system/scripts/componentTokensToCss.mjs`
  - Takes sparse component overrides object → produces scoped CSS string
  - Groups overrides by selector, wraps responsive overrides in `@container`/`@media` rules
- [x] **1.5** Verify extraction: 49 components (logo empty), correct token counts, hero 29 base + 9 responsive, teaser-card 29 base + 11 responsive (container + media + nested)
- [x] **1.6** Verify `componentTokensToCss()` round-trip: sample overrides → valid scoped CSS with correct selectors and @container/@media wrapping

---

## Phase 2: Extend Theme Storage

> Add `componentTokens` and `componentCss` fields to `token-theme` and update all CRUD paths.

- [x] **2.1** Add `componentTokens` (textarea) and `componentCss` (textarea) fields to `packages/website/components/token-theme/token-theme.schema.json`
- [ ] **2.2** Push schema to Storyblok: `pnpm --filter website update-storyblok-config`
- [x] **2.3** Update editor backend routes (`packages/design-tokens-editor/src/server/routes.ts`): accept, compile, and persist `componentTokens` + `componentCss`
- [x] **2.4** Update Storyblok client (`packages/design-tokens-editor/src/server/storyblok.ts`): pass `componentTokens` + `componentCss` through `createTheme()`, `updateTheme()`, `getTheme()`
- [x] **2.5** Update website theme application: `fetchPageProps()` fetches `componentCss`; `_app.tsx`/`_document.tsx` include it in CSS cascade (between branding CSS and manual token overrides)
- [x] **2.6** Update shared services (`packages/storyblok-services/src/themes.ts`): `ThemeDetail` extended with `componentTokens`/`componentCss`, new `ComponentTokensToCssFn` type, `createTheme`/`updateTheme` accept optional component tokens
- [x] **2.7** Update MCP tools: Zod schemas + tool descriptions + handlers + service layer updated for `componentTokens` in `create_theme`, `update_theme`, `get_theme`
- [x] **2.8** Verify backward compatibility: all changes additive/optional, existing themes without `componentTokens` return `null` for both fields

---

## Phase 3: Editor Frontend — Components View

> Add "Components" view with component browsing, per-token editing, and live preview.

- [x] **3.1** Add `ViewMode` state + segmented control toggle to `packages/design-tokens-editor/src/App.tsx`
- [x] **3.2** Create `ComponentEditor` (`src/component-editor/ComponentEditor.tsx`): searchable component list grouped by category (Heroes, Content, Cards, Media, Layout, Navigation, Forms, Utility), badge indicators for active overrides
- [x] **3.3** Create `ComponentTokenEditor` (`src/component-editor/ComponentTokenEditor.tsx`): base + responsive token sections, per-token override inputs with reset, shortened token names, accordion-based responsive sections
- [x] **3.4** Create `TokenValueInput` (`src/component-editor/TokenValueInput.tsx`): raw text input with monospace font, placeholder showing default, clear button for reset, link icon to toggle semantic token reference picker
- [x] **3.5** Create `ComponentTokenContext` (`src/component-editor/ComponentTokenContext.tsx`): catalog loading, sparse override tracking via `useLocalStorage`, CSS computation via `componentTokensToCss()`, preset sync, ref-based getter for save flow
- [x] **3.6** Wire into preview: `componentCss` stored to localStorage, `preview-page/main.tsx` creates second `<style data-component-tokens>` tag and injects on storage events

---

## Phase 4: Semantic Token Reference Picker

> Autocomplete UI for browsing and selecting semantic tokens.

- [x] **4.1** Build semantic token catalog: `extractSemanticTokenCatalog.cjs` extracts 950 tokens in 16 categories from compiled `tokens.css`, wired into build pipeline + Rollup copy targets, TypeScript module declaration added
- [x] **4.2** Create `TokenReferencePicker` (`src/component-editor/TokenReferencePicker.tsx`): MUI Autocomplete grouped by category, fuzzy search by name/category, color swatches for color tokens, on select emits `var(--ks-...)` value

---

## Phase 5: Polish & Integration

> End-to-end integration, backward compatibility, and tooling updates.

- [x] **5.1** Update MCP schema tools: `get_theme_schema` includes component token catalog summary, `validate_theme` accepts optional `componentTokens` for validation against catalog, `sync-tokens.mjs` syncs catalog files
- [x] **5.2** Add cascade documentation: inline help alert in ComponentEditor with cascade order explanation (Branding → Component → Manual), toggle via help icon
- [x] **5.3** Catalog versioning: `ComponentTokenContext` detects orphaned overrides on every render, `orphanedTokens` array exposed via context, orphan warning banner with "Clean" button in ComponentEditor, `stripOrphans()` removes invalid overrides
- [ ] **5.4** Full E2E verification: create theme → branding + component edits → save → apply → page renders correctly
