# Token Optimization — Implementation Checklist

> Tracks progress for [token-optimization-plan.md](../plans/token-optimization-plan.md).

## Phase 1: Add `excludeContent` to shared `listStories()`

- [x] Add `excludeContent?: boolean` to `ListStoriesOptions` in `packages/storyblok-services/src/types.ts`
- [x] Pass `excluding_fields: "content"` when `excludeContent` is `true` in `listStories()` in `packages/storyblok-services/src/stories.ts`
- [x] Verify `analyzeContentPatterns()` in `packages/storyblok-services/src/patterns.ts` does NOT pass `excludeContent` (keeps full content)

## Phase 2: Wire `excludeContent` into MCP `list_stories` tool

- [x] Add `excludeContent` boolean property (default: `true`) to `list_stories` input schema in `packages/storyblok-mcp/src/index.ts`
- [x] Add `excludeContent` to Zod schema `schemas.listStories` in `packages/storyblok-mcp/src/config.ts`
- [x] Update `StoryblokService.listStories()` wrapper in `packages/storyblok-mcp/src/services.ts` to pass `excludeContent` through
- [x] Update `list_stories` handler in `packages/storyblok-mcp/src/index.ts` to pass `excludeContent ?? true`
- [x] Update `list_stories` tool description to mention metadata-only default

## Phase 3: Wire `excludeContent` into n8n `list` operation

- [x] Add `excludeContent` boolean field to `storyFields` in `packages/storyblok-n8n/nodes/StoryblokKickstartDs/descriptions/StoryDescription.ts`
- [x] Read and pass `excludeContent` in `executeListStories()` in `packages/storyblok-n8n/nodes/StoryblokKickstartDs/StoryblokKickstartDs.node.ts`

## Phase 4: Asset stripping for content-returning tools

- [x] Create `stripEmptyAssetFields()` utility in `packages/storyblok-services/src/stories.ts`
- [x] Export `stripEmptyAssetFields` from `packages/storyblok-services/src/index.ts`
- [x] Apply to `get_story` handler in `packages/storyblok-mcp/src/index.ts`
- [x] Apply to `list_stories` handler (when `excludeContent: false`) in `packages/storyblok-mcp/src/index.ts`
- [x] Apply to `search_content` handler in `packages/storyblok-mcp/src/index.ts`

## Phase 5: Documentation updates

### 5a: MCP README

- [x] Update token budget table in `packages/storyblok-mcp/README.md` to reflect new defaults (metadata-only)
- [x] Update recommendations section

### 5b: Content operations doc

- [x] Update workflow §4 (Content Audit) to note `excludeContent: false` needed for content inspection — `docs/content-operations-workflows.md`
- [x] Update workflow §5 (SEO Monitoring) — same
- [x] Update workflow §6 (Broken Asset Detection) — same
- [x] Update workflow §10 (Content Freshness Tracker) — metadata-only, works by default
- [x] Update workflow §11 (Content Statistics Dashboard) — metadata-only, works by default
- [x] Update workflow §12 (Automatic Archival) — metadata-only, works by default
- [x] Update MCP tool reference table to note `excludeContent` parameter

### 5c: Copilot instructions

- [x] Add note about `list_stories` metadata-only default and `excludeContent: false` opt-in to `.github/copilot-instructions.md`

### 5d: n8n workflow templates

- [x] Add `excludeContent: false` to template-4 (weekly content audit) — `packages/storyblok-n8n/workflows/template-4-weekly-content-audit.json`
- [x] Add `excludeContent: false` to template-7 (SEO fix pipeline) — `packages/storyblok-n8n/workflows/template-7-seo-fix-pipeline.json`
- [x] Add `excludeContent: false` to template-9 (broken asset detection) — `packages/storyblok-n8n/workflows/template-9-broken-asset-detection.json`
- [x] ~~Add `excludeContent: false` to website-content-operations.json MCP call~~ — Not needed: this workflow uses the MCP client (not n8n node), and the new metadata-only default is correct for its listing use case

### 5e: Plan status

- [x] Update status in `docs/token-optimization-plan.md` from 📋 PLANNED to ✅ IMPLEMENTED
