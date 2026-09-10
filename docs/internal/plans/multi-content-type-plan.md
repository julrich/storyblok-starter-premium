# Plan: Multi-Content-Type Support for Generation, Validation & Import

> **Status: ✅ FULLY IMPLEMENTED** — All 9 phases complete. SchemaRegistry in `shared/storyblok-services/src/registry.ts` supports all 5 root content types. All MCP tools, n8n nodes, and shared services have been updated with `contentType` support. See [multi-content-type-implementation.md](../checklists/multi-content-type-implementation.md) for the implementation checklist.

## Problem Statement

The MCP server (and n8n nodes) currently treat **`page`** as the only first-class content type. All AI-assisted generation, planning, validation, and import tools are structurally coupled to `page.schema.dereffed.json` and its `section[]` → `components[]` hierarchy.

The Design System defines **five root content types**, each with its own dereferenced schema shipped in `node_modules/@kickstartds/ds-agency-premium/dist/components/`:

| Content Type      | Root Arrays                                     | Root Objects                  | Root Scalars                            | Has `section`? |
| ----------------- | ----------------------------------------------- | ----------------------------- | --------------------------------------- | :------------: |
| **page**          | `section`                                       | `header`, `footer`, `seo`     | `token`                                 |       ✅       |
| **blog-post**     | `section`                                       | `head`, `aside`, `cta`, `seo` | `content`                               |       ✅       |
| **blog-overview** | `section`, `list`, `more`                       | `latest`, `cta`, `seo`        | `latestTitle`, `listTitle`, `moreTitle` |       ✅       |
| **event-detail**  | `categories`, `locations`, `download`, `images` | `button`                      | `title`, `intro`, `description`         |       ❌       |
| **event-list**    | `events`                                        | `filter`                      | _(none)_                                |       ❌       |

Today, only `page` gets full support: AI planning (`plan_page`), section-by-section generation (`generate_section`), one-shot creation (`create_page_with_content`), import into existing stories (`import_content`, `import_content_at_position`), and schema-driven validation. All other content types can only be created via `create_story` with hand-crafted JSON — no AI generation, no planning, no validation.

### Why This Matters

- **Blog posts** are the second-most-common content type. They have a `section` array (same components as pages) plus unique root fields (`head`, `aside`, `content`, `cta`). Writers should be able to generate blog content with the same ease as pages.
- **Events** are structurally different (no `section`, monomorphic arrays like `locations[]`, `images[]`) but still deserve AI generation, validation, and import support.
- **Future content types** added to the Design System should be automatically supported without code changes — the system should be schema-driven.

### Scope of Hardcoding Today

The coupling is concentrated in **three layers** (the shared validation/pipeline layer is already generic):

1. **Schema loading** — A single `PAGE_SCHEMA` and `PAGE_VALIDATION_RULES` loaded at startup in `storyblok-mcp/src/services.ts` (lines 38–48) and duplicated in `n8n-nodes-storyblok-kickstartds/nodes/StoryblokKickstartDs/GenericFunctions.ts`.
2. **Tool implementations** — 10+ hotspots where `"page"`, `"section"`, and `component: "page"` are hardcoded in `storyblok-mcp/src/services.ts` and `storyblok-mcp/src/index.ts`.
3. **Schema prep** — `prepareSchemaForOpenAi()` in `shared/storyblok-services/src/schema.ts` assumes a page-shaped schema (`header`/`footer` deletion, `section.items.properties.components.items.anyOf` path).

---

## Goals

1. **All five root content types get full AI generation, validation, and import support** — blog-post, blog-overview, event-detail, event-list join page as first-class citizens.
2. **Pages remain the default and highest-priority content type** — No regressions, no breaking changes to existing page workflows.
3. **Sections are treated as a shared concept** — Since `section` appears in page, blog-post, and blog-overview, section-based tools (`generate_section`, `plan_page`, `import_content_at_position`) work for any content type that has a `section` array.
4. **Schema-driven, not hardcoded** — New content types added to the Design System are supported automatically by loading their `*.schema.dereffed.json`.
5. **Shared across consumers** — The schema registry and multi-content-type logic lives in `@kickstartds/storyblok-services` so MCP server, n8n nodes, and any future consumer benefit.
6. **Handles all array topologies** — Monomorphic arrays (event-detail's `locations[]`), polymorphic arrays (page's `section.components[]`), multiple root arrays (blog-overview's `section[]` + `list[]` + `more[]`), and nested arrays (event-detail's `locations[].dates[]`).

