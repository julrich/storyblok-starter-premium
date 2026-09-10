/**
 * Type badge, required badge, inherited-hidden badge, diff badges, stale badge.
 */

import type { FieldMeta } from "../../shared/types.js";
import type { DiffStatus } from "../hooks/useOverrides.js";

interface FieldBadgesProps {
  meta: FieldMeta;
  isHidden: boolean;
  isInheritedHidden: boolean;
  isPolymorphic: boolean;
  diffStatus?: DiffStatus;
  isStale?: boolean;
}

export function FieldBadges({
  meta,
  isHidden,
  isInheritedHidden,
  isPolymorphic,
  diffStatus,
  isStale,
}: FieldBadgesProps) {
  // Build type label
  let typeLabel: string = meta.type;
  if (meta.format) {
    typeLabel += ` (${meta.format})`;
  }
  if (meta.enumValues && meta.enumValues.length > 0) {
    typeLabel = `enum`;
  }
  if (isPolymorphic) {
    typeLabel = "polymorphic";
  }

  return (
    <span className="field-badges">
      <span className={`badge badge-type badge-type-${meta.type}`}>
        {typeLabel}
      </span>
      {meta.required && <span className="badge badge-required">required</span>}
      {meta.defaultValue !== undefined && (
        <span
          className="badge badge-default"
          title={`Default: ${JSON.stringify(meta.defaultValue)}`}
        >
          default
        </span>
      )}
      {isHidden && !isInheritedHidden && (
        <span className="badge badge-hidden">hidden</span>
      )}
      {isInheritedHidden && (
        <span className="badge badge-inherited">inherited</span>
      )}
      {isPolymorphic && (
        <span className="badge badge-polymorphic">managed per component</span>
      )}
      {diffStatus === "new" && (
        <span className="badge badge-diff badge-diff-new">new</span>
      )}
      {diffStatus === "changed" && (
        <span className="badge badge-diff badge-diff-changed">changed</span>
      )}
      {diffStatus === "removed" && (
        <span className="badge badge-diff badge-diff-removed">removed</span>
      )}
      {isStale && (
        <span
          className="badge badge-stale"
          title="Override references a field not present in the base schema"
        >
          stale
        </span>
      )}
    </span>
  );
}
