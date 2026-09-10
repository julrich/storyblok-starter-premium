# ADR: Monorepo Integration Decisions

**Status:** Active
**Date:** 2026-03-06
**Context:** Integrating 4 packages into the `storyblok-starter-premium` monorepo (branch `feature/inline-more-projects`)

---

## ADR-001: Rename `@kickstartds/ds-agency-premium` → `@kickstartds/design-system`

**Decision:** Rename the package to match its directory name and new identity.

**Rationale:**
- The directory is `packages/design-system`, and the monorepo convention is to match npm name to directory
- `ds-agency-premium` is a legacy name from when the design system was a standalone commercial product
- The new name `@kickstartds/design-system` is clearer and more generic
- User confirmed: "We can rename the package `@kickstartds/ds-agency-premium`, too. We'll publish under the new name, if needed."

**Consequences:**
- All import paths across `website`, `mcp-server`, `design-tokens-editor` must change
- CLI script paths referencing `node_modules/@kickstartds/ds-agency-premium/` must update
- `copilot-instructions.md` must update
- If ever published to npm, it will be under the new name (breaking change for external consumers)

---

## ADR-002: Defer npm Publishing

**Decision:** Do not set up npm publishing for any of the four new packages at this time. All packages are consumed via `workspace:*` protocol within the monorepo.

**Rationale:**
- User stated: "For the moment moving this into the monorepo here should be enough so we don't even need to publish for now."
- `publishConfig` and `files` fields are added for future readiness but no publish workflow is configured
- The design-tokens-editor is `private: true` and will never be published

**Consequences:**
- Changesets `version-packages` and `publish-packages` scripts exist but won't publish the new packages until explicitly set up
- External consumers of `@kickstartds/ds-agency-premium` (if any) must continue using the old npm package at the old version

---

## ADR-003: Keep MCP Servers as Plain JavaScript (Phase 1–2)

**Decision:** During Phases 1–2, keep `component-builder-mcp` and `design-tokens-mcp` as plain JavaScript. TypeScript migration is deferred to Phase 5.

**Rationale:**
- Both MCP servers work correctly as-is
- TypeScript migration of 1,630-line and 4,675-line monolithic files is a significant effort (WP-3, effort "L")
- Immediate priority is workspace resolution, dependency wiring, and build integration
- The servers don't export types consumed by other packages, so the lack of `.d.ts` files doesn't block anything

**Consequences:**
- `build` and `typecheck` scripts for these packages will be no-ops or simple copy operations until Phase 5
- `pnpm -r run typecheck` will skip these two packages gracefully
- No type safety on these codebases until migration

---

## ADR-004: Design System Build Pipeline — Keep Rollup

**Decision:** Keep the existing Rollup-based build pipeline for the design-system package. Do not migrate to `tsc` or Vite.

**Rationale:**
- The design-system has a complex output structure with multiple entry points (`exports` map with 8+ patterns)
- Rollup handles CSS bundling, asset copying, and the multi-format output required
- Other monorepo libraries use `tsc`, but the design-system's needs exceed what `tsc` alone can produce
- The PRD explicitly states this is out of scope

**Consequences:**
- The design-system build is slower and more complex than other packages
- Rollup configuration is a single point of complexity that only applies to this package
- `npm-run-all` (`run-s`/`run-p`) is used in the design-system's scripts and will continue to be used

---

## ADR-005: Replace `yarn` Script References with Generic Commands

**Decision:** In the design-system's `package.json` scripts, replace `yarn <script>` with `pnpm run <script>` (or the tool's bare command where applicable).

**Rationale:**
- pnpm is the monorepo package manager; `yarn` is not available
- `yarn <script>` → `pnpm run <script>` is a safe 1:1 replacement
- `npm-run-all` (`run-s`, `run-p`) is package-manager-agnostic and stays unchanged
- Bare commands like `storybook dev`, `rollup -c`, `tsc` don't need a package manager prefix

**Consequences:**
- All scripts in `packages/design-system/package.json` will work with `pnpm run`
- The `prepare` script's `husky install` will be removed (WP-8, husky moves to root)

---

