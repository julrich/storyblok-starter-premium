# PRD: Design System Theme Cleanup — Remove Old Themes, Preserve Branding Token Infrastructure

**Status:** Implemented
**Author:** kickstartDS
**Created:** 2026-03-11
**Last Updated:** 2026-03-11

---

## 1. Problem Statement

The design system (`packages/design-system/`) currently ships **two coexisting theming approaches**. The old approach is obsolete and should be fully removed. The new branding token approach is the path forward and its infrastructure must be preserved.

### 1.1 Old Theme Approach — TO BE REMOVED

Four extra themes (**Business**, **Google**, **NGO**, **Telekom**) each have their own:

- Token dictionary directory (`src/token-{name}/dictionary/`)
- Style Dictionary config (`sd.config-{name}.cjs`)
- Compiled CSS output (`src/token-{name}/tokens.css`)
- Build script (`build-tokens-{name}`)
- Post-build CSS patching (`:root` → `[ks-theme=X]` selectors via `scripts/patchThemeTokens.cjs`)
- Runtime switching via `ks-theme` body attribute and `themes.scss` CSS bundle
- Associated font files, font SCSS, and logo SVGs

### 1.2 Branding Token Approach — TO BE PRESERVED

The new theming system uses **branding token JSON files** (`branding-tokens.json`) in W3C Design Token format with sRGB color-space values. These are compiled to CSS custom properties (`:root { --ks-brand-* }`) via `buildBrandingTokens.mjs` / `tokensToCss.mjs`.

Eight named variants (**blizzard**, **burgundy**, **coffee**, **ember**, **granit**, **mint**, **neon**, **water**) demonstrate this approach and serve as built-in example themes. They share the same dictionary and schema as the default.

This is the same format used by the **design-tokens-editor**, which saves themes as `token-theme` stories in Storyblok. The **website** applies these at runtime by injecting the compiled CSS into a `<style data-tokens>` element. The full pipeline:

```
branding-tokens.json (W3C format) → tokensToCss() → CSS custom properties → :root { --ks-brand-* }
```

### 1.3 Legacy Files — TO BE REMOVED

- `branding-token.json` (singular, old hex-based format) — never imported, superseded by `branding-tokens.json`
- `branding-token-{name}.css` (old singular-format variant CSS files) — superseded by `branding-tokens-{name}.css`

### Current Pain Points

1. **Build time waste** — Five separate Style Dictionary compilations (`run-s build-tokens-*`) run sequentially, plus a CSS selector patch step. Only the default compilation is needed.
2. **Package bloat** — The published `dist/` includes old theme CSS, font files, and logo SVGs that no downstream consumer uses.
3. **Maintenance burden** — Four `sd.config-*.cjs` files, four token dictionary trees, the `patchThemeTokens.cjs` script, and the `themes.scss` bundle require coordinated updates for zero production value.
4. **Confusing DX** — Two theming mechanisms coexist: the old `[ks-theme]` attribute approach (Storybook toolbar with 5 themes) and the new branding token CSS-loading approach (playground with 9 variants). It's unclear which is canonical.
5. **Dead code** — The old `themes.scss`, `[ks-theme]` CSS selectors, the Storybook theme toolbar (for old themes), commented-out SCSS imports, and the deprecated `branding-token.json` are all unused in production.
6. **Third-party IP concerns** — Shipping Google and Telekom logos/fonts in an open-source starter raises trademark questions.

---

## 2. Goals

| #   | Goal                                   | Measure of Success                                                                                              |
| --- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| G1  | **Remove old theme approach**          | No Style Dictionary per-theme builds, no `[ks-theme]` selectors, no old theme directories                       |
| G2  | **Faster builds**                      | `build-tokens` runs one Style Dictionary compilation instead of five                                            |
| G3  | **Smaller package**                    | `dist/` no longer contains old theme fonts, logos, or `themes.css` bundle                                       |
| G4  | **Preserve branding token switching**  | Branding token variants, `BrandingSwitch`, `buildBrandingTokens.mjs`, schema, and `tokensToCss.mjs` all survive |
| G5  | **Clean codebase**                     | No dead code, commented-out imports, or legacy files related to old themes                                      |
| G6  | **No downstream breakage**             | `website`, `storyblok-mcp`, `storyblok-services`, `design-tokens-mcp`, `design-tokens-editor` unaffected        |
| G7  | **Storybook/Playroom still work**      | Both tools function correctly; branding token switching remains available in playground                         |
| G8  | **Future CMS theme integration ready** | Infrastructure supports loading themes from Storyblok `token-theme` stories via the design-tokens-editor        |

