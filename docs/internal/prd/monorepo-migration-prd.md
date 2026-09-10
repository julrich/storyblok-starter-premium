# PRD: Monorepo Migration — pnpm Workspaces + Changesets

**Status:** Draft
**Author:** kickstartDS
**Created:** 2026-02-18
**Last Updated:** 2026-02-18

---

## 1. Problem Statement

The repository currently contains **4 distinct packages** that are informally wired together via `file:` protocol references:

| Package                           | Name                                     | Type                   | Depends on shared                   |
| --------------------------------- | ---------------------------------------- | ---------------------- | ----------------------------------- |
| Root                              | `@kickstartds/ruhmesmeile-storyblok-starter` | Next.js 13 website     | `file:shared/storyblok-services`    |
| `shared/storyblok-services`       | `@kickstartds/storyblok-services`        | Library (dual ESM+CJS) | —                                   |
| `mcp-server`                      | `@kickstartds/storyblok-mcp-server`      | MCP server             | `file:../shared/storyblok-services` |
| `n8n-nodes-storyblok-kickstartds` | `n8n-nodes-storyblok-kickstartds`        | n8n community node     | `file:../shared/storyblok-services` |

### Current Pain Points

1. **Four separate `package-lock.json` files** — dependency versions drift across packages; no single source of truth for resolved versions.
2. **`file:` protocol is brittle** — it copies rather than symlinks in many npm scenarios, doesn't participate in deduplication, and causes confusing behaviour in CI and Docker builds.
3. **No coordinated build pipeline** — changing `storyblok-services` requires manually rebuilding it, then rebuilding each consumer. There's no task dependency graph.
4. **Duplicate dependencies** — `openai`, `storyblok-js-client`, `turndown`, `typescript`, and `@types/node` are independently installed in all 4 packages, wasting disk space and risking version skew.
5. **No unified publishing workflow** — each package must be versioned and published manually. There's no mechanism to coordinate semver bumps when a shared dependency changes.
6. **Docker builds rely on implicit coupling** — both Dockerfiles use repo-root build context and manually `COPY` the shared library. This is fragile and requires knowledge of the internal directory layout.
7. **`legacy-peer-deps=true`** masks real dependency conflicts rather than resolving them.

---

## 2. Goals

| #   | Goal                                 | Measure of Success                                                                         |
| --- | ------------------------------------ | ------------------------------------------------------------------------------------------ |
| G1  | **Single lockfile** for all packages | One `pnpm-lock.yaml` at repo root; zero nested lockfiles                                   |
| G2  | **Dependency deduplication**         | Shared deps (`openai`, `typescript`, etc.) installed once in the content-addressable store |
| G3  | **Strict dependency isolation**      | Each package can only import dependencies it explicitly declares (no phantom deps)         |
| G4  | **Coordinated builds**               | `pnpm -r run build` builds `storyblok-services` before its consumers, in topological order |
| G5  | **Independent publishing**           | Each package can be published to npm independently with correct version references         |
| G6  | **Automated versioning**             | Changesets workflow bumps versions and publishes to npm via CI                             |
| G7  | **Local development ergonomics**     | Changes to `storyblok-services` are reflected in consumers immediately (symlinks)          |
| G8  | **Docker builds work**               | Both Dockerfiles build correctly in the monorepo layout, using pnpm                        |
| G9  | **Backward-compatible deployments**  | Kamal and Netlify deployments continue to work                                             |

### Non-Goals

- Migrating to a different bundler (webpack → Turbopack, esbuild, etc.) — out of scope.
- Upgrading Next.js from 13 to 14/15 — out of scope (can follow later).
- Changing the dual ESM+CJS build of `storyblok-services` — out of scope.
- Restructuring internal source code within any package — out of scope.

---

## 3. Proposed Solution

### 3.1 Tool Choices

| Concern                                  | Tool                               | Rationale                                                                                                                                                                                                                                                                                               |
| ---------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package management & build orchestration | **pnpm 9+**                        | Strict dependency isolation, content-addressable store, mature `workspace:` protocol, faster installs than npm. Built-in recursive commands (`pnpm -r`) run tasks in topological order. Built-in `--filter` with dependency selection (`...` prefix). No additional orchestrator needed for 4 packages. |
| Versioning & publishing                  | **Changesets** (`@changesets/cli`) | Per-package semver management, generates changelogs, replaces `workspace:*` with real versions at publish time. Integrates with CI via GitHub Action.                                                                                                                                                   |

> **Note on build orchestrators:** For a 4-package repo, pnpm's native recursive commands and filtering provide everything needed. If build times grow significantly in the future, **Turborepo** can be added as an optional enhancement for build caching and parallel execution — see [Appendix C: Optional Turborepo Enhancement](#appendix-c-optional-turborepo-enhancement). This is a 10-minute addition that requires no structural changes.

