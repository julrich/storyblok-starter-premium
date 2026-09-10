# n8n Nodes Extension — Implementation Checklist

> Companion to [n8n-nodes-extension-plan.md](../plans/n8n-nodes-extension-plan.md).
> Check items off as they are completed. Each milestone gates the next.

---

## Milestone 8: Shared Services Extraction

> **Goal:** Extract MCP-inline logic into `@kickstartds/storyblok-services` so both MCP server and n8n nodes consume the same functions.

### 8.1 New shared module: `stories.ts` — Story CRUD + search

- [x] Create `shared/storyblok-services/src/stories.ts`
- [x] Add `ListStoriesOptions` type to `types.ts`
- [x] Implement `listStories(client, spaceId, options)` — paginated list with content type + slug prefix filters
- [x] Add `CreateStoryOptions` type to `types.ts`
- [x] Implement `createStory(client, spaceId, options)` — raw story creation with optional parentId
- [x] Add `CreatePageWithContentOptions` type to `types.ts`
- [x] Implement `createPageWithContent(client, spaceId, options)` — auto-UID injection, validation, asset upload, publish
- [x] Add `UpdateStoryOptions` type to `types.ts`
- [x] Implement `updateStory(client, spaceId, storyId, options)` — merge updates, validate, publish
- [x] Implement `deleteStory(client, spaceId, storyId)` — simple delete
- [x] Implement `searchStories(client, spaceId, query, contentType?)` — full-text search
- [x] Implement `findBySlug(client, spaceId, fullSlug)` — helper for slug lookup
- [x] Implement `ensurePath(client, spaceId, folderPath)` — idempotent `mkdir -p` for folders
- [x] Implement `ensureUids(value)` — recursive UUID injection helper

### 8.2 New shared module: `components.ts` — Component & asset introspection

- [x] Create `shared/storyblok-services/src/components.ts`
- [x] Implement `listComponents(client, spaceId)` — returns all components
- [x] Implement `getComponent(client, spaceId, name)` — single component by name
- [x] Add `ListAssetsOptions` type to `types.ts`
- [x] Implement `listAssets(client, spaceId, options)` — paginated, with search + folder filter

### 8.3 New shared module: `scrape.ts` — URL scraping

- [x] Create `shared/storyblok-services/src/scrape.ts`
- [x] Add `jsdom`, `@mozilla/readability`, `turndown` dependencies to shared `package.json`
- [x] Add `ScrapedImage` and `ScrapeUrlOptions` types
- [x] Implement `scrapeUrl(options)` — fetch → Readability → Turndown → images
- [x] Implement `pickBestFromSrcset(srcset)` helper

### 8.4 Update shared barrel export (`index.ts`)

- [x] Export all new functions from `stories.ts`
- [x] Export all new functions from `components.ts`
- [x] Export all new functions from `scrape.ts`
- [x] Export all new types from `types.ts`

### 8.5 Refactor MCP server to consume shared functions

- [x] Replace `StoryblokService.listStories()` with call to shared `listStories()`
- [x] Replace `StoryblokService.createStory()` with call to shared `createStory()`
- [x] Replace `StoryblokService.createPageWithContent()` with call to shared `createPageWithContent()`
- [x] Replace `StoryblokService.updateStory()` with call to shared `updateStory()`
- [x] Replace `StoryblokService.deleteStory()` with call to shared `deleteStory()`
- [x] Replace `StoryblokService.searchContent()` with call to shared `searchStories()`
- [x] Replace `StoryblokService.listComponents()` with call to shared `listComponents()`
- [x] Replace `StoryblokService.getComponent()` with call to shared `getComponent()`
- [x] Replace `StoryblokService.listAssets()` with call to shared `listAssets()`
- [x] Replace `StoryblokService.ensurePath()` with call to shared `ensurePath()`
- [x] Replace `StoryblokService.findBySlug()` with call to shared `findBySlug()`
- [x] Replace standalone `scrapeUrl()` with call to shared `scrapeUrl()`
- [x] Replace standalone `ensureUids()` with shared `ensureUids()`
- [x] Verify MCP server TypeScript compilation (`tsc --noEmit`)
- [ ] Verify MCP server tests still pass