### Non-Goals

- Redesigning the branding token architecture — the W3C color-space JSON format and `buildBrandingTokens.mjs` pipeline stay as-is.
- Implementing the actual Storyblok theme loading in Storybook/Playroom — that's a separate feature.
- Changing the default theme's visual design — `branding-tokens.json` values remain unchanged.
- Modifying the Style Dictionary compilation for the default theme — `sd.config.cjs` stays as-is.

---

## 3. Impact Analysis

### 3.1 Cross-Package References

All old-theme references are **fully self-contained** in `packages/design-system/`. No external package imports them:

| Package                 | References old themes? | References branding variants?       |
| ----------------------- | ---------------------- | ----------------------------------- |
| `website`               | No                     | No (uses CMS `token-theme` stories) |
| `storyblok-mcp`         | No                     | No                                  |
| `storyblok-services`    | No                     | No (manages CMS themes only)        |
| `design-tokens-mcp`     | No                     | No (uses default only)              |
| `design-tokens-editor`  | No                     | No (uses default + schema)          |
| `component-builder-mcp` | No                     | No                                  |
| `storyblok-n8n`         | No                     | No                                  |

**Conclusion:** Removing old themes has zero risk to downstream consumers.

### 3.2 `ks-theme` Attribute Usage

The `[ks-theme]` CSS attribute selector appears in three semantic token SCSS files (`_selectors.scss`, `scaling-token.scss`, `text-color-token.scss`). These selectors ensured that semantic tokens recalculated correctly when an old theme's CSS was scoped to a `[ks-theme=X]` selector. The new branding token approach doesn't use attribute selectors — it overrides `:root` custom properties directly. These selectors are dead code and should be removed.

### 3.3 What Gets Preserved (Branding Token Infrastructure)

The following files and capabilities are **explicitly retained**:

| File/Component                                  | Purpose                    | Why it stays                                                      |
| ----------------------------------------------- | -------------------------- | ----------------------------------------------------------------- |
| `src/token/branding-tokens.json`                | Default theme (W3C format) | Canonical theme definition                                        |
| `src/token/branding-tokens-{variant}.json` (×8) | Example themes             | Demonstrate switching, serve as templates for new themes          |
| `src/token/branding-tokens-{variant}.css` (×8)  | Compiled variant CSS       | Enable CSS-based theme switching at runtime                       |
| `src/token/branding-tokens.css`                 | Compiled default CSS       | Applied by default via `global.scss`                              |
| `src/token/branding-tokens.schema.json`         | JSON Schema for validation | Used by editor, build pipeline, and MCP servers                   |
| `scripts/buildBrandingTokens.mjs`               | JSON → CSS compiler        | Builds CSS from any `branding-tokens*.json` file                  |
| `scripts/tokensToCss.mjs`                       | Core conversion utility    | Shared by build pipeline, editor, and website                     |
| `scripts/brandingTokensSchemaPlugin.mjs`        | Rollup plugin for schema   | Packages schema into `dist/`                                      |
| `src/playground/.../BrandingSwitch.tsx`         | Playground theme picker    | Demonstrates runtime switching                                    |
| `playroom.config.js` `themes` key               | Playroom theme support     | Theme infrastructure preserved                                    |
| `src/themes/index.ts`                           | Theme metadata exports     | Simplified to default only (can be extended later for CMS themes) |

---

## 4. Detailed Change Plan

### Phase 1: Delete Old Theme Files

#### 4.1 Token directories (delete entirely)

