#!/usr/bin/env node
/**
 * mergeStoryblokConfig.ts
 *
 * Merges a generated Storyblok component config with the live (pulled) config
 * to produce a safe-to-push output. See docs/storyblok-config-update-analysis.md
 * and docs/adr/adr-storyblok-config-merge.md for context.
 *
 * Usage:
 *   npx tsx scripts/mergeStoryblokConfig.ts [options]
 *
 * Options:
 *   --component <name>     Merge only this component
 *   --dry-run              Report only, no file output
 *   --reset                Drop live-only fields instead of preserving them.
 *                          Use when deliberately resetting the space to the
 *                          code-defined model, so obsolete fields do not
 *                          linger alongside their replacements.
 *   --generated <path>     Path to generated config (default: cms/components.generated.json)
 *   --live <path>          Path to live config (default: types/components-schema.json)
 *   --generated-presets <path>  Path to generated presets (default: cms/presets.generated.json)
 *   --live-presets <path>  Path to live presets (default: types/components-presets.json)
 *   --live-groups <path>   Path to live groups (default: types/components-groups.json)
 *   --visibility-path <path>  Path to visibility overlay directory (default: cms/visibility/)
 *   --output <path>        Output directory (default: cms/merged/)
 */

import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StoryblokField {
  id?: number;
  pos?: number;
  display_name?: string;
  key?: string;
  type?: string;
  component_whitelist?: string[];
  component_group_whitelist?: string[];
  restrict_components?: boolean;
  restrict_type?: string;
  [key: string]: unknown;
}

interface StoryblokComponent {
  name: string;
  display_name?: string;
  id?: number;
  created_at?: string;
  updated_at?: string;
  schema: Record<string, StoryblokField>;
  is_root?: boolean;
  is_nestable?: boolean;
  component_group_uuid?: string | null;
  component_group_name?: string | null;
  real_name?: string;
  color?: string;
  icon?: string;
  description?: string | null;
  image?: string | null;
  preview_field?: string | null;
  preview_tmpl?: string | null;
  all_presets?: unknown[];
  preset_id?: number | null;
  internal_tags_list?: unknown[];
  internal_tag_ids?: unknown[];
  content_type_asset_preview?: unknown;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

interface StoryblokPreset {
  id: number;
  name: string;
  component_id?: number;
  preset?: Record<string, unknown>;
  image?: string | null;
  [key: string]: unknown;
}

interface StoryblokGroup {
  name: string;
  id?: number;
  uuid: string;
  parent_id?: number | null;
  parent_uuid?: string | null;
}

interface MergeReport {
  timestamp: string;
  summary: {
    totalGenerated: number;
    totalLive: number;
    merged: number;
    newComponents: number;
    unchangedComponents: number;
  };
  components: ComponentReport[];
}

interface ComponentReport {
  name: string;
  status: "new" | "merged" | "unchanged";
  fieldsAdded: string[];
  fieldsReplaced: string[];
  fieldsPreserved: string[];
  fieldsDropped: string[];
  /** Live-only fields removed because --reset was passed. */
  fieldsReset: string[];
  tabsMapped: number;
  whitelistEntriesAdded: string[];
}

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs(): {
  component?: string;
  dryRun: boolean;
  resetLiveFields: boolean;
  generated: string;
  live: string;
  generatedPresets: string;
  livePresets: string;
  liveGroups: string;
  visibilityPath: string;
  output: string;
} {
  const args = process.argv.slice(2);
  const opts: Record<string, string> = {};
  const flags = new Set<string>();

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dry-run") {
      flags.add("dryRun");
    } else if (args[i] === "--reset") {
      flags.add("resetLiveFields");
    } else if (args[i].startsWith("--") && i + 1 < args.length) {
      const key = args[i]
        .replace(/^--/, "")
        .replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
      opts[key] = args[++i];
    }
  }

  return {
    component: opts.component,
    dryRun: flags.has("dryRun"),
    resetLiveFields: flags.has("resetLiveFields"),
    generated: opts.generated ?? "cms/components.generated.json",
    live: opts.live ?? "types/components-schema.json",
    generatedPresets: opts.generatedPresets ?? "cms/presets.generated.json",
    livePresets: opts.livePresets ?? "types/components-presets.json",
    liveGroups: opts.liveGroups ?? "types/components-groups.json",
    visibilityPath: opts.visibilityPath ?? "cms/visibility/",
    output: opts.output ?? "cms/merged/",
  };
}