### 8.6 Build & verify

- [x] Shared services build succeeds (`npm run build` in `shared/storyblok-services`)
- [ ] Shared services tests pass (`npm test`)
- [x] MCP server builds cleanly
- [x] n8n nodes still compile (no regressions from shared lib changes)

---

## Milestone 9: Story Resource (Tier 1 CRUD)

> **Goal:** Add List, Get, Create Page, Update, Delete operations under a new Story resource in the n8n node.

### 9.1 Parameter descriptions

- [x] Create `descriptions/StoryDescription.ts`
- [x] Define `listStories` operation fields (contentType, startsWith, page, perPage)
- [x] Define `getStory` operation fields (storyId)
- [x] Define `createPage` operation fields (name, slug, contentType, sections, rootFields, path, parentId, publish, uploadAssets, assetFolderName, skipValidation, skipTransform)
- [x] Define `updateStory` operation fields (storyId, content, name, slug, publish, uploadAssets, assetFolderName, skipValidation)
- [x] Define `deleteStory` operation fields (storyId)
- [x] Export `storyFields` array from the description file

### 9.2 Update GenericFunctions.ts

- [x] Re-export `listStories`, `createStory`, `createPageWithContent`, `updateStory`, `deleteStory` from shared lib
- [x] Re-export new types (`ListStoriesOptions`, `CreateStoryOptions`, etc.)

### 9.3 Update node class

- [x] Add `story` resource to `properties[]` options
- [x] Add `story` operations (list, get, createPage, update, delete) to operation selector
- [x] Spread `...storyFields` into node properties
- [x] Update credential display: OpenAI only when `resource: ["aiContent"]`
- [x] Add `story` operation routing in `execute()` method

### 9.4 Implement execution functions

- [x] Implement `executeListStories()`
- [x] Implement `executeGetStory()`
- [x] Implement `executeCreatePage()`
- [x] Implement `executeUpdateStory()`
- [x] Implement `executeDeleteStory()`

### 9.5 Verify

- [x] n8n nodes build succeeds (`npx tsc --noEmit`)
- [ ] Existing Generate + Import tests still pass
- [ ] Manual test: List Stories returns data
- [ ] Manual test: Get Story returns full content
- [ ] Manual test: Create Page creates story in Storyblok
- [ ] Manual test: Update Story modifies content
- [ ] Manual test: Delete Story removes story

---

## Milestone 10: Scrape URL + Search (Tier 1 remaining)

> **Goal:** Add Scrape URL to Space resource and Search Content to Story resource.

### 10.1 Parameter descriptions

- [x] Create `descriptions/SpaceDescription.ts` (start with Scrape URL, List Icons; expanded in M12)
- [x] Define `scrapeUrl` operation fields (url, selector)
- [x] Add `search` operation to `descriptions/StoryDescription.ts` (query) — ✅ done in M9

### 10.2 Implement execution functions

- [x] Implement `executeScrapeUrl()`
- [x] Implement `executeSearchContent()` — ✅ done in M9 as `executeSearchStories()`

### 10.3 Update node class

- [x] Add `space` resource to `properties[]` options
- [x] Add scrapeUrl + search operations
- [x] Route in `execute()`

### 10.4 Verify

- [x] Build succeeds
- [ ] Manual test: Scrape URL returns markdown + images
- [ ] Manual test: Search Content returns matching stories

---

## Milestone 11: Guided Generation (Tier 1 AI)

> **Goal:** Add Generate Section, Plan Page, and Analyze Content Patterns to AI Content resource.

### 11.1 Shared services prerequisite

- [x] Extract `analyzeContentPatterns()` from MCP `services.ts` into shared `patterns.ts`
- [x] Export from shared `index.ts`
- [x] Refactor MCP server to use shared `analyzeContentPatterns()` via `storyblokService.getContentClient()`

### 11.2 Parameter descriptions

