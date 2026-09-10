import { MultiDirectedGraph } from "graphology";
import type { SerializedGraph } from "graphology-types";
import iwanthue from "iwanthue";
import type {
  GraphologyNodeType,
  GraphologyEdgeType,
  CosmosConfig,
} from "./types";
import { DEFAULT_CONFIG } from "./types";

/**
 * Shape of a single extracted property value from `custom-property-extract`.
 * Matches `FullCustomPropertyValues[number]`.
 */
export interface CssPropertyValue {
  value: string;
  selector?: string;
  media?: string;
}

/**
 * Input format for `buildGraphFromCssProperties()`.
 * Maps CSS custom property names to their extracted values.
 * This is the merged output of `custom-property-extract`'s `FullExtractResult`.
 */
export type CssExtractionInput = Record<string, CssPropertyValue[]>;

const varRegExp = /var\(([^,)]+)[^)]*\)/g;

function getColorForProperty(
  propertyName: string,
  prefixColors: Record<string, string>,
  defaultNodeColor: string,
): string {
  for (const [prefix, color] of Object.entries(prefixColors)) {
    if (propertyName.startsWith(prefix)) return color;
  }
  return defaultNodeColor;
}

/**
 * Build a graphology `SerializedGraph` from `custom-property-extract` output.
 *
 * This replaces the original `CssCustomPropertyDirectedGraph` + `getGraphologySerialized()`
 * pipeline, using graphology directly (no `directed-graph-typed` dependency).
 */
export function buildGraphFromCssProperties(
  input: CssExtractionInput,
  config?: CosmosConfig,
): SerializedGraph<GraphologyNodeType, GraphologyEdgeType> {
  const prefixColors = config?.prefixColors ?? DEFAULT_CONFIG.prefixColors;
  const defaultNodeColor =
    config?.defaultNodeColor ?? DEFAULT_CONFIG.defaultNodeColor;

  const graph = new MultiDirectedGraph<
    GraphologyNodeType,
    GraphologyEdgeType
  >();
  const edgePairs = new Set<string>();

  // Add nodes for each property
  for (const [propertyName, propertyValues] of Object.entries(input)) {
    const trimmedName = propertyName.trim();
    if (!graph.hasNode(trimmedName)) {
      graph.addNode(trimmedName, {
        x: Math.random(),
        y: Math.random(),
        size: 2,
        color: getColorForProperty(trimmedName, prefixColors, defaultNodeColor),
        label: trimmedName,
        selectors: propertyValues.map((v) => v.selector || ""),
      });
    } else {
      // Merge selectors for duplicate property entries
      const existing = graph.getNodeAttributes(trimmedName);
      graph.setNodeAttribute(trimmedName, "selectors", [
        ...existing.selectors,
        ...propertyValues.map((v) => v.selector || ""),
      ]);
    }

    // Add edges for var() references
    for (const propertyValue of propertyValues) {
      if (propertyValue.value.includes("var(")) {
        const matches = Array.from(propertyValue.value.matchAll(varRegExp));
        for (const match of matches) {
          if (match.length > 0) {
            const target = match[1].trim();
            if (!graph.hasNode(target)) {
              graph.addNode(target, {
                x: Math.random(),
                y: Math.random(),
                size: 2,
                color: getColorForProperty(
                  target,
                  prefixColors,
                  defaultNodeColor,
                ),
                label: target,
                selectors: [],
              });
            }

            const pairKey = `${trimmedName}\0${target}`;
            if (!edgePairs.has(pairKey)) {
              edgePairs.add(pairKey);
              graph.addEdge(trimmedName, target, {
                selector: propertyValue.selector || "",
                purpose: "reference",
                label: propertyValue.selector || "",
                color: "#0294C1",
              });
            }
          }
        }
      }
    }
  }

  return graph.export();
}

export const levelThresholds = [0.3, 2, 4, 8, 10, 15, 21];
export const levelAlphas = [0.5, 0.45, 0.4, 0.3, 0.2, 0.15, 0.1];

export function getPalette(indexes: string[]): Record<string, string> {
  if (indexes.length === 0) return {};
  return iwanthue(indexes.length, {
    colorSpace: "intense",
    seed: "cool-palette",
    quality: 100,
  }).reduce<Record<string, string>>(
    (iter, color, i) => ({
      ...iter,
      [indexes[i]]: color,
    }),
    {},
  );
}

/**
 * Deep merge two objects, concatenating arrays and recursing into nested objects.
 */
export function deepMerge<T extends Record<string, any>>(obj1: T, obj2: T): T {
  const keys = Array.from(
    new Set([...Object.keys(obj1), ...Object.keys(obj2)]),
  );

  return keys.reduce((acc, key) => {
    const val1 = obj1[key] as any;
    const val2 = obj2[key] as any;

    if (Array.isArray(val1) && Array.isArray(val2)) {
      acc[key] = [...val1, ...val2].filter((value, index, self) => {
        return self.findIndex((v) => v === value) === index;
      });
    } else if (
      typeof val1 === "object" &&
      val1 !== null &&
      typeof val2 === "object" &&
      val2 !== null
    ) {
      acc[key] = deepMerge(val1, val2);
    } else if (key in obj2) {
      acc[key] = structuredClone(val2);
    } else {
      acc[key] = structuredClone(val1);
    }

    return acc;
  }, {} as any) as T;
}
