#!/usr/bin/env npx tsx
/**
 * Generate visibility layer recommendations from content pattern analysis.
 *
 * Usage:
 *   npx tsx scripts/generateVisibilityFromPatterns.ts [--apply] [--report-only] [--layer <name>]
 *
 * Reads pattern data (from stdin or a cached JSON file), applies configurable
 * thresholds, and produces:
 *   1. A human-readable recommendation report (stdout)
 *   2. Optionally, updated visibility layer files in cms/<layer>/
 *
 * The script only considers the **global context** (context: null) profiles,
 * since those reflect overall editorial behaviour across all pages.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync } from "fs";
import { resolve, join } from "path";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Hide if editors leave the schema default ≥ this % of the time */
const HIDE_DEFAULT_THRESHOLD = 85;

/** Hide content/presence fields if they are empty ≥ this % of the time */
const HIDE_EMPTY_THRESHOLD = 85;

/**
 * Suggest changing the schema default if editors consistently pick a
 * non-default value ≥ this % of the time.
 */
const OVERRIDE_DEFAULT_THRESHOLD = 85;

/** Minimum number of observations before we trust the signal */
const MIN_SAMPLES = 3;

// ---------------------------------------------------------------------------
// Types (mirrors storyblok-services/src/guidance.ts)
// ---------------------------------------------------------------------------

interface FieldDistribution {
  field: string;
  values: Record<string, number>;
  total: number;
  dominantValue: string;
  dominantPct: number;
  isDefault: boolean;
}

interface FieldProfileContext {
  type: "contains" | "containedIn" | "position";
  [key: string]: unknown;
}

interface FieldProfile {
  component: string;
  context: FieldProfileContext | null;
  fields: FieldDistribution[];
  samples: number;
}

interface PatternAnalysis {
  totalStoriesAnalyzed: number;
  componentFrequency: {
    component: string;
    count: number;
    percentage: number;
  }[];
  unusedComponents: string[];
  fieldProfiles: FieldProfile[];
  subComponentCounts: Record<
    string,
    { median: number; min: number; max: number; samples: number }
  >;
}

// ---------------------------------------------------------------------------
// Recommendation types
// ---------------------------------------------------------------------------

type Action = "hide" | "show" | "hide+override" | "review";

interface FieldRecommendation {
  field: string;
  action: Action;
  reason: string;
  dominantValue: string;
  dominantPct: number;
  isDefault: boolean;
  total: number;
  /** For hide+override: the suggested new default */
  suggestedDefault?: string;
}

interface ComponentRecommendation {
  component: string;
  samples: number;
  fields: FieldRecommendation[];
}

// ---------------------------------------------------------------------------
// Schema introspection — discover all stylistic fields from dereffed schemas
// ---------------------------------------------------------------------------

/** Fields that are structural/internal and should be skipped */
const STRUCTURAL_FIELDS = new Set(["type", "component", "_uid", "components"]);

/** Fields that are primary content and should always be shown */
const CONTENT_FIELDS = new Set(["headline", "text", "sub", "image", "url"]);

/**
 * Check if a (possibly flattened) field is a content field.
 * Top-level content fields are always protected.
 * Sub-properties of content parents are only protected if they are plain
 * strings (actual content like src, alt, text). Enums and booleans within
 * content objects are styling/layout choices and should still be classifiable.
 */
function isContentField(
  name: string,
  fieldType?: SchemaField["type"],
): boolean {
  if (CONTENT_FIELDS.has(name)) return true;
  const parts = name.split("_");
  if (parts.length > 1 && CONTENT_FIELDS.has(parts[0])) {
    // Sub-property of a content parent — protect only plain strings
    return fieldType === "string";
  }
  return false;
}

interface SchemaField {
  name: string;
  type: "enum" | "boolean" | "string" | "array" | "object" | "other";
}

/**
 * Extract all top-level fields from a dereferenced component schema,
 * flattening nested object properties using underscore convention
 * (e.g. headline.large → headline_large).
 */
