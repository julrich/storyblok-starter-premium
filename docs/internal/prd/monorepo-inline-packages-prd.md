# PRD: Inline New Packages into Monorepo

**Status:** Draft
**Author:** GitHub Copilot
**Date:** 2026-03-06
**Branch:** `feature/inline-more-projects`

---

## 1. Executive Summary

Four packages have been merged (via `--allow-unrelated-histories`) from their standalone repositories into this monorepo:

| Package Directory                | npm Name                                                        | Description                                                      |
| -------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------- |
| `packages/component-builder-mcp` | `design-system-component-builder-mcp`                           | MCP server: component-building instructions & templates          |
| `packages/design-system`         | `@kickstartds/ds-agency-premium` → `@kickstartds/design-system` | The core Design System (80+ React components, tokens, Storybook) |
| `packages/design-tokens-editor`  | `@kickstartds/token-playground`                                 | Browser-based Design Token WYSIWYG editor (Vite SPA)             |
| `packages/design-tokens-mcp`     | `@kickstartds/design-token-mcp`                                 | MCP server: design token management & governance                 |

None of these packages currently follow the conventions of the existing monorepo packages (`mcp-server`, `storyblok-services`, `n8n-nodes`, `schema-layer-editor`, `website`). This PRD details every alignment step required to bring them under the same umbrella.

> **Note:** Publishing to npm is NOT required for this integration. All packages will be consumed via `workspace:*` protocol within the monorepo. Publishing setup is included for future readiness but can be deferred indefinitely.

---

## 2. Current State Analysis

### 2.1 Established Monorepo Conventions

The five existing packages follow these conventions consistently:

| Convention           | Standard                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| **Package manager**  | pnpm (root `pnpm-lock.yaml`, no per-package lockfiles)                                         |
| **Naming**           | `@kickstartds/<name>` scope (except n8n-nodes — n8n convention)                                |
| **Module system**    | `"type": "module"` (ESM)                                                                       |
| **Language**         | TypeScript (`src/` → `dist/`)                                                                  |
| **Build tool**       | `tsc` for libraries/servers; Vite for browser UIs; Next.js for website                         |
| **tsconfig**         | Standalone per-package; `strict: true`, `target: ES2022`, `moduleResolution: bundler`          |
| **Scripts**          | `build`, `typecheck` (`tsc --noEmit`), `dev`, `test`                                           |
| **Testing**          | Jest + ts-jest (ESM preset) for libraries/servers; Vitest where Vite is used                   |
| **Versioning**       | Changesets (`@changesets/cli`) — root `.changeset/config.json`                                 |
| **License**          | `(MIT OR Apache-2.0)` — root-level `LICENSE-MIT`, `LICENSE-APACHE`, `COPYRIGHT.md`             |
| **Author**           | `{ "name": "kickstartDS", "email": "info@kickstartds.com" }`                                   |
| **Node engine**      | `>=24.0.0`                                                                                     |
| **Source structure** | `src/` for source, `test/` for tests (at package root, not inside `src/`)                      |
| **Publishing**       | `"files": ["dist"]`, `"publishConfig": { "access": "public" }`                                 |
| **Internal deps**    | `workspace:*` protocol                                                                         |
| **Deployment**       | Kamal configs in `config/deploy*.yml`                                                          |
| **Git**              | Single root `.gitignore` + lightweight per-package `.gitignore` (just `node_modules` + `dist`) |

### 2.2 Per-Package Gap Analysis

#### 2.2.1 `packages/component-builder-mcp`

