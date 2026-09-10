# Prompter Reactivation Implementation Progress

> **Status: � COMPLETE** — Phases 1–5 complete. Manual testing (5.1) and documentation (5.6) remain as follow-up.
> Companion PRD: [prompter-reactivation-prd.md](../prd/prompter-reactivation-prd.md)

## Phase 1: Cleanup & Reactivation (Low Risk) ✅

- [x] 1.1 Uncomment Prompter registration in `packages/website/components/index.tsx`
- [x] 1.2 Remove `@ts-nocheck` from `PrompterComponent.tsx` — no TypeScript errors found
- [x] 1.3 Remove hardcoded Storyblok API token — now uses `NEXT_PUBLIC_STORYBLOK_API_TOKEN` env var
- [x] 1.4 Replace German-language UI strings with English (component + 2 sub-components)
- [ ] 1.5 Verify Prompter renders in Storyblok Visual Editor (manual testing)

## Phase 2: Service Extraction (Medium Risk) ✅

### 2.1 Extract `planPage()` (🔴 Critical — 319 lines inline in MCP server) ✅

- [x] 2.1.1 Create `packages/storyblok-services/src/plan.ts` with `planPageContent()` function
- [x] 2.1.2 Extract `formatPatternsContext()` helper (shared by plan + generate-section)
- [x] 2.1.3 Extract pattern context string assembly (component frequency, sequences, sub-item counts)
- [x] 2.1.4 Extract component name resolution (tier 1 vs tier 2 detection, container slot names)
- [x] 2.1.5 Extract root field meta extraction for hybrid types
- [x] 2.1.6 Extract prompt construction (flat vs section-based branches)
- [x] 2.1.7 Extract OpenAI schema construction (enum generation for valid component types)
- [x] 2.1.8 Extract usage instruction assembly
- [x] 2.1.9 Export `planPageContent()`, `formatPatternsContext()`, and types from `storyblok-services/src/index.ts`

### 2.2 Extract `generateSection()` (🟡 High — 144 lines inline) ✅

- [x] 2.2.1 Create `packages/storyblok-services/src/generate-section.ts` with `generateSectionContent()`
- [x] 2.2.2 Reuse shared `formatPatternsContext()` from plan.ts (not directly used — site context is component-specific)
- [x] 2.2.3 Extract site context assembly (sub-component stats + frequency → prose)
- [x] 2.2.4 Extract system prompt layering (base + placeholder images + site context + transitions + recipes + field guidance)
- [x] 2.2.5 Extract response unwrapping (page envelope → first section)
- [x] 2.2.6 Export `generateSectionContent()` and types from `storyblok-services/src/index.ts`

### 2.3 Verify `generateRootField()` and `generateSeo()` are already extracted ✅

- [x] 2.3.1 Confirmed `generateRootFieldContent()` in `pipeline.ts` is fully self-contained
- [x] 2.3.2 Confirmed `generateSeoContent()` in `pipeline.ts` is fully self-contained
- [x] 2.3.3 No additional extraction needed (⚪ already done per research)

### 2.4 Update MCP server to use extracted functions ✅

- [x] 2.4.1 Replace inline `plan_page` logic in `index.ts` with call to shared `planPageContent()`
- [x] 2.4.2 Replace inline `generate_section` logic in `index.ts` with call to shared `generateSectionContent()`
- [x] 2.4.3 Update `services.ts` imports + re-exports + add `getClient()` method to `ContentGenerationService`
- [x] 2.4.4 Verified MCP server builds successfully — `pnpm --filter @kickstartds/storyblok-mcp-server run build` ✅

### 2.5 Update n8n node operations ✅

- [x] 2.5.1 n8n nodes use shared services — new exports available automatically
- [x] 2.5.2 Verified n8n node builds successfully — `pnpm --filter n8n-nodes-storyblok-kickstartds run build` ✅

### 2.6 Add tests for extracted functions

- [ ] 2.6.1 Add unit tests for `planPageContent()` in `storyblok-services/test/`
- [ ] 2.6.2 Add unit tests for `generateSectionContent()` in `storyblok-services/test/`

### 2.7 Patterns cache initialization ✅

- [x] 2.7.1 Ensure `analyzeContentPatterns()` can be called from Next.js API routes (not just long-running servers)
- [x] 2.7.2 Add lazy-init caching helper for API route context — implemented in `pages/api/prompter/_helpers.ts` (lazy registry singleton) and `patterns.ts` (in-memory cache keyed by `contentType:startsWith`)

## Phase 3: New API Routes (Medium Risk) ✅

Shared helpers in `pages/api/prompter/_helpers.ts`: CORS middleware, env validation, client factories (OpenAI, Storyblok Management/Content), lazy SchemaRegistry singleton, unified error handler.

