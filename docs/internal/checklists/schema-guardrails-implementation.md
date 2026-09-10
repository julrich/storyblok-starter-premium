# Schema Guardrails Implementation Progress

> **Status: ✅ FULLY IMPLEMENTED** — All phases complete. Subsequently extended with multi-content-type support: `PAGE_VALIDATION_RULES` singleton replaced by `SchemaRegistry` (`shared/storyblok-services/src/registry.ts`) which builds per-content-type validation rules for all 5 root types (page, blog-post, blog-overview, event-detail, event-list).

## Phase 1: Extract Validation Rules from JSON Schema

- [x] Read and understand existing schema, transform, and pipeline code
- [x] Read MCP server code (index.ts, services.ts, config.ts)
- [x] Create `shared/storyblok-services/src/validate.ts` with `buildValidationRules()`
- [x] Implement `containerSlots`, `componentToSlots`, `allKnownComponents`, `rootArrayFields` extraction
- [x] Deprecate `SUPPORTED_COMPONENTS` and `SUB_COMPONENT_MAP` in schema.ts
- [x] Refactor `prepareSchemaForOpenAi()` to accept schema-derived rules

## Phase 2: Create Validation Function

- [x] Implement `validateContent()` in validate.ts
- [x] Implement `ValidationResult` and `ValidationError` types
- [x] Support both Design System and Storyblok-flattened formats
- [x] Add `strict` and `format` options
- [x] Add convenience wrappers (`validateSections`, `validatePageContent`)
- [x] Implement `formatValidationErrors()` helper

## Phase 3: Integrate Validation into Write Tools

- [x] Load validation rules at MCP server startup in services.ts
- [x] Add validation to `create_page_with_content`
- [x] Add validation to `import_content`
- [x] Add validation to `import_content_at_position`
- [x] Add validation to `create_story`
- [x] Add validation to `update_story`
- [x] Implement content-type detection for generic tools

## Phase 4: Annotate Component Introspection Tools

- [x] Annotate `list_components` output with nesting rules
- [x] Annotate `get_component` output with composition_rules
- [x] Update introspection tool descriptions

## Phase 5: Improve Tool Descriptions as Guardrails

- [x] Update `create_page_with_content` description
- [x] Update `create_story` description
- [x] Update `import_content` / `import_content_at_position` descriptions
- [x] Update `generate_content` description

## Phase 6: Update Zod Schemas for Stronger Typing

- [x] Define base `sectionSchema` in config.ts
- [x] Replace `z.array(z.record(z.unknown()))` with `z.array(sectionSchema)` in affected schemas
- [x] Ensure `.passthrough()` is used

## Final

- [x] Update shared services index.ts exports
- [x] Verify TypeScript compilation

## Phase 7: Propagate Validation to Other Consumers

- [x] Add validation to n8n `importContentIntoStory` wrapper in GenericFunctions.ts
- [x] Add validation to n8n `insertContentAtPosition` wrapper in GenericFunctions.ts
- [x] Load `PAGE_VALIDATION_RULES` at module level in GenericFunctions.ts
- [x] Add validation to Next.js API import route (`pages/api/import/index.ts`)
- [x] Verify n8n node TypeScript compilation
- [x] Update MCP server README with validation section and updated tool tables
- [x] Update `shared-services-refactor-plan.md` file change summary
- [x] Update `copilot-instructions.md` with validation references

## Phase 8: Enforce `type` / `component` Discriminator Duality

- [x] `processForStoryblok()` deletes `type` after moving to `component` (no dual discriminators)
- [x] Section-level annotations explicitly `delete section.type` after setting `component`
- [x] Final safety traversal strips `type` from any node that already has `component`
- [x] `flattenNestedObjects()` also checks `!child.component` (not just `!child.type`) to protect Storyblok-format blocks
- [x] `validateNode()` flags nodes with both `component` and `type` in Storyblok/auto format
- [x] Updated docs: shared services README, shared-services-refactor-plan, MCP README, copilot-instructions
