/**
 * Override data structure and merge logic.
 *
 * Manages a map of component name → field path → override values.
 * Used by both the React state management (useOverrides hook) and
 * the server-side layer loader/writer.
 */

import type {
  FieldOverride,
  OverrideMap,
  ComponentOverrides,
  FieldNode,
} from "../../shared/types.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Check if an override has any non-undefined values */
export function hasOverride(override: FieldOverride): boolean {
  return (
    override.hidden !== undefined ||
    override.title !== undefined ||
    override.description !== undefined ||
    override.order !== undefined ||
    override.defaultValue !== undefined ||
    override.allowedComponents !== undefined
  );
}

/** Create an empty override */
export function emptyOverride(): FieldOverride {
  return {};
}

/** Merge two overrides (second wins on conflicts) */
export function mergeOverrides(
  base: FieldOverride,
  patch: FieldOverride
): FieldOverride {
  const merged: FieldOverride = { ...base };
  if (patch.hidden !== undefined) merged.hidden = patch.hidden;
  if (patch.title !== undefined) merged.title = patch.title;
  if (patch.description !== undefined) merged.description = patch.description;
  if (patch.order !== undefined) merged.order = patch.order;
  if (patch.allowedComponents !== undefined)
    merged.allowedComponents = patch.allowedComponents;
  return merged;
}

// ─── Override Map Operations ────────────────────────────────────────────────

/** Get the override for a field path, or undefined */
export function getOverride(
  overrides: OverrideMap,
  path: string
): FieldOverride | undefined {
  return overrides.get(path);
}

/** Set an override for a field path */
export function setOverride(
  overrides: OverrideMap,
  path: string,
  override: FieldOverride
): OverrideMap {
  const next = new Map(overrides);
  if (hasOverride(override)) {
    next.set(path, override);
  } else {
    next.delete(path);
  }
  return next;
}

/** Check if a parent path is hidden (for inherited-hidden logic) */
export function isParentHidden(overrides: OverrideMap, path: string): boolean {
  const parts = path.split(".");
  // Walk up the path hierarchy
  for (let i = 1; i < parts.length; i++) {
    // Handle [] in paths: "buttons[].label" → parent is "buttons"
    const parentPath = parts.slice(0, i).join(".").replace(/\[\]$/, "");
    const parentOverride = overrides.get(parentPath);
    if (parentOverride?.hidden === true) {
      return true;
    }
    // Also check without [] stripping
    const parentPathFull = parts.slice(0, i).join(".");
    if (parentPathFull !== parentPath) {
      const po = overrides.get(parentPathFull);
      if (po?.hidden === true) return true;
    }
  }
  return false;
}

/** Check if a field is effectively hidden (either directly or inherited) */
export function isEffectivelyHidden(
  overrides: OverrideMap,
  path: string
): boolean {
  const own = overrides.get(path);
  if (own?.hidden === true) return true;
  return isParentHidden(overrides, path);
}

// ─── Component Overrides Operations ─────────────────────────────────────────

/** Get the override map for a component */
export function getComponentOverrides(
  allOverrides: ComponentOverrides,
  componentName: string
): OverrideMap {
  return allOverrides.get(componentName) || new Map();
}

/** Set the override map for a component */
export function setComponentOverrides(
  allOverrides: ComponentOverrides,
  componentName: string,
  overrides: OverrideMap
): ComponentOverrides {
  const next = new Map(allOverrides);
  if (overrides.size === 0) {
    next.delete(componentName);
  } else {
    next.set(componentName, overrides);
  }
  return next;
}

/** Count how many components have at least one override */
export function countComponentsWithOverrides(
  allOverrides: ComponentOverrides
): number {
  let count = 0;
  for (const overrides of allOverrides.values()) {
    for (const override of overrides.values()) {
      if (hasOverride(override)) {
        count++;
        break;
      }
    }
  }
  return count;
}

/** Check if a specific component has any overrides */
export function componentHasOverrides(
  allOverrides: ComponentOverrides,
  componentName: string
): boolean {
  const overrides = allOverrides.get(componentName);
  if (!overrides) return false;
  for (const override of overrides.values()) {
    if (hasOverride(override)) return true;
  }
  return false;
}