| Area                   | Current State                                       | Gap                                              |
| ---------------------- | --------------------------------------------------- | ------------------------------------------------ |
| **npm name**           | `design-system-component-builder-mcp` (no scope)    | Missing `@kickstartds/` scope                    |
| **Language**           | Plain JavaScript (single 1,630-line `src/index.js`) | Not TypeScript                                   |
| **Lockfile**           | `package-lock.json` (npm)                           | Should not exist — pnpm manages root lockfile    |
| **TypeScript**         | No `tsconfig.json`, no TS files                     | No type checking, no declarations                |
| **Scripts**            | Only `start`, `test` (stub)                         | Missing `build`, `dev`, `typecheck`              |
| **Tests**              | None                                                | No test infrastructure                           |
| **License**            | `MIT` (not dual)                                    | Should be `(MIT OR Apache-2.0)`                  |
| **License files**      | None                                                | Root-level files cover this (OK)                 |
| **Author**             | `kickstartDS` (string, not object)                  | Should match `{ name, email }` format            |
| **Engines**            | Not specified                                       | Should declare `>=24.0.0`                        |
| **Entry point**        | `"main": "src/index.js"` (source, not dist)         | Should point to `dist/`                          |
| **Publishing**         | No `files`, no `publishConfig`                      | Missing publish metadata                         |
| **Architecture**       | Single-file monolith                                | Should be decomposed into modules in `src/`      |
| **MCP SDK**            | `^1.25.3`                                           | Should align with `mcp-server` package version   |
| **MCP transport**      | stdio only                                          | Should match `mcp-server` pattern (stdio + HTTP) |
| **Deployment**         | No Docker/Kamal config                              | Needs deployment artifacts if cloud-hosted       |
| **.gitignore**         | Only `node_modules`                                 | Minimal — OK for package-level                   |
| **Changesets**         | Not integrated                                      | Needs changeset config integration               |
| **`.vscode/mcp.json`** | Points to unrelated Storybook MCP                   | Misleading — should be removed or corrected      |

#### 2.2.2 `packages/design-system`

| Area                 | Current State                                                    | Gap                                                             |
| -------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------- |
| **npm name**         | `@kickstartds/ds-agency-premium`                                 | Rename to `@kickstartds/design-system` (match dir convention)   |
| **Language**         | TypeScript ✅                                                    | `strict: false` in tsconfig ⚠️                                  |
| **Lockfile**         | `yarn.lock` present                                              | Must be removed — pnpm manages root lockfile                    |
| **Package manager**  | Originally Yarn (scripts reference `yarn`)                       | All scripts must use pnpm-compatible commands                   |
| **tsconfig**         | `target: ES2020` (below standard ES2022)                         | Minor — aligning would be a breaking change, defer              |
| **Build tool**       | Rollup                                                           | Acceptable (complex output structure), not a gap                |
| **Scripts**          | Yarn-based (`yarn storybook`, `yarn test`, etc.)                 | Must be pnpm-compatible                                         |
| **Tests**            | Storybook test-runner + Chromatic (visual only)                  | Different paradigm — acceptable for a design system             |
| **License**          | `(MIT OR Apache-2.0)` ✅                                         | Already matches                                                 |
| **License files**    | `LICENSE-MIT`, `LICENSE-APACHE`, `COPYRIGHT.md` at package level | Redundant with root — can be removed or kept for npm publish    |
| **Author**           | Individual author format                                         | Should match team format                                        |
| **Engines**          | Not specified (`.nvmrc` says `22.12`)                            | Should declare `>=24.0.0`                                       |
| **CI/CD**            | CircleCI config (`.circleci/config.yml`)                         | Must be replaced/integrated with monorepo CI                    |
| **Release**          | Intuit Auto (`.autorc`)                                          | Must migrate to Changesets                                      |
| **Git hooks**        | `.husky/`                                                        | Should be managed at root level, not per-package                |
| **`.nvmrc`**         | `22.12`                                                          | Orphaned — root-level Node version management                   |
| **`.editorconfig`**  | Per-package                                                      | Should use root-level config or be removed                      |
| **Dependency**       | Consumed from npm (`^2.0.2`) by `website` and `mcp-server`       | Rename + switch to `workspace:*`; update all consumer refs      |
| **Repository field** | Points to `github.com/kickstartDS/ds-agency-premium`             | Should point to monorepo                                        |
| **Storybook**        | v10.2.0-beta.1                                                   | Standalone Storybook OK, but dev/build scripts need integration |
| **Style Dictionary** | 6 config files                                                   | Standalone — OK                                                 |
| **Patches**          | Own `patches/` dir with 4 patches                                | Need to evaluate — move to root `patches/` or keep?             |
| **`__snapshots__/`** | ~140 PNG files in source                                         | Large binary assets in git — consider `.gitattributes` / LFS    |
| **Playroom**         | `playroom.config.js`                                             | Standalone tooling — OK                                         |

#### 2.2.3 `packages/design-tokens-editor`