### 3.2 Target Directory Structure

```
storyblok-starter-premium/           ← Git root
├── .changeset/                      ← Changesets config
│   └── config.json
├── .github/
│   ├── copilot-instructions.md
│   └── workflows/
│       ├── ci.yml                   ← Build + test all packages
│       └── release.yml              ← Changesets publish workflow
├── .npmrc                           ← pnpm config (shamefully-hoist, peer deps)
├── package.json                     ← Root workspace config (private: true)
├── pnpm-workspace.yaml              ← Workspace package globs
├── pnpm-lock.yaml                   ← Single lockfile
├── docs/                            ← Shared documentation (stays at root)
├── packages/
│   ├── website/                     ← Next.js site
│   │   ├── package.json
│   │   ├── next.config.js
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   ├── netlify.toml
│   │   ├── middleware.ts
│   │   ├── plopfile.mjs
│   │   ├── sd.config.cjs
│   │   ├── index.scss
│   │   ├── fonts.scss
│   │   ├── pages/
│   │   ├── components/
│   │   ├── helpers/
│   │   ├── token/
│   │   ├── cms/
│   │   ├── scripts/
│   │   ├── plugins/
│   │   ├── public/
│   │   ├── resources/
│   │   └── types/
│   ├── storyblok-services/          ← Shared library
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsconfig.esm.json
│   │   ├── tsconfig.cjs.json
│   │   ├── jest.config.js
│   │   ├── src/
│   │   └── test/
│   ├── storyblok-mcp/                  ← MCP server
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   ├── schemas/
│   │   ├── config/
│   │   └── src/
│   └── storyblok-n8n/                   ← n8n community node
│       ├── package.json
│       ├── tsconfig.json
│       ├── jest.config.js
│       ├── gulpfile.js
│       ├── credentials/
│       ├── nodes/
│       ├── test/
│       └── workflows/
├── config/                          ← Root-level Kamal deploy configs
│   ├── deploy.yml                   ← Website deploy
│   └── deploy-mcp.yml              ← MCP server deploy (moved from storyblok-mcp/config/)
└── db/                              ← Umami analytics (stays at root)
    └── Dockerfile
```

### 3.3 Package Dependency Graph

```
@kickstartds/ruhmesmeile-storyblok-starter (website)
  └── @kickstartds/storyblok-services (workspace:*)

@kickstartds/storyblok-mcp-server
  └── @kickstartds/storyblok-services (workspace:*)

n8n-nodes-storyblok-kickstartds
  └── @kickstartds/storyblok-services (workspace:*)
```

All three consumers depend on `storyblok-services` via `workspace:*`. During `pnpm publish`, this is automatically replaced with the concrete version (e.g. `^1.2.3`), so published packages reference real npm versions.

---

## 4. Detailed Design

### 4.1 Root `package.json`

```jsonc
{
  "name": "@kickstartds/ruhmesmeile-storyblok-starter-monorepo",
  "private": true,
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "build": "pnpm -r run build",
    "dev:web": "pnpm --filter website dev",
    "dev:mcp": "pnpm --filter mcp-server dev",
    "typecheck": "pnpm -r run typecheck",
    "lint": "pnpm -r run lint",
    "test": "pnpm -r run test",
    "changeset": "changeset",
    "version-packages": "changeset version",
    "publish-packages": "changeset publish"
  },
  "devDependencies": {
    "@changesets/cli": "^2.27.0"
  }
}
```

**How `pnpm -r run build` works:** pnpm automatically detects the `workspace:*` dependency graph and runs `build` in topological order — `storyblok-services` first, then `website`, `mcp-server`, and `n8n-nodes` in parallel. No additional orchestration config needed.

### 4.2 `pnpm-workspace.yaml`

```yaml
packages:
  - "packages/*"
```

### 4.3 `.npmrc` (Root)

```properties
# Hoist packages that rely on implicit peer resolution (kickstartDS, Next.js)
shamefully-hoist=true

# Required for kickstartDS peer dependency chains
strict-peer-dependencies=false

# Use workspace protocol for local cross-references
link-workspace-packages=true
save-workspace-protocol=rolling
```

> **Why `shamefully-hoist=true`?**
> kickstartDS packages (`@kickstartds/core`, `@kickstartds/base`, etc.) and Next.js 13 rely on hoisted `node_modules` for module resolution. Strict isolation would break their internal imports. This flag gives us pnpm's content-addressable store benefits (dedup, speed) while maintaining Node.js-compatible resolution. We can progressively remove it once kickstartDS packages support strict isolation.

### 4.4 Build Orchestration (pnpm native)

pnpm's recursive commands handle task orchestration out of the box:

| Command                                | Behaviour                                                                                                                                                 |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm -r run build`                    | Runs `build` in every package that has it, in **topological order** (deps first). `storyblok-services` builds before its three consumers.                 |
| `pnpm --filter "...website" run build` | Builds `website` **and all its workspace dependencies** (i.e. `storyblok-services` first, then `website`). The `...` prefix means "include dependencies". |
| `pnpm --filter website dev`            | Runs `dev` in the website package only.                                                                                                                   |
| `pnpm -r run typecheck`                | Runs `typecheck` in all packages that define it.                                                                                                          |
| `pnpm -r run test`                     | Runs `test` in all packages that define it.                                                                                                               |

> **Important:** For `typecheck` and `test` to work correctly, `storyblok-services` must already be built (consumers import from its `dist/`). Either run `pnpm -r run build` first, or use `pnpm --filter "...{package}" run build && pnpm --filter {package} run typecheck` to ensure deps are compiled.
>
> If this becomes tedious, Turborepo can automate the "build deps before typecheck" pattern — see [Appendix C](#appendix-c-optional-turborepo-enhancement).

### 4.5 Package-Level Changes

#### 4.5.1 `packages/storyblok-services/package.json`

```diff
  "dependencies": {
    ...
  },
+ "publishConfig": {
+   "access": "public"
+ }
```

No other changes — the dual ESM+CJS build, exports map, and tsconfigs remain identical.

#### 4.5.2 `packages/website/package.json`

```diff
  "dependencies": {
-   "@kickstartds/storyblok-services": "file:shared/storyblok-services",
+   "@kickstartds/storyblok-services": "workspace:*",
    ...
  }
```

The website package stays `"private": true` since it's deployed as a Docker image, not published to npm.

#### 4.5.3 `packages/storyblok-mcp/package.json`

```diff
  "dependencies": {
-   "@kickstartds/storyblok-services": "file:../shared/storyblok-services",
+   "@kickstartds/storyblok-services": "workspace:*",
    ...
- }
+ },
+ "publishConfig": {
+   "access": "public"
+ }
```

#### 4.5.4 `packages/storyblok-n8n/package.json`

```diff
  "dependencies": {
-   "@kickstartds/storyblok-services": "file:../shared/storyblok-services",
+   "@kickstartds/storyblok-services": "workspace:*",
    ...
  }
```

The `repository.directory` field should be updated to `"packages/storyblok-n8n"`.

### 4.6 Changesets Configuration

#### `.changeset/config.json`

```jsonc
{
  "$schema": "https://github.com/changesets/changesets/blob/main/packages/config/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": ["@kickstartds/ruhmesmeile-storyblok-starter"]
}
```

Key decisions:

- **`"ignore"`** — the website is private and never published; Changesets skips it.
- **`"updateInternalDependencies": "patch"`** — when `storyblok-services` gets a patch bump, its consumers (MCP server, n8n node) also get a patch bump to their dependency range.
- **`"linked": []`** — packages are versioned independently (not in lockstep). A change to `mcp-server` doesn't bump `n8n-nodes`.

#### Publishing Workflow

```
Developer makes changes → adds changeset → merges PR
    ↓
Changesets GitHub Action opens a "Version Packages" PR
    ↓
Merge that PR → Changesets publishes changed packages to npm
```

### 4.7 Docker Builds

Both Dockerfiles must be rewritten for pnpm. The key pattern: **build context is the monorepo root**, and we use `pnpm deploy` to create a pruned production bundle.

#### 4.7.1 Website Dockerfile (`packages/website/Dockerfile`)

```dockerfile
FROM node:18-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache libc6-compat curl
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

FROM base AS deps
WORKDIR /app
# Copy workspace config
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc package.json ./
# Copy all package.json files for install
COPY packages/storyblok-services/package.json ./packages/storyblok-services/
COPY packages/website/package.json ./packages/website/
RUN pnpm install --frozen-lockfile

FROM base AS builder
ARG NEXT_STORYBLOK_SPACE_ID
ARG NEXT_STORYBLOK_API_TOKEN
ARG NEXT_STORYBLOK_OAUTH_TOKEN
ARG NEXT_OPENAI_API_KEY
ENV NEXT_STORYBLOK_SPACE_ID=$NEXT_STORYBLOK_SPACE_ID
ENV NEXT_STORYBLOK_API_TOKEN=$NEXT_STORYBLOK_API_TOKEN
ENV NEXT_STORYBLOK_OAUTH_TOKEN=$NEXT_STORYBLOK_OAUTH_TOKEN
ENV NEXT_OPENAI_API_KEY=$NEXT_OPENAI_API_KEY
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/storyblok-services/node_modules ./packages/storyblok-services/node_modules
COPY --from=deps /app/packages/website/node_modules ./packages/website/node_modules
COPY . .
# Build shared lib first, then website
RUN pnpm --filter @kickstartds/storyblok-services run build
RUN pnpm --filter @kickstartds/ruhmesmeile-storyblok-starter run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/packages/website/public ./public
RUN mkdir .next && chown 1001:1001 .next
COPY --from=builder --chown=1001:1001 /app/packages/website/.next/standalone ./
COPY --from=builder --chown=1001:1001 /app/packages/website/.next/static ./.next/static
COPY --from=builder --chown=1001:1001 /app/packages/website/public ./public
USER nextjs
EXPOSE 3030
ENV PORT=3030
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

