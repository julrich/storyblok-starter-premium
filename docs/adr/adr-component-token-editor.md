# ADR: Component Token Editing in Design Tokens Editor

**Status:** Accepted
**Date:** 2026-04-01
**Related PRD:** [component-token-editor-prd.md](../internal/prd/component-token-editor-prd.md)
**Checklist:** [component-token-editor-checklist.md](../internal/checklists/component-token-editor-checklist.md)

---

## ADR-CTE-001: Parse SCSS Source Directly (not compiled CSS)

**Context:** Component tokens live in 50 `*-tokens.scss` SCSS files. To build a catalog, we need to extract token names, default values, and responsive breakpoint context. Two approaches: (a) compile SCSS to CSS first, then parse CSS; (b) parse SCSS source directly.

The existing `custom-property-extract` library (v1.2.1, transitive dep) supports `@media` extraction in "full" mode but does **not** support `@container` queries. 9 components use `@container` via a `@include container.size("≥", 640px, "hero")` Sass mixin. Compiled CSS flattens mixin calls to `@container` rules, but the selector nesting context is harder to reconstruct from compiled output.

**Decision:** Parse SCSS source directly via `gonzales-pe` (already a transitive dependency of `custom-property-extract`). The SCSS AST preserves `@include` nodes with their arguments, which we resolve to `@container` query strings using known mixin signatures. `@media` blocks are parsed natively.

**Consequences:**

- Direct access to mixin arguments (`container.size("≥", 640px, "hero")` → `@container hero (min-width: 640px)`)
- No runtime SCSS compilation needed during extraction — faster build step
- Fragile if mixin signatures change — mitigate with regex fallback and test coverage
- `gonzales-pe` is already in the dependency tree (no new deps)

---

## ADR-CTE-002: Sparse Override Storage Model

**Context:** ~1,000 component tokens across 50 components. A theme may override only a handful (e.g., 15 tokens across 3 components). Storage options: (a) full snapshot of all tokens per theme, (b) sparse — only overridden values stored.

**Decision:** Sparse storage. The `componentTokens` field on `token-theme` contains only the overridden tokens, keyed by component name. Default values come from the build-time catalog; overrides are merged at display time in the editor and compiled to CSS on save.

```json
{
  "button": {
    "--dsa-button--padding": "1em 2em"
  },
  "hero": {
    "--dsa-hero--min-height": "20rem",
    "@container hero (min-width: 640px)": {
      "--dsa-hero--min-height": "28rem"
    }
  }
}
```

**Consequences:**

- Minimal storage footprint — themes store only what differs from defaults
- No duplication or drift when design system defaults change
- "Reset" is just deleting the key — no need to know the original value at save time
- Requires catalog loaded at runtime for the editor to show defaults alongside overrides
- Orphaned overrides (tokens renamed/removed in a design system update) need cleanup logic

---

## ADR-CTE-003: Separate `componentTokens` and `componentCss` Fields

**Context:** Component token overrides could be stored as raw CSS only (like the existing manual `token` field), or as structured JSON alongside compiled CSS.

**Decision:** Two new fields on `token-theme`: `componentTokens` (JSON) and `componentCss` (compiled CSS). This parallels the existing `tokens` (W3C DTCG JSON) + `css` (compiled CSS) pattern for branding tokens.

**Consequences:**

- JSON field enables structured editing, validation, diffing, and orphan detection
- CSS field enables fast build-time consumption without recompilation
- `componentCss` is a derived artifact — recompiled on every save via `componentTokensToCss()`
- Backward compatible: existing themes have no `componentTokens` field → treated as empty → no component overrides

---

## ADR-CTE-004: CSS Cascade Order for Theme Application

**Context:** Multiple CSS layers compete at runtime: design system defaults, branding theme CSS, component theme CSS, and manual token overrides. Specificity conflicts could cause overrides to not apply.

**Decision:** Fixed injection order in `_document.tsx`:

```
1. Design System defaults     (global.css — baked at build time)
2. Branding theme CSS         (:root { --ks-brand-*: value; })
3. Component theme CSS        (.dsa-button { --dsa-button--*: value; })
4. Manual token overrides     (page/settings token field — raw CSS escape hatch)
```

Component theme CSS uses the same selectors as the design system defaults (e.g., `.dsa-button`) so cascade order (later wins) ensures overrides apply without specificity hacks. Responsive overrides retain their `@container`/`@media` wrappers.

**Consequences:**

- No `!important` needed — cascade order is sufficient
- Manual token field remains the ultimate escape hatch (injected last)
- `_document.tsx` must maintain strict injection order — documented inline

---

## ADR-CTE-005: Separate "Components" View (not tabs in branding editor)

**Context:** The branding editor uses JSON Forms with 6 tab categories. Component tokens could be (a) additional tabs in the same editor, (b) a separate view/page toggle, or (c) a modal/panel.

**Decision:** Separate view toggle (segmented control: "Branding" / "Components"). The two editing modes are conceptually distinct — branding tokens are ~62 values in a flat schema, component tokens are ~1,000 values across 50 hierarchical files. Mixing them in the same tab navigation would be confusing.

**Consequences:**

