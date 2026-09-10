# MCP Apps Upgrade — Implementation Checklist

**PRD:** [mcp-apps-upgrade-prd.md](../prd/mcp-apps-upgrade-prd.md)
**ADR:** [adr-mcp-apps-decisions.md](../../adr/adr-mcp-apps-decisions.md)
**Started:** 2026-02-27

---

## Phase 1: MCP Prompts (Foundation) ✅

- [x] 1.1 Add `prompts` capability to server initialization (`src/index.ts`)
- [x] 1.2 Create `src/prompts.ts` module with prompt definitions
- [x] 1.3 Implement `prompts/list` handler (`src/index.ts`)
- [x] 1.4 Implement `prompts/get` handler with argument interpolation (`src/index.ts`)
- [x] 1.5 Add `create-page` prompt with full workflow instructions
- [x] 1.6 Add `migrate-from-url` prompt
- [x] 1.7 Add `create-blog-post` prompt
- [x] 1.8 Add `content-audit` prompt
- [x] 1.9 Add `extend-page` prompt
- [x] 1.10 Add `translate-page` prompt
- [x] 1.11 Write tests for prompt listing and retrieval (`test/prompts.test.ts` — 46 tests)
- [x] 1.12 Update README and copilot-instructions with prompt documentation

## Phase 2: Structured Output (`outputSchema`) ✅

- [x] 2.1 Define output schemas for generation tools (`src/output-schemas.ts`)
- [x] 2.2 Update `ListToolsRequestSchema` handler to inject `outputSchema` from `OUTPUT_SCHEMAS` map
- [x] 2.3 Add `buildWriteResult()` helper with resource link annotations
- [x] 2.4 Refactor 7 write tool handlers to use `buildWriteResult()` (import_content, import_content_at_position, create_page_with_content, create_story, update_story, replace_section, update_seo)
- [x] 2.5 Add `getSpaceId()` getter to `StoryblokService` for editor URL construction
- [x] 2.6 Add `buildStoryblokEditorUrl()` and `createWriteAnnotations()` helpers (`src/output-schemas.ts`)
- [x] 2.7 Write tests for structured output format (`test/output-schemas.test.ts` — 40 tests)

## Phase 3: Elicitation for Interactive Workflows ✅

- [x] 3.1 Create `src/elicitation.ts` module with `tryElicit()` graceful degradation helper
- [x] 3.2 Add pre-built elicitation schemas: component type, plan approval, publish confirmation, content type, delete confirmation
- [x] 3.3 Integrate delete confirmation elicitation into `delete_story` handler
- [x] 3.4 Implement graceful degradation — `tryElicit()` returns `{ accepted: false, reason: 'unsupported' }` when client doesn't support elicitation
- [x] 3.5 Add component type picker elicitation to `generate_section` — `componentType` now optional in Zod/JSON schema; elicits from registry's `section.components` slot; falls back to error with available types
- [x] 3.6 Add plan review elicitation to `plan_page` — elicits approve/modify/cancel after plan generation; includes `reviewStatus` in response
- [x] 3.7 Add publish confirmation elicitation to `create_page_with_content` — elicits publish/keep_draft after creation; publishes via `updateStory()` if accepted
- [x] 3.8 Write tests for elicitation flows (`test/elicitation.test.ts` — 40 tests)

## Phase 4: Interactive UI Previews (MCP Apps Extension)

_Uses `@modelcontextprotocol/ext-apps` SDK v1.1.2 for interactive HTML previews in sandboxed iframes._

- [x] 4.1 Add `@modelcontextprotocol/ext-apps` dependency (already in package.json)
- [x] 4.2 Create capability negotiation module (`src/ui/capability.ts`) with `clientSupportsExtApps()`, URI constants, `RESOURCE_MIME_TYPE` re-export
- [x] 4.3 Create section preview HTML template (`src/ui/templates.ts` — `SECTION_PREVIEW_HTML`) with ext-apps SDK, approve/reject/modify buttons, streaming support
- [x] 4.4 Create page preview HTML template (`src/ui/templates.ts` — `PAGE_PREVIEW_HTML`) with fullscreen support, section badges
- [x] 4.5 Create plan review HTML template (`src/ui/templates.ts` — `PLAN_REVIEW_HTML`) with drag-to-reorder, approve/reject
- [x] 4.6 Register `ui://kds/section-preview`, `ui://kds/page-preview`, `ui://kds/plan-review` as UI resources (`src/ui/resources.ts`) via `registerAppResource()`
- [x] 4.7 Add `_meta.ui.resourceUri` to `generate_section`, `generate_content`, `plan_page` tool definitions (`src/register-tools.ts`)
- [x] 4.8 Implement app-only tools: `approve_section`, `reject_section`, `modify_section` with `visibility: ["app"]` (`src/ui/app-tools.ts`)
- [x] 4.9 Implement app-only tools: `approve_plan`, `reorder_plan` for plan-review UI (`src/ui/app-tools.ts`)
- [x] 4.10 Build host-theme-to-kickstartDS token mapping (`src/ui/theme-bridge.ts` — `THEME_BRIDGE_CSS`)
- [x] 4.11 Create preview chrome CSS with action bar, loading states, plan list styles (`src/ui/theme-bridge.ts` — `PREVIEW_CHROME_CSS`)
- [x] 4.12 Create barrel export for UI module (`src/ui/index.ts`)
- [x] 4.13 Implement `renderToStaticMarkup` pipeline using actual kickstartDS React components + `DsaProviders` (`src/ui/render.tsx`)
- [x] 4.14 Add `ontoolinputpartial` support for streaming preview while section generates — fixed callback names (lowercase), partial args extraction
- [x] 4.15 Add display mode support (`inline` default, `fullscreen` for page preview) via `requestDisplayMode()` + `onhostcontextchanged` handler
- [x] 4.16 Extract and inline kickstartDS design tokens (`scripts/extract-tokens.js` → `src/ui/tokens.generated.ts`, ~240KB CSS) into HTML templates
- [x] 4.17 Write tests for UI resource registration, app-only tool handlers, template generation, capability, render pipeline, tokens (6 suites, 115 tests)
- [ ] 4.18 End-to-end testing with Claude Desktop, ChatGPT, and VS Code

