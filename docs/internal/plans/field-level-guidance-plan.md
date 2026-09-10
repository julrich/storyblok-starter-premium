# Plan: Field-Level Compositional Guidance for Content Generation

> **Status: ✅ IMPLEMENTED** — This system is fully implemented across `storyblok-services`, `mcp-server`, and `n8n-nodes`. See [field-level-guidance-implementation.md](../checklists/field-level-guidance-implementation.md) for the implementation checklist.

## Problem Statement

The current content generation pipeline produces structurally valid content — components are placed in legal slots, sub-component counts are reasonable, and page sequences follow established patterns. However, **field-level decisions within and across components are often poor**:

| Problem                         | Example                                                                                                                                                                            | Root Cause                                                                                    |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Redundant fields**            | A section has `headline_text` set, but it wraps a hero that already has its own headline. The two headlines compete visually.                                                      | LLM doesn't know that section headline is redundant when the child component already has one. |
| **Competing CTAs**              | A section has `buttons` (section-level CTA), and its child `hero` or `cta` component also has `buttons`. Two CTA groups render on screen.                                          | LLM doesn't know that section-level buttons are for sections without component-level CTAs.    |
| **Random layout values**        | A section containing a single hero has `content_mode: "tile"` or `width: "narrow"` — settings that make no visual sense for that content.                                          | Enum fields have no contextual guidance. The LLM picks randomly from valid values.            |
| **Inconsistent spacing**        | `spaceBefore`, `spaceAfter`, and `headerSpacing` are set without awareness of page position or adjacent sections. First sections get `spaceBefore: "default"` instead of `"none"`. | The LLM has no positional context and no knowledge of spacing conventions.                    |
| **Off-brand component styling** | A hero uses `textPosition: "corner"` on a site where every other hero uses `textPosition: "left"`. Features use `layout: "list"` when the site always uses `layout: "largeTiles"`. | No awareness of the site's established visual patterns at the field level.                    |

These issues share a common trait: **the schema tells the LLM what's syntactically valid, but not what's semantically appropriate in context.** The gap exists at three levels:

1. **Component level** — How does this site typically configure this component's stylistic fields?
2. **Composition level** — How should container settings change based on what's inside, and vice versa?
3. **Position level** — How should settings differ based on where a section appears on the page?

## Goals

1. **Guide, don't dictate** — All guidance is soft (statistical patterns, natural language hints, enriched descriptions). The LLM can deviate when the user's intent calls for it.
2. **Schema-derived, not hardcoded** — Trackable fields are discovered from the JSON Schema, not maintained as a static list. Adding a new enum field to a component automatically includes it in tracking.
3. **Component-generic** — The system works for any component at any nesting depth, not just sections. Generating a standalone hero benefits from the same site-pattern awareness.
4. **Composition-aware** — The system captures bidirectional correlations: container settings given children, and child settings given container configuration.
5. **Statistically pruned** — Only patterns with sufficient sample size and clear statistical tendency are injected. Noise and low-confidence patterns are suppressed.
6. **Multi-surface** — Works identically across Claude Desktop (MCP), VS Code Copilot (MCP), and n8n workflows.
7. **Builds on existing infrastructure** — Extends `analyzeContentPatterns`, `generate_section`, section recipes, and `checkCompositionalQuality` rather than replacing them.

## Non-Goals

- Replacing the schema-level OpenAI structured output constraint system. The schema remains the hard boundary; this system provides soft guidance within those boundaries.
- Fully deterministic output. The system influences probability, not enforces exact values.
- Tracking content-level field distributions (free text, markdown, image URLs). Only stylistic/layout fields with finite value domains are tracked.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                    Content Generation Request                        │
│         (generate_section, generate_content, etc.)                   │
└──────────────────────┬───────────────────────────────────────────────┘
                       │
         ┌─────────────▼─────────────┐
         │   Guidance Assembly       │
         │                           │
         │  1. Field Profiles        │◄── analyzeContentPatterns()
         │     (Dimensions 1-3)      │    (extended with field tracking)
         │                           │
         │  2. Composition Hints     │◄── section-recipes.json
         │     (editorial intent)    │    (extended with compositionHints)
         │                           │
         │  3. Schema Annotations    │◄── prepareSchemaForOpenAi()
         │     (in-band guidance)    │    (enriched descriptions)
         │                           │
         └─────────────┬─────────────┘
                       │
         ┌─────────────▼─────────────┐
         │   System Prompt           │
         │   (statistical +          │
         │    editorial guidance)    │
         └─────────────┬─────────────┘
                       │
         ┌─────────────▼─────────────┐
         │   OpenAI Structured       │
         │   Output (schema +        │
         │   enriched descriptions)  │
         └─────────────┬─────────────┘
                       │
         ┌─────────────▼─────────────┐
         │   Post-Generation         │
         │   Quality Warnings        │◄── checkCompositionalQuality()
         │   (extended with          │    (extended with field checks)
         │    field-level checks)    │
         └─────────────┬─────────────┘
                       │
         ┌─────────────▼─────────────┐
         │   Result to consumer      │
         │   (MCP / n8n / etc.)      │
         └───────────────────────────┘
