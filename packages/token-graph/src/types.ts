import type { CSSProperties } from "react";
import type { SerializedGraph } from "graphology-types";

export interface GraphologyNodeType {
  x: number;
  y: number;
  label: string;
  size: number;
  color: string;
  community?: string;
  selectors: string[];
}

export interface GraphologyEdgeType {
  type?: string;
  label?: string;
  size?: number;
  color?: string;
  selector?: string;
  purpose?: string;
  curvature?: number;
  parallelIndex?: number;
  parallelMaxIndex?: number;
}

export interface CosmosConfig {
  /** Token prefix → color mapping for node coloring */
  prefixColors?: Record<string, string>;

  /** Fallback color for unmatched prefixes */
  defaultNodeColor?: string;

  /** Prefixes that define "design system" subgraph membership */
  designSystemPrefixes?: string[];

  /** Component selector pattern for component detection */
  componentSelectorPattern?: RegExp;

  /** Component selector prefix for display name extraction */
  componentSelectorPrefix?: string;

  /** Background color for blending calculations */
  backgroundColor?: { r: number; g: number; b: number; a: number };

  /** Named graph views (keys shown in UI toggle) */
  graphNames?: string[];

  /** Initial graph to display */
  defaultGraph?: string;
}

export const DEFAULT_CONFIG: Required<CosmosConfig> = {
  prefixColors: {
    "--ks-": "#ecff00",
    "--dsa-": "#e21879",
  },
  defaultNodeColor: "#00F218",
  designSystemPrefixes: ["--c-", "--l-", "--dsa-"],
  componentSelectorPattern: /--dsa-((?:[a-zA-Z]+-)*[a-zA-Z]+)/g,
  componentSelectorPrefix: ".dsa-",
  backgroundColor: { r: 2, g: 53, b: 66, a: 1 },
  graphNames: ["full", "design-system"],
  defaultGraph: "design-system",
};

export function resolveConfig(config?: CosmosConfig): Required<CosmosConfig> {
  if (!config) return DEFAULT_CONFIG;
  return {
    prefixColors: config.prefixColors ?? DEFAULT_CONFIG.prefixColors,
    defaultNodeColor:
      config.defaultNodeColor ?? DEFAULT_CONFIG.defaultNodeColor,
    designSystemPrefixes:
      config.designSystemPrefixes ?? DEFAULT_CONFIG.designSystemPrefixes,
    componentSelectorPattern:
      config.componentSelectorPattern ??
      DEFAULT_CONFIG.componentSelectorPattern,
    componentSelectorPrefix:
      config.componentSelectorPrefix ?? DEFAULT_CONFIG.componentSelectorPrefix,
    backgroundColor: config.backgroundColor ?? DEFAULT_CONFIG.backgroundColor,
    graphNames: config.graphNames ?? DEFAULT_CONFIG.graphNames,
    defaultGraph: config.defaultGraph ?? DEFAULT_CONFIG.defaultGraph,
  };
}

export interface CosmosGraphProps {
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
