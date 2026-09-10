/**
 * Sort fields by effective order: x-cms-order override → schemaOrder fallback.
 *
 * Fields with an explicit `order` override are sorted by that value first.
 * Fields without an override use their original position in the JSON Schema
 * `properties` object (`schemaOrder`). Override-ordered fields and
 * schema-ordered fields are interleaved by their respective values.
 */

import type { FieldNode, OverrideMap } from "../../shared/types.js";

/**
 * Get the effective sort key for a field.
 * Returns: [priority, order]
 *   priority 0 = has x-cms-order override (user-specified position)
 *   priority 1 = no override (use schema position)
 */
function getEffectiveOrder(field: FieldNode, overrides: OverrideMap): number {
  const override = overrides.get(field.meta.path);
  if (override?.order !== undefined) {
    return override.order;
  }
  return field.meta.schemaOrder;
}

/**
 * Sort a list of fields by effective order.
 * Returns a new sorted array (does not mutate the input).
 */
export function sortFieldsByOrder(
  fields: FieldNode[],
  overrides: OverrideMap
): FieldNode[] {
  return [...fields].sort((a, b) => {
    return getEffectiveOrder(a, overrides) - getEffectiveOrder(b, overrides);
  });
}
