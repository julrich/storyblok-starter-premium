# Multi-Content-Type Support — Implementation Checklist

> **Status: ✅ FULLY IMPLEMENTED** — All phases complete. Checkboxes below reflect the plan at time of writing; all items have been implemented.

Tracking document for implementing all phases from
[multi-content-type-plan.md](../plans/multi-content-type-plan.md).

Implementation order follows the dependency chain:
Phase 1 → 2 → 5 → 3 → 4 → 6 → 7 → 8 → 9

---

## Phase 1 — Schema Registry

- [ ] **1.1** Create `shared/storyblok-services/src/registry.ts` with `ContentTypeEntry` interface
- [ ] **1.2** Implement `SchemaRegistry` class (`register`, `get`, `has`, `listContentTypes`, `listSectionBasedTypes`, `listFlatTypes`, `page` getter)
- [ ] **1.3** Implement `createRegistryFromDirectory()` helper (load `*.schema.dereffed.json` from `node_modules` by allowlist)
- [ ] **1.4** Auto-derive `hasSection` and `rootArrayFields` from each schema during registration (via `buildValidationRules`)
- [ ] **1.5** Export `SchemaRegistry`, `ContentTypeEntry`, `createRegistryFromDirectory` from `shared/storyblok-services/src/index.ts`
- [ ] **1.6** Replace `PAGE_SCHEMA` / `PAGE_VALIDATION_RULES` in `storyblok-mcp/src/services.ts` with registry (keep aliases for backward compat)
- [ ] **1.7** Update `rules_rootMatchesSchema()` in `storyblok-mcp/src/services.ts` to consult registry (detect content type from `content.component`, look up matching rules)
- [ ] **1.8** Verify shared services package compiles cleanly (`npx tsc --noEmit`)
- [ ] **1.9** Verify MCP server compiles cleanly (`npx tsc --noEmit`)

## Phase 2 — Generalize Schema Preparation

- [ ] **2.1** Add `rootArrayField` option to `PrepareSchemaOptions` in `shared/storyblok-services/src/schema.ts`
- [ ] **2.2** Add `rootPropertiesToExclude` option to `PrepareSchemaOptions`
- [ ] **2.3** Guard `delete header` / `delete footer` — only delete if property exists, replace with configurable `rootPropertiesToExclude`
- [ ] **2.4** Implement `detectDefaultExcludes()` helper (header, footer, token, seo → exclude; everything else → include)
- [ ] **2.5** Replace hardcoded `clonedSchema.properties.section.minItems/maxItems` with dynamic root array field discovery (use `rootArrayField` option or first root array)
- [ ] **2.6** Replace hardcoded `section.items.properties.components.items` path with dynamic iteration over all root array fields; inject type consts into any polymorphic `anyOf` slots found
- [ ] **2.7** Change envelope `name` from hardcoded `"page_response"` to dynamic `"${contentType}_response"`
- [ ] **2.8** Generalize `getComponentPresetSchema()` to search all polymorphic slots via `ValidationRules.containerSlots` instead of hardcoded `section.items.properties.components.items.anyOf`
- [ ] **2.9** Add unit tests: `prepareSchemaForOpenAi` with blog-post schema (has section + extra root fields)
- [ ] **2.10** Add unit tests: `prepareSchemaForOpenAi` with event-detail schema (no section, multiple monomorphic arrays)
- [ ] **2.11** Verify shared services package compiles cleanly

## Phase 5 — Transform & Import Generalization

_Note: Numbered as Phase 5 per the PRD but implemented third in dependency order._

- [ ] **5.1** Confirm `processForStoryblok()` in `shared/storyblok-services/src/transform.ts` has no hardcoded field names (expected: already generic — verify, no code change)
- [ ] **5.2** Update `StoryblokService.createPageWithContent()` in `storyblok-mcp/src/services.ts` — accept `contentType` param, use dynamic `component` value and root array field name from registry
- [ ] **5.3** Update `StoryblokService.importContentAtPosition()` — accept `contentType` and `targetField` params, read/write the correct root array from the schema instead of hardcoded `section`
- [ ] **5.4** Update `StoryblokService.importByPrompterReplacement()` — search for prompter in the correct root array(s) based on content type
- [ ] **5.5** Update asset URL rewriting wrappers — use dynamic root array key instead of hardcoded `{ section: ... }`
- [ ] **5.6** Update section-level annotations (setting `component: "section"`, deleting `type`) — only apply to arrays that are section-typed containers, not all root arrays
- [ ] **5.7** Relax Zod schemas in `storyblok-mcp/src/config.ts` — replace hardcoded `section: z.array(sectionSchema)` in `import_content` schema with `z.record(z.unknown())` for the content envelope; move structural validation to runtime via registry
- [ ] **5.8** Relax Zod schemas for `import_content_at_position` — accept `targetField` param, rename `sections` to a more generic name or keep with updated description
- [ ] **5.9** Verify MCP server compiles cleanly

