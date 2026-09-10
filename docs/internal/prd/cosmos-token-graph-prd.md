# PRD: Cosmos — Reusable Design Token Graph Visualization Package

**Status:** 📋 Draft (all decisions resolved, awaiting additional materials for implementation)
**Date:** 2026-04-09 (updated 2026-04-09)
**Author:** Generated from codebase analysis
**Source material:** `resources/cosmos/`, `resources/helpers/`, `resources/token/`, `resources/package.json`

---

## 1. Background & Problem Statement

### What Is Cosmos?

Cosmos is an **interactive graph visualization** for CSS custom property (design token) dependency trees. It renders a force-directed graph (via sigma.js / WebGL) where:

- **Nodes** = CSS custom properties (design tokens)
- **Edges** = `var()` reference relationships between tokens
- **Communities** = automatically detected clusters (Louvain algorithm) of related tokens
- **Components** = groups of tokens scoped to a specific UI component (e.g. `.dsa-button`)

The visualization supports:

- Click-to-select a token and see its ancestry (incoming references) and descendants (outgoing references)
- BFS traversal with configurable depth levels
- Community detection with toggleable contour overlays (WebGL density heatmaps)
- Component-scoped filtering and contour overlays
- Breakpoint and inverted-state filtering
- Force-directed layout (ForceAtlas2) with optional automatic relayout
- Command palette (Cmd+K) for token search
- Multiple graph views (full graph vs. design-system-only subgraph)

### Where It Comes From

Cosmos was built as part of a Next.js project (`@kickstartds/lughausen-website`) where it lives at `components/cosmos/`. It imports graph data from a build-time extraction pipeline:

```
CSS files → custom-property-extract → components.js (424KB blob)
         → fromCssCustomProperties() → CssCustomPropertyDirectedGraph
         → getGraphologySerialized() → graphology SerializedGraph
         → sigma.js WebGL rendering
```

The component is tightly coupled to:

1. The `custom-property-extract` output format
2. kickstartDS-specific token prefixes (`--ks-*`, `--dsa-*`, `.dsa-*`)
3. A dark teal background color
4. Hardcoded graph names (`"design-system"`, `"full"`)

### Why Extract It?

The Design Token Editor (`packages/design-tokens-editor/`) already provides two views for editing tokens:

| View           | Purpose                                                                       |
| -------------- | ----------------------------------------------------------------------------- |
| **Branding**   | Edit branding-level token values (colors, typography, spacing) via JSON Forms |
| **Components** | Edit component-level token overrides per component                            |

Both views show the **effect** of tokens (via a live preview iframe), but neither shows the **structure** — how tokens relate to each other, which tokens reference which, where clusters form, or what the overall dependency graph looks like.

Adding Cosmos as a third "Graph" view would give editors and developers a powerful visualization of the token architecture, making it easier to understand token relationships, debug cascading changes, and explore the design system's token topology.

Making it a **standalone package** rather than embedding it directly means:

- Other projects can use it with their own token systems (not just `--ks-*` / `--dsa-*`)
- It can be consumed independently of the Design Token Editor
- Clean separation of concerns: visualization vs. data pipeline vs. editor integration

---

## 2. Goals & Non-Goals

### Goals

1. **Create a standalone package** (`packages/token-graph/`, published as `@kickstartds/token-graph`) that provides a reusable design token graph visualization usable with any CSS custom property system
2. **Decouple from kickstartDS-specific conventions** — make token prefixes, color maps, graph names, background colors, and component selectors configurable via a `CosmosConfig` interface
3. **Accept both pre-built graphs and raw CSS extraction data** — the package should accept a graphology `SerializedGraph` as a prop, and also provide a built-in bridge for `custom-property-extract` output so consumers can pass raw extraction data directly
4. **Integrate with the Design Token Editor** as a third view mode ("Cosmos") alongside "Branding" and "Components", with a minimal left-column introduction panel and the full Cosmos graph in the right column
5. **Pre-build the graph at design system build time** — add a build step to the design system that produces a `token-graph.json` artifact (similar to how `component-token-catalog.json` is shipped), using the compiled CSS as input

