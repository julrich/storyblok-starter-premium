# Plan: JSON Schema as Single Source of Truth for the MCP Server

> **Status: ✅ FULLY IMPLEMENTED** — All phases (1–8) are complete. See [docs/schema-guardrails-implementation.md](../checklists/schema-guardrails-implementation.md) for the checklist. Validation logic lives in `shared/storyblok-services/src/validate.ts`. The `PAGE_SCHEMA` singleton has been replaced by `SchemaRegistry` (`shared/storyblok-services/src/registry.ts`) which loads all 5 root content types (page, blog-post, blog-overview, event-detail, event-list) and builds per-type validation rules automatically.

## Problem Statement

The MCP server currently has **two pathways** for creating content in Storyblok:

1. **Schema-respecting path** — `generate_content` → uses `prepareSchemaForOpenAi()` → OpenAI Structured Output → `processOpenAiResponse()` → `processForStoryblok()`. This path enforces the Design System's JSON Schema composition rules because OpenAI is _forced_ to produce valid output by the schema itself.

2. **Unguarded path** — `create_story`, `update_story`, `create_page_with_content`, `import_content`, `import_content_at_position`. These tools accept arbitrary JSON objects (`z.record(z.unknown())` / `z.array(z.record(z.unknown()))`) with **zero structural validation**. An LLM can construct any component hierarchy it wants, bypassing all Design System rules.

Additionally, the **`list_components` and `get_component` tools** expose raw Storyblok component schemas. An LLM can query these, learn that a component named `tile` exists, and place it directly inside a `section` — even though the JSON Schema only allows `tile` inside `mosaic.tile`. Storyblok's Management API will happily accept this because its component system is flat (any component can go anywhere), but the resulting page will be structurally invalid per the Design System.

### Concrete Example

The dereferenced page schema (`storyblok-mcp/schemas/page.schema.dereffed.json`) defines exactly 27 components in `section.components.anyOf`. The `tile` component is **not** among them. It only exists as an item type inside `mosaic.tile.items`. But an LLM calling `list_components` → `get_component("tile")` → `create_page_with_content` can place tiles directly as section children, producing a page that violates the Design System's compositional rules.

### Schema Origin & Layering

The Design System JSON Schemas are **not** part of this repository. They come from the npm dependency (e.g. `@kickstartds/ds-agency-premium`) at `node_modules/@kickstartds/ds-agency-premium/dist/components/`. Each component ships its own `*.schema.json` file.

**Local schema extensions** live in the project's `components/` directory (e.g. `components/section/section.schema.json`). These extend the DS schemas via `allOf` + `$ref` — for example, the local `section.schema.json` adds `info-table`, `prompter`, and `timeline` to the section's `components.anyOf`, then references the DS section schema for everything else.

The `dereference-schemas` script merges these layers (`--schema-paths node_modules/…/components components --layer-order cms schema`) and produces the fully resolved `page.schema.dereffed.json`, which is used by the MCP server.

**This means the schema structure is project-specific and Design System–specific.** Different projects may use different DS packages, have different local extensions, define different component hierarchies, and even use different root schema shapes (not necessarily `page` with `section` arrays). The validation logic must therefore be schema-driven and general-purpose, never hardcoded to a specific DS or project structure.

## Goals

1. **JSON Schema is the single source of truth** — All write tools must respect the same nesting/composition rules defined in the Design System JSON Schemas.
2. **Fail fast with actionable errors** — When validation fails, the error message should tell the LLM _what_ is wrong and _how_ to fix it (e.g. "Component `tile` cannot be a direct child of `section`. It must be nested inside `mosaic.tile`.").
3. **Component introspection steers LLMs toward valid compositions** — `list_components` and `get_component` should communicate component nesting rules, not just flat field schemas.
4. **No breaking changes to the happy path** — Content generated via `generate_content` should continue to flow into write tools without friction.
5. **Shared logic** — Validation logic lives in `shared/storyblok-services` so it can be reused by the MCP server, n8n nodes, and any future consumer.
6. **Design System–agnostic** — The validation and rule-extraction logic must work with _any_ kickstartDS-based Design System and any project-specific schema extensions, not just `ds-agency-premium` or a specific page/section structure.
7. **Compositional flexibility** — It must remain possible to generate standalone components (e.g. "give me a features element"), standalone sections, multi-section pages, or content for non-page content types (blog posts, events). Validation should apply to whatever root schema is in play, not assume the content is always "sections inside a page."

