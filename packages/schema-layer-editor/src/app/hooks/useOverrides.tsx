/**
 * useReducer-based state management for per-component overrides.
 *
 * Manages the in-memory override state as a ComponentOverrides map,
 * providing typed actions for all editing operations.
 *
 * Also tracks the baseline (loaded) state for diff indicators and
 * an expand/collapse toggle for bulk tree control.
 */

import {
  useReducer,
  useState,
  useCallback,
  createContext,
  useContext,
  type Dispatch,
  type ReactNode,
} from "react";
import type {
  ComponentOverrides,
  FieldOverride,
  OverrideMap,
  FieldNode,
} from "../../shared/types.js";
import {
  getComponentOverrides,
  setComponentOverrides,
  setOverride,
  bulkSetVisibility,
  resetOverrides,
  componentHasOverrides,
  recordToComponentOverrides,
  hasOverride,
  isFieldSafetyProtected,
} from "../lib/override-model.js";

// ─── Diff Status ────────────────────────────────────────────────────────────

export type DiffStatus = "unchanged" | "new" | "changed" | "removed";

/**
 * Compute the diff status of a specific field's override.
 *
 * - "new": override exists now but not in baseline
 * - "changed": override exists in both but values differ
 * - "removed": override existed in baseline but was cleared
 * - "unchanged": same or both absent
 */
export function getDiffStatus(
  component: string,
  path: string,
  current: ComponentOverrides,
  baseline: ComponentOverrides | null
): DiffStatus {
  if (!baseline) return "unchanged"; // no baseline loaded, no diffs to show

  const currentOverrides = current.get(component);
  const baselineOverrides = baseline.get(component);

  const currentOvr = currentOverrides?.get(path);
  const baselineOvr = baselineOverrides?.get(path);

  const currentHas = currentOvr && hasOverride(currentOvr);
  const baselineHas = baselineOvr && hasOverride(baselineOvr);

  if (currentHas && !baselineHas) return "new";
  if (!currentHas && baselineHas) return "removed";
  if (currentHas && baselineHas) {
    // Compare values
    if (
      currentOvr!.hidden !== baselineOvr!.hidden ||
      currentOvr!.title !== baselineOvr!.title ||
      currentOvr!.description !== baselineOvr!.description ||
      currentOvr!.order !== baselineOvr!.order ||
      JSON.stringify(currentOvr!.defaultValue) !==
        JSON.stringify(baselineOvr!.defaultValue) ||
      JSON.stringify(currentOvr!.allowedComponents) !==
        JSON.stringify(baselineOvr!.allowedComponents)
    ) {
      return "changed";
    }
  }
  return "unchanged";
}

// ─── Actions ────────────────────────────────────────────────────────────────

export type OverrideAction =
  | {
      type: "SET_VISIBILITY";
      component: string;
      path: string;
      hidden: boolean;
      /** When true, skip hiding scalar fields without defaults */
      safeMode?: boolean;
      /** The FieldNode being toggled (needed for safe-mode check) */
      fieldNode?: FieldNode;
    }
  | { type: "SET_TITLE"; component: string; path: string; title: string }
  | {
      type: "SET_DESCRIPTION";
      component: string;
      path: string;
      description: string;
    }
  | { type: "SET_ORDER"; component: string; path: string; order: number }
  | {
      type: "SET_DEFAULT";
      component: string;
      path: string;
      defaultValue: unknown;
    }
  | {
      type: "MOVE_FIELD";
      component: string;
      path: string;
      direction: "up" | "down";
      siblings: FieldNode[];
    }
  | {
      type: "BULK_SHOW_ALL";
      component: string;
      fields: FieldNode[];
    }
  | {
      type: "BULK_HIDE_ALL";
      component: string;
      fields: FieldNode[];
      /** When true, skip hiding scalar fields without defaults */
      safeMode?: boolean;
    }
  | { type: "RESET_COMPONENT"; component: string }
  | {
      type: "SET_ALLOWED_COMPONENTS";
      component: string;
      path: string;
      allowedComponents: string[];
    }
  | {
      type: "LOAD_OVERRIDES";
      overrides: Record<string, Record<string, FieldOverride>>;
    };

// ─── Reducer ────────────────────────────────────────────────────────────────

/**
 * Filter a FieldNode tree to exclude safety-protected fields.
 * Returns a new tree with protected leaf nodes removed.
 */
