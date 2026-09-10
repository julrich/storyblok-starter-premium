# Storyblok Config Update — Implementation Checklist

> **Created:** 2026-03-08
> **PRD:** [storyblok-config-update-analysis.md](../research/storyblok-config-update-analysis.md) > **ADR:** [adr-storyblok-config-merge.md](../../adr/adr-storyblok-config-merge.md)

---

## Phase 2: CLI v4 Upgrade (prerequisite) ✅

- [x] **2a. Upgrade Storyblok CLI dependency**

  - [x] Replace `storyblok@^3.30.0` with `storyblok@^4.15.2` in `packages/website/package.json` devDependencies (installed 4.16.0)
  - [x] Run `pnpm install` and verify no workspace conflicts

- [x] **2b. Create `storyblok.config.ts`**

  - [x] Create `packages/website/storyblok.config.ts` with region, space, retry config
  - [x] Confirm env vars (`NEXT_STORYBLOK_SPACE_ID`, `STORYBLOK_REGION`) are read correctly

- [x] **2c. Migrate npm scripts to v4 CLI syntax**

  - [x] Update `storyblok-pull-content-schema` — `pull-components` → `components pull`
  - [x] Update `storyblok-push-components` — `push-components` → `components push`
  - [x] Add `rename-generated-config` script (`mv components.123456.json → components.generated.json`)
  - [x] Add `merge-storyblok-config` script (with `dotenvx` for env vars)
  - [x] Add `push-components-dry-run` script
  - [x] Add `push-component` script (single-component push with `--filter`)
  - [x] Add `update-storyblok-config` script (full workflow: generate → rename → pull → merge → push)

- [x] **2d. Update `.gitignore`**

  - [x] Add `.storyblok/` directory
  - [x] Add `packages/website/cms/merged/`
  - [x] Add `packages/website/cms/components.generated.json`
  - [x] Add `packages/website/cms/presets.generated.json`
  - [x] Add `packages/website/cms/merge-report.json`

- [x] **2e. Test CLI v4 basics**
  - [x] Test `storyblok components pull` works (auth via `storyblok login --token`)
  - [x] Test `dotenvx` + config file env var availability
  - [x] Test monolithic JSON vs separated directory format for `components push`
  - [x] Document findings in ADR (ADR-008, ADR-009)

---

## Phase 1: Merge Script ✅

- [x] **1a. Create `packages/website/scripts/mergeStoryblokConfig.ts`**

  - [x] CLI argument parsing (`--component`, `--dry-run`, `--generated`, `--live`, `--visibility-path`, `--output`)
  - [x] Load generated config (`cms/components.generated.json`) — handles both v3 `{components:[]}` and v4 bare array
  - [x] Load live config (`types/components-schema.json`) — handles both formats
  - [x] Load visibility overlay files (configurable directory, default `cms/visibility/`)
  - [x] Build per-component hidden field sets from `x-cms-hidden: true` annotations

- [x] **1b. Implement component-level merge**

  - [x] Name-based matching (generated → live)
  - [x] New components (no live match) pass through as-is
  - [x] Existing components: start from live base, apply generated deltas

- [x] **1c. Implement field-level merge rules**

  - [x] Fields present in both → replace with generated version
  - [x] Fields only in live + `x-cms-hidden: true` → drop
  - [x] Fields only in live + no visibility annotation → preserve (manually-added)
  - [x] Fields only in generated → add
  - [x] Default: fields with no visibility annotation are treated as "not hidden"

- [x] **1d. Implement property-level merge rules**

  - [x] `component_group_uuid` → keep live value (via live base spread)
  - [x] `component_group_name` → keep live value (via live base spread)
  - [x] `component_group_whitelist` → keep live values (no longer generated upstream; only present in legacy live configs)
  - [x] `component_whitelist` → additive-only merge (live + new from generated)
  - [x] `id`, `created_at` → keep live values (via live base spread)
  - [x] `is_root`, `is_nestable` → use generated values
  - [x] Metadata (`description`, `image`, `preview_field`, etc.) → keep live values (via live base spread)

