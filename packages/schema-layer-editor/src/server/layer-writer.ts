/**
 * Serialize override model → JSON Schema layer files and write to disk.
 *
 * See PRD §8 for serialization rules.
 */

import {
  writeFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
  unlinkSync,
} from "fs";
import { join, resolve } from "path";
import type {
  FieldOverride,
  ComponentOverrides,
  SaveResponse,
} from "../shared/types.js";
import {
  componentOverridesToRecord,
  recordToOverrideMap,
} from "../app/lib/override-model.js";
import { serializeLayerFile } from "../app/lib/layer-serializer.js";

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Write layer files to an output directory.
 *
 * @param allOverrides - All component overrides
 * @param outputDir - Directory to write files to
 * @param namespace - Layer namespace (e.g. "visibility")
 * @param baseUrl - Optional custom base URL for $id
 * @param baseSchemaUrl - Base URL for $ref to Design System schemas
 * @returns Summary of written/deleted files and any errors
 */
export function writeLayerFiles(
  allOverrides: ComponentOverrides,
  outputDir: string,
  namespace: string,
  baseUrl?: string,
  baseSchemaUrl: string = "http://schema.mydesignsystem.com"
): SaveResponse {
  const resolvedDir = resolve(outputDir);
  const filesWritten: string[] = [];
  const filesDeleted: string[] = [];
  const errors: string[] = [];

  // Ensure output directory exists
  try {
    mkdirSync(resolvedDir, { recursive: true });
  } catch (err) {
    return {
      success: false,
      filesWritten: [],
      filesDeleted: [],
      errors: [`Could not create output directory ${resolvedDir}: ${err}`],
    };
  }

  // Track which files we write so we can detect stale files
  const writtenFilenames = new Set<string>();

  // Write layer files for each component with overrides
  for (const [componentName, overrides] of allOverrides) {
    const layerFile = serializeLayerFile(
      componentName,
      overrides,
      namespace,
      baseUrl,
      baseSchemaUrl
    );

    const filename = `${componentName}.schema.json`;

    if (layerFile) {
      const filePath = join(resolvedDir, filename);
      try {
        writeFileSync(
          filePath,
          JSON.stringify(layerFile, null, 2) + "\n",
          "utf-8"
        );
        filesWritten.push(filename);
        writtenFilenames.add(filename);
      } catch (err) {
        errors.push(`Failed to write ${filename}: ${err}`);
      }
    }
  }

  // Delete layer files for components with zero overrides
  // (only if they exist in the output directory from a previous save)
  try {
    const existingFiles = readdirSync(resolvedDir).filter((f) =>
      f.endsWith(".schema.json")
    );

    for (const existingFile of existingFiles) {
      if (!writtenFilenames.has(existingFile)) {
        const filePath = join(resolvedDir, existingFile);
        try {
          unlinkSync(filePath);
          filesDeleted.push(existingFile);
        } catch (err) {
          errors.push(`Failed to delete stale file ${existingFile}: ${err}`);
        }
      }
    }
  } catch {
    // Directory listing failed — not critical
  }

  console.log(
    `Layer written to ${resolvedDir}: ${filesWritten.length} files written, ${filesDeleted.length} deleted`
  );

  return {
    success: errors.length === 0,
    filesWritten,
    filesDeleted,
    errors,
  };
}
