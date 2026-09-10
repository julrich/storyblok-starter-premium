# ADR: Storyblok Config Merge Strategy

> **Status:** Accepted
> **Created:** 2026-03-08
> **Context:** [storyblok-config-update-analysis.md](../internal/research/storyblok-config-update-analysis.md)

---

## ADR-001: Merge-before-push strategy

**Decision:** Use Strategy A — a merge script sits between `create-storyblok-config` and `storyblok components push`. The script reads both generated and live configs, merges per-component/per-field, and outputs a safe-to-push config.

**Rationale:** The Storyblok CLI (both v3 and v4) does **full schema replacement** per component on push. There is no field-level merge. Pushing the raw generated config would destroy ~20 manually-added fields and break UUID-based component whitelists. The merge script is necessary regardless of CLI version.

**Alternatives considered:**

- Strategy B (single-component push) — still requires merge; CLI push is still full-replacement
- Strategy C (Management API directly) — more control but more code; CLI v4 provides enough tooling (`--dry-run`, `--filter`, config file)

---

## ADR-002: Additive-only component whitelist merge

**Decision:** `component_whitelist` values on blok fields are merged **additively** — live entries are always preserved, generated entries are added. Entries are never removed.

**Rationale:** Live whitelists may contain manually-added components (e.g. `prompter` in `page.section`) that are not in the generated config. Removing them would break the Visual Editor's ability to place those components. There is currently no use case for removing a whitelist entry via the generated config.

**Risk:** If a component is deprecated and should no longer be placeable, the whitelist entry must be removed manually via the Storyblok Management API or Visual Editor. This is acceptable since component deprecation is a rare, intentional operation.

---

## ADR-003: Visibility-hidden field classification via `x-cms-hidden`

**Decision:** The merge script consumes visibility overlay files (e.g. `cms/visibility/*.schema.json`) directly and uses `x-cms-hidden: true` annotations to classify live-only fields. Fields marked hidden are dropped from the merged output. Fields with no annotation default to "not hidden" (preserved if live-only).

**Rationale:** Two simpler alternatives were considered:

1. Use the base Design System schema (without visibility) to build a "known fields" set — any live-only field present in the base schema is visibility-dropped. This duplicates schema layering logic.
2. Treat all live-only fields as "preserve" — this would keep hidden fields in the Storyblok config, defeating the purpose of the visibility layer.

Consuming the overlay files directly is the simplest approach that correctly distinguishes manually-added fields from visibility-hidden fields.

**Note:** The visibility layer directory name is configurable — it need not be `visibility`.

---

## ADR-004: Tab UUID matching by position

**Decision:** Tab UUIDs in the generated config are mapped to live tab UUIDs by **ordinal position** (1st generated → 1st live, etc.), not by label/`display_name`.

**Rationale:** Position matching is simpler and covers the common case where tabs are not reordered between generated and live configs. Label-based matching is more robust against reordering but requires `display_name` to be stable, which is not guaranteed (language layer can change labels). If tabs are reordered in practice, we can revisit and switch to label-based matching.

---

## ADR-005: CLI v4 as prerequisite

**Decision:** Upgrade to Storyblok CLI v4 before implementing the merge script. Phase 2 (CLI v4 upgrade) is a prerequisite for Phase 1 (merge script).

**Rationale:** CLI v4 provides `--dry-run`, single-component push by name (`components push <name>`), `--filter`, and a config file system — all of which are used by the merge workflow. Building against v3 and retrofitting v4 would create unnecessary rework.

---

## ADR-006: Preset merge without collision workaround

**Decision:** Presets are merged normally. No workaround is built for the section/prompter ID collision (both assigned `id: 299` in the generated file).

**Rationale:** The collision will be fixed upstream in the `kickstartDS cms storyblok` generator. After the next `create-storyblok-config` run, section and prompter will have distinct IDs. Building a temporary workaround adds complexity for a transient problem.

---

## ADR-007: Generated config renamed via post-step

**Decision:** The generated config file is renamed from `components.123456.json` to `components.generated.json` via a simple `mv` step in the npm workflow, not by changing the upstream generator.

**Rationale:** The `kickstartDS cms storyblok` generator uses the space ID placeholder (`123456`) in the filename. Changing upstream would require a release of `@kickstartds/kickstartds`. A rename step keeps the change local and avoids upstream coordination.

---

## Implementation Decisions (added during development)

### ADR-008: Storyblok CLI v4 file format

**Discovery:** CLI v4 uses a different file format than v3:

- **v3:** `{ "components": [...], "component_groups": [...] }` in a single monolithic file
- **v4:** Separate files in `{path}/components/{spaceId}/`:
  - `components.json` — bare array `[...]`
  - `groups.json` — bare array `[...]`
  - `presets.json` — bare array `[...]`

**Decision:** The merge script outputs in v4 format (separate files under `cms/merged/`). The `--filename` flag on `pull` allows custom naming (e.g. `--filename components-schema` → `components-schema.json`).

### ADR-009: CLI v4 auth — token-based login

**Discovery:** CLI v4 does **not** support `.netrc` authentication. It uses `storyblok login --token <token> --region <region>` which stores credentials in `~/.storyblok/`. The `storyblok.config.ts` reads `NEXT_STORYBLOK_SPACE_ID` and region from env, so the space doesn't need to be passed on every CLI call.

**Decision:** Replace the `netrc` plop script with `storyblok login --token` for CI and local setup. For now, manual login is required before first use.

_New decisions will be appended below as they arise._