### Non-Goals

1. **Replace the existing editor views** — Cosmos is additive, not a substitute for the JSON Forms branding editor or component token editor
2. **Build a new CSS extraction pipeline** — the existing `custom-property-extract` + `extractComponentToken.js` toolchain is out of scope; we reuse its output
3. **Support non-CSS-custom-property token formats** — initial scope is CSS `var()` reference graphs only (W3C DTCG, Figma Tokens, Style Dictionary JSON are out of scope as direct inputs)
4. **Real-time graph updates on token edit** — initial implementation shows a static graph from the current token state; live re-rendering as the user edits tokens is a future enhancement
5. **Publish to npm as a public package** — initial release is `private: true` within the monorepo; public publishing is a future decision

---

## 3. Architecture

### 3.1 Package Structure

```
packages/token-graph/
  package.json                    — @kickstartds/token-graph
  tsconfig.json
  src/
    index.ts                      — Public API exports
    TokenGraph.tsx                — Main entry component (<CosmosGraph />)
    GraphContext.tsx              — Graph state management (sigma, communities, components)
    helpers.ts                    — Color utils, community naming, subgraph extraction
    types.ts                      — GraphologyNodeType, GraphologyEdgeType, config types
    bridge.ts                     — fromCssCustomProperties() + getGraphologySerialized() bridge
    command/
      CommandMenu.tsx             — Cmd+K command palette for token search
      command-menu.scss
    toolbars/
      MainToolbar.tsx             — Component/community toggles, breakpoint, relayout controls
      TokenToolbar.tsx            — Selected-token ancestry controls
      ViewToolbar.tsx             — Zoom and layout controls
      components/
        BreakpointIcon.tsx
        BreakpointRadioItem.tsx
        IconTooltip.tsx
      toolbar.scss
```

### 3.2 Public API

```tsx
// Main component
export { CosmosGraph } from "./TokenGraph";
export type { CosmosGraphProps } from "./TokenGraph";

// Types for consumers to build graph data
export type { GraphologyNodeType, GraphologyEdgeType } from "./types";
export type { CosmosConfig } from "./types";

// Graph construction from custom-property-extract output (built-in bridge)
export { buildGraphFromCssProperties } from "./bridge";
export type { CssExtractionInput } from "./bridge";
```

### 3.3 Configuration Interface

```tsx
interface CosmosConfig {
  /** Token prefix → color mapping for node coloring */
  prefixColors?: Record<string, string>;
  // e.g. { "--ks-": "#ecff00", "--dsa-": "#e21879" }
  // Fallback color for unmatched prefixes
  defaultNodeColor?: string;

  /** Prefixes that define "design system" subgraph membership */
  designSystemPrefixes?: string[];
  // e.g. ["--c-", "--l-", "--dsa-"]

  /** Component selector pattern for component detection */
  componentSelectorPattern?: RegExp;
  // e.g. /--dsa-((?:[a-zA-Z]+-)*[a-zA-Z]+)/

  /** Component selector prefix for display name extraction */
  componentSelectorPrefix?: string;
  // e.g. ".dsa-"

  /** Background color for blending calculations */
  backgroundColor?: { r: number; g: number; b: number; a: number };

  /** Named graph views (keys shown in UI toggle) */
  graphNames?: string[];
  // e.g. ["full", "design-system"]

  /** Initial graph to display */
  defaultGraph?: string;
}
```

### 3.4 Input Data Contract

The main component accepts pre-built graphology `SerializedGraph` objects:

```tsx
interface CosmosGraphProps {
  /** One or more named graphs to visualize */
  graphs: Record<
    string,
    SerializedGraph<GraphologyNodeType, GraphologyEdgeType>
  >;
  /** Configuration overrides */
  config?: CosmosConfig;
  /** CSS styles for the container */
  style?: CSSProperties;
}
```

This keeps the package decoupled from any specific extraction pipeline. Consumers can either:

1. **Pass pre-built `SerializedGraph` objects** — full control, no runtime overhead
2. **Pass raw `custom-property-extract` output** via the built-in `buildGraphFromCssProperties()` bridge — the bridge builds the graph at runtime

