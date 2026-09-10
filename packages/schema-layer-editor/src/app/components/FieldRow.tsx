/**
 * Single field row with visibility toggle, title, description, type badge, and order.
 */

import { useState, useEffect, useRef } from "react";
import type { FieldNode, FieldOverride } from "../../shared/types.js";
import { FieldBadges } from "./FieldBadges.js";
import { useOverrides, getDiffStatus } from "../hooks/useOverrides.js";
import {
  isParentHidden,
  isFieldSafetyProtected,
} from "../lib/override-model.js";
import { sortFieldsByOrder } from "../lib/sort-fields.js";

interface FieldRowProps {
  field: FieldNode;
  componentName: string;
  depth: number;
  /** Sibling fields at the same level (needed for swap-based reordering) */
  siblings: FieldNode[];
}

export function FieldRow({
  field,
  componentName,
  depth,
  siblings,
}: FieldRowProps) {
  const {
    overrides,
    dispatch,
    baseline,
    expandGeneration,
    expandAll,
    staleOverrides,
    safeMode,
  } = useOverrides();
  const [expanded, setExpanded] = useState(depth < 2);
  const [detailOpen, setDetailOpen] = useState(false);
  const [polyPickerOpen, setPolyPickerOpen] = useState(false);
  const [reorderFlash, setReorderFlash] = useState(false);
  const prevIndexRef = useRef<number | null>(null);

  // Respond to expand/collapse all
  useEffect(() => {
    if (expandGeneration > 0) {
      setExpanded(expandAll);
    }
  }, [expandGeneration, expandAll]);

  const compOverrides = overrides.get(componentName) || new Map();
  const fieldOverride: FieldOverride = compOverrides.get(field.meta.path) || {};

  // Compute sorted position and detect reorder
  const sorted = sortFieldsByOrder(siblings, compOverrides);
  const sortedIndex = sorted.findIndex((s) => s.meta.path === field.meta.path);
  const originalIndex = [...siblings]
    .sort((a, b) => a.meta.schemaOrder - b.meta.schemaOrder)
    .findIndex((s) => s.meta.path === field.meta.path);
  const isReordered = sortedIndex !== originalIndex;

  // Flash animation when position changes
  useEffect(() => {
    if (prevIndexRef.current !== null && prevIndexRef.current !== sortedIndex) {
      setReorderFlash(true);
      const timer = setTimeout(() => setReorderFlash(false), 600);
      return () => clearTimeout(timer);
    }
    prevIndexRef.current = sortedIndex;
  }, [sortedIndex]);
  const isHidden = fieldOverride.hidden === true;
  const inheritedHidden = isParentHidden(compOverrides, field.meta.path);
  const effectivelyHidden = isHidden || inheritedHidden;

  // Safe mode protection: scalar fields without defaults can't be hidden
  const isSafetyProtected =
    safeMode && isFieldSafetyProtected(field, fieldOverride);

  const hasChildren = field.children.length > 0 && !field.isPolymorphic;
  const hasPolyVariants =
    field.isPolymorphic && field.polymorphicVariants.length > 0;
  const displayTitle =
    fieldOverride.title || field.meta.title || field.meta.name;

  // Diff indicator: compare current override to baseline
  const diffStatus = getDiffStatus(
    componentName,
    field.meta.path,
    overrides,
    baseline
  );

  // Stale indicator: check if this override path is flagged as stale
  const staleKey = `${componentName}::${field.meta.path}`;
  const isStale = staleOverrides.has(staleKey);

  // Allowed components for polymorphic fields
  const allVariants = field.polymorphicVariants;
  const allowedSet = fieldOverride.allowedComponents
    ? new Set(fieldOverride.allowedComponents)
    : null; // null = all allowed
  const allowedCount = allowedSet ? allowedSet.size : allVariants.length;

  const toggleVariant = (variantName: string) => {
    // Start from current allowed set, or all variants if no restriction
    const current = allowedSet ? new Set(allowedSet) : new Set(allVariants);

    if (current.has(variantName)) {
      current.delete(variantName);
    } else {
      current.add(variantName);
    }

    // If all are selected, clear the override (= no restriction)
    const newAllowed =
      current.size === allVariants.length ? [] : Array.from(current);

    dispatch({
      type: "SET_ALLOWED_COMPONENTS",
      component: componentName,
      path: field.meta.path,
      allowedComponents: newAllowed,
    });
  };

  const selectAllVariants = () => {
    dispatch({
      type: "SET_ALLOWED_COMPONENTS",
      component: componentName,
      path: field.meta.path,
      allowedComponents: [],
    });
  };

  const selectNoneVariants = () => {
    dispatch({
      type: "SET_ALLOWED_COMPONENTS",
      component: componentName,
      path: field.meta.path,
      allowedComponents: ["__none__"],
    });
  };

  return (
    <div
      className={`field-row ${effectivelyHidden ? "field-hidden" : ""} ${reorderFlash ? "field-reorder-flash" : ""}`}
    >
      <div className="field-row-main">
        {/* Left block: indented expand + checkbox + name + poly count */}
        <div className="field-row-left" style={{ paddingLeft: `${depth * 20}px` }}>
        {/* Expand/collapse for nested fields */}
        {hasChildren || hasPolyVariants ? (
          <button
            className="expand-btn"
            onClick={() =>
              hasPolyVariants
                ? setPolyPickerOpen(!polyPickerOpen)
                : setExpanded(!expanded)
            }
            title={
              hasPolyVariants
                ? polyPickerOpen
                  ? "Close component picker"
                  : "Open component picker"
                : expanded
                ? "Collapse"
                : "Expand"
            }
          >
            {(hasPolyVariants ? polyPickerOpen : expanded)
              ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
              : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            }
          </button>
        ) : (
          <span className="expand-spacer" />
        )}

        {/* Visibility checkbox */}
        <label
          className={`visibility-toggle ${
            isSafetyProtected ? "safety-protected" : ""
          }`}
          title={
            isSafetyProtected
              ? "Protected: this scalar field has no default value. Hiding it could break rendering. Set a default value to unlock."
              : isHidden
              ? "Hidden"
              : "Visible"
          }
        >
          <input
            type="checkbox"
            checked={!isHidden}
            disabled={field.isPolymorphic || isSafetyProtected}
            onChange={(e) =>
              dispatch({
                type: "SET_VISIBILITY",
                component: componentName,
                path: field.meta.path,
                hidden: !e.target.checked,
                safeMode,
                fieldNode: field,
              })
            }
          />
          {isSafetyProtected && (
            <span className="safety-lock" title="Protected by safe mode">
              🛡️
            </span>
          )}
        </label>

        {/* Field name */}
        <code className="field-name">{field.meta.name}</code>

        {/* Polymorphic variant count badge */}
        {hasPolyVariants && (
          <span
            className={`poly-count ${allowedSet ? "poly-restricted" : ""}`}
            title={`${allowedCount} of ${allVariants.length} components allowed`}
          >
            {allowedCount}/{allVariants.length}
          </span>
        )}
        </div>

        {/* Title override (inline editable) */}
        <input
          className="field-title-input"
          type="text"
          value={fieldOverride.title ?? field.meta.title ?? ""}
          placeholder={field.meta.title || "Title…"}
          onChange={(e) =>
            dispatch({
              type: "SET_TITLE",
              component: componentName,
              path: field.meta.path,
              title: e.target.value,
            })
          }
        />

        {/* Right block: edit + order controls, mirrored indentation */}
        <div className="field-row-right" style={{ paddingRight: `${depth * 20}px` }}>
        {/* Detail edit button */}
        <button
          className={`detail-btn ${detailOpen ? "detail-btn-active" : ""}`}
          onClick={() => setDetailOpen(!detailOpen)}
          title="Edit details"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
        </button>

        {/* Order controls */}
        <span className="order-controls">
          <span className={`order-number ${isReordered ? "order-number-changed" : ""}`}>{sortedIndex + 1}</span>
          <button
            className="order-btn"
            onClick={() =>
              dispatch({
                type: "MOVE_FIELD",
                component: componentName,
                path: field.meta.path,
                direction: "up",
                siblings,
              })
            }
            title="Move up"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
          </button>
          <button
            className="order-btn"
            onClick={() =>
              dispatch({
                type: "MOVE_FIELD",
                component: componentName,
                path: field.meta.path,
                direction: "down",
                siblings,
              })
            }
            title="Move down"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
        </span>
        </div>
      </div>

      {/* Type badges row */}
      <div
        className="field-row-meta"
        style={{ paddingLeft: `${depth * 20 + 62}px` }}
      >
        <FieldBadges
          meta={field.meta}
          isHidden={isHidden}
          isInheritedHidden={inheritedHidden}
          isPolymorphic={field.isPolymorphic}
          diffStatus={diffStatus}
          isStale={isStale}
        />
      </div>

      {/* Detail expansion panel */}
      {detailOpen && (
        <div
          className="field-detail-panel"
        >
          <div className="detail-field">
            <label>Description</label>
            <textarea
              value={fieldOverride.description ?? field.meta.description ?? ""}
              placeholder={field.meta.description || "Description…"}
              rows={2}
              onChange={(e) =>
                dispatch({
                  type: "SET_DESCRIPTION",
                  component: componentName,
                  path: field.meta.path,
                  description: e.target.value,
                })
              }
            />
          </div>
          <div className="detail-field">
            <label>Order (x-cms-order)</label>
            <input
              type="number"
              value={fieldOverride.order ?? ""}
              placeholder="Auto"
              onChange={(e) =>
                dispatch({
                  type: "SET_ORDER",
                  component: componentName,
                  path: field.meta.path,
                  order: parseInt(e.target.value, 10) || 0,
                })
              }
            />
          </div>
          <div className="detail-field">
            <label>Default value</label>
            <input
              type="text"
              value={
                fieldOverride.defaultValue !== undefined
                  ? JSON.stringify(fieldOverride.defaultValue)
                  : field.meta.defaultValue !== undefined
                  ? JSON.stringify(field.meta.defaultValue)
                  : ""
              }
              placeholder={
                field.meta.defaultValue !== undefined
                  ? JSON.stringify(field.meta.defaultValue)
                  : "No default"
              }
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") {
                  // Clear the override
                  dispatch({
                    type: "SET_DEFAULT",
                    component: componentName,
                    path: field.meta.path,
                    defaultValue: undefined,
                  });
                  return;
                }
                // Try parsing as JSON, fall back to raw string
                let parsed: unknown;
                try {
                  parsed = JSON.parse(raw);
                } catch {
                  parsed = raw;
                }
                dispatch({
                  type: "SET_DEFAULT",
                  component: componentName,
                  path: field.meta.path,
                  defaultValue: parsed,
                });
              }}
            />
          </div>
          <div className="detail-readonly">
            <div>
              <strong>Type:</strong> {field.meta.type}
            </div>
            {field.meta.format && (
              <div>
                <strong>Format:</strong> {field.meta.format}
              </div>
            )}
            {field.meta.enumValues && (
              <div>
                <strong>Enum:</strong> {field.meta.enumValues.join(", ")}
              </div>
            )}
            {field.meta.defaultValue !== undefined && (
              <div>
                <strong>Default:</strong>{" "}
                {JSON.stringify(field.meta.defaultValue)}
              </div>
            )}
            <div>
              <strong>Required:</strong> {field.meta.required ? "Yes" : "No"}
            </div>
            <div>
              <strong>Path:</strong> <code>{field.meta.path}</code>
            </div>
          </div>
        </div>
      )}

      {/* Polymorphic component picker */}
      {polyPickerOpen && hasPolyVariants && (
        <div
          className="poly-picker"
        >
          <div className="poly-picker-header">
            <span className="poly-picker-title">Allowed Components</span>
            <div className="poly-picker-actions">
              <button
                className="bulk-btn"
                onClick={selectAllVariants}
                title="Allow all"
              >
                All
              </button>
              <button
                className="bulk-btn bulk-btn-danger"
                onClick={selectNoneVariants}
                title="Allow none"
              >
                None
              </button>
            </div>
          </div>
          <div className="poly-picker-list">
            {allVariants.map((variant) => {
              const isAllowed = !allowedSet || allowedSet.has(variant);
              return (
                <label
                  key={variant}
                  className={`poly-picker-item ${
                    !isAllowed ? "poly-item-excluded" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isAllowed}
                    onChange={() => toggleVariant(variant)}
                  />
                  <span className="poly-item-name">{variant}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Children */}
      {expanded && hasChildren && (
        <div className="field-children">
          {sortFieldsByOrder(field.children, compOverrides).map((child) => (
            <FieldRow
              key={child.meta.path}
              field={child}
              componentName={componentName}
              depth={depth + 1}
              siblings={field.children}
            />
          ))}
        </div>
      )}
    </div>
  );
}
