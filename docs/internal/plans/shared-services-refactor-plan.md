# Shared Services Refactor Plan

> **Status: ✅ Completed** — All 8 phases have been implemented. The shared library `@kickstartds/storyblok-services` now contains `schema.ts`, `transform.ts`, `pipeline.ts`, `validate.ts`, `registry.ts`, `assets.ts`, `patterns.ts`, `guidance.ts`, `plan.ts`, and `generate-section.ts`. The MCP server, n8n nodes, and the Prompter's API routes (`/api/prompter/*`) all consume these shared modules.

## Problem Statement

The `PrompterComponent.tsx` contains ~400 lines of critical business logic for AI content generation and Storyblok import that is **not shared** with the MCP server or n8n nodes. This forces every consumer to either:

- Reinvent the wheel (the Prompter's schema prep + response transforms)
- Skip the transforms entirely (MCP/n8n today), producing malformed content

Three major pieces of logic are trapped inside the React component:

1. **Schema preparation for OpenAI** — 13 transformation passes to make the Design System JSON Schema compatible with OpenAI's structured output
2. **Response post-processing** — reversing the `type__X` mangling, merging component defaults
3. **Storyblok flattening** — converting nested props to Storyblok's flat `key_subKey` format before import

All three should live in `@kickstartds/storyblok-services` so MCP, n8n, API routes, and the Prompter all share one source of truth.

---

## Phase 1: Schema Preparation for OpenAI

**New file:** `shared/storyblok-services/src/schema.ts`

Extracts the `useMemo` schema logic from `PrompterComponent.tsx` (lines 410–670) into pure, framework-free functions.

### Exports

| Function                                              | Description                                                                                                                                                                                             |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prepareSchemaForOpenAi(pageSchema, options?)`        | Takes a dereffed page schema + options (`{ sections?, allowedComponents?, propertiesToDrop? }`) and applies all 13 transformation passes. Returns `{ name, strict, schema }` envelope ready for OpenAI. |
| `getComponentPresetSchema(pageSchema, componentName)` | Returns a single-component OpenAI-ready schema (replaces n8n's hand-written JSON presets). Derived dynamically from the same pipeline.                                                                  |
| `listAvailableComponents()`                           | Returns the list of supported component names.                                                                                                                                                          |

### Transformation passes to extract

- [x] `collectSchemas` — index component schemas by `type.const`
- [x] `addTypeConsts` — add discriminator `type: { const: "hero" }` to `anyOf` variants
- [x] `filterComponents` — whitelist only supported components
- [x] `deleteConsts` — replace `const` properties with `type__<name>` string properties (OpenAI doesn't support `const`)
- [x] `removeImageFormatProperties` — strip `format: "image"` / `format: "video"`
- [x] `removeIconProperties` — drop `icon` properties entirely
- [x] `removeUnsupportedProperties` — drop layout/styling props (`backgroundColor`, `textColor`, etc.)
- [x] `removeUnsupportedKeywords` — strip `format`, `minItems`, `maxItems`, `examples`, `default`, `$id`, `$schema`
- [x] `removeEmptyObjects` — remove object properties with no children left
- [x] `denyAdditionalProperties` — set `additionalProperties: false` everywhere
- [x] `makeRequired` — make all remaining properties required (OpenAI strict mode)
- [x] `collectProperties` + `countDepth` + `countEnums` — validation against OpenAI limits (< 5000 props, < 1000 enum values)

### Static data to extract

- [x] `unsupportedKeywords` array
- [x] `propertiesToDrop` array
- [x] `components` whitelist array
- [x] `subComponentMap` (downloads→download, faq→questions, etc.)
- [x] `getSchemaName()` utility

### Dependencies to add to `package.json`

- [x] `json-schema-traverse`
- [x] `object-traversal`

### Checklist

- [x] Create `shared/storyblok-services/src/schema.ts`
- [x] Implement `prepareSchemaForOpenAi()`
- [x] Implement `getComponentPresetSchema()`
- [x] Implement `listAvailableComponents()`
- [x] Add unit tests in `shared/storyblok-services/test/schema.test.ts`
- [x] Add dependencies to `shared/storyblok-services/package.json`

---

## Phase 2: Response Post-Processing & Storyblok Flattening

**New file:** `shared/storyblok-services/src/transform.ts`

Extracts `processResponse` (lines 240–278), `processPage` (lines 296–315), and `flattenNestedObjects` (lines 950–965) from `PrompterComponent.tsx`.

### Exports

| Function                                      | Description                                                                                                                                                                                                                                                       |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `processOpenAiResponse(response, schemaMap?)` | Takes raw OpenAI output, reverses `type__X` → `type: X`, merges component defaults from schema. Returns Design System–shaped props.                                                                                                                               |
| `processForStoryblok(page)`                   | Takes DS-shaped props, flattens nested objects to `key_subKey`, moves `type` → `component` (and deletes `type`), adds `aiDraft: true` on sections. A final safety pass strips `type` from any node that already has `component`. Returns Storyblok-ready content. |
| `flattenNestedObjects(obj)`                   | Utility: flattens one level of nested objects using `_` separator. Skips objects with `type` or `component` (component blocks).                                                                                                                                   |
| `unflattenNestedObjects(obj)`                 | Reverse utility: `key_subKey` → `{ key: { subKey } }`.                                                                                                                                                                                                            |

### Dependencies to add to `package.json`

- [x] `deepmerge`
- [x] `@kickstartds/cambria` (for `defaultObjectForSchema`)

### Risk: `@kickstartds/cambria` compatibility

- [x] Verify `defaultObjectForSchema` works in pure Node.js (no browser/React dependencies)
- [x] If browser-only, extract the relevant logic into a standalone function

### Checklist

- [x] Create `shared/storyblok-services/src/transform.ts`
- [x] Implement `processOpenAiResponse()`
- [x] Implement `processForStoryblok()`
- [x] Implement `flattenNestedObjects()` / `unflattenNestedObjects()`
- [x] Add unit tests in `shared/storyblok-services/test/transform.test.ts`
- [x] Add dependencies to `shared/storyblok-services/package.json`

---

## Phase 3: High-Level Orchestrator

**New file:** `shared/storyblok-services/src/pipeline.ts`

A "one call does it all" API for consumers who don't need fine-grained control.

### Exports

| Function                                     | Description                                                                                                                                                                                                                                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `generateAndPrepareContent(client, options)` | End-to-end pipeline: user prompt → `prepareSchemaForOpenAi` → `generateStructuredContent` → `processOpenAiResponse` → `processForStoryblok`. Returns `{ designSystemProps, storyblokContent }`.                                                                                                  |
| `generateRootFieldContent(client, options)`  | Generates a single root-level field (e.g. `head`, `aside`, `cta`). Extracts the field's sub-schema, generates via OpenAI, injects component types via `injectRootFieldComponentTypes`, runs `processForStoryblok`, and wraps in an array. Returns `{ designSystemProps, storyblokContent: [] }`. |
| `generateSeoContent(client, options)`        | Generates SEO metadata for a content type's `seo` field. Delegates to `generateRootFieldContent` with a specialized SEO-expert system prompt.                                                                                                                                                    |

### Checklist

- [x] Create `shared/storyblok-services/src/pipeline.ts`
- [x] Implement `generateAndPrepareContent()`
- [x] Add unit tests in `shared/storyblok-services/test/pipeline.test.ts`

---

## Phase 4: Update shared library barrel export

**File:** `shared/storyblok-services/src/index.ts`

### Checklist

- [x] Re-export all new functions from `schema.ts`
- [x] Re-export all new functions from `transform.ts`
- [x] Re-export all new functions from `pipeline.ts`
- [x] Run `npm run build` to verify dual CJS/ESM output
- [x] Run `npm test` to verify all tests pass

---

## Phase 5: Update MCP Server

**Files:** `storyblok-mcp/src/index.ts`, `storyblok-mcp/src/services.ts`

Only `generate_content`, `import_content`, and `import_content_at_position` tools are affected.

### `generate_content` changes

- [x] Add optional `componentType` parameter (e.g. `"hero"`, `"faq"`) — when provided, auto-derives the schema internally so the user doesn't need to supply one
- [x] Add optional `sectionCount` parameter — for full-page generation with N sections
- [x] Make existing `schema` parameter **optional** (still supported for custom schemas)
- [x] When `componentType` or `sectionCount` is provided, call `prepareSchemaForOpenAi()` / `getComponentPresetSchema()` from shared lib
- [x] After generation, automatically run `processOpenAiResponse()` on the result
- [x] Return both raw Design System props and Storyblok-ready content in the response

### `import_content` / `import_content_at_position` changes

- [x] Before writing to Storyblok, automatically run `processForStoryblok()` on incoming sections
- [x] Add optional `skipTransform: boolean` parameter (escape hatch for pre-flattened content)
- [x] Update tool descriptions to reflect the new automatic transformation

### `ContentGenerationService` changes in `services.ts`

- [x] Add method `generateWithSchema(options)` that uses the shared pipeline
- [x] Wire `processForStoryblok()` into `importContent()` and `importContentAtPosition()`

### Checklist

- [x] Update `generate_content` tool definition (inputSchema + description)
- [x] Update `generate_content` handler in switch/case
- [x] Update `import_content` handler to call `processForStoryblok()`
- [x] Update `import_content_at_position` handler to call `processForStoryblok()`
- [x] Update `ContentGenerationService` in `services.ts`
- [x] Update `StoryblokService.importContent()` in `services.ts`
- [x] Test with MCP client

---

## Phase 6: Update n8n Nodes

**Files:** `n8n-nodes-storyblok-kickstartds/nodes/StoryblokKickstartDs/`

### Generate operation changes

- [x] Replace hand-written preset JSON schemas with `getComponentPresetSchema()` calls from shared lib
- [x] Add new preset option **"Full Page"** that uses `prepareSchemaForOpenAi()` with configurable section count
- [x] Add `sectionCount` parameter (visible when preset = "Full Page")
- [x] After generation, run `processOpenAiResponse()` automatically
- [x] Return both Design System props and Storyblok-ready content

### Import operation changes

- [x] Automatically run `processForStoryblok()` before writing to Storyblok
- [x] Add **"Already formatted for Storyblok"** toggle to skip the transform
- [x] Update description to reflect automatic transformation

### Cleanup

- [x] Delete `schemas/` directory (9 hand-written JSON files become dead code)
- [x] Update `GenericFunctions.ts` — replace `PRESET_SCHEMAS` with shared lib calls
- [x] Update `descriptions/GenerateContentDescription.ts` — add Full Page option + section count
- [x] Update `descriptions/ImportContentDescription.ts` — add skip-transform toggle
- [x] Update `StoryblokKickstartDs.node.ts` — wire transforms into execute functions

### Checklist

- [x] Update `GenericFunctions.ts`
- [x] Update `GenerateContentDescription.ts`
- [x] Update `ImportContentDescription.ts`
- [x] Update `StoryblokKickstartDs.node.ts`
- [x] Delete `schemas/` directory
- [x] Run n8n node tests

---

## Phase 7: Simplify PrompterComponent

**File:** `components/prompter/PrompterComponent.tsx`

Refactor to import from `@kickstartds/storyblok-services` instead of containing inline logic.

### Lines to remove/replace

- [x] Remove `unsupportedKeywords` array (~lines 82–93)
- [x] Remove `propertiesToDrop` array (~lines 95–119)
- [x] Remove `components` whitelist array (~lines 121–149)
- [x] Remove `subComponentMap` (~lines 151–161)
- [x] Remove `schemaMap` (~lines 196–236)
- [x] Replace `processResponse()` (~lines 240–278) with import from shared lib
- [x] Replace `processPage()` + `flattenNestedObjects()` (~lines 296–315, 950–965) with import from shared lib
- [x] Replace entire `useMemo` schema block (~lines 410–670) with single call to `prepareSchemaForOpenAi()`
- [x] Keep: `componentMap`, `Page` component, `processStory`, and all React/UI code

### Expected reduction

~350 lines of business logic replaced by ~15 lines of imports + function calls.

### Checklist

- [x] Add imports from `@kickstartds/storyblok-services`
- [x] Replace `useMemo` with `prepareSchemaForOpenAi()` call
- [x] Replace `processResponse()` with `processOpenAiResponse()` call
- [x] Replace `processPage()` with `processForStoryblok()` call
- [x] Remove dead code (arrays, maps, inline functions)
- [x] Verify Prompter still works in Storyblok Visual Editor

---

## Page Schema Bundling Decision

The dereffed page schema (`page.schema.dereffed.json`) is the source input for all schema transformations.

### Options

| Option                            | Pros                                              | Cons                                            |
| --------------------------------- | ------------------------------------------------- | ----------------------------------------------- |
| **A: Bundle in shared lib**       | Zero config for consumers; single source of truth | Increases package size; couples to DS version   |
| **B: Pass at runtime**            | Flexible; consumers can use any DS version        | Shifts burden to every consumer; easy to forget |
| **C: Hybrid (bundle + override)** | Best of both; ship a default, accept custom       | Slightly more API surface                       |

### Recommendation

- [x] Go with **Option C**: ship the schema as a default export from `@kickstartds/storyblok-services/schema`, but accept an optional `pageSchema` parameter in all functions. When omitted, use the bundled default.

---

## File Change Summary

| Location                                                   | Action                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------- |
| `shared/storyblok-services/src/schema.ts`                  | **Create**                                              |
| `shared/storyblok-services/src/transform.ts`               | **Create**                                              |
| `shared/storyblok-services/src/pipeline.ts`                | **Create**                                              |
| `shared/storyblok-services/src/validate.ts`                | **Create** — schema-driven content validation (Phase 7) |
| `shared/storyblok-services/src/index.ts`                   | **Update** — re-export new modules                      |
| `shared/storyblok-services/package.json`                   | **Update** — add deps                                   |
| `shared/storyblok-services/test/schema.test.ts`            | **Create**                                              |
| `shared/storyblok-services/test/transform.test.ts`         | **Create**                                              |
| `shared/storyblok-services/test/pipeline.test.ts`          | **Create**                                              |
| `storyblok-mcp/src/index.ts`                                  | **Update** — tool defs + handlers                       |
| `storyblok-mcp/src/services.ts`                               | **Update** — wire shared transforms                     |
| `storyblok-n8n/.../GenericFunctions.ts`                        | **Update** — replace static presets                     |
| `storyblok-n8n/.../schemas/`                                   | **Delete** — 9 JSON files                               |
| `storyblok-n8n/.../descriptions/GenerateContentDescription.ts` | **Update**                                              |
| `storyblok-n8n/.../descriptions/ImportContentDescription.ts`   | **Update**                                              |
| `storyblok-n8n/.../StoryblokKickstartDs.node.ts`               | **Update**                                              |
| `components/prompter/PrompterComponent.tsx`                | **Update** — simplify                                   |

---

## Risks & Mitigations

| Risk                                                                         | Impact                                     | Mitigation                                                                                       |
| ---------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `@kickstartds/cambria` has browser-only dependencies                         | `processOpenAiResponse` fails in Node.js   | Test early; extract `defaultObjectForSchema` logic if needed                                     |
| Bundled page schema grows stale vs DS updates                                | Generated content mismatches component API | CI check that compares bundled schema hash to DS package                                         |
| Existing MCP/n8n users rely on current raw output format                     | Breaking change for automation workflows   | Version bump; `skipTransform` escape hatch; document migration                                   |
| n8n hand-written preset schemas are intentionally simpler (lower token cost) | Dynamic schemas may be more expensive      | Add a `simplified: boolean` option to `getComponentPresetSchema()` that strips more aggressively |
