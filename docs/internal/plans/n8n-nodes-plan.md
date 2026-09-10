# Plan: n8n Nodes for Storyblok Content Generation & Import

> **Status: ✅ FULLY IMPLEMENTED** — All milestones (1–7) are complete. Since this plan was written, the n8n nodes have been updated to use `SchemaRegistry` from `@kickstartds/storyblok-services` instead of loading a single `PAGE_SCHEMA`. The `importContentIntoStory()` and `insertContentAtPosition()` functions now accept a `contentType` parameter for multi-content-type validation. The `schemas/` directory now contains all 5 dereffed root schemas (page, blog-post, blog-overview, event-detail, event-list).

## Overview

This plan covers adding two custom n8n community nodes that mirror the `generate_content` and `import_content` tools currently implemented in the Storyblok MCP server ([storyblok-mcp/src/services.ts](../storyblok-mcp/src/services.ts)). The nodes will allow n8n workflows to trigger AI-powered content generation via OpenAI and then import that content into Storyblok stories — enabling fully automated, event-driven content pipelines without an LLM intermediary.

---

## Key Considerations

### 1. Architecture: Reuse vs. Rewrite

The MCP server currently bundles both the business logic (in `StoryblokService` and `ContentGenerationService`) and the MCP transport layer (stdio for local use, Streamable HTTP for cloud deployment). Two approaches exist:

| Approach                                                                                                                                                          | Pros                                                       | Cons                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **A) Extract shared service library** — Move `services.ts`, `config.ts`, `errors.ts` into a shared npm package consumed by both the MCP server and the n8n nodes. | Single source of truth; bug fixes propagate automatically. | Requires refactoring MCP server to depend on the library; more upfront work. |
| **B) Re-implement logic directly in n8n nodes** — Copy the relevant API calls into the n8n node execute functions.                                                | Faster to ship; fully decoupled.                           | Logic duplication; divergence risk over time.                                |

**Decision:** Initially went with **Approach B** for fast delivery (Milestones 1–5). In Milestone 6, extracted the shared library (**Approach A**) — `@kickstartds/storyblok-services` — now consumed by the MCP server, n8n nodes, and Next.js API routes. All three consumers delegate core Storyblok and OpenAI logic to the shared package.

### 2. Authentication & Credentials

n8n uses a Credentials system. We implemented two custom credential types:

- **StoryblokApi** — stores `apiToken`, `oauthToken`, `spaceId` with a test connection that calls `GET /v1/spaces/{spaceId}` via the Management API.
- **OpenAiApi** — stores `apiKey` with a test connection that calls `GET /v1/models`.

### 3. Structured Output Schema Handling

`generate_content` takes a full JSON Schema as input to drive OpenAI's structured output mode. The implementation offers:

- **Auto (Design System)** mode (default) — dynamically derives OpenAI-compatible schemas from the bundled Design System page schema via `prepareSchemaForOpenAi()` / `getComponentPresetSchema()`. Supports single-component generation (`componentType`) and full-page generation (`sectionCount`). Returns both Design System–shaped props and Storyblok-ready content.
- **Preset schemas** (dropdown) for 9 common kickstartDS component types: Hero, FAQ, Testimonials, Features, CTA, Text, Blog Teaser, Stats, Image + Text. Kept for backward compatibility.
- **Custom JSON** mode for raw JSON Schema input with a custom name field.
- All schemas enforce `additionalProperties: false` and proper `required` arrays for OpenAI strict mode.

### 4. Data Flow Between Nodes

The typical workflow is:

```
Trigger → Generate Content → Import Content → (optional) Publish / Notify
```

The output of `generate_content` is a clean JSON object under `$json.generatedContent` that n8n can reference with expressions. `import_content` accepts the `page` parameter via expression.

### 5. Error Handling & Retries

- OpenAI API errors are caught and surfaced as `NodeApiError` with descriptive messages.
- Storyblok API errors include available UIDs in the error message when a prompter component is not found.
- All operations support n8n's built-in **Retry on Fail** setting for transient errors.
- Empty or invalid JSON responses from OpenAI are caught and thrown as clear errors.

### 6. n8n Community Node Packaging

