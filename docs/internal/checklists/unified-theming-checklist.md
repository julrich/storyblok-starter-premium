# Unified W3C Theming — Implementation Checklist

**PRD:** [unified-theming-prd.md](../prd/unified-theming-prd.md)
**ADRs:** [adr-unified-theming.md](../../adr/adr-unified-theming.md)
**Started:** 2026-03-12

---

## Phase 1: Storyblok MCP Theme CRUD

> Unblocks all workflows. Adds `create_theme` and `update_theme` to the shared services and MCP.

- [x] **1.1** Add `CreateThemeResult` and `UpdateThemeResult` types to `storyblok-services/src/themes.ts`
- [x] **1.2** Add `createTheme()` function to `storyblok-services/src/themes.ts`
  - Accepts `name`, `tokens` (W3C object), `tokensToCss` callback, management client, space ID
  - Serializes tokens to JSON string, compiles CSS via `tokensToCss()`
  - Creates `token-theme` story at `settings/themes/{slug}` with auto-folder creation
  - Rejects if name resolves to protected slug (system theme guard)
  - Returns `{ success, storyId, slug, fullSlug }`
- [x] **1.3** Add `updateTheme()` function to `storyblok-services/src/themes.ts`
  - Accepts `slugOrUuid`, `tokens` (W3C object), `tokensToCss` callback, management client, space ID
  - Resolves theme story, rejects if `system: true`
  - Recompiles CSS, updates story
  - Returns `{ success, storyId, slug, previousTokens (summary), newTokens (summary) }`
- [x] **1.4** Add `isSystemTheme()` helper to `storyblok-services/src/themes.ts`
- [x] **1.5** Export new functions from `storyblok-services/src/index.ts`
- [x] **1.6** Add `createThemeOutputSchema` and `updateThemeOutputSchema` to `storyblok-mcp/src/output-schemas.ts`
- [x] **1.7** Add Zod input schemas for `create_theme` and `update_theme` to MCP schema definitions
- [x] **1.8** Add `create_theme` tool description and handler registration in `storyblok-mcp/src/register-tools.ts`
- [x] **1.9** Add `update_theme` tool description and handler registration in `storyblok-mcp/src/register-tools.ts`
- [x] **1.10** Implement `handleCreateTheme` and `handleUpdateTheme` handler functions
- [x] **1.11** Build and verify `storyblok-services` compiles
- [x] **1.12** Build and verify `storyblok-mcp` compiles

---

## Phase 2: Code-Managed Default Theme

> Syncs the Design System's default theme to Storyblok. Removes website-specific branding file.

- [x] **2.1** Add `system` boolean field to `packages/website/components/token-theme/token-theme.schema.json`
- [x] **2.2** Add system-theme guard to `updateTheme()` in `storyblok-services/src/themes.ts` (reject if `system: true`)
- [x] **2.3** Add system-theme guard to `delete_story` handler in Storyblok MCP (reject `token-theme` with `system: true`)
- [x] **2.4** Create `packages/website/scripts/syncDefaultTheme.ts`
  - Reads `packages/design-system/src/token/branding-tokens.json`
  - Validates against `branding-tokens.schema.json`
  - Compiles CSS via `tokensToCss()`
  - Upserts `settings/themes/default` with `system: true`
  - Skips with warning if `NEXT_STORYBLOK_OAUTH_TOKEN` is missing
  - Skips if content is identical (avoids unnecessary publishes)
- [x] **2.5** Add `sync-default-theme` script to `packages/website/package.json`
- [x] **2.6** Add `sync-default-theme` to the website `build` pipeline (after `build-tokens`, before `next build`)
- [x] **2.7** Update `fetchPageProps()` in `packages/website/helpers/storyblok.ts` to skip theme fetch when slug is `"default"`
- [ ] **2.8** Verify runtime behavior: pages with no theme / with `"default"` theme / with custom theme
- [ ] **2.9** Run `update-storyblok-config` to push the updated `token-theme` schema (with `system` field) to Storyblok

---

## Phase 3: Design Tokens MCP → W3C + Stateless

> Migrates all branding tools from flat format to W3C. Removes local file I/O.

- [x] **3.1** Add `flattenW3CTokens()` to `design-tokens-mcp/src/branding.ts`
  - Walks a W3C DTCG token tree, returns flattened path/value pairs
- [x] **3.2** Add `getW3CSchemaDescription()` to `design-tokens-mcp/src/branding.ts`
  - Returns field descriptions and valid ranges from `branding-tokens.schema.json`
- [x] **3.3** Add `validateW3CTokens()` to `design-tokens-mcp/src/branding.ts`
  - Validates a W3C token object against `branding-tokens.schema.json` (strict mode)
  - Returns pass/fail + field-level errors