## Phase 3 — Tier 1 MCP Tools (Section-Based Content Types)

### 3.1 `generate_content`

- [ ] **3.1.1** Add `contentType` param to Zod schema in `storyblok-mcp/src/config.ts` (default: `"page"`)
- [ ] **3.1.2** Update handler in `storyblok-mcp/src/index.ts` — look up schema from registry, pass to `generateAndPrepareContent()` as `pageSchema`
- [ ] **3.1.3** For Tier 1: `componentType` and `sectionCount` continue targeting `section.components` slot — verify no code change needed
- [ ] **3.1.4** Update tool description to mention supported content types

### 3.2 `generate_section`

- [ ] **3.2.1** Add optional `contentType` param to Zod schema (default: `"page"`)
- [ ] **3.2.2** Pass `contentType` through to `generate_content` in handler
- [ ] **3.2.3** Update tool description

### 3.3 `plan_page`

- [ ] **3.3.1** Add `contentType` param to Zod schema (default: `"page"`)
- [ ] **3.3.2** Replace `PAGE_VALIDATION_RULES.containerSlots.get("section.components")` with registry lookup: `registry.get(contentType).rules.containerSlots`
- [ ] **3.3.3** For Tier 1: plan section sequences using the content type's available components
- [ ] **3.3.4** Update tool description

### 3.4 `create_page_with_content`

