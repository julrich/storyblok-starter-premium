/**
 * Field-level compositional guidance for AI content generation.
 *
 * Assembles contextual guidance from three sources:
 * 1. **Editorial hints** — curated composition advice from section recipes
 * 2. **Statistical profiles** — field value distributions from published content
 * 3. **Schema annotations** — inline field descriptions for OpenAI
 *
 * The guidance is layered into the system prompt to nudge the LLM toward
 * site-consistent field values without hard-coding constraints.
 *
 * Pure functions — no framework dependencies.
 */

import type { ValidationRules } from "./validate.js";

// ─── Types ────────────────────────────────────────────────────────────

/**
 * A stylistic field with a finite value domain (enum or boolean),
 * discovered from the JSON Schema.
 */
export interface StylisticFieldSpec {
  /** Property name in the component schema (e.g. "width", "content_mode"). */
  field: string;
  /** Whether the field is an enum or a boolean. */
  type: "enum" | "boolean";
  /** All possible enum values, or `["true", "false"]` for booleans. */
  values: string[];
  /** Schema default value (if declared), as a string. */
  defaultValue?: string;
}

/**
 * A content field where empty-vs-populated is compositionally significant.
 * E.g. section headline (omit when child has one) or buttons (competing CTAs).
 */
export interface PresenceFieldSpec {
  /** Property name (e.g. "headline_text", "buttons"). */
  field: string;
  /** How to detect presence. */
  type: "string-presence" | "array-presence";
}

/**
 * Distribution of observed values for a single field.
 */
export interface FieldDistribution {
  /** The field name. */
  field: string;
  /** Value → count map. */
  values: Record<string, number>;
  /** Total number of observations. */
  total: number;
  /** The most frequent value. */
  dominantValue: string;
  /** Percentage of the dominant value (0–100). */
  dominantPct: number;
  /** Whether the dominant value matches the schema default. */
  isDefault: boolean;
}

/**
 * Context describing how a field profile was scoped.
 *
 * - No context → Dimension 1 (context-free baseline)
 * - `contains:hero` → Dimension 2A (section containing a hero)
 * - `containedIn:section.width=full` → Dimension 2B (hero inside a full-width section)
 * - `position:first` → Dimension 3 (first section on the page)
 */
export type FieldProfileContext =
  | { type: "contains"; childComponent: string }
  | { type: "containedIn"; containerField: string; containerValue: string }
  | { type: "position"; position: "first" | "middle" | "last" }
  | null; // null = context-free (Dimension 1)

/**
 * Field value distributions for a component, optionally scoped by context.
 */
export interface FieldProfile {
  /** Component type name (e.g. "section", "hero"). */
  component: string;
  /** Scoping context, or null for context-free. */
  context: FieldProfileContext;
  /** Field distributions that survived pruning. */
  fields: FieldDistribution[];
  /** Number of observations backing this profile. */
  samples: number;
}

/**
 * Shape of the section-recipes.json file.
 */
export interface SectionRecipe {
  name: string;
  intent: string;
  components: string[];
  subComponents?: Record<string, number[]>;
  notes: string;
  frequency: string;
  goodFollowUps?: string[];
  contentType?: string;
  compositionHints?: Record<string, Record<string, string>>;
}

export interface SectionRecipes {
  recipes: SectionRecipe[];
  pageTemplates: Array<{
    name: string;
    sequence: string[];
    intent: string;
    notes: string;
    contentType?: string;
  }>;
  antiPatterns: Array<{
    rule: string;
    reason: string;
  }>;
}

// ─── Field Discovery ──────────────────────────────────────────────────

/**
 * Walk the dereferenced schema and discover stylistic fields per component.
 *
 * A "stylistic field" is one with a finite value domain:
 * - Enum properties (type: "string" with "enum")
 * - Boolean properties (type: "boolean")
 *
 * Content fields (free text, images, nested bloks) are excluded.
 *
 * @param derefSchema - Fully dereferenced root schema (e.g. page.schema.dereffed.json)
 * @param validationRules - Schema-derived validation rules
 * @returns Map from component name → array of stylistic field specs
 */
