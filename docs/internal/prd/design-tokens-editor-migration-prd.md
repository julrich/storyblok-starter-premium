# PRD: Design Tokens Editor — Netlify → Storyblok + Kamal Migration

**Status:** 📋 Draft
**Date:** 2026-03-07
**Related:** [design-token-theming-prd.md](design-token-theming-prd.md), [monorepo-integration-checklist.md](../checklists/monorepo-integration-checklist.md)
**Branch:** `feature/inline-more-projects`

---

## 1. Background & Problem Statement

### Current State

The Design Tokens Editor (`packages/design-tokens-editor/`) is a browser-based Vite SPA that provides a WYSIWYG interface for editing kickstartDS branding tokens. It is currently deployed on **Netlify** with deep platform-specific dependencies:

| Dependency             | Purpose                                                                      |
| ---------------------- | ---------------------------------------------------------------------------- |
| `@netlify/blobs`       | Serverless persistence — stores named token presets as JSON blobs            |
| `@netlify/functions`   | Serverless backend — CRUD API at `/api/tokens/:name`                         |
| `@netlify/vite-plugin` | Build integration — wires Functions + Blobs into the Vite dev/build pipeline |

The editor stores **token presets** (named JSON snapshots of ~62 branding token values) in Netlify Blobs and exposes them via a Netlify Function at `/api/tokens/`. The frontend uses `PresetContext` + `useFetch` hooks to list, load, save, and delete presets.

### Why Migrate

1. **Infrastructure consolidation** — Every other package in the monorepo deploys via Kamal/Docker to a single self-hosted server. Netlify is the sole outlier, adding billing surface, DNS management, and operational complexity.
2. **Data fragmentation** — Token presets live in Netlify Blobs, completely disconnected from the CMS where they are actually consumed. Editors must manually copy CSS from the editor into Storyblok's `token` text field.
3. **No content-type relationship** — Presets have no identity in Storyblok. There is no way to reference a preset from a page or global settings — editors paste raw CSS strings.
4. **Missing theme selection UX** — The `token` field in Storyblok is a plain text field. There is no dropdown, no validation, no preview. Editors must know the exact CSS syntax.

### Vision

Replace Netlify Blobs with **Storyblok as the persistence layer** for token themes. Each theme becomes a first-class Storyblok content type that can be:

- Created and edited in the Design Tokens Editor (which moves to Kamal/Docker)
- Selected from a **dropdown field plugin** on `page` and `settings` components
- Applied as a CSS token override at render time, the same way the existing `token` text field works today

The existing `token` text field remains available for manual CSS overrides (escape hatch for one-off per-page tweaks).

---

## 2. Goals & Non-Goals

### Goals

1. **New Storyblok content type `token-theme`** — stores the full branding token JSON config plus a human-readable name, with a generated CSS representation
2. **Storyblok field plugin `theme-selector`** — dropdown that lists available `token-theme` stories, usable on both `page` (local override) and `settings` (global default)
3. **Migrate editor backend from Netlify to Docker/Kamal** — replace Netlify Functions + Blobs with an Express server that reads/writes `token-theme` stories via the Storyblok Management API
4. **Keep the existing `token` text field** — for manual CSS custom property overrides (composable: theme selection + manual overrides both apply, manual overrides win)
5. **Preserve the editor UX** — the token editing experience (JSON Forms, live preview, toolbar) remains unchanged; only the persistence layer changes

### Non-Goals

- Redesigning the Design Tokens Editor UI (out of scope)
- Multi-space or multi-tenant theme sharing (presets remain per-space)
- Real-time collaborative editing of themes
- Automated migration of existing Netlify Blob presets (will be recreated manually)
- Replacing the Design Tokens MCP server (it continues to operate independently on token files)
- Netlify teardown / DNS migration (only the code is cleaned up; actual Netlify decommissioning is handled separately)

---

## 3. Architecture

### 3.1 New Content Type: `token-theme`

A new Storyblok component (content type), defined as a **custom JSON Schema in the website project** following the same pipeline as other CMS content types (like `settings.schema.json` in the design system, but as a downstream customization in `packages/website/`).