```

---

## Design: Three Dimensions of Field Guidance

### Dimension 1: Component Field Profiles (context-free)

**Question answered:** "How does this site typically configure this component's stylistic fields?"

For every component type observed in published stories, we track the distribution of values for each stylistic field (enums, booleans). This is context-free — it captures the site-wide baseline regardless of where the component appears.

**Example output:**

```
hero:
  textPosition: { "left": 70%, "center": 20%, "below": 10% }  (14 samples)
  height:       { "default": 60%, "fullImage": 30%, "fullScreen": 10% }  (14 samples)
  textbox:      { "true": 85%, "false": 15% }  (14 samples)

features:
  layout: { "largeTiles": 55%, "smallTiles": 35%, "list": 10% }  (11 samples)
  style:  { "stack": 70%, "centered": 20%, "intext": 10% }  (11 samples)

section:
  width:        { "default": 65%, "full": 25%, "narrow": 10% }  (48 samples)
  content_mode: { "default": 55%, "tile": 30%, "list": 10%, "slider": 5% }  (48 samples)
```

**Use case:** When generating a standalone hero (no section context), the system prompt includes: "On this site, heroes typically use `textPosition: left` (70%) and `height: default` (60%)."

### Dimension 2: Container↔Content Correlation (bidirectional)

**Question answered:** "How do container settings change based on what's inside, and how do component settings change based on their container?"

This captures correlations between a container's stylistic fields and the component types it contains (and vice versa). It operates in two directions:

#### Direction A: Container settings given children

"How is a section configured when it contains a hero?"

```
section[contains: hero]:
  spaceBefore:    { "none": 85%, "default": 15% }  (12 samples)
  width:          { "full": 70%, "default": 25%, "max": 5% }  (12 samples)
  headline_text:  { "": 90%, "<non-empty>": 10% }  (12 samples)   ← presence tracking
  buttons:        { "empty": 95%, "non-empty": 5% }  (12 samples) ← presence tracking

section[contains: features]:
  content_mode:   { "tile": 75%, "default": 25% }  (9 samples)
  content_width:  { "default": 80%, "wide": 20% }  (9 samples)

section[contains: cta]:
  buttons:        { "empty": 100% }  (6 samples)
  headline_text:  { "": 83%, "<non-empty>": 17% }  (6 samples)
```

#### Direction B: Component settings given container context

"How does a hero configure its fields when inside a section with `content_mode: slider`?"

```
hero[in section where width=full]:
  height: { "fullImage": 60%, "fullScreen": 30%, "default": 10% }  (8 samples)

features[in section where content_mode=tile]:
  layout: { "smallTiles": 80%, "largeTiles": 20% }  (6 samples)
```

**Use case:** When generating a section containing a hero, the system prompt includes both the composition hints (editorial: "omit section headline when hero has one") and the field profile (statistical: "90% of sections containing a hero omit the section headline").

#### Presence tracking for content-bearing fields

Some fields sit at the boundary of "stylistic" and "content." The section `headline_text` is a free-text field, but _whether it's populated or empty_ is a stylistic/compositional decision. Similarly, _whether `buttons` is empty or non-empty_ matters.

For these boundary fields, we track **presence** (empty vs. non-empty) rather than specific values. This is a small set of known field patterns:

- String fields that serve as optional headers: track `"" | "<non-empty>"`
- Array fields that serve as optional CTA groups: track `"empty" | "non-empty"`

### Dimension 3: Positional Context

**Question answered:** "How do settings differ based on where a section appears on the page?"

Section position on the page has strong conventions, particularly for `spaceBefore`, `spaceAfter`, and `headerSpacing`. This dimension tracks field distributions scoped by position.

**Positions:**

| Position | Definition                           |
| -------- | ------------------------------------ |
| `first`  | Index 0 in the root section array    |
| `last`   | Last index in the root section array |
| `middle` | Any other index                      |

**Example output:**

```
section[position: first]:
  spaceBefore:    { "none": 90%, "default": 10% }  (22 samples)
  headerSpacing:  { "true": 65%, "false": 35% }  (22 samples)