export function discoverStylisticFields(
  derefSchema: Record<string, any>,
  validationRules: ValidationRules
): Map<string, StylisticFieldSpec[]> {
  const result = new Map<string, StylisticFieldSpec[]>();

  // Walk all component schemas in the dereferenced schema
  walkComponentSchemas(derefSchema, validationRules, (componentName, props) => {
    const fields: StylisticFieldSpec[] = [];

    for (const [propName, propSchema] of Object.entries<any>(props)) {
      if (!propSchema || typeof propSchema !== "object") continue;

      // Skip structural/identity fields
      if (
        propName === "type" ||
        propName === "component" ||
        propName === "_uid"
      )
        continue;
      // Skip nested arrays (sub-component slots)
      if (propSchema.type === "array") continue;

      // Recurse into object fields (e.g. section.headline, section.content)
      // to discover nested enum/boolean properties, using Storyblok's flat
      // naming convention (parent_child).
      if (propSchema.type === "object") {
        if (propSchema.properties) {
          for (const [subPropName, subPropSchema] of Object.entries<any>(
            propSchema.properties
          )) {
            if (!subPropSchema || typeof subPropSchema !== "object") continue;
            if (
              subPropName === "type" ||
              subPropName === "component" ||
              subPropName === "_uid"
            )
              continue;

            const flatKey = `${propName}_${subPropName}`;

            if (
              subPropSchema.type === "string" &&
              Array.isArray(subPropSchema.enum)
            ) {
              fields.push({
                field: flatKey,
                type: "enum",
                values: subPropSchema.enum.map(String),
                defaultValue:
                  subPropSchema.default !== undefined
                    ? String(subPropSchema.default)
                    : undefined,
              });
            } else if (subPropSchema.type === "boolean") {
              fields.push({
                field: flatKey,
                type: "boolean",
                values: ["true", "false"],
                defaultValue:
                  subPropSchema.default !== undefined
                    ? String(subPropSchema.default)
                    : undefined,
              });
            }
          }
        }
        continue;
      }

      if (propSchema.type === "string" && Array.isArray(propSchema.enum)) {
        fields.push({
          field: propName,
          type: "enum",
          values: propSchema.enum.map(String),
          defaultValue:
            propSchema.default !== undefined
              ? String(propSchema.default)
              : undefined,
        });
      } else if (propSchema.type === "boolean") {
        fields.push({
          field: propName,
          type: "boolean",
          values: ["true", "false"],
          defaultValue:
            propSchema.default !== undefined
              ? String(propSchema.default)
              : undefined,
        });
      }
    }

    if (fields.length > 0) {
      result.set(componentName, fields);
    }
  });

  return result;
}

/**
 * Discover presence fields — content fields where empty-vs-populated
 * has compositional significance.
 *
 * Heuristics:
 * - String fields with "headline" or "sub" in the name → string-presence
 * - String fields with format "markdown" → string-presence
 * - Array fields named "buttons" or "cta" → array-presence
 */