## Phase 5: Progress Notifications & Polish

- [x] 5.1 Create `src/progress.ts` with `ProgressReporter` class and `getProgressToken()` helper
- [x] 5.2 Add progress notifications to `generate_section` (3 steps: patterns → generate → complete)
- [x] 5.3 Add progress notifications to `create_page_with_content` (3 steps: path → create → complete)
- [x] 5.4 Add `listChanged` notification for dynamic prompt updates
- [x] 5.5 Update n8n node for structured output
- [x] 5.6 Update Prompter API routes
- [ ] 5.7 End-to-end testing
- [x] 5.8 Update all documentation
- [ ] 5.9 Performance testing

---

## New Files Created

| File                          | Purpose                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------- | --- | ---------------------- | ------------------------------------------------------------------------------- |
| `src/prompts.ts`              | 6 prompt definitions + `getPromptMessages()` generator                                  |
| `src/output-schemas.ts`       | Output schemas for 15 tools + annotation helpers                                        |
| `src/elicitation.ts`          | `tryElicit()` helper + 5 pre-built form schemas                                         |
| `src/progress.ts`             | `ProgressReporter` class for step-by-step progress                                      |
| `src/ui/index.ts`             | Barrel export for ext-apps UI module                                                    |
| `src/ui/capability.ts`        | `clientSupportsExtApps()`, URI constants, MIME type                                     |
| `src/ui/theme-bridge.ts`      | Host→kickstartDS CSS variable bridge + preview chrome                                   |
| `src/ui/templates.ts`         | 3 HTML preview templates (section, page, plan review)                                   |
| `src/ui/app-tools.ts`         | 5 app-only tools (approve/reject/modify/reorder)                                        |
| `src/ui/resources.ts`         | `registerUiResources()` — 3 `ui://` resource registrations                              |
| `src/ui/render.tsx`           | SSR pipeline: `renderToStaticMarkup` with kickstartDS React components + `DsaProviders` |
| `src/ui/tokens.generated.ts`  | Auto-generated kickstartDS CSS (~240KB) — built by `scripts/extract-tokens.js`          |
| `scripts/extract-tokens.js`   | Build-time CSS extraction from `@kickstartds/ds-agency-premium/global.css`              |
| `jest.config.js`              | Jest config for ESM + TSX tests with mocked kDS components                              |
| `tsconfig.test.json`          | TypeScript config for tests (extends main, relaxes rootDir)                             |
| `test/ui/capability.test.ts`  | Capability detection + URI constant tests (11 tests)                                    |
| `test/ui/templates.test.ts`   | Template HTML structure + ext-apps API tests (51 tests)                                 |
| `test/ui/tokens.test.ts`      | CSS token generation validation tests (6 tests)                                         |
| `test/ui/render.test.ts`      | SSR render pipeline tests with mocked components (19 tests)                             |
| `test/ui/resources.test.ts`   | UI resource registration tests (6 tests)                                                |
| `test/ui/app-tools.test.ts`   | App-only tool registration + handler tests (22 tests)                                   |     | `test/prompts.test.ts` | Prompt definitions, message generation, argument interpolation tests (46 tests) |
| `test/output-schemas.test.ts` | Output schema validation + annotation helper tests (40 tests)                           |
| `test/elicitation.test.ts`    | Elicitation helper, pre-built schemas, integration pattern tests (40 tests)             |

## Files Modified

| File                              | Changes                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts`                    | Added imports, `prompts: {}` capability, ListPrompts/GetPrompt handlers, `buildWriteResult()` helper, refactored 7 write tool returns, delete_story elicitation, progress in generate_section + create_page_with_content                                                                                                                                                |
| `src/services.ts`                 | Added `getSpaceId()` getter to `StoryblokService`                                                                                                                                                                                                                                                                                                                       |
| `src/register-tools.ts`           | Added `_meta.ui.resourceUri` to `generate_section`, `generate_content`, `plan_page` tool definitions; imported UI capability URIs; wired `renderSectionToHtml`/`renderPageSectionsToHtml` into tool results as `structuredContent`; added elicitation for generate_section (component picker), plan_page (plan review), create_page_with_content (publish confirmation) |
| `src/config.ts`                   | Made `componentType` optional in `generateSection` Zod schema for elicitation support                                                                                                                                                                                                                                                                                   |
| `src/register-resources.ts`       | Added `registerUiResources()` and `registerAppOnlyTools()` calls for ext-apps integration                                                                                                                                                                                                                                                                               |
| `package.json`                    | Added `build:tokens` + `test` scripts; `build` now runs `extract-tokens.js` before `tsc`; added jest/ts-jest/react-types devDependencies                                                                                                                                                                                                                                |
| `README.md`                       | Added Prompts section documenting all 6 guided workflow prompts with arguments                                                                                                                                                                                                                                                                                          |
| `.github/copilot-instructions.md` | Added MCP Prompts subsection with prompt table and workflow descriptions                                                                                                                                                                                                                                                                                                |