- [x] 3.1 Create `/api/prompter/patterns` route — `pages/api/prompter/patterns.ts` (GET, wraps `analyzeContentPatterns()`, in-memory cache by `contentType:startsWith`)
- [x] 3.1a Create `/api/prompter/story` route — `pages/api/prompter/story.ts` (GET, server-side proxy for story fetch by UID, keeps preview token off the client)
- [x] 3.2 Create `/api/prompter/recipes` route — `pages/api/prompter/recipes.ts` (GET, loads `section-recipes.json` from MCP server package, filters by `contentType`)
- [x] 3.3 Create `/api/prompter/plan` route — `pages/api/prompter/plan.ts` (POST, wraps `planPageContent()`)
- [x] 3.4 Create `/api/prompter/generate-section` route — `pages/api/prompter/generate-section.ts` (POST, wraps `generateSectionContent()`)
- [x] 3.5 Create `/api/prompter/import` route — `pages/api/prompter/import.ts` (POST, wraps `importByPrompterReplacement()` with validation + compositional warnings + asset upload)
- [x] 3.6 Create `/api/prompter/ideas` route — `pages/api/prompter/ideas.ts` (GET, wraps Storyblok Ideas API)

## Phase 4: Component Rewrite (High Effort) ✅

Complete rewrite of PrompterComponent with new sub-components and state machine hook. All schema preparation moved server-side. Zero TypeScript errors.

### Mode Toggle & Shared UI

- [x] 4.1 Add mode toggle UI (Section ↔ Page) — `components/prompter/prompter-mode-toggle/PrompterModeToggle.tsx`
- [x] 4.8 Add content type auto-detection — `detectContentType()` in `components/prompter/usePrompter.ts`
- [x] 4.10 Remove client-side schema preparation — all schema work now in Phase 3 API routes; removed `prepareSchemaForOpenAi`, `processOpenAiResponse`, `processForStoryblok` from client
- [x] 4.11 Update preview `componentMap` — 26 Design System components mapped in `PrompterComponent.tsx`

### Section Mode

- [x] 4.2 Add component type picker — `components/prompter/prompter-component-picker/PrompterComponentPicker.tsx` (22 component types, ordered list builder with add/remove/reorder)
- [x] 4.3 Derive hybrid context — `getSurroundingContext()` in `usePrompter.ts` (story neighbors for edge sections, list/plan neighbors for inner)
- [x] 4.4 Sequential `generate_section` calls with progress — `generate()` in `usePrompter.ts` + `PrompterProgress` sub-component

### Page Mode

- [x] 4.5 Add plan review UI — `components/prompter/prompter-plan-review/PrompterPlanReview.tsx` (section sequence display, reorder, add/remove, editable intent)
- [x] 4.6 Implement section-by-section generation with progress — shared with 4.4 via `usePrompter.generate()`
- [x] 4.7 Add per-section regenerate button — `SectionPreview` component in `PrompterComponent.tsx` with hover-reveal regenerate

### Quality & Warnings

- [x] 4.9 Add compositional quality warnings — `components/prompter/prompter-warnings/PrompterWarnings.tsx`

### Key Files Created/Modified

- **`components/prompter/usePrompter.ts`** (NEW, ~736 lines) — State machine hook with 8 steps, 2 modes
- **`components/prompter/PrompterComponent.tsx`** (REWRITTEN, ~527 lines) — Step-based UI, `SectionPreview`, `PagePreview`, `PromptTextarea`
- **`components/prompter/prompter-mode-toggle/`** (NEW) — TSX + SCSS
- **`components/prompter/prompter-component-picker/`** (NEW) — TSX + SCSS
- **`components/prompter/prompter-plan-review/`** (NEW) — TSX + SCSS
- **`components/prompter/prompter-progress/`** (NEW) — TSX + SCSS
- **`components/prompter/prompter-warnings/`** (NEW) — TSX + SCSS
- **`components/prompter/prompter.scss`** (MODIFIED) — Added 5 sub-component imports + new styles
- **`components/prompter/prompter-select-field/PrompterSelectField.tsx`** (MODIFIED) — Fixed `forwardRef` props type

## Phase 5: Polish & Testing (Medium Risk) ✅

### 5.1 End-to-end testing — ⬜ Manual

- [ ] 5.1 End-to-end testing in Storyblok Visual Editor (requires manual testing)

### 5.2 Loading states & error handling ✅