export function discoverPresenceFields(
  derefSchema: Record<string, any>,
  validationRules: ValidationRules
): Map<string, PresenceFieldSpec[]> {
  const result = new Map<string, PresenceFieldSpec[]>();

  walkComponentSchemas(derefSchema, validationRules, (componentName, props) => {
    const fields: PresenceFieldSpec[] = [];

    for (const [propName, propSchema] of Object.entries<any>(props)) {
      if (!propSchema || typeof propSchema !== "object") continue;

      // String presence: headline/sub/markdown fields
      if (propSchema.type === "string") {
        const isHeadlineLike =
          propName.includes("headline") || propName.includes("sub");
        const isMarkdown = propSchema.format === "markdown";
        if (isHeadlineLike || isMarkdown) {
          fields.push({ field: propName, type: "string-presence" });
        }
      }

      // Array presence: buttons/cta arrays
      if (propSchema.type === "array") {
        const isCTALike =
          propName === "buttons" ||
          propName.includes("button") ||
          propName.includes("cta");
        if (isCTALike) {
          fields.push({ field: propName, type: "array-presence" });
        }
      }

      // Recurse into object fields (e.g. section.headline, section.content)
      // using Storyblok's flat naming convention (parent_child).
      if (propSchema.type === "object" && propSchema.properties) {
        for (const [subPropName, subPropSchema] of Object.entries<any>(
          propSchema.properties
        )) {
          if (!subPropSchema || typeof subPropSchema !== "object") continue;

          const flatKey = `${propName}_${subPropName}`;

          if (subPropSchema.type === "string") {
            const isHeadlineLike =
              flatKey.includes("headline") || subPropName.includes("sub");
            const isMarkdown = subPropSchema.format === "markdown";
            if (isHeadlineLike || isMarkdown) {
              fields.push({ field: flatKey, type: "string-presence" });
            }
          }

          if (subPropSchema.type === "array") {
            const isCTALike =
              subPropName === "buttons" ||
              subPropName.includes("button") ||
              subPropName.includes("cta");
            if (isCTALike) {
              fields.push({ field: flatKey, type: "array-presence" });
            }
          }
        }
      }
    }

    if (fields.length > 0) {
      result.set(componentName, fields);
    }
  });

  return result;
}

// ─── Field Distribution Computation ───────────────────────────────────

/**
 * Convert raw value→count map into a FieldDistribution.
 */
export function computeFieldDistribution(
  field: string,
  valueCounts: Record<string, number>,
  defaultValue?: string
): FieldDistribution {
  const total = Object.values(valueCounts).reduce((a, b) => a + b, 0);

  let dominantValue = "";
  let dominantCount = 0;
  for (const [value, count] of Object.entries(valueCounts)) {
    if (count > dominantCount) {
      dominantCount = count;
      dominantValue = value;
    }
  }

  return {
    field,
    values: { ...valueCounts },
    total,
    dominantValue,
    dominantPct: total > 0 ? Math.round((dominantCount / total) * 100) : 0,
    isDefault: defaultValue !== undefined && dominantValue === defaultValue,
  };
}

// ─── Pruning ──────────────────────────────────────────────────────────

export interface PruneOptions {
  /** Minimum observation count. Default: 3 */
  minSamples?: number;
  /** Minimum dominant percentage. Default: 60 */
  dominanceThreshold?: number;
  /** Skip fields where dominant = default AND dominance > this %. Default: 95 */
  defaultSkipThreshold?: number;
  /** Max Dim 2A profiles per component. Default: 15 */
  maxContainsProfiles?: number;
  /** Max Dim 2B profiles per component. Default: 10 */
  maxContainedInProfiles?: number;
  /** Minimum percentage point delta for positional profiles. Default: 15 */
  positionalDeltaThreshold?: number;
}

const DEFAULT_PRUNE_OPTIONS: Required<PruneOptions> = {
  minSamples: 3,
  dominanceThreshold: 60,
  defaultSkipThreshold: 95,
  maxContainsProfiles: 15,
  maxContainedInProfiles: 10,
  positionalDeltaThreshold: 15,
};

/**
 * Apply pruning rules to a set of field profiles.
 *
 * Rules:
 * 1. Drop profiles with fewer than `minSamples` observations
 * 2. Drop individual field distributions below `dominanceThreshold`
 * 3. Drop fields where dominant = schema default AND > `defaultSkipThreshold`%
 * 4. Drop positional profiles that don't differ from the context-free baseline
 * 5. Limit Dim 2A and Dim 2B profiles per component to top-N by sample count
 *
 * @returns Pruned profiles (new array, originals not mutated).
 */