function extractSchemaFields(schema: Record<string, unknown>): SchemaField[] {
  const props =
    (schema.properties as Record<string, Record<string, unknown>>) ?? {};
  const fields: SchemaField[] = [];

  for (const [name, propSchema] of Object.entries(props)) {
    if (STRUCTURAL_FIELDS.has(name)) continue;

    const propType = propSchema.type as string | undefined;

    if (propType === "boolean") {
      fields.push({ name, type: "boolean" });
    } else if (propType === "string" && propSchema.enum) {
      fields.push({ name, type: "enum" });
    } else if (propType === "string") {
      fields.push({ name, type: "string" });
    } else if (propType === "array") {
      fields.push({ name, type: "array" });
    } else if (propType === "object" && propSchema.properties) {
      // Flatten nested object fields
      const nested = propSchema.properties as Record<
        string,
        Record<string, unknown>
      >;
      for (const [subName, subSchema] of Object.entries(nested)) {
        const flatName = `${name}_${subName}`;
        const subType = subSchema.type as string | undefined;
        if (subType === "boolean") {
          fields.push({ name: flatName, type: "boolean" });
        } else if (subType === "string" && subSchema.enum) {
          fields.push({ name: flatName, type: "enum" });
        } else if (subType === "string") {
          fields.push({ name: flatName, type: "string" });
        } else if (subType === "array") {
          fields.push({ name: flatName, type: "array" });
        }
      }
      // Also add the parent object itself (for image, headline etc.)
      fields.push({ name, type: "object" });
    } else {
      fields.push({ name, type: "other" });
    }
  }

  return fields;
}

/**
 * Load a dereferenced component schema from the design system dist.
 */
function loadComponentSchema(
  component: string,
  schemasDir: string,
): SchemaField[] | null {
  const schemaPath = join(
    schemasDir,
    component,
    `${component}.schema.dereffed.json`,
  );
  if (!existsSync(schemaPath)) return null;
  const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));
  return extractSchemaFields(schema);
}

// ---------------------------------------------------------------------------
// Analysis logic
// ---------------------------------------------------------------------------

function classifyField(fd: FieldDistribution): FieldRecommendation {
  const base: Omit<FieldRecommendation, "action" | "reason"> = {
    field: fd.field,
    dominantValue: fd.dominantValue,
    dominantPct: fd.dominantPct,
    isDefault: fd.isDefault,
    total: fd.total,
  };

  // Too few samples — flag for manual review
  if (fd.total < MIN_SAMPLES) {
    return {
      ...base,
      action: "review",
      reason: `Only ${fd.total} sample(s) — insufficient data`,
    };
  }

  // Presence field that is almost always empty → hide
  if (fd.dominantValue === "empty" && fd.dominantPct >= HIDE_EMPTY_THRESHOLD) {
    return {
      ...base,
      action: "hide",
      reason: `Empty ${fd.dominantPct}% of the time — editors rarely populate this`,
    };
  }

  // Enum/boolean field where editors leave the default → hide
  if (fd.isDefault && fd.dominantPct >= HIDE_DEFAULT_THRESHOLD) {
    return {
      ...base,
      action: "hide",
      reason: `Schema default "${fd.dominantValue}" used ${fd.dominantPct}% — editors never change it`,
    };
  }

  // Editors consistently pick a NON-default value → hide + override default
  if (
    !fd.isDefault &&
    fd.dominantPct >= OVERRIDE_DEFAULT_THRESHOLD &&
    fd.dominantValue !== "non-empty" &&
    fd.dominantValue !== "empty"
  ) {
    return {
      ...base,
      action: "hide+override",
      reason: `Editors consistently set "${fd.dominantValue}" (${fd.dominantPct}%) — override default & hide`,
      suggestedDefault: fd.dominantValue,
    };
  }

  // Content field that is actively used → show
  if (fd.dominantValue === "non-empty" && fd.dominantPct >= 70) {
    return {
      ...base,
      action: "show",
      reason: `Actively populated ${fd.dominantPct}% — editors use this`,
    };
  }

  // Varied usage — editors make real choices → show
  if (fd.dominantPct < 70) {
    return {
      ...base,
      action: "show",
      reason: `Varied usage (dominant only ${fd.dominantPct}%) — meaningful editorial choice`,
    };
  }

  // Default catch: moderate dominance, keep visible for review
  return {
    ...base,
    action: "review",
    reason: `Moderate signal (${fd.dominantPct}% "${fd.dominantValue}", isDefault=${fd.isDefault})`,
  };
}