#### 4.7.2 MCP Server Dockerfile (`packages/storyblok-mcp/Dockerfile`)

```dockerfile
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
# Copy workspace config
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc package.json ./
COPY packages/storyblok-services/package.json ./packages/storyblok-services/
COPY packages/storyblok-mcp/package.json ./packages/storyblok-mcp/
RUN pnpm install --frozen-lockfile
# Copy source
COPY packages/storyblok-services/ ./packages/storyblok-services/
COPY packages/storyblok-mcp/ ./packages/storyblok-mcp/
# Build
RUN pnpm --filter @kickstartds/storyblok-services run build
RUN pnpm --filter @kickstartds/storyblok-mcp-server run build

FROM node:20-alpine AS production
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
# Use pnpm deploy to create a pruned production bundle
COPY --from=builder /app ./
RUN pnpm --filter @kickstartds/storyblok-mcp-server deploy --prod /prod/mcp-server

WORKDIR /prod/mcp-server
# Copy runtime assets
COPY packages/storyblok-mcp/schemas/ ./schemas/
COPY docs/skills/ ./skills/

ENV NODE_ENV=production
ENV MCP_TRANSPORT=http
ENV MCP_PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1
RUN addgroup -g 1001 -S nodejs && adduser -S mcp -u 1001 -G nodejs
USER mcp
ENTRYPOINT ["node", "dist/index.js"]
```

> **`pnpm deploy`** is purpose-built for Docker: it copies the package and all its workspace dependencies into a self-contained directory with a flat `node_modules`, no symlinks. This produces the smallest possible production image.

### 4.8 Kamal Deploy Config Updates

#### `config/deploy.yml` (Website)

```diff
  builder:
    arch: amd64
+   context: .
+   dockerfile: packages/website/Dockerfile
    args:
      NEXT_STORYBLOK_API_TOKEN: ...
```

#### `config/deploy-mcp.yml` (MCP Server — moved from `storyblok-mcp/config/`)

```diff
  builder:
    arch: amd64
-   context: ../
-   dockerfile: Dockerfile
+   context: .
+   dockerfile: packages/storyblok-mcp/Dockerfile
```

Both configs use the repo root as build context, with explicit `dockerfile` paths.

### 4.9 Netlify Deployment

#### `packages/website/netlify.toml`

```diff
  [build]
-   command = "(npm run netlify-init && npm run build) || npm run build"
+   command = "npx pnpm install --frozen-lockfile && pnpm --filter @kickstartds/storyblok-services run build && pnpm --filter @kickstartds/ruhmesmeile-storyblok-starter run build"
    publish = ".next"
+   base = "/"
```

Alternatively, Netlify can be configured to use pnpm natively by setting the `PNPM_VERSION` environment variable. In that case:

```toml
[build.environment]
  PNPM_VERSION = "9.15.0"

[build]
  command = "pnpm --filter '...@kickstartds/ruhmesmeile-storyblok-starter' run build"
  publish = "packages/website/.next"
  base = "/"
```

### 4.10 CI Pipeline (New)

#### `.github/workflows/ci.yml`

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm -r run build
      - run: pnpm -r run typecheck
      - run: pnpm -r run test
      - run: pnpm -r run lint
```

#### `.github/workflows/release.yml`

```yaml
name: Release
on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          registry-url: "https://registry.npmjs.org"
      - run: pnpm install --frozen-lockfile
      - run: pnpm -r run build
      - name: Create Release Pull Request or Publish
        uses: changesets/action@v1
        with:
          publish: pnpm publish-packages
          version: pnpm version-packages
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## 5. Migration Plan

### Phase 1: Restructure Directories (No Functional Changes)

