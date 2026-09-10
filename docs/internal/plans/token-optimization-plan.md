# Plan: Optimize MCP Tool Response Token Sizes

> **Status: ✅ IMPLEMENTED** — All phases complete.

## Problem Statement

When using the MCP server with LLM clients that have limited context windows — particularly **Claude Web** — several tool responses are large enough to cause generation failures (`"Claude's response could not be fully generated"`) or silently degrade output quality by consuming most of the available context budget.

The worst offender is `list_stories`, which returns the **full nested content tree** for every story in the response. A single `list_stories(perPage: 25)` call produces ~125,000 tokens — more than many clients can handle. Even `perPage: 5` yields ~25,000 tokens for what is conceptually a browsing/discovery operation.

### Root Cause

The Storyblok Content Delivery API (`cdn/stories`) returns the full `content` object for every story by default. Each story's content includes all sections, all nested components, and all asset objects. A single Storyblok asset field alone is ~150 tokens of boilerplate metadata:

```json
{
  "id": 12345678,
  "alt": "",
  "name": "",
  "focus": "",
  "title": "",
  "source": "",
  "filename": "https://a.storyblok.com/f/…/image.jpg",
  "copyright": "",
  "fieldtype": "asset",
  "meta_data": {},
  "is_external_url": false,
  "is_private": false
}
```

A content-rich page with 6 sections easily reaches 5,000+ tokens per story. At `perPage: 25`, this means ~125,000 tokens just for the `list_stories` response — before the LLM even begins reasoning about it.

### Measured Response Sizes

| Tool                          | Typical Response | Est. Tokens       | Risk Level  |
| ----------------------------- | ---------------- | ----------------- | ----------- |
| `list_stories` (default, 25)  | ~500 KB          | **~125,000**      | 🔴 Critical |
| `list_stories` (perPage: 5)   | ~100 KB          | **~25,000**       | 🟠 High     |
| `list_stories` (perPage: 100) | ~2 MB            | **~500,000**      | 🔴 Critical |
| `analyze_content_patterns`    | ~50 KB           | **~12,500**       | 🟡 Medium   |
| `list_components`             | ~30–50 KB        | **~7,500–12,500** | 🟡 Medium   |
| `list_recipes`                | ~15 KB           | **~3,750**        | 🟢 OK       |
| `get_story` (single page)     | ~20 KB           | **~5,000**        | 🟢 OK       |
| `generate_content`            | ~10–30 KB        | **~2,500–7,500**  | 🟢 OK       |
| `generate_section`            | ~5–15 KB         | **~1,250–3,750**  | 🟢 OK       |
| `plan_page`                   | ~3–5 KB          | **~750–1,250**    | 🟢 OK       |
| `list_icons`                  | ~0.5 KB          | **~125**          | 🟢 OK       |

### The Irony

The MCP tool description for `list_stories` already advertises it as a metadata tool:

> _"Returns story metadata including: ID, UUID, slug, Name and full_slug, Content type, Created/updated timestamps, Published status"_

But the actual response includes the full `content` tree — delivering ~100× more data than described.

---

## Usage Analysis: Where `list_stories` Responses Are Actually Consumed

A comprehensive audit of all skill docs, n8n workflow templates, content-operations documentation, and code paths reveals **three distinct consumption patterns**:

### A) Metadata-only — content is never read (7 use cases) ✅

These workflows only need `id`, `slug`, `full_slug`, `name`, `content_type`, `published_at`, `updated_at` — the exact fields the tool description already promises:

| Workflow / Skill                      | Fields Used                                                            | Source                                                                        |
| ------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Content Freshness Tracker**         | `updated_at` timestamps to find stale stories                          | [content-operations §10](../../guides/content-operations-workflows.md)                     |
| **Content Statistics Dashboard**      | Story counts per `contentType`, just totals                            | [content-operations §11](../../guides/content-operations-workflows.md)                     |
| **Automatic Archival**                | `contentType` filter + dates, then `get_story` per item                | [content-operations §12](../../guides/content-operations-workflows.md)                     |
| **Brainstorming**                     | "What content exists?" — only names/slugs/types                        | [content-operations, interactive](../../guides/content-operations-workflows.md)            |
| **Quick-Cleanup: Alt-Texte**          | Lists all stories, then `get_story` per story                          | [content-operations, interactive](../../guides/content-operations-workflows.md)            |
| **Create page in subfolder**          | `list_stories` with `startsWith` to find a folder's `parentId`         | [create-page-from-scratch skill, variant](../../skills/create-page-from-scratch.md) |
| **Content Audit (skill, full space)** | Calls `list_stories` paginated as an index, then `get_story` per story | [content-audit skill, variant](../../skills/content-audit.md)                       |

**Verdict:** A summary mode (no `content` field) would save ~95% of tokens for these 7 workflows with zero functional impact.

### B) Content-consuming — needs the full content tree (4 use cases) ❌

These workflows process `story.content` directly from the `list_stories` response, typically inside n8n Code nodes that analyze content in bulk:

| Workflow / Template           | What It Reads from `content`                                                                                 | Source                                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| **SEO Fix Pipeline**          | `content.seo`, `content.section[*].component`, hero headline                                                 | [template-7-seo-fix-pipeline.json](../packages/storyblok-n8n/workflows/template-7-seo-fix-pipeline.json)             |
| **Weekly Content Audit**      | `content.section` — checks for missing CTAs, duplicate heroes, sparse pages                                  | [template-4-weekly-content-audit.json](../packages/storyblok-n8n/workflows/template-4-weekly-content-audit.json)     |
| **Broken Asset Detection**    | `extractUrls(story.content)` — deep tree walk for all Storyblok CDN URLs                                     | [template-9-broken-asset-detection.json](../packages/storyblok-n8n/workflows/template-9-broken-asset-detection.json) |
| **Website Content Ops audit** | `walkContent(content, …)` — checks every field for missing alt-texts, empty images, text length, CTA buttons | [website-content-operations.json](../packages/storyblok-n8n/workflows/website-content-operations.json)               |

**Note:** Templates 4 and 7 could be **refactored** to use `list_stories` (summary) → loop → `get_story`, matching the pattern already recommended in the skill docs. Templates 9 and the ops audit genuinely benefit from bulk content access in n8n Code nodes.

### C) Internal server-side consumer — not exposed to LLM (1 code path) ⚠️

`analyzeContentPatterns()` in [`packages/storyblok-services/src/patterns.ts`](../packages/storyblok-services/src/patterns.ts) calls `listStories()` internally with `perPage: 100` and paginates through all stories. It deeply inspects `content.section[*].components[*]` to extract component frequency, section sequences, sub-item counts, and field profiles.

This is the **heaviest** consumer of `listStories`, but it's **entirely server-side** — it never returns raw stories to the LLM. The MCP tool `analyze_content_patterns` returns the computed analysis result, not the raw stories. A summary mode on the MCP-facing `list_stories` tool would have **no effect** on this code path, and it must continue to receive full content.

### Summary

| Category                          | Count       | Summary mode viable?                      |
| --------------------------------- | ----------- | ----------------------------------------- |
| Metadata-only browsing            | 7 workflows | ✅ Saves ~95% tokens                      |
| Content-consuming n8n workflows   | 4 workflows | ❌ Need content (2 could be refactored)   |
| Internal `analyzeContentPatterns` | 1 code path | ⚠️ N/A — server-side, never hits MCP tool |

---

## Goals

1. **`list_stories` returns metadata-only by default** — The MCP tool response should match its description: IDs, slugs, names, timestamps, published status. No `content` field unless explicitly requested.
2. **Full content remains opt-in** — An `includeContent` parameter allows callers that need the content tree (e.g. n8n bulk workflows) to opt in.
3. **Storyblok asset objects are stripped of boilerplate** — Null/empty fields on asset objects are removed from all tool responses to reduce per-asset token cost from ~150 to ~20 tokens.
4. **No breaking changes to internal code paths** — `analyzeContentPatterns` and other server-side consumers continue to receive full content via the shared library's `listStories()` function.
5. **n8n node gets the same parameter** — The n8n `list` operation for stories gains an `includeContent` toggle, defaulting to `false` for consistency.