## Architecture Overview

```
                  ┌──────────────────────────────────────────────┐
                  │  *.schema.dereffed.json                      │
                  │  (any DS root schema: page, blog-post, etc.) │
                  └──────────┬───────────────────────────────────┘
                             │
                  ┌──────────▼───────────────────────────────────┐
                  │  buildValidationRules(derefSchema)           │
                  │  (extract nesting rules from ANY schema)     │
                  │  → shared/storyblok-services                 │
                  └──────────┬───────────────────────────────────┘
                             │
       ┌─────────────────┬───┼───────────────────────┐
       │                 │   │                       │
 ┌─────▼──────────┐ ┌───▼───▼──────────┐ ┌───────────▼───────────┐
 │ validateContent │ │ prepareSchema    │ │ list/get_component    │
 │ (write tools)   │ │ ForOpenAi()      │ │ (annotated output)    │
 │                 │ │ (generate_content│ │                       │
 │                 │ │  tool)           │ │                       │
 └─────────────────┘ └──────────────────┘ └───────────────────────┘
```

## Detailed Plan

### Phase 1: Extract Validation Rules from the JSON Schema

**Goal:** Build a reusable data structure that captures component nesting rules from _any_ dereferenced root schema at startup. The function must work schema-driven — it discovers the hierarchy by walking the schema tree, not by hardcoding knowledge about "page," "section," or specific component names.

**Location:** New file `shared/storyblok-services/src/validate.ts` (the same module that will hold `validateContent()` in Phase 2 — keeps all schema-derived rule logic together)

**Steps:**

1. **New function `buildValidationRules(derefSchema)`** — Walks _any_ dereferenced root schema (page, blog-post, event-detail, or a custom one from a different DS) and produces a generic nesting-rule map:

   - **`containerSlots: Map<string, Set<string>>`** — For every "container" array in the schema that holds `anyOf` component references, maps the _slot path_ (e.g. `"section.components"`, `"mosaic.tile"`, `"slider.components"`) to the set of component type names allowed there. This is discovered by walking the schema tree, not by reading `SUB_COMPONENT_MAP` alone.
   - **`componentToSlots: Map<string, string[]>`** — Reverse index: for every component type, which container slot(s) it may appear in. E.g. `"tile" → ["mosaic.tile"]`, `"hero" → ["section.components"]`.
   - **`allKnownComponents: Set<string>`** — The union of all component type names found anywhere in the schema.
   - **`rootArrayFields: string[]`** — The names of the top-level array properties in the root schema that hold containers (e.g. `["section"]` for the page schema, but could be different for another DS or content type).

   The walker identifies "component" objects by looking for a `type` property with a `const` value (or, in dereffed schemas, a `$id` from which the name can be extracted via `getSchemaName()`). It identifies "container arrays" by looking for `array` typed properties whose `items` contain `anyOf` with multiple component-like objects.

2. **Cache the result** — Call `buildValidationRules()` once at MCP server startup (and in n8n node initialization) and reuse the cached result for all subsequent validations. The schema is static at build time.