// ---------------------------------------------------------------------------
// File loading helpers
// ---------------------------------------------------------------------------

/** Load a JSON file, handling both v3 wrapper `{ components: [...] }` and v4 bare array `[...]` */
function loadComponents(filePath: string): StoryblokComponent[] {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  if (Array.isArray(raw)) return raw;
  if (raw.components && Array.isArray(raw.components)) return raw.components;
  throw new Error(
    `Unexpected format in ${filePath}: expected array or { components: [...] }`,
  );
}

function loadPresets(filePath: string): StoryblokPreset[] {
  if (!fs.existsSync(filePath)) return [];
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  if (Array.isArray(raw)) return raw;
  if (raw.presets && Array.isArray(raw.presets)) return raw.presets;
  return [];
}

function loadGroups(filePath: string): StoryblokGroup[] {
  if (!fs.existsSync(filePath)) return [];
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  if (Array.isArray(raw)) return raw;
  return [];
}

// ---------------------------------------------------------------------------
// Visibility overlay
// ---------------------------------------------------------------------------

/**
 * Load visibility overlay files and build a map of hidden field names per component.
 * For each `*.schema.json` in the visibility directory, extracts fields with `x-cms-hidden: true`.
 */
function loadVisibilityMap(visibilityDir: string): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();

  if (!fs.existsSync(visibilityDir)) {
    console.log(
      `  Visibility directory not found: ${visibilityDir} — no fields will be dropped`,
    );
    return map;
  }

  const files = fs
    .readdirSync(visibilityDir)
    .filter((f) => f.endsWith(".schema.json"));

  for (const file of files) {
    const componentName = file.replace(".schema.json", "");
    const filePath = path.join(visibilityDir, file);
    const schema = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    const hiddenFields = new Set<string>();

    // Visibility files use allOf with properties containing x-cms-hidden
    const allOf = schema.allOf ?? [];
    for (const entry of allOf) {
      const props = entry.properties ?? {};
      for (const [fieldName, fieldDef] of Object.entries(props)) {
        if ((fieldDef as Record<string, unknown>)["x-cms-hidden"] === true) {
          hiddenFields.add(fieldName);
        }
      }
    }

    // Also check top-level properties
    const topProps = schema.properties ?? {};
    for (const [fieldName, fieldDef] of Object.entries(topProps)) {
      if ((fieldDef as Record<string, unknown>)["x-cms-hidden"] === true) {
        hiddenFields.add(fieldName);
      }
    }

    if (hiddenFields.size > 0) {
      map.set(componentName, hiddenFields);
    }
  }

  return map;
}

// ---------------------------------------------------------------------------
// Tab helpers
// ---------------------------------------------------------------------------

function isTabField(key: string): boolean {
  return key.startsWith("tab-");
}

/**
 * Extract tab fields from a schema in order (by insertion order in the object).
 * Returns array of [tabKey, tabField] pairs.
 */
function extractTabs(
  schema: Record<string, StoryblokField>,
): [string, StoryblokField][] {
  return Object.entries(schema).filter(([key]) => isTabField(key));
}

// ---------------------------------------------------------------------------
// Merge logic
// ---------------------------------------------------------------------------

const METADATA_KEYS = new Set([
  "description",
  "image",
  "preview_field",
  "preview_tmpl",
  "all_presets",
  "preset_id",
  "internal_tags_list",
  "internal_tag_ids",
  "content_type_asset_preview",
  "metadata",
  "color",
  "icon",
  "real_name",
]);

const STRUCTURAL_KEYS = new Set(["is_root", "is_nestable"]);

const LIVE_KEEP_KEYS = new Set([
  "id",
  "created_at",
  "updated_at",
  "component_group_uuid",
  "component_group_name",
]);

function mergeComponent(
  generated: StoryblokComponent,
  live: StoryblokComponent | undefined,
  hiddenFields: Set<string>,
  report: ComponentReport,
  resetLiveFields: boolean,
): StoryblokComponent {
  // No live match — new component
  if (!live) {
    report.status = "new";
    const allFields = Object.keys(generated.schema).filter(
      (k) => !isTabField(k),
    );
    report.fieldsAdded = allFields;
    return { ...generated };
  }

  report.status = "merged";

  // Start building merged component from live base
  const merged: StoryblokComponent = { ...live };

  // Structural keys come from generated
  for (const key of STRUCTURAL_KEYS) {
    if (key in generated) {
      (merged as Record<string, unknown>)[key] = (
        generated as Record<string, unknown>
      )[key];
    }
  }

  // display_name comes from generated (may be updated by language layer)
  if (generated.display_name) {
    merged.display_name = generated.display_name;
  }

  // Metadata keys stay from live
  // (already in merged since we spread live)

  // Live-keep keys stay from live
  // (already in merged)

  // Now merge the schema
  merged.schema = mergeSchema(
    generated.schema,
    live.schema,
    hiddenFields,
    report,
    resetLiveFields,
  );

  return merged;
}