- [x] **3.4** Remove `readBrandingJson()`, `writeBrandingJson()`, `setNestedValue()` from `branding.ts`
- [x] **3.5** Update `get_theme_config` handler → rename to `get_theme_schema`, return W3C schema description
- [x] **3.6** Update `list_theme_values` handler → accept W3C token object as input parameter (stateless)
- [x] **3.7** Update `generate_theme_from_image` handler → return W3C schema guidance instead of flat
- [x] **3.8** Update `extract_theme_from_css` handler → return W3C schema guidance instead of flat
- [x] **3.9** Remove `update_theme_config` handler entirely
- [x] **3.10** Add `validate_theme` tool (new handler)
- [x] **3.11** Update `tokens://branding` resource to return W3C schema reference
- [x] **3.12** Update `update-branding` prompt to describe W3C format and Storyblok MCP `create_theme`/`update_theme` workflow
- [x] **3.13** Delete `packages/design-tokens-mcp/tokens/branding-token.json`
- [x] **3.14** Update tool registration (add `validate_theme`, `get_theme_schema`; remove `update_theme_config`, `get_theme_config`)
- [x] **3.15** Build and verify `design-tokens-mcp` compiles

---

## Phase 4: Editor + n8n Alignment

> Refactors the Design Tokens Editor backend and n8n node to use shared `storyblok-services` theme functions.

### Design Tokens Editor

- [x] **4.1** Refactor `design-tokens-editor/src/server/storyblok.ts` to delegate CRUD to `storyblok-services`
  - `listThemes()` → shared `listThemes()`
  - `getTheme()` → shared `getTheme()`
  - `createTheme()` → shared `createTheme()`
  - `updateTheme()` → shared `updateTheme()`
  - `deleteTheme()` → keep local (shared lib doesn't have delete yet) or add to shared
- [x] **4.2** Add system-theme guard to Editor backend routes
  - `PUT /api/tokens/:name` → check `system` field → return 403
  - `DELETE /api/tokens/:name` → check `system` field → return 403
- [x] **4.3** Update Editor frontend: show lock icon on system themes, disable Save/Delete, keep "Save As"
- [x] **4.4** Build and verify `design-tokens-editor` compiles

### n8n Node

- [x] **4.5** Add `create` operation to Theme resource in n8n node description
- [x] **4.6** Add `update` operation to Theme resource in n8n node description
- [x] **4.7** Implement `executeCreateTheme()` execution function
- [x] **4.8** Implement `executeUpdateTheme()` execution function
- [x] **4.9** Add system-theme guard to `update` and `delete` theme operations
- [x] **4.10** Build and verify `storyblok-n8n` compiles

---

## Phase 5: Storybook Theme Switcher

> Adds a theme switcher toolbar to Storybook for previewing stories under any static or CMS-managed theme.

### Static Theme Setup

- [x] **5.1** Copy `src/token/branding-tokens*.css` to `static/tokens/` for production Storybook builds
- [x] **5.2** Add `copy-theme-css` script to `package.json` (copies branding CSS to `static/tokens/`)
- [x] **5.3** Integrate `copy-theme-css` into `storybook` and `build-storybook` scripts

### Manager-Side Theme Tool

- [x] **5.4** Create `.storybook/ThemeTool.tsx` — custom toolbar dropdown component
  - Dropdown with three groups: Default | CMS Themes (if available) | Static Themes
  - Uses `WithTooltip` + `TooltipLinkList` from `storybook/internal/components`
  - Fetches CMS themes from Storyblok CDN API on mount (runtime, if `STORYBLOK_API_TOKEN` is set)
  - Filters out `system: true` themes
  - Uses `useGlobals()` / `updateGlobals()` to set selected theme + CMS CSS content
- [x] **5.5** Update `.storybook/manager.ts` → `.storybook/manager.tsx` to register ThemeTool

### Preview-Side Decorator

- [x] **5.6** Add theme injection decorator to `.storybook/preview.tsx`
  - "default" → remove any override CSS
  - Static theme → inject `<link>` pointing to `/tokens/branding-tokens-{name}.css`
  - CMS theme → inject `<style>` with CSS from `globals.themeCss`
- [x] **5.7** Add `initialGlobals.theme = 'default'` to preview config

### Storybook Config

- [x] **5.8** Expose `STORYBLOK_API_TOKEN` env var in `.storybook/main.ts` via `viteFinal` define

### Story Updates

- [x] **5.9** Simplify `Header.stories.tsx` — remove per-story `globals.theme` logo lookup (decorator handles CSS globally)

### Verification

- [x] **5.10** Build and verify `design-system` compiles (`pnpm --filter @kickstartds/design-system build`)
- [x] **5.11** Verify `build-storybook` runs successfully

---

## Post-Implementation

- [x] **P.1** Update `copilot-instructions.md` to document new theme tools and workflows
- [x] **P.2** Update Storyblok MCP `theme-management` prompt in `prompts.ts` to include `create_theme` / `update_theme`
- [ ] **P.3** Verify end-to-end workflow: create theme → apply → preview → update → remove
- [x] **P.4** Run full build pipeline to verify no regressions