| Area                 | Current State                                                              | Gap                                                    |
| -------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------ |
| **npm name**         | `@kickstartds/token-playground`                                            | Already scoped ✅, but name mismatches directory       |
| **Language**         | TypeScript ✅                                                              |                                                        |
| **Lockfile**         | `pnpm-lock.yaml` (per-package)                                             | Must be removed — root lockfile only                   |
| **Workspace config** | Own `pnpm-workspace.yaml` (patches only)                                   | Must be removed — root workspace config only           |
| **Private**          | `true` ✅                                                                  | Correct for an app                                     |
| **License**          | Not specified                                                              | Should be `(MIT OR Apache-2.0)`                        |
| **Author**           | Not specified                                                              | Should match team format                               |
| **Engines**          | Not specified (`.nvmrc` says `24`)                                         | Should declare `>=24.0.0`                              |
| **Build tool**       | Vite ✅                                                                    | Matches `schema-layer-editor` pattern                  |
| **Scripts**          | `build`, `format` (oxfmt), `preview`, `start`                              | Missing `dev` (uses `start`), `typecheck`              |
| **Tests**            | None                                                                       | No test infrastructure                                 |
| **Formatter**        | oxfmt (via `.oxfmtrc.json`)                                                | Non-standard — no other package uses this              |
| **Deployment**       | Netlify (`netlify.toml`, Netlify Functions, Netlify Blobs)                 | Must evaluate: keep Netlify or migrate to Kamal?       |
| **DevContainer**     | `.devcontainer/` with Dockerfile                                           | Standalone dev setup — evaluate if needed              |
| **`.nvmrc`**         | `24`                                                                       | Orphaned — root-level Node management                  |
| **tsconfig**         | `esModuleInterop: false` (differs from standard)                           | Minor deviation                                        |
| **DS dependency**    | `@kickstartds/ds-agency-premium: 1.6.74--canary.45.2772.0` (pinned canary) | Rename ref → `@kickstartds/design-system: workspace:*` |
| **Patches**          | Own `patches/` dir (1 patch: `@glidejs/glide`)                             | Move to root `patches/`                                |
| **Repository field** | Not specified                                                              | Should point to monorepo                               |
| **`.env-example`**   | `GOOGLE_FONTS_API_KEY`                                                     | Needs documentation in root README/env setup           |

#### 2.2.4 `packages/design-tokens-mcp`

| Area                   | Current State                                                                         | Gap                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **npm name**           | `@kickstartds/design-token-mcp` (singular)                                            | Inconsistent: folder is plural, binary is plural, npm name is singular |
| **Language**           | Plain JavaScript (single 4,675-line `index.js` at root)                               | Not TypeScript, not in `src/`                                          |
| **Lockfile**           | `package-lock.json` (npm)                                                             | Must be removed                                                        |
| **TypeScript**         | No `tsconfig.json`, no TS files                                                       | No type checking                                                       |
| **Scripts**            | Only `start`, `start:http`, `test` (stub)                                             | Missing `build`, `dev`, `typecheck`                                    |
| **Tests**              | None                                                                                  | No test infrastructure                                                 |
| **License**            | `ISC`                                                                                 | Should be `(MIT OR Apache-2.0)`                                        |
| **Author**             | Empty                                                                                 | Should match team format                                               |
| **Engines**            | Not specified (`.nvmrc` says `22.12`)                                                 | Should declare `>=24.0.0`                                              |
| **Entry point**        | `"main": "index.js"` (root-level source)                                              | Should be `dist/index.js` from `src/`                                  |
| **Publishing**         | No `files`, no `publishConfig`                                                        | Missing                                                                |
| **Architecture**       | Single-file monolith (4,675 lines)                                                    | Must decompose into `src/` modules                                     |
| **MCP SDK**            | `^1.25.3`                                                                             | Should align with `mcp-server` package                                 |
| **MCP transport**      | stdio + HTTP ✅                                                                       | Already supports both                                                  |
| **Deployment**         | Own `config/deploy.yml` (Kamal), `Dockerfile`, `docker-compose.yml`                   | Kamal config should move to root `config/`                             |
| **Token data**         | `tokens/` dir (13 global + 50 component files)                                        | Static data — OK, but consider relationship with design-system         |
| **Rules**              | `rules/` dir (13 JSON governance files)                                               | Static data — OK                                                       |
| **`.nvmrc`**           | `22.12`                                                                               | Orphaned                                                               |
| **Docs**               | 7 markdown files (`README.md`, `QUICKSTART.md`, `DEPLOYMENT.md`, 2 PRDs, 2 task docs) | PRDs/task docs may move to root `docs/`                                |
| **`.gitignore`**       | Comprehensive                                                                         | OK but somewhat redundant with root                                    |
| **MCP config**         | `mcp-config-example.json`                                                             | Useful — keep                                                          |
| **Name inconsistency** | folder=`design-tokens-mcp`, npm=`design-token-mcp`, bin=`design-tokens-mcp`           | Standardize to one form                                                |