export function pruneFieldProfiles(
  profiles: FieldProfile[],
  options: PruneOptions = {}
): FieldProfile[] {
  const opts = { ...DEFAULT_PRUNE_OPTIONS, ...options };

  // Build a context-free baseline index for positional delta checks
  const baselineIndex = new Map<string, Map<string, FieldDistribution>>();
  for (const profile of profiles) {
    if (profile.context === null) {
      const fieldMap = new Map<string, FieldDistribution>();
      for (const fd of profile.fields) {
        fieldMap.set(fd.field, fd);
      }
      baselineIndex.set(profile.component, fieldMap);
    }
  }

  let result: FieldProfile[] = [];

  for (const profile of profiles) {
    // Rule 1: Minimum samples
    if (profile.samples < opts.minSamples) continue;

    // Prune individual fields
    const prunedFields = profile.fields.filter((fd) => {
      // Rule 2: Dominance threshold
      if (fd.dominantPct < opts.dominanceThreshold) return false;

      // Rule 3: Skip default-only
      if (fd.isDefault && fd.dominantPct > opts.defaultSkipThreshold)
        return false;

      // Rule 4: Positional delta — only applies to position-scoped profiles
      if (profile.context?.type === "position") {
        const baseline = baselineIndex.get(profile.component)?.get(fd.field);
        if (baseline) {
          const sameDominant = baseline.dominantValue === fd.dominantValue;
          const smallDelta =
            Math.abs(fd.dominantPct - baseline.dominantPct) <
            opts.positionalDeltaThreshold;
          if (sameDominant && smallDelta) return false;
        }
      }

      return true;
    });

    if (prunedFields.length === 0) continue;

    result.push({
      ...profile,
      fields: prunedFields,
    });
  }

  // Rule 5: Top-N scoped profiles
  result = capScopedProfiles(result, "contains", opts.maxContainsProfiles);
  result = capScopedProfiles(
    result,
    "containedIn",
    opts.maxContainedInProfiles
  );

  return result;
}

/**
 * Cap the number of scoped profiles per component for a given context type.
 */
function capScopedProfiles(
  profiles: FieldProfile[],
  contextType: string,
  maxPerComponent: number
): FieldProfile[] {
  // Group by component
  const groups = new Map<string, FieldProfile[]>();
  const nonScoped: FieldProfile[] = [];

  for (const p of profiles) {
    if (p.context?.type === contextType) {
      const existing = groups.get(p.component) || [];
      existing.push(p);
      groups.set(p.component, existing);
    } else {
      nonScoped.push(p);
    }
  }

  // For each component, sort by sample count desc and take top N
  for (const [_component, group] of groups) {
    group.sort((a, b) => b.samples - a.samples);
    const capped = group.slice(0, maxPerComponent);
    nonScoped.push(...capped);
  }

  return nonScoped;
}

// ─── Prompt Assembly ──────────────────────────────────────────────────

/** Options for `assembleFieldGuidance`. */
export interface AssembleFieldGuidanceOptions {
  /** The component type being generated (e.g. "hero", "faq"). */
  componentType: string;
  /** Content pattern analysis (includes fieldProfiles). */
  patterns: { fieldProfiles?: FieldProfile[] } | null;
  /** Section recipes with composition hints. */
  recipes: SectionRecipes;
  /** Positional context on the page. */
  position?: "first" | "last" | "middle";
  /** Label for the pattern scope (e.g. "en/services/"). */
  scopeLabel?: string;
}

/** Rough token estimate: ~4 chars per token. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Dominance threshold above which guidance becomes prescriptive ("MUST use"). */
const PRESCRIPTIVE_THRESHOLD = 80;

/**
 * Format a field distribution line for the system prompt.
 *
 * - ≥80% dominance → prescriptive: "MUST be \"list\"" — makes guidance
 *   nearly binding so the LLM doesn't override site conventions.
 * - 60–79% dominance → suggestive: "prefer \"list\"" — allows flexibility.
 *
 * @param fieldName  Display name (e.g. "section.content_mode" or "height")
 * @param fd        The field distribution data
 * @param suffix    Optional trailing text (e.g. "(when section.width=\"wide\")")
 */
