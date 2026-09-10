# PRD: Page Builder UI — Unified Section-Accumulating Preview

**Status:** 📋 Draft
**Date:** 2026-03-01
**Author:** Generated from ext-apps spec analysis and codebase review
**Depends On:** [MCP Apps Upgrade PRD](mcp-apps-upgrade-prd.md) (implemented)
**Spec Reference:** [SEP-1865: MCP Apps (2026-01-26 Stable)](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx)

---

## 1. Background & Problem Statement

### What We Have Today

The MCP Apps integration (implemented per the MCP Apps Upgrade PRD) provides three separate UI resources:

| Resource                   | Template               | Attached To                            | Purpose                                           |
| -------------------------- | ---------------------- | -------------------------------------- | ------------------------------------------------- |
| `ui://kds/section-preview` | `SECTION_PREVIEW_HTML` | `generate_section`, `generate_content` | Single-section preview with approve/reject/modify |
| `ui://kds/page-preview`    | `PAGE_PREVIEW_HTML`    | `create_page_with_content`             | Post-creation confirmation card                   |
| `ui://kds/plan-review`     | `PLAN_REVIEW_HTML`     | `plan_page`                            | Plan review with drag-and-drop reorder            |

Each UI is **stateless and isolated** — every tool call creates a fresh iframe instance. The section preview shows one section at a time, then disappears. The page preview only fires after the page has already been written to Storyblok.

### The Gap

The recommended content workflow is sequential:

```
plan_page → generate_section → generate_section → … → create_page_with_content
```

But the UI experience is fragmented:

1. **No cumulative preview** — Each `generate_section` shows its result in isolation. The user cannot see how sections flow together, judge visual transitions, or evaluate the page as a whole.
2. **No page editing** — There's no way to load an existing page, visually review its sections, and surgically add/remove/replace individual sections.
3. **Write-then-see** — `create_page_with_content` is a write operation. By the time the preview appears, the content is already in Storyblok. There's no "preview page before saving" step.
4. **Workflow fragmentation** — Three separate UIs for what is fundamentally one workflow: plan → build → review → save.

### The Opportunity

Replace the section and page preview UIs with a **unified page builder** that accumulates sections across multiple tool calls, while preserving the ability to use each tool independently.

---

## 2. Design Principles

### P1: Flexibility First — Composable, Not Monolithic

The builder must **not** impose a single workflow. It must work equally well for:

- **Full page creation:** `plan_page` → N × `generate_section` → `create_page_with_content`
- **Single section experimentation:** call `generate_section` once, approve or reject, done
- **Existing page editing:** `get_story` → see existing sections → `generate_section` to add → save
- **Section replacement:** load page → remove a section → `generate_section` → insert at position → save

Each tool call produces a useful, self-contained result. The builder **enhances** but does not **require** the multi-step workflow.

### P2: Additive, Not Destructive

When the builder receives a new `generate_section` result, it **appends** it to the accumulated state. It never silently replaces what's already there. The user always has explicit control over what's in the page.

### P3: Visual Confidence

The builder uses pre-rendered HTML from the server's SSR pipeline (kickstartDS React components → `renderToStaticMarkup`). What you see in the builder is what you get in Storyblok, modulo dynamic behaviors.

### P4: Graceful Degradation

Hosts that don't support ext-apps, or where the iframe is torn down between tool calls, still get full text results. The builder is a progressive enhancement, not a requirement.

---

## 3. Goals & Non-Goals

### Goals

- **G1:** Replace `SECTION_PREVIEW_HTML` and `PAGE_PREVIEW_HTML` with a single **`PAGE_BUILDER_HTML`** that serves both single-section and multi-section workflows
- **G2:** Accumulate sections across multiple `generate_section` calls into a growing visual page
- **G3:** Support loading existing pages via `get_story` to enable edit workflows
- **G4:** Provide in-builder actions: approve/reject per section, remove section, reorder, save to Storyblok
- **G5:** Preserve standalone section preview — a single `generate_section` shows a useful, actionable UI without requiring the full page workflow
- **G6:** Keep `PLAN_REVIEW_HTML` as a separate UI resource — plan review is structurally different (list of intents, not rendered HTML) and benefits from its own layout

