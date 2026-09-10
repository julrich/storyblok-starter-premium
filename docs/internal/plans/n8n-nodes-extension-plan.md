# Plan: n8n Nodes Extension — From 2 Operations to Full Storyblok Toolkit

> **Status:** ✅ IMPLEMENTED — All milestones (M8–M13) completed. The n8n node now provides 22 operations across 3 resources. See the [extension checklist](../checklists/n8n-nodes-extension-checklist.md) for per-item tracking.

## Overview

The n8n node currently exposes **22 operations** across **3 resources** (AI Content, Story, Space), covering the full MCP server tool surface. The [12 documented workflows](../../guides/content-operations-workflows.md) can now use native n8n node operations directly.

This plan adds **19 new operations** across **3 resources**, turning the node into a full Storyblok content operations toolkit while preserving full backward compatibility with existing workflows.

---

## Architecture Decision: Resources & Operations

### Why resources, not separate nodes?

n8n convention favors a single node with multiple resources when the operations share the same service and credentials. This keeps workflow canvases clean (one node icon = one integration) and avoids credential duplication. The precedent is the official n8n Notion, Airtable, and HubSpot nodes.

### Resource Structure

The existing single-resource node expands to **3 resources** within the same `StoryblokKickstartDs` node class:

| Resource                  | Operations                                                                                                             | Credentials Required              | Purpose                             |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ----------------------------------- |
| **AI Content** (existing) | Generate, Import, **Generate Section**, **Plan Page**, **Analyze Patterns**, **Generate Root Field**, **Generate SEO** | Storyblok + OpenAI                | AI-powered content generation       |
| **Story** (new)           | List, Get, Create, Create Page, Update, Delete, Search                                                                 | Storyblok only                    | Story CRUD & search                 |
| **Space** (new)           | List Components, Get Component, List Assets, List Recipes, List Icons, Scrape URL, Ensure Path                         | Storyblok only (Scrape URL: none) | Read-only introspection + utilities |

The OpenAI credential stays conditionally required — only shown when resource = "AI Content" and operation ∈ {Generate, Generate Section, Plan Page, Generate Root Field, Generate SEO}.

### Version Strategy

Bump the node to **version 2** using n8n's `versioned node` pattern. v1 continues to work unchanged. v2 adds the new resources. Migration is automatic — v1 workflows with `resource: "aiContent"` load in v2 without changes.

---

## Implementation Tiers

### Tier 1 — Critical (enables 9 of 12 documented workflows)

#### 1.1 Resource: Story — CRUD Operations

These are the building blocks that nearly every documented workflow chains through.

##### Operation: List Stories

| Parameter        | Type    | Required | Description                                                                                        |
| ---------------- | ------- | -------- | -------------------------------------------------------------------------------------------------- |
| **Content Type** | Options | No       | Filter by content type: `page`, `blog-post`, `blog-overview`, `event-detail`, `event-list`, or all |
| **Starts With**  | String  | No       | Filter by slug prefix (e.g. `en/blog/`)                                                            |
| **Page**         | Number  | No       | Pagination page (default: 1)                                                                       |
| **Per Page**     | Number  | No       | Results per page (default: 25, max: 100)                                                           |

**Output:** Array of story objects (id, name, slug, content_type, published, created_at, etc.)

**n8n composability:** Feeds into **Split In Batches** → per-story processing. Most workflows start here.

**Shared services used:** Direct Storyblok Management API call (`GET /v1/spaces/{spaceId}/stories`). No shared-lib function exists yet — add `listStories()` to `storyblok.ts`.

##### Operation: Get Story

| Parameter    | Type                | Required | Description              |
| ------------ | ------------------- | -------- | ------------------------ |
| **Story ID** | String (expression) | ✅       | Numeric story ID or UUID |

**Output:** Full story object with nested `content` tree.

**n8n composability:** Typically follows List Stories in a loop. Output feeds into Code nodes for inspection, or into Generate/Update for content transformation.

**Shared services used:** `getStoryManagement()` from `@kickstartds/storyblok-services`.

##### Operation: Create Page with Content

The "batteries-included" page creation — auto-generates UIDs, validates against the Design System schema, supports `uploadAssets` and `path` for folder auto-creation.