---

## 3. Work Packages

### WP-1: Remove Stale Lockfiles & Per-Package Workspace Configs

**Priority:** P0 (Blocking)
**Effort:** XS
**Packages:** All four

These files conflict with pnpm workspace resolution and must be removed immediately:

- [ ] Delete `packages/component-builder-mcp/package-lock.json`
- [ ] Delete `packages/design-system/yarn.lock`
- [ ] Delete `packages/design-tokens-editor/pnpm-lock.yaml`
- [ ] Delete `packages/design-tokens-editor/pnpm-workspace.yaml`
- [ ] Delete `packages/design-tokens-mcp/package-lock.json`
- [ ] Run `pnpm install` from root to resolve all packages under the single root lockfile
- [ ] Verify all four packages appear in `pnpm-lock.yaml`

### WP-2: Align Package Identity & Metadata

**Priority:** P0 (Blocking)
**Effort:** S
**Packages:** All four

Standardize all `package.json` files to follow monorepo conventions:

#### 2a. Package Naming

| Package                 | Current Name                          | Proposed Name                                           |
| ----------------------- | ------------------------------------- | ------------------------------------------------------- |
| `component-builder-mcp` | `design-system-component-builder-mcp` | `@kickstartds/component-builder-mcp`                    |
| `design-system`         | `@kickstartds/ds-agency-premium`      | `@kickstartds/design-system` (match dir, new identity)  |
| `design-tokens-editor`  | `@kickstartds/token-playground`       | `@kickstartds/design-tokens-editor`                     |
| `design-tokens-mcp`     | `@kickstartds/design-token-mcp`       | `@kickstartds/design-tokens-mcp` (plural, match folder) |

#### 2b. Common Fields

For each package, add/update:

```jsonc
{
  "license": "(MIT OR Apache-2.0)",
  "author": { "name": "kickstartDS", "email": "info@kickstartds.com" },
  "engines": { "node": ">=24.0.0" },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/kickstartDS/storyblok-starter-premium.git",
    "directory": "packages/<dir-name>"
  }
}
```

#### 2c. Publishing Config

| Package                 | `private` | `files`              | `publishConfig`                                |
| ----------------------- | --------- | -------------------- | ---------------------------------------------- |
| `component-builder-mcp` | —         | `["dist"]`           | `{ "access": "public" }`                       |
| `design-system`         | —         | `["dist"]` (already) | `{ "access": "public" }` (publishing deferred) |
| `design-tokens-editor`  | `true`    | —                    | —                                              |
| `design-tokens-mcp`     | —         | `["dist"]`           | `{ "access": "public" }`                       |

### WP-3: TypeScript Migration (MCP Servers)

**Priority:** P1 (High)
**Effort:** L
**Packages:** `component-builder-mcp`, `design-tokens-mcp`

Both MCP packages are currently single-file plain JavaScript. They need to be converted to TypeScript to match the `mcp-server` package pattern.

#### 3a. `component-builder-mcp`

- [ ] Create `tsconfig.json` following monorepo template (target ES2022, module ESNext, bundler resolution)
- [ ] Create `src/` directory with modular structure:
  ```
  src/
    index.ts              — Server bootstrap + transport setup
    tools/                — One file per tool
      get-ui-building-instructions.ts
      get-component-structure.ts
      get-json-schema-template.ts
      get-react-component-template.ts
      get-client-behavior-template.ts
      get-scss-template.ts
      get-storybook-template.ts
      get-defaults-template.ts
      get-token-architecture.ts
      list-existing-components.ts
    templates/            — Template string constants (extracted from tool handlers)
  ```
- [ ] Convert `src/index.js` → TypeScript modules
- [ ] Add `build` script: `tsc`
- [ ] Add `dev` script: `tsc --watch`
- [ ] Add `typecheck` script: `tsc --noEmit`
- [ ] Update `main` to `dist/index.js`
- [ ] Update `bin` to `dist/index.js`
- [ ] Add TypeScript + `@types/node` as devDependencies

#### 3b. `design-tokens-mcp`

