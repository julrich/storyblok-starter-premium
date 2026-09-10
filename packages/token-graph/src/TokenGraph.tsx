import { FC, useMemo } from "react";
import { MultiDirectedGraph } from "graphology";
import EdgeCurveProgram from "@sigma/edge-curve";
import { EdgeArrowProgram } from "sigma/rendering";
import type { Settings } from "sigma/settings";
import type { SerializedGraph } from "graphology-types";

import * as Tooltip from "@radix-ui/react-tooltip";
import { SigmaContainer } from "@react-sigma/core";

import type {
  GraphologyEdgeType,
  GraphologyNodeType,
  CosmosGraphProps,
} from "./types";
import { resolveConfig } from "./types";
import { getDesignSystemSubGraph, rgbaToString } from "./helpers";
import { CosmosGraphProvider } from "./GraphContext";
import CosmosCommandMenu from "./command/CommandMenu";
import CosmosMainToolbar from "./toolbars/MainToolbar";
import CosmosTokenToolbar from "./toolbars/TokenToolbar";
import CosmosViewToolbar from "./toolbars/ViewToolbar";

import "@react-sigma/core/lib/react-sigma.min.css";
import "./toolbars/toolbar.scss";
import "./command/command-menu.scss";

const CosmosGraph: FC<CosmosGraphProps> = ({ graphs, config, style }) => {
  const resolvedConfig = resolveConfig(config);

  const graphInstances = useMemo(() => {
    const instances: Record<
      string,
      MultiDirectedGraph<GraphologyNodeType, GraphologyEdgeType>
    > = {};

    for (const [name, serialized] of Object.entries(graphs)) {
      const g = new MultiDirectedGraph<
        GraphologyNodeType,
        GraphologyEdgeType
      >();
      g.import(
        serialized as SerializedGraph<GraphologyNodeType, GraphologyEdgeType>,
      );
      instances[name] = g;
    }

    // Auto-generate "design-system" subgraph if not provided but "full" exists
    if (instances["full"] && !instances["design-system"]) {
      instances["design-system"] = getDesignSystemSubGraph(
        instances["full"],
        resolvedConfig,
      ) as MultiDirectedGraph<GraphologyNodeType, GraphologyEdgeType>;
    }

    return instances;
  }, [graphs, resolvedConfig]);

  const settings: Partial<Settings> = useMemo(
    () => ({
      allowInvalidContainer: true,
      renderEdgeLabels: true,
      defaultEdgeType: "straight",
      edgeProgramClasses: {
        straight: EdgeArrowProgram,
        curved: EdgeCurveProgram,
      },
      labelColor: { color: "#999" },
      defaultNodeColor: "black",
    }),
    [],
  );

  const containerStyle = useMemo(
    () => ({
      background: rgbaToString(resolvedConfig.backgroundColor),
      ...style,
    }),
    [resolvedConfig.backgroundColor, style],
  );

  return (
    <SigmaContainer
      style={containerStyle}
      graph={MultiDirectedGraph<GraphologyNodeType, GraphologyEdgeType>}
      settings={settings}
    >
      <Tooltip.Provider delayDuration={700} skipDelayDuration={300}>
        <CosmosGraphProvider graphs={graphInstances} config={config}>
          <CosmosMainToolbar />
          <CosmosTokenToolbar />
          <CosmosViewToolbar />
          <CosmosCommandMenu />
        </CosmosGraphProvider>
      </Tooltip.Provider>
    </SigmaContainer>
  );
};

export default CosmosGraph;
