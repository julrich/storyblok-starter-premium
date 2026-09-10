# Editor Branding — PRD

> **Status:** Draft
> **Created:** 2026-03-15
> **Scope:** `packages/design-tokens-editor`, `packages/schema-layer-editor`
> **Relation:** Extends the Storybook theming approach in `packages/design-system/.storybook/themes.ts` to two additional editor UIs

---

## 1 Problem Statement

The project's three developer-/editor-facing UIs — Storybook, the Design Tokens Editor, and the Schema Layer Editor — each have independent visual appearances. Storybook was recently themed with the project's own design tokens (primary colors, typography, border radii, backgrounds) and branded with the kickstartDS logo, giving it a polished, on-brand look. The other two editors have no such branding:

| UI                       | Current State                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| **Storybook**            | ✅ Fully themed — light base, primary colors, logo, fonts all sourced from design tokens |
| **Design Tokens Editor** | ❌ Default MUI theme (`createTheme({})`) — stock grey/blue Material Design appearance    |
| **Schema Layer Editor**  | ❌ Custom dark theme — hardcoded purple-tinted CSS variables (`#1e1e2e`, `#7c6ef0`)      |

This disconnect produces an inconsistent brand experience across the tooling suite. A user moving between Storybook, the token editor, and the schema editor encounters three different color palettes, three different typographic stacks, and no shared brand identity.

---

## 2 Goals

| #   | Goal                                                                                   | Success Metric                                                                                                      |
| --- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| G1  | All three UIs share the same **light theme** derived from the same design token values | Side-by-side screenshots show consistent primary color, background color, text color, border radius, and typography |
| G2  | Branding assets (logo, favicon, page title) are consistent across all three UIs        | Same logo SVG, favicon set, and "kickstartDS" titling in all three                                                  |
| G3  | Theming is applied **without modifying the editors' UI component structure**           | No changes to React component trees, MUI component usage, or Schema Layer Editor panel layout                       |
| G4  | Token values are consumed from the **same source** as Storybook (`src/token/tokens`)   | A single token change propagates to all three UIs on rebuild                                                        |
| G5  | Schema Layer Editor switches from dark to **light theme**                              | The editor uses light backgrounds, dark text, and token-sourced accent colors                                       |

---

## 3 Non-Goals

- **Changing UI component libraries.** The Design Tokens Editor keeps MUI; the Schema Layer Editor keeps its plain CSS approach. No component swaps.
- **Adding runtime theme switching.** These editors are internal tools — a single light theme is sufficient. The Storybook theme-switcher toolbar (for previewing component themes) is unrelated.
- **Theming the login page with full fidelity.** The Design Tokens Editor login page should receive the brand-consistent colors, but does not need a full redesign.
- **Publishing a shared theme package.** Token values are imported directly from `@kickstartds/design-system`; no new package is created.
- **Changing the preview iframe content.** The Design Tokens Editor's live preview pane renders actual kickstartDS components with user-edited tokens — that remains unchanged.

---

## 4 Architecture

### 4.1 Token Source (already exists)

The design system exports semantic token values as JavaScript constants from `packages/design-system/src/token/tokens.ts`:

```typescript
export const KsColorPrimaryBase = "#3065c0";
export const KsBackgroundColorDefaultBase = "#ffffff";
export const KsTextColorDefaultBase = "#050505";
export const KsFontFamilyInterface = "'Mulish', sans-serif";
export const KsFontFamilyMono = "'Fira Code', monospace";
export const KsBorderRadiusCard = "12px";
export const KsBorderRadiusControl = "8px";
// ... ~200 more exports
```

The design system also exports a CSS custom properties file (`tokens.css`) with equivalent `--ks-*` variables.

### 4.2 Storybook Reference Implementation

Storybook's theming is the model to follow. It works via:

1. **`.storybook/themes.ts`** — Creates a Storybook theme object by importing `tokens` JS constants and mapping them to Storybook's theme properties (colors, fonts, radii, brand assets).
2. **`.storybook/manager.ts`** — Applies the theme object to the Storybook manager UI.
3. **`.storybook/manager.css`** — Imports `tokens.css` for any CSS-level overrides.

### 4.3 Design Tokens Editor — MUI Theme Approach

The Design Tokens Editor uses **MUI v7** with `createTheme()`. Currently it passes an empty theme object (`createTheme({})`). The branding will be applied by creating a themed `createTheme()` call that sources values from the design token constants.

**Integration point:** [packages/design-tokens-editor/src/main.tsx](packages/design-tokens-editor/src/main.tsx) — where `createTheme({})` is called.

**Secondary integration:** [packages/design-tokens-editor/src/editor/Editor.tsx](packages/design-tokens-editor/src/editor/Editor.tsx) — has its own `editorTheme` with MUI component overrides for the form area. This should inherit from the root theme rather than creating a standalone theme.

#### MUI Theme Mapping

| MUI Theme Property                   | Token Source                               |
| ------------------------------------ | ------------------------------------------ |
| `palette.primary.main`               | `KsColorPrimaryBase`                       |
| `palette.background.default`         | `KsBackgroundColorDefaultBase`             |
| `palette.background.paper`           | `KsBackgroundColorDefaultBase`             |
| `palette.text.primary`               | `KsTextColorDefaultBase`                   |
| `palette.text.secondary`             | `KsColorFgAlpha3Base`                      |
| `typography.fontFamily`              | `KsFontFamilyInterface`                    |
| `typography.fontFamilyCode` (custom) | `KsFontFamilyMono`                         |
| `shape.borderRadius`                 | `KsBorderRadiusControl` (parsed to number) |
| `palette.divider`                    | `KsColorFgToBg7Base`                       |
| `palette.error.main`                 | keep MUI default (functional color)        |

#### Additional Branding

- **Page title:** Change `<title>` in `index.html` from "kickstartDS token playground" to "kickstartDS Design Tokens Editor" (consistency)
- **Favicon:** Add the same favicon set used by Storybook (`<link>` tags in `index.html`)
- **Logo:** Add the kickstartDS logo SVG to the editor toolbar area (non-structural — can be done via CSS or a small toolbar addition in `EditorToolbar`)

### 4.4 Schema Layer Editor — CSS Custom Properties Approach

The Schema Layer Editor uses **plain CSS** with no component library. All colors, fonts, and radii are defined as CSS custom properties in `:root` in [packages/schema-layer-editor/src/app/styles/editor.css](packages/schema-layer-editor/src/app/styles/editor.css).

**Integration approach:** Replace the hardcoded dark-theme CSS custom properties with values sourced from the design tokens. Since this package has no build-time dependency on the design system (and adding one for plain CSS is unnecessary overhead), the values will be **copied as literal values** from the token source and documented as such. Future automation (e.g. a token extraction script) can be added later if needed.

#### CSS Variable Mapping (Dark → Light)