### Non-Goals

- **NG1:** Drag-and-drop visual reordering of rendered section HTML — reordering is done via numbered controls, not drag-and-drop of full-width rendered blocks
- **NG2:** Inline content editing — the builder is a preview and assembly tool, not a WYSIWYG editor
- **NG3:** Client-side rendering — all section HTML is pre-rendered server-side and sent as strings. The builder never imports React or kickstartDS at runtime
- **NG4:** Replacing the Storyblok Visual Editor — the builder is for the AI workflow, not the CMS
- **NG5:** State synchronization across browser tabs or sessions — the builder is scoped to one conversation
- **NG6:** Supporting `generate_root_field` or `generate_seo` in the builder's visual preview — these produce metadata, not visual sections. They're passed through as data fields

---

## 4. Proposed Architecture

### 4.1 Resource Consolidation

**Before (3 resources):**

```
ui://kds/section-preview  → generate_section, generate_content
ui://kds/page-preview     → create_page_with_content
ui://kds/plan-review      → plan_page
```

**After (2 resources):**

```
ui://kds/page-builder     → generate_section, generate_content, create_page_with_content, get_story
ui://kds/plan-review      → plan_page (unchanged)
```

The `page-builder` resource replaces both `section-preview` and `page-preview`. Plan review remains separate because its UI structure (ordered list of intents with drag-and-drop) is fundamentally different from rendered HTML sections.

### 4.2 State Model

The builder maintains an in-memory state object:

```typescript
interface BuilderState {
  /** Where did this builder session start from? */
  mode: "empty" | "new-page" | "edit-page";

  /** Accumulated sections with rendered HTML */
  sections: BuilderSection[];

  /** If editing an existing page, the source story metadata */
  sourceStory?: {
    uid: string;
    name: string;
    slug: string;
    storyId: number;
  };

  /** Root fields accumulated from generate_root_field results */
  rootFields: Record<string, unknown>;

  /** Whether the page has been saved to Storyblok already */
  saved: boolean;

  /** Write result after save */
  saveResult?: {
    success: boolean;
    message: string;
    storyName: string;
    storySlug: string;
    wasPublished: boolean;
  };
}

interface BuilderSection {
  /** Unique ID for this section in the builder */
  id: string;

  /** Component type (e.g., "hero", "features", "cta") */
  componentType: string;

  /** Pre-rendered HTML from SSR */
  renderedHtml: string | null;

  /** Raw section data for Storyblok (used for save) */
  sectionData: Record<string, unknown>;

  /** Visual state */
  status: "committed" | "pending" | "removed";

  /** Origin: "generated" = from generate_section, "existing" = from get_story */
  origin: "generated" | "existing";
}
```

### 4.3 State Persistence Strategy

Per the SEP-1865 spec, "State persistence and restoration" is listed as a future extension — **not currently part of the spec**. Each tool call may create a new iframe instance (host-dependent). The builder must handle this reality.

**Primary strategy: `sessionStorage` + `structuredContent` seeding**

1. On every state change, the builder serializes `BuilderState` to `sessionStorage` under a conversation-scoped key
2. On iframe load, the builder checks `sessionStorage` for existing state and restores it
3. As a fallback, the server includes accumulated `sectionData` arrays in `structuredContent` so the builder can reconstruct state from the tool result alone

**Fallback strategy: `ui/update-model-context`**

When the user takes an action in the builder (approve, remove, reorder), the builder calls `ui/update-model-context` to persist the current page composition in the model's context. This ensures that even if the iframe is destroyed and recreated, the LLM knows the current state and can re-seed it via the next `structuredContent`.