For the Design Token Editor integration, we use option 1: a pre-built `token-graph.json` from the design system build.

### 3.5 Design Token Editor Integration

#### Layout

The Cosmos view uses a **minimal split layout**:

- **Left column (narrow)**: Basic introduction / legend about the graph — what nodes and edges mean, color coding, controls summary
- **Right column (wide)**: The full Cosmos graph with its existing toolbar overlay layout (identical to the original)
- **Fullscreen toggle**: A button to expand the graph to fill the entire browser viewport

```
App.tsx
  ViewMode = "branding" | "components" | "cosmos"
  ├── <Editor />           (branding mode)
  ├── <ComponentEditor />  (components mode)
  └── <CosmosView />       (cosmos mode — new)
        ├── Left: <CosmosIntro />     (legend, color key, controls help)
        └── Right: <CosmosGraph />    (full sigma.js graph + overlaid toolbars)
```

#### Data Pipeline

Graph data is **pre-built at design system build time**, not computed at runtime:

```
Design System Build:
  compiled CSS (tokens.css + component CSS)
    → custom-property-extract (full mode)
    → buildGraphFromCssProperties()
    → token-graph.json (SerializedGraph)
    → shipped in dist/tokens/token-graph.json

Design Token Editor Runtime:
  import tokenGraph from "@kickstartds/design-system/tokens/token-graph.json"
    → <CosmosGraph graphs={{ full: tokenGraph, ... }} />
```

This is analogous to how `component-token-catalog.json` is already produced and consumed.

#### Relationship to Existing Extraction Pipelines

The design system already runs **three non-overlapping token extraction pipelines** at build time:

| Pipeline                       | Input                 | Output                         | Contains var() refs?          | Used by                                |
| ------------------------------ | --------------------- | ------------------------------ | ----------------------------- | -------------------------------------- |
| `customPropertyExtract`        | Component SCSS → CSS  | Per-component JSON             | Yes (raw)                     | Internal build                         |
| `extractComponentTokenCatalog` | Component SCSS source | `component-token-catalog.json` | Yes + classified + responsive | Design Token Editor (component view)   |
| `extractSemanticTokenCatalog`  | Compiled `tokens.css` | `semantic-token-catalog.json`  | Yes + categorized             | Design Token Editor (reference picker) |

The new graph extraction would be a **fourth pipeline**:

| Pipeline                      | Input                    | Output             | Contains var() refs? | Used by                                            |
| ----------------------------- | ------------------------ | ------------------ | -------------------- | -------------------------------------------------- |
| **`extractTokenGraph`** (new) | Compiled CSS (all files) | `token-graph.json` | Yes (as graph edges) | `@kickstartds/token-graph` via Design Token Editor |

This uses the same `custom-property-extract` library as the existing pipelines and feeds the result through the `@kickstartds/token-graph` bridge function (`buildGraphFromCssProperties()`). The extraction script lives in the token-graph package and is invoked by the design system build. It does not duplicate the other pipelines — each produces a different shape for a different consumer.

### 3.6 Dependency Graph

```
packages/token-graph/
  ├── sigma, @react-sigma/core, @react-sigma/layout-forceatlas2  (graph rendering)
  ├── @sigma/edge-curve, @sigma/layer-webgl                     (visual features)
  ├── graphology, graphology-communities-louvain, graphology-traversal, graphology-components
  ├── cmdk                                                       (command palette)
  ├── @radix-ui/react-{toolbar,dropdown-menu,tooltip,label,icons} (UI primitives)
  ├── @radix-ui/colors                                           (color scales for CSS)
  ├── color-blend, hex-rgb, rgb-hex                              (color math)
  ├── iwanthue                                                   (palette generation)
  └── react (peer)

packages/design-tokens-editor/
  └── depends on @kickstartds/token-graph (workspace:*)

packages/design-system/
  └── uses custom-property-extract (devDep) to produce token-graph.json at build time
```