section[position: last]:
  spaceAfter:     { "none": 60%, "default": 35%, "small": 5% }  (22 samples)
```

**Pruning is critical here.** Position context is only injected when:

1. **Sufficient samples** (≥ 3 instances of this position observed).
2. **Clear statistical tendency** (dominant value > 65%).
3. **Differs from the context-free baseline.** If sections at position `first` have the same `spaceBefore` distribution as all sections, the positional context adds no signal and is suppressed.

Without this pruning, the LLM would receive positional guidance for every field, most of which would be noise (e.g., "sections in the middle use `width: default` 65% of the time" — which is the same as the global baseline).

---

## Data Model

### Stylistic Field Discovery

Rather than maintaining a hardcoded list of which fields are "stylistic," the system discovers them from the dereferenced JSON Schema:

```typescript
/**
 * A field is "stylistic" (trackable) if it has a finite, known value domain:
 * - type: "string" with an "enum" array → track which enum value is used
 * - type: "boolean" → track true/false distribution
 *
 * A field is excluded from tracking if:
 * - It's a free-text string (no enum) → unbounded domain
 * - It's an image/asset URL (format: "image" | "video") → content
 * - It's a nested object with sub-properties → tracked at sub-field level
 * - It's a sub-component array (anyOf items) → tracked by existing patterns
 */
interface StylisticFieldSpec {
  field: string; // e.g. "textPosition", "content_mode"
  type: "enum" | "boolean";
  values?: string[]; // enum values, if applicable
  defaultValue?: string; // schema default, if any
}
```

**Presence fields** are an additional, small set of fields that are content-bearing but where empty-vs-populated is compositionally significant:

```typescript
/**
 * Fields where presence (empty vs non-empty) matters compositionally.
 * Discovered heuristically:
 * - String fields with "markdown" format or "headline"/"sub" in the name
 * - Array fields that hold buttons/CTAs
 *
 * These use a binary distribution: "" vs "<non-empty>" (strings)
 * or "empty" vs "non-empty" (arrays).
 */
interface PresenceFieldSpec {
  field: string; // e.g. "headline_text", "buttons"
  type: "string-presence" | "array-presence";
}
```

### Field Distribution

```typescript
/** Distribution of observed values for a single field. */
interface FieldDistribution {
  field: string; // e.g. "textPosition"
  values: Record<string, number>; // value → count
  total: number; // sum of counts
  dominantValue: string; // most common value
  dominantPct: number; // percentage of dominant value (0-100)
  isDefault: boolean; // whether dominant value matches schema default
}
```

### Field Profile (scoped)

```typescript
/**
 * Field distributions for a component, optionally scoped by context.
 *
 * Without context: "How does this site use hero's textPosition?"
 * With context: "How does this site use hero's textPosition when it's
 * inside a section where width=full?"
 */
interface FieldProfile {
  component: string; // e.g. "section", "hero", "features"
  context?: FieldProfileContext; // undefined = context-free (Dimension 1)
  fields: FieldDistribution[]; // distributions for tracked fields
  samples: number; // instances that contributed
}

type FieldProfileContext =
  | { type: "contains"; components: string[] } // Dimension 2A
  | {
      type: "containedIn";
      container: string; // Dimension 2B
      containerField: string;
      containerValue: string;
    }
  | { type: "position"; position: "first" | "last" | "middle" }; // Dimension 3
```

### Complete Analysis Extension

The existing `ContentPatternAnalysis` is extended with a new field:

```typescript
interface ContentPatternAnalysis {
  // ... existing fields ...
  totalStoriesAnalyzed: number;
  componentFrequency: ComponentFrequency[];
  commonSequences: SequenceBigram[];
  sectionCompositions: SectionComposition[];
  subComponentCounts: Record<string, SubComponentStats>;
  pageArchetypes: PageArchetype[];
  unusedComponents: string[];