**Key assumption validated:** If the host keeps the same iframe alive across multiple tool calls to the same `resourceUri`, `sessionStorage` will survive and the experience is seamless. If the host creates a new iframe, the builder reconstructs from the latest `structuredContent`. Either way, the experience is functional.

### 4.4 `ontoolresult` Routing

The builder receives results from multiple tools. It differentiates by inspecting the `structuredContent` shape:

```javascript
app.ontoolresult = (result) => {
  const data = result?.structuredContent || result;

  if (data?.renderedHtml && data?.componentType && data?.sectionData) {
    // generate_section result → add pending section
    addPendingSection(data);
  } else if (data?.renderedSections && Array.isArray(data.renderedSections)) {
    // create_page_with_content result → show save confirmation
    showSaveResult(data);
  } else if (data?.story?.content?.section) {
    // get_story result → load existing page
    loadExistingPage(data);
  } else if (data?.success && data?.message) {
    // Generic write result → show confirmation
    showWriteResult(data);
  } else {
    // Unknown → fallback display
    showFallback(data);
  }
};
```

### 4.5 Tool ↔ Builder Data Flow

#### `generate_section` → Builder (existing, enhanced)

**Server returns** (no changes needed to `handleGenerateSection`):

```json
{
  "structuredContent": {
    "renderedHtml": "<div class='ks-section'>…</div>",
    "componentType": "hero",
    "sectionData": { "component": "section", "components": [{ "component": "hero", … }] }
  }
}
```

**Builder behavior:**

1. Appends a new `BuilderSection` with `status: "pending"`, `origin: "generated"`
2. Scrolls to the new section, which is highlighted with a "NEW" badge
3. Shows per-section action buttons: ✓ Keep · ✕ Discard
4. If this is the only section (standalone use), the full action bar appears: ✅ Approve · ✏️ Modify · ❌ Reject

#### `get_story` → Builder (new integration)

**Server must return** `structuredContent` with parsed sections:

```json
{
  "structuredContent": {
    "story": { "uid": "…", "name": "My Page", "slug": "my-page", "id": 12345 },
    "sections": [
      { "componentType": "hero", "renderedHtml": "…", "sectionData": { … } },
      { "componentType": "features", "renderedHtml": "…", "sectionData": { … } }
    ]
  }
}
```

**Builder behavior:**

1. Sets `mode: "edit-page"`, stores `sourceStory` metadata
2. Loads all sections as `status: "committed"`, `origin: "existing"`
3. Shows the full page with section badges
4. Shows a header bar: "Editing: My Page (/my-page)"

#### `create_page_with_content` → Builder

Keeps the existing write-result confirmation card. Additionally, sets `state.saved = true` and disables further editing actions.

### 4.6 App-Only Tools

Replace current tools with builder-scoped versions:

| Tool              | Visibility | Purpose                                                                             | Current Status    |
| ----------------- | ---------- | ----------------------------------------------------------------------------------- | ----------------- |
| `approve_section` | `["app"]`  | Approve a single pending section (→ `committed`)                                    | Exists, repurpose |
| `reject_section`  | `["app"]`  | Discard a pending section                                                           | Exists, repurpose |
| `modify_section`  | `["app"]`  | Request changes to a section (sends message to LLM)                                 | Exists, keep      |
| `remove_section`  | `["app"]`  | Remove a committed section by index                                                 | **New**           |
| `move_section`    | `["app"]`  | Move a section up or down by index                                                  | **New**           |
| `save_page`       | `["app"]`  | Trigger save — calls `create_page_with_content` (new page) or `update_story` (edit) | **New**           |
| `approve_plan`    | `["app"]`  | Approve a plan (plan-review UI only)                                                | Exists, keep      |
| `reorder_plan`    | `["app"]`  | Reorder plan sections (plan-review UI only)                                         | Exists, keep      |

#### `save_page` Design

This is the most complex new tool. It must:

1. Collect all `committed` sections from the builder state
2. Determine whether this is a new page or an edit
3. Call the appropriate Storyblok API

```typescript
// App-only tool — called by the builder's "Save to Storyblok" button
{
  name: "save_page",
  inputSchema: {
    mode: z.enum(["create", "update"]),
    sections: z.array(z.record(z.unknown())),
    storyUid: z.string().optional(), // for edit mode
    name: z.string().optional(),     // for create mode
    slug: z.string().optional(),     // for create mode
    publish: z.boolean().optional(),
  },
  visibility: ["app"],
}
```

**Important:** `save_page` is an app-only tool, so it bypasses the LLM. The builder UI calls it directly. The server handler reuses the existing `createPageWithContent` / `updateStory` service methods.

---

## 5. Builder UI Layout

### 5.1 Single Section Mode

When the builder has only one section (standalone `generate_section` use):

```
┌─────────────────────────────────────────────────────┐
│  Section Preview                                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─ hero (NEW) ──────────────────────────────────┐  │
│  │  [rendered HTML]                              │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
├─────────────────────────────────────────────────────┤
│  [✅ Approve]  [✏️ Modify]  [❌ Reject]             │
└─────────────────────────────────────────────────────┘
```

This is **identical** to the current section preview behavior. Users who only generate one section see no workflow change.

### 5.2 Multi-Section Accumulation Mode

After 2+ sections arrive (or when loading an existing page):

```
┌─────────────────────────────────────────────────────┐
│  Page Builder                 3 sections  [⛶ Full]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─ 1. hero ─────────────────────────────────────┐  │
│  │  [rendered HTML]                              │  │
│  │                          [↑] [↓] [✕ Remove]  │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌─ 2. features ─────────────────────────────────┐  │
│  │  [rendered HTML]                              │  │
│  │                          [↑] [↓] [✕ Remove]  │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌─ 3. cta (NEW) ────────────────────────────────┐  │
│  │  [rendered HTML — highlighted border]         │  │
│  │                     [✓ Keep] [✕ Discard]      │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
├─────────────────────────────────────────────────────┤
│  [💾 Save to Storyblok]                  [⛶ Full]  │
└─────────────────────────────────────────────────────┘
```

### 5.3 Edit Mode Header

When loaded from `get_story`:

```
┌─────────────────────────────────────────────────────┐
│  Editing: My Page  (/my-page)       4 sections      │
├─────────────────────────────────────────────────────┤
│  [sections as above]                                │
├─────────────────────────────────────────────────────┤
│  [💾 Save Changes]                       [⛶ Full]  │
└─────────────────────────────────────────────────────┘
```

### 5.4 Save Confirmation Overlay

After saving:

```
┌─────────────────────────────────────────────────────┐
│  ✅ Page created (draft)                            │
│                                                     │
│  📄 My Page                                         │
│  /my-page · 4 sections                             │
│                                                     │
│  ⚠️ Page created without SEO metadata…             │
└─────────────────────────────────────────────────────┘
```

### 5.5 Transition: Single → Multi

The transition from single-section to multi-section mode happens automatically:

1. First `generate_section` → single mode (approve/reject/modify bar)
2. User approves → section is `committed`
3. Second `generate_section` arrives → builder switches to multi mode
4. Approve bar is replaced by per-section controls + save bar

If the user rejects the first section instead of approving, the builder clears and waits for the next result. No mode transition occurs.

---

## 6. Server-Side Changes

### 6.1 Resource Registration

```typescript
// Before
export const SECTION_PREVIEW_URI = `${UI_URI_PREFIX}/section-preview`;
export const PAGE_PREVIEW_URI = `${UI_URI_PREFIX}/page-preview`;

// After
export const PAGE_BUILDER_URI = `${UI_URI_PREFIX}/page-builder`;
// PLAN_REVIEW_URI remains unchanged
```

