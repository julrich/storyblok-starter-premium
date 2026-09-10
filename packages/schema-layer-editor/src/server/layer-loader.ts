/**
 * Load existing layer files into the override model.
 *
 * Scans a directory for `*.schema.json` layer files, parses the override
 * structure from the first allOf entry, and produces a ComponentOverrides map.
 *
 * See PRD §9 for loading rules.
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join, basename, resolve } from "path";
import type {
  FieldOverride,
  OverrideMap,
  ComponentOverrides,
} from "../shared/types.js";

// ─── Types ──────────────────────────────────────────────────────────────────

interface LayerProperty {
  "x-cms-hidden"?: boolean;
  title?: string;
  description?: string;
  "x-cms-order"?: number;
  default?: unknown;
  properties?: Record<string, LayerProperty>;
  items?: {
    properties?: Record<string, LayerProperty>;
    anyOf?: Array<{ title?: string; [key: string]: unknown }>;
    oneOf?: Array<{ title?: string; [key: string]: unknown }>;
  };
  anyOf?: Array<{ title?: string; [key: string]: unknown }>;
  oneOf?: Array<{ title?: string; [key: string]: unknown }>;
}

interface LayerFile {
  $schema?: string;
  $id?: string;
  type?: string;
  allOf?: Array<{
    type?: string;
    properties?: Record<string, LayerProperty>;
    additionalProperties?: boolean;
    $ref?: string;
  }>;
}

// ─── Parsing ────────────────────────────────────────────────────────────────

/**
 * Recursively extract path-based overrides from a nested layer property structure.
 *
 * @param properties - The properties object from the layer's override allOf entry
 * @param parentPath - Current dot-separated path prefix
 * @param overrides - Accumulator map to populate
 */
function extractOverrides(
  properties: Record<string, LayerProperty>,
  parentPath: string,
  overrides: OverrideMap
): void {
  for (const [fieldName, layerProp] of Object.entries(properties)) {
    const path = parentPath ? `${parentPath}.${fieldName}` : fieldName;

    // Extract direct override values
    const override: FieldOverride = {};
    if (layerProp["x-cms-hidden"] !== undefined) {
      override.hidden = layerProp["x-cms-hidden"];
    }
    if (layerProp.title !== undefined) {
      override.title = layerProp.title;
    }
    if (layerProp.description !== undefined) {
      override.description = layerProp.description;
    }
    if (layerProp["x-cms-order"] !== undefined) {
      override.order = layerProp["x-cms-order"];
    }
    if (layerProp.default !== undefined) {
      override.defaultValue = layerProp.default;
    }

    // Only add if there's at least one override value
    if (
      override.hidden !== undefined ||
      override.title !== undefined ||
      override.description !== undefined ||
      override.order !== undefined ||
      override.defaultValue !== undefined
    ) {
      overrides.set(path, override);
    }

    // Check for polymorphic anyOf/oneOf component restrictions
    const polyVariants = layerProp.anyOf || layerProp.oneOf;
    if (polyVariants && polyVariants.length > 0) {
      const allowed = polyVariants
        .map((v) => v.title)
        .filter((t): t is string => !!t);
      if (allowed.length > 0) {
        const existing = overrides.get(path) || {};
        overrides.set(path, { ...existing, allowedComponents: allowed });
      }
    }

    // Recurse into nested object properties
    if (layerProp.properties) {
      extractOverrides(layerProp.properties, path, overrides);
    }

    // Recurse into array items
    if (layerProp.items?.properties) {
      extractOverrides(layerProp.items.properties, `${path}[]`, overrides);
    }
    // Check for polymorphic anyOf/oneOf in array items
    if (layerProp.items) {
      const itemVariants = layerProp.items.anyOf || layerProp.items.oneOf;
      if (itemVariants && itemVariants.length > 0) {
        const allowed = itemVariants
          .map((v) => v.title)
          .filter((t): t is string => !!t);
        if (allowed.length > 0) {
          // For array items, the override goes on the array field itself with []
          const itemPath = `${path}[]`;
          const existing = overrides.get(itemPath) || overrides.get(path) || {};
          overrides.set(path, { ...existing, allowedComponents: allowed });
        }
      }
    }
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Load all layer files from a directory into a ComponentOverrides map.
 *
 * @param layerDir - Path to directory containing `*.schema.json` layer files
 * @returns ComponentOverrides map and list of warnings
 */
export function loadLayer(layerDir: string): {
  overrides: ComponentOverrides;
  warnings: string[];
} {
  const overrides: ComponentOverrides = new Map();
  const warnings: string[] = [];
  const resolvedDir = resolve(layerDir);

  if (!existsSync(resolvedDir)) {
    warnings.push(`Layer directory does not exist: ${resolvedDir}`);
    return { overrides, warnings };
  }

  let entries: string[];
  try {
    entries = readdirSync(resolvedDir);
  } catch (err) {
    warnings.push(`Could not read layer directory: ${resolvedDir} — ${err}`);
    return { overrides, warnings };
  }

  const schemaFiles = entries.filter((e) => e.endsWith(".schema.json"));

  for (const filename of schemaFiles) {
    const filePath = join(resolvedDir, filename);
    const componentName = basename(filename, ".schema.json");

    try {
      const raw = readFileSync(filePath, "utf-8");
      const layerFile: LayerFile = JSON.parse(raw);

      if (!layerFile.allOf || layerFile.allOf.length === 0) {
        warnings.push(`${filename}: No allOf found — skipping`);
        continue;
      }

      // The override object is the first entry in allOf (non-$ref entry)
      const overrideEntry = layerFile.allOf.find(
        (entry) => !entry.$ref && entry.properties
      );

      if (!overrideEntry?.properties) {
        warnings.push(
          `${filename}: No override properties found in allOf — skipping`
        );
        continue;
      }

      const componentOverrides: OverrideMap = new Map();
      extractOverrides(overrideEntry.properties, "", componentOverrides);

      if (componentOverrides.size > 0) {
        overrides.set(componentName, componentOverrides);
      }

      console.log(
        `Loaded ${componentOverrides.size} overrides for "${componentName}" from ${filename}`
      );
    } catch (err) {
      warnings.push(`${filename}: Parse error — ${err}`);
    }
  }

  console.log(
    `Loaded layer from ${resolvedDir}: ${overrides.size} components with overrides`
  );

  return { overrides, warnings };
}
