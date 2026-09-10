/**
 * Express API routes for the Schema Layer Editor.
 *
 * Handles schema loading, layer loading/saving, and config retrieval.
 */

import { Router, json } from "express";
import type { Request, Response } from "express";
import { loadSchemas } from "./schema-loader.js";
import { loadLayer } from "./layer-loader.js";
import { writeLayerFiles } from "./layer-writer.js";
import {
  recordToOverrideMap,
  recordToComponentOverrides,
  componentOverridesToRecord,
} from "../app/lib/override-model.js";
import type {
  SchemaResponse,
  LayerResponse,
  SaveRequest,
  SaveResponse,
  ConfigResponse,
  ComponentOverrides,
  FieldOverride,
  FieldNode,
} from "../shared/types.js";

// ─── Config ─────────────────────────────────────────────────────────────────

export interface ServerConfig {
  schemasDir: string;
  /** Additional schema directories whose schemas shadow the base ones by name */
  schemasExtraDirs?: string[];
  layerDir?: string;
  namespace: string;
  baseUrl: string;
  outputDir: string;
}

// ─── State ──────────────────────────────────────────────────────────────────

let cachedSchemas: SchemaResponse | null = null;
let inMemoryOverrides: ComponentOverrides = new Map();

// ─── Stale Detection ────────────────────────────────────────────────────────

/**
 * Collect all valid field paths from a FieldNode tree recursively.
 */
function collectFieldPaths(fields: FieldNode[], paths: Set<string>): void {
  for (const field of fields) {
    paths.add(field.meta.path);
    if (field.children.length > 0) {
      collectFieldPaths(field.children, paths);
    }
  }
}

/**
 * Detect stale overrides: override paths that don't correspond to any
 * field path in the loaded schemas.
 *
 * Returns a list of "component::path" keys identifying stale overrides.
 *
 * Override keys use these conventions:
 * - Regular components: component name (e.g. "hero")
 * - Content type root fields: "contentType::fieldName" (e.g. "blog-post::head")
 */
function detectStaleOverrides(
  overrides: ComponentOverrides,
  schemas: SchemaResponse
): string[] {
  const stale: string[] = [];

  // Build a map of override key → valid field paths
  const validPathsByKey = new Map<string, Set<string>>();

  // Components
  for (const comp of schemas.components) {
    const paths = new Set<string>();
    collectFieldPaths(comp.fields, paths);
    validPathsByKey.set(comp.name, paths);
  }

  // Content type root fields — keyed as "contentType::fieldName"
  for (const ct of schemas.contentTypes) {
    for (const rf of ct.rootFields) {
      const key = `${ct.name}::${rf.name}`;
      const paths = new Set<string>();
      if (rf.fieldNode.children.length > 0) {
        collectFieldPaths(rf.fieldNode.children, paths);
      } else {
        paths.add(rf.fieldNode.meta.path);
      }
      validPathsByKey.set(key, paths);
    }
  }

  // Compare override paths against schema field paths
  for (const [overrideKey, overrideMap] of overrides.entries()) {
    const validPaths = validPathsByKey.get(overrideKey);
    if (!validPaths) {
      // Key itself doesn't exist in schemas — all overrides are stale
      for (const path of overrideMap.keys()) {
        stale.push(`${overrideKey}::${path}`);
      }
      continue;
    }
    for (const path of overrideMap.keys()) {
      if (!validPaths.has(path)) {
        stale.push(`${overrideKey}::${path}`);
      }
    }
  }

  return stale;
}

// ─── Route Factory ──────────────────────────────────────────────────────────

export function createRoutes(config: ServerConfig): Router {
  const router = Router();
  router.use(json({ limit: "10mb" }));

  // ── GET /api/schemas ────────────────────────────────────────────────────

  router.get("/api/schemas", (_req: Request, res: Response) => {
    try {
      if (!cachedSchemas) {
        cachedSchemas = loadSchemas(config.schemasDir, config.schemasExtraDirs);
      }
      res.json(cachedSchemas);
    } catch (err) {
      console.error("Error loading schemas:", err);
      res.status(500).json({ error: `Failed to load schemas: ${err}` });
    }
  });

  // ── GET /api/layer ──────────────────────────────────────────────────────

  router.get("/api/layer", (_req: Request, res: Response) => {
    try {
      const record = componentOverridesToRecord(inMemoryOverrides);

      // Detect stale overrides (paths not in the loaded schemas)
      let staleOverrides: string[] = [];
      if (!cachedSchemas) {
        cachedSchemas = loadSchemas(config.schemasDir, config.schemasExtraDirs);
      }
      staleOverrides = detectStaleOverrides(inMemoryOverrides, cachedSchemas);
      if (staleOverrides.length > 0) {
        console.warn(
          `Stale overrides detected (${staleOverrides.length}):`,
          staleOverrides
        );
      }

      const response: LayerResponse = { overrides: record, staleOverrides };
      res.json(response);
    } catch (err) {
      console.error("Error getting layer:", err);
      res.status(500).json({ error: `Failed to get layer: ${err}` });
    }
  });

  // ── POST /api/layer ─────────────────────────────────────────────────────

  router.post("/api/layer", (req: Request, res: Response) => {
    try {
      const body = req.body as {
        overrides: Record<string, Record<string, FieldOverride>>;
      };

      if (!body.overrides) {
        res.status(400).json({ error: "Missing 'overrides' in request body" });
        return;
      }

      inMemoryOverrides = recordToComponentOverrides(body.overrides);
      const record = componentOverridesToRecord(inMemoryOverrides);
      res.json({ success: true, overrides: record });
    } catch (err) {
      console.error("Error updating layer:", err);
      res.status(500).json({ error: `Failed to update layer: ${err}` });
    }
  });

  // ── POST /api/save ──────────────────────────────────────────────────────

  router.post("/api/save", (req: Request, res: Response) => {
    try {
      const body = req.body as SaveRequest;

      const overrides = body.overrides
        ? recordToComponentOverrides(body.overrides)
        : inMemoryOverrides;
      const outputDir = body.outputDir || config.outputDir;
      const namespace = body.namespace || config.namespace;
      const baseUrl = body.baseUrl || config.baseUrl;

      const result = writeLayerFiles(overrides, outputDir, namespace, baseUrl);

      res.json(result);
    } catch (err) {
      console.error("Error saving layer:", err);
      res.status(500).json({ error: `Failed to save layer: ${err}` });
    }
  });

  // ── GET /api/config ─────────────────────────────────────────────────────

  router.get("/api/config", (_req: Request, res: Response) => {
    const response: ConfigResponse = {
      schemasDir: config.schemasDir,
      layerDir: config.layerDir,
      namespace: config.namespace,
      baseUrl: config.baseUrl,
      outputDir: config.outputDir,
    };
    res.json(response);
  });

  // ── Load initial layer if specified ─────────────────────────────────────

  if (config.layerDir) {
    const { overrides, warnings } = loadLayer(config.layerDir);
    inMemoryOverrides = overrides;
    if (warnings.length > 0) {
      console.warn("Layer loading warnings:");
      for (const w of warnings) {
        console.warn(`  - ${w}`);
      }
    }
  }

  return router;
}