- [x] **1e. Implement tab UUID mapping**

  - [x] Extract ordered tab list from generated and live schemas
  - [x] Position-based matching (1st → 1st, 2nd → 2nd, etc.)
  - [x] Replace generated tab UUIDs with live tab UUIDs
  - [x] Extra generated tabs (no live match) keep generated UUIDs

- [x] **1f. Implement preset merge**

  - [x] Merge presets normally (no special collision workaround)
  - [x] Live presets as base, new generated presets added

- [x] **1g. Implement output**

  - [x] Write merged components to `cms/merged/components/{spaceId}/` in v4 bare-array format
  - [x] Write groups from live to `cms/merged/components/{spaceId}/groups.json`
  - [x] Write merged presets to `cms/merged/components/{spaceId}/presets.json`
  - [x] Write merge report to `cms/merge-report.json`
  - [x] Report format: per-component summary (fields added, preserved, dropped, replaced)
  - [x] Support `--dry-run` (report only, no file output)
  - [x] Support `--component <name>` (single-component merge)

- [x] **1h. Test merge script**
  - [x] Run against current generated + live configs (77 generated → 76 live → 8 new, 69 merged)
  - [x] Verify manually-added fields are preserved (`buttons.icon`, `split-even.stretchContent`, `event-filter.datePicker_*`)
  - [x] Verify visibility-hidden fields are dropped (tested in Phase 4 — 44 fields across 16 components correctly removed)
  - [x] Verify tab UUIDs are mapped from live (position-based mapping working)
  - [x] Verify component group UUIDs come from live (live base spread)
  - [x] Verify component_whitelist is additive-only (no changes in current test)
  - [x] Verify new components pass through (8 new: 6 tab components + componentTypes + token-theme)

---

## Phase 3: Safe Push Workflow ✅

- [x] **3a. End-to-end test**

  - [x] Run `create-storyblok-config` → `rename-generated-config` → `pull-content-schema` → `merge-storyblok-config`
  - [x] Review `merge-report.json` (77 merged, 0 new, 0 preserved/dropped — clean merge on fresh space)
  - [x] Run `push-components-dry-run` and verify output (reviewed merge report)
  - [x] Push for real (80 updated: 77 components + 2 groups + 1 preset, 0 failed)
  - [x] Regenerate TypeScript types (`generate-content-types` — types/components-schema.d.ts updated)

- [x] **3b. Single-component test**
  - [x] Test `merge-storyblok-config -- --component section` (1 component, 25 fields replaced, 2 tabs mapped)
  - [x] Test `push-component -- "section"` (1 updated, 0 failed)

---

## Phase 4: Activate Visibility Layer ✅

- [x] **4a. Update `create-storyblok-config` to include visibility layer**

  - [x] Add `cms/visibility` to `--schema-paths`
  - [x] Add `visibility` to `--layer-order` (new order: `visibility language cms schema`)

- [x] **4b. Run full workflow with visibility**
  - [x] Verify hidden fields are dropped from generated config (0 leaks across 22 components with hidden fields)
  - [x] Verify merge handles visibility-dropped fields correctly (44 hidden fields across 16 components removed from merged output; live hero went from 20→14 fields)
  - [x] Push successfully (80 updated, 0 failed)
  - [x] Post-push pull confirms hidden fields are removed from live Storyblok space
  - [x] TypeScript types regenerated
  - [x] Verify Storyblok editor experience (confirmed — hidden fields no longer appear in Visual Editor)

---

## Notes

- Phase 5 (preset collision fix) is **dropped** — fixed upstream
- CLI v4 upgrade is a **prerequisite** for the merge script
- Questions 1–3 (file format, auth, env vars) are tested during Phase 2e