  // NEW: field-level profiles
  fieldProfiles: FieldProfile[];
}
```

---

## Pruning Rules

Field profiles can grow large. Aggressive but principled pruning keeps the data useful:

| Rule                             | Threshold                                                                                                                     | Rationale                                                                                                                                                                                                                                                             |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Minimum samples**              | ≥ 3 instances                                                                                                                 | Fewer than 3 observations is anecdotal, not a pattern.                                                                                                                                                                                                                |
| **Dominance threshold**          | Dominant value > 60%                                                                                                          | If values are evenly distributed, there's no clear guidance to give. The LLM is better off choosing freely.                                                                                                                                                           |
| **Skip default-only**            | Drop if dominant value = schema default AND dominance > 95%                                                                   | If a field is almost always at its default, the LLM will pick the default anyway. No guidance needed.                                                                                                                                                                 |
| **Positional delta**             | Drop positional profiles that don't differ from context-free baseline                                                         | If `section[position: first].width` has the same distribution as `section.width`, the positional context adds no signal. Only include when the positional distribution meaningfully differs (dominant value differs, or dominance differs by > 15 percentage points). |
| **Top-N scoped profiles**        | Keep at most 15 composition profiles (Dim 2A) and 10 containedIn profiles (Dim 2B) per component type, ranked by sample count | Prevents combinatorial explosion. Rare compositions with 1–2 samples are noise.                                                                                                                                                                                       |
| **Non-default container filter** | For Dimension 2B, only track when the container field has a non-default value                                                 | If the section's `content_mode` is the default `"default"`, there's no interesting correlation to capture. The context-free profile already covers that case.                                                                                                         |

---

## Composition Hints (Section Recipes Extension)

In addition to statistical profiles, each recipe in `section-recipes.json` gains an optional `compositionHints` property providing **editorial intent** — the _why_ behind the pattern:

```jsonc
{
  "name": "Hero with CTA",
  "components": ["hero"],
  // ... existing fields ...
  "compositionHints": {
    "section": {
      "headline": "Omit the section headline (headline_text) when the hero already has its own headline. Only use the section headline for a brief category label above the hero (rare).",
      "buttons": "Do not use section-level buttons when the hero already has CTA buttons. Double CTAs confuse the user about what to click.",
      "spaceBefore": "Use 'none' for the first section on a page (hero sections are typically first). Use 'default' when the hero is not the first section.",
      "spaceAfter": "Use 'default' for most cases. Use 'small' only when the next section is visually tightly coupled (e.g. a logos bar directly under the hero).",
      "headerSpacing": "Set to true only when the page has a transparent/floating header that overlaps this section. When in doubt, check position: if this is the first section, consider true.",
      "width": "Use 'full' for full-bleed heroes with background images. Use 'default' for contained heroes without background imagery.",
      "content_mode": "Always use 'default' for hero sections. Heroes are single-component — 'tile', 'list', 'slider' modes are not meaningful."
    },
    "hero": {
      "height": "Use 'fullImage' or 'fullScreen' when the section is full-width with a strong background image. Use 'default' for text-focused heroes.",
      "textbox": "Use true (default) for heroes with background images — it ensures text readability. Only set false when text has sufficient contrast without the textbox."
    }
  }
}
```

### How hints interact with field profiles

In the system prompt, editorial hints provide the _reason_, statistical profiles provide the _evidence_:

```
Best practices (editorial):
  Omit the section headline when the hero already has its own headline.

Site patterns (statistical):
  On this site, 90% of sections containing a hero omit the section headline (12 samples).
  Sections with heroes use spaceBefore: "none" 85% of the time.

Component patterns:
  Heroes on this site typically use textPosition: "left" (70%, 14 samples)
  and height: "default" (60%, 14 samples).
```

This combination is powerful because:

- **Hints alone** might be ignored by the LLM ("just a suggestion").
- **Statistics alone** lack explanation ("why does this matter?").
- **Together** they create a compelling case: "Here's what to do, here's why, and here's proof that this site does it."

---

## Post-Generation Quality Warnings (Extension)

The existing `checkCompositionalQuality()` function is extended with field-level composition checks. These are **corrective, not preventive** — they surface after generation and give the consuming LLM (or n8n workflow) a chance to fix issues.

### New Warning Types

```typescript
// Redundant section headline
{
  level: "suggestion",
  message: "Section has headline_text but contains a hero which has its own headline. Consider removing the section headline.",
  path: "section[0].headline_text",
  suggestion: "Clear the section headline to avoid visual competition with the hero's headline."
}

// Competing CTAs
{
  level: "suggestion",
  message: "Section has buttons but its child hero also has buttons. Two CTA groups will render.",
  path: "section[0].buttons",
  suggestion: "Remove section-level buttons when the child component already has CTAs."
}

// Inappropriate content mode
{
  level: "info",
  message: "Section uses content_mode 'tile' but contains only 1 component. Tile mode is designed for multiple items.",
  path: "section[2].content_mode",
  suggestion: "Use content_mode 'default' for single-component sections."
}