| CSS Variable             | Current Value (dark)       | New Value (light)              | Token Source                                 |
| ------------------------ | -------------------------- | ------------------------------ | -------------------------------------------- |
| `--color-bg`             | `#1e1e2e`                  | `#f3f3f4`                      | `KsBackgroundColorAccentBase`                |
| `--color-surface`        | `#282840`                  | `#ffffff`                      | `KsBackgroundColorDefaultBase`               |
| `--color-surface-hover`  | `#313150`                  | `#e8e8ea`                      | `KsColorPrimaryToBg8Base` or equivalent      |
| `--color-surface-active` | `#3b3b5c`                  | `#d8d8dc`                      | `KsColorPrimaryToBg7Base` or equivalent      |
| `--color-border`         | `#44446a`                  | token-sourced border color     | `KsColorFgToBg7Base`                         |
| `--color-text`           | `#e0e0f0`                  | `#050505`                      | `KsTextColorDefaultBase`                     |
| `--color-text-muted`     | `#9090b0`                  | token-sourced muted text       | `KsColorFgAlpha3Base`                        |
| `--color-primary`        | `#7c6ef0`                  | `#3065c0`                      | `KsColorPrimaryBase`                         |
| `--color-primary-hover`  | `#9080ff`                  | token-sourced primary hover    | `KsColorPrimaryHoverBase` or lighter variant |
| `--color-danger`         | `#f06070`                  | keep or adjust to token red    | functional color (keep as-is or derive)      |
| `--color-success`        | `#40c070`                  | keep or adjust to token green  | functional color (keep as-is or derive)      |
| `--color-warning`        | `#f0a040`                  | keep or adjust to token amber  | functional color (keep as-is or derive)      |
| `--color-hidden-bg`      | `rgba(240, 96, 112, 0.08)` | same danger color at low alpha | derived from danger color                    |
| `--font-sans`            | system stack               | `'Mulish', sans-serif`         | `KsFontFamilyInterface`                      |
| `--font-mono`            | JetBrains Mono stack       | `'Fira Code', monospace`       | `KsFontFamilyMono`                           |

#### Additional Adjustments

- **Scrollbar styling:** The current dark scrollbar (`#44446a` / `#5555a0`) needs light-theme equivalents.
- **Selection colors, focus rings:** Audit all hardcoded color values in `editor.css` beyond the `:root` block and update any that reference dark-theme values directly instead of via the CSS variables.
- **Favicon:** Add the standard project favicon set to `index.html`.
- **Page title:** Update `<title>` to "kickstartDS Schema Layer Editor".
- **Logo:** Add logo to the existing `<h1>Schema Layer Editor</h1>` header bar.
- **Font loading:** The `Mulish` web font must be loaded via `<link>` or `@import` in `index.html`, since there is no design system CSS import that would bring it in automatically.

---

## 5 Implementation Plan

### Phase 1 — Design Tokens Editor Branding

**Scope:** `packages/design-tokens-editor`

| Step | Task                                                                                                                                                                                     | Files                                           |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 1.1  | Add `@kickstartds/design-system` token imports to `main.tsx` and create a branded MUI theme                                                                                              | `src/main.tsx`                                  |
| 1.2  | Refactor `Editor.tsx` to merge its component overrides into the root theme instead of creating a separate `editorTheme`                                                                  | `src/editor/Editor.tsx`                         |
| 1.3  | Add favicon `<link>` tags and update `<title>` in `index.html` and `preview.html`                                                                                                        | `index.html`, `preview.html`                    |
| 1.4  | Add logo SVG to `EditorToolbar` or as a CSS background on the toolbar header                                                                                                             | `src/editor/Toolbar.tsx` or CSS                 |
| 1.5  | Style the `LoginPage` consistently — ensure primary button color, input focus color, and background match the branded theme (these should come for free from the MUI theme, verify only) | `src/LoginPage.tsx` (verify, likely no changes) |
| 1.6  | Load the `Mulish` font via Google Fonts `<link>` in `index.html` (MUI's `fontFamily` alone won't load the actual font file)                                                              | `index.html`                                    |
| 1.7  | Visual QA — verify editor pane, preview toggle, toolbar, login page, and JSON Forms controls all render with the branded palette                                                         | manual                                          |

### Phase 2 — Schema Layer Editor Branding

**Scope:** `packages/schema-layer-editor`