**Schema file:** `packages/website/components/token-theme/token-theme.schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "http://cms.mydesignsystem.com/token-theme.schema.json",
  "title": "Token Theme",
  "description": "A named branding token theme that can be selected on pages and global settings",
  "type": "object",
  "properties": {
    "name": {
      "title": "Theme Name",
      "description": "Human-readable name shown in the theme picker (e.g. 'Dark Mode', 'Brand Neon')",
      "type": "string"
    },
    "tokens": {
      "title": "Token Configuration (JSON)",
      "description": "Structured branding token JSON — managed by the Design Tokens Editor, do not edit manually",
      "type": "string",
      "format": "textarea"
    },
    "css": {
      "title": "Generated CSS",
      "description": "Auto-generated CSS custom properties — computed from tokens JSON on save, revalidated on deploy",
      "type": "string",
      "format": "textarea"
    }
  },
  "required": ["name"]
}
```

This schema runs through the existing `kickstartDS cms storyblok` pipeline:

1. Add `token-theme` to the `--templates` list in `create-storyblok-config` (root content type, not nestable)
2. `pnpm --filter website create-storyblok-config` → generates Storyblok component definition in `cms/components.123456.json`
3. `pnpm --filter website push-components` → syncs to Storyblok
4. `pnpm --filter website generate-content-types` → updates TypeScript types

**Data model:**

- `name` — Human-readable label for the theme picker dropdown
- `tokens` — The full branding token JSON as a `textarea` (same format as `branding-tokens.json`, validated against `branding-tokens.schema.validate.mjs`). CMS editors should never hand-edit this field.
- `css` — Pre-rendered CSS output (generated via `tokensToCss()` on save, revalidated on deploy to catch any `tokensToCss()` logic changes — hybrid approach)

**Folder convention:** All `token-theme` stories live under `settings/themes/` in Storyblok (the `settings/` folder already exists by convention for settings stories; themes are a subfolder within it). CDN API queries use `starts_with: "settings/themes/"`.

### 3.2 Field Plugin: `theme-selector`

A Storyblok field plugin that renders a dropdown listing all published `token-theme` stories. When a theme is selected, the field stores the story UUID as its value.

**Placement:**

| Component  | Field   | Behavior                                                 |
| ---------- | ------- | -------------------------------------------------------- |
| `settings` | `theme` | Global default — applies to all pages unless overridden  |
| `page`     | `theme` | Per-page override — takes precedence over global setting |

**Field plugin responsibilities:**

- Fetch `token-theme` stories from the CDN API (filtered by `content_type`, `starts_with: "settings/themes/"`)
- Render a searchable dropdown with theme names + primary color dot preview
- Store the selected theme's UUID as the field value
- Show a "None" option to clear the selection
- Authenticate via the space's API token available through the Storyblok field plugin SDK (CDN API, read-only — no Management API token needed)

**Reference implementation:** The existing `storyblok-icon-sprite-picker-field-plugin` (used for icon selection in hero, feature, contact-info) serves as a pattern for building this plugin.

### 3.3 Runtime Token Resolution

The existing `_app.tsx` token injection must be extended to resolve theme references:

```
Theme resolution priority (highest wins):
1. page.token       — manual CSS overrides (existing text field, unchanged)
2. page.theme       — selected token-theme story UUID → resolved to CSS
3. settings.token   — manual CSS overrides (existing text field, unchanged)
4. settings.theme   — global token-theme story UUID → resolved to CSS
5. (empty)          — design system defaults from branding-token.css
```

**Resolution flow:**

1. During `getStaticProps()` / `fetchPageProps()`, resolve theme UUIDs to their `css` field value (resolved per-page, inlined at build time for static export)
2. Combine: `themeCSS + manualTokenCSS` (manual overrides layer on top of the theme)
3. Inject via the existing `<style data-tokens>` mechanism
4. On theme story update, a standard Storyblok webhook triggers a full site rebuild (same deployment pipeline as all content changes — no special cross-reference tracking needed)

### 3.4 Editor Backend Migration

Replace Netlify Functions + Blobs with an Express server that proxies to the Storyblok Management API:

| Current (Netlify)          | New (Express + Storyblok API)                                     |
| -------------------------- | ----------------------------------------------------------------- |
| `GET /api/tokens/`         | List `token-theme` stories → return names                         |
| `GET /api/tokens/:name`    | Fetch `token-theme` story by slug → return `tokens` JSON          |
| `POST /api/tokens/:name`   | Create new `token-theme` story with name + tokens + generated CSS |
| `PUT /api/tokens/:name`    | Update existing `token-theme` story, regenerate CSS               |
| `DELETE /api/tokens/:name` | Delete `token-theme` story                                        |