### Non-Goals (out of scope)

- **Shortening tool descriptions** — Tool descriptions are already well-scoped and serve as important behavioral guidance for LLMs. Compressing them would save minimal tokens relative to response sizes and risks degrading tool selection quality.
- **Pruning `fieldProfiles` in `analyze_content_patterns`** — While `fieldProfiles` contributes significantly to the `analyze_content_patterns` response size (~50KB), it provides critical field-level guidance for content generation. Optimizing it requires a separate design effort to determine which profiles to prune without losing generation quality.

---

## Architecture Overview

### Storyblok CDN API: `excluding_fields`

The Storyblok Content Delivery API supports an `excluding_fields` parameter that prevents specified fields from being returned. Using `excluding_fields=content` removes the entire nested content tree while preserving all story-level metadata:

```
cdn/stories?per_page=25&excluding_fields=content
```

**Response per story without `content`** (~200 tokens vs. ~5,000+):

```json
{
  "id": 123456789,
  "uuid": "abc-def-123",
  "name": "About Us",
  "slug": "about-us",
  "full_slug": "en/about-us",
  "created_at": "2024-01-15T10:30:00.000Z",
  "published_at": "2024-06-01T14:00:00.000Z",
  "updated_at": "2025-11-20T09:15:00.000Z",
  "sort_by_date": null,
  "position": 0,
  "is_startpage": false,
  "parent_id": 42,
  "group_id": "abc-123",
  "alternates": [],
  "tag_list": [],
  "meta_data": {}
}
```

The `content_type` filter parameter (`?content_type=page`) works at the API level regardless of `excluding_fields`, so filtered listing remains fully functional.

### Asset Stripping

Storyblok asset objects contain 11+ fields, most of which are empty or null by default. Stripping these reduces per-asset overhead from ~150 tokens to ~15–20 tokens:

**Before** (raw Storyblok):

```json
{
  "id": 12345678,
  "alt": "",
  "name": "",
  "focus": "",
  "title": "",
  "source": "",
  "filename": "https://a.storyblok.com/f/…/image.jpg",
  "copyright": "",
  "fieldtype": "asset",
  "meta_data": {},
  "is_external_url": false,
  "is_private": false
}
```

**After** (stripped):

```json
{
  "filename": "https://a.storyblok.com/f/…/image.jpg",
  "fieldtype": "asset"
}
```

Only non-empty, non-null fields are retained. This applies to all tool responses that return story content (`get_story`, `list_stories` with `includeContent`, `search_content`).

---

## Detailed Plan

### Phase 1: Add `excludeContent` Support to `listStories()` Shared Function

**Goal:** Extend the shared `listStories()` function to support content exclusion at the API level.

**Location:** `packages/storyblok-services/src/stories.ts` + `packages/storyblok-services/src/types.ts`

**Steps:**

1. Add `excludeContent?: boolean` to the `ListStoriesOptions` interface in `types.ts`.

2. In `listStories()`, when `excludeContent` is `true`, add `excluding_fields: "content"` to the CDN API params:

   ```typescript
   if (options.excludeContent) {
     params.excluding_fields = "content";
   }
   ```

3. The return type stays `Record<string, any>[]` — stories simply won't have a `content` property when excluded. Callers that need content (like `analyzeContentPatterns`) continue to call `listStories()` without the flag.

**Tests:** Unit test confirming the `excluding_fields` parameter is passed to the API client when `excludeContent: true`.

### Phase 2: Wire `excludeContent` into MCP `list_stories` Tool

**Goal:** Make `list_stories` default to metadata-only in the MCP layer.

**Location:** `packages/storyblok-mcp/src/index.ts`

**Steps:**