| Parameter             | Type                | Required | Description                                                                                       |
| --------------------- | ------------------- | -------- | ------------------------------------------------------------------------------------------------- |
| **Name**              | String (expression) | ✅       | Display name                                                                                      |
| **Slug**              | String (expression) | ✅       | URL slug                                                                                          |
| **Content Type**      | Options             | No       | `page` (default), `blog-post`, `blog-overview`, `event-detail`, `event-list`                      |
| **Sections**          | JSON (expression)   | ✅       | Array of section objects (Design System format)                                                   |
| **Root Fields**       | JSON (expression)   | No       | Root-level fields for flat content types (event-detail, event-list)                               |
| **Path**              | String              | No       | Folder path for auto-creation (e.g. `en/services/consulting`) — mutually exclusive with Parent ID |
| **Parent ID**         | Number              | No       | Parent folder ID — mutually exclusive with Path                                                   |
| **Publish**           | Boolean             | No       | Publish immediately (default: false)                                                              |
| **Upload Assets**     | Boolean             | No       | Download external images and upload to Storyblok (default: false)                                 |
| **Asset Folder Name** | String              | No       | Storyblok asset folder name (default: "AI Generated"). Shown when Upload Assets = true            |
| **Skip Validation**   | Boolean             | No       | Skip Design System schema validation (default: false)                                             |
| **Skip Transform**    | Boolean             | No       | Skip `processForStoryblok()` flattening (default: false)                                          |

**Output:** Created story object with `_meta` (storyId, slug, published, sectionsCount).

**n8n composability:** Natural terminal node of any generation pipeline. The `path` parameter eliminates the need for a separate Ensure Path step in most cases.

