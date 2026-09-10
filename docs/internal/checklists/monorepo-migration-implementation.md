# Monorepo Migration — Implementation Checklist

Tracks progress of implementing the [monorepo-migration-prd.md](../prd/monorepo-migration-prd.md).

---

## Phase 1: Restructure Directories

- [x] 1.1 Create `packages/` directory
- [x] 1.2 Move `shared/storyblok-services/` → `packages/storyblok-services/`
- [x] 1.3 Move `storyblok-mcp/` → `packages/storyblok-mcp/`
- [x] 1.4 Move `n8n-nodes-storyblok-kickstartds/` → `packages/storyblok-n8n/`
- [x] 1.5 Move website files into `packages/website/` (pages, components, helpers, token, cms, scripts, plugins, public, resources, types, next.config.js, tsconfig.json, middleware.ts, plopfile.mjs, sd.config.cjs, index.scss, fonts.scss, next-env.d.ts, next-sitemap.config.js, netlify.toml, Dockerfile)
- [x] 1.6 Move website `package.json` to `packages/website/package.json` (strip workspace-only concerns)
- [x] 1.7 Delete all nested `package-lock.json` and `node_modules/`
- [x] 1.8 Verify git tracks moves correctly (`git status`)

## Phase 2: Wire Up pnpm Workspaces

- [x] 2.1 Create root `package.json` (private, packageManager field)
- [x] 2.2 Create `pnpm-workspace.yaml`
- [x] 2.3 Create root `.npmrc` (shamefully-hoist, strict-peer-dependencies)
- [x] 2.4 Replace `file:` deps with `workspace:*` in website `package.json`
- [x] 2.5 Replace `file:` deps with `workspace:*` in mcp-server `package.json`
- [x] 2.6 Replace `file:` deps with `workspace:*` in n8n-nodes `package.json`
- [x] 2.7 Update `n8n-nodes` `repository.directory` field
- [x] 2.8 Add `publishConfig.access` to storyblok-services `package.json`
- [x] 2.9 Add `publishConfig.access` to mcp-server `package.json`
- [x] 2.10 Delete old root `package-lock.json`
- [x] 2.11 Run `pnpm install` from root
- [x] 2.12 Verify `pnpm -r run build` succeeds (storyblok-services builds first)

## Phase 3: Root Scripts & Orchestration

- [x] 3.1 Add root scripts: build, dev:web, dev:mcp, typecheck, test, lint, changeset scripts
- [x] 3.2 Verify `pnpm -r run build` topological order
- [x] 3.3 Verify `pnpm --filter "...website" run build` builds services → website

## Phase 4: Add Changesets

- [x] 4.1 Install `@changesets/cli` at root
- [x] 4.2 Initialize changesets config
- [x] 4.3 Configure ignore, access, updateInternalDependencies

## Phase 5: Update Docker & Deployment

- [x] 5.1 Rewrite `packages/website/Dockerfile` for pnpm
- [x] 5.2 Rewrite `packages/storyblok-mcp/Dockerfile` for pnpm
- [x] 5.3 Update `config/deploy.yml` for new paths
- [x] 5.4 Move MCP deploy config to `config/deploy-mcp.yml`
- [x] 5.5 Update `packages/website/netlify.toml` for pnpm
- [x] 5.6 Add `outputFileTracingRoot` to `packages/website/next.config.js`

## Phase 6: Update CI & Documentation

- [x] 6.1 Create `.github/workflows/ci.yml`
- [x] 6.2 Create `.github/workflows/release.yml`
- [x] 6.3 Update `.gitignore` for monorepo
- [x] 6.4 Update `.github/copilot-instructions.md`
- [x] 6.5 Update `README.md`

## Phase 7: Validation

- [x] 7.1 `pnpm install` works cleanly
- [x] 7.2 `pnpm -r run build` succeeds (library packages; website requires API tokens)
- [x] 7.3 `pnpm -r run typecheck` succeeds (covered by build for TS packages)
- [ ] 7.4 `pnpm -r run test` succeeds (requires API tokens / test env)
- [x] 7.5 No `file:` references remain in any `package.json`
- [x] 7.6 No nested `package-lock.json` files remain
- [x] 7.7 Workspace resolution verified (`link:../storyblok-services` for all consumers)