3. **Replace hardcoded constants with schema-derived data** — `SUPPORTED_COMPONENTS` and `SUB_COMPONENT_MAP` are currently hardcoded constants that duplicate knowledge already present in the JSON Schema:

   - `SUPPORTED_COMPONENTS` lists 27 component names → used as the default `allowedComponents` in `prepareSchemaForOpenAi()`, deciding which components AI can generate.
   - `SUB_COMPONENT_MAP` maps 8 parent→child relationships (e.g. `mosaic` → `tile`) → used to inject `type` consts into sub-component arrays during schema preparation.

   **These must not diverge from what the schema actually defines.** If the schema says `tile` belongs inside `mosaic.tile`, and validation enforces that rule, then the generation pipeline must also know that `tile` is a sub-component of `mosaic` — from the _same_ source of truth. Hardcoded constants create a maintenance gap: adding a new component to the schema updates validation automatically (via `buildValidationRules()`), but generation would still use the stale hardcoded list until someone manually updates it.

   **Plan:**

   - `buildValidationRules()` already produces `allKnownComponents` (equivalent to `SUPPORTED_COMPONENTS`) and the `containerSlots` map (a superset of `SUB_COMPONENT_MAP`). Expose these in a shape that `prepareSchemaForOpenAi()` can consume directly.
   - Refactor `prepareSchemaForOpenAi()` to accept the schema-derived rules as an _optional_ parameter. When provided, it uses `allKnownComponents` as the default component list and derives the sub-component map from `containerSlots`, instead of reading the hardcoded constants.
   - Keep `SUPPORTED_COMPONENTS` and `SUB_COMPONENT_MAP` exported temporarily for backward compatibility (external consumers may reference them), but mark them as `@deprecated` with a note pointing to the schema-derived alternative. Remove them in a future major version.
   - The `prepareSchemaForOpenAi()` function also hardcodes structural knowledge about the page schema (e.g. `delete clonedSchema.properties.header`, `clonedSchema.properties.section`). These assumptions should be softened using the `rootArrayFields` from the validation rules, but this can be addressed incrementally — the critical fix is aligning the component lists.

4. **Support multiple root schemas** — The MCP server currently ships only `page.schema.dereffed.json`, but a project could have separate dereffed schemas for `blog-post`, `event-detail`, etc. `buildValidationRules()` can be called once per root schema, and the results can be merged or stored in a `Map<contentType, ValidationRules>`.

**Key design decision:** The validation rules are derived _from the JSON Schema_, not hardcoded — and the generation pipeline uses the same derived data. If a new component, container, or content type is added to the schema, both validation _and_ generation update automatically. No code change is required when switching to a different Design System.

---

### Phase 2: Create Validation Function

**Goal:** A pure function that validates a content tree against the rules from Phase 1. It must work with any root schema structure, not just "sections inside a page."

**Location:** New file `shared/storyblok-services/src/validate.ts`

**Steps:**

1. **New function `validateContent(content, rules, options?)`** — Takes a content tree (at any level of the hierarchy) and the rules from `buildValidationRules()`. Recursively walks the tree and checks:

   - When it encounters a container array (identified by matching a `containerSlots` key), every child component in that array is of a type listed in the allowed set for that slot.
   - Components that only appear in nested slots (e.g. `tile` only in `mosaic.tile`) are flagged if found in a parent slot where they're not allowed.
   - No unknown component types are present (components not in `allKnownComponents` at all).
   - Nested containers within components are also recursively validated (e.g. verifying that items inside a `mosaic.tile` array are actually `tile` components).

   The function does **not** hardcode "section" or "components" as field names. Instead, it uses the `containerSlots` map to identify which fields are container arrays and what they allow.

2. **Return type: `ValidationResult`**

   ```typescript
   interface ValidationResult {
     valid: boolean;
     errors: ValidationError[];
   }

   interface ValidationError {
     path: string; // e.g. "section[0].components[2]" or "mosaic.tile[1]"
     component: string; // e.g. "tile"
     message: string; // human-readable, actionable
     suggestion?: string; // e.g. "Wrap in a `mosaic` component"
   }
   ```

3. **Handle both Design System format and Storyblok-flattened format** — The function should work regardless of whether content has been through `processForStoryblok()` yet. It identifies component types by checking for `component` (Storyblok format) or `type` / `type__*` discriminators (Design System / OpenAI format).

4. **Options parameter** — Allow callers to:

   - `strict: boolean` (default `true`) — When `false`, only warn about sub-component misplacement but don't treat unknown components as errors (useful for forward-compatibility during schema transitions).
   - `format: "storyblok" | "design-system" | "auto"` (default `"auto"`) — Hint about which format the content is in, so the validator knows where to look for component type identifiers.

5. **Convenience wrappers** — Provide thin helpers for the most common use cases in this project, e.g.:
   ```typescript
   function validateSections(sections, rules, options?) {
     // validates an array of section objects — delegates to validateContent
   }
   function validatePageContent(pageContent, rules, options?) {
     // validates a full page object (with section array) — delegates to validateContent
   }
   ```
   These are optional sugar — the generic `validateContent()` is the core.

### Composability: standalone component generation

The `generate_content` tool already supports standalone component generation via `componentType` (e.g. "give me a features element") and multi-section generation via `sectionCount`. Internally, `getComponentPresetSchema()` filters the page schema down to a single component wrapped in the page/section envelope, so the output is always valid per the schema.