function analyzePatterns(
  data: PatternAnalysis,
  schemasDir: string,
): ComponentRecommendation[] {
  const globalProfiles = data.fieldProfiles.filter((p) => p.context === null);

  // Collect fields observed in ANY context (global, positional, containment)
  // so we don't incorrectly mark them as "never observed"
  const allObservedByComponent = new Map<string, Set<string>>();
  for (const profile of data.fieldProfiles) {
    let set = allObservedByComponent.get(profile.component);
    if (!set) {
      set = new Set();
      allObservedByComponent.set(profile.component, set);
    }
    for (const f of profile.fields) {
      set.add(f.field);
    }
  }

  // Also include components that appear in componentFrequency but have no
  // field profiles (all their fields were unobserved)
  const profiledComponents = new Set(globalProfiles.map((p) => p.component));
  const usedComponents = data.componentFrequency.map((c) => c.component);

  const recommendations: ComponentRecommendation[] = [];

  for (const profile of globalProfiles) {
    const observedFields = new Set(profile.fields.map((f) => f.field));
    const allObserved =
      allObservedByComponent.get(profile.component) ?? observedFields;
    const fieldRecs = profile.fields.map(classifyField);

    // Load schema and find unobserved fields
    const schemaFields = loadComponentSchema(profile.component, schemasDir);
    if (schemaFields) {
      for (const sf of schemaFields) {
        // Skip if observed in ANY context (global, positional, containment)
        if (allObserved.has(sf.name)) continue;
        // Skip primary content fields and their string sub-properties
        if (isContentField(sf.name, sf.type)) continue;
        // Skip array/object parent slots (e.g. buttons, tile, feature)
        if (sf.type === "array" || sf.type === "object") continue;

        fieldRecs.push({
          field: sf.name,
          action: "hide",
          reason: `Never observed in ${profile.samples} stories — editors never set this (${sf.type})`,
          dominantValue: "n/a",
          dominantPct: 0,
          isDefault: true,
          total: 0,
        });
      }
    }

    recommendations.push({
      component: profile.component,
      samples: profile.samples,
      fields: fieldRecs,
    });
  }

  // Handle used components with no profile at all (all fields unobserved)
  for (const comp of usedComponents) {
    if (profiledComponents.has(comp)) continue;
    const schemaFields = loadComponentSchema(comp, schemasDir);
    if (!schemaFields) continue;

    const fieldRecs: FieldRecommendation[] = [];
    const freq = data.componentFrequency.find((c) => c.component === comp);
    const samples = freq?.count ?? 0;

    for (const sf of schemaFields) {
      if (isContentField(sf.name, sf.type)) continue;
      if (sf.type === "array" || sf.type === "object") continue;

      fieldRecs.push({
        field: sf.name,
        action: "hide",
        reason: `Never observed in ${samples} instances — editors never set this (${sf.type})`,
        dominantValue: "n/a",
        dominantPct: 0,
        isDefault: true,
        total: 0,
      });
    }

    if (fieldRecs.length > 0) {
      recommendations.push({
        component: comp,
        samples,
        fields: fieldRecs,
      });
    }
  }

  // Handle unused components — hide all stylistic fields based on schema alone
  const allCoveredComponents = new Set([
    ...profiledComponents,
    ...usedComponents,
  ]);
  for (const comp of data.unusedComponents) {
    if (allCoveredComponents.has(comp)) continue;
    const schemaFields = loadComponentSchema(comp, schemasDir);
    if (!schemaFields) continue;

    const fieldRecs: FieldRecommendation[] = [];

    for (const sf of schemaFields) {
      if (isContentField(sf.name, sf.type)) continue;
      if (sf.type === "array" || sf.type === "object") continue;

      fieldRecs.push({
        field: sf.name,
        action: "hide",
        reason: `Component unused — hiding stylistic field (${sf.type})`,
        dominantValue: "n/a",
        dominantPct: 0,
        isDefault: true,
        total: 0,
      });
    }

    if (fieldRecs.length > 0) {
      recommendations.push({
        component: comp,
        samples: 0,
        fields: fieldRecs,
      });
    }
  }

  return recommendations;
}

// ---------------------------------------------------------------------------
// Visibility layer generation
// ---------------------------------------------------------------------------

type SchemaProperties = Record<string, SchemaProperty>;

interface SchemaProperty {
  "x-cms-hidden"?: boolean;
  properties?: SchemaProperties;
}

/**
 * Build a nested schema-format visibility layer from flat field recommendations.
 * Unflattens underscore-separated names: `image_src` → `image.properties.src`.
 *
 * When ALL sub-properties of a nested object are hidden, the parent object
 * itself is hidden instead. This prevents `hideCmsFields` from leaving an
 * empty `type: "object"` node which crashes `processObject`.
 */