function mergeSchema(
  generatedSchema: Record<string, StoryblokField>,
  liveSchema: Record<string, StoryblokField>,
  hiddenFields: Set<string>,
  report: ComponentReport,
  resetLiveFields: boolean,
): Record<string, StoryblokField> {
  const result: Record<string, StoryblokField> = {};

  // Build sets for classification
  const generatedKeys = new Set(Object.keys(generatedSchema));
  const liveKeys = new Set(Object.keys(liveSchema));

  // Extract tabs for position mapping
  const generatedTabs = extractTabs(generatedSchema);
  const liveTabs = extractTabs(liveSchema);

  // Build tab UUID mapping: generated tab UUID → live tab UUID (by position)
  const tabMapping = new Map<string, string>();
  for (let i = 0; i < generatedTabs.length; i++) {
    if (i < liveTabs.length) {
      tabMapping.set(generatedTabs[i][0], liveTabs[i][0]);
      report.tabsMapped++;
    }
    // If generated has more tabs than live, the extra tabs keep their generated UUIDs
  }

  // Process all non-tab fields
  const allNonTabKeys = new Set<string>();
  for (const key of generatedKeys) {
    if (!isTabField(key)) allNonTabKeys.add(key);
  }
  for (const key of liveKeys) {
    if (!isTabField(key)) allNonTabKeys.add(key);
  }

  for (const key of allNonTabKeys) {
    const inGenerated = generatedKeys.has(key);
    const inLive = liveKeys.has(key);

    if (inGenerated && inLive) {
      // Present in both → use generated version (apply schema layer changes)
      result[key] = mergeField(generatedSchema[key], liveSchema[key], report);
      report.fieldsReplaced.push(key);
    } else if (inGenerated && !inLive) {
      // Only in generated → add
      result[key] = generatedSchema[key];
      report.fieldsAdded.push(key);
    } else if (!inGenerated && inLive) {
      // Only in live — classify
      if (hiddenFields.has(key)) {
        // Visibility-hidden → drop
        report.fieldsDropped.push(key);
      } else if (resetLiveFields) {
        // Deliberate reset to the code-defined model → drop.
        // Stored content keeps the key (Storyblok does not strip unknown
        // fields), so this is reversible by re-adding the field.
        report.fieldsReset.push(key);
      } else {
        // Manually-added → preserve
        result[key] = liveSchema[key];
        report.fieldsPreserved.push(key);
      }
    }
  }

  // Process tab fields — use position mapping
  // First, add any live-only tabs (tabs in live but not matched to generated)
  const mappedLiveTabs = new Set(tabMapping.values());
  for (const [liveTabKey, liveTabField] of liveTabs) {
    if (!mappedLiveTabs.has(liveTabKey)) {
      // Live tab not matched by any generated tab — preserve it
      result[liveTabKey] = liveTabField;
    }
  }

  // Now add generated tabs, remapped to live UUIDs
  for (const [genTabKey, genTabField] of generatedTabs) {
    const liveTabKey = tabMapping.get(genTabKey);
    if (liveTabKey) {
      // Mapped to a live tab — use live UUID with generated content
      result[liveTabKey] = { ...genTabField };
    } else {
      // New tab (no live match) — keep generated UUID
      result[genTabKey] = genTabField;
    }
  }

  return result;
}

function mergeField(
  generated: StoryblokField,
  live: StoryblokField,
  report: ComponentReport,
): StoryblokField {
  const merged = { ...generated };

  // component_group_whitelist: always keep live values
  if (live.component_group_whitelist) {
    merged.component_group_whitelist = live.component_group_whitelist;
  }

  // component_whitelist: additive-only merge
  if (live.component_whitelist || generated.component_whitelist) {
    const liveList = live.component_whitelist ?? [];
    const genList = generated.component_whitelist ?? [];
    const mergedSet = new Set(liveList);
    for (const entry of genList) {
      if (!mergedSet.has(entry)) {
        mergedSet.add(entry);
        report.whitelistEntriesAdded.push(`${generated.key ?? "?"}: +${entry}`);
      }
    }
    merged.component_whitelist = [...mergedSet];
  }

  return merged;
}