- [ ] **3.4.1** Add `contentType` param to Zod schema (default: `"page"`)
- [ ] **3.4.2** Add `rootFields` param to Zod schema (optional `z.record(z.unknown())` for extra root-level fields like blog-post's `head`, `aside`, `cta`)
- [ ] **3.4.3** Update handler — use `contentType` as `component` value in content envelope
- [ ] **3.4.4** Update handler — wrap sections under schema-derived root array field name
- [ ] **3.4.5** Update handler — merge `rootFields` into content envelope
- [ ] **3.4.6** Validate against the correct content type's rules from registry
- [ ] **3.4.7** Update tool description

### 3.5 `import_content`

- [ ] **3.5.1** Add `contentType` param to Zod schema (default: `"page"`)
- [ ] **3.5.2** Update handler — look up root array field from registry, search for prompter in correct array
- [ ] **3.5.3** Validate imported content against correct rules
- [ ] **3.5.4** Update tool description

### 3.6 `import_content_at_position`

- [ ] **3.6.1** Add `contentType` param to Zod schema (default: `"page"`)
- [ ] **3.6.2** Add `targetField` param to Zod schema (optional, defaults to primary root array)
- [ ] **3.6.3** Update handler — insert into the specified or schema-derived root array
- [ ] **3.6.4** Error gracefully if target field doesn't exist or isn't an array
- [ ] **3.6.5** Update tool description

### 3.7 `create_story` / `update_story`

- [ ] **3.7.1** Update `create_story` handler — detect content type from `content.component`, look up rules from registry, validate
- [ ] **3.7.2** Update `update_story` handler — same detection and validation logic
- [ ] **3.7.3** Fall back to current behavior (skip validation) for unknown content types

### 3.8 `analyze_content_patterns`

- [ ] **3.8.1** Update `analyzeContentPatterns()` in `storyblok-mcp/src/services.ts` — look up root array fields from registry instead of hardcoding `story.content.section`
- [ ] **3.8.2** For Tier 1: iterate the schema-derived root array field name (e.g. still `section` for page/blog-post/blog-overview)
- [ ] **3.8.3** Use content type's own `rules.subComponentMap` for sub-component counting
- [ ] **3.8.4** Update unused component detection to use the content type's `rules.allKnownComponents`

### Tier 1 verification

- [ ] **3.9** Test: `generate_content(contentType: "blog-post", sectionCount: 3)` produces valid content
- [ ] **3.10** Test: `plan_page(contentType: "blog-post", intent: "...")` returns section sequence
- [ ] **3.11** Test: `create_page_with_content(contentType: "blog-post", sections: [...], rootFields: { head: ... })` creates valid story
- [ ] **3.12** Test: `analyze_content_patterns(contentType: "blog-post")` extracts blog-post patterns
- [ ] **3.13** Test: all existing page workflows still work identically (zero regressions)
- [ ] **3.14** Verify MCP server compiles cleanly

## Phase 4 — Tier 2 MCP Tools (Flat Content Types)

### 4.1 Whole-schema generation

- [ ] **4.1.1** Update `generate_content` handler — when content type is Tier 2 (no section), skip `componentType`/`sectionCount` logic; pass full root schema to pipeline
- [ ] **4.1.2** Verify `prepareSchemaForOpenAi` produces valid OpenAI envelope for event-detail schema (no section, multiple arrays)
- [ ] **4.1.3** Verify `prepareSchemaForOpenAi` produces valid OpenAI envelope for event-list schema

### 4.2 Field-level generation

- [ ] **4.2.1** Add `rootField` param to `generate_content` Zod schema (optional string)
- [ ] **4.2.2** Implement field-level schema extraction — extract a single root field's schema from the content type schema, wrap in OpenAI envelope
- [ ] **4.2.3** Handle array fields (generate items) vs object fields (generate single object) vs scalar fields (generate value)
- [ ] **4.2.4** Update tool description to document `rootField` usage

### 4.3 `plan_page` for Tier 2

- [ ] **4.3.1** When content type is Tier 2, return a **field population plan** instead of section sequence
- [ ] **4.3.2** Feed schema field names, types, and descriptions to the AI planner
- [ ] **4.3.3** Include observed patterns from `analyze_content_patterns` (typical item counts, field co-occurrence) in planner context
- [ ] **4.3.4** Return structured plan: `{ field, type, itemCount?, description }` per root field

### 4.4 `create_page_with_content` for Tier 2

- [ ] **4.4.1** When content type is Tier 2, accept `rootFields` as the primary content source (not `sections`)
- [ ] **4.4.2** Construct content envelope: `{ component: contentType, _uid, ...rootFields }`
- [ ] **4.4.3** Validate against Tier 2 content type's rules

### 4.5 `import_content_at_position` for Tier 2

- [ ] **4.5.1** When `targetField` is specified for a Tier 2 type (e.g. `locations`, `events`), insert items into that root array
- [ ] **4.5.2** Validate inserted items against the target array's item schema

### 4.6 Pattern analysis for Tier 2

- [ ] **4.6.1** Update `analyzeContentPatterns` — for Tier 2 types, iterate all root array fields (not just section)
- [ ] **4.6.2** Track field population frequency (how often each root field is populated)
- [ ] **4.6.3** Track array item counts per root array (median, min, max)
- [ ] **4.6.4** Track content archetypes based on field combinations and array sizes

### Tier 2 verification

- [ ] **4.7** Test: `generate_content(contentType: "event-detail", prompt: "...")` generates complete event-detail object
- [ ] **4.8** Test: `generate_content(contentType: "event-detail", rootField: "locations", prompt: "...")` generates only locations
- [ ] **4.9** Test: `create_page_with_content(contentType: "event-detail", rootFields: {...})` creates valid story
- [ ] **4.10** Test: `import_content_at_position(contentType: "event-detail", targetField: "locations", ...)` appends locations to existing event
- [ ] **4.11** Test: `create_story` with `content: { component: "event-detail", ... }` validates automatically
- [ ] **4.12** Verify MCP server compiles cleanly

## Phase 6 — n8n Nodes Alignment

_Note: Numbered as Phase 6 per the PRD, independent of Phases 3–5 beyond requiring the registry from Phase 1._

- [ ] **6.1** Import `SchemaRegistry` / `createRegistryFromDirectory` in `GenericFunctions.ts`
- [ ] **6.2** Replace `PAGE_SCHEMA` / `PAGE_VALIDATION_RULES` with registry in `GenericFunctions.ts`
- [ ] **6.3** Replace separate `PAGE_SCHEMA` load in `StoryblokKickstartDs.node.ts` with registry
- [ ] **6.4** Replace 9 hardcoded preset JSON schemas with dynamic `getComponentPresetSchema(registry.get(contentType).schema, componentName)`
- [ ] **6.5** Add `contentType` dropdown parameter to Generate Content operation
- [ ] **6.6** Add `contentType` dropdown parameter to Import Content operation
- [ ] **6.7** Add `contentType` dropdown parameter to Create Story operation
- [ ] **6.8** Update section-specific iteration in `GenericFunctions.ts` to use schema-derived root array fields
- [ ] **6.9** Update validation calls to use registry-derived rules per content type
- [ ] **6.10** Verify n8n nodes compile cleanly (`npx tsc --noEmit`)

## Phase 7 — Recipe & Pattern Enhancements

_Note: Numbered as Phase 7 per the PRD, depends on Phases 3 & 4 for content-type-aware tools._

### 7.1 Content-type-specific recipes

- [x] **7.1.1** Add blog-post recipes to `section-recipes.json`: "Blog Article Body" (text), "Blog Image + Text" (split-even), "Blog FAQ" (faq, exception only). Blog recipes are text/split-even-focused — no hero or cta sections (those are handled by root objects `head` and `cta`)
- [ ] **7.1.2** Add event-detail recipes: "Workshop", "Conference talk", "Webinar"
- [x] **7.1.3** Add content-type-specific anti-patterns: "Never use hero in blog-post", "Never use cta in blog-post", "Blog sections should be predominantly text/split-even". All generic recipes/templates tagged with `contentType: "page"` so they don't leak into other content types

### 7.2 `list_recipes` content type filter

- [x] **7.2.1** Add optional `contentType` param to `list_recipes` Zod schema
- [x] **7.2.2** Filter returned recipes, templates, AND anti-patterns by content type when specified
- [x] **7.2.3** Update tool description

### 7.3 Pattern cache per content type

- [ ] **7.3.1** Replace `cachedPatterns` (single value) with `patternCache: Map<string, ContentPatternAnalysis>`
- [ ] **7.3.2** Warm cache for `"page"` at startup (preserve existing behavior)
- [ ] **7.3.3** Lazy-load other content types on first request to `analyze_content_patterns`
- [ ] **7.3.4** Support `refresh: true` per content type (invalidate only that entry)

## Phase 8 — Documentation & Copilot Instructions

_Note: Numbered as Phase 8 per the PRD._

### 8.1 `.github/copilot-instructions.md`

- [ ] **8.1.1** Document schema registry and `contentType` parameter on all tools
- [ ] **8.1.2** Update recommended workflow to include `contentType` in each step
- [ ] **8.1.3** Document Tier 1 vs Tier 2 workflow differences with examples
- [ ] **8.1.4** Add blog-post and event-detail creation examples

### 8.2 MCP tool descriptions

- [ ] **8.2.1** Update `generate_content` description to list supported content types
- [ ] **8.2.2** Update `generate_section` description (Tier 1 only)
- [ ] **8.2.3** Update `plan_page` description (Tier 1 section planning + Tier 2 field planning)
- [ ] **8.2.4** Update `create_page_with_content` description (sections + rootFields)
- [ ] **8.2.5** Update `import_content` description
- [ ] **8.2.6** Update `import_content_at_position` description (targetField)
- [ ] **8.2.7** Update `create_story` / `update_story` descriptions (auto-detect validation)
- [ ] **8.2.8** Update `analyze_content_patterns` description

### 8.3 Skill docs

- [ ] **8.3.1** Update `docs/skills/plan-page-structure.md` with blog-post workflow example
- [ ] **8.3.2** Add event-detail creation workflow example to skill docs
- [ ] **8.3.3** Update MCP server README with multi-content-type section

---

## Phase 9 — Final Verification

- [ ] **9.1** Shared services package compiles cleanly (`npx tsc --noEmit`)
- [ ] **9.2** Shared services package builds cleanly (`npm run build`)
- [ ] **9.3** MCP server compiles cleanly (`npx tsc --noEmit`)
- [ ] **9.4** n8n nodes compile cleanly (`npx tsc --noEmit`)
- [ ] **9.5** All existing page workflows pass (manual smoke test)
- [ ] **9.6** Blog-post generation + creation end-to-end test
- [ ] **9.7** Event-detail generation + creation end-to-end test
- [ ] **9.8** `analyze_content_patterns` works for all 5 content types
- [ ] **9.9** Update `multi-content-type-plan.md` open questions with decisions made