function filterUnprotectedFields(
  fields: FieldNode[],
  overrides: OverrideMap
): FieldNode[] {
  return fields
    .map((field) => {
      // Recurse into children
      const filteredChildren = filterUnprotectedFields(
        field.children,
        overrides
      );

      // If this field itself is protected, exclude it
      if (isFieldSafetyProtected(field, overrides.get(field.meta.path))) {
        // But if it has unprotected children, keep the parent (object/array)
        // This shouldn't happen for scalars, but be safe
        return null;
      }

      return { ...field, children: filteredChildren };
    })
    .filter((f): f is FieldNode => f !== null);
}

function overridesReducer(
  state: ComponentOverrides,
  action: OverrideAction
): ComponentOverrides {
  switch (action.type) {
    case "SET_VISIBILITY": {
      // Safe mode: prevent hiding scalar fields without defaults
      if (
        action.safeMode &&
        action.hidden &&
        action.fieldNode &&
        isFieldSafetyProtected(
          action.fieldNode,
          getComponentOverrides(state, action.component).get(action.path)
        )
      ) {
        return state; // no-op
      }
      const compOverrides = getComponentOverrides(state, action.component);
      const existing = compOverrides.get(action.path) || {};
      const updated = setOverride(compOverrides, action.path, {
        ...existing,
        hidden: action.hidden,
      });
      return setComponentOverrides(state, action.component, updated);
    }

    case "SET_TITLE": {
      const compOverrides = getComponentOverrides(state, action.component);
      const existing = compOverrides.get(action.path) || {};
      const updated = setOverride(compOverrides, action.path, {
        ...existing,
        title: action.title,
      });
      return setComponentOverrides(state, action.component, updated);
    }

    case "SET_DESCRIPTION": {
      const compOverrides = getComponentOverrides(state, action.component);
      const existing = compOverrides.get(action.path) || {};
      const updated = setOverride(compOverrides, action.path, {
        ...existing,
        description: action.description,
      });
      return setComponentOverrides(state, action.component, updated);
    }

    case "SET_ORDER": {
      const compOverrides = getComponentOverrides(state, action.component);
      const existing = compOverrides.get(action.path) || {};
      const updated = setOverride(compOverrides, action.path, {
        ...existing,
        order: action.order,
      });
      return setComponentOverrides(state, action.component, updated);
    }

    case "SET_DEFAULT": {
      const compOverrides = getComponentOverrides(state, action.component);
      const existing = compOverrides.get(action.path) || {};
      const updated = setOverride(compOverrides, action.path, {
        ...existing,
        defaultValue: action.defaultValue,
      });
      return setComponentOverrides(state, action.component, updated);
    }

    case "MOVE_FIELD": {
      let compOverrides = getComponentOverrides(state, action.component);

      // Step 1: Ensure all siblings have explicit order values
      // (initialized from schemaOrder if not already set)
      for (const sibling of action.siblings) {
        const existing = compOverrides.get(sibling.meta.path) || {};
        if (existing.order === undefined) {
          compOverrides = setOverride(compOverrides, sibling.meta.path, {
            ...existing,
            order: sibling.meta.schemaOrder,
          });
        }
      }

      // Step 2: Sort siblings by their current effective order
      const sorted = [...action.siblings].sort((a, b) => {
        const aOrder =
          compOverrides.get(a.meta.path)?.order ?? a.meta.schemaOrder;
        const bOrder =
          compOverrides.get(b.meta.path)?.order ?? b.meta.schemaOrder;
        return aOrder - bOrder;
      });

      // Step 3: Find the target field's position in the sorted list
      const idx = sorted.findIndex((f) => f.meta.path === action.path);
      if (idx < 0)
        return setComponentOverrides(state, action.component, compOverrides);

      const swapIdx = action.direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) {
        return setComponentOverrides(state, action.component, compOverrides);
      }

      // Step 4: Swap the order values of the two fields
      const fieldA = sorted[idx];
      const fieldB = sorted[swapIdx];
      const orderA =
        compOverrides.get(fieldA.meta.path)?.order ?? fieldA.meta.schemaOrder;
      const orderB =
        compOverrides.get(fieldB.meta.path)?.order ?? fieldB.meta.schemaOrder;

      const existingA = compOverrides.get(fieldA.meta.path) || {};
      const existingB = compOverrides.get(fieldB.meta.path) || {};
      compOverrides = setOverride(compOverrides, fieldA.meta.path, {
        ...existingA,
        order: orderB,
      });
      compOverrides = setOverride(compOverrides, fieldB.meta.path, {
        ...existingB,
        order: orderA,
      });

      return setComponentOverrides(state, action.component, compOverrides);
    }

    case "BULK_SHOW_ALL": {
      const compOverrides = getComponentOverrides(state, action.component);
      const updated = bulkSetVisibility(compOverrides, action.fields, false);
      return setComponentOverrides(state, action.component, updated);
    }

    case "BULK_HIDE_ALL": {
      const compOverrides = getComponentOverrides(state, action.component);
      const fieldsToHide = action.safeMode
        ? filterUnprotectedFields(action.fields, compOverrides)
        : action.fields;
      const updated = bulkSetVisibility(compOverrides, fieldsToHide, true);
      return setComponentOverrides(state, action.component, updated);
    }

    case "RESET_COMPONENT": {
      const updated = resetOverrides();
      return setComponentOverrides(state, action.component, updated);
    }

    case "SET_ALLOWED_COMPONENTS": {
      const compOverrides = getComponentOverrides(state, action.component);
      const existing = compOverrides.get(action.path) || {};
      const updated = setOverride(compOverrides, action.path, {
        ...existing,
        allowedComponents:
          action.allowedComponents.length > 0
            ? action.allowedComponents
            : undefined,
      });
      return setComponentOverrides(state, action.component, updated);
    }

    case "LOAD_OVERRIDES": {
      return recordToComponentOverrides(action.overrides);
    }

    default:
      return state;
  }
}