| Step | Action                                                                                                                                                                                                                                                                                                                                               | Risk                  |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| 1.1  | Create `packages/` directory                                                                                                                                                                                                                                                                                                                         | None                  |
| 1.2  | Move `shared/storyblok-services/` → `packages/storyblok-services/`                                                                                                                                                                                                                                                                                   | Low                   |
| 1.3  | Move `storyblok-mcp/` → `packages/storyblok-mcp/`                                                                                                                                                                                                                                                                                                          | Low                   |
| 1.4  | Move `n8n-nodes-storyblok-kickstartds/` → `packages/storyblok-n8n/`                                                                                                                                                                                                                                                                                      | Low                   |
| 1.5  | Move website files into `packages/website/` (all root-level app files: `pages/`, `components/`, `helpers/`, `token/`, `cms/`, `scripts/`, `plugins/`, `public/`, `resources/`, `types/`, `next.config.js`, `tsconfig.json`, `middleware.ts`, `plopfile.mjs`, `sd.config.cjs`, `index.scss`, `fonts.scss`, `next-env.d.ts`, `next-sitemap.config.js`) | Medium — largest move |
| 1.6  | Keep at root: `docs/`, `config/`, `db/`, `LICENSE-*`, `COPYRIGHT.md`, `README.md`, `.github/`                                                                                                                                                                                                                                                        | None                  |
| 1.7  | Delete all nested `package-lock.json` and `node_modules/`                                                                                                                                                                                                                                                                                            | None                  |

### Phase 2: Wire Up pnpm Workspaces

| Step | Action                                                                                 | Risk                                         |
| ---- | -------------------------------------------------------------------------------------- | -------------------------------------------- |
| 2.1  | Install pnpm globally (`corepack enable && corepack prepare pnpm@9.15.0 --activate`)   | None                                         |
| 2.2  | Create root `package.json` (private, workspaces)                                       | None                                         |
| 2.3  | Create `pnpm-workspace.yaml`                                                           | None                                         |
| 2.4  | Create root `.npmrc` with `shamefully-hoist=true` and `strict-peer-dependencies=false` | None                                         |
| 2.5  | Replace `file:` dependencies with `workspace:*` in all consumer `package.json` files   | Low                                          |
| 2.6  | Add `"packageManager": "pnpm@9.15.0"` to root `package.json`                           | None                                         |
| 2.7  | Run `pnpm install` from root — generates `pnpm-lock.yaml`                              | Medium — may surface real peer dep conflicts |
| 2.8  | Delete root `package-lock.json`                                                        | None                                         |
| 2.9  | Verify all packages build: `pnpm -r run build`                                         | Medium                                       |

### Phase 3: Add Root Scripts & Verify Orchestration

| Step | Action                                                                                                                                     | Risk |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| 3.1  | Add root `package.json` scripts: `build`, `dev:web`, `dev:mcp`, `typecheck`, `test`, `lint` using `pnpm -r` and `pnpm --filter` (see §4.1) | None |
| 3.2  | Verify `pnpm -r run build` builds all packages in correct topological order                                                                | Low  |
| 3.3  | Verify `pnpm --filter "...website" run build` builds services → website                                                                    | Low  |

### Phase 4: Add Changesets

| Step | Action                                                                                  | Risk |
| ---- | --------------------------------------------------------------------------------------- | ---- |
| 4.1  | Run `pnpm add -Dw @changesets/cli`                                                      | None |
| 4.2  | Run `pnpm changeset init` — creates `.changeset/config.json`                            | None |
| 4.3  | Configure: `"ignore": ["@kickstartds/ruhmesmeile-storyblok-starter"]`, `"access": "public"` | None |
| 4.4  | Add `publishConfig.access` to publishable packages                                      | None |

### Phase 5: Update Docker & Deployment

| Step | Action                                                                                                 | Risk   |
| ---- | ------------------------------------------------------------------------------------------------------ | ------ |
| 5.1  | Rewrite `packages/website/Dockerfile` for pnpm (see §4.7.1)                                            | Medium |
| 5.2  | Rewrite `packages/storyblok-mcp/Dockerfile` for pnpm (see §4.7.2)                                         | Medium |
| 5.3  | Move `storyblok-mcp/config/deploy.yml` → `config/deploy-mcp.yml`                                          | Low    |
| 5.4  | Update `config/deploy.yml` — add `dockerfile: packages/website/Dockerfile`                             | Low    |
| 5.5  | Update `config/deploy-mcp.yml` — change context to `.`, dockerfile to `packages/storyblok-mcp/Dockerfile` | Low    |
| 5.6  | Update `packages/website/netlify.toml` for pnpm build commands                                         | Low    |
| 5.7  | Test Docker builds locally: `docker build -f packages/website/Dockerfile .`                            | Medium |
| 5.8  | Test Kamal deploy: `kamal deploy` from root                                                            | Medium |

### Phase 6: Update CI & Documentation

| Step | Action                                                                     | Risk |
| ---- | -------------------------------------------------------------------------- | ---- |
| 6.1  | Create `.github/workflows/ci.yml`                                          | None |
| 6.2  | Create `.github/workflows/release.yml`                                     | None |
| 6.3  | Update `.github/copilot-instructions.md` — file paths, commands, workflows | Low  |
| 6.4  | Update `README.md`                                                         | Low  |
| 6.5  | Update `.gitignore` — add pnpm entries, update path prefixes               | None |
| 6.6  | Update `n8n-nodes` `repository.directory` field                            | None |

### Phase 7: Validation & Cleanup

