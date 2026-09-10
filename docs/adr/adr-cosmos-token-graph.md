# ADR: Cosmos Token Graph Package

**Status:** Accepted
**Date:** 2026-04-09
**Relates to:** [cosmos-token-graph-prd.md](../internal/prd/cosmos-token-graph-prd.md)

---

## ADR-1: Standalone Package (`@kickstartds/token-graph`)

### Context

Cosmos is an interactive token graph visualization built as part of a Next.js project. It could be embedded directly into the Design Token Editor, or extracted into a reusable package.

### Decision

**Extract into a standalone package** at `packages/token-graph/` (`@kickstartds/token-graph`, `private: true`). The editor depends on it via `workspace:*`.

### Consequences

- Clean separation: visualization logic vs. editor integration vs. data pipeline
- Other projects (or future tools) can consume the graph independently
- Minor overhead of maintaining a separate package.json, but the monorepo tooling handles this well
- `private: true` initially — public npm publishing is a future decision

---

## ADR-2: graphology Only — No `directed-graph-typed`

### Context

The original source uses `directed-graph-typed` (via `CssCustomPropertyDirectedGraph`) to build the graph at import time, then serializes to graphology format for sigma.js rendering. At runtime, only graphology is used.

### Decision

**Use graphology directly** for both graph construction (bridge) and rendering. Do not include `directed-graph-typed` in the package.

### Consequences

- One fewer dependency (~37KB minified)
- The `buildGraphFromCssProperties()` bridge builds a graphology `MultiDirectedGraph` directly, then calls `.export()` to produce `SerializedGraph`
- The `CssCustomPropertyDirectedGraph` class and `getGraphologySerialized()` conversion are replaced by a single bridge function
- Any `directed-graph-typed`-specific features (BST indexing, etc.) are not needed — the graph is consumed read-only by sigma.js

---

## ADR-3: Pre-Built Graph at Design System Build Time

### Context

The graph can be built at runtime (on every editor page load) or at build time (once, shipped as JSON). The source project builds at import time via a 424KB `components.js` blob. The Design Token Editor is a power-user tool where load time matters less than for end-user pages.

### Decision

**Pre-build the graph during the design system build** and ship as `token-graph.json` in `dist/tokens/`. The editor imports this static artifact.

### Consequences

- Zero runtime computation cost — the editor loads a pre-serialized `SerializedGraph`
- Consistent with existing pattern: `component-token-catalog.json` and `semantic-token-catalog.json` are also pre-built
- Graph data is only as fresh as the last design system build — acceptable for v1 (live updates are future work)
- `token-graph.json` size must be measured after implementation, but is expected to be smaller than the 424KB source blob since raw CSS values are stripped

---

## ADR-4: Extraction Script Lives in token-graph Package

### Context

The extraction script could live in the design system (alongside the 3 existing extraction scripts) or in the token-graph package (co-located with the bridge code it invokes).

### Decision

**Place the script at `packages/token-graph/scripts/extractTokenGraph.cjs`**. The design system build invokes it, passing the compiled CSS path and output path as arguments.

### Consequences

- Graph extraction logic is co-located with `buildGraphFromCssProperties()` — single ownership
- The design system only needs to call the script and add the output to its Rollup copy targets
- The token-graph package needs `custom-property-extract` as a devDependency
- Updating the graph format only requires changes in one package

---

## ADR-5: Keep Radix UI — No MUI Migration

### Context

The Design Token Editor uses MUI v7. The Cosmos toolbars use Radix UI primitives (Toolbar, DropdownMenu, Tooltip, Icons). Migrating Radix→MUI would ensure visual consistency but significantly expand the port scope.

### Decision

**Keep Radix UI primitives as-is** for v1. Scope Radix styles tightly to the Cosmos container. The MUI migration is deferred to a future cleanup iteration.

### Consequences

- Two UI frameworks coexist: MUI (editor chrome) and Radix (cosmos toolbars)
- Faster initial port — no design system translation needed
- The Cosmos view's dark background naturally isolates it visually from the MUI-themed editor
- CSS scoping is important to prevent style bleed — Radix styles must be contained within the graph container
- Future migration path is clear: replace Radix primitives with MUI equivalents one at a time

---

## ADR-6: CSS Overlay for Fullscreen (Not Browser Fullscreen API)

### Context

The graph view needs a fullscreen mode for optimal exploration. Two approaches: browser Fullscreen API (`element.requestFullscreen()`) or CSS overlay (fixed-position element filling viewport).

### Decision

**Use a CSS overlay** — a fixed-position element filling the viewport with a high z-index.

### Consequences

- More controllable than the browser Fullscreen API (no permission prompts, no browser-specific UI changes)
- Smoother enter/exit transitions
- Clear "exit fullscreen" button can be positioned anywhere
- The editor's top toolbar remains accessible via Escape or the exit button
- Works consistently across browsers without vendor-prefix concerns

---

## ADR-7: Generic `CosmosConfig` for Arbitrary Token Systems

### Context

The original Cosmos has hardcoded kickstartDS-specific values: `--ks-*` / `--dsa-*` prefixes, `.dsa-` component selector pattern, `rgb(2, 53, 66)` background, `"full"` / `"design-system"` graph names.

### Decision

**Make all project-specific values configurable via `CosmosConfig`**, with kickstartDS defaults.

### Consequences

- The package can be used by any CSS custom property system (Tailwind `--tw-*`, Open Props `--op-*`, etc.)
- kickstartDS users get correct behavior with zero configuration
- `CosmosConfig` surface area: `prefixColors`, `defaultNodeColor`, `designSystemPrefixes`, `componentSelectorPattern`, `componentSelectorPrefix`, `backgroundColor`, `graphNames`, `defaultGraph`
- Community naming (`getCommunityName()`) is already prefix-agnostic (word frequency analysis)
- Future support for non-CSS formats (W3C DTCG, Style Dictionary) doesn't require package changes — consumers build a `SerializedGraph` from any source

---

## ADR-8: Code-Split Cosmos View via React.lazy()

### Context

sigma.js, graphology, and WebGL programs add significant bundle weight. The Cosmos view is one of three tabs — most editor sessions may never open it.

### Decision

**Code-split the Cosmos view** with `React.lazy()` + `Suspense`. The sigma.js/graphology/WebGL bundle only loads when the user switches to the Cosmos tab.

### Consequences

- No impact on initial editor load time
- First click on the Cosmos tab incurs a one-time chunk download
- The loading state needs a reasonable `Suspense` fallback (spinner or skeleton)
- Vite's code splitting handles this automatically via dynamic import