// ─── Context ────────────────────────────────────────────────────────────────

interface OverridesContextValue {
  overrides: ComponentOverrides;
  dispatch: Dispatch<OverrideAction>;
  /** Baseline overrides captured at load time, for diff indicators */
  baseline: ComponentOverrides | null;
  /** Monotonically increasing counter to trigger expand/collapse all */
  expandGeneration: number;
  /** true = expand all, false = collapse all (at current generation) */
  expandAll: boolean;
  /** Toggle expand-all / collapse-all */
  toggleExpandAll: (expand: boolean) => void;
  /** Stale override paths — overrides that reference fields not in the schema */
  staleOverrides: Set<string>;
  /** Set stale overrides discovered by layer loading */
  setStaleOverrides: (stale: Set<string>) => void;
  /** Safe mode: prevent hiding scalar fields without defaults */
  safeMode: boolean;
  /** Toggle safe mode on/off */
  toggleSafeMode: () => void;
}

const OverridesContext = createContext<OverridesContextValue | null>(null);

/** Deep-clone a ComponentOverrides map for baseline snapshot */
function cloneOverrides(co: ComponentOverrides): ComponentOverrides {
  const cloned: ComponentOverrides = new Map();
  for (const [comp, overrideMap] of co.entries()) {
    const clonedMap: OverrideMap = new Map();
    for (const [path, ovr] of overrideMap.entries()) {
      clonedMap.set(path, {
        ...ovr,
        allowedComponents: ovr.allowedComponents
          ? [...ovr.allowedComponents]
          : undefined,
      });
    }
    cloned.set(comp, clonedMap);
  }
  return cloned;
}

export function OverridesProvider({ children }: { children: ReactNode }) {
  const [overrides, dispatch] = useReducer(
    overridesReducer,
    new Map() as ComponentOverrides
  );
  const [baseline, setBaseline] = useState<ComponentOverrides | null>(null);
  const [expandGeneration, setExpandGeneration] = useState(0);
  const [expandAll, setExpandAll] = useState(true);
  const [staleOverrides, setStaleOverridesState] = useState<Set<string>>(
    new Set()
  );
  const [safeMode, setSafeMode] = useState(true);

  // Wrap dispatch to capture baseline on LOAD_OVERRIDES
  const wrappedDispatch: Dispatch<OverrideAction> = useCallback(
    (action: OverrideAction) => {
      dispatch(action);
      if (action.type === "LOAD_OVERRIDES") {
        // Snapshot the loaded state as baseline for diff tracking
        const loaded = recordToComponentOverrides(action.overrides);
        setBaseline(cloneOverrides(loaded));
      }
    },
    []
  );

  const toggleExpandAll = useCallback((expand: boolean) => {
    setExpandAll(expand);
    setExpandGeneration((g) => g + 1);
  }, []);

  const setStaleOverrides = useCallback((stale: Set<string>) => {
    setStaleOverridesState(stale);
  }, []);

  const toggleSafeMode = useCallback(() => {
    setSafeMode((prev) => !prev);
  }, []);

  return (
    <OverridesContext.Provider
      value={{
        overrides,
        dispatch: wrappedDispatch,
        baseline,
        expandGeneration,
        expandAll,
        toggleExpandAll,
        staleOverrides,
        setStaleOverrides,
        safeMode,
        toggleSafeMode,
      }}
    >
      {children}
    </OverridesContext.Provider>
  );
}

export function useOverrides() {
  const ctx = useContext(OverridesContext);
  if (!ctx) {
    throw new Error("useOverrides must be used within an OverridesProvider");
  }
  return ctx;
}