| Path                  | Contents                                                           |
| --------------------- | ------------------------------------------------------------------ |
| `src/token-business/` | `dictionary/` (13 JSON files), `branding-token.json`, `tokens.css` |
| `src/token-google/`   | Same structure                                                     |
| `src/token-ngo/`      | Same structure                                                     |
| `src/token-telekom/`  | Same structure                                                     |

#### 4.2 Style Dictionary configs (delete)

| File                     |
| ------------------------ |
| `sd.config-business.cjs` |
| `sd.config-google.cjs`   |
| `sd.config-ngo.cjs`      |
| `sd.config-telekom.cjs`  |

#### 4.3 Build script (delete)

| File                           | Reason                               |
| ------------------------------ | ------------------------------------ |
| `scripts/patchThemeTokens.cjs` | Only patches old theme CSS selectors |

#### 4.4 Font files (delete)

| Path                     | Contents                                                                 |
| ------------------------ | ------------------------------------------------------------------------ |
| `static/fonts/business/` | 3 WOFF files (NovelPro)                                                  |
| `static/fonts/dsa/`      | 18 WOFF/WOFF2 files (Fredoka/Mulish) — unused, default uses `systemics/` |
| `static/fonts/google/`   | 3 WOFF2 files (Google Sans)                                              |
| `static/fonts/telekom/`  | 4 WOFF files (TeleNeo)                                                   |

**Keep:** `static/fonts/systemics/` (default Montserrat fonts)

#### 4.5 Font SCSS (delete)

| File                       |
| -------------------------- |
| `src/_fonts-business.scss` |
| `src/_fonts-google.scss`   |
| `src/_fonts-telekom.scss`  |

**Keep:** `src/_fonts-systemics.scss` (default font faces)

#### 4.6 Logo SVGs (delete)

| File                           | Notes                                                 |
| ------------------------------ | ----------------------------------------------------- |
| `static/logo-business.svg`     |                                                       |
| `static/logo-dsa.svg`          | Redundant — `static/logo.svg` is the default          |
| `static/logo-dsa-inverted.svg` | Redundant — `static/logo-inverted.svg` is the default |
| `static/logo-google.svg`       |                                                       |
| `static/logo-telekom.svg`      |                                                       |

Note: `logo-ngo.svg` is referenced in code but already doesn't exist on disk.

**Keep:** `static/logo.svg`, `static/logo-inverted.svg`, `static/logo-dark.svg`

---

### Phase 2: Delete Legacy Files (Old Format Only)

#### 4.7 Old-format singular variant CSS (delete — 8 files)

These are the old `branding-token-{name}.css` files (singular "token", not "tokens"). They predate the current W3C format and are superseded by `branding-tokens-{name}.css`:

| File                                    |
| --------------------------------------- |
| `src/token/branding-token-blizzard.css` |
| `src/token/branding-token-burgundy.css` |
| `src/token/branding-token-coffee.css`   |
| `src/token/branding-token-ember.css`    |
| `src/token/branding-token-granit.css`   |
| `src/token/branding-token-mint.css`     |
| `src/token/branding-token-neon.css`     |
| `src/token/branding-token-water.css`    |

#### 4.8 Legacy branding token (delete — 1 file)

| File                            | Reason                                           |
| ------------------------------- | ------------------------------------------------ |
| `src/token/branding-token.json` | Old hex-based format, never imported, superseded |

**Keep (branding token infrastructure):**

- `src/token/branding-tokens.json` + `.css` (default theme)
- `src/token/branding-tokens-{variant}.json` + `.css` (×8 example themes)
- `src/token/branding-tokens.schema.json` (validation schema)

---

### Phase 3: Modify Existing Files

#### 4.9 `package.json` — Build scripts

**Remove** old theme build scripts:

- `build-tokens-business`
- `build-tokens-ngo`
- `build-tokens-google`
- `build-tokens-telekom`

**Simplify** `build-tokens` (no more sequential multi-theme build + patch):

```diff
- "build-tokens": "run-s build-tokens-* && node scripts/patchThemeTokens.cjs"
+ "build-tokens": "kickstartDS tokens compile"
```

Also remove `build-tokens-ds-agency` since it's now identical to the simplified `build-tokens`:

```diff
- "build-tokens-ds-agency": "kickstartDS tokens compile",
```

**Keep** `branding-tokens` and `watch:branding-tokens` scripts unchanged — they compile all branding token variants and are part of the new approach.

#### 4.10 `src/themes/themes.scss` — Old theme CSS bundle

Delete this file. It only imports the four old theme CSS files:

```scss
@use "../token-business/tokens.css" as *;
@use "../token-google/tokens.css" as *;
@use "../token-ngo/tokens.css" as *;
@use "../token-telekom/tokens.css" as *;
```

#### 4.11 `src/themes/useTheme.ts` — Adapt for new approach

The current implementation uses the `ks-theme` body attribute (old approach). **Replace** with a CSS-file-loading approach that aligns with how `BrandingSwitch.tsx` works — loading a branding token CSS file at runtime:

```typescript
import { useEffect } from "react";

export const useTheme = (themeCss?: string) => {
  useEffect(() => {
    const id = "branding-token-link";
    const existing = document.getElementById(id) as HTMLLinkElement | null;

    if (!themeCss) {
      existing?.remove();
      return;
    }

    let link = existing;
    if (!link) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.id = id;
      document.head.appendChild(link);
    }
    link.href = themeCss;
  }, [themeCss]);
};
```

This preserves the hook's contract (Playroom `Frame.tsx` and Storybook can call it) while switching to the CSS-loading mechanism. It can later be extended to load themes from Storyblok `token-theme` story CSS.

#### 4.12 `src/themes/index.ts` — Theme exports

Remove `business`, `google`, `telekom`, `ngo` exports. Keep only `dsa`. The export shape stays the same so Playroom's `themes` key continues to work:

```typescript
export const dsa = {
  title: "DS Agency",
  tokens: "/tokens.css",
  logo: {
    src: "/logo.svg",
    srcInverted: "/logo-inverted.svg",
    homepageHref: "#",
    alt: "Systemics Logo",
    width: 176,
    height: 40,
  },
};
```

In the future, this file can be extended to export themes fetched from Storyblok `token-theme` stories.

#### 4.13 `rollup.config.mjs`

Remove the old themes.css entry (the `themes.scss` file is being deleted):

```diff
  input: {
    ...componentEntryPoints,
    ...playgroundEntryPoints,
    ...pagesEntryPoints,
    ...clientJsEntryPoints,
-   "tokens/themes.css": "src/themes/themes.scss",
  },
```

**Keep** the branding tokens copy globs unchanged — all variant JSON and CSS files should continue shipping in `dist/tokens/`:

```javascript
{
  src: "src/token/*.{js,css,html}",  // includes all branding-tokens-*.css
  dest: "dist/tokens",
},
{
  src: "src/token/branding-tokens{,-*}.json",  // includes all variant JSONs
  dest: "dist/tokens",
},
```

#### 4.14 `.storybook/themeSwitch.tsx` — Storybook toolbar

With the old themes removed, the Storybook toolbar theme switcher only has one entry ("DS Agency"). The toolbar item is unnecessary but harmless. Two options:

- **Option A:** Delete `themeSwitch.tsx`, remove from `preview.tsx` — simplest cleanup
- **Option B:** Adapt it to switch between branding token variants (like `BrandingSwitch`) — useful for designers previewing themes in Storybook

Recommendation: **Option A** for this cleanup. Branding token switching is already available in the playground. A Storybook branding-token decorator can be added later if needed.

#### 4.15 `.storybook/preview.tsx`

If Option A for §4.14: Remove `themeSwitchDecorator` and `globalThemeTypes` imports.

#### 4.16 `src/global.scss` — Remove commented-out imports

Remove these dead commented-out lines referencing old themes and old-format tokens:

```diff
- // @use "./token/branding-token-cool";
- // @use "./token/branding-token-mint";
- // @use "./token/branding-token-neon";
- // @use "./token/branding-token-coffee";
  ...
- // @use "./fonts-dsa";
- // @use "./fonts-business";
- // @use "./fonts-telekom";
- // @use "./fonts-google";
```