### 6.2 Tool ↔ Resource Mapping

```typescript
// Before
generate_section   → { ui: { resourceUri: SECTION_PREVIEW_URI } }
generate_content   → { ui: { resourceUri: SECTION_PREVIEW_URI } }
create_page_with_content → { ui: { resourceUri: PAGE_PREVIEW_URI } }

// After
generate_section   → { ui: { resourceUri: PAGE_BUILDER_URI } }
generate_content   → { ui: { resourceUri: PAGE_BUILDER_URI } }
create_page_with_content → { ui: { resourceUri: PAGE_BUILDER_URI } }
get_story          → { ui: { resourceUri: PAGE_BUILDER_URI } }  // NEW
```

### 6.3 `get_story` Enhancement

Currently, `handleGetStory` returns raw JSON with no `structuredContent`. To enable the edit workflow, it needs to:

1. Parse the story's section array
2. SSR-render each section via `renderPageSectionsToHtml`
3. Return `structuredContent` with `story` metadata + `sections` array

This is an opt-in enhancement gated by the ext-apps capability check — hosts without UI support get the same text-only result as before.

### 6.4 New App-Only Tools

Add `remove_section`, `move_section`, and `save_page` to `app-tools.ts`. The `save_page` handler must:

1. Accept the full sections array and mode (create/update)
2. For create: call `storyblokService.createPageWithContent()`
3. For update: call `storyblokService.updateStory()`
4. Run through the same validation/transform pipeline as the regular tools
5. Return a write result that the builder displays as a save confirmation

### 6.5 Builder Session Seeding via `structuredContent`

To handle iframe recreation, the server should include the full builder state in `structuredContent` when the LLM has communicated accumulated sections via context. This is a secondary concern — the primary state mechanism is `sessionStorage`.

---

## 7. Implementation Phases

### Phase 1: Unified Builder Template (replaces section + page preview)

**Scope:** Create `PAGE_BUILDER_HTML` template that handles both single-section and multi-section modes.

**Changes:**

- New `PAGE_BUILDER_HTML` template in `templates.ts`
- `sessionStorage`-based state persistence (with try/catch guard — see below)
- `ontoolresult` routing for `generate_section` and `create_page_with_content`
- Single-section mode: identical UX to current section preview (no regression)
- Multi-section accumulation: sections append and display with numbered badges
- Per-section "Keep / Discard" for pending sections
- Per-section "Remove" for committed sections
- Section counter in header

**Defensive lifecycle handling (high-impact fixes):**

These fixes address failure modes that would leave the UI in a broken or unresponsive state. They apply to the new `PAGE_BUILDER_HTML` and `PLAN_REVIEW_HTML` templates alike.

1. **`app.connect()` try/catch with timeout** — Wrap the `await app.connect()` call in a try/catch. If the handshake fails or times out (e.g., 10 seconds), show an error state in the preview container instead of hanging on "Waiting for data…" forever:

   ```javascript
   try {
     const connectTimeout = new Promise((_, reject) =>
       setTimeout(() => reject(new Error("Connection timed out")), 10000)
     );
     await Promise.race([app.connect(), connectTimeout]);
     // apply host styles…
   } catch (err) {
     const container = document.getElementById("preview-container");
     container.className = "kds-preview";
     container.innerHTML =
       '<div class="kds-connection-error">' +
       '<div class="kds-connection-error__icon">⚠️</div>' +
       '<div class="kds-connection-error__title">Could not connect to host</div>' +
       '<div class="kds-connection-error__detail">' +
       (err.message || "Unknown error") +
       "</div>" +
       "</div>";
   }
   ```