1. Add `excludeContent` to the `list_stories` input schema as an optional boolean, defaulting to `true`:

   ```json
   {
     "excludeContent": {
       "type": "boolean",
       "description": "Exclude story content from the response. When true (default), only metadata is returned (id, slug, name, timestamps, published status). Set to false to include the full content tree — use sparingly, as it significantly increases response size.",
       "default": true
     }
   }
   ```

2. In the `list_stories` handler, pass the parameter through:

   ```typescript
   case "list_stories": {
     const validated = schemas.listStories.parse(args);
     const result = await storyblokService.listStories({
       ...validated,
       excludeContent: validated.excludeContent ?? true,
     });
     // ...
   }
   ```

3. Update the Zod schema for `listStories` to include the new optional boolean.

4. Update the tool description to reflect the default behavior:

   > Returns story metadata by default (id, slug, name, timestamps, published status). Pass `excludeContent: false` to include the full content tree — use sparingly in constrained contexts.

**Impact:** The default MCP behavior changes from ~125,000 tokens to ~5,000 tokens for `perPage: 25`. LLMs that need content can still opt in.

### Phase 3: Wire `excludeContent` into n8n `list` Operation

**Goal:** Give the n8n story list operation the same `excludeContent` toggle.

**Location:** `packages/storyblok-n8n/nodes/StoryblokKickstartDs/descriptions/StoryDescription.ts` + `StoryblokKickstartDs.node.ts`

**Steps:**

1. Add an `excludeContent` boolean parameter to `StoryDescription.ts` (displayed when `operation === "list"`), defaulting to `true` with a description matching the MCP tool.

2. In `executeListStories()`, read the parameter and pass it to `listStories()`:

   ```typescript
   const excludeContent = this.getNodeParameter(
     "excludeContent",
     itemIndex,
     true
   ) as boolean;

   const result = await listStories(client, {
     // ...existing params
     excludeContent,
   });
   ```

3. Update the n8n workflow templates that use `list_stories` with full content (templates 4, 7, 9) to explicitly set `excludeContent: false`.

**Impact:** n8n workflows that previously worked with full content continue to work by opting in. New workflows default to the smaller response.

### Phase 4: Asset Stripping for Content-Returning Tools

**Goal:** Strip null/empty boilerplate fields from Storyblok asset objects in all tool responses that return story content.

**Location:** `packages/storyblok-services/src/stories.ts` (new utility function)

**Steps:**

1. Create a `stripEmptyAssetFields()` utility function that recursively walks a content tree and removes empty/null/default fields from asset objects (identified by `fieldtype: "asset"`):

   ```typescript
   const ASSET_DEFAULTS_TO_STRIP = ["", null, undefined, false];
   const ASSET_KEEP_ALWAYS = ["filename", "fieldtype"];

   export function stripEmptyAssetFields(obj: unknown): unknown {
     // Recursively walk. For objects with fieldtype === "asset",
     // delete keys whose values are in ASSET_DEFAULTS_TO_STRIP,
     // empty objects ({}), or empty strings — except ASSET_KEEP_ALWAYS.
   }
   ```

2. Apply `stripEmptyAssetFields()` in the MCP handlers for:

   - `get_story` — before returning the story content
   - `list_stories` (when `excludeContent: false`) — before returning stories
   - `search_content` — before returning search results

3. Do **not** apply stripping to internal code paths (e.g. `analyzeContentPatterns`) or to write tool inputs — only to read-tool outputs heading to the LLM.

**Estimated savings:** ~85% reduction in per-asset token cost (from ~150 to ~20 tokens). For a typical page with 10 asset objects, this saves ~1,300 tokens. For `get_story` on a content-rich page, total savings of ~3,000–5,000 tokens.

**Tests:** Unit test confirming that asset objects are stripped down to non-empty fields, and that non-asset objects are left untouched.

### Phase 5: Documentation Updates

**Goal:** Update all documentation to reflect the new defaults.

**Steps:**

