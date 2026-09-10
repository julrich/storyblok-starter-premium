/**
 * Bulk actions toolbar: Show All, Hide All, Reset, Expand/Collapse All.
 */

import type { FieldNode } from "../../shared/types.js";
import { useOverrides } from "../hooks/useOverrides.js";

interface BulkActionsProps {
  componentName: string;
  fields: FieldNode[];
}

export function BulkActions({ componentName, fields }: BulkActionsProps) {
  const { dispatch, toggleExpandAll, safeMode } = useOverrides();

  return (
    <div className="bulk-actions">
      <button
        className="bulk-btn"
        onClick={() =>
          dispatch({
            type: "BULK_SHOW_ALL",
            component: componentName,
            fields,
          })
        }
        title="Set all fields to visible"
      >
        Show All
      </button>
      <button
        className="bulk-btn"
        onClick={() =>
          dispatch({
            type: "BULK_HIDE_ALL",
            component: componentName,
            fields,
            safeMode,
          })
        }
        title={
          safeMode
            ? "Hide all fields (scalar fields without defaults will be kept visible)"
            : "Set all fields to hidden"
        }
      >
        Hide All
      </button>
      <button
        className="bulk-btn bulk-btn-danger"
        onClick={() =>
          dispatch({
            type: "RESET_COMPONENT",
            component: componentName,
          })
        }
        title="Remove all overrides for this component"
      >
        Reset
      </button>
      <span className="bulk-separator" />
      <button
        className="bulk-btn"
        onClick={() => toggleExpandAll(true)}
        title="Expand all field groups"
      >
        Expand All
      </button>
      <button
        className="bulk-btn"
        onClick={() => toggleExpandAll(false)}
        title="Collapse all field groups"
      >
        Collapse All
      </button>
    </div>
  );
}