2. **`sessionStorage` availability guard** — Wrap all `sessionStorage` reads/writes in a helper that catches `SecurityError` (thrown when `allow-same-origin` is missing from the sandbox). Fall back to in-memory-only state when unavailable:

   ```javascript
   function storageAvailable() {
     try {
       sessionStorage.setItem("__test", "1");
       sessionStorage.removeItem("__test");
       return true;
     } catch {
       return false;
     }
   }
   const useStorage = storageAvailable();
   function saveState(state) {
     if (useStorage)
       try {
         sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
       } catch {}
   }
   function loadState() {
     if (useStorage)
       try {
         return JSON.parse(sessionStorage.getItem(STORAGE_KEY));
       } catch {}
     return null;
   }
   ```

These two fixes ensure the builder never shows an infinite loading spinner and never crashes due to sandbox restrictions. Both should also be backported to `PLAN_REVIEW_HTML` for consistency.

**Resource changes:**

- Add `PAGE_BUILDER_URI` to `capability.ts`
- Register `page-builder` resource in `resources.ts`
- Update `register-tools.ts` to point `generate_section`, `generate_content`, `create_page_with_content` at `PAGE_BUILDER_URI`
- Remove `SECTION_PREVIEW_URI` and `PAGE_PREVIEW_URI` (deprecated)

**App-only tool changes:**

- Keep `approve_section`, `reject_section`, `modify_section`
- Add `remove_section` (remove committed section by index)

**Files touched:**

- `src/ui/templates.ts` — new `PAGE_BUILDER_HTML`, remove old `SECTION_PREVIEW_HTML` and `PAGE_PREVIEW_HTML`
- `src/ui/capability.ts` — add `PAGE_BUILDER_URI`, remove old URIs
- `src/ui/resources.ts` — register new, remove old
- `src/ui/app-tools.ts` — add `remove_section`
- `src/ui/theme-bridge.ts` — builder-specific CSS (header bar, pending highlight, section controls)
- `src/register-tools.ts` — update `resourceUri` references

### Phase 2: Section Reordering & Save

**Scope:** Add move controls and the "Save to Storyblok" button.

**Changes:**

- Up/down arrow buttons per section
- `move_section` app-only tool
- `save_page` app-only tool with create/update logic
- Save confirmation overlay
- "Save to Storyblok" bar at bottom (visible when 2+ committed sections)

**Files touched:**

- `src/ui/templates.ts` — add move controls, save bar, save confirmation overlay
- `src/ui/app-tools.ts` — add `move_section`, `save_page`
- `src/ui/theme-bridge.ts` — save bar CSS, confirmation overlay CSS

### Phase 3: Edit Existing Page

**Scope:** Load an existing page from Storyblok into the builder for editing.

**Changes:**

- Enhance `handleGetStory` to return SSR-rendered sections in `structuredContent`
- Wire `get_story` to `PAGE_BUILDER_URI`
- Builder's `ontoolresult` recognizes `get_story` shape and enters edit mode
- Edit mode header ("Editing: {name}")
- Save button calls `update_story` instead of `create_page_with_content`

**Files touched:**

- `src/register-tools.ts` — enhance `handleGetStory` with SSR render + `structuredContent`, add `PAGE_BUILDER_URI`
- `src/ui/templates.ts` — edit mode header, `loadExistingPage()` handler
- `src/ui/theme-bridge.ts` — edit mode header CSS

### Phase 4: Fullscreen & Polish

**Scope:** Fullscreen display mode, smooth scroll on append, animation polish.

**Changes:**

- `availableDisplayModes: ["inline", "fullscreen"]` on the builder's `App` constructor
- Fullscreen toggle button
- Smooth scroll to newly added section
- CSS transitions for section add/remove
- Pending section highlight animation (subtle pulse border)

---

## 8. Migration & Backward Compatibility

### Resource URI Changes

| Before                     | After         | Impact                              |
| -------------------------- | ------------- | ----------------------------------- |
| `ui://kds/section-preview` | **Removed**   | Replaced by `ui://kds/page-builder` |
| `ui://kds/page-preview`    | **Removed**   | Replaced by `ui://kds/page-builder` |
| `ui://kds/plan-review`     | **Unchanged** | No impact                           |