// Spacing anomaly
{
  level: "info",
  message: "First section has spaceBefore 'default'. The first section typically uses 'none' to align with the page top.",
  path: "section[0].spaceBefore",
  suggestion: "Consider setting spaceBefore to 'none' for the opening section."
}
```

### Warning discovery from field profiles

Some warnings can be auto-generated from the field profiles themselves. If a section `[contains: hero]` has `headline_text` present 95% as empty across 12+ samples, and the generated section has it non-empty, that's a divergence worth flagging:

```typescript
// Auto-warning: generated value diverges from strong site pattern
{
  level: "info",
  message: "Section headline is set, but 90% of sections containing a hero on this site omit it (12 samples).",
  path: "section[0].headline_text",
  suggestion: "This diverges from the site's established pattern. Intentional?"
}
```

The threshold for auto-warnings should be high (> 85% dominance, ≥ 5 samples) to avoid false positives.

---

## Schema Description Enrichment

As a complementary in-band strategy, the `prepareSchemaForOpenAi()` function is extended to enrich field descriptions with contextual guidance. This puts guidance directly into the schema that OpenAI sees, rather than only in the system prompt.

### Currently dropped fields

`DEFAULT_PROPERTIES_TO_DROP` currently removes these from the schema entirely:

```typescript
[
  "backgroundColor",
  "backgroundImage",
  "spotlight",
  "textColor",
  "spaceBefore",
  "spaceAfter",
  "variant",
];
```

### Proposed split

| Category                                     | Fields                                                         | Treatment                             |
| -------------------------------------------- | -------------------------------------------------------------- | ------------------------------------- |
| **Drop** (truly layout-only, editor-curated) | `backgroundColor`, `backgroundImage`, `spotlight`, `textColor` | Keep removing from schema             |
| **Annotate** (LLM can make informed choices) | `spaceBefore`, `spaceAfter`, `variant`                         | Keep in schema but enrich description |

Additionally, existing fields that stay in the schema but lack contextual descriptions get enriched:

```typescript
const FIELD_ANNOTATIONS: Record<string, string> = {
  spaceBefore:
    "Spacing before this section. Use 'none' for the first section on a page, 'default' for most sections, 'small' when tightly coupled with the previous section.",
  spaceAfter:
    "Spacing after this section. Use 'default' for most sections, 'small' when the next section is visually related, 'none' rarely.",
  headerSpacing:
    "Extra top spacing for a floating/transparent header. Only true on the first section of a page, and only when the header overlays content.",
  width:
    "Section width. 'default' for most content. 'full' for full-bleed heroes or visual sections. 'narrow' for focused text content.",
  content_mode:
    "Content layout mode. 'default' for single-component or standard layout. 'tile' for multi-item grids (features, cards). 'list' for vertically stacked diverse items. 'slider' only with 3+ items.",
  content_tileWidth:
    "Min-width for grid tiles. Only meaningful when content_mode is 'tile'. 'default' for most grids.",
};
```

These annotations are injected during a new schema traversal pass, enriching the `description` property of matching fields. The LLM sees this guidance inline with the schema, in addition to the system prompt context.

---

## Extraction Algorithm

The field profile extraction integrates into the existing `analyzeContentPatterns()` function. The inner loop is extended to track field values alongside the existing structural tracking.

### Inputs

- Published stories (already fetched by `analyzeContentPatterns`)
- `ValidationRules` (provides `allKnownComponents`, `subComponentMap`, `rootArrayFields`, `containerSlots`)
- Dereferenced page schema (provides field type information for stylistic field discovery)

### Pseudocode

```
// Pre-computation: discover which fields are stylistic per component type
stylisticFields = discoverStylisticFields(derefSchema, validationRules)
presenceFields  = discoverPresenceFields(derefSchema, validationRules)

// Accumulators
contextFreeProfiles  = Map<componentType, Map<field, Map<value, count>>>
containsProfiles     = Map<compositionKey, Map<field, Map<value, count>>>
containedInProfiles  = Map<correlationKey, Map<field, Map<value, count>>>
positionProfiles     = Map<positionKey, Map<field, Map<value, count>>>