- [x] 5.2.1 Add `isInitializing`, `isStoryLoading`, `isIdeasLoading` states in `usePrompter.ts`
- [x] 5.2.2 Add `storyError`, `ideasError` non-blocking warning states
- [x] 5.2.3 Add initialization loading indicator in `PrompterComponent.tsx` (ThreeDots + "Loading context…")
- [x] 5.2.4 Display non-blocking init warnings (story/ideas fetch failures)
- [x] 5.2.5 Disable Generate/Plan buttons during initialization via `isInitializing` guard
- [x] 5.2.6 Improve error display with icon and "Start Over" button
- [x] 5.2.7 Remove debug panel (`<details>` Story JSON element)

### 5.3 Edge case handling ✅

- [x] 5.3.1 Add `PrompterApiError` class with HTTP status + error code parsing
- [x] 5.3.2 Add `friendlyErrorMessage()` mapping error codes to user-friendly messages (ENV_MISSING, RATE_LIMITED, AUTH_ERROR, 400)
- [x] 5.3.3 Add `EnvMissingError` class in `_helpers.ts` with 503 status code
- [x] 5.3.4 Add pre-flight OpenAI key check in `/api/prompter/plan` (returns 503 with clear message)
- [x] 5.3.5 Add pre-flight OpenAI key check in `/api/prompter/generate-section` (returns 503 with clear message)
- [x] 5.3.6 Add `hasEnv()` non-throwing env check helper in `_helpers.ts`
- [x] 5.3.7 Detect OpenAI rate limit (429) and auth (401) errors in `handleError()`
- [x] 5.3.8 Handle missing Storyblok token gracefully in story fetch (sets `storyError`, doesn't block generation)
- [x] 5.3.9 Handle empty plan (sectionList.length === 0) — already guarded in `generate()`

### 5.4 Deprecate old routes ✅

- [x] 5.4.1 Add `Deprecation`, `Sunset`, and `Link` headers to `/api/content`
- [x] 5.4.2 Add `Deprecation`, `Sunset`, and `Link` headers to `/api/import`
- [x] 5.4.3 Add `Deprecation`, `Sunset`, and `Link` headers to `/api/ideas`
- [x] 5.4.4 Add `console.warn()` deprecation notices to all three old routes

### 5.5 Update CMS component schema ✅

- [x] 5.5.1 Add `mode`, `componentTypes`, `contentType`, `startsWith`, `uploadAssets` to `prompter.schema.json`
- [x] 5.5.2 Update `PrompterProps.ts` with new types + JSDoc
- [x] 5.5.3 Update `PrompterDefaults.ts` with new default values
- [x] 5.5.4 Update CMS component definition in `components.123456.json` — added `mode` (option), `componentTypes` (textarea), `contentType` (option), `startsWith` (text), `uploadAssets` (boolean)
- [x] 5.5.5 Wire new props through `PrompterComponent.tsx` → `usePrompter()` hook
- [x] 5.5.6 `defaultContentType` prop overrides auto-detection from story

### 5.6 Documentation — ✅

- [x] 5.6 Documentation update (`docs/skills/`, `README.md`, `copilot-instructions.md`)

### Key Files Modified

- **`pages/api/prompter/_helpers.ts`** — `EnvMissingError` class, `hasEnv()`, improved `handleError()` (503 for env, 429 for rate limit, 401 for auth)
- **`pages/api/prompter/plan.ts`** — Pre-flight OpenAI key check, imports `hasEnv`
- **`pages/api/prompter/generate-section.ts`** — Pre-flight OpenAI key check, imports `hasEnv`
- **`components/prompter/usePrompter.ts`** — `PrompterApiError`, `friendlyErrorMessage()`, init tracking states, `defaultComponentTypes`/`defaultContentType`/`startsWith`/`uploadAssets` options
- **`components/prompter/PrompterComponent.tsx`** — Init loading indicator, init warnings, improved error display, removed debug panel, new prop destructuring
- **`components/prompter/PrompterProps.ts`** — New types: `PrompterMode`, `ComponentTypes`, `ContentType`, `StartsWith`, `UploadAssets`
- **`components/prompter/PrompterDefaults.ts`** — New defaults for `mode`, `componentTypes`, `contentType`, `uploadAssets`
- **`components/prompter/prompter.schema.json`** — 5 new fields with enums, defaults, descriptions
- **`components/prompter/prompter.scss`** — New `.prompter-init-loading`, `.prompter-init-warning` styles; updated `.prompter-error` with icon layout; removed debug panel styles
- **`cms/components.123456.json`** — 5 new Storyblok component fields
- **`pages/api/content/index.ts`** — Deprecation headers + console.warn
- **`pages/api/import/index.ts`** — Deprecation headers + console.warn
- **`pages/api/ideas/index.ts`** — Deprecation headers + console.warn