## ADR-010: Remove Design System `prepublishOnly` and `husky:precommit` Scripts

**Decision:** Remove both scripts from the design-system package.json during integration.

**Rationale:**
- `prepublishOnly` runs during `pnpm install` and fails because the full build toolchain isn't set up yet in the monorepo context
- Publishing is deferred (ADR-002), so the script serves no purpose
- `husky:precommit` references `yarn` and is part of the standalone-era git hooks setup (`.husky/` will be removed in WP-8)
- A `prepublishOnly` script can be re-added when npm publishing is configured

**Consequences:**
- `pnpm install` no longer triggers a full design-system build
- The design-system must be built explicitly via `pnpm --filter @kickstartds/design-system build`

---

## ADR-006: Patches Strategy — Move to Root

**Decision:** Move all per-package patches to the root `patches/` directory and register them in root `pnpm.patchedDependencies`.

**Packages affected:**
- `packages/design-system/patches/` — 4 patches (patch-package format)
- `packages/design-tokens-editor/patches/` — 1 patch (`@glidejs/glide`)

**Rationale:**
- Root `pnpm.patchedDependencies` is the established pattern (already has `@kickstartds/base@4.2.0`)
- pnpm's built-in patching is preferred over `patch-package` (which the design-system currently uses)
- Centralized patches are easier to audit and maintain

**Consequences:**
- `patch-package` devDependency can be removed from the design-system
- The `prepare` script in design-system (`patch-package && husky install`) will be removed entirely
- All patches must be verified to apply correctly from the root context
- If patches conflict with pnpm's format, they may need to be regenerated via `pnpm patch`

---

## ADR-007: Design Tokens Editor Deployment — Decision Pending

**Decision:** Deferred. The design-tokens-editor currently deploys via Netlify. A decision on whether to keep Netlify or migrate to Kamal is needed but not blocking for Phase 1–2.

**Options:**
1. **Keep Netlify**: Update `netlify.toml` build commands for monorepo context
2. **Migrate to Kamal**: Create Dockerfile + `config/deploy-design-tokens-editor.yml`, migrate Netlify Blobs storage

**Considerations:**
- Netlify provides serverless functions (used for theme persistence) and blob storage
- Kamal would require a persistent server and alternative storage
- The editor is `private: true` and low-traffic — Netlify free tier may be sufficient

---

## ADR-008: Per-Package `.gitignore` Approach

**Decision:** Keep lightweight per-package `.gitignore` files containing only `node_modules` and `dist` (and package-specific build outputs). All other ignores are handled by the root `.gitignore`.

**Rationale:**
- Matches the existing pattern in `packages/storyblok-services/.gitignore` and `packages/storyblok-mcp/.gitignore`
- Root `.gitignore` handles cross-cutting concerns (lockfiles, `.env`, tooling caches)
- Per-package files ensure `dist/` is ignored even if someone runs git commands from within a package directory

---

## ADR-009: Changeset Ignore List for Private Packages

**Decision:** Add `@kickstartds/design-tokens-editor` and `@kickstartds/schema-layer-editor` to the Changesets `ignore` array, alongside the existing `@kickstartds/ruhmesmeile-storyblok-starter` (website).

**Rationale:**
- Private packages (`private: true`) should not participate in version bumping or changelog generation
- The website is already ignored; both editors follow the same pattern

**Consequences:**
- `changeset version` will skip these packages
- Changes to ignored packages won't trigger version bumps in dependent packages

---

## ADR-011: Design System `typecheck` Known Failure

**Decision:** The `typecheck` script (`tsc --noEmit`) is added to the design-system but is expected to fail with pre-existing type errors (e.g., `Cannot find type definition file for 'minimatch'`).

**Rationale:**
- The design-system previously had no typecheck script and uses `strict: false`
- Fixing all type errors is out of scope for the integration work
- The Rollup build works independently of `tsc --noEmit` (it uses `@rollup/plugin-typescript`)

**Consequences:**
- `pnpm -r run typecheck` will fail on the design-system package
- Consumers can run `pnpm -r --filter '!@kickstartds/design-system' run typecheck` to skip it
- Fixing the type errors is a future improvement (separate from this integration)
