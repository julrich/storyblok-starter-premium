/**
 * Load dereferenced schemas from disk, classify into content types vs components,
 * and build the content hierarchy.
 *
 * Scans a directory recursively for `*.schema.dereffed.json` files,
 * classifies them using the ROOT_CONTENT_TYPES allowlist, and produces
 * the full schema response for the client.
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, basename, resolve } from "path";
import {
  parseComponent,
  parseContentType,
  isContentType,
} from "../app/lib/schema-tree.js";
import type {
  ContentTypeInfo,
  ComponentNode,
  ContentTypeName,
  SchemaResponse,
} from "../shared/types.js";

// ─── Schema Discovery ───────────────────────────────────────────────────────

interface RawSchema {
  name: string;
  schema: Record<string, unknown>;
  filePath: string;
}

/**
 * Recursively find all `*.schema.dereffed.json` files in a directory.
 */
function findDereffedSchemas(dir: string): RawSchema[] {
  const results: RawSchema[] = [];
  const resolvedDir = resolve(dir);

  function walk(currentDir: string) {
    let entries: string[];
    try {
      entries = readdirSync(currentDir);
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (entry.endsWith(".schema.dereffed.json")) {
        try {
          const raw = readFileSync(fullPath, "utf-8");
          const schema = JSON.parse(raw);
          // Extract component name from filename: "hero.schema.dereffed.json" → "hero"
          const name = basename(entry, ".schema.dereffed.json");
          results.push({ name, schema, filePath: fullPath });
        } catch (err) {
          console.warn(
            `Warning: Could not parse schema at ${fullPath}: ${err}`
          );
        }
      }
    }
  }

  walk(resolvedDir);
  return results;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Extract component names from a standalone section schema's
 * `properties.components.items.anyOf` (or oneOf).
 *
 * Uses the same $id / $ref / title extraction logic as findSectionProperty
 * in schema-tree.ts, but operates on the section schema directly rather than
 * a content type wrapper.
 */
function extractComponentNamesFromSection(
  schema: Record<string, unknown>
): string[] {
  const props = (schema as any).properties;
  if (!props?.components?.items) return [];

  const compItems = props.components.items;
  const variants: any[] = compItems.anyOf || compItems.oneOf;
  if (!variants || variants.length === 0) return [];

  return variants
    .map((v: any) => {
      if (v.$ref) {
        const match = v.$ref.match(/\/([^/]+)\.schema\.json$/);
        return match ? match[1] : undefined;
      }
      if (v.$id) {
        const match = v.$id.match(/\/([^/]+)\.schema\.json$/);
        return match ? match[1] : undefined;
      }
      return v.title?.toLowerCase().replace(/\s+/g, "-");
    })
    .filter((n: string | undefined): n is string => !!n);
}

/**
 * Load all schemas from one or more directories and classify them.
 *
 * Schemas from `extraDirs` shadow (replace) schemas from `schemasDir` when
 * they share the same component name. This allows project-level schemas to
 * override or extend Design System schemas.
 *
 * @param schemasDir  - Primary directory containing `*.schema.dereffed.json` files
 * @param extraDirs   - Additional directories whose schemas take priority over the base
 * @returns Classified schema response with content types and components
 */
export function loadSchemas(
  schemasDir: string,
  extraDirs?: string[]
): SchemaResponse {
  // Collect base schemas
  const baseSchemas = findDereffedSchemas(schemasDir);

  // Build a name → schema map, starting with base schemas
  const schemasByName = new Map<string, RawSchema>();
  for (const raw of baseSchemas) {
    schemasByName.set(raw.name, raw);
  }

  // Extra directories shadow base schemas by name
  if (extraDirs) {
    for (const dir of extraDirs) {
      const extraSchemas = findDereffedSchemas(dir);
      for (const raw of extraSchemas) {
        if (schemasByName.has(raw.name)) {
          console.log(
            `Schema "${raw.name}" from ${raw.filePath} shadows base schema`
          );
        } else {
          console.log(
            `Schema "${raw.name}" added from ${raw.filePath} (new component)`
          );
        }
        schemasByName.set(raw.name, raw);
      }
    }
  }

  const contentTypes: ContentTypeInfo[] = [];
  const components: ComponentNode[] = [];
  const componentMap = new Map<string, ComponentNode>();

  // Classify and parse (using merged set)
  for (const { name, schema } of schemasByName.values()) {
    if (isContentType(name)) {
      const ctInfo = parseContentType(name as ContentTypeName, schema as any);
      contentTypes.push(ctInfo);
    } else {
      const component = parseComponent(name, schema as any);
      components.push(component);
      componentMap.set(name, component);
    }
  }

  // Merge component names from the standalone "section" schema into content types.
  // The page/blog-post/etc. schemas were built from the DS and may not reference
  // website-level components (info-table, timeline, prompter, etc.) that were added
  // via --schemas-extra. The standalone section schema (which may have been shadowed
  // by --schemas-extra) has the full anyOf list, so we extract names from it and
  // merge them into each section-based content type's sectionComponents.
  const sectionRaw = schemasByName.get("section");
  if (sectionRaw) {
    const extraNames = extractComponentNamesFromSection(sectionRaw.schema);
    if (extraNames.length > 0) {
      for (const ct of contentTypes) {
        if (!ct.hasSections) continue;
        const existing = new Set(ct.sectionComponents);
        let added = 0;
        for (const name of extraNames) {
          if (!existing.has(name) && componentMap.has(name)) {
            ct.sectionComponents.push(name);
            added++;
          }
        }
        if (added > 0) {
          console.log(
            `Merged ${added} extra component(s) into ${ct.name} sectionComponents from section schema`
          );
        }
      }
    }
  }

  // Sort content types in the canonical order
  const typeOrder = [
    "page",
    "blog-post",
    "blog-overview",
    "settings",
    "event-detail",
    "event-list",
    "search",
  ];
  contentTypes.sort(
    (a, b) => typeOrder.indexOf(a.name) - typeOrder.indexOf(b.name)
  );

  // Sort components alphabetically
  components.sort((a, b) => a.name.localeCompare(b.name));

  const sources = [schemasDir, ...(extraDirs || [])].join(", ");
  console.log(
    `Loaded ${contentTypes.length} content types and ${components.length} components from ${sources}`
  );

  return { contentTypes, components };
}