### Text-Only Fallback

All tools continue to return `content: [{ type: "text", text: "…" }]` regardless of UI support. The builder is a progressive enhancement. Hosts without ext-apps see no change.

### Tool Result Schema

`structuredContent` shapes remain backward-compatible:

- `generate_section` continues to return `{ renderedHtml, componentType, sectionData }`
- `create_page_with_content` continues to return `{ success, message, storyName, storySlug, … }`
- `get_story` **adds** new `structuredContent` fields (non-breaking addition)

---

## 9. Open Questions

### Q1: Iframe Lifecycle Across Tool Calls

**Question:** Do hosts (Claude, ChatGPT, VS Code) keep the same iframe alive when the LLM calls `generate_section` multiple times in sequence, or is each call a fresh iframe?

**Impact:** If the iframe persists, `sessionStorage` works seamlessly. If it's recreated, we need to reconstruct state from `structuredContent` on each load.

**Mitigation:** The `sessionStorage` + `structuredContent` seeding dual strategy handles both cases. We should test with each major host.

### Q2: `save_page` Complexity

**Question:** Should `save_page` (app-only tool) handle the full Storyblok creation flow (validation, transform, asset upload), or should it delegate back to the LLM by sending a `ui/message` with the sections data?

**Trade-off:**

- **Direct save (recommended):** Instant, no LLM roundtrip, but duplicates some logic from `handleCreatePageWithContent`
- **Delegate to LLM:** Cleaner separation, but adds latency and requires the LLM to call `create_page_with_content` with the right args

**Recommendation:** Direct save via shared service methods. Extract common logic into a shared `createOrUpdatePage()` helper used by both `handleCreatePageWithContent` and `save_page`.

### Q3: Edit Mode — Which Pages?

**Question:** Should `get_story` always wire to the builder, or only when the user explicitly requests editing?

**Recommendation:** Only attach `PAGE_BUILDER_URI` to `get_story` when editing is the intent. This could be a separate tool (`edit_page`) or a flag on `get_story` (e.g., `edit: true`). For now, always attach it — the builder gracefully shows a read-only view when no pending sections exist.

### Q4: Root Fields in the Builder

**Question:** How should `generate_root_field` results integrate with the builder?

**Recommendation:** Root fields (blog header, sidebar, CTA) are not visual sections. The builder accumulates them in `state.rootFields` silently and includes them in the save payload, but does not display them as rendered sections. A small metadata indicator ("+ 3 root fields") in the builder header is sufficient.

---

## 10. Success Metrics

| Metric                                           | Before                | Target                  |
| ------------------------------------------------ | --------------------- | ----------------------- |
| Tool calls to visually confirm a 5-section page  | 5 (separate previews) | 1 (accumulated builder) |
| Can preview full page before saving to Storyblok | ❌ No                 | ✅ Yes                  |
| Can remove/reorder sections without LLM          | ❌ No                 | ✅ Yes                  |
| Can edit an existing page visually               | ❌ No                 | ✅ Yes                  |
| Single section workflow regression               | N/A                   | None — identical UX     |

---

## 11. Risks

| Risk                                                | Likelihood | Impact                | Mitigation                                              |
| --------------------------------------------------- | ---------- | --------------------- | ------------------------------------------------------- |
| Host destroys iframe between tool calls             | Medium     | State loss            | `sessionStorage` + `structuredContent` seeding          |
| `sessionStorage` unavailable (sandbox restrictions) | Low        | State loss            | In-memory state with `structuredContent` reconstruction |
| `save_page` fails mid-save                          | Low        | Data loss             | Builder retains state, shows error, allows retry        |
| Large pages (10+ sections) slow to render           | Low        | UX degradation        | Lazy render below fold, performance budget per section  |
| `get_story` SSR render fails for complex pages      | Medium     | Edit mode unavailable | Graceful fallback to section list without preview HTML  |
