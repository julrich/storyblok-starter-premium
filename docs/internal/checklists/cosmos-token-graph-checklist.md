# Cosmos Token Graph — Implementation Checklist

**PRD:** [cosmos-token-graph-prd.md](../prd/cosmos-token-graph-prd.md)
**ADR:** [adr-cosmos-token-graph.md](../../adr/adr-cosmos-token-graph.md)
**Started:** 2026-04-09

---

## Phase 1: Package Scaffold & Port Core

> Create `packages/token-graph/` and port all Cosmos source files with hardcoded values replaced by `CosmosConfig`.

- [x] **1.1** Create `packages/token-graph/package.json` (`@kickstartds/token-graph`, `private: true`)
  - Dependencies: sigma, @react-sigma/core, @react-sigma/layout-forceatlas2, @sigma/edge-curve, @sigma/layer-webgl, graphology, graphology-communities-louvain, graphology-traversal, graphology-components, cmdk, @radix-ui/react-toolbar, @radix-ui/react-dropdown-menu, @radix-ui/react-tooltip, @radix-ui/react-label, @radix-ui/react-icons, @radix-ui/colors, color-blend, hex-rgb, rgb-hex, iwanthue
  - Peer deps: react, react-dom
- [x] **1.2** Create `packages/token-graph/tsconfig.json`
- [x] **1.3** Create `src/types.ts` — extract `GraphologyNodeType`, `GraphologyEdgeType`, `CosmosConfig` interface
  - `CosmosConfig`: `prefixColors`, `defaultNodeColor`, `designSystemPrefixes`, `componentSelectorPattern`, `componentSelectorPrefix`, `backgroundColor`, `graphNames`, `defaultGraph`
- [x] **1.4** Create `src/helpers.ts` — port from `resources/cosmos/helpers.ts`
  - Replace hardcoded `background` color with `CosmosConfig.backgroundColor`
  - Replace hardcoded prefix checks in `getDesignSystemSubGraph()` with `CosmosConfig.designSystemPrefixes`
  - Export `rgbaToString`, `hexRgbToRgba`, `getCommunityName`, `getDesignSystemSubGraph`
- [x] **1.5** Create `src/bridge.ts` — port from `resources/helpers/token.ts` + `resources/helpers/graph.ts`
  - `buildGraphFromCssProperties()` accepts `custom-property-extract` output, returns `SerializedGraph`
  - Uses `graphology` directly (not `directed-graph-typed` / `CssCustomPropertyDirectedGraph`)
  - Make prefix→color mapping configurable via `CosmosConfig.prefixColors`
  - Export `getPalette`, `levelAlphas`, `levelThresholds`, `getComponentName`, `getPropertyValue`
- [x] **1.6** Create `src/GraphContext.tsx` — port from `resources/cosmos/GraphContext.tsx`
  - Replace `@/helpers/graph` and `@/helpers/token` imports with local modules
  - Accept `CosmosConfig` via prop/context
  - Replace hardcoded `.dsa-` prefix with `CosmosConfig.componentSelectorPrefix`
  - Replace hardcoded `componentSelectorPattern` regex with config
- [x] **1.7** Create `src/toolbars/MainToolbar.tsx` — port from `resources/cosmos/MainToolbar.tsx`
  - Replace `@/helpers/token` imports with local `bridge.ts` exports
- [x] **1.8** Create `src/toolbars/TokenToolbar.tsx` — port from `resources/cosmos/TokenToolbar.tsx`
- [x] **1.9** Create `src/toolbars/ViewToolbar.tsx` — port from `resources/cosmos/ViewToolbar.tsx`
- [x] **1.10** Create `src/toolbars/components/BreakpointIcon.tsx` — port from `resources/cosmos/BreakpointIcon.tsx`
- [x] **1.11** Create `src/toolbars/components/BreakpointRadioItem.tsx` — port from `resources/cosmos/BreakpointRadioItem.tsx`
- [x] **1.12** Create `src/toolbars/components/IconTooltip.tsx` — port from `resources/cosmos/IconTooltip.tsx`
- [x] **1.13** Create `src/command/CommandMenu.tsx` — port from `resources/cosmos/CommandMenu.tsx`
- [x] **1.14** Create `src/TokenGraph.tsx` — port from `resources/cosmos/TokenGraph.tsx`
  - Accept `graphs: Record<string, SerializedGraph>` as prop (instead of module-scope import)
  - Accept `config?: CosmosConfig` as prop
  - Rename export to `CosmosGraph`