| Step | Action                                                                          | Risk |
| ---- | ------------------------------------------------------------------------------- | ---- |
| 7.1  | Run full build: `pnpm -r run build`                                             | —    |
| 7.2  | Run all tests: `pnpm -r run test`                                               | —    |
| 7.3  | Run type checks: `pnpm -r run typecheck`                                        | —    |
| 7.4  | Test `pnpm dev` for website (dev server + SSL proxy)                            | —    |
| 7.5  | Test `pnpm --filter mcp-server dev` (TypeScript watch)                          | —    |
| 7.6  | Dry-run publish: `pnpm changeset publish --dry-run`                             | —    |
| 7.7  | Remove leftover `shared/` directory                                             | —    |
| 7.8  | Verify Storyblok Visual Editor preview still works at `https://localhost:3010/` | —    |

---

## 6. Path Mapping & File Moves

This is the complete list of files/directories that move, for use during implementation.

### Website (Root → `packages/website/`)

| Source (current)         | Destination                               |
| ------------------------ | ----------------------------------------- |
| `pages/`                 | `packages/website/pages/`                 |
| `components/`            | `packages/website/components/`            |
| `helpers/`               | `packages/website/helpers/`               |
| `token/`                 | `packages/website/token/`                 |
| `cms/`                   | `packages/website/cms/`                   |
| `scripts/`               | `packages/website/scripts/`               |
| `plugins/`               | `packages/website/plugins/`               |
| `public/`                | `packages/website/public/`                |
| `resources/`             | `packages/website/resources/`             |
| `types/`                 | `packages/website/types/`                 |
| `next.config.js`         | `packages/website/next.config.js`         |
| `tsconfig.json`          | `packages/website/tsconfig.json`          |
| `middleware.ts`          | `packages/website/middleware.ts`          |
| `plopfile.mjs`           | `packages/website/plopfile.mjs`           |
| `sd.config.cjs`          | `packages/website/sd.config.cjs`          |
| `index.scss`             | `packages/website/index.scss`             |
| `fonts.scss`             | `packages/website/fonts.scss`             |
| `next-env.d.ts`          | `packages/website/next-env.d.ts`          |
| `next-sitemap.config.js` | `packages/website/next-sitemap.config.js` |
| `netlify.toml`           | `packages/website/netlify.toml`           |
| `Dockerfile`             | `packages/website/Dockerfile`             |

### Shared Services

| Source                       | Destination                    |
| ---------------------------- | ------------------------------ |
| `shared/storyblok-services/` | `packages/storyblok-services/` |

### MCP Server

| Source                         | Destination                                                  |
| ------------------------------ | ------------------------------------------------------------ |
| `storyblok-mcp/`                  | `packages/storyblok-mcp/`                                       |
| `storyblok-mcp/config/deploy.yml` | `config/deploy-mcp.yml` (also keep copy for backward compat) |

### n8n Nodes

| Source                             | Destination           |
| ---------------------------------- | --------------------- |
| `n8n-nodes-storyblok-kickstartds/` | `packages/storyblok-n8n/` |

### Stays at Root

| Path                                            | Reason                                        |
| ----------------------------------------------- | --------------------------------------------- |
| `docs/`                                         | Shared documentation across all packages      |
| `config/`                                       | Kamal deployment configs (repo-level concern) |
| `db/`                                           | Umami analytics (independent infrastructure)  |
| `.github/`                                      | GitHub configuration                          |
| `LICENSE-MIT`, `LICENSE-APACHE`, `COPYRIGHT.md` | Repo-level legal                              |
| `README.md`                                     | Repo-level readme (rewritten for monorepo)    |

---

## 7. `.gitignore` Updates

```gitignore
# pnpm
pnpm-debug.log*

# Dependencies — all packages
**/node_modules/

# Package lockfiles (only pnpm-lock.yaml at root)
**/package-lock.json
**/yarn.lock

# Build outputs
**/dist/
packages/website/.next/
packages/website/out/

# ... (existing entries, updated for packages/website/ prefix where needed)
```

---

## 8. Impact on Developer Commands

### Daily Workflows

| Action                   | Before                                          | After                                                          |
| ------------------------ | ----------------------------------------------- | -------------------------------------------------------------- |
| Install deps             | `npm install` (+ cd into each sub-package)      | `pnpm install` (from root, once)                               |
| Build everything         | Manual per-package                              | `pnpm -r run build`                                            |
| Build one package + deps | `cd shared/storyblok-services && npm run build` | `pnpm --filter "...@kickstartds/storyblok-services" run build` |
| Dev server (website)     | `npm run dev`                                   | `pnpm --filter website dev`                                    |
| Dev server (MCP)         | `cd mcp-server && npm run dev`                  | `pnpm --filter mcp-server dev`                                 |
| Run all tests            | Manual per-package                              | `pnpm -r run test`                                             |
| Run one package's tests  | `cd shared/storyblok-services && npm test`      | `pnpm --filter storyblok-services test`                        |
| Add a dep to website     | `npm install foo`                               | `pnpm --filter website add foo`                                |
| Add a shared dev dep     | N/A                                             | `pnpm add -Dw foo`                                             |
| Create a changeset       | N/A                                             | `pnpm changeset`                                               |
| Publish packages         | Manual `npm publish` per package                | `pnpm changeset publish`                                       |