/**
 * Check whether a value→count map uses presence-tracking synthetic values
 * ("empty" / "non-empty").  These must never be passed verbatim to the LLM.
 */
function isPresenceTracked(values: Record<string, number>): boolean {
  const keys = Object.keys(values);
  return keys.every((k) => k === "empty" || k === "non-empty");
}

/**
 * Render a presence-tracked distribution as natural language.
 * E.g. "MUST be left empty" or "MUST be populated with meaningful content".
 */
function formatPresenceLine(
  fieldName: string,
  fd: FieldDistribution,
  prescriptive: boolean,
  suffix: string
): string {
  const verb =
    fd.dominantValue === "empty"
      ? "left empty"
      : "populated with meaningful content";
  if (prescriptive) {
    return `  - ${fieldName}: MUST be ${verb} — ${fd.dominantPct}% of ${fd.total} existing examples do this. Do NOT deviate unless the user explicitly requests otherwise.${suffix}`;
  }
  // Suggestive
  const pctEmpty = fd.values["empty"]
    ? Math.round((fd.values["empty"] / fd.total) * 100)
    : 0;
  const pctFilled = 100 - pctEmpty;
  return `  - ${fieldName}: prefer ${
    fd.dominantValue === "empty" ? "leaving empty" : "populating"
  } (empty ${pctEmpty}%, filled ${pctFilled}%, ${fd.total} samples)${suffix}`;
}

function formatFieldLine(
  fieldName: string,
  fd: FieldDistribution,
  suffix?: string
): string {
  const suffixStr = suffix ? ` ${suffix}` : "";
  const prescriptive = fd.dominantPct >= PRESCRIPTIVE_THRESHOLD;

  // Handle presence-tracked fields — never output literal "empty" / "non-empty"
  if (isPresenceTracked(fd.values)) {
    return formatPresenceLine(fieldName, fd, prescriptive, suffixStr);
  }

  if (prescriptive) {
    return `  - ${fieldName}: MUST be "${fd.dominantValue}" — ${fd.dominantPct}% of ${fd.total} existing examples use this value. Do NOT deviate unless the user explicitly requests otherwise.${suffixStr}`;
  }

  // Suggestive — show distribution
  const sorted = Object.entries(fd.values).sort(([, a], [, b]) => b - a);
  const topValues = sorted
    .slice(0, 3)
    .map(([v, c]) => `"${v}" ${Math.round((c / fd.total) * 100)}%`)
    .join(", ");
  return `  - ${fieldName}: prefer ${topValues} (${fd.total} samples)${suffixStr}`;
}

/** Max total token budget for field guidance. */
const MAX_GUIDANCE_TOKENS = 800;

/**
 * Assemble field-level guidance for injection into the system prompt.
 *
 * Combines 5 layers (in priority order):
 * 1. Editorial hints from recipes (always included)
 * 2. Composition profile — Dim 2A (section scoped by child component)
 * 3. Component profile — Dim 1 (context-free baseline)
 * 4. Positional context — Dim 3 (first/middle/last section)
 * 5. Container-scoped component profile — Dim 2B
 *
 * Total capped at ~800 tokens. If exceeded, lower-priority layers are
 * truncated (5 → 4 → 3). Layers 1 and 2 are always kept.
 *
 * @returns Guidance text for the system prompt, or empty string if no
 *   guidance is available.
 */
