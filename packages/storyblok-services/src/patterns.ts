/**
 * Content pattern analysis for Storyblok spaces.
 *
 * Analyzes published stories to extract structural patterns —
 * component frequency, section sequences, sub-component item counts,
 * and page archetypes. Used for AI-guided content generation to
 * produce site-consistent content.
 *
 * Pure functions — no framework dependencies beyond `storyblok-js-client`.
 */

import type StoryblokClient from "storyblok-js-client";
import { listStories } from "./stories.js";
import type { ValidationRules } from "./validate.js";
import {
  discoverStylisticFields,
  discoverPresenceFields,
  computeFieldDistribution,
  pruneFieldProfiles,
  type StylisticFieldSpec,
  type PresenceFieldSpec,
  type FieldProfile,
  type FieldProfileContext,
} from "./guidance.js";

// ─── Types ────────────────────────────────────────────────────────────

interface ComponentFrequency {
  component: string;
  count: number;
  percentage: number;
}

interface SequenceBigram {
  from: string;
  to: string;
  count: number;
}

interface SectionComposition {
  components: string[];
  count: number;
}

export interface SubComponentStats {
  median: number;
  min: number;
  max: number;
  samples: number;
}

interface PageArchetype {
  pattern: string[];
  count: number;
  exampleSlug: string;
}

export interface ContentPatternAnalysis {
  totalStoriesAnalyzed: number;
  componentFrequency: ComponentFrequency[];
  commonSequences: SequenceBigram[];
  sectionCompositions: SectionComposition[];
  subComponentCounts: Record<string, SubComponentStats>;
  pageArchetypes: PageArchetype[];
  unusedComponents: string[];
  /** Field value distributions (empty when derefSchema not provided). */
  fieldProfiles: FieldProfile[];
}

export interface AnalyzeContentPatternsOptions {
  contentType?: string;
  startsWith?: string;
  /**
   * Fully dereferenced root schema. When provided, field-level profiles
   * are extracted alongside structural patterns.
   */
  derefSchema?: Record<string, any>;
}

// ─── Main function ────────────────────────────────────────────────────

/**
 * Analyzes published stories to extract structural patterns.
 *
 * Iterates all published stories (paginated) and computes:
 * - Component frequency (how often each section component appears)
 * - Common section sequences (which sections tend to follow others)
 * - Section compositions (which components are grouped together)
 * - Sub-component item counts (e.g. median number of FAQ items)
 * - Page archetypes (recurring full-page patterns)
 * - Unused components (components defined in schema but never used)
 *
 * @param client - Content Delivery API client
 * @param validationRules - Schema-derived validation rules (provides rootArrayFields, subComponentMap, allKnownComponents)
 * @param options - Optional contentType and startsWith filters
 */
