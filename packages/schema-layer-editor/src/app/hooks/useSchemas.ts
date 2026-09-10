/**
 * Hook to fetch schemas from the server API.
 */

import { useState, useEffect } from "react";
import type {
  SchemaResponse,
  ContentTypeInfo,
  ComponentNode,
} from "../../shared/types.js";

interface UseSchemasResult {
  contentTypes: ContentTypeInfo[];
  components: ComponentNode[];
  loading: boolean;
  error: string | null;
}

export function useSchemas(): UseSchemasResult {
  const [contentTypes, setContentTypes] = useState<ContentTypeInfo[]>([]);
  const [components, setComponents] = useState<ComponentNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchSchemas() {
      try {
        const res = await fetch("/api/schemas");
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        }
        const data: SchemaResponse = await res.json();
        if (!cancelled) {
          setContentTypes(data.contentTypes);
          setComponents(data.components);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(String(err));
          setLoading(false);
        }
      }
    }

    fetchSchemas();
    return () => {
      cancelled = true;
    };
  }, []);

  return { contentTypes, components, loading, error };
}
