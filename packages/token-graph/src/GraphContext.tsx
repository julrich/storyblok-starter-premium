import {
  FC,
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type {
  GraphologyEdgeType,
  GraphologyNodeType,
  CosmosConfig,
} from "./types";
import { DEFAULT_CONFIG, resolveConfig } from "./types";
import Graph from "graphology";
import louvain from "graphology-communities-louvain";
import { bfsFromNode } from "graphology-traversal/bfs";
import type {
  CameraState,
  Coordinates,
  EdgeDisplayData,
  NodeDisplayData,
} from "sigma/types";
import { useLoadGraph, useSigmaContext } from "@react-sigma/core";
import { useLayoutForceAtlas2 } from "@react-sigma/layout-forceatlas2";
import {
  DEFAULT_EDGE_CURVATURE,
  indexParallelEdgesIndex,
} from "@sigma/edge-curve";
import { normal } from "color-blend";
import { getCommunityName, hexRgbToRgba, rgbaToString } from "./helpers";
import { bindWebGLLayer, createContoursProgram } from "@sigma/layer-webgl";
import { getPalette, levelAlphas, levelThresholds } from "./bridge";
import type { Sigma } from "sigma";
import type { Attributes } from "graphology-types";

export type CommunityCount = {
  count: number;
  name: string;
  index: number;
};

export const initialCameraState = { x: 0.5, y: 0.5, angle: 0, ratio: 1 };
export const ancestryStates = ["both", "ascendents", "descendents"] as const;
export const breakpointStates = [
  "all",
  "desktop",
  "laptop",
  "tablet",
  "phone",
] as const;
export const invertedStates = ["both", "default", "inverted"] as const;

export const isBreakpointState = (
  breakpoint: string,
): breakpoint is (typeof breakpointStates)[number] => {
  return breakpointStates.includes(breakpoint as any);
};

export const isAncestryState = (
  ancestry: string,
): ancestry is (typeof ancestryStates)[number] => {
  return ancestryStates.includes(ancestry as any);
};

const CosmosGraphContext = createContext<
  | {
      config: Required<CosmosConfig>;
      currentGraphName: string;
      setCurrentGraphName: (name: string) => void;
      graph: Graph<GraphologyNodeType, GraphologyEdgeType>;
      selectedToken: string;
      setSelectedToken: (token: string) => void;
      cameraState: CameraState | null;
      setCameraState: (state: CameraState) => void;
      automaticRelayout: boolean;
      setAutomaticRelayout: (value: boolean) => void;
      ancestryState: (typeof ancestryStates)[number];
      setAncestryState: (value: (typeof ancestryStates)[number]) => void;
      breakpointState: (typeof breakpointStates)[number];
      setBreakpointState: (value: (typeof breakpointStates)[number]) => void;
      invertedState: (typeof invertedStates)[number];
      setInvertedState: (value: (typeof invertedStates)[number]) => void;
      ancestryLevel: number;
      setAncestryLevel: (value: number) => void;
      communities: Record<string, CommunityCount>;
      setCommunities: (communities: Record<string, CommunityCount>) => void;
      filteredCommunities: Record<string, CommunityCount>;
      setFilteredCommunities: (
        communities: Record<string, CommunityCount>,
      ) => void;
      activeCommunities: Set<number>;
      setActiveCommunities: (communities: Set<number>) => void;
      communityPalette: Record<string, string>;
      setCommunityPalette: (palette: Record<string, string>) => void;
      activeComponents: Set<string>;
      setActiveComponents: (components: Set<string>) => void;
      components: Record<string, GraphologyNodeType[]>;
      setComponents: (components: Record<string, GraphologyNodeType[]>) => void;
      componentPalette: Record<string, string>;
      setComponentPalette: (palette: Record<string, string>) => void;
    }
  | undefined
>(undefined);

export const CosmosGraphProvider: FC<
  PropsWithChildren<{
    graphs: Record<string, Graph<GraphologyNodeType, GraphologyEdgeType>>;
    config?: CosmosConfig;
  }>
> = (props) => {
  const resolvedConfig = resolveConfig(props.config);
  const { sigma } = useSigmaContext<GraphologyNodeType, GraphologyEdgeType>();
  const loadGraph = useLoadGraph<GraphologyNodeType, GraphologyEdgeType>();
  const { assign } = useLayoutForceAtlas2({
    iterations: 100,
    outputReducer: (_node, data) => {
      if (data.hidden) {
        return null;
      }
      return data;
    },
  });
  const [communities, setCommunities] = useState<
    Record<string, CommunityCount>
  >({});
  const [filteredCommunities, setFilteredCommunities] = useState<
    Record<string, CommunityCount>
  >({});
  const [activeCommunities, setActiveCommunities] = useState<Set<number>>(
    new Set<number>(),
  );
  const [communityPalette, setCommunityPalette] = useState<
    Record<string, string>
  >({});
  const [components, setComponents] = useState<
    Record<string, GraphologyNodeType[]>
  >({});
  const [activeComponents, setActiveComponents] = useState<Set<string>>(
    new Set<string>(),
  );
  const [componentPalette, setComponentPalette] = useState<
    Record<string, string>
  >({});
  const [activeContours, setActiveContours] = useState<
    Record<string, null | (() => void)>
  >({});
  const [currentGraphName, setCurrentGraphName] = useState<string>(
    resolvedConfig.defaultGraph,
  );

  const graph = props.graphs[currentGraphName];

  useEffect(() => {
    if (communities) {
      const filtered = Object.values(communities).filter(
        (community) => community.count > 25,
      );
      setFilteredCommunities(
        filtered.reduce<Record<string, CommunityCount>>((acc, community) => {
          acc[community.index] = community;
          return acc;
        }, {}),
      );
    }
  }, [communities]);

  useEffect(() => {
    if (filteredCommunities && Object.keys(filteredCommunities).length > 0)
      setCommunityPalette(
        getPalette(
          Object.values(filteredCommunities).map((community) =>
            community.index.toString(),
          ),
        ),
      );
  }, [filteredCommunities]);

  useEffect(() => {
    if (components && Object.keys(components).length > 0)
      setComponentPalette(getPalette(Object.keys(components)));
  }, [components]);

  useEffect(() => {
    indexParallelEdgesIndex(graph, {
      edgeIndexAttribute: "parallelIndex",
      edgeMaxIndexAttribute: "parallelMaxIndex",
    });

    graph.forEachEdge((edge, { parallelIndex, parallelMaxIndex }) => {
      if (typeof parallelIndex === "number") {
        graph.mergeEdgeAttributes(edge, {
          type: "curved",
          curvature:
            DEFAULT_EDGE_CURVATURE +
            (3 * DEFAULT_EDGE_CURVATURE * parallelIndex) /
              (parallelMaxIndex || 1),
        });
      } else {
        graph.setEdgeAttribute(edge, "type", "straight");
      }
    });

    louvain.assign(graph, { nodeCommunityAttribute: "community" });

    const newCommunities: Record<string, CommunityCount> = {};
    const newComponents: Record<string, GraphologyNodeType[]> = {};

    const selectorPattern = resolvedConfig.componentSelectorPattern;
    const selectorPrefix = resolvedConfig.componentSelectorPrefix;

    graph.forEachNode((node, attrs) => {
      if (attrs.community) {
        const communityName = getCommunityName(graph, attrs.community);
        const communityKey = communityName.replace(/ /g, "-");
        newCommunities[communityKey] = {
          count: (newCommunities[communityKey]?.count || 0) + 1,
          name: communityName,
          index: parseInt(attrs.community),
        };
      }

      // Use a fresh regex for each node to reset lastIndex
      const regex = new RegExp(selectorPattern.source, selectorPattern.flags);
      const matches = Array.from(node.matchAll(regex));
      if (
        matches &&
        matches.length > 0 &&
        attrs.selectors.some((selector) =>
          selector.startsWith(`${selectorPrefix}${matches[0][1]}`),
        )
      ) {
        const key = `${selectorPrefix}${matches[0][1]}`;
        newComponents[key] ||= [];
        newComponents[key].push(attrs);
      }
    });
    setCommunities(newCommunities);
    setComponents(newComponents);

    loadGraph(graph);
    assign();
  }, [loadGraph, graph, assign]);

  const camera = sigma.getCamera();

  const [selectedToken, setSelectedToken] = useState<string>("");
  const [cameraState, setCameraState] = useState<CameraState>(
    camera.getState(),
  );
  const [automaticRelayout, setAutomaticRelayout] = useState<boolean>(false);
  const [ancestryState, setAncestryState] =
    useState<(typeof ancestryStates)[number]>("both");
  const [invertedState, setInvertedState] =
    useState<(typeof invertedStates)[number]>("both");
  const [breakpointState, setBreakpointState] =
    useState<(typeof breakpointStates)[number]>("all");
  const [ancestryLevel, setAncestryLevel] = useState<number>(0);

  const equalCameraState = (a: CameraState, b: CameraState) =>
    a.x === b.x && a.y === b.y && a.ratio === b.ratio && a.angle === b.angle;

  const discoverNodes = useCallback(
    (
      startNode: string,
      direction: (typeof ancestryStates)[number],
      level: number = 0,
    ) => {
      const newNodes = new Set<string>();
      if (direction === "both" || direction === "descendents") {
        bfsFromNode(
          graph,
          startNode,
          (node) => {
            if (!newNodes.has(node)) newNodes.add(node);
          },
          {
            mode: "outbound",
          },
        );

        if (level < ancestryLevel) {
          for (const node of Array.from(newNodes)) {
            if (node === startNode) continue;
            for (const additionalNode of graph.inboundNeighbors(node)) {
              if (!newNodes.has(additionalNode))
                discoverNodes(additionalNode, direction, level + 1);
            }
          }
        }
      }

      if (direction === "both" || direction === "ascendents") {
        bfsFromNode(
          graph,
          startNode,
          (node) => {
            if (!newNodes.has(node)) newNodes.add(node);
          },
          {
            mode: "inbound",
          },
        );

        if (level < ancestryLevel) {
          for (const node of Array.from(newNodes)) {
            if (node === startNode) continue;
            for (const additionalNode of graph.outboundNeighbors(node)) {
              if (!newNodes.has(additionalNode))
                discoverNodes(additionalNode, direction, level + 1);
            }
          }
        }
      }

      return newNodes;
    },
    [graph, ancestryLevel],
  );

  const background = resolvedConfig.backgroundColor;

  const reduceNodes = useCallback(
    (nodes: Set<string>) => {
      sigma.setSetting("nodeReducer", (node, data) => {
        const res: Partial<NodeDisplayData> = { ...data };
        if (!nodes.has(node) && automaticRelayout) {
          res.hidden = true;
        } else if (!nodes.has(node) && !automaticRelayout) {
          res.color = rgbaToString(
            normal(background, hexRgbToRgba("#CCCCCC", 0.2)),
          );
          res.size = 1;
        } else if (node === selectedToken) {
          res.size = 4;
          res.color = "#0294C1";
        } else {
          res.size = 2;
        }
        return res;
      });
      sigma.setSetting("edgeReducer", (edge, data) => {
        const res: Partial<EdgeDisplayData> = { ...data };
        if (!nodes.has(graph.source(edge)) || !nodes.has(graph.target(edge))) {
          res.color = rgbaToString(
            normal(background, hexRgbToRgba("#CCCCCC", 0.4)),
          );
        }
        return res;
      });
      sigma.refresh({
        skipIndexation: true,
      });
      if (automaticRelayout) assign();
    },
    [sigma, graph, selectedToken, automaticRelayout, assign, background],
  );

  useEffect(() => {
    camera.animate(cameraState, { duration: 500 });
  }, [camera, cameraState]);

  useEffect(() => {
    const nodes = new Set<string>();

    const toggleContour = (
      name: string,
      contourNodes: string[],
      palette: Record<string, string>,
    ) => {
      const clean = bindWebGLLayer(
        `contour-${name}`,
        sigma as unknown as Sigma<Attributes, Attributes, Attributes>,
        createContoursProgram(contourNodes, {
          radius: 100,
          border: {
            color: rgbaToString(
              normal(background, hexRgbToRgba(palette[name], 0.8)),
            ),
            thickness: 1,
          },
          levels: levelThresholds.reduce<
            { color?: string | undefined; threshold: number }[]
          >((acc, threshold, index) => {
            acc.push({
              color: rgbaToString(
                normal(
                  background,
                  hexRgbToRgba(palette[name], levelAlphas[index]),
                ),
              ),
              threshold,
            });
            return acc;
          }, []),
        }),
      );

      return clean;
    };

    const toggleCommunityContour = (
      community: CommunityCount,
      palette: Record<string, string>,
    ) => {
      const communityIndex = community.index.toString();
      if (
        activeContours &&
        activeContours[communityIndex] &&
        activeContours[communityIndex] !== null &&
        typeof activeContours[communityIndex] === "function"
      ) {
        activeContours[communityIndex]!();
        const newActiveContours = { ...activeContours };
        newActiveContours[communityIndex] = null;
        setActiveContours(newActiveContours);
      } else {
        activeContours[communityIndex] ||= toggleContour(
          community.index.toString(),
          graph.filterNodes((_, attr) => {
            if (attr.community && parseInt(attr.community) === community.index)
              return true;
          }),
          palette,
        );
      }
    };

    const toggleComponentContour = (
      component: string,
      palette: Record<string, string>,
    ) => {
      const newActiveContours = { ...activeContours };
      if (
        activeContours &&
        activeContours[component] &&
        activeContours[component] !== null &&
        typeof activeContours[component] === "function"
      ) {
        activeContours[component]!();
        newActiveContours[component] = null;
        setActiveContours(newActiveContours);
      } else {
        newActiveContours[component] ||= toggleContour(
          component,
          components[component].map((node) => node.label),
          palette,
        );
        setActiveContours(newActiveContours);
      }
    };

    if (selectedToken !== "") {
      const newNodes = discoverNodes(selectedToken, ancestryState);
      newNodes.forEach(nodes.add, nodes);
      reduceNodes(nodes);

      const nodePosition = sigma.getNodeDisplayData(
        selectedToken,
      ) as Coordinates;
      const currentCameraState = camera.getState();
      const targetCameraState =
        currentCameraState.ratio === initialCameraState.ratio &&
        currentCameraState.angle === initialCameraState.angle
          ? {
              x: nodePosition.x,
              y: nodePosition.y,
              ratio: 0.1,
              angle: 0,
            }
          : {
              x: nodePosition.x,
              y: nodePosition.y,
              ratio: currentCameraState.ratio,
              angle: currentCameraState.angle,
            };
      if (!equalCameraState(cameraState, targetCameraState))
        setCameraState(targetCameraState);
    } else if (activeComponents.size > 0) {
      for (const activeComponent of Array.from(activeComponents)) {
        const newNodes = new Set<string>();
        for (const token of components[activeComponent]) {
          discoverNodes(token.label, ancestryState).forEach(
            newNodes.add,
            newNodes,
          );
        }
        newNodes.forEach(nodes.add, nodes);
      }

      reduceNodes(nodes);
    } else {
      sigma.setSetting("nodeReducer", null);
      sigma.setSetting("edgeReducer", null);
      sigma.refresh({
        skipIndexation: true,
      });
      if (automaticRelayout) assign();
      if (!equalCameraState(cameraState, initialCameraState))
        setCameraState(initialCameraState);
    }

    for (const activeComponent of Array.from(activeComponents)) {
      if (!activeContours[activeComponent])
        toggleComponentContour(activeComponent, componentPalette);
    }

    for (const component of Object.keys(components)) {
      if (
        !activeComponents.has(component) &&
        activeContours[component] &&
        activeContours[component] !== null
      ) {
        toggleComponentContour(component, componentPalette);
      }
    }

    for (const communityIndex of Array.from(activeCommunities)) {
      const community = Object.values(communities).find(
        (c) => c.index === communityIndex,
      );
      if (community && !activeContours[community.index])
        toggleCommunityContour(community, communityPalette);
    }

    for (const community of Object.values(communities)) {
      if (
        !activeCommunities.has(community.index) &&
        activeContours[community.index.toString()]
      ) {
        toggleCommunityContour(community, communityPalette);
      }
    }
  }, [
    selectedToken,
    graph,
    sigma,
    cameraState,
    automaticRelayout,
    assign,
    ancestryLevel,
    ancestryState,
    camera,
    activeComponents,
    components,
    activeCommunities,
    communityPalette,
    communities,
    activeContours,
    componentPalette,
    discoverNodes,
    reduceNodes,
    background,
  ]);

  return (
    <CosmosGraphContext.Provider
      value={{
        config: resolvedConfig,
        currentGraphName,
        graph,
        setCurrentGraphName,
        selectedToken,
        setSelectedToken,
        cameraState,
        setCameraState,
        automaticRelayout,
        setAutomaticRelayout,
        ancestryState,
        setAncestryState,
        breakpointState,
        setBreakpointState,
        invertedState,
        setInvertedState,
        ancestryLevel,
        setAncestryLevel,
        communities,
        setCommunities,
        filteredCommunities,
        setFilteredCommunities,
        activeCommunities,
        setActiveCommunities,
        communityPalette,
        setCommunityPalette,
        activeComponents,
        setActiveComponents,
        components,
        setComponents,
        componentPalette,
        setComponentPalette,
      }}
    >
      {props.children}
    </CosmosGraphContext.Provider>
  );
};

export const useCosmosGraphContext = () => {
  const context = useContext(CosmosGraphContext);
  if (!context) throw new Error("CosmosGraphContext not found");
  return context;
};