- Clean separation of concerns — branding and component editing have independent state management
- Both views share the same preview pane — live preview works regardless of view
- State is preserved when toggling — no data loss when switching views
- Navigation pattern is clear: toggle at top level, not buried in tabs

---

## ADR-CTE-006: Container Query Mixin Resolution Strategy

**Context:** 9 components use `@include container.size("≥", 640px, "hero")` which compiles to `@container hero (min-width: 640px)`. The extraction script needs to resolve these mixin calls to their CSS equivalents.

**Decision:** Pattern-match on the mixin call AST node in gonzales-pe. The `container.size` mixin has a stable signature:

```
container.size(operator, breakpoint, containerName)
  → @container {containerName} ({operator-as-css} {breakpoint})
```

Map operators: `"≥"` → `min-width`, `"≤"` → `max-width`, `">"` → `min-width` (with +1px adjustment if needed per design system conventions).

If AST parsing proves fragile for `@include` nodes, fall back to regex extraction of arguments from the raw SCSS source line.

**Consequences:**

- Correct resolution of all 9 container-query components
- Hardcodes knowledge of the `container.size` mixin signature — acceptable since it's a project-internal mixin
- Regex fallback provides resilience if gonzales-pe struggles with `@include` parsing

---

## ADR-CTE-007: Semantic Token Catalog for Reference Picker

**Context:** Component tokens frequently reference semantic tokens (`--ks-*`) via `var()` expressions. Editors overriding component tokens need a way to discover and select from ~950 available semantic tokens without memorizing names.

**Decision:** Build-time extraction script (`extractSemanticTokenCatalog.cjs`) parses the compiled `tokens.css` to produce a `semantic-token-catalog.json` grouped by 16 categories (Background Color, Text Color, Font, Spacing, Shadow, etc.). The editor's `TokenReferencePicker` component uses MUI Autocomplete with category grouping, fuzzy search, and color swatches. Selecting a token emits `var(--ks-{name})`.

The catalog explicitly excludes:

- `-base` suffix variants (internal implementation tokens)
- `--ks-brand-*` tokens (branding-layer tokens handled by the branding editor)

**Consequences:**

- 950 semantic tokens in 16 categories — manageable with grouped autocomplete + search
- Catalog is a build artifact synced to `design-tokens-mcp` via `sync-tokens.mjs`
- Non-`var()` literal values still available via raw text input (toggle away from picker)
- `Color` category has 413 intermediate computed colors — may need sub-category filtering in future

---

## ADR-CTE-008: Orphan Detection and Cleanup

**Context:** When the design system removes or renames component tokens, themes with `componentTokens` overrides may reference tokens that no longer exist. These orphaned overrides produce dead CSS that wastes bytes and confuses editors.

**Decision:** Real-time orphan detection in `ComponentTokenContext`. On every override change, the context validates all overrides against the current catalog and exposes:

- `orphanedTokens: string[]` — descriptive paths of orphaned tokens (e.g., `button/--dsa-button--old-padding`)
- `stripOrphans()` — callback that removes all orphaned entries from the override state

The `ComponentEditor` renders a warning banner with a "Clean" button when orphans are detected.

Validation checks three levels:

1. Unknown component IDs (component removed from design system)
2. Unknown base token names (token renamed/removed)
3. Unknown responsive query strings or responsive token names

The MCP `validate_theme` tool mirrors this validation server-side for programmatic theme creation.

**Consequences:**

- Editors see orphan warnings immediately — no silent dead CSS accumulation
- One-click cleanup strips orphans without affecting valid overrides
- Validation is purely client-side against the bundled catalog — no API calls needed
- Server-side validation via MCP catches orphans in automated workflows

---

## ADR-CTE-009: View Mode Toggle Architecture

**Context:** The editor needs to navigate between branding token editing (JSON Forms-based) and component token editing (catalog browser-based). These are fundamentally different UIs.

**Decision:** Top-level `ViewMode` state (`"branding" | "components"`) in `App.tsx` with a MUI ToggleButtonGroup. Both views render inside the same editor pane and share the same preview iframe. State is fully independent — switching views doesn't reset either side's data.

Provider hierarchy: `PresetContext > TokenContext > ComponentTokenContext`. The ComponentTokenContext registers a getter with TokenContext via `setComponentTokensGetter`, allowing the save flow to collect both branding tokens and component overrides without tight coupling.

**Consequences:**

- Zero data loss when toggling between views
- Preview always shows the combined effect of branding + component CSS
- Save aggregates both data sources via ref-based getter pattern — clean separation of concerns
- Only the active view's component tree is rendered — React unmounts the inactive editor

---

## ADR-CTE-010: Preview Dual Style Tag Injection

**Context:** The preview iframe originally had one `<style data-tokens>` tag for branding CSS. Component CSS needs separate injection to maintain cascade order and allow independent updates.

**Decision:** Two style tags in the preview iframe:

1. `<style data-tokens>` — branding CSS from `localStorage("css")`
2. `<style data-component-tokens>` — component CSS from `localStorage("componentCss")`

Both update on `storage` events. The component CSS tag is appended after the branding tag, matching the cascade order (ADR-CTE-004).

**Consequences:**

- Cascade order preserved: branding always before component tokens
- Independent updates — changing component tokens doesn't re-inject branding CSS
- Each tag can be inspected independently in DevTools