// ─── Bulk Operations ────────────────────────────────────────────────────────

/** Collect all field paths from a FieldNode tree */
export function collectFieldPaths(fields: FieldNode[]): string[] {
  const paths: string[] = [];

  function walk(node: FieldNode) {
    paths.push(node.meta.path);
    for (const child of node.children) {
      walk(child);
    }
  }

  for (const field of fields) {
    walk(field);
  }
  return paths;
}

/** Set visibility on all fields in a tree */
export function bulkSetVisibility(
  overrides: OverrideMap,
  fields: FieldNode[],
  hidden: boolean
): OverrideMap {
  let result = new Map(overrides);
  const paths = collectFieldPaths(fields);

  for (const path of paths) {
    const existing = result.get(path) || emptyOverride();
    result = setOverride(result, path, { ...existing, hidden });
  }

  return result;
}

/** Reset all overrides for a component */
export function resetOverrides(): OverrideMap {
  return new Map();
}

/**
 * Check if a field is protected in safe mode.
 *
 * A field is protected when it has no default value (schema or override) AND:
 * - It is a non-string scalar (boolean, number, integer) — these always need
 *   an explicit value for safe rendering, OR
 * - It is a string with enum constraints (missing value = invalid variant), OR
 * - It is a required string (component expects it to be present)
 *
 * Optional strings without enums are safe to hide — they degrade gracefully
 * to undefined/empty. Objects and arrays are excluded entirely (they never
 * have defaults in our schemas).
 */
export function isFieldSafetyProtected(
  field: FieldNode,
  fieldOverride?: FieldOverride
): boolean {
  const scalarTypes = new Set(["string", "number", "integer", "boolean"]);
  if (!scalarTypes.has(field.meta.type)) return false;

  // Has a schema default → safe to hide
  if (field.meta.defaultValue !== undefined) return false;

  // Has an override default → safe to hide
  if (fieldOverride?.defaultValue !== undefined) return false;

  // Non-string scalars (boolean, number, integer) are always dangerous
  if (field.meta.type !== "string") return true;

  // String with enum values — hiding would lose the variant selection
  if (field.meta.enumValues && field.meta.enumValues.length > 0) return true;

  // Required strings — component expects them
  if (field.meta.required) return true;

  // Optional strings without enums degrade gracefully → safe to hide
  return false;
}

// ─── Serialization helpers ──────────────────────────────────────────────────

/** Convert OverrideMap to a plain object for JSON serialization */
export function overrideMapToRecord(
  overrides: OverrideMap
): Record<string, FieldOverride> {
  const record: Record<string, FieldOverride> = {};
  for (const [path, override] of overrides) {
    if (hasOverride(override)) {
      record[path] = override;
    }
  }
  return record;
}

/** Convert plain object back to OverrideMap */
export function recordToOverrideMap(
  record: Record<string, FieldOverride>
): OverrideMap {
  const map: OverrideMap = new Map();
  for (const [path, override] of Object.entries(record)) {
    if (hasOverride(override)) {
      map.set(path, override);
    }
  }
  return map;
}

/** Convert ComponentOverrides to plain object for API transport */
export function componentOverridesToRecord(
  allOverrides: ComponentOverrides
): Record<string, Record<string, FieldOverride>> {
  const record: Record<string, Record<string, FieldOverride>> = {};
  for (const [component, overrides] of allOverrides) {
    const converted = overrideMapToRecord(overrides);
    if (Object.keys(converted).length > 0) {
      record[component] = converted;
    }
  }
  return record;
}

/** Convert plain object back to ComponentOverrides */
export function recordToComponentOverrides(
  record: Record<string, Record<string, FieldOverride>>
): ComponentOverrides {
  const map: ComponentOverrides = new Map();
  for (const [component, overrides] of Object.entries(record)) {
    const overrideMap = recordToOverrideMap(overrides);
    if (overrideMap.size > 0) {
      map.set(component, overrideMap);
    }
  }
  return map;
}