- [x] **1.15** Port SCSS files: `src/command/command-menu.scss`, `src/toolbars/toolbar.scss`
  - Ensure `@radix-ui/colors` CSS imports resolve correctly
- [x] **1.16** Create `src/index.ts` — public API barrel file
  - Export: `CosmosGraph`, `CosmosGraphProps`, `GraphologyNodeType`, `GraphologyEdgeType`, `CosmosConfig`, `buildGraphFromCssProperties`, `CssExtractionInput`
- [x] **1.17** Add `token-graph` to `pnpm-workspace.yaml` if needed (should auto-detect from `packages/*`)

---

## Phase 2: Bridge & Build-Time Graph Extraction

> Implement the extraction script and wire into the design system build pipeline.

- [x] **2.1** Implement `buildGraphFromCssProperties()` fully in `src/bridge.ts`
  - Parse `custom-property-extract` `FullExtractResult[]` input
  - Build nodes with `x`, `y`, `label`, `size`, `color` (prefix-mapped), `community`, `selectors`
  - Build edges from `var()` reference relationships
  - Return `SerializedGraph<GraphologyNodeType, GraphologyEdgeType>`
  - Generate both "full" and "design-system" subgraph via `getDesignSystemSubGraph()`
- [x] **2.2** Create `packages/token-graph/scripts/extractTokenGraph.mjs`
  - Accepts design system root dir and output path as CLI arguments
  - Reads all per-component `*-tokens.json` files + semantic CSS + branding CSS
  - Merges all token data and builds graph via graphology
  - Writes `token-graph.json` (serialized record of named graphs: "full" + "design-system")
  - Tested: 2563 nodes / 2644 edges (full), 274 nodes / 285 edges (design-system)
- [x] **2.3** Add `custom-property-extract` as devDependency in `packages/token-graph/package.json`
- [x] **2.4** Add `token-graph` script to `packages/design-system/package.json` that invokes the extraction script
  - Input: `src/components/**/*-tokens.json` + `src/token/tokens.css` + `src/token/branding-tokens.css`
  - Output: `src/token/token-graph.json`
- [x] **2.5** Wire `token-graph` into the design system build pipeline (after `branding-tokens`, before Rollup)
- [x] **2.6** Add `token-graph.json` to Rollup copy targets in `packages/design-system/rollup.config.mjs`
  - Already exported via `"./tokens/*": "./dist/tokens/*"` wildcard
- [x] **2.7** Verify `token-graph.json` is produced and accessible at `@kickstartds/design-system/tokens/token-graph.json`

---

## Phase 3: Design Token Editor Integration

> Add "Cosmos" as a third view mode in the Design Token Editor.

- [x] **3.1** Add `@kickstartds/token-graph` as `workspace:*` dependency in `packages/design-tokens-editor/package.json`
- [x] **3.2** Extend `ViewMode` type to `"branding" | "components" | "graph"` in `App.tsx`
- [x] **3.3** Add third `ToggleButton` with HubIcon to the view mode toggle group
- [x] **3.4** Create `packages/design-tokens-editor/src/graph/GraphView.tsx`
  - Import `token-graph.json` from `@kickstartds/design-system/tokens/token-graph.json`
  - Full-width layout: graph takes entire viewport when selected
- [ ] **3.5** Create `packages/design-tokens-editor/src/CosmosIntro.tsx`
  - Static content: color key legend, edge meaning, controls summary
  - Minimum viable content for v1
- [x] **3.6** Code-split Cosmos view with `React.lazy()` + `Suspense` in `App.tsx`
  - sigma.js / graphology / WebGL only loads when user switches to Graph tab
- [ ] **3.7** Verify no style conflicts between Radix UI (cosmos toolbars) and MUI (editor chrome)
  - Scope Radix styles tightly to the Cosmos container if needed

---

## Phase 4: Polish & Verification

> End-to-end testing and build verification.

- [ ] **4.1** Verify sigma.js / WebGL renders correctly in Vite SPA context (no SSR issues)
- [ ] **4.2** Verify command palette (cmdk Cmd+K) works within the editor context
- [ ] **4.3** Verify community detection and contour overlays work with DS token data
- [ ] **4.4** Verify breakpoint and inverted-state filtering works
- [ ] **4.5** Verify fullscreen toggle across browsers
- [ ] **4.6** Test with current sigma/react-sigma versions against React 19
- [ ] **4.7** Verify no visual regressions to existing Branding and Components editor views
- [ ] **4.8** Full monorepo build: `pnpm -r run build` completes without errors