export async function analyzeContentPatterns(
  client: StoryblokClient,
  validationRules: ValidationRules,
  options: AnalyzeContentPatternsOptions = {}
): Promise<ContentPatternAnalysis> {
  // ── 1. Fetch all stories with pagination ─────────────────────────
  const allStories: Record<string, any>[] = [];
  let page = 1;
  const perPage = 100;
  let total = Infinity;

  while (allStories.length < total) {
    const result = await listStories(client, {
      page,
      perPage,
      contentType: options.contentType || "page",
      startsWith: options.startsWith,
    });

    allStories.push(...result.stories);
    total = result.total;
    page++;

    if (result.stories.length === 0) break;
  }

  // ── 2. Extract section structures ────────────────────────────────
  const componentCounts = new Map<string, number>();
  const sequenceCounts = new Map<string, number>();
  const compositionCounts = new Map<
    string,
    { components: string[]; count: number }
  >();
  const subItemCounts = new Map<string, number[]>();
  const pagePatterns = new Map<
    string,
    { pattern: string[]; count: number; exampleSlug: string }
  >();

  const rootFields = validationRules.rootArrayFields;

  // ── Field tracking setup ─────────────────────────────────────────
  // Only active when derefSchema is provided
  const stylisticFields: Map<string, StylisticFieldSpec[]> = options.derefSchema
    ? discoverStylisticFields(options.derefSchema, validationRules)
    : new Map();
  const presenceFields: Map<string, PresenceFieldSpec[]> = options.derefSchema
    ? discoverPresenceFields(options.derefSchema, validationRules)
    : new Map();
  const hasFieldTracking = stylisticFields.size > 0;

  // Accumulators: Map<accKey, Map<field, Map<value, count>>>
  // accKey format: "componentType" (Dim 1), "componentType|contains:child" (Dim 2A),
  //   "componentType|containedIn:parent.field=value" (Dim 2B), "componentType|position:pos" (Dim 3)
  type FieldAccumulators = Map<string, Map<string, Map<string, number>>>;
  const fieldAccumulators: FieldAccumulators = new Map();
  const fieldSampleCounts = new Map<string, number>();

  /** Record a field value into an accumulator bucket. */
  function trackField(accKey: string, field: string, value: string): void {
    let fieldMap = fieldAccumulators.get(accKey);
    if (!fieldMap) {
      fieldMap = new Map();
      fieldAccumulators.set(accKey, fieldMap);
    }
    let valueMap = fieldMap.get(field);
    if (!valueMap) {
      valueMap = new Map();
      fieldMap.set(field, valueMap);
    }
    valueMap.set(value, (valueMap.get(value) || 0) + 1);
  }

  /** Increment sample count for an accumulator key. */
  function trackSample(accKey: string): void {
    fieldSampleCounts.set(accKey, (fieldSampleCounts.get(accKey) || 0) + 1);
  }

  /**
   * Track all stylistic and presence fields for a component node.
   */
  function trackComponentFields(
    accKey: string,
    componentType: string,
    node: Record<string, any>
  ): void {
    const sFields = stylisticFields.get(componentType) || [];
    for (const spec of sFields) {
      const rawValue = node[spec.field];
      // Skip tracking when the value is absent from the content node.
      // Absent values should not be counted as the schema default —
      // only explicitly-set values inform the guidance distribution.
      if (rawValue === undefined || rawValue === null) continue;
      trackField(accKey, spec.field, String(rawValue));
    }

    const pFields = presenceFields.get(componentType) || [];
    for (const pSpec of pFields) {
      let presence: string;
      if (pSpec.type === "array-presence") {
        presence =
          Array.isArray(node[pSpec.field]) && node[pSpec.field].length > 0
            ? "non-empty"
            : "empty";
      } else {
        presence =
          typeof node[pSpec.field] === "string" &&
          node[pSpec.field].trim().length > 0
            ? "non-empty"
            : "empty";
      }
      trackField(accKey, pSpec.field, presence);
    }
  }

  for (const story of allStories) {
    const allSectionTypes: string[][] = [];

    for (const rootField of rootFields) {
      const items: Record<string, any>[] = story.content?.[rootField] || [];
      if (items.length === 0) continue;

      for (const item of items) {
        const components: Record<string, any>[] = item.components || [];
        const componentTypes: string[] = [];

        if (components.length === 0) {
          const type = item.component || item.type;
          if (typeof type === "string") {
            componentTypes.push(type);
            componentCounts.set(type, (componentCounts.get(type) || 0) + 1);
          }
        }

        for (const comp of components) {
          const type = comp.component || comp.type;
          if (typeof type === "string") {
            componentTypes.push(type);
            componentCounts.set(type, (componentCounts.get(type) || 0) + 1);

            // Track sub-component item counts
            for (const [parentType, childKey] of Object.entries(
              validationRules.subComponentMap
            )) {
              if (type === parentType && Array.isArray(comp[childKey])) {
                const key = `${parentType}.${childKey}`;
                const existing = subItemCounts.get(key) || [];
                existing.push(comp[childKey].length);
                subItemCounts.set(key, existing);
              }
            }
          }
        }

        allSectionTypes.push(componentTypes);

        // ── Field tracking (all 3 dimensions) ─────────────────────
        if (hasFieldTracking) {
          const sectionType = item.component || item.type;
          const itemIndex = items.indexOf(item);
          const position =
            itemIndex === 0
              ? "first"
              : itemIndex === items.length - 1
              ? "last"
              : "middle";

          if (typeof sectionType === "string") {
            // Dim 1: Context-free section profile
            const dim1Key = sectionType;
            trackComponentFields(dim1Key, sectionType, item);
            trackSample(dim1Key);

            // Dim 3: Positional section profile
            const dim3Key = `${sectionType}|position:${position}`;
            trackComponentFields(dim3Key, sectionType, item);
            trackSample(dim3Key);

            // Dim 2A: Section scoped by child component types
            const uniqueChildTypes = [...new Set(componentTypes)];
            for (const childType of uniqueChildTypes) {
              const dim2aKey = `${sectionType}|contains:${childType}`;
              trackComponentFields(dim2aKey, sectionType, item);
              trackSample(dim2aKey);
            }
          }

          // Dim 1: Context-free child component profiles
          for (const comp of components) {
            const childType = comp.component || comp.type;
            if (typeof childType === "string") {
              const childDim1Key = childType;
              trackComponentFields(childDim1Key, childType, comp);
              trackSample(childDim1Key);

              // Dim 2B: Child scoped by non-default section fields
              if (typeof sectionType === "string") {
                const sFields = stylisticFields.get(sectionType) || [];
                for (const sSpec of sFields) {
                  const sValue = item[sSpec.field];
                  // Skip absent container fields — only explicitly-set values
                  if (sValue === undefined || sValue === null) continue;
                  const sValStr = String(sValue);
                  // Only track non-default container settings
                  if (sSpec.defaultValue && sValStr !== sSpec.defaultValue) {
                    const dim2bKey = `${childType}|containedIn:${sectionType}.${sSpec.field}=${sValStr}`;
                    trackComponentFields(dim2bKey, childType, comp);
                    trackSample(dim2bKey);
                  }
                }
              }
            }
          }
        }

        if (componentTypes.length > 0) {
          const compositionKey = componentTypes.join(",");
          const existing = compositionCounts.get(compositionKey);
          if (existing) {
            existing.count++;
          } else {
            compositionCounts.set(compositionKey, {
              components: [...componentTypes],
              count: 1,
            });
          }
        }
      }
    }

    // Track section transition sequences
    const flatTypes = allSectionTypes.map(
      (types) => types.join("+") || "(empty)"
    );
    for (let i = 0; i < flatTypes.length - 1; i++) {
      const key = `${flatTypes[i]}→${flatTypes[i + 1]}`;
      sequenceCounts.set(key, (sequenceCounts.get(key) || 0) + 1);
    }

    // Track full-page patterns
    const pagePattern = flatTypes.filter((t) => t !== "(empty)");
    if (pagePattern.length > 0) {
      const patternKey = pagePattern.join(" | ");
      const existing = pagePatterns.get(patternKey);
      if (existing) {
        existing.count++;
      } else {
        pagePatterns.set(patternKey, {
          pattern: pagePattern,
          count: 1,
          exampleSlug: story.full_slug || story.slug || "",
        });
      }
    }
  }

  // ── 3. Compute statistics ────────────────────────────────────────
  const componentFrequency: ComponentFrequency[] = [
    ...componentCounts.entries(),
  ]
    .map(([component, count]) => ({
      component,
      count,
      percentage:
        allStories.length > 0
          ? Math.round((count / allStories.length) * 100)
          : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const commonSequences: SequenceBigram[] = [...sequenceCounts.entries()]
    .map(([key, count]) => {
      const [from, to] = key.split("→");
      return { from, to, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const sectionCompositions: SectionComposition[] = [
    ...compositionCounts.values(),
  ]
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const subComponentCountsResult: Record<string, SubComponentStats> = {};
  for (const [key, values] of subItemCounts) {
    if (values.length === 0) continue;
    const sorted = [...values].sort((a, b) => a - b);
    subComponentCountsResult[key] = {
      median: sorted[Math.floor(sorted.length / 2)],
      min: sorted[0],
      max: sorted[sorted.length - 1],
      samples: sorted.length,
    };
  }

  const pageArchetypes: PageArchetype[] = [...pagePatterns.values()]
    .filter((p) => p.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const usedComponents = new Set(componentCounts.keys());
  const unusedComponents = [...validationRules.allKnownComponents]
    .filter((c) => !usedComponents.has(c))
    .sort();

  // ── 4. Aggregate field profiles ──────────────────────────────────
  let fieldProfiles: FieldProfile[] = [];

  if (hasFieldTracking) {
    const rawProfiles: FieldProfile[] = [];

    for (const [accKey, fieldMap] of fieldAccumulators) {
      const samples = fieldSampleCounts.get(accKey) || 0;

      // Parse accKey to extract component + context
      const pipeIndex = accKey.indexOf("|");
      const component = pipeIndex === -1 ? accKey : accKey.slice(0, pipeIndex);
      const contextStr = pipeIndex === -1 ? null : accKey.slice(pipeIndex + 1);

      let context: FieldProfileContext = null;
      if (contextStr) {
        if (contextStr.startsWith("contains:")) {
          context = {
            type: "contains",
            childComponent: contextStr.slice("contains:".length),
          };
        } else if (contextStr.startsWith("containedIn:")) {
          const rest = contextStr.slice("containedIn:".length);
          const eqIndex = rest.indexOf("=");
          context = {
            type: "containedIn",
            containerField: rest.slice(0, eqIndex),
            containerValue: rest.slice(eqIndex + 1),
          };
        } else if (contextStr.startsWith("position:")) {
          context = {
            type: "position",
            position: contextStr.slice("position:".length) as
              | "first"
              | "middle"
              | "last",
          };
        }
      }

      // Build field distributions
      const fields: import("./guidance.js").FieldDistribution[] = [];
      for (const [field, valueMap] of fieldMap) {
        const valueCounts: Record<string, number> = {};
        for (const [v, c] of valueMap) {
          valueCounts[v] = c;
        }
        // Look up the default value for this field
        const allSpecs = stylisticFields.get(component) || [];
        const spec = allSpecs.find((s) => s.field === field);
        fields.push(
          computeFieldDistribution(field, valueCounts, spec?.defaultValue)
        );
      }

      rawProfiles.push({ component, context, fields, samples });
    }

    fieldProfiles = pruneFieldProfiles(rawProfiles);
  }

  return {
    totalStoriesAnalyzed: allStories.length,
    componentFrequency,
    commonSequences,
    sectionCompositions,
    subComponentCounts: subComponentCountsResult,
    pageArchetypes,
    unusedComponents,
    fieldProfiles,
  };
}
