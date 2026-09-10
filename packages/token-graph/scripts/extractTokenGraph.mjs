/**
 * extractTokenGraph.mjs
 *
 * Reads all per-component *-tokens.json files (output of customPropertyExtract.cjs)
 * plus the compiled semantic tokens CSS, merges them, builds a graphology graph,
 * and writes a token-graph.json containing both "full" and "design-system"
 * serialized graph views.
 *
 * Usage: node scripts/extractTokenGraph.mjs <designSystemRoot> <outputPath>
 *   designSystemRoot — path to the design-system package root (e.g. ../design-system)
 *   outputPath       — where to write token-graph.json (e.g. ../design-system/src/token/token-graph.json)
 */

import fs from "fs-extra";
import fg from "fast-glob";
import path from "path";
import { extract } from "custom-property-extract";
import graphology from "graphology";
const { MultiDirectedGraph } = graphology;
import graphologyComponents from "graphology-components";
const { forEachConnectedComponent } = graphologyComponents;

const [, , designSystemRoot, outputPath] = process.argv;

if (!designSystemRoot || !outputPath) {
  console.error(
    "Usage: node scripts/extractTokenGraph.mjs <designSystemRoot> <outputPath>",
  );
  process.exit(1);
}

const dsRoot = path.resolve(designSystemRoot);
const outFile = path.resolve(outputPath);

// --- Inline helpers (avoids importing from .ts source) ---

const DEFAULT_PREFIX_COLORS = {
  "--ks-": "#ecff00",
  "--dsa-": "#e21879",
};
const DEFAULT_NODE_COLOR = "#00F218";
const DS_PREFIXES = ["--c-", "--l-", "--dsa-"];

const varRegExp = /var\(([^,)]+)[^)]*\)/g;

function getColorForProperty(propertyName, prefixColors, defaultColor) {
  for (const [prefix, color] of Object.entries(prefixColors)) {
    if (propertyName.startsWith(prefix)) return color;
  }
  return defaultColor;
}

function deepMerge(obj1, obj2) {
  const keys = Array.from(
    new Set([...Object.keys(obj1), ...Object.keys(obj2)]),
  );

  return keys.reduce((acc, key) => {
    const val1 = obj1[key];
    const val2 = obj2[key];

    if (Array.isArray(val1) && Array.isArray(val2)) {
      // Deduplicate by reference equality (matches original behavior)
      acc[key] = [...val1, ...val2].filter(
        (value, index, self) => self.findIndex((v) => v === value) === index,
      );
    } else if (
      typeof val1 === "object" &&
      val1 !== null &&
      typeof val2 === "object" &&
      val2 !== null &&
      !Array.isArray(val1) &&
      !Array.isArray(val2)
    ) {
      acc[key] = deepMerge(val1, val2);
    } else if (key in obj2) {
      acc[key] = val2;
    } else {
      acc[key] = val1;
    }

    return acc;
  }, {});
}

function buildGraph(input) {
  const graph = new MultiDirectedGraph();
  // Track existing edge pairs to avoid duplicates (matches original DirectedGraph behavior)
  const edgePairs = new Set();

  for (const [propertyName, propertyValues] of Object.entries(input)) {
    const trimmed = propertyName.trim();
    if (!graph.hasNode(trimmed)) {
      graph.addNode(trimmed, {
        x: Math.random(),
        y: Math.random(),
        size: 2,
        color: getColorForProperty(
          trimmed,
          DEFAULT_PREFIX_COLORS,
          DEFAULT_NODE_COLOR,
        ),
        label: trimmed,
        selectors: propertyValues.map((v) => v.selector || ""),
      });
    } else {
      const existing = graph.getNodeAttributes(trimmed);
      graph.setNodeAttribute(trimmed, "selectors", [
        ...existing.selectors,
        ...propertyValues.map((v) => v.selector || ""),
      ]);
    }

    for (const pv of propertyValues) {
      if (pv.value.includes("var(")) {
        const matches = Array.from(pv.value.matchAll(varRegExp));
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
                  DEFAULT_PREFIX_COLORS,
                  DEFAULT_NODE_COLOR,
                ),
                label: target,
                selectors: [],
              });
            }
            // Only add one edge per source→target pair (matches original behavior)
            const pairKey = `${trimmed}\0${target}`;
            if (!edgePairs.has(pairKey)) {
              edgePairs.add(pairKey);
              graph.addEdge(trimmed, target, {
                selector: pv.selector || "",
                purpose: "reference",
                label: pv.selector || "",
                color: "#0294C1",
              });
            }
          }
        }
      }
    }
  }

  return graph;
}

