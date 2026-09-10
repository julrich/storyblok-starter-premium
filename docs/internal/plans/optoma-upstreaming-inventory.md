# Optoma → Template Upstreaming Inventory

> **Goal:** Port the _generic_ improvements made in the `optoma-website` fork back into this
> template repo (`ruhmesmeile-storyblok-starter`), while excluding everything that is specific to
> the Optoma client project.
>
> **Status:** Inventory / planning. No code ported yet.

## Method

- Fork point (merge-base) of the two histories: `6e67004a` (_"fix: align preview and build versions
  of page fetching"_).
- Optoma tip analyzed: `optoma/main` @ `b24f30ed` (_"fix: hero spotlight features"_).
- Divergence surface: **858 files** changed (`244 A`, `510 M`, `89 D`, plus a handful of renames).
- Regenerate the raw data anytime with:

  ```bash
  git diff --name-status 6e67004a optoma/main   # per-file A/M/D
  git diff --stat        6e67004a optoma/main   # line churn
  ```

Every path below is bucketed into one of three categories:

| Legend         | Meaning                                                                        |
| -------------- | ------------------------------------------------------------------------------ |
| ✅ **GENERIC** | Reusable improvement — upstream it (strip any brand values first).             |
| ⛔ **OPTOMA**  | Client-specific — never upstream.                                              |
| 🔍 **REVIEW**  | Mixed / decision needed — cherry-pick hunks, keep structure, drop client bits. |

---

## Summary by area

| Area                                                                                                                                         | Files | Category | Notes                                                                              |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ----: | -------- | ---------------------------------------------------------------------------------- |
| `packages/design-system/src/components/**` (~44 dirs)                                                                                        |   101 | ✅ / 🔍  | Component fixes = generic; per-component `_*-tokens.scss` **values** may be brand. |
| `packages/design-system/scripts/**`                                                                                                          |     6 | ✅       | Token tooling (`tokensToCss`, `componentTokensToCss`, catalog extractors).         |
| `packages/design-system/src/token/*catalog*.json`, `token-graph.json`                                                                        |     3 | ✅       | Generated catalogs supporting new tooling.                                         |
| `packages/design-system/src/token/branding-tokens.*`, `fonts.css`, `_fonts.scss`, `token-dsa/typo.json`, `themes/index.ts`                   |     6 | ⛔ / 🔍  | Structure may be generic, **values are Optoma brand**.                             |
| `packages/design-system/static/img/optoma/**`                                                                                                |    55 | ⛔       | Client imagery.                                                                    |
| `packages/design-system/static/{fonts,favicon,logo*}`                                                                                        |   ~34 | ⛔       | Brand fonts (HelveticaNeue) + logos/favicons.                                      |
| `packages/design-system/static/img/screenshots/**`                                                                                           |   157 | ⚠️       | **Regenerate locally** — do NOT copy (LFS).                                        |
| `packages/design-system/__snapshots__/**`                                                                                                    |   157 | ⚠️       | **Regenerate locally** — do NOT copy (LFS).                                        |
| `packages/token-graph/**` (new package)                                                                                                      |    18 | ✅       | "Cosmos Token Graph" feature. Has ADR + PRD.                                       |
| `packages/design-tokens-editor/src/{component-editor,graph,preview-page}/**`                                                                 |    21 | ✅       | "Component Token Editor" feature. Has ADR + PRD.                                   |
| `packages/design-tokens-mcp/**`                                                                                                              |     4 | ✅ / 🔍  | Tooling for token features.                                                        |
| `packages/storyblok-{services,mcp}/**`                                                                                                       |     6 | 🔍       | Review individual hunks.                                                           |
| `packages/storyblok-icon-sprite-picker-field-plugin/**`                                                                                      |     2 | ✅       | Existing generic plugin.                                                           |
| `packages/storyblok-sharepoint-folder-picker-field-plugin/**` (new package)                                                                  |    11 | 🔍       | Reusable plugin, but SharePoint = enterprise integration.                          |
| `packages/umami-analytics/**`                                                                                                                |     3 | ⛔       | Env/config.                                                                        |
| `packages/website/cms/optoma/**`                                                                                                             |    31 | ⛔       | Client CMS schema overrides.                                                       |
| `packages/website/cms/{language,visibility}/**`                                                                                              |    59 | 🔍       | i18n + visibility system — likely generic infra.                                   |
| `packages/website/public/products/**`, `public/blurhashes/**`                                                                                |   ~51 | ⛔       | Product data + generated blurhashes.                                               |
| `packages/website/helpers/netsuite/**`                                                                                                       |     8 | ⛔       | NetSuite product ingest.                                                           |
| `packages/website/helpers/sharepoint.ts`, `pages/api/sharepoint/**`                                                                          |     2 | 🔍       | Paired with SharePoint plugin.                                                     |
| `packages/website/components/{datasheet,spec-group,download-category,downloads}/**`                                                          |   ~14 | 🔍       | Product datasheet/spec/download features.                                          |
| `packages/website/components/book-a-demo/**`                                                                                                 |     3 | ✅       | **PORTED Batch I** — brand-neutral component (+ `index.scss` `@use`); wiring → L.  |
| `packages/website/components/{ProductDetail,cms/product-detail*}`, `pages/products/**`, `scripts/ingest-*`                                   |    ~8 | ⛔       | Product catalog.                                                                   |
| `packages/website/components/{settings,token-theme,HeaderButtonContext,SettingsContext}`                                                     |    ~6 | 🔍       | Infra contexts — likely generic.                                                   |
| `patches/{unpic,kickstartds canary}.patch`, `pnpm-lock.yaml`, `package.json`                                                                 |     4 | ✅       | Dependency/patch updates.                                                          |
| Root infra: `.circleci`, `.dockerignore`, `.kamal/secrets`, `config/deploy-*.yml`, `.vscode/settings.json`, `.env*`, `.cms-storyblokrc.json` |   ~10 | ⛔ / 🔍  | Client infra & secrets.                                                            |
| `docs/{adr,internal}/**`                                                                                                                     |    14 | ✅ / 🔍  | Keep generic feature docs; drop product-specific plans.                            |

---

## ✅ GENERIC — upstream these (batched)

### Batch A — Build & token tooling

- `packages/design-system/scripts/tokensToCss.mjs` + `tokensToCss.d.mts`
- `packages/design-system/scripts/componentTokensToCss.mjs` + `componentTokensToCss.d.mts`
- `packages/design-system/scripts/extractComponentTokenCatalog.cjs`
- `packages/design-system/scripts/extractSemanticTokenCatalog.cjs`
- `packages/design-system/src/scss.d.ts`
- `packages/design-system/src/token/component-token-catalog.json`
- `packages/design-system/src/token/semantic-token-catalog.json`
- `packages/design-system/src/token/token-graph.json`
- `packages/design-system/rollup.config.mjs` _(review hunks — may reference brand assets)_
- `packages/design-system/.storybook/*` _(review — may carry brand head/preview tweaks)_

### Batch B — New feature: Cosmos Token Graph

- `packages/token-graph/**` (entire new package, 18 files)
- `docs/adr/adr-cosmos-token-graph.md`
- `docs/internal/prd/cosmos-token-graph-prd.md`
- `docs/internal/checklists/cosmos-token-graph-checklist.md`

### Batch C — New feature: Component Token Editor

- `packages/design-tokens-editor/src/component-editor/**` (5 files)
- `packages/design-tokens-editor/src/graph/GraphView.tsx`
- `packages/design-tokens-editor/src/preview-page/ComponentPreviewPage.tsx`
- remaining `packages/design-tokens-editor/**` diffs _(review)_
- `packages/design-tokens-mcp/**` _(review — supporting tooling)_
- `docs/adr/adr-component-token-editor.md`
- `docs/internal/prd/component-token-editor-prd.md`
- `docs/internal/checklists/component-token-editor-checklist.md`

### Batch D — Design-system component fixes

Component dirs touched (port `*.tsx` / `*.scss` / `*.schema.json`; **skip brand token _values_**):

`blog-aside blog-author blog-head blog-teaser breadcrumb business-card button cms contact
content-nav cta downloads event-filter event-header event-latest event-latest-teaser
event-list-teaser event-location event-registration faq feature features footer gallery header
headline hero html image-story image-text lightbox logos mosaic pagination search-filter
search-result section seo slider split-even split-weighted stats teaser-card testimonials text
video-curtain`

Notable additions here that are clearly generic:

- `packages/design-system/src/components/seo/SeoComponent.tsx`
- `packages/design-system/src/components/gallery/Gallery.client.js`

### Batch E — Dependency & patch updates

- `patches/unpic@3.22.0.patch`
- `patches/kickstartds@3.5.0--canary.62.324.0.patch`
- corresponding `package.json` `patchedDependencies` entries
- `pnpm-lock.yaml` deltas (regenerate via `pnpm install` after the above)

### Batch F — Generic plugins/tooling

- `packages/storyblok-icon-sprite-picker-field-plugin/**`
- `packages/storyblok-mcp/**`, `packages/storyblok-services/**` _(review each hunk)_

### Batch G — Editor / infra config _(decided 2026-07-22, ADR-011; ✅ PORTED 2026-07-22)_

- `packages/design-system/.storybook/preview.tsx` — `a11y: { test: "off" }` toggle (R.10)
- `.vscode/settings.json` — watcher/search/explorer excludes (R.9 partial)
- `docs/internal/plans/hero-slider-workflow-improvements.md` — generic MCP/tooling feedback, no brand content (R.9 partial; historical banner added)
- _R.5 settings/token-theme/contexts **re-scoped → Batch L** (wiring entanglement); no changeset (zero published-package impact)._

### Batch H — visibility generator script _(decided 2026-07-22, ADR-011; ✅ PORTED 2026-07-22)_

> **Scope correction:** `cms/language/**` (37) and `cms/visibility/**` (37) are **already on `main`**
> (added at the mono-repo move, predate the fork base; optoma _deleted_ them in favour of the brand
> layer `cms/optoma/**`). Nothing to port there. The only new generic artifact is the generator script.

- `packages/website/scripts/generateVisibilityFromPatterns.ts` (744 lines; `fs`/`path` only, `mydesignsystem.com` placeholder IDs) (R.7)
  — de-branded `--layer` default `"optoma"` → `visibility` (the file's only brand refs)
  — not wired into package.json (run via `npx tsx`); no changeset (website is changeset-`ignore`d)

### Batch I — book-a-demo _(decided 2026-07-22, ADR-011; DONE 2026-07-22)_

- ✅ `packages/website/components/book-a-demo/**` (3: `BookADemoComponent.tsx` + `book-a-demo.scss` + `book-a-demo-tokens.scss`) + `packages/website/index.scss` `@use` (R.4)
  — all 3 files are insertions (verified diff direction, ADR-012); no story/schema (website component, not a Storyblok blok / no Storybook); default label `"Book a Demo"` already generic → nothing to de-brand
  — functional render wiring (`_app.tsx` `<BookADemo>` + `settings`/`page` props) is settings-driven → **deferred to Batch L**; no changeset (website is changeset-`ignore`d)

### Batch J — Footer redesign ✅ _(done 2026-07-22, ADR-014; deferred from Batch D)_

- `packages/design-system/src/components/footer/**` — ported the redesign and went further per ADR-014: upstreamed the website footer's generic _rendering_ into the DS. Schema migrated (removed `byline` + `navItems`; added `navGroups`, `copyright`, `legalLink`, `socialLinks`). `socialLinks` redesigned icon-driven (`{icon,url,ariaLabel}`, mirrors `ContactComponent`) instead of optoma's `platform` enum — reuses the icon sprite, no new logo assets. Rewrote component + `footer.scss`/`_footer-tokens.scss` (grid columns, social row, bottom bar) + brand-neutral story. `FooterProps.ts` regenerated (tracked); `component-token-catalog.json` updated. `build` (presets 137) + `build-storybook` green. Changeset = `@kickstartds/design-system` minor (documents breaking `navItems`→`navGroups`). (R.11)
- Website-level `packages/website/components/footer/FooterComponent.tsx` (`CustomFooter`) + `footer.scss` + `ComponentProviders` wiring **deferred to Batch L** — coupled to `LanguageContext` EN/DE switcher; the DS now covers all generic rendering, so the website override should shrink to just the language switcher (R.8 subset)

### Batch K — SharePoint integration ✅ _(no-op — infra already on main; product-downloads excluded, ADR-015)_

- **Collapsed like Batch H** via diff-direction check (ADR-012). The folder-picker plugin (`packages/storyblok-sharepoint-folder-picker-field-plugin/**`, 11 files incl. `dist/`), `pages/api/sharepoint/token.ts`, the generic `helpers/sharepoint.ts` base, and all 3 folder-picker docs are **byte-identical** on `main` and optoma — already ported. (R.1)
- The only diff is `helpers/sharepoint.ts` (+544/−24) = the **excluded "Convention-based product downloads" feature** (`resolveProductRoot`/`SHAREPOINT_PRODUCT_ROOT_PATH`, `buildSkuIndex`/SKU folders, `buildDownloadCategoryBlok`/`mergeDownloadCategories`/`matchMaskedSku`). The generic `resolveSharePointFolders` export is identical on both sides. ⛔ **EXCLUDED** — nothing ported; zero code change (docs-only recording).

### Batch L — settings/i18n wiring + R.8 remaining website component diffs ✅ _(done 2026-07-22, ADR-016; final batch)_

- **PORTED** (20 brand-clean website files): `settings/**` (`headerButton`/`bookDemoButton` + regen `SettingsProps`), `page.schema.json` `hideBookDemoButton` + regen `PageProps`, `SettingsContext.tsx`, `HeaderButtonContext.tsx`, `LanguageContext` `AlternatesProvider`, `Meta` hreflang/x-default, `_app.tsx` lang-aware breadcrumbs/href + `<BookADemo>`/header-CTA wiring, `ComponentProviders` `NavMainWithCta` (EN/DE switcher + header CTA) + Hero focal-point injection + image quality filter, `section` `anchorId`→`id`, header `z-index` token, umami gallery exclusion, prompter `useEffect` dep fix, removed unused `TeaserProvider`
- ⛔ **EXCLUDED:** `product-detail` hero guard (`_app.tsx`), `CustomFooter`/`FooterProvider` (DS footer renders — ADR-014), `SectionProps` local-`downloads` re-point (product-coupled), `TimelineProps` union entry (Timeline demo removed in PR #16)
- **No DS change / no changeset** — Hero `--dsa-hero-focus-position` + `--dsa-header--z-index` already on `main`; all changed files in the changeset-`ignore`d `website` package. Generated `Page`/`Settings`Props sourced from `optoma/main` (local regeneration diverged destructively — ADR-016 §4). PR #17 → `main` `212ae2d1..8954c7d8`

---

## ⛔ OPTOMA-SPECIFIC — never upstream

- **Imagery:** `packages/design-system/static/img/optoma/**` (55), `logo.svg`, `logo-inverted.svg`,
  `logo-dark.svg`, `favicon*`, `static/favicon/**`.
- **Brand fonts:** `packages/design-system/static/fonts/HelveticaNeue-*`.
- **Brand token values:** `branding-tokens.css`, `branding-tokens.json`, `fonts.css`, `_fonts.scss`,
  `token-dsa/dictionary/typo.json` (upstream the _structure_ only if needed, never the values).
- **Client CMS schema:** `packages/website/cms/optoma/**` (31).
- **Product catalog:** `packages/website/public/products/**`, `pages/products/**`,
  `components/ProductDetail.tsx`, `components/cms/product-detail.schema.json` + `ProductDetailProps.ts`,
  `scripts/ingest-products*.ts`, `scripts/ingest-products-csv.ts`.
- **Product datasheet/spec/downloads** _(decided 2026-07-22, ADR-011):_
  `packages/website/components/datasheet/**` (PDF generation + `datasheet-pdf-plan.md`),
  `components/spec-group/**`, `components/download-category/**`, `components/downloads/**` —
  product-wired, not generic.
- **Content ingest:** `packages/website/helpers/ingest-template.ts` _(decided 2026-07-22, ADR-011)._
- **NetSuite integration:** `packages/website/helpers/netsuite/**` (8).
- **Generated content:** `packages/website/public/blurhashes/**` (47).
- **Analytics/config:** `packages/umami-analytics/{.env,.env.local.example}`, `config/deploy-*.yml`,
  `.kamal/secrets`, `.circleci/config.yml`, `.dockerignore`, `.cms-storyblokrc.json`,
  `packages/website/.env.local.sample`.

## ⚠️ SPECIAL HANDLING — regenerate, never copy

- `packages/design-system/__snapshots__/**` (157) and `packages/design-system/static/img/screenshots/**`
  (157) are **Git LFS** artifacts. Copying Optoma's blobs is exactly what caused the LFS `404`
  during the merge (their OIDs don't exist on this repo's LFS server). After porting component
  changes, **regenerate** them here:

  ```bash
  pnpm --filter @kickstartds/design-system build-storybook
  pnpm --filter @kickstartds/design-system create-component-previews
  ```

  Then commit the updated `__snapshots__/` + `static/img/screenshots/` (via LFS).

---

## 🔍 REVIEW — dispositions decided 2026-07-22 (ADR-011)

| Item                                                                                                | Files | Decision               | Target batch / notes                                                                                                                                    |
| --------------------------------------------------------------------------------------------------- | ----: | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SharePoint folder-picker plugin + `helpers/sharepoint.ts` + `api/sharepoint/**` + ADR/PRD/checklist |   ~15 | ✅ **DONE (no-op)**    | **Batch K** — plugin/api/generic helper/docs already on `main` (identical). Only delta = excluded product-downloads feature (ADR-015).                  |
| `datasheet/**` (PDF generation) + `datasheet-pdf-plan.md`                                           |    ~7 | ⛔ **EXCLUDE**         | Optoma-specific (product datasheet PDFs).                                                                                                               |
| `spec-group/**`, `download-category/**`, `downloads/**`                                             |    ~8 | ⛔ **EXCLUDE**         | Optoma-specific (product spec/download tables).                                                                                                         |
| `book-a-demo/**`                                                                                    |     3 | ✅ **DONE**            | **Batch I** — 3 files + `index.scss` `@use`; no story (website component); wiring → L.                                                                  |
| `settings/**`, `token-theme/**`, `SettingsContext.tsx`, `HeaderButtonContext.tsx`                   |    ~6 | ✅ **DONE**            | **Batch L** — ported with settings/i18n wiring (ADR-016).                                                                                               |
| `cms/language/**` (37) + i18n wiring                                                                |    37 | ✅ **ALREADY ON MAIN** | Predates fork; optoma deleted it. **Nothing to port** (Batch H).                                                                                        |
| `cms/visibility/**` (37, already on main) + `scripts/generateVisibilityFromPatterns.ts` (new)       |     1 | ✅ **PORT**            | **Batch H**. Only the generator script is new. De-brand `--layer` default → `visibility`.                                                               |
| `website/components/{header,footer,page,section,timeline,prompter}` root diffs                      |   ~10 | ✅ **DONE**            | **Batch L** — generic hunks ported (ADR-016); footer = DS (ADR-014), `product-detail` guard + Timeline union excluded, Timeline demo removed in PR #16. |
| `.vscode/settings.json`                                                                             |     1 | ✅ **PORT**            | **Batch G**. Watcher/search/explorer excludes (inotify perf).                                                                                           |
| `helpers/ingest-template.ts`                                                                        |     1 | ⛔ **EXCLUDE**         | Optoma-specific content ingest helper.                                                                                                                  |
| `docs/internal/plans/hero-slider-workflow-improvements.md`                                          |     1 | ✅ **PORT**            | **Batch G**. Generic MCP/tooling feedback, no brand content; mark historical.                                                                           |
| Design-system `components/footer/**` redesign (`navItems` → `navGroups`)                            |     4 | ✅ **DONE**            | **Batch J** — ported + went further (ADR-014): upstreamed website footer rendering into DS; `socialLinks` icon-driven; lang switcher → L.               |

---

## Suggested execution sequence

1. **Batch A** (tooling) → prerequisite for token catalogs/graph.
2. **Batch E** (deps/patches) → `pnpm install` clean baseline.
3. **Batch D** (component fixes) → then regenerate LFS snapshots/screenshots.
4. **Batch B** (token-graph) and **Batch C** (component-token-editor) → independent features.
5. **Batch F** (plugins/MCP) → review hunks.
6. **Batch G** ✅ _done_ (editor/infra config: a11y toggle, `.vscode/settings.json`, hero-slider doc; R.5 re-scoped to L).
7. **Batch H** ✅ _done_ (visibility generator script only — `cms/language`/`cms/visibility` already on main; `--layer` default de-branded → `visibility`).
8. ✅ **Batch I** (book-a-demo component; render wiring deferred to L).
9. ✅ **Batch J** (Footer redesign; upstreamed website footer rendering into DS per ADR-014; website lang-switcher override → L).
10. ✅ **Batch K** (no-op — SharePoint infra already on main; product-downloads delta excluded per ADR-015).
11. ✅ **Batch L** (final — settings/i18n wiring + R.8 website component diffs, ADR-016). **Upstreaming effort complete.**

Each batch = its own branch off clean `main` + a Changeset + one PR. Per-file mechanic:

```bash
git checkout optoma/main -- <path>   # stage optoma's version
git diff --cached -- <path>          # inspect; strip optoma specifics
# edit, then: pnpm changeset && commit
```

## Guardrails

- Never `git merge optoma main` — it drags in all client content and re-triggers the LFS 404.
- Never copy LFS blobs (`__snapshots__`, `screenshots`) from optoma — regenerate locally.
- Strip brand **values** from any ported token/scss files; keep only structural/logic changes.

---

# Changelog — Upstreamed changes (Optoma → template)

All notable **generic, brand-neutral** changes upstreamed from the `optoma/main` client fork into the template
`main`, curated as category batches (A–L). Grouped in [Keep a Changelog](https://keepachangelog.com/) style.
Everything Optoma-specific (product catalog, datasheets, spec-groups, download-categories, brand imagery/fonts/
token values, `cms/optoma/**`, NetSuite/ingest workflows) was **deliberately excluded** — see the
"⛔ OPTOMA-SPECIFIC — never upstream" section above.

Effort completed 2026-07-22. Merged via PRs #6–#17 (`gh` API was broken → local `--no-ff` merge commits).
`main` progressed `0de5d770` (Batch A) → `8954c7d8` (Batch L) → `22c5338d` (docs).

## Added

### Features

- **Cosmos Token Graph** — new `packages/token-graph` package (18 files) + cosmos docs: interactive design-token
  relationship graph (1708 nodes / 1988 edges), wired into the design-system build + rollup copy. _(Batch B, PR #7)_
- **Component Token Editor** — new browser-based visual token editor feature. _(Batch C, PR #8)_
- **Book-a-Demo** — floating fixed-position "Book a Demo" call-to-action button (`components/book-a-demo/**`,
  brand-neutral default label, all `--ks-`/`--dsa-` tokens). _(Batch I, PR #14)_
- **Settings-driven header CTA & Book-a-Demo** — `settings.schema.json` `headerButton` and `bookDemoButton`
  objects (enabled/label/url/variant) + per-page `hideBookDemoButton` toggle, rendered via `SettingsContext`
  and `HeaderButtonContext`. _(Batch L, PR #17)_
- **Internationalization (hreflang)** — `AlternatesProvider`/`useAlternates` in `LanguageContext`, `hreflang` +
  `x-default` `<link>` tags in `Meta.tsx`, and language-aware breadcrumbs + homepage href in `_app.tsx` (EN/DE).
  _(Batch L, PR #17)_
- **Header language switcher** — EN/DE switcher rendered header-side via `NavMainWithCta` in `ComponentProviders`.
  _(Batch L, PR #17)_
- **Section anchor links** — `section.schema.json` `anchorId` field rendered as the section `id`, enabling
  in-page anchor links (`/page#my-section`). _(Batch L, PR #17)_
- **Visibility-layer generator** — new `scripts/generateVisibilityFromPatterns.ts` script. _(Batch H, PR #13)_
- **Per-component token overrides in themes** — theme create/update now supports per-component token overrides
  across `storyblok-mcp` and `storyblok-services`. _(Batch F, PR #11)_

### Design system

- **Footer redesign** — schema migrated from `byline` + `navItems` to multi-column `navGroups`
  (`heading` + `{label,url,newTab}` items), plus `copyright`, `legalLink` (`{label,url}`), and icon-driven
  `socialLinks` (`{icon,url,ariaLabel}`, reusing the DS icon sprite — no new brand assets). Website footer
  _rendering_ was upstreamed into the DS (grouped columns + social-icon row + copyright/legal bottom bar).
  _(Batch J, PR #15; ADR-014)_

## Changed

- **Token catalogs regenerated** — component token catalog (49 components / 776 tokens) + semantic tokens
  (950 tokens), brand-neutral, wired into the build. _(Batch A, PR #6)_
- **Hero focal point** — hero image honours a Storyblok-editor-chosen focal point via
  `--dsa-hero-focus-position` (`object-position`), injected by the `ComponentProviders` Hero wrapper.
  _(Batch L, PR #17; DS token already present on `main`)_
- **Image quality filter** — image helper applies a quality filter in `ComponentProviders`. _(Batch L, PR #17)_
- **Header z-index** — hard-coded `z-index: 9999999` replaced with the `--dsa-header--z-index` token.
  _(Batch L, PR #17)_
- **Visibility layer default** — generator `--layer` default de-branded from `optoma` → `visibility`.
  _(Batch H, PR #13)_
- **Editor / infra config** — Storybook a11y `test: "off"` toggle, `.vscode/settings.json` watcher/search/
  explorer excludes, MCP notes + hero-slider workflow doc. _(Batch G, PR #12)_

## Fixed

- **Component fixes** — 37 brand-neutral component files: new `SeoComponent.tsx` and `Gallery.client.js`;
  gallery slider / lightbox stroke + thumbnail; teaser-card image tokens; business-card
  `contact:` → `contactLinks:` (latent template-story bug). _(Batch D, PR #9)_
- **Dependency patches** — refreshed 3 pnpm patches: `unpic@3.22.0` (Storyblok filter-parser),
  `kickstartds@3.5.0--canary.62.324.0` (storyblok-task rc-config), and extended
  `jsonschema-utils@3.9.0` (allOf title/desc/required preservation). _(Batch E, PR #10)_
- **Umami analytics** — exclude gallery anchors (`a[data-gallery^=gallery-]`) from outbound/internal link
  tracking. _(Batch L, PR #17)_
- **Prompter** — stable `useEffect` dependency (`detectPrompterUid`) to avoid unnecessary re-runs.
  _(Batch L, PR #17)_

## Removed

- **Timeline demo component** — deleted `components/timeline/**` (7 files) + all wiring. This was an unwanted
  AI-generated demo originating in the base template (merge-base `6e67004a`), not from the Optoma fork.
  _(PR #16)_
- **Unused `TeaserProvider`** — removed dead provider. _(Batch L, PR #17)_

## Notable exclusions (not upstreamed)

- `product-detail` hero guard, `product-catalog`/`product-downloads`/`download-category` logic, datasheet PDFs,
  spec-groups, SKU handling (`helpers/sharepoint.ts` product scanner), `ingest-template.ts`, NetSuite workflows.
- Website `CustomFooter` override — superseded by the DS footer rendering (ADR-014); the language switcher lives
  header-side instead.
- Brand imagery, Helvetica Neue fonts, and all branding **token values** (structure kept, values stripped).

## Package release impact (Changesets)

| Package                          | Bump  | Batches                                                     |
| -------------------------------- | ----- | ---------------------------------------------------------- |
| `@kickstartds/design-system`     | minor | A (token tooling), B (token-graph), C, D (fixes), J (footer) |
| `@kickstartds/design-system`     | patch | E (dependency patches)                                     |
| `@kickstartds/storyblok-services`| minor | F (per-component token overrides)                          |
| `@kickstartds/storyblok-mcp-server` | minor | F (per-component token overrides)                       |

> The `website`, `design-tokens-editor`, and `schema-layer-editor` packages are in the Changesets `ignore`
> list, so Batches G, H, I, K, and L (website-only, no design-system change) required **no changeset**.

## Follow-up (non-code, needs Storyblok API tokens)

- Run a CMS sync (`pnpm --filter website update-storyblok-config` + `generate-content-types`) to (a) purge the
  removed Timeline blok from the live-mirror types (`types/components-schema.*`) and (b) surface the new Batch-L
  schema fields (`headerButton`, `bookDemoButton`, `hideBookDemoButton`, `anchorId`) in those generated mirrors.
