import catalog from "@kickstartds/design-system/tokens/component-token-catalog.json";
import { componentTokensToCss } from "@kickstartds/design-system/tokens/componentTokensToCss.mjs";
import {
  createContext,
  Dispatch,
  FC,
  PropsWithChildren,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { usePreset } from "../presets/PresetContext";
import { useToken } from "../token/TokenContext";
import { useLocalStorage } from "../utils/useLocalStorage";

// ── Catalog types ──────────────────────────────────────────────────

export interface TokenMeta {
  defaultValue: string;
  valueType: "literal" | "semantic-ref" | "component-ref";
  referencedToken: string | null;
}

export interface ComponentCatalogEntry {
  displayName: string;
  selector: string;
  tokens: Record<string, TokenMeta>;
  responsiveTokens: Record<string, Record<string, TokenMeta>>;
}

export type ComponentTokenCatalog = Record<string, ComponentCatalogEntry>;

/** Sparse overrides: only tokens the user has actually changed. */
export type ComponentOverrides = Record<
  string,
  Record<string, string | Record<string, string>>
>;

// ── Context interface ──────────────────────────────────────────────

export interface IComponentTokenContext {
  /** Full catalog of all component tokens (read-only). */
  catalog: ComponentTokenCatalog;
  /** Sorted list of component IDs. */
  componentIds: string[];
  /** Current sparse overrides. */
  overrides: ComponentOverrides;
  /** Replace the entire overrides object. */
  setOverrides: Dispatch<SetStateAction<ComponentOverrides>>;
  /** Set a single token override for a component. */
  setTokenOverride: (
    component: string,
    token: string,
    value: string,
    query?: string,
  ) => void;
  /** Remove a single token override. */
  removeTokenOverride: (
    component: string,
    token: string,
    query?: string,
  ) => void;
  /** Reset all overrides for a component. */
  resetComponent: (component: string) => void;
  /** Reset all overrides. */
  resetAll: () => void;
  /** Compiled scoped CSS string for preview injection. */
  componentCss: string;
  /** Count of active overrides per component. */
  overrideCounts: Record<string, number>;
  /** Orphaned token names found during validation. */
  orphanedTokens: string[];
  /** Strip all orphaned tokens from overrides. */
  stripOrphans: () => void;
}

const ComponentTokenContext = createContext<IComponentTokenContext>({
  catalog: {} as ComponentTokenCatalog,
  componentIds: [],
  overrides: {},
  setOverrides() {},
  setTokenOverride() {},
  removeTokenOverride() {},
  resetComponent() {},
  resetAll() {},
  componentCss: "",
  overrideCounts: {},
  orphanedTokens: [],
  stripOrphans() {},
});

const typedCatalog = catalog as unknown as ComponentTokenCatalog;
const sortedComponentIds = Object.keys(typedCatalog).sort();

export const ComponentTokenContextProvider: FC<PropsWithChildren> = ({
  children,
}) => {
  const [overrides, setOverrides] = useLocalStorage<ComponentOverrides>(
    "componentTokens",
    {},
  );
  const { componentTokenPreset } = usePreset();
  const { setComponentTokensGetter } = useToken();

  // Register override getter for save flow
  useEffect(() => {
    setComponentTokensGetter(() => overrides);
  }, [overrides, setComponentTokensGetter]);

  // Sync from preset when a theme is loaded
  useEffect(() => {
    if (componentTokenPreset !== undefined) {
      setOverrides(componentTokenPreset || {});
    }
  }, [componentTokenPreset]);

  // Compile CSS whenever overrides change
  const componentCss = useMemo(() => {
    if (!overrides || Object.keys(overrides).length === 0) return "";
    return componentTokensToCss(overrides, typedCatalog);
  }, [overrides]);

  // Store CSS in localStorage for preview iframe
  useEffect(() => {
    localStorage.setItem("componentCss", componentCss);
  }, [componentCss]);

  // Count overrides per component
  const overrideCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const [comp, tokens] of Object.entries(overrides)) {
      let count = 0;
      for (const val of Object.values(tokens)) {
        if (typeof val === "string") {
          count++;
        } else if (typeof val === "object" && val !== null) {
          count += Object.keys(val).length;
        }
      }
      if (count > 0) counts[comp] = count;
    }
    return counts;
  }, [overrides]);

  // Detect orphaned tokens (overrides referencing tokens not in the catalog)
  const orphanedTokens = useMemo(() => {
    const orphans: string[] = [];
    for (const [compId, compOverrides] of Object.entries(overrides)) {
      const entry = typedCatalog[compId];
      if (!entry) {
        orphans.push(`${compId} (unknown component)`);
        continue;
      }
      for (const [key, val] of Object.entries(compOverrides)) {
        if (typeof val === "string") {
          if (!entry.tokens[key]) {
            orphans.push(`${compId}/${key}`);
          }
        } else if (typeof val === "object" && val !== null) {
          if (!entry.responsiveTokens[key]) {
            orphans.push(`${compId}/${key} (unknown query)`);
          } else {
            for (const tokenName of Object.keys(
              val as Record<string, string>,
            )) {
              if (!entry.responsiveTokens[key][tokenName]) {
                orphans.push(`${compId}/${key}/${tokenName}`);
              }
            }
          }
        }
      }
    }
    return orphans;
  }, [overrides]);

  // Strip all orphaned tokens
  const stripOrphans = useCallback(() => {
    setOverrides((prev) => {
      const cleaned: ComponentOverrides = {};
      for (const [compId, compOverrides] of Object.entries(prev)) {
        const entry = typedCatalog[compId];
        if (!entry) continue; // remove unknown component entirely
        const cleanedComp: Record<string, string | Record<string, string>> = {};
        for (const [key, val] of Object.entries(compOverrides)) {
          if (typeof val === "string") {
            if (entry.tokens[key]) cleanedComp[key] = val;
          } else if (typeof val === "object" && val !== null) {
            if (entry.responsiveTokens[key]) {
              const cleanedQuery: Record<string, string> = {};
              for (const [t, v] of Object.entries(
                val as Record<string, string>,
              )) {
                if (entry.responsiveTokens[key][t]) cleanedQuery[t] = v;
              }
              if (Object.keys(cleanedQuery).length > 0) {
                cleanedComp[key] = cleanedQuery;
              }
            }
          }
        }
        if (Object.keys(cleanedComp).length > 0) {
          cleaned[compId] = cleanedComp;
        }
      }
      return cleaned;
    });
  }, [setOverrides]);

  const setTokenOverride = (
    component: string,
    token: string,
    value: string,
    query?: string,
  ) => {
    setOverrides((prev) => {
      const compOverrides = { ...prev[component] };
      if (query) {
        const queryOverrides =
          typeof compOverrides[query] === "object"
            ? { ...(compOverrides[query] as Record<string, string>) }
            : {};
        queryOverrides[token] = value;
        compOverrides[query] = queryOverrides;
      } else {
        compOverrides[token] = value;
      }
      return { ...prev, [component]: compOverrides };
    });
  };

  const removeTokenOverride = (
    component: string,
    token: string,
    query?: string,
  ) => {
    setOverrides((prev) => {
      const compOverrides = { ...prev[component] };
      if (query) {
        if (typeof compOverrides[query] === "object") {
          const queryOverrides = {
            ...(compOverrides[query] as Record<string, string>),
          };
          delete queryOverrides[token];
          if (Object.keys(queryOverrides).length === 0) {
            delete compOverrides[query];
          } else {
            compOverrides[query] = queryOverrides;
          }
        }
      } else {
        delete compOverrides[token];
      }
      // Clean up empty component entry
      const hasTokens = Object.keys(compOverrides).length > 0;
      if (!hasTokens) {
        const { [component]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [component]: compOverrides };
    });
  };

  const resetComponent = (component: string) => {
    setOverrides((prev) => {
      const { [component]: _, ...rest } = prev;
      return rest;
    });
  };

  const resetAll = () => setOverrides({});

  return (
    <ComponentTokenContext.Provider
      value={{
        catalog: typedCatalog,
        componentIds: sortedComponentIds,
        overrides,
        setOverrides,
        setTokenOverride,
        removeTokenOverride,
        resetComponent,
        resetAll,
        componentCss,
        overrideCounts,
        orphanedTokens,
        stripOrphans,
      }}
    >
      {children}
    </ComponentTokenContext.Provider>
  );
};

export const useComponentTokens = () => useContext(ComponentTokenContext);