1. **README Token Budget table** — Update the `list_stories` rows to reflect the new default sizes (~5,000 tokens for 25 stories in summary mode). Add a note about `excludeContent: false` for full content.

2. **Copilot instructions** — Update `copilot-instructions.md` to mention that `list_stories` returns metadata-only by default and that `includeContent` / `excludeContent: false` is needed for content inspection workflows.

3. **Skill docs** — Review skill docs for any that mention `list_stories`. The content-audit skill already recommends the `list_stories` → `get_story` pattern, so no changes needed there. The create-page-from-scratch skill uses `list_stories` only for folder discovery, which works with metadata-only.

4. **Content operations doc** — Update workflows §4 (Content Audit), §5 (SEO Monitoring), §6 (Broken Asset Detection), §10 (Freshness Tracker), §11 (Statistics Dashboard), §12 (Automatic Archival) to note whether they need `excludeContent: false`.

---

## Expected Impact

### Token savings per tool call

| Scenario                                 | Before          | After          | Savings                        |
| ---------------------------------------- | --------------- | -------------- | ------------------------------ |
| `list_stories(perPage: 25)` — default    | ~125,000 tokens | ~5,000 tokens  | **96%**                        |
| `list_stories(perPage: 5)` — constrained | ~25,000 tokens  | ~1,000 tokens  | **96%**                        |
| `list_stories(perPage: 100)` — bulk      | ~500,000 tokens | ~20,000 tokens | **96%**                        |
| `get_story` (6-section page)             | ~5,000 tokens   | ~3,500 tokens  | **30%** (asset stripping only) |
| `search_content` (10 results)            | ~50,000 tokens  | ~35,000 tokens | **30%** (asset stripping only) |

### Typical Claude Web session budget

A Claude Web session with ~150K token context can currently fit:

- **Before:** 1 `list_stories` call (barely) + no room for follow-up
- **After:** 1 `list_stories` call (~5K) + `plan_page` (~1K) + 5× `generate_section` (~15K) + `create_page_with_content` (~2K) = ~23K total, leaving ample room for reasoning

---

## Migration & Backward Compatibility

### Breaking change: `list_stories` default behavior

This is a **behavioral change** to the MCP tool's default output. LLMs that previously relied on getting full content from `list_stories` will need to pass `excludeContent: false` or switch to `get_story` for individual stories.

**Mitigation:**

- The tool description explicitly states the new default.
- The `excludeContent` parameter description explains how to opt in to full content.
- The Storyblok CDN API `excluding_fields` parameter is well-established and reliable.

### No impact on internal consumers

- `analyzeContentPatterns()` calls `listStories()` directly without `excludeContent`, so it continues to receive full content.
- `processForStoryblok()`, `validateSections()`, and other shared functions are unaffected — they process content that's already been fetched, not content from `list_stories` responses.

### n8n workflow template updates

Templates 4, 7, and 9 need `excludeContent: false` added to their `list` node parameters. This is a one-line addition to each template JSON file and doesn't change their behavior.

---

## Implementation Order

| Phase | Description                                | Files Changed                                                     | Effort |
| ----- | ------------------------------------------ | ----------------------------------------------------------------- | ------ |
| 1     | `excludeContent` in shared `listStories()` | `storyblok-services/src/stories.ts`, `types.ts`                   | Small  |
| 2     | MCP tool parameter + handler               | `storyblok-mcp/src/index.ts`                                         | Small  |
| 3     | n8n node parameter + handler               | `storyblok-n8n/…/StoryDescription.ts`, `StoryblokKickstartDs.node.ts` | Small  |
| 4     | Asset stripping utility                    | `storyblok-services/src/stories.ts` (or new `strip.ts`)           | Medium |
| 5     | Documentation updates                      | README, copilot-instructions, skill docs, content-ops doc         | Small  |

Total estimated effort: **~1 day**. Phases 1–3 are straightforward parameter threading. Phase 4 requires a recursive tree walker but is well-scoped. Phase 5 is documentation-only.