| Step | Task                                                                                                                                                                                                                            | Files                             |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| 2.1  | Replace all `:root` CSS custom property values in `editor.css` with light-theme values sourced from design tokens                                                                                                               | `src/app/styles/editor.css`       |
| 2.2  | Audit all hardcoded color values in `editor.css` that are not defined via CSS variables (inline hex in selectors, pseudo-elements, etc.) and convert them to use the `:root` variables or replace with light-appropriate values | `src/app/styles/editor.css`       |
| 2.3  | Update scrollbar, focus ring, and selection styling for light theme                                                                                                                                                             | `src/app/styles/editor.css`       |
| 2.4  | Add favicon `<link>` tags, update `<title>`, and add Google Fonts `<link>` for Mulish to `index.html`                                                                                                                           | `src/app/index.html`              |
| 2.5  | Add the kickstartDS logo SVG next to the `<h1>` in the app header                                                                                                                                                               | `src/app/App.tsx` or `editor.css` |
| 2.6  | Copy the logo SVG file into the Schema Layer Editor's static assets (or reference a shared path if Vite can resolve it from the design system package)                                                                          | `src/app/` or `public/`           |
| 2.7  | Visual QA — verify all three panels, dialogs, save dialog, field tree, badges, and loading/error states render correctly in light theme                                                                                         | manual                            |

### Phase 3 — Validation & Consistency Check

| Step | Task                                                                                                                                             |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 3.1  | Place screenshots of all three UIs side-by-side and verify visual consistency (primary color, backgrounds, text color, typography, border radii) |
| 3.2  | Verify all three apps have matching favicons, logos, and page titles                                                                             |
| 3.3  | Run Lighthouse accessibility audit on both editors to confirm contrast ratios meet WCAG AA with the new light theme                              |

---

## 6 Risks & Mitigations

| Risk                                                                                                   | Impact                                           | Mitigation                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MUI theme override doesn't reach all JSON Forms controls (Material renderers use their own sub-themes) | Inconsistent form appearance                     | JSON Forms Material renderers inherit from the nearest MUI `ThemeProvider` — the root-level theme should propagate. Verify in Phase 1 step 1.7.                           |
| Schema Layer Editor's dark-theme CSS has hardcoded colors outside of `:root` variables                 | Missed color patches, inconsistent look          | Comprehensive audit in step 2.2 — search for all hex/rgba values in `editor.css`.                                                                                         |
| `Mulish` font not loading in Schema Layer Editor (no bundler plugin for fonts)                         | Falls back to system sans-serif                  | Load via Google Fonts `<link>` in `index.html`. Storybook already loads it the same way.                                                                                  |
| Design Tokens Editor's `editorTheme` in `Editor.tsx` conflicts with root theme                         | Form area renders differently from toolbar/login | Merge into root theme (step 1.2) or explicitly inherit via `createTheme(rootTheme, overrides)`.                                                                           |
| Stale token values drift if tokens are updated in design system but not in Schema Layer Editor CSS     | Colors go out of sync                            | Document the token source for each CSS variable. Add a comment block in `editor.css` noting the design system version and the mapping. A future script can automate this. |

---

## 7 Success Criteria

1. Opening Storybook, Design Tokens Editor, and Schema Layer Editor shows the **same primary color** (`#3065c0`), **same background** (white/light), **same font** (Mulish), and **same logo**.
2. No structural changes to either editor's component tree — only theme/style files are modified plus minimal branding additions (favicon links, logo element).
3. Both editors pass WCAG AA contrast checks with the new light theme.
4. Existing functionality (token editing, live preview, schema tree navigation, save/load) is fully preserved.

---

## 8 Out-of-Scope / Future Work

- **Shared theme package:** If more tools are added to the monorepo, extracting a `packages/shared-theme` package with MUI + CSS variable presets would reduce duplication. Not needed for two editors.
- **Automated token sync for Schema Layer Editor:** A build script that reads `tokens.ts` and writes updated CSS variable values into `editor.css` would eliminate manual drift. Worth adding if token values change frequently.
- **Dark mode toggle:** All three UIs use light theme only. A user preference for dark mode can be added later if requested.
- **Design Tokens Editor preview.html branding:** The preview-only entry point renders kickstartDS components at full fidelity — it doesn't need MUI theming, only the favicon/title update.