- [x] Add `generateSection` fields inline in node class (componentType, prompt, system, previousSection, nextSection, contentType, model)
- [x] Add `planPage` fields inline in node class (intent, sectionCount, contentType, model)
- [x] Add `analyzePatterns` fields inline in node class (contentType, startsWith)

### 11.3 Implement execution functions

- [x] Implement `executeGenerateSection()` — uses `generateAndPrepareContent()` with componentType-scoped schema + recipe context
- [x] Implement `executePlanPage()` — uses `generateStructuredContent()` with dynamic plan schema from registry
- [x] Implement `executeAnalyzePatterns()` — uses shared `analyzeContentPatterns()`
- [x] Implement `executeGenerateRootField()` — uses shared `generateRootFieldContent()` for hybrid content type root fields
- [x] Implement `executeGenerateSeo()` — uses shared `generateSeoContent()` for SEO metadata generation

### 11.4 Update node class

- [x] Add 5 new operations to `aiContent` resource (generateSection, planPage, analyzePatterns, generateRootField, generateSeo)
- [x] Update OpenAI credential display for new AI operations (generate, generateSection, planPage, generateRootField, generateSeo)
- [x] Bundle `section-recipes.json` in schemas directory

### 11.5 Verify

- [x] Build succeeds
- [ ] Manual test: Analyze Patterns returns component frequency data
- [ ] Manual test: Plan Page returns section sequence
- [ ] Manual test: Generate Section returns single section content

---

## Milestone 12: Space Resource — Introspection (Tier 2)

> **Goal:** Add List Components, Get Component, List Assets, List Recipes, List Icons, Ensure Path.

### 12.1 Parameter descriptions

- [x] Add List Components fields to `descriptions/SpaceDescription.ts`
- [x] Add Get Component fields (componentName)
- [x] Add List Assets fields (search, folderId, page, perPage)
- [x] Add List Recipes fields (intent, contentType, includeLivePatterns)
- [x] Add List Icons fields (none)
- [x] Add Ensure Path fields (path)

### 12.2 Implement execution functions

- [x] Implement `executeListComponents()`
- [x] Implement `executeGetComponent()`
- [x] Implement `executeListAssets()`
- [x] Implement `executeListRecipes()`
- [x] Implement `executeListIcons()`
- [x] Implement `executeEnsurePath()`

### 12.3 Update node class

- [x] Add all 7 operations to `space` resource (scrapeUrl + 6 introspection)
- [x] Route in `execute()`

### 12.4 Verify

- [x] Build succeeds
- [ ] Manual test: each operation returns expected data

---

## Milestone 13: Documentation & Publishing

> **Goal:** Update README, codex, and publish updated npm package.

### 13.1 Documentation

- [x] Update `README.md` with full 3-resource operation reference
- [x] Update `StoryblokKickstartDs.node.json` codex with new keywords/aliases
- [x] Add expression examples for cross-node data mappings
- [x] Update [content-operations-workflows.md](../../guides/content-operations-workflows.md) with n8n-native instructions

### 13.2 Workflow templates

- [x] Create `workflows/template-4-weekly-content-audit.json`
- [x] Create `workflows/template-5-blog-autopilot-rss.json`
- [x] Create `workflows/template-6-content-migration.json`
- [x] Create `workflows/template-7-seo-fix-pipeline.json`
- [x] Create `workflows/template-8-section-by-section.json`
- [x] Create `workflows/template-9-broken-asset-detection.json`

### 13.3 Publish

- [ ] Bump version to 2.0.0
- [ ] `npm publish`
- [ ] Submit to n8n community nodes directory

---

## Progress Summary

| Milestone                | Status         | Items   | Done    |
| ------------------------ | -------------- | ------- | ------- |
| M8: Shared Services      | 🟢 Done        | 47      | 45      |
| M9: Story Resource       | 🟢 Done        | 25      | 18      |
| M10: Scrape + Search     | 🟢 Done        | 10      | 8       |
| M11: Guided Generation   | 🟢 Done        | 17      | 14      |
| M12: Space Introspection | 🟢 Done        | 13      | 12      |
| M13: Docs & Publish      | 🟡 In progress | 13      | 10      |
| **Total**                |                | **125** | **107** |