**Crucially, the validation layer must not block this workflow.** When an LLM generates a single component via `generate_content` and then passes it to `create_page_with_content` or `import_content_at_position`, the content is already schema-valid (it was constrained by OpenAI Structured Output). The validation function simply confirms this — it does not add extra restrictions.

Where validation adds value is when an LLM **bypasses** `generate_content` and constructs content manually (e.g. after reading `list_components` / `get_component` output), or when it **reassembles** generated fragments in invalid ways (e.g. extracting a `tile` from a `mosaic` and placing it directly into a section).

---

### Phase 3: Integrate Validation into Write Tools

**Goal:** All tools that write content to Storyblok validate the content structure _before_ calling the Storyblok Management API.

**Affected tools** (in `storyblok-mcp/src/services.ts` and `storyblok-mcp/src/index.ts`):

| Tool                         | Input field to validate | Notes                                                 |
| ---------------------------- | ----------------------- | ----------------------------------------------------- |
| `create_page_with_content`   | `sections`              | Most common entry point for new pages                 |
| `import_content`             | `page.content.section`  | Used for prompter replacement                         |
| `import_content_at_position` | `sections`              | Used for adding sections to existing pages            |
| `create_story`               | `content`               | Low-level; validate whatever content tree is provided |
| `update_story`               | `content`               | Same as `create_story`                                |

**Steps:**

1. **Load validation rules at startup** — In `storyblok-mcp/src/services.ts`, the dereffed schema is already loaded as `PAGE_SCHEMA`. Call `buildValidationRules(PAGE_SCHEMA)` once and store the result alongside it. If the project ships additional root schemas (e.g. `blog-post.schema.dereffed.json`), load and build rules for those too.

2. **Add validation calls** — In each tool handler, before calling the Storyblok API:

   ```
   const result = validateContent(contentTree, validationRules);
   if (!result.valid) {
     return formatValidationError(result.errors);
   }
   ```

   For `create_page_with_content` and `import_content_at_position`, the content tree is the `sections` array. For `create_story`/`update_story`, the content tree is the entire `content` object.

3. **Format validation errors for LLMs** — Create a `formatValidationError()` helper that produces a clear, structured error message:

   ```
   ❌ Content validation failed (2 errors):

   1. section[0].components[2]: Component "tile" cannot be a direct child of "section.components".
      → "tile" is allowed in: mosaic.tile
      → Suggestion: Wrap in a "mosaic" component.

   2. section[1].components[0]: Unknown component "my-widget".
      → Known components: blog-teaser, business-card, contact, ...
   ```

4. **Content-type detection for `create_story` / `update_story`** — These tools accept generic content objects. The validator should:
   - Look at the `component` field (Storyblok format) or root schema structure to determine which rules to apply.
   - If the content matches a known root schema (e.g. `component: "page"` → use page rules), validate accordingly.
   - If the content type is unknown, skip deep validation but still check any embedded container arrays that match known slot patterns.
   - Never reject content for an unrecognized root type — only for invalid _nesting within_ a recognized structure.

---

### Phase 4: Annotate Component Introspection Tools

**Goal:** Make `list_components` and `get_component` communicate nesting rules, so LLMs understand composition constraints _before_ attempting to construct content.

**Steps:**

All annotations are **dynamically derived** from the `componentToSlots` and `containerSlots` maps produced by `buildValidationRules()` — no component names are hardcoded in the annotation logic.

1. **Annotate `list_components` output** — After fetching components from Storyblok, enrich each component entry by looking it up in the schema-derived rules:

   - `allowedIn: string[]` — The container slot(s) this component may appear in (from `componentToSlots`).
   - `isSubComponent: boolean` — `true` if the component does _not_ appear in any top-level container slot (i.e. it only appears nested inside another component).
   - `parentComponent?: string` — If it is a sub-component, which parent's slot it belongs to (derived from the slot path).

   Example output (for a DS where `tile` is nested inside `mosaic`):

   ```json
   {
     "name": "tile",
     "display_name": "Tile",
     "isSubComponent": true,
     "parentComponent": "mosaic",
     "allowedIn": ["mosaic.tile"],
     "note": "This component cannot be used as a direct child of a top-level container. It must be nested inside a 'mosaic' component."
   }
   ```

   The `note` text is generated from the rules, not a static string — if a different DS has different nesting, the note adapts automatically.