export function assembleFieldGuidance(
  options: AssembleFieldGuidanceOptions
): string {
  const { componentType, patterns, recipes, position, scopeLabel } = options;
  const fieldProfiles = patterns?.fieldProfiles || [];

  const layers: { priority: number; text: string }[] = [];

  // ─── Pre-compute site-pattern field set ─────────────────────
  // Collect all field names that have site-pattern data (Dim 2A + Dim 1).
  // Recipe hints for these fields will be suppressed — site patterns are
  // authoritative and should not be contradicted by generic best practices.
  const sitePatternFieldKeys = new Set<string>();
  for (const p of fieldProfiles) {
    if (
      p.context?.type === "contains" &&
      (p.context as { childComponent: string }).childComponent ===
        componentType
    ) {
      for (const fd of p.fields) {
        sitePatternFieldKeys.add(`${p.component}.${fd.field}`);
      }
    }
    if (p.context === null && p.component === componentType) {
      for (const fd of p.fields) {
        sitePatternFieldKeys.add(fd.field);
      }
    }
  }

  // ─── Layer 1: Editorial hints from recipes ──────────────────
  const recipe = recipes.recipes?.find(
    (r) =>
      r.components.includes(componentType) &&
      (!r.contentType || r.contentType === "page")
  );
  if (recipe?.compositionHints) {
    const lines: string[] = [];
    // Component-specific hints — skip fields covered by site patterns
    const compHints = recipe.compositionHints[componentType];
    if (compHints) {
      for (const [field, hint] of Object.entries(compHints)) {
        if (sitePatternFieldKeys.has(field)) continue;
        lines.push(`  - ${field}: ${hint}`);
      }
    }
    // Section-level hints — skip fields covered by site patterns
    const sectionHints = recipe.compositionHints["section"];
    if (sectionHints) {
      for (const [field, hint] of Object.entries(sectionHints)) {
        if (sitePatternFieldKeys.has(`section.${field}`)) continue;
        lines.push(`  - section.${field}: ${hint}`);
      }
    }
    if (lines.length > 0) {
      layers.push({
        priority: 1,
        text: `Component best practices:\n${lines.join("\n")}`,
      });
    }
  }

  // ─── Layer 2: Composition profile (Dim 2A) ─────────────────
  const dim2aProfiles = fieldProfiles.filter(
    (p) =>
      p.context?.type === "contains" &&
      (p.context as { childComponent: string }).childComponent === componentType
  );
  if (dim2aProfiles.length > 0) {
    const lines: string[] = [];
    const scopeNote = scopeLabel ? ` (in ${scopeLabel})` : "";
    for (const profile of dim2aProfiles) {
      for (const fd of profile.fields) {
        lines.push(formatFieldLine(`${profile.component}.${fd.field}`, fd));
      }
    }
    if (lines.length > 0) {
      layers.push({
        priority: 2,
        text: `Site patterns for sections containing "${componentType}"${scopeNote}:\n${lines.join(
          "\n"
        )}`,
      });
    }
  }

  // ─── Layer 3: Component profile (Dim 1) ─────────────────────
  const dim1Profiles = fieldProfiles.filter(
    (p) => p.context === null && p.component === componentType
  );
  if (dim1Profiles.length > 0) {
    const lines: string[] = [];
    const scopeNote = scopeLabel ? ` (in ${scopeLabel})` : "";
    for (const profile of dim1Profiles) {
      for (const fd of profile.fields) {
        lines.push(formatFieldLine(fd.field, fd));
      }
    }
    if (lines.length > 0) {
      layers.push({
        priority: 3,
        text: `Site patterns for "${componentType}" components${scopeNote}:\n${lines.join(
          "\n"
        )}`,
      });
    }
  }

  // ─── Layer 4: Positional context (Dim 3) ────────────────────
  if (position) {
    const dim3Profiles = fieldProfiles.filter(
      (p) =>
        p.context?.type === "position" &&
        (p.context as { position: string }).position === position
    );
    if (dim3Profiles.length > 0) {
      const lines: string[] = [];
      for (const profile of dim3Profiles) {
        for (const fd of profile.fields) {
          lines.push(formatFieldLine(`${profile.component}.${fd.field}`, fd));
        }
      }
      if (lines.length > 0) {
        layers.push({
          priority: 4,
          text: `Positional context (this is the ${position} section on the page):\n${lines.join(
            "\n"
          )}`,
        });
      }
    }
  }

  // ─── Layer 5: Container-scoped component profile (Dim 2B) ───
  const dim2bProfiles = fieldProfiles.filter(
    (p) => p.context?.type === "containedIn" && p.component === componentType
  );
  if (dim2bProfiles.length > 0) {
    const lines: string[] = [];
    for (const profile of dim2bProfiles) {
      const ctx = profile.context as {
        containerField: string;
        containerValue: string;
      };
      for (const fd of profile.fields) {
        lines.push(
          formatFieldLine(
            fd.field,
            fd,
            `(when section.${ctx.containerField}="${ctx.containerValue}")`
          )
        );
      }
    }
    if (lines.length > 0) {
      layers.push({
        priority: 5,
        text: `Container-scoped patterns for "${componentType}":\n${lines.join(
          "\n"
        )}`,
      });
    }
  }

  // ─── Assemble with token budget ─────────────────────────────
  if (layers.length === 0) return "";

  // Sort by priority (1 = highest)
  layers.sort((a, b) => a.priority - b.priority);

  let totalTokens = 0;
  const included: string[] = [];

  for (const layer of layers) {
    const layerTokens = estimateTokens(layer.text);
    if (totalTokens + layerTokens > MAX_GUIDANCE_TOKENS) {
      // Only drop layers 3-5
      if (layer.priority >= 3) continue;
    }
    included.push(layer.text);
    totalTokens += layerTokens;
  }

  if (included.length === 0) return "";

  return "\n\nField-level guidance:\n" + included.join("\n\n");
}