---

## Architecture Overview

### Schema Registry

```
@kickstartds/ds-agency-premium/dist/components/
  ├── page/page.schema.dereffed.json
  ├── blog-post/blog-post.schema.dereffed.json
  ├── blog-overview/blog-overview.schema.dereffed.json
  ├── event-detail/event-detail.schema.dereffed.json
  └── event-list/event-list.schema.dereffed.json
         │
         ▼
┌──────────────────────────────────────────────┐
│  SchemaRegistry                              │
│  Map<contentType, {schema, rules}>           │
│                                              │
│  "page"         → { PAGE_SCHEMA, PAGE_RULES }│
│  "blog-post"    → { BP_SCHEMA,  BP_RULES }  │
│  "blog-overview"→ { BO_SCHEMA,  BO_RULES }  │
│  "event-detail" → { ED_SCHEMA,  ED_RULES }  │
│  "event-list"   → { EL_SCHEMA,  EL_RULES }  │
└──────────────┬───────────────────────────────┘
               │
     ┌─────────┼──────────┐
     ▼         ▼          ▼
  MCP Server  n8n Nodes  Future consumers
```

Each entry contains:

- `schema` — the raw dereferenced JSON Schema
- `rules` — the `ValidationRules` from `buildValidationRules(schema)`

The existing `PAGE_SCHEMA` and `PAGE_VALIDATION_RULES` become aliases for `registry.get("page")`, preserving backward compatibility.

### Content Type Tiers

Content types fall into two structural tiers based on whether they have a polymorphic `section` array:

**Tier 1 — Section-based** (page, blog-post, blog-overview): These have a `section[]` root array whose items contain a polymorphic `components[]` slot. The existing `plan_page` → `generate_section` → `create_page_with_content` workflow applies directly. Additional root-level fields (blog-post's `head`, `aside`, `cta`; blog-overview's `list[]`, `more[]`, `latest`) are treated as supplementary — they can be generated separately or alongside sections.

**Tier 2 — Flat / non-section-based** (event-detail, event-list): No `section` array. Root-level fields are plain scalars, objects, or monomorphic typed arrays. These get **whole-schema generation** (the entire root schema is used as the OpenAI structured output target) and field-level import. Section-specific tools (`plan_page`, `generate_section`) do not apply.

This tier distinction is a **usage-level convenience**, not an architectural divide. The schema registry, validation, and schema prep all work uniformly — the tiers only affect which tool workflows make sense for a given content type.

---

## Phase 1: Schema Registry

**Where:** `shared/storyblok-services/src/registry.ts` (new file)

### 1.1 `ContentTypeEntry` type

```ts
interface ContentTypeEntry {
  /** The raw dereferenced JSON Schema. */
  schema: Record<string, any>;
  /** Validation rules extracted from the schema. */
  rules: ValidationRules;
  /** Human-readable display name (from schema `title`). */
  displayName: string;
  /** Whether this content type has a `section` root array (Tier 1). */
  hasSection: boolean;
  /** Names of all root-level array properties. */
  rootArrayFields: string[];
}
```

### 1.2 `SchemaRegistry` class

```ts
class SchemaRegistry {
  private entries: Map<string, ContentTypeEntry>;

  /** Register a content type schema. */
  register(contentType: string, schema: Record<string, any>): void;

  /** Get entry by content type name. Throws if not found. */
  get(contentType: string): ContentTypeEntry;

  /** Check if a content type is registered. */
  has(contentType: string): boolean;

  /** List all registered content type names. */
  listContentTypes(): string[];

  /** List only Tier 1 (section-based) content types. */
  listSectionBasedTypes(): string[];

  /** List only Tier 2 (flat) content types. */
  listFlatTypes(): string[];

  /** Get the entry for "page" (convenience, backward compat). */
  get page(): ContentTypeEntry;
}
```

### 1.3 `createRegistryFromDirectory()` helper