For each story:
  For each rootField (e.g. "section"):
    items = story.content[rootField]

    For each item at index i:
      sectionType = item.component
      childTypes  = (item.components || []).map(c => c.component).filter(Boolean)
      position    = i === 0 ? "first" : i === items.length - 1 ? "last" : "middle"

      // ─── Dimension 1: Context-free section profile ───────────
      For each stylisticField of sectionType:
        value = item[field] ?? defaultValue
        contextFreeProfiles[sectionType][field][value]++

      For each presenceField of sectionType:
        presence = isEmpty(item[field]) ? "empty" : "non-empty"
        contextFreeProfiles[sectionType][field][presence]++

      // ─── Dimension 1: Context-free child component profiles ──
      For each child in item.components:
        childType = child.component
        For each stylisticField of childType:
          value = child[field] ?? defaultValue
          contextFreeProfiles[childType][field][value]++

      // ─── Dimension 2A: Container scoped by children ──────────
      For each unique childType in childTypes:
        key = "contains:" + childType
        For each stylisticField of sectionType:
          value = item[field] ?? defaultValue
          containsProfiles[sectionType + "|" + key][field][value]++
        For each presenceField of sectionType:
          presence = isEmpty(item[field]) ? "empty" : "non-empty"
          containsProfiles[sectionType + "|" + key][field][presence]++

      // ─── Dimension 2B: Component scoped by container settings ─
      For each child in item.components:
        childType = child.component
        For each stylisticField of sectionType:
          sectionValue = item[sField] ?? defaultValue
          if sectionValue !== defaultValue:  // Only track non-default container settings
            corrKey = childType + "|containedIn:" + sectionType + "." + sField + "=" + sectionValue
            For each stylisticField of childType:
              value = child[field] ?? defaultValue
              containedInProfiles[corrKey][field][value]++

      // ─── Dimension 3: Positional context ─────────────────────
      posKey = sectionType + "|position:" + position
      For each stylisticField of sectionType:
        value = item[field] ?? defaultValue
        positionProfiles[posKey][field][value]++

