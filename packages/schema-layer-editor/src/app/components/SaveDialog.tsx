/**
 * Save dialog: output folder, namespace, file preview, save confirmation.
 */

import { useState } from "react";
import type { SaveResponse, ConfigResponse } from "../../shared/types.js";
import { useLayerPersistence } from "../hooks/useLayerPersistence.js";

interface SaveDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SaveDialog({ isOpen, onClose }: SaveDialogProps) {
  const { config, saving, saveResult, save } = useLayerPersistence();

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Save Layer Files</h2>
          <button className="dialog-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="dialog-body">
          {config && (
            <div className="save-config">
              <div className="config-field">
                <label>Output Directory</label>
                <code>{config.outputDir}</code>
              </div>
              <div className="config-field">
                <label>Namespace</label>
                <code>{config.namespace}</code>
              </div>
              <div className="config-field">
                <label>Base URL</label>
                <code>{config.baseUrl}</code>
              </div>
            </div>
          )}

          {saveResult && (
            <div
              className={`save-result ${
                saveResult.success ? "save-success" : "save-error"
              }`}
            >
              {saveResult.success ? (
                <>
                  <div className="save-result-header">
                    ✓ Layer saved successfully
                  </div>
                  {saveResult.filesWritten.length > 0 && (
                    <div>
                      <strong>Files written:</strong>
                      <ul>
                        {saveResult.filesWritten.map((f) => (
                          <li key={f}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {saveResult.filesDeleted.length > 0 && (
                    <div>
                      <strong>Files deleted (no overrides):</strong>
                      <ul>
                        {saveResult.filesDeleted.map((f) => (
                          <li key={f}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="save-result-header">✗ Save failed</div>
                  <ul>
                    {saveResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>

        <div className="dialog-footer">
          <button className="dialog-btn" onClick={onClose}>
            Close
          </button>
          <button
            className="dialog-btn dialog-btn-primary"
            onClick={() => save()}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