function buildVisibilityLayer(
  rec: ComponentRecommendation,
  schemasDir: string,
): SchemaProperties {
  const layer: SchemaProperties = {};

  for (const f of rec.fields) {
    if (f.action !== "hide" && f.action !== "hide+override") continue;

    const parts = f.field.split("_");
    if (parts.length === 1) {
      // Top-level field
      layer[f.field] = { "x-cms-hidden": true };
    } else {
      // Nested field: image_indent → image.properties.indent
      const parent = parts[0];
      const child = parts.slice(1).join("_");
      if (!layer[parent]) {
        layer[parent] = { properties: {} };
      }
      // If parent was previously marked as a simple hidden field, convert it
      if (!layer[parent].properties) {
        layer[parent].properties = {};
      }
      layer[parent].properties![child] = { "x-cms-hidden": true };
    }
  }

  // Post-process: collapse nested objects where ALL sub-properties are hidden.
  // Load the base schema to know the full set of sub-properties.
  const schemaPath = join(
    schemasDir,
    rec.component,
    `${rec.component}.schema.dereffed.json`,
  );
  if (existsSync(schemaPath)) {
    const baseSchema = JSON.parse(readFileSync(schemaPath, "utf-8"));
    const baseProps =
      (baseSchema.properties as Record<string, Record<string, unknown>>) ?? {};

    for (const [name, prop] of Object.entries(layer)) {
      if (!prop.properties) continue;
      const baseProp = baseProps[name];
      if (baseProp?.type !== "object" || !baseProp.properties) continue;

      const baseSubKeys = Object.keys(
        baseProp.properties as Record<string, unknown>,
      );
      const hiddenSubKeys = Object.keys(prop.properties).filter(
        (k) => prop.properties![k]["x-cms-hidden"],
      );

      if (baseSubKeys.length > 0 && hiddenSubKeys.length >= baseSubKeys.length) {
        // All sub-properties hidden → hide the parent object itself
        layer[name] = { "x-cms-hidden": true };
      }
    }

    // If hiding ALL non-structural top-level properties, return empty layer.
    // A component with every property hidden crashes processObject (empty fields).
    // These components should be removed from the --components list instead.
    const baseNonStructural = Object.keys(baseProps).filter(
      (k) => !STRUCTURAL_FIELDS.has(k),
    );
    const hiddenTopLevel = Object.keys(layer).filter(
      (k) => layer[k]["x-cms-hidden"],
    );
    if (
      baseNonStructural.length > 0 &&
      hiddenTopLevel.length >= baseNonStructural.length
    ) {
      return {};
    }
  }

  return layer;
}