2. **Annotate `get_component` output** — When returning a single component's schema, prepend a `composition_rules` field derived from the rules:

   ```json
   {
     "composition_rules": {
       "allowedIn": ["section.components"],
       "childSlots": {
         "tile": { "slotPath": "mosaic.tile", "note": "Array of tile sub-components" }
       }
     },
     "schema": { ... }
   }
   ```

   The `allowedIn` and `childSlots` are both looked up from the cached rules, not hardcoded.

3. **Update tool descriptions** — Add text to the `list_components` and `get_component` tool descriptions warning that components have nesting constraints:
   > "Note: Not all components can be used everywhere. Check the `allowedIn` and `isSubComponent` fields to understand where each component can be placed. Sub-components can only be used inside their parent component's designated slot — they cannot be placed directly into a top-level container."

---

### Phase 5: Improve Tool Descriptions as Guardrails

**Goal:** Tool descriptions are the first line of defense — they tell the LLM how to use each tool correctly.

**Steps:**

1. **`create_page_with_content`** — Add to description:

   > "Sections are validated against the Design System's JSON Schema before saving. Each container slot (e.g. a section's component list) only accepts the component types defined by the schema. Sub-components that belong inside a parent component cannot be placed directly at the top level. Use `generate_content` to produce schema-valid content, or consult `list_components` to check the `allowedIn` field for each component."

2. **`create_story`** — Add:

   > "Content is validated against the Design System's JSON Schema before saving. Component nesting must comply with the schema's composition rules — sub-components can only appear inside their designated parent slots."

3. **`import_content` / `import_content_at_position`** — Add:

   > "Content is validated against the Design System's JSON Schema before import. Invalid component nesting (e.g. placing a sub-component directly in a top-level container) will be rejected with an actionable error message."

4. **`generate_content`** — Emphasize that this is the recommended path:
   > "This is the recommended way to produce content that is guaranteed to comply with the Design System's JSON Schema. The schema is auto-derived and enforced by OpenAI's structured output. Content produced by this tool can be passed directly to `create_page_with_content` or `import_content_at_position`."

---

### Phase 6: Update Zod Schemas for Stronger Typing

**Goal:** Move the Zod schemas in `storyblok-mcp/src/config.ts` from `z.record(z.unknown())` toward slightly more structured types, providing early signal to both TypeScript and the LLM.

**Steps:**

1. **Define a base section Zod schema** — Not a full schema (that would duplicate the JSON Schema), but enough to validate the expected envelope. The field names come from the project's schema (currently `component` + `components`), but they should be kept minimal to avoid over-coupling:

   ```typescript
   const sectionSchema = z
     .object({
       component: z.literal("section").optional(),
       type: z.literal("section").optional(),
       components: z.array(z.record(z.unknown())).optional(),
     })
     .passthrough();
   ```

   This ensures sections at least have a recognizable shape, catching completely malformed input early (before it hits the deeper JSON Schema validation).

2. **Replace `z.array(z.record(z.unknown()))` with `z.array(sectionSchema)`** in:

   - `schemas.createPageWithContent.sections`
   - `schemas.importContentAtPosition.sections`
   - `schemas.importContent.page.content.section`

3. **Keep `.passthrough()`** — The Zod schemas don't strip unknown fields; they just add baseline structure checks. Deep validation remains with `validateContent()`.

**Note:** This phase is the most project-specific — the Zod `sectionSchema` shape matches the current DS's section structure. If generalization across different DS packages is a concern, this phase could be deferred or made configurable.

---

## File Change Summary