The package follows the [n8n community node structure](https://docs.n8n.io/integrations/creating-nodes/):

- Package name: `n8n-nodes-storyblok-kickstartds`
- Single node with `resource: "AI Content"` and `operation: "Generate" | "Import"` (per recommendation in Open Questions #1).
- Codex metadata for n8n search discovery.

---

## Milestones

### Milestone 1: Project Scaffolding & Credentials ✅

> **Goal:** Set up the n8n community node project and implement the credential types.

- [x] Initialize n8n community node project
  - Created `n8n-nodes-storyblok-kickstartds/` directory alongside `storyblok-mcp/`
  - Set up `package.json` with `n8n.nodes` and `n8n.credentials` fields
  - Configured TypeScript (CommonJS target es2021), Jest (ts-jest), Gulp build, `.gitignore`
- [x] Implement `StoryblokApi` credential type
  - Fields: `apiToken`, `oauthToken`, `spaceId`
  - Test connection method: `GET /v1/spaces/{spaceId}` via Management API
- [x] Implement `OpenAiApi` credential type
  - Custom credential (not reusing n8n built-in, for self-contained packaging)
  - Fields: `apiKey`
  - Test connection method: `GET /v1/models`
- [x] Project builds and type-checks cleanly (`tsc --noEmit` and `tsc` both pass)

### Milestone 2: `Generate Content` Operation ✅

> **Goal:** Implement the operation that calls OpenAI with a system prompt, user prompt, and JSON Schema to produce structured content.

- [x] Create single `StoryblokKickstartDs` node class with resource/operation pattern
  - Display name: "Storyblok kickstartDS"
  - Icon: custom SVG (`storyblokKickstartDs.svg`)
  - Category: "Content & Data", subcategory: "Content Management"
  - Resource: `aiContent` ("AI Content"), Operations: `generate` | `import`
- [x] Define Generate parameters
  - `system` (string, multiline) — System prompt
  - `prompt` (string, multiline, supports expressions) — User prompt
  - `schemaMode` (options: "Preset" | "Custom JSON Schema")
  - `presetSchema` (dropdown, visible when mode = Preset) — 9 component types
  - `customSchemaName` (string, visible when mode = Custom)
  - `customSchema` (json, visible when mode = Custom)
  - `model` (options: `gpt-4o-2024-08-06`, `gpt-4o-mini`, `gpt-4-turbo`)
- [x] Implement `executeGenerate()` method
  - Validates inputs, instantiates OpenAI client, calls structured output API
  - Parses JSON response, returns as `generatedContent` with `_meta` object
- [x] Implement error handling
  - OpenAI API errors → `NodeApiError`
  - Empty AI responses → clear error message
  - Invalid JSON in response → caught and thrown
- [x] Add 9 preset schema definitions (JSON files)
  - `hero`, `faq`, `testimonials`, `features`, `cta`, `text`, `blog-teaser`, `stats`, `image-text`
- [x] Write unit tests (7 tests, all passing)
  - Preset schema validation (expected presets exist, hero requires headline/text/buttons, faq requires questions)
  - OpenAI call parameters verified
  - Empty response handling
  - Invalid JSON response handling
  - Custom schema pass-through

### Milestone 3: `Import Content` Operation ✅

> **Goal:** Implement the operation that takes generated content and writes it into a Storyblok story.

- [x] Define Import parameters with **two placement modes**
  - `storyUid` (string, supports expressions) — Story ID to update
  - `placementMode` (options: "Replace Prompter Component" | "Insert at Position")
  - `prompterUid` (string, visible when mode = prompter) — Prompter component UID to replace
  - `insertPosition` (options: "Beginning" | "End" | "Specific Index", visible when mode = position)
  - `insertIndex` (number, min 0, visible when position = index)
  - `page` (json, supports expressions) — Page content with `content.section[]`
  - `publish` (boolean, default false) — Publish immediately or save as draft
- [x] Implement `executeImport()` method with two code paths
  - **Prompter mode:** Fetches story, finds prompter by UID in `section[]`, splices in new sections (removing prompter), saves
  - **Position mode:** Fetches story, inserts sections at specified position (0 = beginning, -1 = end, or specific index), clamped to bounds, saves
  - Both paths support optional publish flag
  - Returns updated story with descriptive `_meta.placementMode` and `_meta.placementDetail`
- [x] Implement error handling
  - Story not found → clear error message
  - Prompter UID not found → error includes available UIDs for reference
  - Missing section array → created automatically in position mode, error in prompter mode
- [x] Write unit tests (13 tests, all passing)
  - **Prompter mode** (6 tests): successful replacement, publish flag, prompter not found, available UIDs in error, no section array, single section replacement
  - **Position mode** (7 tests): insert at beginning (0), append at end (-1), specific middle index, clamp oversized position, create section array if missing, no existing sections removed, publish flag

### Milestone 4: Integration Testing & Workflow Templates ✅

> **Goal:** Validate end-to-end flows and provide starter workflow templates.

- [x] Create example n8n workflow templates (JSON exports)
  - **Template 1: Manual trigger → Generate hero content → Import into story**
  - **Template 2: Webhook trigger → Generate full page (multiple sections) → Import → Slack notification**
  - **Template 3: Schedule trigger → Batch generate blog teasers → Import into overview page**
- [ ] End-to-end integration test (deferred — requires live Storyblok space + OpenAI key)
  - Would use a test Storyblok space for full generate → import → verify cycle
  - Gated behind environment variables
- [ ] Test with n8n Cloud and self-hosted n8n (deferred — requires publishing first)
- [x] Document data mapping between nodes in README
  - `$json.generatedContent` → Import Content `page` parameter
  - Expression examples for single and multi-section flows

### Milestone 5: Documentation & Publishing ⏳

> **Goal:** Publish the community node package and provide comprehensive documentation.

- [x] Write README.md for the npm package
  - Installation instructions (community nodes, manual, Docker)
  - Credential setup guide
  - Node parameter reference for both operations
  - Preset schemas table
  - Example workflows
  - Data flow and expression examples
  - Error handling reference table
  - Development guide
- [x] Add inline node documentation
  - `description` and `subtitle` for the node
  - Parameter `description` and `hint` fields
  - `codex` file (`StoryblokKickstartDs.node.json`) with categories, aliases, and subcategories
- [x] Update README with placement mode documentation (position-based insertion)
- [x] Update MCP server README to reference n8n nodes as an alternative trigger mechanism
- [ ] Publish to npm
  - Package name: `n8n-nodes-storyblok-kickstartds`
  - Verify installation via n8n community nodes UI
- [ ] Submit to n8n community nodes directory (optional)

### Milestone 6: Shared Service Library ✅

> **Goal:** Reduce duplication by extracting shared logic into a common package consumed by MCP server, n8n nodes, and Next.js API routes.

- [x] Create `@kickstartds/storyblok-services` package (`shared/storyblok-services/`)
  - Pure functions for Storyblok API: `createStoryblokClient`, `getStoryManagement`, `saveStory`, `importByPrompterReplacement`, `importAtPosition`
  - Pure functions for OpenAI API: `createOpenAiClient`, `generateStructuredContent`
  - Schema preparation for OpenAI: `prepareSchemaForOpenAi`, `getComponentPresetSchema`, `listAvailableComponents`, `getSchemaName` (13 transformation passes)
  - Content transformation: `processOpenAiResponse` (OpenAI → Design System), `processForStoryblok` (Design System → Storyblok), `flattenNestedObjects`, `unflattenNestedObjects`
  - End-to-end pipeline: `generateAndPrepareContent` (prompt → schema → generation → post-processing → Storyblok flattening)
  - Shared types: `StoryblokCredentials`, `OpenAiCredentials`, `PageContent`, `GenerateContentOptions`, `ImportByPrompterOptions`, `ImportAtPositionOptions`, `PrepareSchemaOptions`, `OpenAiSchemaEnvelope`, `PreparedSchema`, `TransformedContent`, `GenerateAndPrepareOptions`, `GenerateAndPrepareResult`
  - Typed error classes: `ServiceError`, `StoryblokApiError`, `OpenAiApiError`, `PrompterNotFoundError`, `ContentGenerationError`
  - Dual ESM + CJS build (serves ESM consumers like MCP server and CJS consumers like n8n nodes)
  - 21 unit tests (15 Storyblok + 6 OpenAI), all passing
- [x] Refactor MCP server to consume shared package
  - `StoryblokService` delegates to shared `createStoryblokClient`, `getStoryManagement`, `saveStory`, `importByPrompterReplacement`, `importAtPosition`
  - `ContentGenerationService` delegates to shared `generateStructuredContent`, `prepareSchemaForOpenAi`, `getComponentPresetSchema`, `processOpenAiResponse`, `processForStoryblok`, and `generateAndPrepareContent`
  - `generate_content` tool supports auto-schema derivation via `componentType` and `sectionCount` parameters
  - Import tools automatically run `processForStoryblok()` with `skipTransform` escape hatch
  - MCP-specific methods (ideas, list/create/delete stories, components, assets, search) remain inline
- [x] Refactor n8n nodes to consume shared package
  - `GenericFunctions.ts` reduced from ~250 lines to ~100 lines of re-exports and thin wrappers
  - Re-exports shared types and functions under n8n-facing names (e.g. `getStoryblokManagementClient` → `createStoryblokClient`)
  - Added "Auto (Design System)" schema mode that uses `prepareSchemaForOpenAi()` / `getComponentPresetSchema()` from shared lib
  - Auto mode returns `{ designSystemProps, storyblokContent, rawResponse }` — both DS-shaped and Storyblok-ready output
  - Import operation automatically runs `processForStoryblok()` with `skipTransform` escape hatch
  - `PRESET_SCHEMAS` (n8n-specific, loaded from local JSON files) retained for backward compatibility
  - Bundled `page.schema.dereffed.json` added to `schemas/` directory for auto mode
  - All 20 tests still passing
- [x] Refactor Next.js API routes to consume shared package
  - `pages/api/content/index.ts` — uses `createOpenAiClient` + `generateStructuredContent` (replaces inline `openai` import and raw API calls)
  - `pages/api/import/index.ts` — uses `createStoryblokClient` + `importByPrompterReplacement` (replaces inline `StoryblokClient` instantiation and manual story manipulation)
  - Added proper `ServiceError` handling in both routes
- [x] Upgrade all dependencies to latest major versions
  - `openai` `^4.0.0` → `^6.18.0` across shared lib, MCP server, n8n nodes, and root project
  - `storyblok-js-client` `^6.0.0` → `^7.2.3` across shared lib, MCP server, n8n nodes
  - MCP server now type-checks with **0 errors** (was 3 pre-existing errors with v6)
  - Removed `as any` casts from API routes (root project bundler resolves single copy)
- [ ] Add additional n8n nodes for other MCP tools (list_stories, search_content, etc.)

### Milestone 7: Schema Guardrails Integration ✅

> **Goal:** Validate content against the Design System schema before writing to Storyblok, catching structural errors (unknown components, nesting violations, sub-component misplacement) early.

- [x] Import `buildValidationRules`, `validateSections`, `formatValidationErrors` from `@kickstartds/storyblok-services`
- [x] Load `PAGE_VALIDATION_RULES` at module level in `GenericFunctions.ts` (same pattern as MCP server)
- [x] Add validation to `importContentIntoStory` wrapper (before `importByPrompterReplacement`)
- [x] Add validation to `insertContentAtPosition` wrapper (before `importAtPosition`)
- [x] Both wrappers accept `skipValidation` parameter (default: `false`)
- [x] Verify TypeScript compilation

#### Shared Library File Structure

```
shared/storyblok-services/
├── package.json           # @kickstartds/storyblok-services v1.0.0
├── tsconfig.json          # Type-checking config
├── tsconfig.esm.json      # ESM build → dist/esm/
├── tsconfig.cjs.json      # CJS build → dist/cjs/
├── jest.config.js
├── src/
│   ├── index.ts           # Barrel export
│   ├── types.ts           # Types & error classes
│   ├── storyblok.ts       # Storyblok API functions
│   ├── openai.ts          # OpenAI API functions
│   ├── schema.ts          # Schema preparation for OpenAI structured output (13 passes)
│   ├── transform.ts       # Content transformation (OpenAI ↔ DS ↔ Storyblok)
│   └── pipeline.ts        # High-level end-to-end orchestrator
└── test/
    ├── storyblok.test.ts  # 15 tests
    └── openai.test.ts     # 6 tests
```

#### Cross-Module Type Note

Sub-packages with their own `node_modules` (MCP server, n8n nodes) still maintain separate copies of `openai` and `storyblok-js-client`, causing TypeScript's private-property type mismatch across duplicate declarations. This requires `as any` casts when passing clients to shared library functions — specifically in `storyblok-mcp/src/services.ts` (for the OpenAI client) and in the n8n test files (for mock clients). The n8n production code in `GenericFunctions.ts` does not need casts. The Next.js API routes also do **not** need casts because the bundler resolves all imports through the root `node_modules`.

#### Dependency Versions

All packages are aligned on the latest major versions:

| Dependency            | Version   | Notes                                                                                                                                                                                                                                            |
| --------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `openai`              | `^6.18.0` | Upgraded from `^4.0.0` — same API surface for `chat.completions.create`                                                                                                                                                                          |
| `storyblok-js-client` | `^7.2.3`  | Upgraded from `^6.0.0` — breaking changes only affect `SbHelpers` (removed) and `RichTextResolver` (deprecated), neither of which are used. v7 also made request params optional, fixing a pre-existing `delete()` type error in the MCP server. |

The root project's `openai` was also updated from `^6.16.0` to `^6.18.0` for consistency.

---

## Actual File Structure

```
shared/storyblok-services/              # Shared service library (Milestone 6)
├── package.json                        # @kickstartds/storyblok-services
├── tsconfig.json / tsconfig.esm.json / tsconfig.cjs.json
├── jest.config.js
├── src/
│   ├── index.ts                        # Barrel export
│   ├── types.ts                        # Types & error classes
│   ├── storyblok.ts                    # Storyblok API functions
│   ├── openai.ts                       # OpenAI API functions
│   ├── schema.ts                       # Schema preparation for OpenAI (13 passes)
│   ├── transform.ts                    # Content transformation (OpenAI ↔ DS ↔ Storyblok)
│   ├── validate.ts                     # Schema-driven content validation (Milestone 7)
│   └── pipeline.ts                     # High-level end-to-end orchestrator
└── test/
    ├── storyblok.test.ts               # 15 tests
    └── openai.test.ts                  # 6 tests

n8n-nodes-storyblok-kickstartds/
├── package.json
├── package-lock.json
├── tsconfig.json
├── jest.config.js
├── gulpfile.js
├── .gitignore
├── README.md
├── credentials/
│   ├── StoryblokApi.credentials.ts
│   └── OpenAiApi.credentials.ts
├── nodes/
│   └── StoryblokKickstartDs/
│       ├── StoryblokKickstartDs.node.ts        # Single node with resource/operation pattern
│       ├── StoryblokKickstartDs.node.json       # Codex file (search metadata)
│       ├── storyblokKickstartDs.svg             # Node icon
│       ├── GenericFunctions.ts                  # Re-exports from shared lib + PRESET_SCHEMAS
│       ├── descriptions/
│       │   ├── GenerateContentDescription.ts    # Parameter definitions for Generate (incl. Auto mode)
│       │   └── ImportContentDescription.ts      # Parameter definitions for Import (incl. skipTransform)
│       └── schemas/
│           ├── page.schema.dereffed.json         # Bundled DS page schema for auto-schema mode
│           ├── hero.schema.json
│           ├── faq.schema.json
│           ├── testimonials.schema.json
│           ├── features.schema.json
│           ├── cta.schema.json
│           ├── text.schema.json
│           ├── blog-teaser.schema.json
│           ├── stats.schema.json
│           └── image-text.schema.json
├── test/
│   ├── GenerateContent.test.ts                  # 7 tests
│   └── ImportContent.test.ts                    # 13 tests (6 prompter + 7 position)
└── workflows/
    ├── template-1-manual-hero.json
    ├── template-2-webhook-full-page.json
    └── template-3-scheduled-batch-blog-teasers.json
```

---

## Resolved Decisions

These questions from the original plan have been resolved during implementation:

1. **Single node with operations vs. two separate nodes?** → **Single node** with `resource: "AI Content"` and `operation: "Generate" | "Import"`. Consistent with n8n conventions.

2. **Preset schemas scope** → 9 presets: Hero, FAQ, Testimonials, Features, CTA, Text, Blog Teaser, Stats, Image + Text. Covers the most commonly generated kickstartDS component types.

3. **Publish behavior** → The Import operation has a `publish` boolean toggle (default: false/draft). This goes beyond the MCP server, which always saves as draft.

4. **Placement flexibility** → The Import operation supports two placement modes:

   - **Replace Prompter** — original behavior, replaces a prompter component by UID
   - **Insert at Position** — added as an alternative for stories without a prompter; inserts at beginning, end, or specific index without removing existing content

5. **Webhook-driven generation** → Supported via workflow templates (Template 2 uses webhook trigger). The n8n node itself is trigger-agnostic.

6. **Rate limiting strategy** → Relies on n8n's built-in **Retry on Fail** and **Split in Batches** nodes rather than implementing internal throttling.