- [ ] Create `tsconfig.json` following monorepo template
- [ ] Create `src/` directory with modular structure:
  ```
  src/
    index.ts              — Server bootstrap + transport
    server.ts             — MCP server configuration
    parser.ts             — CSS/SCSS token parsing
    tools/
      core.ts             — get_token, list_tokens, search_tokens, update_token, ...
      semantic.ts         — get_color_palette, get_typography_tokens, ...
      theme.ts            — get_theme_config, update_theme_config, ...
      generation.ts       — generate_theme_from_image, extract_theme_from_css
      component.ts        — list_components, get_component_tokens, ...
      governance.ts       — validate_token_usage, get_design_rules, ...
    types.ts              — Shared type definitions
  ```
- [ ] Convert `index.js` → TypeScript modules
- [ ] Add standard scripts (`build`, `dev`, `typecheck`)
- [ ] Update `main` to `dist/index.js`, `bin` to `dist/index.js`
- [ ] Move `index.js` to `src/index.ts` and delete root-level `index.js`
- [ ] Add TypeScript + `@types/node` as devDependencies

### WP-4: Standardize Scripts

**Priority:** P1 (High)
**Effort:** S
**Packages:** All four

Ensure all packages have the standard script set so root `pnpm -r run build|typecheck|test` works:

| Script      | `component-builder-mcp`      | `design-system`              | `design-tokens-editor`     | `design-tokens-mcp`          |
| ----------- | ---------------------------- | ---------------------------- | -------------------------- | ---------------------------- |
| `build`     | Add: `tsc`                   | Keep existing (Rollup-based) | Keep existing (Vite-based) | Add: `tsc`                   |
| `dev`       | Add: `tsc --watch`           | Rename Storybook script      | Rename `start` → `dev`     | Add: `tsc --watch`           |
| `typecheck` | Add: `tsc --noEmit`          | Add: `tsc --noEmit`          | Add: `tsc --noEmit`        | Add: `tsc --noEmit`          |
| `test`      | Add: Jest stub or real tests | Keep: Storybook test-runner  | Add: Vitest stub           | Add: Jest stub or real tests |
| `start`     | Keep                         | Keep (storybook)             | Keep (vite preview)        | Keep                         |

Design-system specifics:

- [ ] Replace all `yarn` references in scripts with pnpm-compatible equivalents
- [ ] Ensure `pnpm run build` works (Rollup pipeline)
- [ ] Ensure `pnpm run storybook` works

### WP-5: Workspace Dependency Wiring

**Priority:** P1 (High)
**Effort:** M
**Packages:** `website`, `mcp-server`, `design-tokens-editor`

Now that the design system lives in the monorepo as `@kickstartds/design-system` (renamed from `@kickstartds/ds-agency-premium`), all consumers must update their dependency name and switch to workspace protocol:

- [ ] In `packages/website/package.json`: change `"@kickstartds/ds-agency-premium": "^2.0.2"` → `"@kickstartds/design-system": "workspace:*"`
- [ ] In `packages/storyblok-mcp/package.json`: change `"@kickstartds/ds-agency-premium": "^2.0.2"` → `"@kickstartds/design-system": "workspace:*"`
- [ ] In `packages/design-tokens-editor/package.json`: change `"@kickstartds/ds-agency-premium": "1.6.74--canary.45.2772.0"` → `"@kickstartds/design-system": "workspace:*"`
- [ ] Update all source-level import paths referencing `@kickstartds/ds-agency-premium` → `@kickstartds/design-system` across `website`, `mcp-server`, and `design-tokens-editor`
- [ ] Update all CLI script arguments that reference `node_modules/@kickstartds/ds-agency-premium/` → `node_modules/@kickstartds/design-system/` in `packages/website/package.json`
- [ ] Evaluate if `design-tokens-mcp` token files should be derived from `design-system`'s token source files (see WP-11)
- [ ] Run `pnpm install` to verify workspace resolution

**Build order dependency:** `design-system` must build before `website`, `mcp-server`, and `design-tokens-editor`. Verify the topological build order handles this correctly via `pnpm -r run build`.

**Rename scope:** The rename from `ds-agency-premium` → `design-system` affects import paths across the codebase. A bulk find-and-replace is needed for:

- `package.json` dependency entries
- TypeScript/JavaScript `import` statements (e.g., `from '@kickstartds/ds-agency-premium/hero'`)
- CLI commands in npm scripts (e.g., `--schema-paths node_modules/@kickstartds/ds-agency-premium/dist/components`)
- `copilot-instructions.md` references
- Any `require()` calls or dynamic imports

### WP-6: Integrate Release Management (Changesets)

**Priority:** P1 (High)
**Effort:** S
**Packages:** All four

#### 6a. Remove Legacy Release Tooling

From `design-system`:

- [ ] Remove `.autorc`
- [ ] Remove `.circleci/` directory (CI will be monorepo-level)
- [ ] Remove `.husky/` directory (git hooks should be root-level if needed)
- [ ] Remove `auto` and `@auto-it/*` devDependencies
- [ ] Remove `release` and related scripts (`release`, `prerelease`, `shipit`)

#### 6b. Configure Changeset Integration

- [ ] Update root `.changeset/config.json`:
  - Add `design-tokens-editor` to `ignore` array (it's private)
  - Verify all four new packages are discoverable
- [ ] Add `CHANGELOG.md` to publishable packages (will be auto-generated by changesets)
- [ ] Configure `linked` groups if design-system and design-tokens-mcp should version together

### WP-7: Consolidate Deployment Configurations

**Priority:** P2 (Medium)
**Effort:** S
**Packages:** `design-tokens-mcp`, `design-system`

#### 7a. `design-tokens-mcp` Kamal Config

- [ ] Move `packages/design-tokens-mcp/config/deploy.yml` → root `config/deploy-design-tokens-mcp.yml`
- [ ] Update Kamal CLI invocation: `kamal deploy -d design-tokens-mcp`
- [ ] Keep `Dockerfile` in the package (it needs package-specific context)
- [ ] Keep `docker-compose.yml` for local dev convenience

#### 7b. `design-system` Deployment

The design-system has Chromatic deployment via CircleCI. After CI migration:

- [ ] Add Chromatic/Storybook deployment to the monorepo CI pipeline
- [ ] Remove standalone `.circleci/` config

#### 7c. `design-tokens-editor` Deployment

Currently deployed via Netlify:

- [ ] **Decision required:** Keep Netlify deployment or migrate to monorepo infrastructure (Kamal)?
- [ ] If keeping Netlify: update `netlify.toml` build commands for monorepo context (pnpm, workspace root)
- [ ] If migrating: create `config/deploy-design-tokens-editor.yml`, create Dockerfile, migrate Netlify Blobs storage

### WP-8: Cleanup Per-Package Artifacts

**Priority:** P2 (Medium)
**Effort:** S
**Packages:** All four

Remove files that duplicate root-level config or belong to the standalone era:

#### All packages:

- [ ] Remove per-package `.nvmrc` files (root-level pnpm `packageManager` field manages Node version)
- [ ] Simplify per-package `.gitignore` (only `node_modules` + `dist`, rest covered by root)
- [ ] Remove stale `.vscode/` directories from packages (root `.vscode/` is authoritative)

#### `component-builder-mcp`:

- [ ] Remove `.vscode/mcp.json` (misleading — references an unrelated Storybook MCP)

#### `design-system`:

- [ ] Evaluate `LICENSE-MIT`, `LICENSE-APACHE`, `COPYRIGHT.md` — keep for npm publish ergonomics OR remove (root-level covers git)
- [ ] Remove `.editorconfig` (use root-level or standardize across monorepo)
- [ ] Move patches from `packages/design-system/patches/` → root `patches/` and update pnpm config
- [ ] Consider whether `__snapshots__/` (~140 PNG files) should use Git LFS

#### `design-tokens-editor`:

- [ ] Move patch from `packages/design-tokens-editor/patches/` → root `patches/` and update pnpm config
- [ ] Remove `.devcontainer/` unless there's a monorepo-level devcontainer planned
- [ ] Rename `.env-example` → `.env.example` (match common convention) or merge into root env docs

#### `design-tokens-mcp`:

- [ ] Move `QUICKSTART.md`, `DEPLOYMENT.md` → root `docs/` (with appropriate naming: `docs/design-tokens-mcp-quickstart.md`)
- [ ] Move `PRD-component-tokens.md`, `TASKS-component-tokens.md`, `docs/PRD-*.md` → root `docs/`
- [ ] Remove `config/` directory after Kamal config moved to root

### WP-9: Root Configuration Updates

**Priority:** P2 (Medium)
**Effort:** S

#### 9a. Root `package.json`

- [ ] Add convenience scripts:
  ```jsonc
  {
    "dev:design-system": "pnpm --filter @kickstartds/design-system storybook",
    "dev:tokens-editor": "pnpm --filter @kickstartds/design-tokens-editor dev",
    "dev:component-mcp": "pnpm --filter @kickstartds/component-builder-mcp dev",
    "dev:tokens-mcp": "pnpm --filter @kickstartds/design-tokens-mcp dev"
  }
  ```

#### 9b. Root `.gitignore`

- [ ] Add build output entries for new packages:
  ```
  packages/component-builder-mcp/dist/
  packages/design-tokens-mcp/dist/
  packages/design-tokens-editor/dist/
  packages/design-system/dist/
  ```
- [ ] Add design-system specific ignores:
  ```
  packages/design-system/storybook-static/
  ```

#### 9c. Patches Consolidation

- [ ] Move `packages/design-system/patches/*` → root `patches/` and add to root `pnpm.patchedDependencies`
- [ ] Move `packages/design-tokens-editor/patches/*` → root `patches/` and add to root `pnpm.patchedDependencies`
- [ ] Verify patches apply correctly after move

#### 9d. `pnpm.onlyBuiltDependencies` / `pnpm.ignoredBuiltDependencies`

- [ ] Review new packages' native dependencies (if any) and add to root allowlists

### WP-10: Update `copilot-instructions.md`

**Priority:** P2 (Medium)
**Effort:** M

Update the monorepo's Copilot Instructions to document the four new packages:

- [ ] Add `design-system`, `component-builder-mcp`, `design-tokens-editor`, `design-tokens-mcp` to the Monorepo Structure section
- [ ] Document the design-system build pipeline (Rollup + Style Dictionary + Storybook)
- [ ] Document the token editor's architecture (Vite SPA + JSON Forms + live preview)
- [ ] Document both new MCP servers alongside the existing Storyblok MCP server
- [ ] Update the Important Files section with key files from new packages
- [ ] Update the Key Commands section with new dev/build commands

### WP-11: Token Data Synchronization Strategy

**Priority:** P3 (Low — design decision)
**Effort:** M

The `design-tokens-mcp` package bundles 63 token files (`tokens/` dir) that overlap with the design-system's token source files (`src/token/`). Currently these are independent copies.

**Options:**

1. **Static copy (current):** Keep independent token files in `design-tokens-mcp/tokens/`. Manually sync when tokens change.
2. **Build-time derivation:** Add a build step that copies/transforms token files from `design-system` → `design-tokens-mcp/tokens/` during build.
3. **Runtime resolution:** Have `design-tokens-mcp` read tokens from `@kickstartds/design-system/dist/` at runtime via a workspace dependency.

- [ ] Decide on synchronization strategy
- [ ] Implement chosen approach
- [ ] Document the token data flow

### WP-12: MCP Server Alignment

**Priority:** P3 (Low)
**Effort:** L

The two new MCP servers differ significantly from the existing `mcp-server` in capability and patterns. While functional convergence isn't required (they serve different purposes), some alignment improves maintainability:

#### 12a. `component-builder-mcp`

- [ ] Add HTTP transport support (matching `mcp-server` and `design-tokens-mcp` patterns)
- [ ] Add structured output (`outputSchema`) on tools where applicable
- [ ] Consider adding MCP resources for templates (currently embedded in tool handlers)
- [ ] Consider adding MCP prompts for guided workflows
- [ ] Replace hardcoded component list in `list-existing-components` with dynamic scan (potentially reading from `design-system` package)
- [ ] Add a Kamal deploy config if this MCP needs cloud deployment

#### 12b. `design-tokens-mcp`

- [ ] Align Dockerfile base image with other services (currently Node 20 Alpine; should be Node 24)
- [ ] Add MCP resources capability (token files as resources)
- [ ] Add MCP prompts for guided token workflows (matching the `mcp-server` pattern of 6 prompts)
- [ ] Consider extracting shared MCP utilities (transport setup, health checks) into `storyblok-services` or a new shared package

### WP-13: Design System Build Integration

**Priority:** P1 (High)
**Effort:** M

The design-system has a complex build pipeline that was designed for standalone execution. Several adjustments are needed:

- [ ] Ensure `pnpm run build` works inside `packages/design-system/` (Rollup + TypeScript + Style Dictionary + copy scripts)
- [ ] Verify `pnpm -r run build` builds the design-system before its consumers (topological sort should handle this via workspace deps)
- [ ] Replace `yarn` references in all npm scripts with pnpm equivalents:
  - `yarn storybook` → `pnpm run storybook` (or `storybook dev`)
  - `yarn test` → `pnpm run test`
  - `yarn build` → `pnpm run build`
  - `yarn chromatic` → `pnpm run chromatic`
  - `yarn auto shipit` → remove (replaced by Changesets)
  - `yarn presets` → `pnpm run presets`
  - `yarn tokens*` → `pnpm run tokens*`
- [ ] Verify `npm_package_version` and `npm_lifecycle_event` usages work under pnpm
- [ ] Test Storybook dev server: `pnpm --filter @kickstartds/design-system storybook`
- [ ] Test Rollup build: `pnpm --filter @kickstartds/design-system build`

---

## 4. Implementation Order

The work packages have dependencies. The recommended execution order is:

```
Phase 1 — Unblock workspace resolution
  WP-1  Remove stale lockfiles                              [P0, XS]
  WP-2  Align package identity & metadata                   [P0, S]

Phase 2 — Core integration
  WP-5  Workspace dependency wiring                         [P1, M]
  WP-4  Standardize scripts                                 [P1, S]
  WP-13 Design system build integration                     [P1, M]
  WP-6  Integrate Changesets                                [P1, S]

Phase 3 — Code quality & structure
  WP-3  TypeScript migration (MCP servers)                  [P1, L]
  WP-8  Cleanup per-package artifacts                       [P2, S]
  WP-9  Root configuration updates                          [P2, S]

Phase 4 — Documentation & polish
  WP-10 Update copilot-instructions.md                      [P2, M]
  WP-7  Consolidate deployment configurations               [P2, S]

Phase 5 — Strategic improvements (can be deferred)
  WP-11 Token data synchronization strategy                 [P3, M]
  WP-12 MCP server alignment                                [P3, L]
```

---

## 5. Risk Assessment

| Risk                                                             | Impact                                                                 | Mitigation                                                                                            |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Design-system build breaks under pnpm                            | High — blocks website & MCP server                                     | Test Rollup build early in Phase 2; keep `yarn.lock` in a branch as fallback                          |
| Rename `ds-agency-premium` → `design-system` breaks import paths | High — import paths and CLI scripts reference the old name extensively | Bulk find-and-replace across codebase; test all schema/token scripts; verify `node_modules` structure |
| TypeScript migration introduces bugs in MCP servers              | Medium — MCP servers are production                                    | Migrate incrementally: `.js` → `.ts` with `allowJs: true` first, then strict typing                   |
| Storybook beta version conflicts with monorepo deps              | Medium                                                                 | Storybook 10 beta may have peer dep issues; use `pnpm.overrides` if needed                            |
| CircleCI → monorepo CI migration gaps                            | Medium — could lose Chromatic deploys                                  | Keep CircleCI config until monorepo CI is verified                                                    |
| Token file synchronization drift                                 | Low — design-tokens-mcp works fine standalone                          | Defer WP-11 until both packages are stable in monorepo                                                |

---

## 6. Success Criteria

1. `pnpm install` from root resolves all nine packages without errors
2. `pnpm -r run build` builds all packages in correct topological order
3. `pnpm -r run typecheck` passes for all packages
4. `pnpm -r run test` runs tests for all packages with test suites
5. `pnpm --filter website dev` works with workspace-linked design-system
6. `pnpm --filter @kickstartds/design-system storybook` launches Storybook
7. All publishable packages pass `pnpm publish --dry-run`
8. No per-package lockfiles exist
9. All packages use `@kickstartds/` scope (except n8n-nodes)
10. Changesets can version all publishable packages

---

## 7. Out of Scope

- **Feature development** in any of the four packages
- **Shared ESLint/Prettier configuration** across the monorepo (currently inconsistent — a separate initiative)
- **Monorepo-level CI/CD pipeline** creation (depends on infrastructure decisions)
- **Design-system Storybook version upgrade** (already on v10 beta — upgrade when stable)
- **Merging MCP servers** into a single codebase (they serve different concerns)
- **Converting the design-system to use `tsc` instead of Rollup** (Rollup is needed for its complex output)
- **Publishing any package to npm** — all packages are consumed via `workspace:*` for now; npm publishing can be set up later if needed
