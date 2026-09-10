# Storybook & Editor Theming Mismatch Analysis

## Problem

The Storybook **manager chrome** (sidebar, toolbar, panels), the **Design Tokens Editor**, and the **Schema Layer Editor** all showed a different theme than the **preview canvas** (rendered components). The preview displayed the correct project branding, but the chrome and both editors used stale default kickstartDS values.

## Root Cause

Two completely separate token pipelines existed, and they had diverged.

### Stale Pipeline (Style Dictionary)

1. **Source**: `src/token/dictionary/*.json` (Style Dictionary format)
2. **Build step**: `build-tokens` (`kickstartDS tokens compile`) → generates `src/token/tokens.js` + `tokens.css`
3. **Values**: Original kickstartDS defaults — **never updated** when the project branding was customized

### Correct Pipeline (W3C DTCG Branding Tokens)

1. **Source**: `src/token/branding-tokens.json` (W3C DTCG format)
2. **Build step**: `branding-tokens` (`node scripts/buildBrandingTokens.mjs`) → generates `src/token/branding-tokens.css`
3. **Consumed by**: Component SCSS references `--ks-brand-*` CSS custom properties at runtime
4. **Values**: Actual project branding — **correctly customized**

### Value Comparison

| Token            | Stale (tokens.js / tokens.css)               | Correct (branding-tokens) |
| ---------------- | -------------------------------------------- | ------------------------- |
| Primary color    | `#3065c0` (blue)                             | `#007e6f` (teal)          |
| Foreground       | `#06081f`                                    | `#151515`                 |
| Font (interface) | `system-ui, -apple-system, …` (system stack) | `Inter`                   |

### Affected Consumers

| Consumer                 | Before (stale source)               | After (fixed)                               |
| ------------------------ | ----------------------------------- | ------------------------------------------- |
| Storybook Manager Chrome | `tokens.js` via `themes.ts`         | `branding-tokens.json` via `themes.ts`      |
| Design Tokens Editor     | `tokens.js` via MUI `createTheme()` | `branding-tokens.json` via `createTheme()`  |
| Schema Layer Editor      | `tokens.css` via CSS `:root` vars   | `branding-tokens.css` via CSS `color-mix()` |
| Storybook Preview Canvas | _(was already correct)_             | _(unchanged)_                               |

## Resolution

**Option B was implemented** — all three consumers now import `branding-tokens.json` (or `.css`) directly and derive their theme values from the W3C DTCG source, using helper functions to convert sRGB components to hex/rgba.

### Changes Made

1. **`.storybook/themes.ts`** — Replaced `tokens.js` import with `branding-tokens.json` import. Uses `componentsToHex()`, `componentsToRgba()`, and `mixToHex()` helpers to derive Storybook theme colors from DTCG values.

2. **`packages/design-tokens-editor/src/main.tsx`** — Replaced `tokens.js` + `tokens.css` imports with `branding-tokens.json` import. Uses the same helper pattern to compute MUI `createTheme()` palette, typography, and component overrides.

3. **`packages/schema-layer-editor/src/app/main.tsx`** — Replaced `tokens.css` import with `branding-tokens.css` import.

4. **`packages/schema-layer-editor/src/app/styles/editor.css`** — Updated all `:root` CSS custom properties to use `--ks-brand-*` variables with CSS `color-mix()` for derived values (hover states, alpha tints, border colors).

5. **`packages/schema-layer-editor/vite.config.ts`** — Added `publicDir` pointing to `@kickstartds/design-system/dist/static` (same as Design Tokens Editor) so logo and favicons are sourced from the design system.

6. **Removed `packages/schema-layer-editor/src/app/public/`** — Stale local logo.svg and favicons, now served from the design system.

## Data Flow Diagram (After Fix)

```
src/token/branding-tokens.json (W3C DTCG — single source of truth)
         │
    branding-tokens
  (node scripts/buildBrandingTokens.mjs)
         │
         ├─────────────────────────────────────────────────────────┐
         ▼                                                         ▼
  branding-tokens.css                                    branding-tokens.json
  (CSS custom properties)                                (imported as JS object)
         │                                                         │
         ├──────────────────┐                    ┌─────────────────┼──────────────┐
         ▼                  ▼                    ▼                 ▼              ▼
  Component SCSS       Schema Layer         Storybook        Design Tokens    Storybook
  (runtime cascade)    Editor CSS           themes.ts        Editor MUI       Preview
  var(--ks-brand-*)    color-mix()          create()         createTheme()    theme ✅
         │                  │                    │                 │
         ▼                  ▼                    ▼                 ▼
  Preview Canvas ✅   Editor UI ✅         Manager Chrome ✅  Editor UI ✅
```

## Key Files

- `src/token/branding-tokens.json` — W3C DTCG branding source (single source of truth)
- `src/token/branding-tokens.css` — Generated CSS custom properties
- `.storybook/themes.ts` — Storybook chrome theme (reads branding-tokens.json)
- `packages/design-tokens-editor/src/main.tsx` — Design Tokens Editor MUI theme (reads branding-tokens.json)
- `packages/schema-layer-editor/src/app/styles/editor.css` — Schema Layer Editor CSS vars (reads branding-tokens.css)
- `packages/schema-layer-editor/src/app/main.tsx` — Schema Layer Editor entry (imports branding-tokens.css)

### Legacy (still exists but no longer drives UI theming)

- `src/token/dictionary/*.json` — Style Dictionary source (stale defaults, used by other build steps)
- `src/token/tokens.js` / `tokens.css` — Style Dictionary output (no longer imported by any UI consumer)