### CMS Sync Commands

These scripts stay in `packages/website/package.json` and are run with `pnpm --filter website`:

```bash
pnpm --filter website push-components
pnpm --filter website generate-content-types
pnpm --filter website create-storyblok-config
pnpm --filter website extract-tokens
```

---

## 9. Risks & Mitigations

| Risk                                                   | Likelihood | Impact | Mitigation                                                                                                                                                                                             |
| ------------------------------------------------------ | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Peer dependency resolution differs in pnpm**         | High       | Medium | `shamefully-hoist=true` + `strict-peer-dependencies=false` in `.npmrc`. Can be tightened later.                                                                                                        |
| **Next.js standalone output breaks**                   | Medium     | High   | `output: "standalone"` in Next.js includes `node_modules` in output. Test with pnpm's hoisted layout early in Phase 2. May need `outputFileTracingRoot` in `next.config.js` pointing to monorepo root. |
| **`transpilePackages` resolution changes**             | Medium     | Medium | kickstartDS packages listed in `transpilePackages` must resolve correctly through pnpm's symlinked `node_modules`. Test early.                                                                         |
| **Storyblok CLI (`storyblok push-components`) breaks** | Low        | Low    | CLI is invoked via npm scripts — pnpm runs them identically. Env vars loaded via `dotenvx`.                                                                                                            |
| **Netlify build breaks**                               | Medium     | Low    | Set `PNPM_VERSION` env var in Netlify. May need `base` directory config. Test with `netlify build --context=production`.                                                                               |
| **Docker layer caching invalidation**                  | Low        | Low    | Structured COPYs (lockfile first, then source) preserve layer caching. `pnpm fetch` can further optimize.                                                                                              |
| **n8n node CJS build breaks**                          | Low        | Medium | n8n requires CJS output. `storyblok-services` already provides CJS via `dist/cjs/`. pnpm resolves `workspace:*` to the local package with correct exports map.                                         |

### Next.js `outputFileTracingRoot`

The most likely issue is that Next.js standalone output can't trace dependencies outside `packages/website/`. The fix is:

```javascript
// packages/website/next.config.js
const path = require("path");

const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"), // monorepo root
  // ... rest of config
};
```

This tells Next.js to look for dependencies relative to the monorepo root, which is where pnpm hoists them.

---

## 10. Success Criteria

- [ ] `pnpm install` from repo root installs all packages (single `pnpm-lock.yaml`)
- [ ] `pnpm -r run build` builds all 4 packages in correct order (services → website, mcp, n8n)
- [ ] `pnpm -r run test` runs all test suites
- [ ] `pnpm -r run typecheck` passes for all packages
- [ ] `pnpm --filter website dev` starts Next.js dev server with SSL proxy
- [ ] Storyblok Visual Editor preview works at `https://localhost:3010/`
- [ ] `docker build -f packages/website/Dockerfile .` produces working image
- [ ] `docker build -f packages/storyblok-mcp/Dockerfile .` produces working image
- [ ] `kamal deploy` from root deploys website successfully
- [ ] `pnpm changeset` creates a changeset file
- [ ] `pnpm changeset publish --dry-run` shows correct packages to publish
- [ ] `@kickstartds/storyblok-services` published to npm with real version (no `workspace:` in published `package.json`)
- [ ] No `file:` references remain in any `package.json`
- [ ] No nested `package-lock.json` files remain

---

## 11. Open Questions