**Shared services used:** Needs a new `createPageWithContent()` function in `storyblok.ts` (currently only exists as inline logic in the MCP server's `services.ts`). Also uses `processForStoryblok()`, `validateSections()`, and `uploadAndReplaceAssets()` from shared services.

##### Operation: Update Story

| Parameter             | Type                | Required | Description                                                                  |
| --------------------- | ------------------- | -------- | ---------------------------------------------------------------------------- |
| **Story ID**          | String (expression) | ✅       | Story ID to update                                                           |
| **Content**           | JSON (expression)   | No       | Updated content object (replaces entire content)                             |
| **Name**              | String              | No       | Updated display name                                                         |
| **Slug**              | String              | No       | Updated URL slug                                                             |
| **Publish**           | Boolean             | No       | Publish after update (default: false)                                        |
| **Upload Assets**     | Boolean             | No       | Upload external images to Storyblok (default: false)                         |
| **Asset Folder Name** | String              | No       | Asset folder name (default: "AI Generated"). Shown when Upload Assets = true |
| **Skip Validation**   | Boolean             | No       | Skip schema validation (default: false)                                      |

**Output:** Updated story object.

**n8n composability:** Follows Get Story → Code (transform) → Update Story pattern. Critical for SEO fixes, content freshness updates, translation pipelines, and archival workflows.

**Shared services used:** `saveStory()` from `@kickstartds/storyblok-services`, plus validation and asset upload functions.

##### Operation: Delete Story

| Parameter    | Type                | Required | Description                    |
| ------------ | ------------------- | -------- | ------------------------------ |
| **Story ID** | String (expression) | ✅       | Story ID to permanently delete |

**Output:** `{ success: true, deletedStoryId }`.

**n8n composability:** Terminal node in archival workflows. Use with caution — typically guarded by an IF node or manual approval.

**Shared services used:** Direct Storyblok Management API call (`DELETE /v1/spaces/{spaceId}/stories/{storyId}`). Add `deleteStory()` to `storyblok.ts`.

##### Operation: Scrape URL

| Parameter        | Type                | Required | Description                                                        |
| ---------------- | ------------------- | -------- | ------------------------------------------------------------------ |
| **URL**          | String (expression) | ✅       | Public URL to scrape                                               |
| **CSS Selector** | String              | No       | Extract a specific part of the page (default: `main` or full body) |

**Output:** `{ title, sourceUrl, markdown, images[] }` — where `images` is an array of `{ src, alt, context }`.

**n8n composability:** Entry point for migration, blog autopilot, and competitor monitoring workflows. Output `.markdown` feeds directly into Generate/Generate Section prompts. Output `.images` can feed into asset management.

**Shared services used:** Currently only exists in MCP server's `services.ts` as inline logic using `@mozilla/readability`, `jsdom`, and `turndown`. Extract `scrapeUrl()` into shared services or keep as a self-contained function in the n8n node (it has no Storyblok or OpenAI dependencies).

> **Note on n8n alternatives:** n8n has a built-in HTTP Request node, but it returns raw HTML. The value here is the Readability extraction + Markdown conversion + structured image extraction — a non-trivial pipeline that users would otherwise need a complex Code node to replicate.

#### 1.2 Resource: AI Content — New Guided Generation Operations

##### Operation: Generate Section

Single-section generation with automatic site-aware context injection.

| Parameter            | Type                | Required | Description                                                      |
| -------------------- | ------------------- | -------- | ---------------------------------------------------------------- |
| **System Prompt**    | String              | ✅       | AI persona and tone                                              |
| **Prompt**           | String (expression) | ✅       | What content to generate for this section                        |
| **Component Type**   | Options             | ✅       | Component type to generate (hero, faq, features, etc.)           |
| **Content Type**     | Options             | No       | Root content type for schema derivation (default: `page`)        |
| **Previous Section** | String (expression) | No       | Component type of the preceding section (for transition context) |
| **Next Section**     | String (expression) | No       | Component type of the following section (for transition context) |
| **Model**            | Options             | ✅       | OpenAI model                                                     |

**Output:** `{ generatedContent, designSystemProps, _meta }` — same shape as Generate, but for a single section.

**n8n composability:** This is where n8n's **Split In Batches** node shines. Plan Page outputs an array of section descriptors → Split In Batches → Generate Section (per item, with `previousSection`/`nextSection` wired via expressions) → Merge → Create Page with Content. This mirrors the MCP server's recommended guided generation workflow.

**Shared services used:** `generateSectionContent()` from `@kickstartds/storyblok-services/generate-section` (extracted from MCP server), plus `generateAndPrepareContent()` from shared pipeline. Pattern analysis and recipe injection are handled internally by `generateSectionContent()`.

##### Operation: Plan Page

AI-assisted page structure planning.

| Parameter        | Type                | Required | Description                                                                 |
| ---------------- | ------------------- | -------- | --------------------------------------------------------------------------- |
| **Intent**       | String (expression) | ✅       | What kind of page to plan (e.g. "product landing page for enterprise SaaS") |
| **Content Type** | Options             | No       | Target content type (default: `page`)                                       |
| **Model**        | Options             | ✅       | OpenAI model                                                                |

**Output:** Array of section descriptors — `{ componentType, purpose, notes }[]` — plus a `_meta` object with reasoning.

**n8n composability:** Output array feeds into Split In Batches → Generate Section. The `componentType` field maps to Generate Section's Component Type parameter, and `purpose`/`notes` enrich the prompt.

**Shared services used:** `planPageContent()` from `@kickstartds/storyblok-services/plan` (extracted from MCP server). Uses `prepareSchemaForOpenAi()` for schema-aware planning and `analyzeContentPatterns()` for site-aware recommendations.

##### Operation: Analyze Content Patterns

Read-only structural analysis across all published stories. No OpenAI required.

| Parameter        | Type    | Required | Description                                                    |
| ---------------- | ------- | -------- | -------------------------------------------------------------- |
| **Content Type** | Options | No       | Filter by content type (default: `page`)                       |
| **Starts With**  | String  | No       | Filter by slug prefix (e.g. `en/`)                             |
| **Refresh**      | Boolean | No       | Force fresh analysis instead of cached result (default: false) |

**Output:** `{ componentFrequency, sectionSequences, subComponentCounts, pageArchetypes, unusedComponents }`.

**n8n composability:** First step in audit and generation workflows. Output feeds into Code nodes for custom analysis, or stored in variables for use in downstream Generate Section prompts.

**Shared services used:** `analyzeContentPatterns()` from `@kickstartds/storyblok-services/patterns` (already extracted). Callable on-demand with optional caching.

---

### Tier 2 — High Value (introspection & governance)

#### 2.1 Resource: Story — Search

##### Operation: Search Content

| Parameter | Type                | Required | Description           |
| --------- | ------------------- | -------- | --------------------- |
| **Query** | String (expression) | ✅       | Full-text search term |

**Output:** Array of matching story snippets with context.

**n8n composability:** Useful for deduplication checks before content creation, or for finding stories that mention a specific topic (e.g. in freshness/audit workflows).

**Shared services used:** Direct Storyblok Management API call (`GET /v1/spaces/{spaceId}/stories?text_search=...`). Add `searchStories()` to `storyblok.ts`.

#### 2.2 Resource: Space — Introspection Operations

##### Operation: List Components

| Parameter | Type | Required | Description                         |
| --------- | ---- | -------- | ----------------------------------- |
| _(none)_  |      |          | Returns all components in the space |

**Output:** Array of component schemas with annotated nesting constraints (`allowedIn`, `isSubComponent`).

**n8n composability:** Enables dynamic/generic workflow templates that adapt to schema changes. Feed into a Code node to build component-aware prompts.

**Shared services used:** Direct Storyblok Management API call. Currently inline in MCP server — extract `listComponents()`.

##### Operation: Get Component

| Parameter          | Type                | Required | Description              |
| ------------------ | ------------------- | -------- | ------------------------ |
| **Component Name** | String (expression) | ✅       | Technical component name |

**Output:** Full component schema with fields, validation rules, presets, and nesting constraints.

**n8n composability:** Pairs with List Components for schema inspection workflows.

**Shared services used:** Direct Storyblok Management API call. Extract `getComponent()`.

##### Operation: List Assets

| Parameter     | Type   | Required | Description                    |
| ------------- | ------ | -------- | ------------------------------ |
| **Search**    | String | No       | Filter by filename             |
| **Folder ID** | Number | No       | Filter by asset folder         |
| **Page**      | Number | No       | Pagination page (default: 1)   |
| **Per Page**  | Number | No       | Results per page (default: 25) |

**Output:** Array of asset metadata (filename, URL, type, size, alt text, folder).

**n8n composability:** Enables the broken asset detection workflow: List Assets → List Stories + Get Story → Code (cross-reference) → Report.

**Shared services used:** Direct Storyblok Management API call. Extract `listAssets()`.

##### Operation: List Recipes

| Parameter                 | Type    | Required | Description                                                       |
| ------------------------- | ------- | -------- | ----------------------------------------------------------------- |
| **Intent**                | String  | No       | Filter/prioritize recipes by intent (e.g. "product landing page") |
| **Content Type**          | Options | No       | Filter by content type                                            |
| **Include Live Patterns** | Boolean | No       | Merge with patterns from Analyze Content Patterns (default: true) |

**Output:** `{ recipes[], pageTemplates[], antiPatterns[] }`.

**n8n composability:** Feed recipes into Code nodes to enrich generation prompts. Anti-patterns can drive validation in audit workflows.

**Shared services used:** Loads from `storyblok-mcp/schemas/section-recipes.json` — needs to be bundled with the n8n node or loaded from shared services.

---

### Tier 3 — Nice to Have

#### 3.1 Remaining Operations

##### Operation: Ensure Path (Space resource)

| Parameter | Type                | Required | Description                                                         |
| --------- | ------------------- | -------- | ------------------------------------------------------------------- |
| **Path**  | String (expression) | ✅       | Forward-slash-separated folder path (e.g. `en/services/consulting`) |

**Output:** `{ folderId, path, created[] }` — ID of the deepest folder, full path, and list of newly created folders.

**n8n composability:** Useful as a setup step before bulk page creation in migration workflows.

**Shared services used:** Needs `ensurePath()` extracted from MCP server. Currently inline in `services.ts`.

##### Operation: List Icons (Space resource)

| Parameter | Type | Required | Description                            |
| --------- | ---- | -------- | -------------------------------------- |
| _(none)_  |      |          | Returns all available icon identifiers |

**Output:** Array of icon name strings.

**n8n composability:** Low standalone value, but useful as a pre-validation step in a Code node before generating content with icon fields.

**Shared services used:** Reads icon file from Design System package. Bundle icon list as static JSON in the n8n node.

---

## Shared Services Extraction

Several MCP server functions need to be extracted into `@kickstartds/storyblok-services` before the n8n node can consume them. This avoids duplicating logic.

### New Functions for `storyblok.ts`

| Function                                          | Source                   | Notes                                               |
| ------------------------------------------------- | ------------------------ | --------------------------------------------------- |
| `listStories(client, spaceId, options)`           | MCP `services.ts` inline | Pagination, content type filter, slug prefix        |
| `createStory(client, spaceId, options)`           | MCP `services.ts` inline | Raw story creation with path support                |
| `createPageWithContent(client, spaceId, options)` | MCP `services.ts` inline | Auto-UID generation, validation, asset upload, path |
| `updateStory(client, spaceId, storyId, options)`  | MCP `services.ts` inline | Content update, publish, asset upload               |
| `deleteStory(client, spaceId, storyId)`           | MCP `services.ts` inline | Simple delete                                       |
| `searchStories(client, spaceId, query)`           | MCP `services.ts` inline | Full-text search                                    |
| `listComponents(client, spaceId)`                 | MCP `services.ts` inline | With nesting annotation                             |
| `getComponent(client, spaceId, name)`             | MCP `services.ts` inline | Single component                                    |
| `listAssets(client, spaceId, options)`            | MCP `services.ts` inline | With search/filter/pagination                       |
| `ensurePath(client, spaceId, path)`               | MCP `services.ts` inline | Idempotent folder creation                          |

### New Functions for `patterns.ts` / `plan.ts` / `generate-section.ts`

| Function                                               | Source                   | Status                                                              |
| ------------------------------------------------------ | ------------------------ | ------------------------------------------------------------------- |
| `analyzeContentPatterns(client, spaceId, options)`     | MCP `services.ts` inline | ✅ Extracted to `patterns.ts`                                       |
| `planPageContent(openAiClient, entry, options)`        | MCP `services.ts` inline | ✅ Extracted to `plan.ts` (as `planPageContent`)                    |
| `generateSectionContent(openAiClient, entry, options)` | MCP `services.ts` inline | ✅ Extracted to `generate-section.ts` (as `generateSectionContent`) |
| `loadRecipes(options)`                                 | MCP `services.ts` inline | Load and filter section recipes                                     |

### New Module: `scrape.ts`

| Function                  | Source                   | Status                      |
| ------------------------- | ------------------------ | --------------------------- |
| `scrapeUrl(url, options)` | MCP `services.ts` inline | ✅ Extracted to `scrape.ts` |

### Impact on MCP Server

After extraction, the MCP server's `services.ts` becomes a thin adapter layer that calls shared functions and formats results for MCP transport. This is the same pattern already established for Generate and Import — just extended to all tools.

---

## Cross-Cutting Concerns

### Upload Assets Parameter

The `uploadAssets` + `assetFolderName` parameters appear on **3 operations** that write content:

- Create Page with Content
- Update Story
- Import (existing operation — **add** `uploadAssets` parameter)

When `uploadAssets: true`, external image URLs in the content are downloaded and uploaded to Storyblok as native assets before saving. Uses `uploadAndReplaceAssets()` from shared services.

### Content Type Parameter

Operations that interact with content schemas accept a `contentType` parameter:

- Generate (existing — already has `contentType` via registry)
- Generate Section (new)
- Plan Page (new)
- Create Page with Content (new)
- Import (existing — already passed to validators)
- Analyze Content Patterns (new)
- List Recipes (new)

The registry (`createRegistryFromSchemaDir`) handles schema loading for all 5 root content types.

### Skip Transform / Skip Validation

All write operations (Import, Create Page, Update Story) support:

- `skipTransform: true` — bypass `processForStoryblok()` flattening (for content already in Storyblok format)
- `skipValidation: true` — bypass Design System schema validation

### Error Handling Pattern

All new operations follow the existing pattern:

- API errors → `NodeApiError` with descriptive messages
- Validation errors → `NodeOperationError` with field-level details
- All operations support n8n's built-in **Retry on Fail** for transient errors

---

## File Changes

### Modified Files

| File                             | Changes                                                                                              |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `StoryblokKickstartDs.node.ts`   | Add `story` and `space` resources, new operation cases in `execute()`, conditional OpenAI credential |
| `GenericFunctions.ts`            | Re-export new shared functions, add n8n-facing wrappers with validation                              |
| `StoryblokKickstartDs.node.json` | Update codex with new operation keywords and aliases                                                 |
| `package.json`                   | Add new dependencies if needed (turndown, jsdom for scrape — or keep in shared)                      |

### New Files

| File                                         | Purpose                                            |
| -------------------------------------------- | -------------------------------------------------- |
| `descriptions/StoryDescription.ts`           | Parameter definitions for all Story operations     |
| `descriptions/SpaceDescription.ts`           | Parameter definitions for all Space operations     |
| `descriptions/GenerateSectionDescription.ts` | Parameter definitions for Generate Section         |
| `descriptions/PlanPageDescription.ts`        | Parameter definitions for Plan Page                |
| `descriptions/AnalyzePatternsDescription.ts` | Parameter definitions for Analyze Content Patterns |
| `schemas/section-recipes.json`               | Bundled copy of curated recipes (from MCP server)  |

### New Shared Services Files

| File                                          | Purpose                                                               |
| --------------------------------------------- | --------------------------------------------------------------------- |
| `shared/storyblok-services/src/stories.ts`    | Story CRUD + search functions                                         |
| `shared/storyblok-services/src/components.ts` | Component listing + introspection                                     |
| `shared/storyblok-services/src/patterns.ts`   | Content patterns analysis, page planning, section generation, recipes |
| `shared/storyblok-services/src/scrape.ts`     | URL scraping with Readability + Turndown                              |

---

## n8n Workflow Examples

### Example 1: Content Migration Pipeline

```
Schedule Trigger
  → Google Sheets (read URL list)
  → Split In Batches
  → Storyblok kDS: Scrape URL
  → Storyblok kDS: Plan Page (intent from scraped title)
  → Split In Batches (per section)
    → Storyblok kDS: Generate Section (with previousSection/nextSection)
  → Merge
  → Storyblok kDS: Create Page with Content (uploadAssets: true, path from URL)
  → Slack: Notify team
```

### Example 2: Weekly Content Audit

```
Schedule Trigger (weekly)
  → Storyblok kDS: List Stories (all pages)
  → Split In Batches
  → Storyblok kDS: Get Story
  → Code Node: Apply audit rules (alt texts, text length, broken links)
  → Filter: Has issues
  → Google Sheets: Write audit report
  → Slack: Send summary
```

### Example 3: Blog Autopilot from RSS

```
RSS Feed Trigger
  → Storyblok kDS: Scrape URL (article URL)
  → Storyblok kDS: Generate (contentType: "blog-post", prompt from scraped markdown)
  → Storyblok kDS: Create Page with Content (contentType: "blog-post", path: "en/blog")
  → Slack: "New blog draft ready for review"
```

### Example 4: SEO Fix Pipeline

```
Schedule Trigger
  → Storyblok kDS: List Stories
  → Split In Batches
  → Storyblok kDS: Get Story
  → Code Node: Check SEO rules (H1, meta length, alt texts)
  → IF: Needs fix
    → Storyblok kDS: Generate (prompt: "Improve meta description for...")
    → Storyblok kDS: Update Story (draft)
  → Google Sheets: SEO scorecard
```

### Example 5: Section-by-Section Page Generation

```
Manual Trigger (intent input)
  → Storyblok kDS: Analyze Patterns
  → Storyblok kDS: Plan Page (intent from input)
  → Split In Batches
    → Storyblok kDS: Generate Section
      (componentType from plan, previousSection/nextSection via expressions)
  → Merge (all sections)
  → Storyblok kDS: Create Page with Content
```

### Example 6: Broken Asset Detection

```
Schedule Trigger (monthly)
  → Storyblok kDS: List Assets (all, paginated)
  → Storyblok kDS: List Stories (all)
  → Split In Batches
    → Storyblok kDS: Get Story
  → Code Node: Extract all image URLs from content, cross-reference with asset list
  → Filter: Orphaned assets or broken references
  → Email/Slack: Cleanup report
```

---

## Milestones

### Milestone 8: Shared Services Extraction (prerequisite)

> **Goal:** Extract MCP-inline logic into `@kickstartds/storyblok-services` so both MCP server and n8n nodes consume the same functions.

- [ ] Add `listStories()`, `createStory()`, `createPageWithContent()`, `updateStory()`, `deleteStory()`, `searchStories()` to shared `stories.ts`
- [ ] Add `listComponents()`, `getComponent()`, `listAssets()` to shared `components.ts`
- [ ] Add `analyzeContentPatterns()`, `planPage()`, `generateSection()`, `loadRecipes()` to shared `patterns.ts`
- [ ] Add `scrapeUrl()` to shared `scrape.ts`
- [ ] Add `ensurePath()` to shared `storyblok.ts`
- [ ] Refactor MCP server to consume new shared functions
- [ ] Update shared services barrel export (`index.ts`)
- [ ] Write unit tests for extracted functions
- [ ] Verify MCP server still passes all existing tests

### Milestone 9: Story Resource (Tier 1 CRUD)

> **Goal:** Add List, Get, Create Page, Update, Delete operations under the Story resource.

- [ ] Create `descriptions/StoryDescription.ts` with all parameter definitions
- [ ] Add `story` resource to node properties
- [ ] Implement `executeListStories()`, `executeGetStory()`, `executeCreatePage()`, `executeUpdateStory()`, `executeDeleteStory()`
- [ ] Add `uploadAssets` parameter to existing Import operation
- [ ] Wire credential display logic (OpenAI only for AI Content resource)
- [ ] Write unit tests for each operation
- [ ] Create workflow template: Weekly Content Audit

### Milestone 10: Scrape URL + Search (Tier 1 remaining)

> **Goal:** Add Scrape URL to Space resource and Search to Story resource.

- [ ] Create Scrape URL operation in `descriptions/SpaceDescription.ts`
- [ ] Implement `executeScrapeUrl()`
- [ ] Add Search Content operation to Story resource
- [ ] Implement `executeSearchContent()`
- [ ] Write unit tests
- [ ] Create workflow templates: Blog Autopilot, Content Migration

### Milestone 11: Guided Generation Operations (Tier 1 AI)

> **Goal:** Add Generate Section, Plan Page, and Analyze Content Patterns to AI Content resource.

- [ ] Create `descriptions/GenerateSectionDescription.ts`, `PlanPageDescription.ts`, `AnalyzePatternsDescription.ts`
- [ ] Add 5 new operations to AI Content resource
- [ ] Implement `executeGenerateSection()`, `executePlanPage()`, `executeAnalyzePatterns()`, `executeGenerateRootField()`, `executeGenerateSeo()`
- [ ] Bundle `section-recipes.json` in schemas directory
- [ ] Write unit tests
- [ ] Create workflow template: Section-by-Section Page Generation

### Milestone 12: Space Resource — Introspection (Tier 2)

> **Goal:** Add List Components, Get Component, List Assets, List Recipes, List Icons, Ensure Path.

- [ ] Complete `descriptions/SpaceDescription.ts` with all parameter definitions
- [ ] Implement all 6 execution functions
- [ ] Write unit tests
- [ ] Create workflow template: Broken Asset Detection

### Milestone 13: Documentation & Publishing

> **Goal:** Update README, codex, and publish updated npm package.

- [ ] Update README.md with full operation reference for all 3 resources
- [ ] Update codex file with new keywords and aliases
- [ ] Add expression examples for all cross-node data mappings
- [ ] Create all workflow template JSON files
- [ ] Update [content-operations-workflows.md](../../guides/content-operations-workflows.md) with n8n-native instructions (currently references MCP tools)
- [ ] Bump version to 2.0.0
- [ ] Publish to npm
- [ ] Submit updated listing to n8n community nodes directory

---

## Dependencies Between Milestones

```
Milestone 8 (Shared Services Extraction)
    ├── Milestone 9 (Story CRUD)
    ├── Milestone 10 (Scrape + Search)
    ├── Milestone 11 (Guided Generation)
    └── Milestone 12 (Space Introspection)
            └── Milestone 13 (Docs & Publish)
```

Milestones 9–12 can be worked on in parallel after Milestone 8 is complete. Milestone 13 waits for all others.

---

## Summary: Before and After

|                               | Before (v1)                     | After (v2)                         |
| ----------------------------- | ------------------------------- | ---------------------------------- |
| **Resources**                 | 1 (AI Content)                  | 3 (AI Content, Story, Space)       |
| **Operations**                | 2 (Generate, Import)            | 21 (2 existing + 19 new)           |
| **Workflows enabled**         | 3 (manual generate → import)    | All 12 documented workflows        |
| **Shared services functions** | 12                              | ~26                                |
| **Credential flexibility**    | OpenAI always required          | OpenAI only for AI operations      |
| **Content types**             | Implicit (page only in presets) | Explicit 5-type support throughout |