// ─── Aggregate and prune ──────────────────────────────────────────
Apply pruning rules (min samples, dominance threshold, etc.)
Convert accumulators into FieldProfile[] array
```

### Complexity

The extraction adds a constant-factor overhead per story item (proportional to the number of stylistic fields × children). Since stylistic fields are typically 5–20 per component, and most sections have 1–3 children, this is O(stories × sections × fields) which is negligible compared to the existing API-bound pagination loop.

---

## Prompt Assembly

When `generate_section` (or `generate_content` with `componentType`) is called, the guidance is assembled into the system prompt in layers:

### Layer 1: Editorial hints (from recipes)

```
Component best practices:
- Omit the section headline when the hero already has its own headline.
- Do not use section-level buttons when the hero already has CTA buttons.
- Use content_mode 'default' for single-component hero sections.
```

### Layer 2: Composition profile (Dimension 2A — statistical)

```
Site patterns for sections containing "hero" (12 samples):
- spaceBefore: "none" 85%, "default" 15%
- width: "full" 70%, "default" 25%
- headline: omitted 90%
- buttons: omitted 95%
```

### Layer 3: Component profile (Dimension 1 — statistical)

```
Site patterns for "hero" components (14 samples):
- textPosition: "left" 70%, "center" 20%
- height: "default" 60%, "fullImage" 30%
```

### Layer 4: Positional context (Dimension 3 — when applicable)

```
Positional context (this is the first section on the page):
- spaceBefore: "none" 90% of first sections
- headerSpacing: "true" 65% of first sections
```

### Layer 5: Container-scoped component profile (Dimension 2B — when applicable)

Only included if the section context provides relevant non-default settings:

```
Context: this hero is inside a section with width "full":
- height: "fullImage" 60%, "fullScreen" 30% (vs. site-wide "default" 60%)
```

### Prompt size management

Each layer is conditionally included:

- **Layer 1** always included when a matching recipe exists.
- **Layers 2–5** only included when they survive pruning (sufficient samples + clear tendency).
- **Layer 5** only included when the section context has non-default stylistic fields.

As a safety valve, the total guidance section is capped at ~800 tokens. If the assembled guidance exceeds this, lower-priority layers (5, then 4, then 3) are truncated. Layers 1 and 2 are always kept because they provide the most impactful guidance.

---

## Integration Points

### 1. `storyblok-services/src/patterns.ts` — Extended analysis

The `analyzeContentPatterns()` function is extended to:

- Accept the dereferenced schema as an additional parameter (for stylistic field discovery)
- Run the field extraction algorithm alongside existing structural tracking
- Return `fieldProfiles: FieldProfile[]` on the analysis result

The schema parameter is optional for backward compatibility — when omitted, field profiles are simply empty.

### 2. `section-recipes.json` — Composition hints

Each recipe gains an optional `compositionHints` object. This is static editorial knowledge, not derived from analysis.

### 3. `storyblok-services/src/schema.ts` — Schema annotations

A new traversal pass (`annotateFieldDescriptions`) enriches field descriptions. The `FIELD_ANNOTATIONS` map is applied during `prepareSchemaForOpenAi()`.

The `DEFAULT_PROPERTIES_TO_DROP` list is split: `spaceBefore` and `spaceAfter` are moved to an "annotate" list instead of being dropped.

### 4. `storyblok-mcp/src/index.ts` — Prompt assembly

The `generate_section` handler is extended to:

- Query field profiles from `cachedPatterns` for the relevant component type and composition
- Look up composition hints from recipes
- Assemble the layered system prompt

### 5. `storyblok-services/src/validate.ts` — Quality warnings

`checkCompositionalQuality()` is extended with field-level composition checks (redundant headlines, competing CTAs, inappropriate modes, spacing anomalies).

### 6. `n8n-nodes` — Parallel changes

The n8n node's `generateSection` operation receives the same prompt assembly logic. Since both MCP and n8n call the same shared `generateAndPrepareContent()` pipeline, the main change is in prompt construction, which happens before the pipeline call.

The n8n node also gains compositional quality warnings (currently absent), returned in the `_meta` output for downstream workflow processing.

---

## Consumer Integration: Claude Desktop, VS Code, n8n

### Claude Desktop (MCP over stdio)

**How it works today:**

1. User says: "Create a product landing page for our AI feature"
2. Claude calls `plan_page(intent: "product landing page for AI feature")`
3. Claude calls `generate_section(componentType: "hero", prompt: "...", previousSection: null, nextSection: "features")` for each planned section
4. Claude calls `create_page_with_content(sections: [...])` to assemble

**What changes:**

- Step 3 produces better results because `generate_section` injects field-level guidance into its system prompt before calling OpenAI.
- Step 4 returns compositional quality warnings. Claude sees these and can decide to regenerate or adjust.
- The user sees no workflow change — the improvement is transparent.

**Interaction with warnings:**
Claude Desktop sees warnings in the `create_page_with_content` response:

```json
{
  "success": true,
  "warnings": [
    {
      "level": "suggestion",
      "message": "Section 0 has headline_text but contains a hero..."
    }
  ]
}
```

Claude can then decide to call `update_story` to fix the issue, or mention it to the user. This is a soft feedback loop — Claude is not forced to act on warnings.

### VS Code with Copilot (MCP over stdio)

**Identical to Claude Desktop.** The MCP server is the same — VS Code's Copilot agent talks to it via the same stdio transport. The field-level guidance is injected server-side, so Copilot benefits automatically.

**Additional VS Code advantage:** When the user is editing content JSON directly in VS Code (e.g. reviewing generated sections), the warnings can be surfaced as inline comments or suggestions in the Copilot chat, giving the user visibility into quality issues.

### n8n Workflows (shared services library)

**How it works today:**

1. An n8n workflow triggers the "Generate Section" operation with `componentType`, `prompt`, `previousSection`, `nextSection`
2. The n8n node calls `generateAndPrepareContent()` via the shared pipeline
3. The result flows to the next n8n node (e.g. "Create Page" operation)

**What changes:**

#### Prompt assembly in the n8n node

The n8n node's `generateSection` handler is extended with the same prompt assembly logic used by the MCP server. Since both consume the same shared services, the implementation is:

1. **Field profiles** are extracted by calling `analyzeContentPatterns()` (with the schema parameter) — either cached at workflow start or fetched on-demand. The n8n node can cache patterns per execution or use a workflow-level cache node.

2. **Composition hints** are looked up from the embedded `section-recipes.json` (already loaded by the n8n node).

3. The assembled guidance is prepended to the `system` prompt before calling the pipeline.

#### Quality warnings in the n8n node

The n8n node's write operations (`createPage`, `update`) gain compositional quality warnings in their output:

```json
{
  "json": {
    "success": true,
    "story": { ... },
    "_meta": {
      "warnings": [
        { "level": "suggestion", "message": "..." }
      ]
    }
  }
}
```

Downstream n8n nodes can:

- **Branch on warnings** — Use an IF node to check `$json._meta.warnings.length > 0` and route to a regeneration loop.
- **Filter by severity** — Only act on `"warning"` level, ignore `"info"` and `"suggestion"`.
- **Log for audit** — Send warnings to a spreadsheet or Slack channel for human review.
- **Auto-fix** — Use a Code node to apply simple fixes (clear `headline_text` when flagged as redundant) and feed back into an Update Story node.

#### Shared prompt assembly function

To avoid duplicating prompt assembly logic between MCP and n8n, a new shared function is added to `storyblok-services`:

```typescript
/**
 * Assemble field-level guidance for a content generation prompt.
 *
 * Combines editorial composition hints, statistical field profiles,
 * and positional context into a structured guidance block for
 * injection into a system prompt.
 *
 * Used by both the MCP server's generate_section handler and the
 * n8n node's generateSection operation.
 */