Discovers and loads all `*.schema.dereffed.json` files from a directory pattern. For MCP server startup:

```ts
const registry = createRegistryFromDirectory(
  "node_modules/@kickstartds/ds-agency-premium/dist/components",
  ["page", "blog-post", "blog-overview", "event-detail", "event-list"]
);
```

The explicit allowlist prevents loading 60+ component schemas that aren't root content types. Alternatively, cross-reference with the Storyblok CMS config (`is_root: true`) to auto-discover root types.

### 1.4 Backward compatibility

In `storyblok-mcp/src/services.ts`, replace:

```ts
// Before:
const PAGE_SCHEMA = JSON.parse(readFileSync("page.schema.dereffed.json"));
const PAGE_VALIDATION_RULES = buildValidationRules(PAGE_SCHEMA);

// After:
const registry = createRegistryFromDirectory(schemasDir, ROOT_CONTENT_TYPES);
const PAGE_SCHEMA = registry.page.schema; // alias
const PAGE_VALIDATION_RULES = registry.page.rules; // alias
```

All existing code referencing `PAGE_SCHEMA` / `PAGE_VALIDATION_RULES` continues working unchanged.

---

## Phase 2: Generalize Schema Preparation

**Where:** `shared/storyblok-services/src/schema.ts`

### 2.1 Make `prepareSchemaForOpenAi` root-schema-agnostic

Currently hardcodes three page-specific assumptions:

| Hardcoding                                                              | Line     | Fix                                                                                                                                                               |
| ----------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `delete clonedSchema.properties.header`                                 | ~253     | Guard: `if (clonedSchema.properties.header) delete ...`                                                                                                           |
| `delete clonedSchema.properties.footer`                                 | ~254     | Guard: `if (clonedSchema.properties.footer) delete ...`                                                                                                           |
| `clonedSchema.properties.section.minItems = sections`                   | ~256–257 | Discover root array fields dynamically; apply count constraint to the **primary** root array (first entry in `rootArrayFields`, or a caller-specified field name) |
| `clonedSchema.properties.section?.items?.properties?.components?.items` | ~261     | Iterate all root array fields, find any with `anyOf` in their items tree, and apply type-const injection to each                                                  |

### 2.2 New option: `rootArrayField`

Add to `PrepareSchemaOptions`:

```ts
interface PrepareSchemaOptions {
  // ... existing ...

  /**
   * Which root array field to constrain with `sections` count.
   * Defaults to the first root array field in the schema.
   * For page/blog-post this is "section", for event-list this is "events".
   */
  rootArrayField?: string;

  /**
   * Properties to exclude from AI generation at the root level.
   * Defaults to ["header", "footer"] for page, [] for others.
   * Callers can override to exclude content-type-specific layout fields.
   */
  rootPropertiesToExclude?: string[];
}
```

### 2.3 Tier 2 schema prep

For content types without a polymorphic `section` array (event-detail, event-list), `prepareSchemaForOpenAi` works unchanged for the traversal-based passes (all 13 passes operate on the full schema tree via `json-schema-traverse`). The only difference is:

- No section count constraint (no `minItems`/`maxItems` to set, or set on the applicable root array like `events`)
- No `anyOf` filtering at the section level (there is no `anyOf` — arrays are monomorphic)
- The envelope wraps the **whole root schema**, not just the section→components subtree

The existing traversal passes already handle this correctly:

- `addTypeConsts` — finds `anyOf` arrays anywhere in the tree (including nested arrays like `locations[].dates[]` items if they had type consts)
- `filterComponents` — only acts on nodes that have `anyOf`, skips monomorphic arrays
- `deleteConsts`, `removeUnsupportedKeywords`, `denyAdditionalProperties`, `makeRequired` — all work on any schema shape

### 2.4 `getComponentPresetSchema` generalization

Currently always extracts from `section.items.properties.components.items.anyOf`. Needs to search for the component in any polymorphic slot across the schema, using `ValidationRules.containerSlots`.

---

## Phase 3: Generalize MCP Tools — Tier 1 (Section-Based Content Types)

Tier 1 content types (page, blog-post, blog-overview) share the `section` concept with pages. The primary change is **accepting a `contentType` parameter** and looking up the correct schema/rules from the registry.