#### 4.17 `src/playground/demo-page-controls/branding-switch/BrandingSwitch.tsx`

Update the `BRANDINGS` array to use the **new-format** CSS file names (`branding-tokens-*.css` instead of old `branding-token-*.css`):

```typescript
export const BRANDINGS = [
  { label: "Default", file: "branding-tokens.css" },
  { label: "Blizzard", file: "branding-tokens-blizzard.css" },
  { label: "Burgundy", file: "branding-tokens-burgundy.css" },
  { label: "Coffee", file: "branding-tokens-coffee.css" },
  { label: "Ember", file: "branding-tokens-ember.css" },
  { label: "Granit", file: "branding-tokens-granit.css" },
  { label: "Mint", file: "branding-tokens-mint.css" },
  { label: "Neon", file: "branding-tokens-neon.css" },
  { label: "Water", file: "branding-tokens-water.css" },
];
```

This keeps the playground branding switcher functional with the correct (non-legacy) CSS files.

#### 4.18 `src/_selectors.scss`

Remove `[ks-theme]` from the selector list (only used by old theme approach):

```diff
- $selectors: ":root, [ks-inverted], [ks-theme]";
+ $selectors: ":root, [ks-inverted]";
```

#### 4.19 `src/token/scaling-token.scss`

Remove `[ks-theme]` from the selector block around line 57:

```diff
  :root,
- [ks-theme],
  [ks-inverted="false"],
  [ks-inverted="true"] {
```

#### 4.20 `src/token/text-color-token.scss`

Remove `[ks-theme]` from the selector (consolidate to `:root`):

```diff
- :root,
- [ks-theme] {
+ :root {
```

#### 4.21 `src/playroom/Frame.tsx`

If `useTheme.ts` is adapted (§4.11), the import stays but the usage changes slightly. The `themeName` prop from Playroom's theme picker could be mapped to a branding token CSS path. For now, since only one theme is exported, this is a no-op:

```diff
- import { useTheme } from "../themes/useTheme";
+ import { useTheme } from "../themes/useTheme";
  // No change needed — useTheme now handles CSS loading
  // When `themes/index.ts` exports multiple themes in the future,
  // each theme's `tokens` path would be passed here
```

#### 4.22 `playroom.config.js`

No change needed. The `themes` key continues to reference `./src/themes/index.ts`. With one exported theme, Playroom shows a single option. When more themes are added (e.g. from Storyblok), they'll automatically appear.

---

## 5. File Inventory Summary

| Action    | Category                                   | Count                                 |
| --------- | ------------------------------------------ | ------------------------------------- |
| DELETE    | Old theme token directories                | 4 dirs                                |
| DELETE    | Style Dictionary configs                   | 4 files                               |
| DELETE    | Build script (`patchThemeTokens`)          | 1 file                                |
| DELETE    | Font directories                           | 4 dirs                                |
| DELETE    | Font SCSS files                            | 3 files                               |
| DELETE    | Logo SVGs                                  | 5 files                               |
| DELETE    | Legacy `branding-token-*.css` (old format) | 8 files                               |
| DELETE    | Legacy `branding-token.json`               | 1 file                                |
| DELETE    | `themes.scss`                              | 1 file                                |
| DELETE    | `themeSwitch.tsx` (if Option A)            | 1 file                                |
| MODIFY    | Source files                               | ~10 files                             |
| PRESERVE  | Branding token variants (JSON+CSS)         | 18 files                              |
| PRESERVE  | Branding token infrastructure              | 4 files                               |
| **TOTAL** |                                            | **~32 deletions + ~10 modifications** |

---

## 6. Execution Order

The changes should be applied in this order to avoid intermediate build failures:

1. **Modify `package.json`** — Remove old build scripts, simplify `build-tokens`
2. **Delete old theme directories** — `src/token-{business,google,ngo,telekom}/`
3. **Delete Style Dictionary configs** — `sd.config-{business,google,ngo,telekom}.cjs`
4. **Delete `scripts/patchThemeTokens.cjs`**
5. **Delete font files and SCSS** — `static/fonts/{business,dsa,google,telekom}/`, `src/_fonts-{business,google,telekom}.scss`
6. **Delete logo SVGs** — `static/logo-{business,dsa,dsa-inverted,google,telekom}.svg`
7. **Update `src/themes/`** — Simplify `index.ts`, delete `themes.scss`, adapt `useTheme.ts`
8. **Update Storybook** — Delete `themeSwitch.tsx` (Option A), update `preview.tsx`
9. **Delete legacy files** — Old-format `branding-token-*.css` and `branding-token.json`
10. **Update SCSS** — Remove `[ks-theme]` from `_selectors.scss`, `scaling-token.scss`, `text-color-token.scss`
11. **Update `rollup.config.mjs`** — Remove `themes.css` entry
12. **Update `global.scss`** — Remove commented-out imports
13. **Update `BrandingSwitch.tsx`** — Fix file references to new-format CSS names
14. **Verify build** — `pnpm --filter @kickstartds/design-system build`
15. **Verify Storybook** — `pnpm --filter @kickstartds/design-system storybook`

---

## 7. Validation Criteria

| Check                   | Command                                                                                    | Expected Result                                   |
| ----------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| Design system builds    | `pnpm --filter @kickstartds/design-system build`                                           | Clean build, no errors                            |
| Storybook starts        | `pnpm --filter @kickstartds/design-system storybook`                                       | Stories render correctly with default theme       |
| Playroom starts         | `pnpm --filter @kickstartds/design-system playroom`                                        | Default theme, no errors                          |
| Branding switch works   | Playground branding switcher in Storybook                                                  | All 9 branding variants load correctly            |
| TypeScript passes       | `pnpm --filter @kickstartds/design-system typecheck`                                       | No type errors                                    |
| Website builds          | `pnpm --filter website build`                                                              | Unaffected — no old theme imports                 |
| Package size            | `du -sh packages/design-system/dist/`                                                      | Measurably smaller (no old fonts/logos/theme CSS) |
| No old theme refs       | `grep -r "token-business\|token-google\|token-ngo\|token-telekom" packages/design-system/` | Zero matches                                      |
| Variants still ship     | `ls packages/design-system/dist/tokens/branding-tokens-*.json`                             | 8 variant JSON files present                      |
| `tokensToCss.mjs` ships | `ls packages/design-system/dist/tokens/tokensToCss.mjs`                                    | File present (used by editor at runtime)          |

---

## 8. Risks & Mitigations

| Risk                                | Likelihood | Impact | Mitigation                                                                  |
| ----------------------------------- | ---------- | ------ | --------------------------------------------------------------------------- |
| Downstream package breaks           | Very Low   | High   | Cross-package analysis confirms zero external references (§3.1)             |
| Storybook fails to start            | Low        | Medium | Remove theme decorator cleanly; verify with `storybook dev`                 |
| Playroom theme picker breaks        | Low        | Low    | `themes` key with single export is valid; Playroom shows one option         |
| Build script glob mismatch          | Low        | Medium | `run-s build-tokens-*` won't match deleted scripts; simplify to direct call |
| BrandingSwitch references wrong CSS | Low        | Medium | Update file names from `branding-token-*` to `branding-tokens-*`            |

---

## 9. Future: CMS Theme Integration

The branding token infrastructure preserved in this cleanup is designed to integrate with **Storyblok `token-theme` stories** created by the design-tokens-editor:

### Current Runtime Flow (Website)

```
Storyblok token-theme story
  → tokens (JSON string) + css (CSS string)
  → website SSR fetches theme story
  → injects css field into <style data-tokens>
  → :root { --ks-brand-* } overrides default theme
```

### Future Storybook/Playroom Integration

The preserved `useTheme.ts` hook and `BrandingSwitch.tsx` component can be extended to:

1. **Fetch themes from Storyblok** — Load `token-theme` stories from the CMS at runtime
2. **Display in Storybook** — A decorator that loads the CSS from a selected CMS theme
3. **Display in Playroom** — Theme picker populated from CMS themes

This keeps the design system as the **single source of branding token infrastructure** while the actual theme definitions live in Storyblok, managed by the design-tokens-editor.
