/**
 * Root layout: three-panel hierarchy + header with save button.
 *
 * Panel 1: ContentTypeList (left)
 * Panel 2: ComponentList (middle)
 * Panel 3: SchemaTreeView (right)
 */

import { useState, useMemo } from "react";
import type {
  ContentTypeName,
  ContentTypeInfo,
  ComponentNode,
  FieldNode,
} from "../shared/types.js";
import { useSchemas } from "./hooks/useSchemas.js";
import { OverridesProvider, useOverrides } from "./hooks/useOverrides.js";
import { ContentTypeList } from "./components/ContentTypeList.js";
import {
  ComponentList,
  type SelectedItem,
} from "./components/ComponentList.js";
import { SchemaTreeView } from "./components/SchemaTreeView.js";
import { SaveDialog } from "./components/SaveDialog.js";

function AppInner() {
  const { contentTypes, components, loading, error } = useSchemas();
  const { safeMode, toggleSafeMode } = useOverrides();
  const [selectedType, setSelectedType] = useState<ContentTypeName | null>(
    null,
  );
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  // Auto-select first content type once loaded
  if (!selectedType && contentTypes.length > 0) {
    setSelectedType(contentTypes[0].name);
  }

  const selectedContentType = useMemo(
    () => contentTypes.find((ct) => ct.name === selectedType) || null,
    [contentTypes, selectedType],
  );

  // Get the fields to display in Panel 3
  const editorData = useMemo(() => {
    if (!selectedItem) return null;

    if (selectedItem.type === "component") {
      const comp = components.find((c) => c.name === selectedItem.name);
      if (comp) {
        return {
          componentName: comp.name,
          displayName: comp.name,
          fields: comp.fields,
        };
      }
    } else if (
      selectedItem.type === "rootField" &&
      selectedItem.componentName
    ) {
      // Root field editing — use content type prefix as component name for overrides
      const fieldNode = (selectedItem as any)._fieldNode as
        | FieldNode
        | undefined;
      // For scalar fields (no children), show the field itself as a single row
      const fields =
        fieldNode && fieldNode.children.length > 0
          ? fieldNode.children
          : fieldNode
            ? [fieldNode]
            : [];
      return {
        componentName: `${selectedItem.componentName}::${selectedItem.name}`,
        displayName: `${selectedItem.componentName} → ${selectedItem.name}`,
        fields,
      };
    }
    return null;
  }, [selectedItem, components]);

  if (loading) {
    return <div className="loading">Loading schemas…</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <img src="/logo.svg" alt="kickstartDS" className="header-logo" />
          <h1>Schema Layer Editor</h1>
        </div>
        <div className="header-actions">
          <label
            className={`safe-mode-toggle ${
              safeMode ? "safe-mode-on" : "safe-mode-off"
            }`}
            title="Safe mode prevents hiding scalar fields that have no default value — protecting against missing props during rendering"
          >
            <input
              type="checkbox"
              checked={safeMode}
              onChange={toggleSafeMode}
            />
            <span className="safe-mode-label">
              {safeMode ? "🛡️ Safe Mode" : "Safe Mode"}
            </span>
          </label>
          <button className="save-btn" onClick={() => setSaveDialogOpen(true)}>
            💾 Save
          </button>
        </div>
      </header>

      <div className="app-panels">
        <ContentTypeList
          contentTypes={contentTypes}
          selectedType={selectedType}
          onSelect={(name) => {
            setSelectedType(name);
            setSelectedItem(null);
          }}
        />

        {selectedContentType && (
          <ComponentList
            contentType={selectedContentType}
            components={components}
            selectedItem={selectedItem}
            onSelectComponent={(name) =>
              setSelectedItem({ type: "component", name })
            }
            onSelectRootField={(ctName, fieldName, fieldNode) => {
              const item: SelectedItem & { _fieldNode?: FieldNode } = {
                type: "rootField",
                name: fieldName,
                componentName: ctName,
              };
              (item as any)._fieldNode = fieldNode;
              setSelectedItem(item);
            }}
          />
        )}

        {editorData ? (
          <SchemaTreeView
            componentName={editorData.componentName}
            displayName={editorData.displayName}
            fields={editorData.fields}
          />
        ) : (
          <div className="panel panel-editor">
            <div className="empty-state">
              Select a component or root field to edit its layer overrides.
            </div>
          </div>
        )}
      </div>

      <SaveDialog
        isOpen={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
      />
    </div>
  );
}

export function App() {
  return (
    <OverridesProvider>
      <AppInner />
    </OverridesProvider>
  );
}