Note: `directed-graph-typed` is **not included** in the package — it's only used in the original source project's build pipeline, not at runtime. The `buildGraphFromCssProperties()` bridge uses `graphology` directly to build the `SerializedGraph`, avoiding the `CssCustomPropertyDirectedGraph` class and its `directed-graph-typed` dependency.

---

## 4. Phased Implementation

### Phase 1 — Package Scaffold & Port Core

1. Create `packages/token-graph/` with `package.json` (`@kickstartds/token-graph`), `tsconfig.json`
2. Port `GraphContext.tsx`, `TokenGraph.tsx`, `helpers.ts`, and all toolbar/command components from `resources/cosmos/` — keeping the UI 1:1 as-is (no design adjustments)
3. Extract `GraphologyNodeType` and `GraphologyEdgeType` from `resources/helpers/graph.ts` into `src/types.ts`
4. Replace all `@/helpers/graph` and `@/helpers/token` imports with local types/config
5. Replace hardcoded prefixes/colors with `CosmosConfig` props (with sensible defaults matching current kickstartDS values)
6. Change `TokenGraph.tsx` to accept `graphs` as a prop instead of importing and building them at module scope
7. Port SCSS files, ensure `@radix-ui/colors` CSS imports work
8. Keep Radix UI primitives as-is (no MUI migration for now — can be cleaned up later)

### Phase 2 — Bridge & Build-Time Graph Extraction

1. Implement `buildGraphFromCssProperties()` in `src/bridge.ts` — accepts `custom-property-extract` output (raw CSS extraction data), returns a `SerializedGraph`. Uses `graphology` directly, **not** `directed-graph-typed` / `CssCustomPropertyDirectedGraph`
2. Make prefix→color mapping and subgraph filtering configurable in the bridge
3. Add a `extractTokenGraph` script to the token-graph package (`packages/token-graph/scripts/extractTokenGraph.cjs`) that:
   - Accepts a path to compiled CSS as input
   - Runs `custom-property-extract` and passes the result through `buildGraphFromCssProperties()`
   - Writes `token-graph.json` to the specified output path
4. Wire the design system build to invoke the token-graph extraction script, writing `token-graph.json` to `src/token/` (Rollup copies to `dist/tokens/`). Register in the design system's Rollup exports
5. Implement `getDesignSystemSubGraph()` as a configurable utility exported from the package

### Phase 3 — Design Token Editor Integration

1. Add `workspace:*` dependency on `@kickstartds/token-graph` to `design-tokens-editor`
2. Extend `ViewMode` type to `"branding" | "components" | "cosmos"`
3. Add third `ToggleButton` (with appropriate icon) to `App.tsx`
4. Create `CosmosView.tsx` in the editor:
   - Imports `token-graph.json` from `@kickstartds/design-system/tokens/token-graph.json`
   - Renders a minimal split: narrow left column (`<CosmosIntro />` — static color key, edge meaning, controls summary) + wide right column (`<CosmosGraph />`)
   - Includes a CSS-overlay fullscreen toggle to expand the graph to fill the browser viewport
5. Code-split the Cosmos view with `React.lazy()` to avoid loading sigma.js/WebGL unless the user switches to the Cosmos tab

### Phase 4 — Polish & Testing