| File                                        | Change Type | Description                                                                                                                                               |
| ------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shared/storyblok-services/src/validate.ts` | **New**     | `buildValidationRules()`, `validateContent()`, convenience wrappers, `ValidationResult` type                                                              |
| `shared/storyblok-services/src/schema.ts`   | Modify      | Refactor `prepareSchemaForOpenAi()` to accept schema-derived rules instead of hardcoded constants; deprecate `SUPPORTED_COMPONENTS` / `SUB_COMPONENT_MAP` |
| `shared/storyblok-services/src/index.ts`    | Modify      | Re-export new validate module                                                                                                                             |
| `storyblok-mcp/src/index.ts`                   | Modify      | Load validation rules at startup; add validation calls in tool handlers; update tool descriptions                                                         |
| `storyblok-mcp/src/services.ts`                | Modify      | Add validation hook in `createPageWithContent()`, `importContent()`, `importContentAtPosition()`                                                          |
| `storyblok-mcp/src/config.ts`                  | Modify      | Strengthen Zod schemas with `sectionSchema` base type                                                                                                     |

## Implementation Order

1. **Phase 1** → Phase 2 (shared library: extract rules, write validator) — no MCP server changes yet, can be unit-tested in isolation
2. **Phase 3** (integrate into write tools) — this is the core deliverable
3. **Phase 4** (annotate introspection tools) — reduces LLM errors upstream
4. **Phase 5** (tool descriptions) — low effort, high impact
5. **Phase 6** (Zod schemas) — optional, project-specific polish; skip or defer if cross-DS portability is a priority

Phases 4 and 5 are independent of Phases 1–3 and can be done in parallel.

## Testing Strategy

1. **Unit tests for `buildValidationRules()`** — Test with:

   - The `ds-agency-premium` page dereffed schema → verify it discovers `section.components` as a container slot with 27 allowed types, `mosaic.tile` as a nested slot, etc.
   - A minimal synthetic schema → verify the walker generalizes (e.g. a root schema with a different array field name, or a different nesting depth).
   - Schemas with no container arrays → verify it produces empty rules without crashing.

2. **Unit tests for `validateContent()`** — Test with:

   - Valid content with top-level components (should pass)
   - Content with `tile` as direct section child (should fail with actionable message)
   - Content with `mosaic` containing `tile` children (should pass)
   - Unknown component type (should fail)
   - Mixed valid/invalid content (should report all errors)
   - Both Design System format and Storyblok-flattened format
   - Non-page content types (blog-post structure, etc.)

3. **Integration tests for write tools** — Test that:

   - `create_page_with_content` with valid sections succeeds
   - `create_page_with_content` with misplaced sub-components returns validation error (not a Storyblok API error)
   - Content from `generate_content` (both `sectionCount` and `componentType` modes) passes validation without modification
   - `create_story` with non-page content type is not incorrectly rejected

4. **Regression test** — Replay the actual `tile`-in-`section` scenario that prompted this plan, confirming it is now rejected.

5. **Cross-DS smoke test** — If feasible, run `buildValidationRules()` against a dereffed schema from a different kickstartDS-based Design System to verify generalization.

## Open Questions

1. **Strictness level** — Should validation be a hard block (reject + error) or a soft warning (warn + proceed)? Recommendation: hard block by default, with a `skipValidation: boolean` escape hatch parameter on each tool for power users who know what they're doing.

2. **Schema versioning** — The dereferenced schema is static at build time. If components are added/removed in Storyblok without rebuilding the MCP server, validation rules become stale. Should the server re-derive rules from the live Storyblok schema periodically? Recommendation: no, for now. The JSON Schema is the source of truth, and changes should go through the build pipeline (`npm run create-storyblok-config` → `npm run push-components`).

3. **Multiple root schemas** — Currently only `page.schema.dereffed.json` is shipped in `storyblok-mcp/schemas/`. Should we also ship and validate against dereffed schemas for `blog-post`, `event-detail`, etc.? Recommendation: start with the page schema (covers the vast majority of write operations), then add others as needed. The `buildValidationRules()` function already supports any root schema.

4. **Cross-DS portability** — When a different project uses a different Design System package (not `ds-agency-premium`), the schema structure may differ significantly. The `buildValidationRules()` walker must be tested against schemas from other DS packages. Recommendation: add a few test fixtures from different DS packages to ensure the walker generalizes correctly.

5. **Standalone component generation workflow** — The `generate_content` → `componentType` path currently wraps the result in a page/section envelope (via `getComponentPresetSchema`). An LLM might want to generate a component, inspect/edit it, then compose it into a page. Should write tools accept "unwrapped" component objects and automatically place them into the correct container structure? Recommendation: defer this — it would be a new tool feature, not a validation concern. For now, content must arrive in a schema-valid structure (which `generate_content` already produces).
