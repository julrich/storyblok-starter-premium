import type {
  GraphologyEdgeType,
  GraphologyNodeType,
  CosmosConfig,
} from "./types";
import { DEFAULT_CONFIG } from "./types";
import Graph from "graphology";
import { forEachConnectedComponent } from "graphology-components";
import hexRgb from "hex-rgb";
import rgbHex from "rgb-hex";

export function rgbaToString(rgba: {
  r: number;
  g: number;
  b: number;
  a: number;
}) {
  return `#${rgbHex(rgba.r, rgba.g, rgba.b)}`;
}

export function hexRgbToRgba(hex: string, alpha: number = 0) {
  const { red: r, green: g, blue: b } = hexRgb(hex);
  return { r, g, b, a: alpha };
}

function wordFreq(string: string) {
  return string
    .replace(/[.]/g, "")
    .split(/\s/)
    .reduce<Record<string, number>>(
      (map, word) =>
        Object.assign(map, {
          [word]: map[word] ? map[word] + 1 : 1,
        }),
      {},
    );
}

export function getCommunityName(
  graph: Graph<GraphologyNodeType, GraphologyEdgeType>,
  community: string,
) {
  const communityNodes = graph.filterNodes(
    (_, attr) => attr.community === community,
  );
  const communityNameInput = communityNodes
    .map((communityNode) =>
      communityNode
        .replaceAll("--", " ")
        .replaceAll("__", " ")
        .replaceAll("-", " ")
        .replaceAll("_", " ")
        .replaceAll(/[0-9]{1,2}/g, "")
        .trim(),
    )
    .join(" ");
  const communityNameFrequency = wordFreq(communityNameInput);
  const communityName = Object.keys(communityNameFrequency)
    .sort((a, b) => communityNameFrequency[b] - communityNameFrequency[a])
    .slice(0, 3)
    .join("/");
  return communityName;
}

export function getDesignSystemSubGraph(
  graph: Graph<GraphologyNodeType, GraphologyEdgeType>,
  config?: Pick<CosmosConfig, "designSystemPrefixes">,
): Graph<GraphologyNodeType, GraphologyEdgeType> {
  const prefixes =
    config?.designSystemPrefixes ?? DEFAULT_CONFIG.designSystemPrefixes;
  const subGraph = graph.copy();

  const nodes = new Set<string>();
  forEachConnectedComponent(subGraph, (component) => {
    if (
      component.some((node) =>
        prefixes.some((prefix) => node.startsWith(prefix)),
      )
    ) {
      for (const node of component) {
        if (!nodes.has(node)) nodes.add(node);
      }
    }
  });
  for (const node of subGraph.nodes()) {
    if (!nodes.has(node)) subGraph.dropNode(node);
  }

  return subGraph;
}

export function toTitleCase(str: string) {
  return str.replace(
    /\w\S*/g,
    (text) => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase(),
  );
}

export function getComponentName(
  selector: string,
  componentSelectorPrefix?: string,
) {
  const prefix =
    componentSelectorPrefix ?? DEFAULT_CONFIG.componentSelectorPrefix;
  return toTitleCase(selector.replaceAll(prefix, "").replaceAll("-", " "));
}