function getDesignSystemSubGraph(fullGraph) {
  const sub = new MultiDirectedGraph();
  const dsNodes = new Set();

  fullGraph.forEachNode((node) => {
    for (const prefix of DS_PREFIXES) {
      if (node.startsWith(prefix)) {
        dsNodes.add(node);
        break;
      }
    }
  });

  // Also include any node referenced by a DS node
  for (const node of dsNodes) {
    fullGraph.forEachOutNeighbor(node, (neighbor) => dsNodes.add(neighbor));
    fullGraph.forEachInNeighbor(node, (neighbor) => {
      for (const prefix of DS_PREFIXES) {
        if (neighbor.startsWith(prefix)) {
          dsNodes.add(neighbor);
          break;
        }
      }
    });
  }

  for (const node of dsNodes) {
    if (!sub.hasNode(node)) {
      sub.addNode(node, fullGraph.getNodeAttributes(node));
    }
  }

  fullGraph.forEachEdge((edge, attrs, source, target) => {
    if (dsNodes.has(source) && dsNodes.has(target)) {
      sub.addEdge(source, target, attrs);
    }
  });

  // Keep only the largest connected component
  const components = [];
  forEachConnectedComponent(sub, (nodes) => components.push(nodes));
  if (components.length > 1) {
    components.sort((a, b) => b.length - a.length);
    for (let i = 1; i < components.length; i++) {
      for (const node of components[i]) {
        sub.dropNode(node);
      }
    }
  }

  return sub;
}

// --- Main ---

async function run() {
  let merged = {};

  // Match the original extraction pipeline from extractComponentToken.js:
  // 1. All dist/components/**/*.css (excluding page-wrapper)
  // 2. dist/global.css (semantic + base + normalize tokens)
  // 3. src/token/tokens.css (Style Dictionary compiled tokens)

  // 1. Extract from compiled component CSS files
  const compiledCssFiles = (
    await fg(path.join(dsRoot, "dist/components/**/*.css"))
  ).filter((f) => !f.includes("page-wrapper"));
  for (const file of compiledCssFiles) {
    const css = await fs.readFile(file, "utf8");
    const tokens = extract(css, { source: "content", mode: "full" });
    merged = deepMerge(merged, tokens);
  }

  // 2. Extract from global.css (contains all semantic, base, normalize tokens)
  const globalCssPath = path.join(dsRoot, "dist/global.css");
  if (await fs.pathExists(globalCssPath)) {
    const css = await fs.readFile(globalCssPath, "utf8");
    const globalTokens = extract(css, {
      source: "content",
      mode: "full",
    });
    merged = deepMerge(merged, globalTokens);
  }

  // 3. Extract from the compiled semantic tokens CSS
  const tokensCssPath = path.join(dsRoot, "src/token/tokens.css");
  if (await fs.pathExists(tokensCssPath)) {
    const css = await fs.readFile(tokensCssPath, "utf8");
    const semanticTokens = extract(css, {
      source: "content",
      mode: "full",
    });
    merged = deepMerge(merged, semanticTokens);
  }

  // 4. Build the full graph
  const fullGraph = buildGraph(merged);
  const fullSerialized = fullGraph.export();

  // 5. Build design-system subgraph
  const dsGraph = getDesignSystemSubGraph(fullGraph);
  const dsSerialized = dsGraph.export();

  // 6. Write output
  const output = {
    full: fullSerialized,
    "design-system": dsSerialized,
  };

  await fs.ensureDir(path.dirname(outFile));
  await fs.writeJSON(outFile, output, { spaces: 0 });

  console.log(
    `Token graph written to ${outFile} (full: ${fullSerialized.nodes.length} nodes, ds: ${dsSerialized.nodes.length} nodes)`,
  );
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
