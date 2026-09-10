# Page Builder UI — Implementation Checklist

Tracks progress on implementing the [Page Builder UI PRD](../prd/page-builder-ui-prd.md).

---

## Phase 1: Unified Builder Template

Replaces `SECTION_PREVIEW_HTML` + `PAGE_PREVIEW_HTML` with a single `PAGE_BUILDER_HTML`.

- [x] **1.1** `capability.ts` — Add `PAGE_BUILDER_URI`, remove `SECTION_PREVIEW_URI` + `PAGE_PREVIEW_URI`
- [x] **1.2** `theme-bridge.ts` — Add builder-specific CSS (header bar, pending highlight, section controls, connection error)
- [x] **1.3** `templates.ts` — Create `PAGE_BUILDER_HTML` template with:
  - [x] 1.3a `sessionStorage` persistence with try/catch guard
  - [x] 1.3b `app.connect()` try/catch with 10s timeout
  - [x] 1.3c `ontoolresult` routing (generate_section, create_page_with_content, write result)
  - [x] 1.3d Single-section mode (approve/reject/modify — identical to old section preview)
  - [x] 1.3e Multi-section accumulation (numbered badges, per-section Keep/Discard/Remove)
  - [x] 1.3f Section counter header ("Page Builder · N sections")
- [x] **1.4** `templates.ts` — Remove old `SECTION_PREVIEW_HTML` and `PAGE_PREVIEW_HTML` exports
- [x] **1.5** `resources.ts` — Register `page-builder` resource, remove `section-preview` + `page-preview`
- [x] **1.6** `app-tools.ts` — Add `remove_section` app-only tool
- [x] **1.7** `register-tools.ts` — Point `generate_section`, `generate_content`, `create_page_with_content` at `PAGE_BUILDER_URI`
- [x] **1.8** `templates.ts` (plan review) — Backport defensive lifecycle fixes (`app.connect()` timeout, `sessionStorage` guard)
- [x] **1.9** `index.ts` — Update barrel exports to use new names

## Phase 2: Section Reordering & Save

- [x] **2.1** `app-tools.ts` — Add `move_section` app-only tool (done in Phase 1)
- [x] **2.2** `app-tools.ts` — Add `save_page` app-only tool (done in Phase 1)
- [x] **2.3** `templates.ts` — Add up/down move controls per committed section (done in Phase 1)
- [x] **2.4** `templates.ts` — Add "Save to Storyblok" bar (done in Phase 1)
- [x] **2.5** `templates.ts` — Add save confirmation overlay (done in Phase 1 via showSaveResult)
- [x] **2.6** `theme-bridge.ts` — Save bar CSS, confirmation overlay CSS, move button CSS (done in Phase 1)

## Phase 3: Edit Existing Page

- [x] **3.1** `register-tools.ts` — Enhance `handleGetStory` to return SSR-rendered sections in `structuredContent`
- [x] **3.2** `register-tools.ts` — Wire `get_story` to `PAGE_BUILDER_URI`
- [x] **3.3** `templates.ts` — Add `loadExistingPage()` handler in `ontoolresult` routing (done in Phase 1)
- [x] **3.4** `templates.ts` — Edit mode header ("Editing: {name} (/{slug})") (done in Phase 1)
- [x] **3.5** `theme-bridge.ts` — Edit mode header CSS (done in Phase 1)

## Phase 4: Fullscreen & Polish

- [x] **4.1** `templates.ts` — Add `availableDisplayModes: ["inline", "fullscreen"]` to App constructor
- [x] **4.2** `templates.ts` — Add fullscreen toggle button
- [x] **4.3** `templates.ts` — Smooth scroll to newly added section
- [x] **4.4** `theme-bridge.ts` — CSS transitions for section add/remove, pending pulse animation

## Final

- [x] **5.1** Build (`npm run build`) and verify no errors
- [ ] **5.2** Manual smoke test with MCP Inspector
