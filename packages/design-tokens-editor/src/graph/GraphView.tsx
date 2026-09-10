import { CosmosGraph } from "@kickstartds/token-graph";
import type { CosmosGraphProps } from "@kickstartds/token-graph";

// Vite resolves this JSON import at build time.
// In dev, it reads from the design system source; in prod, from dist/tokens/.
import tokenGraphData from "@kickstartds/design-system/tokens/token-graph.json";

/**
 * Wrapper that loads the pre-built token graph data and renders CosmosGraph.
 * This component is code-split via React.lazy() in App.tsx.
 */
export function GraphView() {
  return (
    <CosmosGraph
      graphs={tokenGraphData as unknown as CosmosGraphProps["graphs"]}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