1. Verify all sigma.js / WebGL features work in the Vite SPA context (vs. Next.js SSR)
2. Test with current sigma/react-sigma versions — stay on the source project's versions initially; if React 19 compatibility issues arise, consider upgrading to newer sigma releases that explicitly support React 19
3. Verify command palette (cmdk Cmd+K) works within the editor context (keep as-is, don't try to unify with editor shortcuts yet)
4. Performance test with the full token graph dataset
5. Verify breakpoint and inverted-state filtering works with the design system's token data (these are relevant given the component token editor already has similar toggles)
6. Test the fullscreen toggle across browsers

---

## 5. Resolved Decisions

| #   | Question                                  | Decision                                                                                                                                                                                                                                                                                                                   |
| --- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | Package name                              | **`@kickstartds/token-graph`** — package directory: `packages/token-graph/`                                                                                                                                                                                                                                                |
| Q2  | Include `custom-property-extract` bridge? | **Yes, built into the package.** Consumers should be able to pass raw CSS extraction output. The bridge function (`buildGraphFromCssProperties()`) is part of the public API. It uses `graphology` directly — no `directed-graph-typed` dependency.                                                                        |
| Q3  | Layout in editor                          | **Minimal split:** narrow left column with introduction/legend, wide right column with the full Cosmos graph (identical layout to the original). **Includes a fullscreen toggle** to expand the graph to fill the entire browser viewport.                                                                                 |
| Q4  | Include `directed-graph-typed`?           | **No.** Not needed at runtime. The bridge function uses `graphology` directly. `directed-graph-typed` is only relevant to the original source project's build pipeline.                                                                                                                                                    |
| Q5  | Radix UI vs. MUI                          | **Keep both for now.** Priority is porting Cosmos 1:1 as-is with no design adjustments. Radix→MUI migration is a future cleanup task.                                                                                                                                                                                      |
| Q6  | Graph data source at runtime              | **Pre-built at design system build time.** A new `extractTokenGraph` script runs `custom-property-extract` on the compiled CSS, passes it through the bridge, and writes `token-graph.json` to `dist/tokens/`. The editor imports this static artifact — no runtime extraction. (See §3.5 for pipeline details.)           |
| Q7  | Live graph updates on token edit          | **Not in v1.** Static graph from build-time data. Live updates are a future iteration.                                                                                                                                                                                                                                     |
| Q8  | Cross-view navigation (graph → editor)    | **Future work, with caveat.** Component tokens should be straightforward to link (graph node → component in component editor). Branding tokens are harder — how `--ks-brand-*` branding tokens map to specific graph nodes needs investigation. Defer to a follow-up iteration.                                            |
| Q9  | Pre-build graph from design system?       | **Yes.** Ship `token-graph.json` as a build artifact alongside `component-token-catalog.json`. Same pattern, same Rollup export (`@kickstartds/design-system/tokens/token-graph.json`).                                                                                                                                    |
| Q10 | React 19 compatibility                    | **Stay on current versions initially** (sigma@3.0.0-beta.26, @react-sigma/core@4.0.3). Only investigate/upgrade if actual compatibility issues arise — newer sigma releases exist that support React 19, but don't do version upgrades in parallel with the port.                                                          |
| Q11 | Vite compatibility                        | **Expected to work** — the editor is a Vite SPA (no SSR), and sigma.js is browser-only WebGL. Should be verified in Phase 1 but is not expected to be a blocker.                                                                                                                                                           |
| Q12 | Sigma beta version pinning                | **Stay on current beta versions** for now. Revisit alongside Q10 if needed.                                                                                                                                                                                                                                                |
| Q13 | Command palette in editor                 | **Include as-is.** Keep the cmdk Cmd+K command palette in the Cosmos view. In a future iteration, this could be expanded to be an editor-wide feature supporting navigation to other views.                                                                                                                                |
| Q14 | Community detection & contour overlays    | **Include in v1.** Full feature set from the original Cosmos.                                                                                                                                                                                                                                                              |
| Q15 | Breakpoint/inverted filtering             | **Include — relevant.** The design system's token data includes breakpoint-responsive tokens and inverted-state variants. The component token editor already has similar toggles. Keep these controls.                                                                                                                     |
| Q16 | Generic token system support              | **Yes, design for it** via `CosmosConfig`. See §5.1 below for implications.                                                                                                                                                                                                                                                |
| Q17 | Build script location                     | **In the token-graph package.** The `extractTokenGraph` script lives in `packages/token-graph/` as a self-contained pipeline. The design system invokes it as part of its build, passing the compiled CSS path. This keeps the graph extraction logic co-located with the bridge code that produces the `SerializedGraph`. |
| Q18 | `token-graph.json` size                   | **Measure after building, not a major concern.** This is a power-user tool — performance should be fine. Code-splitting via `React.lazy()` already ensures the graph data only loads when the Cosmos tab is active.                                                                                                        |
| Q19 | Fullscreen implementation                 | **CSS overlay** (fixed-position element filling the viewport), not the browser Fullscreen API. More controllable, less jarring transitions, easier to provide a clear "exit fullscreen" affordance.                                                                                                                        |
| Q20 | Intro column content                      | **Minimum viable content for v1**: static color key, edge meaning, controls summary. In a future iteration, expand to context-sensitive dynamic data (e.g. stats for the selected node, community details, live graph metrics).                                                                                            |

### 5.1 Generic Token System Support — Implications (Q16)

Designing `@kickstartds/token-graph` to work with arbitrary CSS custom property systems (not just `--ks-*` / `--dsa-*`) has these consequences:

1. **`CosmosConfig.prefixColors`** must accept any prefix→color map. The defaults should match kickstartDS, but a Tailwind project could pass `{ "--tw-": "#38bdf8" }` etc.
2. **`CosmosConfig.designSystemPrefixes`** drives the "design system subgraph" filter (which nodes belong to the connected DS subset). Must be configurable — some projects may not have this concept at all.
3. **`CosmosConfig.componentSelectorPattern`** and **`componentSelectorPrefix`** drive component detection. kickstartDS uses `--dsa-<name>` tokens with `.dsa-<name>` selectors, but other systems may use completely different conventions. A RegExp config handles this.
4. **`buildGraphFromCssProperties()`** already works generically — it builds nodes for any `--*` property and edges for any `var()` reference. No prefix-specific logic in the bridge itself.
5. **Community naming** (`getCommunityName()`) uses word frequency analysis on token names, which is prefix-agnostic already.
6. **Open question for future**: Should the package also accept non-CSS inputs (e.g. Style Dictionary JSON, W3C DTCG with `{value}` references)? This is explicitly out of scope for v1 but the `SerializedGraph` input contract makes it possible — any consumer can build a graph from any source.

The main risk is that generic defaults are hard to get right. We mitigate by providing **kickstartDS defaults** that work out of the box, and requiring explicit `CosmosConfig` for other systems.

---

## 6. Additional Code & Material Needed

### Required for Implementation

| Item                                                                                  | Location / Source                                                                                                                 | Why Needed                                                                                              | Status                 |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------- |
| **`custom-property-extract` types** (`FullExtractResult`, `FullCustomPropertyValues`) | npm package `custom-property-extract`                                                                                             | To type the bridge function `buildGraphFromCssProperties()` correctly                                   | Needed                 |
| **Design system's compiled CSS files**                                                | `packages/design-system/dist/` after build                                                                                        | Input for the new `extractTokenGraph` build script                                                      | Available              |
| **Website's `extractComponentToken.js`**                                              | `resources/` or `packages/website/scripts/extractComponentToken.js`                                                               | Reference implementation — shows how to run `custom-property-extract` on the compiled design system CSS | Available in resources |
| **Design system's existing extraction scripts**                                       | `packages/design-system/scripts/customPropertyExtract.cjs`, `extractComponentTokenCatalog.cjs`, `extractSemanticTokenCatalog.cjs` | Reference for how to add a 4th extraction pipeline to the build                                         | In workspace           |
| **Rollup config for token exports**                                                   | `packages/design-system/rollup.config.mjs`                                                                                        | To add `token-graph.json` to the `./tokens/*` export map                                                | In workspace           |

### Nice to Have for Design Decisions

| Item                                                         | Why                                                                                                           |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| **Screenshots / recordings of Cosmos in the source project** | Visual reference for what the end result looks like                                                           |
| **Performance profile of the full graph**                    | How many nodes/edges does the full graph have? Informs whether lazy loading or WebWorker offloading is needed |
| **The source project's `scripts/calculateCssProperties.js`** | Produces `calculated.js` — may contain useful logic for resolving token values                                |
| **User research / feedback on the original Cosmos usage**    | What did users actually find useful? Which features were actually used?                                       |

---

## 7. Potential Hurdles

### Technical

- **React 19 + sigma.js beta**: The sigma.js ecosystem was at beta when the source project was built. If React 19 incompatibilities arise, newer sigma releases explicitly support React 19. Mitigation: test early (Phase 1), upgrade only if needed.
- **Bundle size**: sigma.js, graphology, and the WebGL programs add significant weight. The current editor is relatively lightweight. Mitigation: code-split the cosmos view with `React.lazy()` — sigma/graphology/WebGL only load when the user clicks the Cosmos tab.
- **Two UI frameworks**: Mixing Radix UI (cosmos toolbars) with MUI (editor chrome) is accepted for v1. Mitigation: scope Radix styles tightly to the Cosmos container; plan MUI migration as future cleanup.
- **WebGL context limits**: Browsers limit the number of WebGL contexts per page. If the preview iframe also uses WebGL (it doesn't currently), this could be an issue. Low risk.
- **Graph data size**: The raw `components.js` is 424KB but the serialized graph (nodes + edges without raw CSS values) should be significantly smaller. Need to measure `token-graph.json` size after Phase 2.

### UX / Design

- **Dark background in light editor**: Cosmos uses a dark teal background (`rgb(2, 53, 66)`) for optimal WebGL contrast. The editor uses a light MUI theme. For v1: keep Cosmos's dark background within its container — the split layout naturally isolates it. The intro column on the left can bridge the theme transition.
- **Toolbar coexistence**: The editor has a top toolbar (EditorToolbar, save/load/code). Cosmos has its own 3 overlaid toolbars (MainToolbar, TokenToolbar, ViewToolbar). For v1: keep both — the editor toolbar stays at the top, Cosmos toolbars overlay inside the graph container. No unification needed.
- **Fullscreen transition**: Uses a CSS overlay (fixed-position element filling the viewport). Needs smooth enter/exit transitions and a clear "exit fullscreen" button. Simpler and less jarring than the browser Fullscreen API.

---

## 8. Success Criteria

1. A `packages/token-graph/` package (`@kickstartds/token-graph`) exists with a clean public API that accepts `SerializedGraph` data and/or raw `custom-property-extract` output, and renders an interactive token graph
2. The package has no hardcoded references to `--ks-*`, `--dsa-*`, `.dsa-`, or any project-specific token naming — all such specifics are driven by `CosmosConfig` with kickstartDS defaults
3. The design system build produces a `token-graph.json` artifact shipped at `@kickstartds/design-system/tokens/token-graph.json`
4. The Design Token Editor shows a third "Cosmos" toggle button that renders the graph visualization with the pre-built graph data
5. Community detection, contour overlays, component filtering, breakpoint/inverted filtering, and token search (command palette) work within the editor context
6. The Cosmos view has a working fullscreen toggle
7. No visual regressions to the existing Branding and Components editor views
8. The package can be consumed by an external project with different token prefixes by passing a custom `CosmosConfig`

---

## 9. Out-of-Scope / Future Work

- **Live graph updates on token edit** — graph re-renders when tokens change in the editor (next iteration)
- **Cross-view navigation** — clicking a token in the graph navigates to it in the branding/component editor (component tokens should be straightforward; branding token mapping needs investigation)
- **Radix UI → MUI migration** — unify cosmos toolbars with the editor's MUI-based chrome
- **Editor-wide command palette** — expand cmdk Cmd+K to navigate across all editor views, not just within the graph
- **Public npm publishing** — initial release is monorepo-internal only
- **Non-CSS token format support** — W3C DTCG JSON, Figma Tokens, Style Dictionary as direct graph inputs (the `SerializedGraph` input contract makes this possible without package changes — consumers just need to build a graph from their format)
- **Graph export** (SVG, PNG, DOT format)
- **Token diffing** — compare two token sets as overlaid graphs
- **Theming MCP integration** — using the graph to inform the Design Tokens MCP server's `theme_from_image` or `audit_tokens` workflows
- **Mobile / touch support** — sigma.js has limited touch support; defer to future
- **Sigma / react-sigma version upgrade** — move to stable releases when available, particularly for React 19 support
- **Context-sensitive intro panel** — expand the left intro column with dynamic data: selected node details, community stats, live graph metrics