The Express server runs inside the same Docker container as the Vite SPA (static files served by Express). Environment variables:

- `STORYBLOK_OAUTH_TOKEN` — Management API token (for write operations)
- `STORYBLOK_SPACE_ID` — Space identifier
- `STORYBLOK_API_TOKEN` — Preview/CDN token (for read operations)
- `DESIGN_TOKENS_EDITOR_PORT` — Server port (default: 8080)

### 3.5 Deployment

Follow the pattern established by `schema-layer-editor`:

- **Dockerfile**: Multi-stage build (build SPA + Express server, serve from production stage)
- **Kamal config**: `config/deploy-design-tokens-editor.yml` with subdomain on the shared server
- **Health check**: `/api/health` endpoint

---

## 4. Phased Implementation

### Phase 1 — Storyblok Content Type & Field Plugin

1. Create `packages/website/components/token-theme/token-theme.schema.json` (JSON Schema Draft-07)
2. Add `token-theme` to the `--templates` list in the `create-storyblok-config` script in `packages/website/package.json`
3. Run `pnpm --filter website create-storyblok-config` → generates Storyblok component definition
4. Push to Storyblok: `pnpm --filter website push-components`
5. Generate TypeScript types: `pnpm --filter website generate-content-types`
6. Build the `theme-selector` field plugin (Storyblok field plugin SDK, modeled after the existing icon-sprite-picker)
7. Add `theme` field to `settings` and `page` schemas using the new field plugin
8. Manually create 2–3 test themes under `settings/themes/` in Storyblok to validate

### Phase 2 — Website Runtime Integration

1. Extend `fetchPageProps()` to resolve `theme` UUIDs → CSS strings (inlined at build time via `getStaticProps`)
2. Update `_app.tsx` token resolution to layer theme CSS + manual token CSS
3. Update `_document.tsx` font detection to also parse theme CSS for Google Fonts references
4. No special ISR/caching needed — theme story changes trigger a standard full rebuild via Storyblok webhook

### Phase 3 — Editor Backend Migration

1. Create Express server (`src/server/`) with Storyblok Management API integration
2. Keep the same `/api/tokens/` route interface for frontend compatibility
3. Add `tokensToCss()` call on every write to populate the `css` field
4. Add JSON Schema validation on write (existing `branding-tokens.schema.validate.mjs`)
5. Create Dockerfile (multi-stage: Vite build + Express production server)
6. Create `config/deploy-design-tokens-editor.yml`
7. Update DNS for the editor subdomain

### Phase 4 — Cleanup & Documentation

1. Remove Netlify dependencies (`@netlify/blobs`, `@netlify/functions`, `@netlify/vite-plugin`)
2. Remove `netlify.toml`, `netlify/functions/` directory
3. Remove `private: true` marker if the editor should be publishable (or keep it)
4. Update `copilot-instructions.md` (remove "stays on Netlify" note)
5. Update `monorepo-integration-checklist.md`
6. Existing presets will be recreated manually as `token-theme` stories under `settings/themes/`

### Phase 5 — MCP & n8n Integration

1. Add `list_themes` / `apply_theme` tools to the Storyblok MCP server, operating on `token-theme` stories
2. Update the [design-token-theming-prd.md](design-token-theming-prd.md) tools (`apply_theme`, `read_theme`) to target `token-theme` stories
3. Add corresponding n8n node operations for theme CRUD and application

---

## 5. Resolved Decisions

The following questions were raised during drafting and have been resolved:

| #   | Question                      | Decision                                                                                                     |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 1   | Token storage field type      | `textarea` — CMS editors should never hand-edit this field; the Design Tokens Editor manages the format      |
| 2   | CSS computation timing        | Hybrid — pre-compute on save via `tokensToCss()`, revalidate on deploy to catch logic changes                |
| 3   | Theme story folder            | `settings/themes/` — `settings/` already exists by convention; themes are a subfolder                        |
| 4   | Theme reference field type    | Custom field plugin (like the existing icon-sprite-picker), not a static datasource                          |
| 5   | Visual Editor integration     | Theme selection works through the Visual Editor's standard live preview mechanism (field change → re-render) |
| 6   | Theme CSS resolution          | Inlined at build time via `getStaticProps` — pages are exported as static HTML                               |
| 7   | Theme update propagation      | Standard Storyblok webhook triggers a full site rebuild (no special cross-reference tracking)                |
| 8   | Theme CSS caching             | Resolved per-page (not cached in settings fetch)                                                             |
| 9   | Field plugin auth             | CDN API via Storyblok field plugin SDK — no Management API token needed                                      |
| 10  | Preview swatch in dropdown    | Theme name + primary color dot (compromise — no full preview)                                                |
| 11  | Field plugin vs datasource    | Proper custom field plugin — datasources don't auto-update                                                   |
| 12  | Transition period             | No transition — immediately remove Netlify from code; actual data migration done separately                  |
| 13  | Preset migration              | Manual recreation as `token-theme` stories                                                                   |
| 14  | Preview entry point           | Remains fully static — no Express backend needed for preview-only mode                                       |
| 15  | Design Tokens MCP integration | Updated to target `token-theme` stories                                                                      |
| 16  | Storyblok MCP tools           | Yes — `list_themes` / `apply_theme` tools operating on `token-theme` stories                                 |
| 17  | n8n node integration          | Yes — corresponding operations for theme CRUD and application                                                |

---

## 6. Potential Hurdles

### Technical

- **`tokensToCss()` dependency resolution** — The function currently imports from `@kickstartds/design-system/tokens/tokensToCss.mjs`, which uses the `traverse` package. The Express server needs this available at runtime. Bundling strategy (esbuild/rollup for the server) must handle this correctly.

- **Storyblok field plugin development environment** — Field plugins are built with the `@storyblok/field-plugin` SDK and deployed to Storyblok's partner portal or as a custom field plugin. The build/deploy pipeline for field plugins is separate from the monorepo's Kamal deployment. This adds a new deployment surface.

- **Visual Editor live preview for theme changes** — The theme dropdown stores a UUID, not CSS. The preview iframe needs to resolve the UUID to CSS on field change. Since the Visual Editor re-renders on any field change, this should work through the standard mechanism — but the resolution step (UUID → fetch theme story → extract CSS) adds latency compared to the existing `token` text field.

- **Google Fonts detection** — `_document.tsx` currently extracts font family names from token CSS via regex to inject Google Fonts `<link>` tags. Theme CSS must go through the same detection. If themes reference fonts not loaded by default, they must be included in the initial page load (or loaded dynamically with FOUT implications).

- **JSON Schema pipeline for root content types** — The `token-theme` schema needs to be registered as a `--templates` entry (root content type) in `create-storyblok-config`, not as a `--components` entry. This is the same pattern as `settings`, `page`, etc. The schema must use the `http://cms.mydesignsystem.com/` `$id` domain.

### UX & Workflow

- **Mental model shift** — Editors currently think of the `token` field as "paste CSS here." Introducing a theme dropdown alongside the existing text field requires clear UX guidance: _"Select a theme for the base look, use the token field for specific overrides."_

- **Theme discoverability** — Themes in `settings/themes/` might be hard to find for editors unfamiliar with the structure. The field plugin abstracts this away, but creating new themes still requires navigating to the folder (or using the editor app).

- **Secret management** — The editor backend needs Storyblok API tokens. These must be added to `.kamal/secrets` and the deploy config. The tokens are the same ones used by the website and MCP server, so no new credentials are needed — just new env var mappings.

---

## 7. Success Criteria

1. Token presets are stored as `token-theme` Storyblok stories with JSON config + pre-rendered CSS
2. The `theme-selector` field plugin is available on both `settings` and `page` components
3. Selecting a theme in the CMS immediately applies it in the Visual Editor preview
4. The Design Tokens Editor deploys via Kamal/Docker alongside other monorepo packages
5. Netlify dependencies are fully removed from `packages/design-tokens-editor/`
6. The existing `token` text field continues to work for manual CSS overrides
7. Theme CSS + manual token CSS compose correctly (manual overrides layer on top of theme)

---

## 8. Out-of-Scope / Future Work

- **Theme versioning** — tracking changes to a theme over time (Storyblok's version history handles this implicitly)
- **Theme marketplace** — sharing themes across Storyblok spaces
- **Dark/light mode toggle** — runtime theme switching (would require additional infrastructure beyond static CSS injection)
- **Component-level token overrides** — per-section or per-component theming (the `token` field is page/global scoped)
- **Automated visual regression testing** — validating theme changes against screenshots
