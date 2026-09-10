# Monorepo Integration Checklist

**Tracking document for [monorepo-inline-packages-prd.md](../prd/monorepo-inline-packages-prd.md)**
**Branch:** `feature/inline-more-projects`
**Started:** 2026-03-06

---

## Phase 1 — Unblock Workspace Resolution (P0)

### WP-1: Remove Stale Lockfiles & Per-Package Workspace Configs

- [x] Delete `packages/component-builder-mcp/package-lock.json`
- [x] Delete `packages/design-system/yarn.lock`
- [x] Delete `packages/design-tokens-editor/pnpm-lock.yaml`
- [x] Delete `packages/design-tokens-editor/pnpm-workspace.yaml`
- [x] Delete `packages/design-tokens-mcp/package-lock.json`
- [x] Run `pnpm install` — verify all 9 packages resolve
- [x] Verify all four new packages appear in root `pnpm-lock.yaml`

### WP-2: Align Package Identity & Metadata

#### Naming

- [x] `component-builder-mcp`: rename `design-system-component-builder-mcp` → `@kickstartds/component-builder-mcp`
- [x] `design-system`: rename `@kickstartds/ds-agency-premium` → `@kickstartds/design-system`
- [x] `design-tokens-editor`: rename `@kickstartds/token-playground` → `@kickstartds/design-tokens-editor`
- [x] `design-tokens-mcp`: rename `@kickstartds/design-token-mcp` → `@kickstartds/design-tokens-mcp`

#### Common Fields (all four packages)

- [x] `component-builder-mcp`: set license, author, engines, repository
- [x] `design-system`: update author, add engines, update repository URL
- [x] `design-tokens-editor`: set license, author, engines, repository
- [x] `design-tokens-mcp`: set license, author, engines, repository

#### Publishing Config

- [x] `component-builder-mcp`: add `files: ["dist"]`, `publishConfig: { access: "public" }` _(deferred — JS package, no dist yet)_
- [x] `design-system`: verify existing publishConfig (publishing deferred)
- [x] `design-tokens-editor`: verify `private: true` (no publish config needed)
- [x] `design-tokens-mcp`: add `files: ["dist"]`, `publishConfig: { access: "public" }` _(deferred — JS package, no dist yet)_

---

## Phase 2 — Core Integration (P1)

### WP-5: Workspace Dependency Wiring

- [x] `website/package.json`: `ds-agency-premium ^2.0.2` → `@kickstartds/design-system: workspace:*`
- [x] `storyblok-mcp/package.json`: `ds-agency-premium ^2.0.2` → `@kickstartds/design-system: workspace:*`
- [x] `design-tokens-editor/package.json`: `ds-agency-premium 1.6.74--canary.45.2772.0` → `@kickstartds/design-system: workspace:*`
- [x] Bulk rename imports: `@kickstartds/ds-agency-premium` → `@kickstartds/design-system` across all source files (35 files)
- [x] Update CLI script paths in `website/package.json` (`node_modules/@kickstartds/ds-agency-premium/` → `node_modules/@kickstartds/design-system/`)
- [x] Update root `package.json` `layer-editor` script path
- [x] Update `copilot-instructions.md` and package READMEs
- [x] Remove `prepublishOnly` and `husky:precommit` scripts from design-system (see ADR-010)
- [x] Run `pnpm install` — verify workspace resolution
- [x] Verify topological build order (`design-system` builds before consumers)

### WP-4: Standardize Scripts

- [x] `component-builder-mcp`: add `build`, `dev`, `typecheck` scripts (placeholder for JS packages)
- [x] `design-system`: replace `yarn` references in all scripts with pnpm-compatible commands
- [x] `design-tokens-editor`: add `dev` (alias for `start`), add `typecheck: tsc --noEmit`
- [x] `design-tokens-mcp`: add `build`, `dev`, `typecheck` scripts (placeholder for JS packages)

### WP-13: Design System Build Integration

- [x] Replace all `yarn` → `pnpm run` in design-system scripts (run-s/run-p stay as-is)
- [x] Verify `pnpm run build-tokens` works (Style Dictionary pipeline)
- [x] Verify `pnpm run schema` works (kickstartDS schema tools)
- [x] Add `build` script (replaces removed `prepublishOnly`: tokens → schema → token → branding-tokens → rollup)
- [x] Test `pnpm --filter @kickstartds/design-system storybook` launches dev server

### WP-6: Integrate Release Management (Changesets)

- [x] Remove `.autorc` from design-system
- [x] Remove `.circleci/` directory from design-system
- [x] Remove `.husky/` directory from design-system
- [x] Remove `auto`, `@auto-it/*`, `patch-package`, `husky` devDependencies from design-system
- [x] Remove `prepublishOnly` and `husky:precommit` scripts from design-system
- [x] Add `@kickstartds/design-tokens-editor` and `@kickstartds/schema-layer-editor` to `.changeset/config.json` `ignore` array
- [x] Verify all publishable new packages are discoverable by changesets

---

## Phase 3 — Code Quality & Cleanup (P2)