function toVisibilitySchema(
  component: string,
  layer: SchemaProperties,
  layerName: string,
): object {
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: `http://${layerName}.mydesignsystem.com/${component}.schema.json`,
    type: "object",
    allOf: [
      {
        type: "object",
        properties: layer,
        additionalProperties: false,
      },
      {
        $ref: `http://schema.mydesignsystem.com/${component}.schema.json`,
      },
    ],
    additionalProperties: false,
  };
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function printReport(
  recommendations: ComponentRecommendation[],
  data: PatternAnalysis,
): void {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  VISIBILITY LAYER RECOMMENDATIONS FROM CONTENT PATTERNS");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`\n  Stories analysed: ${data.totalStoriesAnalyzed}`);
  console.log(
    `  Thresholds: hide-default≥${HIDE_DEFAULT_THRESHOLD}% | hide-empty≥${HIDE_EMPTY_THRESHOLD}% | override≥${OVERRIDE_DEFAULT_THRESHOLD}% | min-samples≥${MIN_SAMPLES}`,
  );

  // Summary counts
  let totalHide = 0;
  let totalShow = 0;
  let totalOverride = 0;
  let totalReview = 0;

  for (const rec of recommendations) {
    for (const f of rec.fields) {
      if (f.action === "hide") totalHide++;
      else if (f.action === "show") totalShow++;
      else if (f.action === "hide+override") totalOverride++;
      else totalReview++;
    }
  }

  console.log(
    `\n  Summary: ${totalHide} hide | ${totalOverride} hide+override | ${totalShow} show | ${totalReview} review\n`,
  );

  for (const rec of recommendations) {
    console.log(`\n┌─ ${rec.component} (${rec.samples} samples) ─────────`);

    const grouped: Record<Action, FieldRecommendation[]> = {
      hide: [],
      show: [],
      "hide+override": [],
      review: [],
    };
    for (const f of rec.fields) grouped[f.action].push(f);

    if (grouped["hide"].length) {
      console.log("│");
      console.log("│  🚫 HIDE (safe to remove from editor):");
      for (const f of grouped["hide"]) {
        console.log(
          `│    ● ${f.field.padEnd(28)} ${String(f.dominantPct).padStart(3)}% "${f.dominantValue}" — ${f.reason}`,
        );
      }
    }

    if (grouped["hide+override"].length) {
      console.log("│");
      console.log("│  🔄 HIDE + OVERRIDE DEFAULT:");
      for (const f of grouped["hide+override"]) {
        console.log(
          `│    ● ${f.field.padEnd(28)} ${String(f.dominantPct).padStart(3)}% "${f.dominantValue}" — ${f.reason}`,
        );
      }
    }

    if (grouped["show"].length) {
      console.log("│");
      console.log("│  ✅ SHOW (editors actively use):");
      for (const f of grouped["show"]) {
        console.log(
          `│    ● ${f.field.padEnd(28)} ${String(f.dominantPct).padStart(3)}% "${f.dominantValue}" — ${f.reason}`,
        );
      }
    }

    if (grouped["review"].length) {
      console.log("│");
      console.log("│  ❓ REVIEW (needs human judgement):");
      for (const f of grouped["review"]) {
        console.log(
          `│    ● ${f.field.padEnd(28)} ${String(f.dominantPct).padStart(3)}% "${f.dominantValue}" — ${f.reason}`,
        );
      }
    }

    console.log("└───────────────────────────────────────────────────────");
  }

  // Unused components
  if (data.unusedComponents.length) {
    console.log("\n┌─ UNUSED COMPONENTS (never appear in any story) ──────");
    console.log(
      `│  Consider hiding entirely: ${data.unusedComponents.join(", ")}`,
    );
    console.log("└───────────────────────────────────────────────────────");
  }

  // Default override summary
  const overrides = recommendations.flatMap((r) =>
    r.fields
      .filter((f) => f.action === "hide+override")
      .map((f) => ({ component: r.component, ...f })),
  );
  if (overrides.length) {
    console.log("\n┌─ SUGGESTED DEFAULT OVERRIDES ─────────────────────────");
    for (const o of overrides) {
      console.log(
        `│  ${o.component}.${o.field}: change default to "${o.suggestedDefault}" (currently non-default, set ${o.dominantPct}%)`,
      );
    }
    console.log("└───────────────────────────────────────────────────────");
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const args = process.argv.slice(2);
  const applyMode = args.includes("--apply");
  const reportOnly = args.includes("--report-only");

  // Parse --layer <name> (default: "visibility")
  const layerIdx = args.indexOf("--layer");
  const layerName =
    layerIdx !== -1 && layerIdx + 1 < args.length
      ? args[layerIdx + 1]
      : "visibility";

  // Load pattern data
  const patternFile =
    args.find((a) => !a.startsWith("--") && a !== layerName) ??
    resolve(__dirname, "../pattern-analysis.json");

  if (!existsSync(patternFile)) {
    console.error(
      `Pattern data not found at ${patternFile}\n\n` +
        `Generate it first by running:\n` +
        `  # Via MCP: call analyze_content_patterns and save the result\n` +
        `  # Or pipe from stdin:\n` +
        `  cat pattern-data.json | npx tsx scripts/generateVisibilityFromPatterns.ts\n`,
    );
    process.exit(1);
  }

  const raw = readFileSync(patternFile, "utf-8");
  const data: PatternAnalysis = JSON.parse(raw);

  const schemasDir = resolve(__dirname, "../../design-system/dist/components");

  const recommendations = analyzePatterns(data, schemasDir);

  // Always print the report
  printReport(recommendations, data);

  if (reportOnly) {
    return;
  }

  // Write visibility layer files
  const visDir = resolve(__dirname, `../cms/${layerName}`);

  if (!applyMode) {
    console.log(
      `\n💡 Run with --apply to write visibility layer files to cms/${layerName}/`,
    );
    return;
  }

  let written = 0;
  const writtenFiles = new Set<string>();
  for (const rec of recommendations) {
    const layer = buildVisibilityLayer(rec, schemasDir);
    if (Object.keys(layer).length === 0) continue; // Nothing to hide
    const filePath = join(visDir, `${rec.component}.schema.json`);
    const schema = toVisibilitySchema(rec.component, layer, layerName);
    writeFileSync(filePath, JSON.stringify(schema, null, 2) + "\n");
    writtenFiles.add(`${rec.component}.schema.json`);
    written++;
  }

  // Remove stale files from previous runs
  if (existsSync(visDir)) {
    let removed = 0;
    for (const f of readdirSync(visDir)) {
      if (f.endsWith(".schema.json") && !writtenFiles.has(f)) {
        unlinkSync(join(visDir, f));
        removed++;
      }
    }
    if (removed > 0) {
      console.log(`🗑️  Removed ${removed} stale layer file(s)`);
    }
  }

  console.log(`\n✅ Wrote ${written} visibility layer files to ${visDir}/`);
}

main();