export function assembleFieldGuidance(options: {
  componentType: string;
  patterns: ContentPatternAnalysis | null;
  recipes: SectionRecipes;
  position?: "first" | "last" | "middle";
  previousSection?: string;
  nextSection?: string;
}): string;
```

Both MCP and n8n call this function, ensuring identical guidance regardless of the consumer surface.

---

## Implementation Phases

### Phase 1: Foundation (shared services)

**Effort:** Medium | **Impact:** High

1. Add `discoverStylisticFields()` to `schema.ts` — schema-driven discovery of trackable fields
2. Extend `analyzeContentPatterns()` in `patterns.ts` with field value extraction (all 3 dimensions)
3. Add `FieldProfile` types and pruning logic
4. Add `assembleFieldGuidance()` to a new `guidance.ts` module
5. Split `DEFAULT_PROPERTIES_TO_DROP` → keep `spaceBefore`, `spaceAfter` with enriched descriptions
6. Add `FIELD_ANNOTATIONS` and the description enrichment pass to `prepareSchemaForOpenAi()`
7. Unit tests for field discovery, extraction, pruning, and prompt assembly

### Phase 2: Recipes & Warnings (static knowledge)

**Effort:** Low | **Impact:** High

1. Add `compositionHints` to relevant recipes in `section-recipes.json`
2. Extend `checkCompositionalQuality()` with field-level warning checks
3. Unit tests for new warning types

### Phase 3: MCP Server Integration

**Effort:** Low | **Impact:** High

1. Pass dereferenced schema to `analyzeContentPatterns()` for field tracking
2. Call `assembleFieldGuidance()` in `generate_section` handler
3. Update `cachedPatterns` warming to include field profiles
4. Verify compositional warnings include field-level checks

### Phase 4: n8n Node Integration

**Effort:** Low-Medium | **Impact:** Medium

1. Call `assembleFieldGuidance()` in n8n `generateSection` operation
2. Add compositional quality warnings to n8n write operation outputs
3. Update n8n workflow templates to demonstrate warning-based branching
4. Test with example workflows

### Phase 5: Validation & Tuning

**Effort:** Medium | **Impact:** High

1. Generate content with and without guidance on real Storyblok spaces
2. Tune pruning thresholds based on observed prompt quality
3. Tune token budget cap based on real guidance sizes
4. Document the system in `copilot-instructions.md`

---

## Risks & Mitigations

| Risk                                                                                         | Impact                                                | Mitigation                                                                                                                        |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Prompt bloat** — Too much guidance overwhelms the LLM or exceeds context limits            | LLM ignores guidance or truncates content             | Token budget cap (~800 tokens), aggressive pruning, layered priority                                                              |
| **Overfitting to existing content** — Site has only 5 pages, patterns are not representative | Guidance is too specific, prevents creative variation | Minimum sample thresholds (≥ 3), clear "samples" count in prompt so LLM knows confidence level                                    |
| **Stale cache** — Cached patterns don't reflect recent content changes                       | Guidance is based on outdated patterns                | `analyze_content_patterns(refresh: true)` already supported. Document that cache should be refreshed after bulk content creation. |
| **Schema changes** — New enum values or fields added to components                           | Field discovery returns stale results                 | Discovery runs from the live dereferenced schema, which updates when the schema does.                                             |
| **Conflicting guidance** — Editorial hint says X, statistical profile says Y                 | LLM is confused                                       | Editorial hints take precedence (listed first in prompt). Statistical profiles are framed as "observed patterns," not rules.      |
| **Performance** — Field extraction adds processing time to pattern analysis                  | Slower startup, slower on-demand analysis             | Field extraction is O(stories × sections × fields) with no API calls — negligible compared to Storyblok API pagination.           |

---

## Success Criteria

1. **Reduced redundancy** — Generated sections containing hero/cta no longer have competing section-level headlines or buttons (target: <5% occurrence, down from ~40% today).
2. **Consistent spacing** — First sections use `spaceBefore: "none"` consistently (target: >90%, up from ~50% today).
3. **On-brand styling** — Generated component field values match the site's established patterns within 1 standard deviation of the observed distribution.
4. **No regression** — Content generation still completes successfully for all component types and content types. Schema validation pass rate remains 100%.
5. **Transparent improvement** — Users of Claude Desktop, VS Code, and n8n see better results without changing their workflows.