// ─── Internal Helpers ─────────────────────────────────────────────────

/**
 * Walk all component schemas in a dereferenced root schema,
 * calling the callback for each component with its properties.
 */
function walkComponentSchemas(
  derefSchema: Record<string, any>,
  validationRules: ValidationRules,
  callback: (componentName: string, properties: Record<string, any>) => void
): void {
  const rootProps = derefSchema.properties || {};

  // Walk root array items (e.g. section)
  for (const [_key, value] of Object.entries<any>(rootProps)) {
    if (
      value?.type === "array" &&
      value?.items &&
      typeof value.items === "object"
    ) {
      // The items schema may be the section itself
      const itemProps = value.items.properties || {};

      // Extract component name from section-level
      const sectionName = extractName(value.items);
      if (sectionName && itemProps) {
        callback(sectionName, itemProps);
      }

      // Walk into sub-component slots (e.g. section.components)
      for (const [_slotKey, slotValue] of Object.entries<any>(itemProps)) {
        if (slotValue?.type === "array" && slotValue?.items) {
          const items = slotValue.items;

          if (items.anyOf && Array.isArray(items.anyOf)) {
            // Polymorphic slot — each anyOf variant is a component
            for (const variant of items.anyOf) {
              const name = extractName(variant);
              if (name && variant.properties) {
                callback(name, variant.properties);

                // Also recurse into sub-component arrays within this component
                for (const [_subKey, subValue] of Object.entries<any>(
                  variant.properties
                )) {
                  if (subValue?.type === "array" && subValue?.items) {
                    if (
                      subValue.items.anyOf &&
                      Array.isArray(subValue.items.anyOf)
                    ) {
                      for (const subVariant of subValue.items.anyOf) {
                        const subName = extractName(subVariant);
                        if (subName && subVariant.properties) {
                          callback(subName, subVariant.properties);
                        }
                      }
                    } else if (subValue.items.properties) {
                      const subName = extractName(subValue.items);
                      if (subName) {
                        callback(subName, subValue.items.properties);
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

/**
 * Extract component name from a schema node.
 */
function extractName(schema: Record<string, any>): string | null {
  if (!schema || typeof schema !== "object") return null;

  // Check type.const
  const typeConst = schema.properties?.type?.const;
  if (typeof typeConst === "string") return typeConst;

  // Check $id
  if (typeof schema.$id === "string") {
    const name = schema.$id.split("/").pop()?.split(".").shift();
    if (name) return name;
  }

  return null;
}