### 3.1 `generate_content`

**Current:** Always passes `PAGE_SCHEMA` to the pipeline.

**Change:**

- Add optional `contentType` parameter (default: `"page"`)
- Look up schema from registry: `registry.get(contentType).schema`
- Pass to `generateAndPrepareContent()` as `pageSchema`
- For Tier 1 types: `componentType` and `sectionCount` work exactly as before (they target the `section.components` slot)
- For Tier 2 types: omit `componentType` / `sectionCount`; the full root schema becomes the generation target

Tool schema change:

```ts
contentType: z.string()
  .optional()
  .default("page")
  .describe(
    "Root content type: 'page', 'blog-post', 'blog-overview', 'event-detail', 'event-list'"
  );
```

### 3.2 `generate_section`

**Current:** Delegates to `generate_content` with `componentType` + site-aware context injection.

**Change:** Minimal. Since sections are structurally identical across page, blog-post, and blog-overview (same `section.components[]` slot), this tool works for all Tier 1 content types as-is. The only change:

- Accept optional `contentType` to pass through to `generate_content` (so the right schema's component whitelist is used)
- Each content type's `section` may theoretically allow different components in its `anyOf`; the registry's per-type rules handle this automatically

No changes needed for Tier 2 — this tool doesn't apply to event-detail / event-list.

### 3.3 `plan_page`

**Current:** Reads `PAGE_VALIDATION_RULES.containerSlots.get("section.components")` to discover available components.

**Change:**

- Accept optional `contentType` (default: `"page"`)
- Look up container slots from `registry.get(contentType).rules`
- For Tier 1: plan section sequences as before, using that content type's available components
- For Tier 2: plan the **root field population order** instead of section sequences — e.g. for event-detail, the "plan" is which root fields to generate (`title` → `intro` → `locations` → `images` → `description` → `download` → `button`). The AI planner receives the content type's schema structure and recommends which fields to populate and in what order.
- Consider renaming to `plan_content` (or keep `plan_page` with a description update)

### 3.4 `create_page_with_content`

**Current:** Wraps content in `{ component: "page", section: sections }`.

**Change:**

- Accept optional `contentType` (default: `"page"`)
- Look up rules from registry
- Use `contentType` as the `component` value in the content envelope
- For Tier 1: wrap sections under the correct root array field name (which is `"section"` for all current Tier 1 types, but derived from `rules.rootArrayFields`)
- For Tier 2: accept the full content object (not just sections) — the caller provides all root fields
- Validate against the correct content type's rules
- Consider renaming to `create_content_with_sections` or keeping the name with updated description

Content envelope construction:

```ts
// Tier 1 (section-based):
const content = {
  component: contentType, // "page", "blog-post", "blog-overview"
  _uid: randomUUID(),
  [rootArrayField]: sections, // "section" for all current Tier 1 types
  ...additionalRootFields, // e.g. { head: ..., aside: ..., cta: ... } for blog-post
};

// Tier 2 (flat):
const content = {
  component: contentType, // "event-detail", "event-list"
  _uid: randomUUID(),
  ...rootFields, // all root-level fields provided by caller
};
```

New tool input parameters:

```ts
contentType: z.string().optional().default("page")
  .describe("Root content type"),
sections: z.array(z.record(z.unknown())).optional()
  .describe("Section array (for section-based content types)"),
rootFields: z.record(z.unknown()).optional()
  .describe("Additional root-level fields (e.g. head, aside, cta for blog-post; or all fields for flat types)")
```

### 3.5 `import_content`

**Current:** Finds a prompter component by UID inside the `section` array and replaces it.

**Change:**

- Accept optional `contentType` (default: `"page"`)
- Look up root array field from registry
- Search for the prompter in the correct root array (for Tier 1: `section`; for Tier 2: search across all root arrays, or accept a `targetField` parameter)
- Validate imported content against the correct rules

### 3.6 `import_content_at_position`

**Current:** Inserts sections into `story.content.section[]`.

**Change:**

- Accept optional `contentType` (default: `"page"`)
- Accept optional `targetField` parameter specifying which root array to insert into (defaults to the primary root array field from the schema)
- For Tier 1: insert into `section[]` (same as today)
- For Tier 2: insert into the specified array — e.g. `locations[]` for event-detail, `events[]` for event-list
- Error gracefully if the target field doesn't exist or isn't an array in the schema

New tool input parameter:

```ts
targetField: z.string()
  .optional()
  .describe(
    "Which root array field to insert into. Defaults to the primary root array (e.g. 'section' for pages, 'events' for event-list). Use for inserting into specific arrays like 'locations', 'download', 'images'."
  );
```

### 3.7 `create_story` / `update_story`

**Current:** Validate only if `contentType === "page"` or `rules_rootMatchesSchema(content)`.

**Change:**

- Detect content type from `content.component` field (Storyblok format)
- Look up the correct validation rules from the registry
- If the content type is registered, validate against its rules
- If the content type is unknown, fall back to current behavior (skip validation or warn)

This is backward compatible — page content continues to validate as before, and now blog-post, event-detail, etc. also get validated.

### 3.8 `analyze_content_patterns`

**Current:** Accepts `contentType` parameter but hardcodes `story.content.section` for pattern extraction.

**Change:**

- Look up the content type's root array fields from the registry
- Extract patterns from the correct root arrays
- For Tier 1 types with `section`: existing logic works, just read from the schema-derived field name
- For Tier 2 types: extract patterns from their root arrays (e.g. for event-detail, analyze how many locations, images, downloads are typical; for event-list, analyze event teaser patterns)
- Use the content type's own `rules.subComponentMap` for sub-component counting

---

## Phase 4: Generalize MCP Tools — Tier 2 (Flat Content Types)

### 4.1 Whole-schema generation for event-detail

For flat content types, `generate_content` without `componentType` generates the **entire root object** in one shot. The schema prep wraps the full root schema in an OpenAI envelope.

Example workflow:

```
generate_content(
  contentType: "event-detail",
  system: "You are a conference event content writer...",
  prompt: "Create a detail page for a React conference workshop..."
)
→ Returns: { title, intro, description, categories: [...], locations: [...], images: [...], download: [...], button }
```

This works because:

- All of event-detail's arrays are **monomorphic** (same item shape, no `anyOf`)
- `json-schema-traverse` handles the nested `locations[].dates[]` and `locations[].links[]` arrays
- OpenAI structured output handles multiple root arrays without issues
- The total property count stays well under OpenAI's 5000 limit

### 4.2 Field-level generation for event-detail

For more control, callers can generate individual root fields using the new `rootField` parameter on `generate_content`:

```ts
rootField: z.string()
  .optional()
  .describe(
    "Generate content for a specific root field only (e.g. 'locations' for event-detail). Omit for whole-schema generation."
  );
```

This extracts just that field's schema from the root and generates content for it in isolation. Useful for:

- Adding 3 more locations to an existing event: `generate_content(contentType: "event-detail", rootField: "locations", prompt: "Generate 3 European conference venues")`
- Generating a download list: `generate_content(contentType: "event-detail", rootField: "download", prompt: "Create download entries for speaker slides and schedule PDF")`

### 4.3 `plan_page` for Tier 2 → field population planning

For Tier 2 content types, `plan_page` (or `plan_content`) returns a **field population plan** instead of a section sequence:

```json
{
  "contentType": "event-detail",
  "plan": [
    { "field": "title", "type": "string", "description": "Event title" },
    {
      "field": "intro",
      "type": "string",
      "description": "Short intro paragraph"
    },
    {
      "field": "categories",
      "type": "array",
      "itemCount": 3,
      "description": "Event category tags"
    },
    {
      "field": "locations",
      "type": "array",
      "itemCount": 2,
      "description": "Venue details with dates"
    },
    {
      "field": "description",
      "type": "string",
      "description": "Full rich-text event description"
    },
    {
      "field": "images",
      "type": "array",
      "itemCount": 4,
      "description": "Event gallery images"
    },
    {
      "field": "download",
      "type": "array",
      "itemCount": 2,
      "description": "Downloadable materials"
    },
    {
      "field": "button",
      "type": "object",
      "description": "Registration CTA button"
    }
  ]
}
```

The AI planner uses the schema field descriptions, types, and observed patterns (from `analyze_content_patterns`) to recommend field order, item counts, and content focus.

### 4.4 Validation for Tier 2

`buildValidationRules()` already works with any schema. For event-detail:

- `rootArrayFields`: `["categories", "locations", "download", "images"]`
- `containerSlots`: discovers `locations.dates` → event-appointment, etc.
- `allKnownComponents`: discovers component names from nested schemas
- `subComponentMap`: maps parent→child arrays (e.g. location→dates)

The `validateContent()` / `validatePageContent()` functions work as-is once given the correct rules.

### 4.5 Pattern analysis for Tier 2

`analyzeContentPatterns` for Tier 2 content types produces different metrics than section-based analysis:

- **Field population frequency**: How often is `download` populated? How often is `description` used vs left empty?
- **Array item counts**: Typical number of locations (median 2, range 1–5), typical number of images (median 6, range 3–12)
- **Field co-occurrence**: Events that have `download` also tend to have `images`
- **Content archetypes**: "Workshop-style" (1 location, many downloads) vs "Conference-style" (3+ locations, gallery)

---

## Phase 5: Schema Prep — `prepareSchemaForOpenAi` Refactor

### 5.1 Dynamic root array discovery

Replace hardcoded `section` references with schema introspection:

```ts
// Before:
const sectionItems =
  clonedSchema.properties.section?.items?.properties?.components?.items;

// After:
const rules = buildValidationRules(clonedSchema);
for (const rootField of rules.rootArrayFields) {
  const fieldSchema = clonedSchema.properties[rootField];
  if (!fieldSchema?.items) continue;

  // Apply count constraints to the target field
  if (rootField === targetRootField && sectionCount !== undefined) {
    fieldSchema.minItems = sectionCount;
    fieldSchema.maxItems = sectionCount;
  }

  // Inject type consts into any polymorphic slots found in this field's subtree
  injectTypeConstsIntoAnyOf(fieldSchema.items, subComponentMap);
}
```

### 5.2 Conditional root property exclusion

Replace hardcoded `header`/`footer` deletion with configurable exclusion:

```ts
// Before:
delete clonedSchema.properties.header;
delete clonedSchema.properties.footer;

// After:
const defaultExcludes = detectDefaultExcludes(clonedSchema);
// For page: ["header", "footer"] (layout concerns, not content)
// For blog-post: [] (head, aside, cta are content)
// For event-detail: [] (all fields are content)
const excludes = options.rootPropertiesToExclude ?? defaultExcludes;
for (const prop of excludes) {
  delete clonedSchema.properties[prop];
}
```

`detectDefaultExcludes()` uses heuristics or a configurable map:

- Properties named `header`, `footer`, `token` → exclude by default (layout/chrome)
- Properties named `seo` → exclude by default (metadata, not visible content)
- Everything else → include

### 5.3 Envelope naming

Currently: `name: "page_response"`.

Change to dynamic naming: `name: "${contentType}_response"` (e.g. `"blog_post_response"`, `"event_detail_response"`).

---

## Phase 6: Transform & Import Generalization

### 6.1 `processForStoryblok` — already generic

`processForStoryblok()` in `shared/storyblok-services/src/transform.ts` iterates all properties on the input object and flattens nested objects. It does **not** hardcode `section` or any field names. No changes needed.

> **Implementation note (added post-implementation):** While `processForStoryblok` itself is generic, root fields generated by `generateRootFieldContent` require a preceding `injectRootFieldComponentTypes` step. Root field schemas are monomorphic (no `anyOf` discriminator), so OpenAI output lacks `type` fields. The `injectRootFieldComponentTypes` function walks the content alongside the original schema (with `$id` values intact) and injects `type` discriminators based on `$id` URIs. Then `processForStoryblok` converts `type` → `component` as usual. Additionally, `createPageWithContent` now processes root fields through `ensureUids` and `wrapAssetUrls` — the same post-processing that sections receive.

### 6.2 MCP tool import helpers — remove `section` hardcoding

In `storyblok-mcp/src/services.ts`, several methods wrap/unwrap under the `section` key:

```ts
// Before:
const transformed = processForStoryblok({ section: sections });
sections = transformed.section;

// After:
const rootField = registry.get(contentType).rootArrayFields[0] || "section";
const transformed = processForStoryblok({ [rootField]: items });
items = transformed[rootField];
```

Same pattern applies to:

- `StoryblokService.createPageWithContent()` — content envelope construction
- `StoryblokService.importContentAtPosition()` — reading and writing the root array
- `StoryblokService.importByPrompterReplacement()` — finding the prompter in the correct array
- Asset URL rewriting (wraps content in `{ section: ... }`) — use dynamic key

### 6.3 Zod schema relaxation

The Zod validation schemas in `storyblok-mcp/src/config.ts` hardcode `section` in several places:

```ts
// Before:
page: z.object({
  content: z.object({
    section: z.array(sectionSchema),
  }),
});

// After: Accept any content shape, validate structurally
page: z.object({
  content: z.record(z.unknown()),
});
// ... with runtime validation via the schema registry
```

The strong typing moves from Zod (which can't know the content type at parse time) to the schema-driven validation layer (which uses the registry).

---

## Phase 7: n8n Nodes Alignment

The n8n nodes have the same hardcoding pattern as the MCP server:

| File                                                                                      | Hardcoding                                                         |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `n8n-nodes-storyblok-kickstartds/nodes/StoryblokKickstartDs/GenericFunctions.ts`          | `PAGE_SCHEMA`, `PAGE_VALIDATION_RULES`, section-specific iteration |
| `n8n-nodes-storyblok-kickstartds/nodes/StoryblokKickstartDs/StoryblokKickstartDs.node.ts` | Separate `PAGE_SCHEMA` load, hardcoded preset schemas              |

### Changes

- Import `SchemaRegistry` from `@kickstartds/storyblok-services`
- Replace `PAGE_SCHEMA` / `PAGE_VALIDATION_RULES` with registry lookups
- Add `contentType` parameter to relevant n8n node operations (Generate Content, Import Content, Create Story)
- Replace the 9 hardcoded preset JSON schemas (hero, faq, testimonials, etc.) with dynamic `getComponentPresetSchema(registry.get(contentType).schema, componentName)` — this already works once the schema registry provides the right root schema

---

## Phase 8: Recipe & Pattern Enhancements

### 8.1 Content-type-specific recipes

`storyblok-mcp/schemas/section-recipes.json` currently only has recipes for section-based pages. Extend with:

- **Blog-post recipes**: "Technical tutorial" (long-form content + code sections), "Thought leadership" (head + cta + 3 sections), "Case study" (head + stats section + testimonials section + cta)
- **Event-detail recipes**: "Workshop" (1 location, detailed schedule, downloads), "Conference talk" (multiple locations, speaker gallery), "Webinar" (single online location, recording download)
- **Anti-patterns per content type**: "Blog post without a CTA", "Event without any locations", "Blog overview with 0 teasers"

### 8.2 `list_recipes` content type filter

Add optional `contentType` parameter to `list_recipes` to return only relevant recipes:

```ts
contentType: z.string()
  .optional()
  .describe("Filter recipes by content type. Returns all recipes if omitted.");
```

### 8.3 Pattern cache per content type

Currently, `cachedPatterns` holds analysis for one content type (page). Expand to a `Map<string, ContentPatternAnalysis>`:

```ts
const patternCache = new Map<string, ContentPatternAnalysis>();

// Warm cache for page at startup
patternCache.set(
  "page",
  await analyzeContentPatterns(storyblokService, registry.get("page").rules, {
    contentType: "page",
  })
);

// Lazy-load other content types on first request
if (!patternCache.has(contentType)) {
  patternCache.set(
    contentType,
    await analyzeContentPatterns(
      storyblokService,
      registry.get(contentType).rules,
      { contentType }
    )
  );
}
```

---

## Phase 9: Documentation & Copilot Instructions

### 9.1 Update `.github/copilot-instructions.md`

- Document the schema registry and `contentType` parameter on all tools
- Update the recommended workflow: `analyze_content_patterns(contentType) → plan_page(contentType) → generate_section / generate_content(contentType) → create_page_with_content(contentType)`
- Document Tier 1 vs Tier 2 workflow differences
- Update the `create_page_with_content` and `create_story` docs to show blog-post and event-detail examples

### 9.2 Update MCP tool descriptions

Each tool's `description` field needs to reflect multi-content-type support. E.g.:

```
create_page_with_content:
  "Create a new story in Storyblok pre-populated with content.
   Supports all content types: page (default), blog-post, blog-overview,
   event-detail, event-list. For section-based types (page, blog-post,
   blog-overview), provide sections. For flat types (event-detail,
   event-list), provide rootFields with the complete content structure."
```

### 9.3 Update `docs/skills/plan-page-structure.md`

Add content-type-specific workflow examples for blog posts and events.

---

## Implementation Order

| Phase                                          | Effort | Dependencies | Risk                                                           |
| ---------------------------------------------- | ------ | ------------ | -------------------------------------------------------------- |
| **Phase 1: Schema Registry**                   | Low    | None         | Low — additive, no existing code changes                       |
| **Phase 2: Schema Prep Generalization**        | Medium | Phase 1      | Medium — core pipeline change, thorough testing needed         |
| **Phase 5: Transform & Import Generalization** | Medium | Phase 1      | Low — mostly parameterization                                  |
| **Phase 3: Tier 1 Tools**                      | Medium | Phases 1, 2  | Low — blog-post/blog-overview are structurally similar to page |
| **Phase 4: Tier 2 Tools**                      | High   | Phases 1, 2  | Medium — new generation patterns for flat types                |
| **Phase 6: n8n Alignment**                     | Medium | Phase 1      | Low — same pattern as MCP changes                              |
| **Phase 7: Recipes & Patterns**                | Low    | Phases 3, 4  | Low — additive content                                         |
| **Phase 8: Documentation**                     | Low    | All above    | None                                                           |

Recommended approach: **Phase 1 → 2 → 5 → 3 → 4 → 6 → 7 → 8**, shipping Phase 1–3 as a first PR (unlocks blog-post and blog-overview) and Phases 4–8 as a follow-up PR (adds event-detail, event-list, and polish).

---

## Success Criteria

1. **`generate_content(contentType: "blog-post", sectionCount: 3)`** produces valid blog-post content with 3 sections, validated against the blog-post schema
2. **`plan_page(contentType: "blog-post", intent: "Technical tutorial about React hooks")`** returns a section sequence using the blog-post schema's available components
3. **`create_page_with_content(contentType: "blog-post", sections: [...], rootFields: { head: ..., cta: ... })`** creates a valid Storyblok story with `component: "blog-post"`
4. **`generate_content(contentType: "event-detail", prompt: "React conference workshop")`** generates a complete event-detail object with title, locations, images, etc.
5. **`create_story` with `content: { component: "event-detail", ... }`** validates against the event-detail schema automatically (detected from `content.component`)
6. **`analyze_content_patterns(contentType: "blog-post")`** extracts section patterns from existing blog posts, not from pages
7. **`import_content_at_position(contentType: "event-detail", targetField: "locations", position: -1, sections: [...])`** appends new locations to an existing event
8. **All existing page workflows continue to work identically** — zero regressions
9. **n8n Generate Content node** can generate blog-post and event-detail content via a content type dropdown

---

## Open Questions

1. **Auto-discovery vs allowlist for root content types**: Should the registry auto-detect root content types by scanning for `is_root: true` in the CMS config, or use an explicit allowlist? Auto-discovery is more future-proof but may load schemas for content types the project doesn't actually use.

2. **Schema copy location**: Currently `page.schema.dereffed.json` is copied into `storyblok-mcp/schemas/`. Should other content type schemas also be copied there (build step), or loaded directly from `node_modules`? Copying ensures stability across deploys but adds a sync step.

3. **`plan_page` naming**: Rename to `plan_content` to reflect broader scope, or keep `plan_page` for backward compatibility? The tool is referenced in `copilot-instructions.md` and the `plan-page-structure.md` skill doc.

4. **Blog-post root field generation**: Should blog-post's unique fields (`head`, `aside`, `content`, `cta`) be generated alongside sections in one `generate_content` call, or should they have separate generation steps? One call is simpler; separate steps give more control.

5. **Recipes file structure**: One `section-recipes.json` with all content types, or split into `page-recipes.json`, `blog-post-recipes.json`, etc.?
