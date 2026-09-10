/**
 * Panel 2: Component & Root Field List
 *
 * Shows three groups for the selected content type:
 * - Layout (section component, for section-based types)
 * - Root Fields (non-section root fields of the content type)
 * - Content (components available in section.components anyOf)
 */

import { useState } from "react";
import type {
  ContentTypeInfo,
  ComponentNode,
  FieldNode,
} from "../../shared/types.js";
import { useOverrides } from "../hooks/useOverrides.js";
import { componentHasOverrides } from "../lib/override-model.js";

interface SelectedItem {
  type: "component" | "rootField";
  name: string;
  /** For components: the ComponentNode. For root fields: the FieldNode. */
  componentName?: string;
}

interface ComponentListProps {
  contentType: ContentTypeInfo;
  components: ComponentNode[];
  selectedItem: SelectedItem | null;
  onSelectComponent: (name: string) => void;
  onSelectRootField: (
    contentTypeName: string,
    fieldName: string,
    fieldNode: FieldNode
  ) => void;
}

export function ComponentList({
  contentType,
  components,
  selectedItem,
  onSelectComponent,
  onSelectRootField,
}: ComponentListProps) {
  const { overrides } = useOverrides();
  const [searchTerm, setSearchTerm] = useState("");

  // Filter content components by search
  const filteredComponents = contentType.sectionComponents
    .map((name) => components.find((c) => c.name === name))
    .filter(
      (c): c is ComponentNode =>
        !!c && c.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  // Separate root fields into scalar (inline) and complex (clickable)
  const scalarRootFields = contentType.rootFields.filter(
    (rf) => rf.fieldType === "scalar"
  );
  const complexRootFields = contentType.rootFields.filter(
    (rf) => rf.fieldType !== "scalar"
  );

  return (
    <div className="panel panel-components">
      <div className="panel-header">
        <span>{contentType.name}</span>
      </div>

      {/* Layout group */}
      {contentType.hasSections && (
        <div className="component-group">
          <div className="group-header">Layout</div>
          <ul className="component-list">
            <li
              className={`component-item ${
                selectedItem?.type === "component" &&
                selectedItem.name === "section"
                  ? "active"
                  : ""
              }`}
              onClick={() => onSelectComponent("section")}
            >
              {componentHasOverrides(overrides as any, "section") && (
                <span className="override-indicator">●</span>
              )}
              <span>section</span>
            </li>
          </ul>
        </div>
      )}

      {/* Root Fields group */}
      {contentType.rootFields.length > 0 && (
        <div className="component-group">
          <div className="group-header">Root Fields</div>
          <ul className="component-list">
            {complexRootFields.map((rf) => {
              const key = `${contentType.name}::${rf.name}`;
              return (
                <li
                  key={rf.name}
                  className={`component-item ${
                    selectedItem?.type === "rootField" &&
                    selectedItem.name === rf.name
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    onSelectRootField(contentType.name, rf.name, rf.fieldNode)
                  }
                >
                  {componentHasOverrides(overrides as any, key) && (
                    <span className="override-indicator">●</span>
                  )}
                  <span>{rf.name}</span>
                  <span className="field-type-small">{rf.fieldType}</span>
                </li>
              );
            })}
            {scalarRootFields.map((rf) => {
              const key = `${contentType.name}::${rf.name}`;
              return (
                <li
                  key={rf.name}
                  className={`component-item ${
                    selectedItem?.type === "rootField" &&
                    selectedItem.name === rf.name
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    onSelectRootField(contentType.name, rf.name, rf.fieldNode)
                  }
                >
                  {componentHasOverrides(overrides as any, key) && (
                    <span className="override-indicator">●</span>
                  )}
                  <span>{rf.name}</span>
                  <span className="field-type-small">
                    {rf.fieldNode.meta.type}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Content group */}
      {contentType.hasSections && contentType.sectionComponents.length > 0 && (
        <div className="component-group">
          <div className="group-header">Content</div>
          {contentType.sectionComponents.length > 10 && (
            <input
              className="component-search"
              type="text"
              placeholder="Filter components…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          )}
          <ul className="component-list">
            {filteredComponents.map((comp) => (
              <li
                key={comp.name}
                className={`component-item ${
                  selectedItem?.type === "component" &&
                  selectedItem.name === comp.name
                    ? "active"
                    : ""
                }`}
                onClick={() => onSelectComponent(comp.name)}
              >
                {componentHasOverrides(overrides as any, comp.name) && (
                  <span className="override-indicator">●</span>
                )}
                <span>{comp.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Legend */}
      <div className="component-legend">
        <div>
          <span className="override-indicator">●</span> = has overrides
        </div>
        <div>☑ = visible</div>
        <div>☐ = hidden</div>
      </div>
    </div>
  );
}

export type { SelectedItem };
