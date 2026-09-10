/**
 * Hook for persisting layer overrides to/from the server.
 *
 * Handles initial load of existing layers and saving to disk.
 */

import { useEffect, useState, useCallback } from "react";
import type {
  FieldOverride,
  ConfigResponse,
  SaveResponse,
} from "../../shared/types.js";
import { componentOverridesToRecord } from "../lib/override-model.js";
import { useOverrides } from "./useOverrides.js";

interface UseLayerPersistenceResult {
  config: ConfigResponse | null;
  saving: boolean;
  saveResult: SaveResponse | null;
  save: (
    overrides?: Record<string, Record<string, FieldOverride>>
  ) => Promise<void>;
  loadInitialLayer: () => Promise<void>;
}

export function useLayerPersistence(): UseLayerPersistenceResult {
  const { overrides, dispatch, setStaleOverrides } = useOverrides();
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<SaveResponse | null>(null);

  // Fetch config on mount
  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data: ConfigResponse) => setConfig(data))
      .catch((err) => console.error("Failed to fetch config:", err));
  }, []);

  // Load initial layer overrides
  const loadInitialLayer = useCallback(async () => {
    try {
      const res = await fetch("/api/layer");
      if (!res.ok) return;
      const data = await res.json();
      if (data.overrides && Object.keys(data.overrides).length > 0) {
        dispatch({ type: "LOAD_OVERRIDES", overrides: data.overrides });
      }
      // Pass stale overrides to context if present
      if (data.staleOverrides && data.staleOverrides.length > 0) {
        setStaleOverrides(new Set(data.staleOverrides));
        console.warn(
          `${data.staleOverrides.length} stale override(s) detected — these reference fields not in the current schema`
        );
      }
    } catch (err) {
      console.error("Failed to load initial layer:", err);
    }
  }, [dispatch, setStaleOverrides]);

  // Load on mount
  useEffect(() => {
    loadInitialLayer();
  }, [loadInitialLayer]);

  // Save overrides to disk
  const save = useCallback(
    async (
      explicitOverrides?: Record<string, Record<string, FieldOverride>>
    ) => {
      setSaving(true);
      setSaveResult(null);

      try {
        const body = {
          overrides: explicitOverrides || componentOverridesToRecord(overrides),
        };

        const res = await fetch("/api/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const result: SaveResponse = await res.json();
        setSaveResult(result);
      } catch (err) {
        setSaveResult({
          success: false,
          filesWritten: [],
          filesDeleted: [],
          errors: [String(err)],
        });
      } finally {
        setSaving(false);
      }
    },
    [overrides]
  );

  return { config, saving, saveResult, save, loadInitialLayer };
}
