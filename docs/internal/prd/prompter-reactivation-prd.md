# PRD: Prompter Component Reactivation & Guided Generation Integration

**Status:** ✅ Complete — All 5 phases implemented. Manual Visual Editor testing (5.1) remains as follow-up.
**Date:** 2026-02-24
**Author:** Generated from codebase analysis

---

## 1. Background & Problem Statement

### What Is the Prompter?

The Prompter is an **in-Visual-Editor AI content generation component** for Storyblok. Content editors place it inside a `section` in Storyblok's Visual Editor. From there, they can:

1. Select a Storyblok **Idea** as seed content
2. Configure generation parameters (section count, system prompt, user prompt, story context)
3. Click **"Generate Content"** — which calls OpenAI structured outputs via `/api/content`
4. **Preview** the generated sections inline (rendered as real kickstartDS components)
5. Click **"Save Content"** — which calls `/api/import` to **replace the Prompter component itself** in the story with the generated sections

The key architectural insight: the Prompter reads its own Storyblok `_uid` from the DOM and passes it to the import API, which locates and replaces the Prompter blok in the story's section array. After saving, the Prompter is gone and the AI-generated sections take its place.

### Why Was It Deactivated?

During the refactoring that introduced the shared services library (`@kickstartds/storyblok-services`), the MCP server's guided generation tools, and multi-content-type support, the Prompter's component registration was **commented out** in [packages/website/components/index.tsx](../packages/website/components/index.tsx#L248-L253):

```tsx
// prompter: editable(
//   dynamic(() =>
//     import("./prompter/PrompterComponent").then(
//       (mod) => mod.PrompterComponent
//     )
//   )
// ),
```

This is the **only deactivation point**. All other infrastructure remains intact:

| Artifact                                                         | Status                                            |
| ---------------------------------------------------------------- | ------------------------------------------------- |
| Component files (`packages/website/components/prompter/`)        | ✅ All 9 sub-components + main component present  |
| Section schema (`anyOf` reference to `prompter.schema.json`)     | ✅ Still included                                 |
| CMS component definition (`cms/components.123456.json`, id: 299) | ✅ Still defined                                  |
| API routes (`/api/content`, `/api/import`, `/api/ideas`)         | ✅ All present and functional                     |
| Shared services (`importByPrompterReplacement`)                  | ✅ Exported and used by MCP + n8n                 |
| MCP tool `import_content` (prompter UID-based)                   | ✅ Fully active                                   |
| n8n "Import" operation (prompter mode)                           | ✅ Fully active                                   |
| Tests for prompter replacement                                   | ✅ Exist in both storyblok-services and n8n-nodes |

### The Gap

The Prompter was built before the MCP server gained its guided generation toolkit. It uses a **monolithic, single-shot generation approach** that is now significantly inferior to the MCP server's multi-step workflow:

| Capability            | Old Prompter                                                     | MCP Server (Current)                                                                                     |
| --------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Generation strategy   | Single `generateStructuredContent` call for all sections at once | `plan_page` → `generate_section` (per section) → `generate_root_field` → `generate_seo`                  |
| Site awareness        | None — no pattern analysis                                       | `analyze_content_patterns` injects component frequency, sub-item counts, section sequences               |
| Recipe best practices | None                                                             | `list_recipes` + automatic recipe injection in `generate_section`                                        |
| Field-level guidance  | None                                                             | Field value distributions + compositional hints from `guidance.ts`                                       |
| Transition context    | None                                                             | `previousSection` / `nextSection` context for coherent flow                                              |
| Content types         | Hardcoded to `page` only                                         | 5 content types via schema registry (`page`, `blog-post`, `blog-overview`, `event-detail`, `event-list`) |
| Root fields           | Not supported                                                    | `generate_root_field` for `head`, `aside`, `cta`; `generate_seo` for SEO metadata                        |
| Asset upload          | Not supported                                                    | `uploadAssets: true` downloads + uploads to Storyblok CDN                                                |
| Quality checks        | None                                                             | Compositional quality warnings (duplicate heroes, sparse stats, missing CTAs, etc.)                      |
| Schema caching        | Client-side, per-render                                          | Server-side startup cache in registry                                                                    |
| Validation            | Basic (API-side only)                                            | Schema-driven validation with nesting rules + compositional warnings                                     |

**Goal:** Reactivate the Prompter component and integrate it with the guided generation workflow so that content editors in the Visual Editor get the same high-quality, site-aware, section-by-section generation that MCP/n8n users enjoy — without needing to leave Storyblok.

---

## 2. Goals & Non-Goals

### Goals

1. **Re-enable the Prompter** in the component registry so it renders in the Visual Editor again
2. **Support two generation modes** via an editor-facing toggle:
   - **Section mode** — the editor builds an ordered list of one or more component types (e.g. `[faq]` or `[features, testimonials, cta]`), writes a prompt, and each section is generated via `generate_section`. Ideal for inserting a Prompter between existing sections on an already-populated page. The key distinction: **the editor controls exactly which sections are generated and in what order.**
   - **Page mode** — the editor provides an intent and the **AI proposes the section sequence** via `plan_page`. The editor reviews and can adjust the plan before generation. Ideal for bootstrapping a new page from scratch. The key distinction: **the AI controls the section selection.**
3. **Add site-aware context** — patterns, recipes, field guidance — to Prompter-driven generation in both modes
4. **Support multi-content-type generation** — detect the current story's content type and use the appropriate schema
5. **Add asset upload support** — generated image URLs are uploaded to Storyblok CDN on import
6. **Surface compositional quality warnings** — show the editor any issues before they save
7. **Improve the preview experience** — in page mode, render sections incrementally as they're generated; in section mode, show the single section preview immediately
8. **Remove hardcoded credentials and German-language strings** — clean up tech debt from the prototype

### Non-Goals

- Replacing the MCP server or n8n nodes — the Prompter is an **additional** interface for the same underlying pipeline
- Supporting Tier 2 flat content types (`event-detail`, `event-list`) in the Prompter's first iteration — these have no section array, so the "replace prompter in sections" pattern doesn't apply directly
- Building a full page builder UI — the Prompter is a lightweight generation trigger, not a drag-and-drop editor
- Removing the `import_content` MCP tool — it remains useful for programmatic prompter replacement from external agents

---

## 3. Proposed Architecture

### 3.1 New API Routes

Replace the three existing API routes with a richer set that mirrors the MCP server's guided generation tools. All new routes delegate to `@kickstartds/storyblok-services` shared functions.

| Route                            | Method | Purpose                                          | Shared Service Function                       |
| -------------------------------- | ------ | ------------------------------------------------ | --------------------------------------------- |
| `/api/prompter/patterns`         | GET    | Analyze content patterns for site context        | `analyzeContentPatterns()`                    |
| `/api/prompter/recipes`          | GET    | List section recipes, templates, anti-patterns   | Static JSON from `section-recipes.json`       |
| `/api/prompter/plan`             | POST   | Plan page structure (section sequence)           | `planPage()` (new, extracted from MCP)        |
| `/api/prompter/generate-section` | POST   | Generate a single section with site context      | `generateSection()` (new, extracted from MCP) |
| `/api/prompter/import`           | POST   | Import generated sections (prompter replacement) | `importByPrompterReplacement()`               |
| `/api/prompter/ideas`            | GET    | Fetch Storyblok Ideas                            | Direct Storyblok API call                     |

**Key change:** The monolithic `/api/content` route (which took a raw schema and prompt) is replaced by `/api/prompter/plan` + `/api/prompter/generate-section`, which encapsulate the schema preparation, pattern analysis, recipe injection, and field guidance internally.

The existing `/api/content`, `/api/import`, and `/api/ideas` routes should be preserved for backward compatibility but can be deprecated.

### 3.2 Shared Service Extraction (✅ Complete)

The MCP server's `plan_page` and `generate_section` logic has been extracted into the shared services library:

1. **`planPageContent()`** — extracted to `packages/storyblok-services/src/plan.ts`

   - Inputs: OpenAI client, `ContentTypeEntry` from registry, options (intent, patterns, recipes, sectionCount)
   - Outputs: section sequence plan, rootFieldMeta (for hybrid types)
   - Internally resolves components/fields from registry, builds dynamic OpenAI schema, handles Tier 1 vs Tier 2 content types

2. **`generateSectionContent()`** — extracted to `packages/storyblok-services/src/generate-section.ts`

   - Inputs: OpenAI client, `ContentTypeEntry`, options (componentType, prompt, previousSection, nextSection, patterns, recipes)
   - Outputs: generated section object (Design System format + Storyblok-ready format)
   - Internally builds layered system prompt with site context, transition awareness, recipe best practices, and field-level guidance

3. **`generateRootFieldContent()`** — already in `packages/storyblok-services/src/pipeline.ts`

4. **`generateSeoContent()`** — already in `packages/storyblok-services/src/pipeline.ts`

The MCP server's tool handlers are now thin wrappers (~40 lines each) around these shared functions. Both the Prompter's API routes and the n8n node can call the same shared functions directly.

### 3.3 Generation Modes

The Prompter supports two distinct generation modes, toggled by the editor in Step 1. The mode fundamentally changes the flow:

| Aspect               | Section Mode                                                         | Page Mode                                         |
| -------------------- | -------------------------------------------------------------------- | ------------------------------------------------- |
| Use case             | Add 1–N sections to an existing page                                 | Bootstrap a new page from scratch                 |
| Who picks sections   | **Editor** selects component types manually                          | **AI** proposes via `plan_page`; editor reviews   |
| Planning step        | Skipped — editor builds ordered list of component types              | AI-assisted via `plan_page`                       |
| Generation           | `generate_section` × N (one per editor-selected type)                | `generate_section` × N (one per planned section)  |
| Import result        | Prompter replaced by 1–N sections                                    | Prompter replaced by N sections                   |
| Context (1 section)  | `previousSection` / `nextSection` from surrounding story sections    | N/A (plan always has multiple sections)           |
| Context (N sections) | First/last sections use story context; inner sections use each other | Transition context derived from the plan sequence |
| Typical placement    | Between existing sections on a populated page                        | Only Prompter in an otherwise empty page          |

### 3.4 Updated Prompter Component Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   Storyblok Visual Editor                       │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  Prompter Component                       │  │
│  │                                                           │  │
│  │  Step 1: Configure                                        │  │
│  │  ┌──────────────────────────────────────────────────────┐ │  │
│  │  │ • Mode toggle: [Section ↔ Page]                      │ │  │
│  │  │ • Select Idea (optional, from Storyblok Ideas)       │ │  │
│  │  │ • Enter intent / user prompt                         │ │  │
│  │  │ • Content type auto-detected from current story      │ │  │
│  │  │ • Toggle: include current story as context           │ │  │
│  │  │                                                      │ │  │
│  │  │   Section mode only:                                 │ │  │
│  │  │   • Component type picker (hero, faq, features, ...) │ │  │
│  │  │   • [+ Add another section] to build a list          │ │  │
│  │  │   • [Generate] button                                │ │  │
│  │  │                                                      │ │  │
│  │  │   Page mode only:                                    │ │  │
│  │  │   • [Plan Content] button                            │ │  │
│  │  └──────────────────────────────────────────────────────┘ │  │
│  │                          │                                │  │
│  │              ┌───────────┴───────────┐                    │  │
│  │              ▼                       ▼                    │  │
│  │                                                           │  │
│  │  ┌─ Section Mode ─────────┐  ┌─ Page Mode ─────────────┐ │  │
│  │  │                        │  │                          │ │  │
│  │  │  Step 2: Generate      │  │  Step 2: Review Plan     │ │  │
│  │  │  ┌──────────────────┐  │  │  ┌────────────────────┐  │ │  │
│  │  │  │ generate_section │  │  │  │ Section sequence   │  │ │  │
│  │  │  │ × N (sequential) │  │  │  │ from plan_page     │  │ │  │
│  │  │  │                  │  │  │  │ e.g. hero →        │  │ │  │
│  │  │  │ 1 section: uses  │  │  │  │ features →         │  │ │  │
│  │  │  │ surrounding      │  │  │  │ testimonials → cta │  │ │  │
│  │  │  │ story context    │  │  │  │                    │  │ │  │
│  │  │  │                  │  │  │  │ Editor can reorder │  │ │  │
│  │  │  │ N sections: edge │  │  │  │ remove, or add     │  │ │  │
│  │  │  │ sections use     │  │  │  │                    │  │ │  │
│  │  │  │ story context,   │  │  │  │                    │  │ │  │
│  │  │  │ inner use each   │  │  │  │                    │  │ │  │
│  │  │  │ other            │  │  │  │                    │  │ │  │
│  │  │  └──────────────────┘  │  │  │ [Generate All]     │  │ │  │
│  │  │          │             │  │  └────────────────────┘  │ │  │
│  │  │          │             │  │          │               │ │  │
│  │  │          │             │  │          ▼               │ │  │
│  │  │          │             │  │  Step 3: Generate &      │ │  │
│  │  │          │             │  │  Preview (per section)   │ │  │
│  │  │          │             │  │  ┌────────────────────┐  │ │  │
│  │  │          │             │  │  │ Sequential calls   │  │ │  │
│  │  │          │             │  │  │ to generate_section│  │ │  │
│  │  │          │             │  │  │ with transition    │  │ │  │
│  │  │          │             │  │  │ context between    │  │ │  │
│  │  │          │             │  │  │ sections           │  │ │  │
│  │  │          │             │  │  │                    │  │ │  │
│  │  │          │             │  │  │ Progress: 2 of 5   │  │ │  │
│  │  │          │             │  │  │ [Regenerate] per   │  │ │  │
│  │  │          │             │  │  │ section            │  │ │  │
│  │  │          │             │  │  └────────────────────┘  │ │  │
│  │  │          │             │  │          │               │ │  │
│  │  └──────────┼─────────────┘  └──────────┼───────────────┘ │  │
│  │              └───────────┬───────────────┘                │  │
│  │                          ▼                                │  │
│  │  Step 3/4: Preview & Save (shared)                        │  │
│  │  ┌──────────────────────────────────────────────────────┐ │  │
│  │  │ • Preview: rendered section(s) with "AI Draft" badge │ │  │
│  │  │ • Compositional quality warnings (if any)            │ │  │
│  │  │ • [Save Content] replaces Prompter with section(s)   │ │  │
│  │  │ • Asset upload happens server-side during import     │ │  │
│  │  │ • [Discard] removes generated content                │ │  │
│  │  └──────────────────────────────────────────────────────┘ │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

#### Section Mode: Context from Surrounding Sections

In section mode, the Prompter is placed between existing sections. The component reads the story's current section array to determine the component types of the sections immediately before and after the Prompter's position.

**Single section** (e.g. editor picks `[faq]`): If the story has `[hero, features, PROMPTER, testimonials, cta]`, the call passes `previousSection: "features"` and `nextSection: "testimonials"`.

**Multiple sections** (e.g. editor picks `[faq, stats, cta]`): The first section uses `previousSection` from the story (the section before the Prompter) and `nextSection` from the editor's list. Inner sections use their neighbors from the list. The last section uses `nextSection` from the story (the section after the Prompter). For example, with story `[hero, PROMPTER, contact]` and editor list `[faq, stats, cta]`:

| Section       | `previousSection`     | `nextSection`            |
| ------------- | --------------------- | ------------------------ |
| `faq` (1st)   | `"hero"` (from story) | `"stats"` (from list)    |
| `stats` (2nd) | `"faq"` (from list)   | `"cta"` (from list)      |
| `cta` (3rd)   | `"stats"` (from list) | `"contact"` (from story) |

This hybrid context approach gives each section awareness of both the existing page structure and its generated neighbors.

#### Page Mode: Context from the Plan

In page mode, there are no surrounding sections to derive context from (the page is typically empty except for the Prompter). Instead, the planned sequence itself provides transition context: when generating section 3 of `[hero, features, faq, cta]`, the call passes `previousSection: "features"` and `nextSection: "cta"`.

### 3.5 Content Type Detection

The Prompter currently hardcodes `page` as the content type. The updated Prompter should:

1. Read the current story via the Storyblok API (already done)
2. Detect the story's root `component` field (e.g. `page`, `blog-post`, `blog-overview`)
3. Pass the detected content type to `plan_page` (page mode) and `generate_section` (both modes)
4. For Tier 1 section-based types: both modes available
5. For hybrid types (`blog-post`): page mode includes root field generation; section mode generates individual sections only

### 3.6 Schema Handling

The current Prompter runs `prepareSchemaForOpenAi` client-side on every render. The updated architecture:

- **Server-side schema preparation:** The `/api/prompter/generate-section` route handles schema prep internally via the shared services registry (which caches dereferenced schemas at startup)
- **Client sends only:** `componentType`, `prompt`, `previousSection`, `nextSection`, `contentType`
- **No raw JSON Schema in the browser**

---

## 4. Detailed Task Breakdown

### Phase 1: Cleanup & Reactivation (Low Risk)

| #   | Task                                                                                | Files                                                        | Effort |
| --- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------ |
| 1.1 | Uncomment Prompter registration in component index                                  | `packages/website/components/index.tsx`                      | S      |
| 1.2 | Remove `@ts-nocheck` from `PrompterComponent.tsx` and fix TypeScript errors         | `packages/website/components/prompter/PrompterComponent.tsx` | M      |
| 1.3 | Remove hardcoded Storyblok API token (`"tiiyPe4tqKDSQEdBa9qtRwtt"`) — use env var   | `PrompterComponent.tsx`                                      | S      |
| 1.4 | Replace German-language UI strings with English (or add i18n)                       | `PrompterComponent.tsx`, sub-components                      | S      |
| 1.5 | Verify the Prompter renders in Storyblok Visual Editor with the existing (old) flow | Manual testing                                               | S      |

### Phase 2: Service Extraction (✅ Complete)

| #   | Task                                                                                        | Files                                            | Status |
| --- | ------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------ |
| 2.1 | Extract `planPageContent()` from MCP server into `storyblok-services/src/plan.ts`           | New file + MCP server refactor                   | ✅     |
| 2.2 | Extract `generateSectionContent()` into `storyblok-services/src/generate-section.ts`        | New file + MCP server refactor                   | ✅     |
| 2.3 | Verify `generateRootField()` and `generateSeo()` are already extractable from `pipeline.ts` | `storyblok-services/src/pipeline.ts`             | ✅     |
| 2.4 | Update MCP server tool handlers to use extracted shared functions                           | `packages/storyblok-mcp/src/index.ts`               | ✅     |
| 2.5 | Update n8n node operations to use extracted shared functions                                | `packages/storyblok-n8n/nodes/StoryblokKickstartDs/` | ⬜     |
| 2.6 | Add tests for extracted functions                                                           | `packages/storyblok-services/test/`              | ⬜     |
| 2.7 | Ensure patterns cache can be initialized from API routes (not just MCP server startup)      | `storyblok-services/src/patterns.ts`             | ⬜     |

### Phase 3: New API Routes (Medium Risk)

| #   | Task                                                                                                            | Files                                                     | Effort |
| --- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------ |
| 3.1 | Create `/api/prompter/patterns` route                                                                           | `packages/website/pages/api/prompter/patterns.ts`         | S      |
| 3.2 | Create `/api/prompter/recipes` route                                                                            | `packages/website/pages/api/prompter/recipes.ts`          | S      |
| 3.3 | Create `/api/prompter/plan` route                                                                               | `packages/website/pages/api/prompter/plan.ts`             | M      |
| 3.4 | Create `/api/prompter/generate-section` route                                                                   | `packages/website/pages/api/prompter/generate-section.ts` | M      |
| 3.5 | Create `/api/prompter/import` route (wrapping existing `importByPrompterReplacement` with asset upload support) | `packages/website/pages/api/prompter/import.ts`           | M      |
| 3.6 | Move `/api/ideas` to `/api/prompter/ideas` (keep old route as redirect)                                         | `packages/website/pages/api/prompter/ideas.ts`            | S      |

### Phase 4: Component Rewrite (High Effort)

| #    | Task                                                                                                  | Files                                | Effort |
| ---- | ----------------------------------------------------------------------------------------------------- | ------------------------------------ | ------ |
| 4.1  | Add mode toggle UI (Section ↔ Page) with distinct flows branching after Step 1                        | `PrompterComponent.tsx`              | L      |
| 4.2  | **Section mode:** Add component type picker with "+ Add another section" to build an ordered list     | New sub-component                    | M      |
| 4.3  | **Section mode:** Derive hybrid context (story neighbors for edge sections, list neighbors for inner) | `PrompterComponent.tsx`              | M      |
| 4.4  | **Section mode:** Sequential `generate_section` calls with progress (reuse page mode progress UI)     | `PrompterComponent.tsx`              | L      |
| 4.5  | **Page mode:** Add plan review UI (section sequence display, reorder, add/remove)                     | New sub-component                    | L      |
| 4.6  | **Page mode:** Implement section-by-section generation with progress indicator                        | `PrompterComponent.tsx`              | L      |
| 4.7  | **Page mode:** Add per-section regenerate button in preview                                           | `PrompterComponent.tsx`              | M      |
| 4.8  | **Shared:** Add content type auto-detection from current story                                        | `PrompterComponent.tsx`              | S      |
| 4.9  | **Shared:** Add compositional quality warnings display                                                | New sub-component                    | M      |
| 4.10 | **Shared:** Remove client-side schema preparation (move to server)                                    | `PrompterComponent.tsx`              | M      |
| 4.11 | **Shared:** Update preview rendering to handle all current component types                            | `PrompterComponent.tsx` componentMap | S      |

### Phase 5: Polish & Testing (Medium Risk)

| #   | Task                                                                          | Files                            | Effort |
| --- | ----------------------------------------------------------------------------- | -------------------------------- | ------ |
| 5.1 | End-to-end testing in Storyblok Visual Editor                                 | Manual                           | L      |
| 5.2 | Add loading states and error handling for each API call                       | `PrompterComponent.tsx`          | M      |
| 5.3 | Handle edge cases: no OpenAI key, no patterns, empty plan                     | API routes + component           | M      |
| 5.4 | Deprecate old `/api/content`, `/api/import`, `/api/ideas` routes              | Old API routes                   | S      |
| 5.5 | Update CMS component schema if new fields needed (e.g. content type selector) | `prompter.schema.json`, CMS push | S      |
| 5.6 | Documentation update                                                          | `docs/skills/`, `README.md`      | M      |

---

## 5. Schema Changes

### Current Prompter Schema (`prompter.schema.json`)

```json
{
  "sections": { "type": "integer" },
  "includeStory": { "type": "boolean", "default": true },
  "useIdea": { "type": "boolean", "default": true },
  "relatedStories": { "type": "array", "items": { "type": "string" } },
  "userPrompt": { "type": "string" },
  "systemPrompt": { "type": "string" }
}
```

### Proposed Schema Additions

```json
{
  "mode": {
    "type": "string",
    "enum": ["section", "page"],
    "default": "section",
    "description": "Generation mode. 'section' generates editor-selected sections via generate_section (1 or more). 'page' uses plan_page → generate_section (×N) for AI-planned full-page generation."
  },
  "componentTypes": {
    "type": "array",
    "items": { "type": "string" },
    "description": "Ordered list of component types to generate (section mode only). E.g. ['faq'] for a single section, or ['features', 'testimonials', 'cta'] for multiple. Ignored in page mode where the plan determines component types."
  },
  "sections": {
    "type": "integer",
    "description": "Deprecated — in page mode, section count is determined by plan_page. In section mode, determined by componentTypes array length. Kept for backward compat."
  },
  "includeStory": { "type": "boolean", "default": true },
  "useIdea": { "type": "boolean", "default": true },
  "relatedStories": { "type": "array", "items": { "type": "string" } },
  "userPrompt": {
    "type": "string",
    "description": "In section mode: prompt describing the section(s) content — shared across all selected component types. In page mode: intent for page planning (e.g. 'product landing page for our new API')."
  },
  "systemPrompt": {
    "type": "string",
    "description": "Optional system prompt override (default: auto-generated with site context)"
  },
  "contentType": {
    "type": "string",
    "enum": ["page", "blog-post", "blog-overview"],
    "default": "page",
    "description": "Content type for generation. Auto-detected from story if not set."
  },
  "startsWith": {
    "type": "string",
    "description": "Optional slug prefix filter for pattern analysis (e.g. 'case-studies/' to match style of that section)"
  },
  "uploadAssets": {
    "type": "boolean",
    "default": true,
    "description": "Upload generated image URLs to Storyblok CDN on save"
  }
}
```

**Note on `mode` default:** The default is `"section"` because single-section generation is the more common editorial use case — editors typically have an existing page and want to add one section. The `"page"` mode is opted into when bootstrapping from scratch.

---

## 6. Migration Path

### For Existing Prompter Instances in Storyblok

If any stories currently have Prompter bloks (from before deactivation), they will start rendering again after Phase 1. The old flow (monolithic generation) will still work via the existing `/api/content` and `/api/import` routes.

The Phase 4 component rewrite introduces the new multi-step flow. Since the Prompter is ephemeral by design (it replaces itself on save), there's no data migration concern — old Prompter instances simply get the new UI.

### For MCP Server & n8n Nodes

The Phase 2 extraction is a **refactor, not a behavior change**. After extraction:

- MCP tool handlers become thin wrappers: `plan_page` tool calls `planPage()` from shared services
- n8n node operations call the same shared functions
- All three interfaces (Prompter, MCP, n8n) use identical generation logic

### Backward Compatibility

- Old API routes (`/api/content`, `/api/import`, `/api/ideas`) remain functional but deprecated
- The `import_content` MCP tool continues to accept `prompterUid` — unchanged
- The `sections` schema field is preserved but ignored by the new flow (plan determines section count)

---

## 7. Open Questions

1. **Should the Prompter support Tier 2 flat types (`event-detail`, `event-list`)?**
   These don't have a section array, so the "replace prompter" pattern doesn't apply. Options: (a) skip for v1, (b) use a different insertion strategy (replace entire story content), (c) restrict Prompter to section-based types only.

2. **Should plan editing be rich or lightweight?**
   The plan review step (Step 2) could be a simple list with reorder, or a more visual component-type picker with descriptions. Start lightweight and iterate.

3. **Should we stream section generation results?**
   OpenAI structured outputs don't support streaming, but we can show each section's preview as soon as its API call completes (parallel or sequential). Sequential with progress is simpler and provides transition context.

4. **How should asset upload interact with the preview?**
   Option A: Upload on save (simpler — preview shows external URLs, save uploads to CDN).
   Option B: Upload during generation (preview shows CDN URLs immediately, but slower).
   Recommendation: Option A — upload on save via the import API route.

5. **Should the Prompter's "Idea" integration be preserved?**
   The Storyblok Ideas feature is lightweight and may not be used by all teams. Consider making it optional (already gated by `useIdea` flag) and enhancing the user prompt field to be the primary input.

6. **~~Should there be a way to generate into an existing page (append sections)?~~** → Resolved by the **Section mode**.
   Section mode is specifically designed for this: drop a Prompter between existing sections, pick one or more component types, and it replaces itself with the generated sections in-place. Since the Prompter sits at the exact position in the section array where the editor placed it, the result is an "insert at position" effect — whether it's 1 section or 3.

7. **Should the mode default be configurable per-space or per-story-type?**
   The schema defaults to `"section"` mode. But for certain content types (e.g. `page` on a brand-new story), `"page"` mode might be the better default. Consider auto-selecting the mode based on whether the story already has other sections: if the Prompter is the only section → default to page mode; if surrounded by other sections → default to section mode.

8. **Should section mode offer a "quick pick" vs. "custom prompt" sub-flow?**
   In section mode, the editor must currently select a component type AND write a prompt. For fast workflows, a "quick pick" variant could offer pre-configured section templates from `list_recipes` (e.g. "FAQ section with 5 items about our product") that only need a single click.

---

## 8. Success Metrics

- **Reactivation:** Prompter renders and generates content in the Visual Editor (Phase 1)
- **Quality:** Generated content quality matches MCP server output (same pipeline, same context injection)
- **Usability:** Content editors can go from intent to published sections in < 3 minutes
- **Code sharing:** Zero duplication between Prompter API routes, MCP tools, and n8n operations — all use shared services
- **Reliability:** Compositional quality warnings surface before save, preventing common structural issues

---

## 9. Dependencies

- `@kickstartds/storyblok-services` — exports `planPageContent`, `generateSectionContent` (extracted in Phase 2), plus existing `generateRootFieldContent`, `generateSeoContent`, `importByPrompterReplacement`
- `@kickstartds/ds-agency-premium` — component library (already a dependency)
- OpenAI API key — required for generation (already configured via `NEXT_OPENAI_API_KEY`)
- Storyblok Management API credentials — required for import (already configured)

---

## 10. Appendix: Current File Inventory

### Prompter Component Files (all in `packages/website/components/prompter/`)

| File                            | Purpose                                                  |
| ------------------------------- | -------------------------------------------------------- |
| `PrompterComponent.tsx`         | Main component (504 lines) — generation, preview, import |
| `PrompterProps.ts`              | TypeScript interface                                     |
| `PrompterDefaults.ts`           | Default prop values                                      |
| `prompter.schema.json`          | JSON Schema                                              |
| `prompter.schema.dereffed.json` | Dereferenced schema with `$defs`                         |
| `prompter.scss`                 | Main styles                                              |
| `prompter-badge/`               | "KI Draft" / "AI Draft" badge for unsaved content        |
| `prompter-button/`              | Action buttons (Generate, Save, Discard, Reload)         |
| `prompter-headline/`            | Section headline                                         |
| `prompter-loading-indicator/`   | Three-dots animation during generation                   |
| `prompter-section/`             | Wrapper section for Prompter UI                          |
| `prompter-section-input/`       | Input area for idea selection                            |
| `prompter-select-field/`        | Dropdown for idea selection                              |
| `prompter-selection-display/`   | Shows selected idea                                      |
| `prompter-submitted-text/`      | Post-save message                                        |

### API Routes

| Route          | File                                          |
| -------------- | --------------------------------------------- |
| `/api/content` | `packages/website/pages/api/content/index.ts` |
| `/api/import`  | `packages/website/pages/api/import/index.ts`  |
| `/api/ideas`   | `packages/website/pages/api/ideas/index.ts`   |

### Shared Services (Prompter-relevant exports)

| Function                        | File                  | Used By                                |
| ------------------------------- | --------------------- | -------------------------------------- |
| `prepareSchemaForOpenAi()`      | `schema.ts`           | Prompter (client-side), MCP            |
| `generateStructuredContent()`   | `pipeline.ts`         | Prompter (via `/api/content`), MCP     |
| `processOpenAiResponse()`       | `transform.ts`        | Prompter (client-side), MCP            |
| `processForStoryblok()`         | `transform.ts`        | Prompter (client-side), MCP, n8n       |
| `importByPrompterReplacement()` | `import.ts`           | Prompter (via `/api/import`), MCP, n8n |
| `validateSections()`            | `validate.ts`         | Prompter (via `/api/import`), MCP, n8n |
| `analyzeContentPatterns()`      | `patterns.ts`         | MCP, Prompter (via API route)          |
| `assembleFieldGuidance()`       | `guidance.ts`         | MCP (needs Prompter route)             |
| `planPageContent()`             | `plan.ts`             | MCP, Prompter (via API route), n8n     |
| `generateSectionContent()`      | `generate-section.ts` | MCP, Prompter (via API route), n8n     |
| `createOpenAiClient()`          | `openai.ts`           | Prompter (via `/api/content`), MCP     |
| `createStoryblokClient()`       | `storyblok.ts`        | Prompter (via `/api/import`), MCP, n8n |