| #   | Question                                                                                                                                                                                                                    | Decision Needed By |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Q1  | Should the website package name change from `@kickstartds/ruhmesmeile-storyblok-starter` to something shorter (e.g. `@kickstartds/website`)? It's private so it doesn't matter for npm, but affects `pnpm --filter` ergonomics. | Phase 1            |
| Q2  | Should we add more `pnpm --filter` aliases in the root `package.json` scripts (e.g. `"test:services": "pnpm --filter storyblok-services test"`)?                                                                            | Phase 3            |
| Q3  | Should the MCP server also be published to npm (as a standalone CLI) in addition to Docker? Its `package.json` already has a `bin` field.                                                                                   | Phase 4            |
| Q4  | Do we need a `packages/shared-config/` package for shared TypeScript/ESLint configs, or is the repo too small for that?                                                                                                     | Post-migration     |
| Q5  | Should Turborepo be added later for build caching? See [Appendix C](#appendix-c-optional-turborepo-enhancement). Only worth it if build times exceed ~2 minutes.                                                            | Post-migration     |

---

## Appendix A: Why pnpm Over npm Workspaces

| Concern                   | npm workspaces                                 | pnpm workspaces                                                                                     |
| ------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Dependency isolation**  | Flat `node_modules`, phantom deps possible     | Content-addressable store, strict by default (relaxed with `shamefully-hoist` for compat)           |
| **Install speed**         | Slower (copies to `node_modules`)              | Faster (hard links from store)                                                                      |
| **Disk usage**            | Full copies per project                        | Shared content-addressable store across all projects on machine                                     |
| **`workspace:` protocol** | Supported since npm 7, but less mature         | First-class, well-tested, `pnpm publish` auto-replaces with real versions                           |
| **`pnpm deploy`**         | No equivalent                                  | Creates pruned, self-contained production bundles — ideal for Docker                                |
| **Filtering**             | `--workspace` flag, verbose                    | `--filter` with glob/name/path support                                                              |
| **Lockfile stability**    | `package-lock.json` churn on unrelated changes | `pnpm-lock.yaml` is more stable across runs                                                         |
| **Ecosystem**             | Default, no setup                              | Requires `corepack enable` or global install; well-supported by all CI providers and Netlify/Vercel |

The main tradeoff is needing `shamefully-hoist=true` for kickstartDS compatibility, but this is a temporary concession that can be removed once the kickstartDS packages properly declare their peer dependencies.

---

## Appendix B: Reference Commands

```bash
# First-time setup
corepack enable
corepack prepare pnpm@9.15.0 --activate
pnpm install

# Build all (topological order — services first, then consumers)
pnpm -r run build

# Build one package + its workspace deps
pnpm --filter "...@kickstartds/storyblok-services" run build
pnpm --filter "...website" run build    # builds services, then website

# Dev (website only)
pnpm --filter website dev

# Dev (MCP server — TypeScript watch)
pnpm --filter mcp-server dev

# Run all tests / type checks
pnpm -r run test
pnpm -r run typecheck

# Run tests for one package
pnpm --filter storyblok-services test

# Add dependency to a package
pnpm --filter website add some-package
pnpm --filter mcp-server add -D @types/something

# Add root dev dependency
pnpm add -Dw some-dev-tool

# Run CMS scripts
pnpm --filter website push-components
pnpm --filter website generate-content-types
pnpm --filter website create-storyblok-config
pnpm --filter website extract-tokens

# Changesets workflow
pnpm changeset                    # create a changeset
pnpm changeset version            # bump versions
pnpm changeset publish            # publish to npm

# Docker
docker build -f packages/website/Dockerfile -t website .
docker build -f packages/storyblok-mcp/Dockerfile -t mcp-server .

# Kamal
cd config && kamal deploy          # website
cd config && kamal deploy -d deploy-mcp.yml  # MCP server
```

---

## Appendix C: Optional Turborepo Enhancement

If build times grow or the "build deps before typecheck" pattern becomes tedious, Turborepo can be added as a drop-in enhancement. **No structural changes required** — it layers on top of pnpm workspaces.

### When to add Turborepo

- Full `pnpm -r run build` exceeds ~2 minutes
- You're frequently running `typecheck` or `test` and want automatic dep-builds
- You want CI build caching (local or remote via Vercel)

### How to add it (10-minute setup)

**1. Install:**

```bash
pnpm add -Dw turbo
```

**2. Create `turbo.json`:**

```jsonc
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"],
      "env": [
        "NEXT_STORYBLOK_API_TOKEN",
        "NEXT_STORYBLOK_OAUTH_TOKEN",
        "NEXT_STORYBLOK_SPACE_ID",
        "NEXT_OPENAI_API_KEY"
      ]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {}
  }
}
```

The `"dependsOn": ["^build"]` means "before running `typecheck` in this package, run `build` in all its workspace dependencies". This eliminates the need to manually build `storyblok-services` before type-checking consumers.

**3. Update root scripts:**

```jsonc
{
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "lint": "turbo run lint"
  }
}
```

**4. Add `.turbo/` to `.gitignore`.**

### What Turborepo adds over plain pnpm

| Feature                                         | pnpm alone     | pnpm + Turborepo        |
| ----------------------------------------------- | -------------- | ----------------------- |
| Topological build order                         | ✅ (`pnpm -r`) | ✅                      |
| Task-level dep graph ("typecheck needs ^build") | ❌ Manual      | ✅ Automatic            |
| Build caching (skip unchanged packages)         | ❌             | ✅ Local cache          |
| Remote caching (share across CI/team)           | ❌             | ✅ Via Vercel           |
| Parallel execution within topo levels           | ✅             | ✅ (smarter scheduling) |