### WP-8: Cleanup Per-Package Artifacts

#### All packages

- [x] Remove per-package `.nvmrc` files
- [x] Simplify per-package `.gitignore` to only `node_modules` + `dist`
- [x] Remove stale `.vscode/` directories

#### `component-builder-mcp`

- [x] Remove `.vscode/mcp.json`

#### `design-system`

- [x] Remove `.editorconfig`
- [x] Remove `.circleci/` directory
- [x] Remove `.husky/` directory
- [x] Move patches to root `patches/` and update root `pnpm.patchedDependencies` (converted from patch-package format; @storybook/csf `gt` patch re-targeted to `storybook@10.2.15` where CSF is now bundled)
- [x] Evaluate `__snapshots__/` PNG files → migrated to Git LFS (snapshots, static assets, generated JSON); CI updated with `lfs: true`; `scripts/purge-history.sh` prepared for pre-merge history cleanup

#### `design-tokens-editor`

- [x] Move patch (`@glidejs/glide`) to root `patches/`
- [x] Remove `.devcontainer/` directory
- [x] Rename `.env-example` → `.env.example`

#### `design-tokens-mcp`

- [x] Move docs (`QUICKSTART.md`, `DEPLOYMENT.md`, PRDs) to root `docs/`
- [x] Move `config/deploy.yml` → root `config/deploy-design-tokens-mcp.yml`
- [x] Remove `config/` directory

### WP-9: Root Configuration Updates

#### Root `package.json`

- [x] Add convenience dev scripts for new packages

#### Root `.gitignore`

- [x] Add `packages/component-builder-mcp/dist/`
- [x] Add `packages/design-tokens-mcp/dist/`
- [x] Add `packages/design-tokens-editor/dist/`
- [x] Add `packages/design-system/dist/`
- [x] Add `packages/design-system/storybook-static/`

#### Patches Consolidation

- [x] Move `packages/design-tokens-editor/patches/*` → root `patches/`
- [x] Update root `pnpm.patchedDependencies` with `@glidejs/glide@3.7.1`
- [x] Verify patches apply correctly
- [x] Move `packages/design-system/patches/*` → root `patches/` (converted from patch-package format; @storybook/csf `gt` patch re-targeted to `storybook@10.2.15`)

---

## Phase 4 — Documentation & Deployment (P2, deferred)

### WP-10: Update `copilot-instructions.md`

- [x] Add all four new packages to Monorepo Structure section
- [x] Document design-system build pipeline
- [x] Document design-tokens-editor architecture
- [x] Document both new MCP servers (component-builder-mcp, design-tokens-mcp)
- [x] Update Important Files section (added design-system, MCP servers, token editor files)
- [x] Update Key Commands section (added dev commands for all new packages)

### WP-7: Consolidate Deployment Configurations

- [x] Move `design-tokens-mcp/config/deploy.yml` → root `config/deploy-design-tokens-mcp.yml`
- [x] Rewrite `config/deploy-design-tokens-mcp.yml` (was outdated: wrong image var, wrong port)
- [x] Align `design-tokens-mcp/Dockerfile` production stage (non-root user, ENTRYPOINT, healthcheck)
- [x] Create `component-builder-mcp/Dockerfile` + `config/deploy-component-builder-mcp.yml`
- [x] Create `schema-layer-editor/Dockerfile` + `config/deploy-schema-layer-editor.yml`
- [x] ~~Decide on design-tokens-editor deployment → keep on Netlify (deep Netlify Functions/Blobs dependency)~~ Migrated to Storyblok + Kamal/Docker — Netlify deps removed, Express backend added, `token-theme` content type stores themes in Storyblok
- [x] Move `db/` → `packages/umami-analytics/`, create `config/deploy-analytics.yml`
- [x] Consolidate `.kamal/secrets` (analytics secrets added to root, removed per-package copies)
- [x] Remove redundant `packages/storyblok-mcp/.kamal/secrets`
- [x] Add Chromatic/Storybook deployment to monorepo CI

---

## Phase 5 — Strategic Improvements (P3, deferred)

### WP-3: TypeScript Migration (MCP Servers)

- [x] `component-builder-mcp`: convert JS → TS, modularize single-file
- [x] `design-tokens-mcp`: convert JS → TS, modularize single-file

### WP-11: Token Data Synchronization Strategy

- [x] Decide: static copy vs build-time derivation vs runtime resolution
- [x] Implement chosen approach

### WP-12: MCP Server Alignment

- [x] `component-builder-mcp`: add HTTP transport, structured output, resources
- [x] `design-tokens-mcp`: align Dockerfile base, add resources, add prompts

### WP-13: Align package and directory naming:

- [x] Renamed `packages/mcp-server` → `packages/storyblok-mcp`, `packages/n8n-nodes` → `packages/storyblok-n8n`
- [x] Updated all config files (deploy-mcp.yml, .vscode/mcp.json, .gitignore, root package.json, Dockerfile)
- [x] Updated all references across README.md, copilot-instructions.md, package READMEs, and 15+ docs