// ---------------------------------------------------------------------------
// Preset merge
// ---------------------------------------------------------------------------

function mergePresets(
  generatedPresets: StoryblokPreset[],
  livePresets: StoryblokPreset[],
): StoryblokPreset[] {
  // Use live presets as base, update/add from generated by name
  const liveByName = new Map<string, StoryblokPreset>();
  for (const p of livePresets) {
    liveByName.set(p.name, p);
  }

  const result = [...livePresets];

  for (const genPreset of generatedPresets) {
    if (!liveByName.has(genPreset.name)) {
      // New preset — add
      result.push(genPreset);
    }
    // Existing presets keep live version (live is already in result)
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const opts = parseArgs();

  console.log("Storyblok Config Merge");
  console.log("======================\n");

  // Load inputs
  console.log("Loading inputs...");
  const generatedComponents = loadComponents(opts.generated);
  console.log(
    `  Generated: ${generatedComponents.length} components from ${opts.generated}`,
  );

  const liveComponents = loadComponents(opts.live);
  console.log(`  Live: ${liveComponents.length} components from ${opts.live}`);

  const visibilityMap = loadVisibilityMap(opts.visibilityPath);
  console.log(
    `  Visibility: ${visibilityMap.size} components with hidden fields`,
  );

  const generatedPresets = loadPresets(opts.generatedPresets);
  console.log(`  Generated presets: ${generatedPresets.length}`);

  const livePresets = loadPresets(opts.livePresets);
  console.log(`  Live presets: ${livePresets.length}`);

  const liveGroups = loadGroups(opts.liveGroups);
  console.log(`  Live groups: ${liveGroups.length}`);

  // Build live component lookup by name
  const liveByName = new Map<string, StoryblokComponent>();
  for (const comp of liveComponents) {
    liveByName.set(comp.name, comp);
  }

  // Filter components if --component flag is set
  const componentsToMerge = opts.component
    ? generatedComponents.filter((c) => c.name === opts.component)
    : generatedComponents;

  if (opts.component && componentsToMerge.length === 0) {
    console.error(
      `\nError: Component "${opts.component}" not found in generated config.`,
    );
    process.exit(1);
  }

  // Merge
  console.log(`\nMerging ${componentsToMerge.length} component(s)...\n`);

  const report: MergeReport = {
    timestamp: new Date().toISOString(),
    summary: {
      totalGenerated: generatedComponents.length,
      totalLive: liveComponents.length,
      merged: 0,
      newComponents: 0,
      unchangedComponents: 0,
    },
    components: [],
  };

  const mergedComponents: StoryblokComponent[] = [];

  for (const genComp of componentsToMerge) {
    const liveComp = liveByName.get(genComp.name);
    const hiddenFields = visibilityMap.get(genComp.name) ?? new Set<string>();

    const compReport: ComponentReport = {
      name: genComp.name,
      status: "unchanged",
      fieldsAdded: [],
      fieldsReplaced: [],
      fieldsPreserved: [],
      fieldsDropped: [],
      fieldsReset: [],
      tabsMapped: 0,
      whitelistEntriesAdded: [],
    };

    const merged = mergeComponent(
      genComp,
      liveComp,
      hiddenFields,
      compReport,
      opts.resetLiveFields,
    );

    // Check if anything actually changed
    if (compReport.status === "merged") {
      const hasChanges =
        compReport.fieldsAdded.length > 0 ||
        compReport.fieldsReplaced.length > 0 ||
        compReport.fieldsDropped.length > 0 ||
        compReport.fieldsReset.length > 0 ||
        compReport.whitelistEntriesAdded.length > 0;
      if (!hasChanges && compReport.fieldsPreserved.length === 0) {
        compReport.status = "unchanged";
      }
    }

    mergedComponents.push(merged);
    report.components.push(compReport);

    // Update summary
    switch (compReport.status) {
      case "new":
        report.summary.newComponents++;
        break;
      case "merged":
        report.summary.merged++;
        break;
      case "unchanged":
        report.summary.unchangedComponents++;
        break;
    }

    // Log per-component summary
    const icon =
      compReport.status === "new"
        ? "+"
        : compReport.status === "merged"
          ? "~"
          : "=";
    console.log(
      `  [${icon}] ${genComp.name}: ${compReport.fieldsAdded.length} added, ` +
        `${compReport.fieldsReplaced.length} replaced, ` +
        `${compReport.fieldsPreserved.length} preserved, ` +
        `${compReport.fieldsDropped.length} dropped, ` +
        `${compReport.fieldsReset.length} reset, ` +
        `${compReport.tabsMapped} tabs mapped`,
    );

    if (compReport.whitelistEntriesAdded.length > 0) {
      console.log(
        `      whitelist additions: ${compReport.whitelistEntriesAdded.join(
          ", ",
        )}`,
      );
    }
    if (compReport.fieldsDropped.length > 0) {
      console.log(
        `      dropped (visibility-hidden): ${compReport.fieldsDropped.join(
          ", ",
        )}`,
      );
    }
    if (compReport.fieldsReset.length > 0) {
      console.log(
        `      reset (removed from space): ${compReport.fieldsReset.join(", ")}`,
      );
    }
    if (compReport.fieldsPreserved.length > 0) {
      console.log(
        `      preserved (manual): ${compReport.fieldsPreserved.join(", ")}`,
      );
    }
  }

  // Merge presets and resolve component_id from merged components
  const mergedPresets = mergePresets(generatedPresets, livePresets);

  // Build component name → id lookup from merged components (which have real Storyblok IDs)
  const componentIdByName = new Map<string, number>();
  for (const comp of mergedComponents) {
    if (comp.name && comp.id) {
      componentIdByName.set(comp.name, comp.id);
    }
  }

  // Resolve component_id for all presets (generated ones have id: 0)
  for (const preset of mergedPresets) {
    const componentName =
      preset.preset && typeof preset.preset === "object"
        ? (preset.preset as Record<string, unknown>).component
        : undefined;
    if (
      typeof componentName === "string" &&
      componentIdByName.has(componentName)
    ) {
      preset.component_id = componentIdByName.get(componentName)!;
    }
  }

  // Ensure every preset has a unique id (the CLI v4 uses preset.id as graph
  // node key — duplicates cause presets to silently overwrite each other)
  const usedPresetIds = new Set<number>();
  let nextId = 1;
  for (const preset of mergedPresets) {
    if (preset.id && !usedPresetIds.has(preset.id)) {
      usedPresetIds.add(preset.id);
    } else {
      // Find a free id that doesn't collide with existing ones
      while (usedPresetIds.has(nextId)) nextId++;
      preset.id = nextId;
      usedPresetIds.add(nextId);
      nextId++;
    }
  }

  // Summary
  console.log("\n--- Summary ---");
  console.log(`  New components:       ${report.summary.newComponents}`);
  console.log(`  Merged components:    ${report.summary.merged}`);
  console.log(`  Unchanged components: ${report.summary.unchangedComponents}`);
  console.log(`  Total merged presets: ${mergedPresets.length}`);

  if (opts.dryRun) {
    console.log("\n[DRY RUN] No files written.");
    // Still write the report
    const reportPath = path.join(
      path.dirname(opts.output),
      "merge-report.json",
    );
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`  Report written to ${reportPath}`);
    return;
  }

  // Write output in v4 format (bare arrays, separate files)
  // The CLI expects {path}/components/{spaceId}/ structure, but since the space ID
  // is handled by the config file, we write directly to the output dir.
  // The push command with -p will find the components/ subdirectory.
  const spaceId = process.env.NEXT_STORYBLOK_SPACE_ID ?? "default";
  const outputDir = path.join(opts.output, "components", spaceId);
  fs.mkdirSync(outputDir, { recursive: true });

  // Write components as bare array (v4 format)
  const componentsPath = path.join(outputDir, "components.json");
  fs.writeFileSync(componentsPath, JSON.stringify(mergedComponents, null, 2));
  console.log(
    `\n  Written: ${componentsPath} (${mergedComponents.length} components)`,
  );

  // Write groups from live (always use live group data)
  const groupsPath = path.join(outputDir, "groups.json");
  fs.writeFileSync(groupsPath, JSON.stringify(liveGroups, null, 2));
  console.log(`  Written: ${groupsPath} (${liveGroups.length} groups)`);

  // Write merged presets
  const presetsPath = path.join(outputDir, "presets.json");
  fs.writeFileSync(presetsPath, JSON.stringify(mergedPresets, null, 2));
  console.log(`  Written: ${presetsPath} (${mergedPresets.length} presets)`);

  // Write merge report
  const reportPath = "cms/merge-report.json";
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`  Written: ${reportPath}`);

  console.log(
    "\nDone! Review the merged output and push with: npm run push-components",
  );
}

main();
