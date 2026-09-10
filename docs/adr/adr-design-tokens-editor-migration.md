# ADR: Design Tokens Editor Migration — Netlify → Storyblok + Kamal

**Status:** Accepted
**Date:** 2026-03-08
**Related PRD:** [design-tokens-editor-migration-prd.md](../internal/prd/design-tokens-editor-migration-prd.md)
**Checklist:** [design-tokens-editor-migration-checklist.md](../internal/checklists/design-tokens-editor-migration-checklist.md)

---

## ADR-DTE-001: Store Token Themes as Storyblok Content Type (not filesystem)

**Context:** The editor needs persistent storage for token presets. Options: (a) local filesystem in a Docker volume, (b) SQLite/PostgreSQL, (c) Storyblok stories.

**Decision:** Store themes as `token-theme` Storyblok stories. The CMS is the natural home for content that drives site rendering. This eliminates data fragmentation (presets lived in Netlify Blobs, disconnected from the CMS) and enables referencing themes from pages/settings via UUID.

**Consequences:**

- The editor backend becomes a thin proxy to the Storyblok Management API — stateless, no volume mounts needed
- Theme CRUD is subject to Storyblok API rate limits (6 req/s Management, higher CDN) — acceptable for infrequent theme editing
- Editor and website share a single point of failure (Storyblok) — accepted; themes are resolved at build time so published pages aren't affected by Storyblok outages

---

## ADR-DTE-002: JSON Schema in Website Project (not Design System)

**Context:** The `token-theme` content type needs a JSON Schema definition. It could live in the design system (`packages/design-system/src/components/cms/`) like `settings.schema.json`, or in the website project (`packages/website/components/`).

**Decision:** Place the schema at `packages/website/components/token-theme/token-theme.schema.json`. Token themes are a CMS integration concern specific to the Storyblok website project, not a reusable design system primitive. Other website-specific content types (prompter, info-table) follow this same pattern. The schema uses `$id: "http://cms.mydesignsystem.com/token-theme.schema.json"` and is registered as a `--templates` entry (root content type) in `create-storyblok-config`.

**Consequences:**

- Schema runs through the existing `kickstartDS cms storyblok` pipeline — no new tooling
- Other downstream projects consuming the design system don't inherit the `token-theme` type
- Must be added to both `--templates` list and rebuilds require the website package

---

## ADR-DTE-003: Hybrid CSS Computation (Pre-compute + Revalidate)

**Context:** Theme CSS can be computed on save (fast reads, stale if `tokensToCss()` changes), on read (always fresh, slower), or hybrid.

**Decision:** Hybrid approach — pre-compute `css` field via `tokensToCss()` on every save (POST/PUT), and revalidate on deploy. The editor backend always writes both `tokens` (JSON) and `css` (generated CSS) to the `token-theme` story. A deploy-time step can regenerate CSS for all themes if the conversion logic has changed.

**Consequences:**

- Build-time reads are fast (CSS is already materialized in the story)
- If `tokensToCss()` logic changes, a one-time revalidation pass is needed (script or MCP tool)
- The `css` field is a derived artifact — it should never be hand-edited

---

## ADR-DTE-004: Custom Field Plugin over Datasource

**Context:** The `theme` field on `settings` and `page` needs to reference a `token-theme` story. Options: (a) Storyblok datasource (static key-value list), (b) custom field plugin.

**Decision:** Custom field plugin (`theme-selector`). Storyblok datasources are static — they don't auto-update when new `token-theme` stories are created/deleted. A field plugin can dynamically query the CDN API at render time, always showing the current list of published themes.

**Consequences:**

- Field plugin is a separate deployment artifact (Storyblok partner portal or custom plugin)
- The existing `storyblok-icon-sprite-picker-field-plugin` serves as a reference implementation
- No sync step needed between themes and a datasource

---

## ADR-DTE-005: Theme Folder Convention `settings/themes/`

**Context:** `token-theme` stories need a home in Storyblok's content tree. Options: (a) top-level `/themes/`, (b) `settings/themes/`, (c) separate space.

**Decision:** `settings/themes/`. The `settings/` folder already exists by convention for settings stories. Themes are a sub-category of global configuration. CDN API queries filter with `starts_with: "settings/themes/"`.

**Consequences:**

- Editors creating themes navigate to a subfolder — the field plugin abstracts this for theme selection
- The `settings/` folder may need permissions review if editors shouldn't create arbitrary settings stories

---

## ADR-DTE-006: Static Build-Time Theme Resolution

**Context:** Pages need theme CSS at render time. Options: (a) inline at build via `getStaticProps`, (b) resolve at request time via API route, (c) ISR with revalidation webhooks.

**Decision:** Inline at build time via `getStaticProps`. Pages are exported as static HTML. Theme CSS is resolved per-page during the build: `fetchPageProps()` resolves theme UUIDs to CSS strings, which are inlined into the page. Theme story updates trigger a full site rebuild via the existing Storyblok webhook.

**Consequences:**

- No runtime Storyblok dependency for published pages
- Theme changes require a full rebuild (same as any content change — acceptable since we always rebuild everything)
- No N+1 API call concern at request time

---

## ADR-DTE-007: Keep `token` Text Field Alongside Theme Dropdown

**Context:** The existing `token` text field on `settings` and `page` stores raw CSS custom property overrides. Should it be replaced by the theme dropdown?

**Decision:** Keep both. The theme dropdown (`theme` field) selects a pre-configured theme. The text field (`token` field) allows manual CSS overrides that layer on top. Priority: `page.token` > `page.theme` > `settings.token` > `settings.theme` > defaults. Both CSS strings are concatenated, with manual overrides appearing after theme CSS (so they win in specificity).

**Consequences:**

- Editors have an escape hatch for one-off tweaks without creating a full theme
- UX guidance needed: "Select a theme for the base look, use the token field for specific overrides"
- Two fields on the same component require clear labeling and field group ordering

---

## ADR-DTE-008: Immediate Netlify Code Removal (No Transition Period)

**Context:** During migration, the editor could be deployed on both Netlify and Kamal simultaneously, or Netlify code could be removed immediately.

**Decision:** Immediately remove all Netlify code from the repository. The actual Netlify deployment (DNS, project) is decommissioned separately. Existing presets in Netlify Blobs will be recreated manually as `token-theme` stories.

**Consequences:**

- Clean codebase — no dual-deployment complexity
- There will be a gap where the editor is not deployed until the Kamal deployment is set up
- Only a handful of presets exist — manual recreation is trivial

---

## ADR-DTE-009: Express Server in Same Container as SPA

**Context:** The editor needs both a static SPA and an API backend. Options: (a) separate containers for SPA and API, (b) single container with Express serving both, (c) Vite dev server proxy in dev + Express in production.

**Decision:** Single container with Express serving both the API routes (`/api/tokens/*`, `/api/health`) and static SPA files. In development, Vite's dev server proxies API requests to a local Express instance.

**Consequences:**

- Simple deployment — one Docker image, one Kamal service
- Express adds a runtime dependency but it's lightweight
- The `preview.html` entry point remains fully static (no backend needed for preview-only mode)
