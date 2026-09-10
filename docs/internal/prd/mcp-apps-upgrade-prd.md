# PRD: MCP Apps Upgrade — Interactive UI Previews, Prompts & Elicitation

**Status:** 📋 Draft
**Date:** 2026-02-27
**Author:** Generated from MCP spec analysis and codebase review
**Spec Reference:** [SEP-1865: MCP Apps (2026-01-26 Stable)](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx) + [MCP Core (2025-06-18)](https://modelcontextprotocol.io/specification/2025-06-18)

---

## 1. Background & Problem Statement

### What We Have Today

The kickstartDS Storyblok MCP server is a powerful content generation and CMS management tool with **25 tools** and **3 static resources** (component schemas, stories overview, section recipes) plus dynamic skill resources. It supports two transport modes (stdio and HTTP/Streamable HTTP) and provides a sophisticated guided-generation workflow:

```
analyze_content_patterns → plan_page → generate_section (×N) → create_page_with_content
```

However, the server has **zero MCP Prompts** and **no interactive UI capabilities**. Every tool returns `{ type: "text", text: JSON.stringify(...) }` — the AI client receives raw JSON and must interpret it textually. The user never sees a visual preview of what they're creating until it lands in Storyblok.

### The Gap

| Capability                 | Current State                                              | Desired State                                                                    |
| -------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Visual Preview**         | ❌ User sees JSON blobs in chat                            | ✅ Interactive HTML preview in sandboxed iframe via `ui://` resources (ext-apps) |
| **In-Preview Actions**     | ❌ No interactivity                                        | ✅ Approve/reject/modify buttons in the preview, calling app-only tools          |
| **Discoverable Workflows** | ❌ User must know tool names and correct sequences         | ✅ MCP Prompts expose guided workflows as slash commands                         |
| **Interactive Decisions**  | ❌ AI guesses component type, user corrects after the fact | ✅ Elicitation asks user to pick component types, confirm plans                  |
| **Structured Output**      | ❌ All results are serialized JSON strings                 | ✅ `outputSchema` + `structuredContent` for programmatic consumption             |
| **Rich Tool Results**      | ❌ Single `text` content block per result                  | ✅ Text summary + structuredContent + resource link to Storyblok Editor          |

### Vision

Transform the MCP server from a **tool-only JSON API** into a **full MCP App** that:

1. **Shows before you commit** — Generated sections are rendered as **interactive HTML previews** inside the AI client (Claude, ChatGPT, VS Code) using the kickstartDS Design System’s actual CSS and tokens. The preview runs in a sandboxed iframe via the `ui://` resource protocol (SEP-1865), with full CSS fidelity and zero server-side rendering dependencies.
2. **Enables in-preview actions** — The preview UI can call **app-only tools** (hidden from the LLM) to approve, reject, modify, or regenerate sections — all without a new LLM turn.
3. **Guides through workflows** — MCP Prompts expose the recommended multi-step workflows (page creation, content migration, blog autopilot) as discoverable slash commands with pre-filled arguments.
4. **Asks when unsure** — Elicitation requests let the server ask the user to pick a component type from a list, confirm a page plan, or approve asset uploads — mid-flow, not as separate tool calls.
5. **Returns structured data** — Tools declare `outputSchema` so clients can programmatically handle results alongside human-readable summaries.

### MCP Spec Features We Leverage

This upgrade draws on **two specs**: the [MCP Core 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18) for Prompts, Elicitation, and Structured Output; and the [MCP Apps Extension (SEP-1865, 2026-01-26 Stable)](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx) for interactive UI resources.

| MCP Feature                             | Source Spec                    | How We Use It                                                                                           |
| --------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| **MCP Apps UI Resources** (`ui://`)     | ext-apps SEP-1865 (2026-01-26) | Serve interactive HTML previews of generated sections, rendered client-side in sandboxed iframes        |
| **Tool-UI Linkage** (`_meta.ui`)        | ext-apps SEP-1865              | Tools declare `resourceUri` so hosts know which UI to render for each tool result                       |
| **Tool Visibility** (`visibility`)      | ext-apps SEP-1865              | App-only tools (`["app"]`) hidden from LLM, callable only from UI (approve, reject, modify)             |
| **Bidirectional Communication**         | ext-apps SEP-1865              | UI iframes call tools, send messages, and update model context via JSON-RPC over `postMessage`          |
| **Host Theming** (CSS variables)        | ext-apps SEP-1865              | Host passes standardized CSS vars; we map them to kickstartDS design tokens for native-looking previews |
| **Display Modes**                       | ext-apps SEP-1865              | `inline` for single-section previews, `fullscreen` for full-page previews                               |
| **Prompts**                             | Core spec `server/prompts`     | Expose guided workflows as discoverable prompt templates (slash commands)                               |
| **Elicitation**                         | Core spec `client/elicitation` | Ask user to select component types, confirm plans, pick from options (flat-schema forms)                |
| **Structured Content** + `outputSchema` | Core spec `server/tools`       | Return typed JSON alongside text summaries for programmatic consumption                                 |
| **Resource Links** in tool results      | Core spec `server/tools`       | Link to Storyblok Visual Editor for the created story                                                   |
| **Annotations**                         | Core spec `server/resources`   | Mark content as `audience: ["user"]` for previews vs `audience: ["assistant"]` for structured data      |
| **Progress Tracking**                   | Core spec `basic/utilities`    | Report multi-section generation progress                                                                |

> **MCP Apps (SEP-1865)** is a **formal, stable MCP extension** under the identifier `io.modelcontextprotocol/ui`. It defines how MCP servers deliver interactive HTML UIs to hosts via `ui://` resources rendered in sandboxed iframes with bidirectional JSON-RPC communication. The extension is already supported by **Claude, ChatGPT, VS Code, Goose, and Postman**. This replaces our earlier assumption that "MCP Apps" was an informal pattern — it is now a standardized spec with its own [SDK (`@modelcontextprotocol/ext-apps` v1.1.2)](https://www.npmjs.com/package/@modelcontextprotocol/ext-apps) and [reference implementation](https://github.com/modelcontextprotocol/ext-apps).

---

## 2. Goals & Non-Goals

### Goals

- **G1:** Add **MCP Prompts** for the 6 most common workflows so users can discover and invoke them without memorizing tool sequences
- **G2:** Return **interactive HTML previews** via `ui://` resources (ext-apps SEP-1865) from `generate_section`, `generate_content`, and `plan_page` so users see what they’re creating — with full CSS fidelity, no server-side rendering
- **G3:** Use **Elicitation** for interactive mid-flow decisions: component type selection, plan review/approval, content type selection
- **G4:** Add **`outputSchema`** to all tools for structured, typed results alongside text summaries
- **G5:** Return **Resource Links** to the Storyblok Visual Editor after write operations (create/update/import)
- **G6:** Use **annotations** (`audience`, `priority`) to separate user-facing previews from assistant-facing structured data
- **G7:** Report **progress notifications** during multi-section generation workflows
- **G8:** Add **app-only tools** (`visibility: ["app"]`) that preview UIs can invoke directly (approve section, modify content, switch variants) without an LLM roundtrip

### Non-Goals

- **NG1:** Building a standalone web UI — the AI client’s native iframe rendering (per ext-apps) is the UI
- **NG2:** Real-time collaborative editing — this is a generation tool, not a live editor
- **NG3:** Supporting MCP clients that don’t implement ext-apps — graceful degradation to text-only results
- **NG4:** Replacing the Storyblok Visual Editor Prompter — that remains the in-CMS experience; this is the AI-client experience
- **NG5:** Server-side screenshot rendering (Puppeteer/Playwright) — ext-apps renders HTML client-side in the host’s sandboxed iframe, eliminating the need for server-side rendering entirely

---

## 3. Proposed Architecture

### 3.1 MCP Prompts

Define **6 prompt templates** that expose guided workflows as discoverable slash commands. Each prompt returns a sequence of `PromptMessage` objects that instruct the LLM on the workflow steps and pre-fill tool call arguments.

| Prompt Name        | Title                         | Arguments                                                          | Workflow                                                                                    |
| ------------------ | ----------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `create-page`      | Create a New Page             | `intent` (required), `slug`, `sectionCount`, `contentType`         | `plan_page` → review → `generate_section` ×N → `create_page_with_content`                   |
| `migrate-from-url` | Migrate Content from URL      | `url` (required), `slug`, `contentType`                            | `scrape_url` → `plan_page` → `generate_section` ×N → `create_page_with_content`             |
| `create-blog-post` | Create a Blog Post            | `topic` (required), `slug`, `author`                               | `plan_page(contentType: "blog-post")` → sections + root fields → `create_page_with_content` |
| `content-audit`    | Audit Existing Content        | `startsWith`                                                       | `analyze_content_patterns` → `list_stories` → quality assessment                            |
| `extend-page`      | Add Sections to Existing Page | `storyId` (required), `intent`, `position`                         | `get_story` → `generate_section` → `import_content_at_position`                             |
| `translate-page`   | Translate a Page              | `sourceSlug` (required), `targetLanguage` (required), `targetPath` | `get_story` → translate → `create_page_with_content`                                        |

**Prompt response structure** (example for `create-page`):

```json
{
  "messages": [
    {
      "role": "user",
      "content": {
        "type": "text",
        "text": "Create a new page with intent: {{intent}}.\n\nFollow this workflow:\n1. Call plan_page with intent '{{intent}}' and contentType '{{contentType}}'\n2. Review the plan with the user\n3. Generate each section using generate_section\n4. Preview each section before proceeding\n5. Create the page using create_page_with_content with slug '{{slug}}'"
      }
    },
    {
      "role": "assistant",
      "content": {
        "type": "text",
        "text": "I'll help you create a new page. Let me start by planning the page structure based on your intent and the site's existing content patterns."
      }
    }
  ]
}
```

### 3.2 Interactive UI Previews via MCP Apps Extension (SEP-1865)

The key innovation: **render generated sections as interactive HTML previews** inside the AI client using the MCP Apps extension. Instead of server-side screenshot rendering, the server declares `ui://` resources containing HTML templates, and the host renders them in a sandboxed iframe with full browser capabilities.

#### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  MCP Server (kickstartDS Storyblok)                         │
│                                                             │
│  1. Declares ui:// resources at connection time              │
│     ui://kds/section-preview   (section preview template)    │
│     ui://kds/page-preview      (full page preview)           │
│     ui://kds/plan-review       (plan review/approval UI)     │
│                                                             │
│  2. Tools declare _meta.ui.resourceUri                       │
│     generate_section → ui://kds/section-preview              │
│     generate_content → ui://kds/page-preview                 │
│     plan_page        → ui://kds/plan-review                  │
│                                                             │
│  3. App-only tools (visibility: ["app"])                      │
│     approve_section, reject_section, modify_section           │
│     approve_plan, reorder_plan                                │
└─────────────────────────────────────────────────────────────────┘
        │                              ▲
        │ tools/call result             │ tools/call (from UI)
        │ (structuredContent)            │ (app-only tools)
        ▼                              │
┌─────────────────────────────────────────────────────────────────┐
│  AI Host (Claude / ChatGPT / VS Code)                       │
│                                                             │
│  4. Fetches ui:// resource via resources/read                │
│  5. Renders HTML in sandboxed iframe                         │
│  6. Passes tool result via ui/notifications/tool-result      │
│  7. Proxies tool calls from UI back to server                │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Sandboxed iframe (section-preview.html)            │  │
│  │                                                     │  │
│  │  - Renders kickstartDS components with DS tokens      │  │
│  │  - Maps host CSS vars → kickstartDS token vars         │  │
│  │  - ✅ Approve  ✏️ Modify  ❌ Reject  🔄 Regenerate     │  │
│  │  - Calls app-only tools via postMessage → host        │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

#### UI Resource Declarations

The server registers three UI resources at connection time:

```typescript
// Section preview — renders a single generated section
{
  uri: "ui://kds/section-preview",
  name: "Section Preview",
  description: "Interactive preview of a generated section with approve/reject/modify actions",
  mimeType: "text/html;profile=mcp-app",
  _meta: {
    ui: {
      prefersBorder: true
    }
  }
}

// Page preview — renders multiple sections stacked
{
  uri: "ui://kds/page-preview",
  name: "Page Preview",
  description: "Full page preview with all generated sections",
  mimeType: "text/html;profile=mcp-app",
  _meta: {
    ui: {
      prefersBorder: true
    }
  }
}

// Plan review — interactive section sequence editor
{
  uri: "ui://kds/plan-review",
  name: "Plan Review",
  description: "Visual section sequence with drag-to-reorder and approve/edit actions",
  mimeType: "text/html;profile=mcp-app",
  _meta: {
    ui: {
      prefersBorder: true
    }
  }
}
```

#### Tool-UI Linkage

Generation tools declare their associated UI resource:

```typescript
// generate_section links to section-preview
{
  name: "generate_section",
  description: "Generate a single section with site-aware context",
  inputSchema: { /* ... */ },
  _meta: {
    ui: {
      resourceUri: "ui://kds/section-preview",
      visibility: ["model", "app"]   // callable by both LLM and UI
    }
  }
}
```

#### App-Only Tools (Hidden from LLM)

The preview UIs can call **app-only tools** that don’t require an LLM roundtrip:

```typescript
// Approve and import the previewed section
{
  name: "approve_section",
  description: "Import the approved section into Storyblok",
  inputSchema: {
    type: "object",
    properties: {
      storyUid: { type: "string" },
      position: { type: "number" },
      section: { type: "object" }
    }
  },
  _meta: {
    ui: {
      resourceUri: "ui://kds/section-preview",
      visibility: ["app"]  // ← hidden from the LLM, callable only from the UI
    }
  }
}
```

| App-Only Tool     | Purpose                                                       | Triggered By            |
| ----------------- | ------------------------------------------------------------- | ----------------------- |
| `approve_section` | Import previewed section into Storyblok                       | ✅ Approve button in UI |
| `reject_section`  | Discard section, optionally regenerate with feedback          | ❌ Reject button in UI  |
| `modify_section`  | Re-generate with adjusted prompt/params                       | ✏️ Modify button in UI  |
| `approve_plan`    | Accept the planned section sequence and proceed to generation | Plan review UI          |
| `reorder_plan`    | Update section order after drag-and-drop reorder              | Plan review UI          |

#### Data Flow (Tool Result → UI)

The host passes tool results to the UI via `ui/notifications/tool-result`:

```json
{
  "jsonrpc": "2.0",
  "method": "ui/notifications/tool-result",
  "params": {
    "content": [
      {
        "type": "text",
        "text": "Generated hero section with headline 'Transform Your Business'...",
        "annotations": { "audience": ["assistant"], "priority": 0.5 }
      }
    ],
    "structuredContent": {
      "component": "hero",
      "headline": "Transform Your Business",
      "sub_headline": "...",
      "cta_text": "Get Started",
      "renderedHtml": "<div class='dsa-hero'>...pre-rendered HTML...</div>"
    }
  }
}
```

The preview UI receives `structuredContent` — including `renderedHtml`, which is **pre-rendered on the server** using `renderToStaticMarkup` from `react-dom/server` with the actual kickstartDS React components (see [Section 6.3](#63-server-side-rendering-with-rendertostaticmarkup)). The UI template simply inserts the pre-rendered HTML and lets the inlined CSS and client-side JS activate on the DOM.

#### Preview Scope

| Tool                       | UI Resource                | Preview Type                                              |
| -------------------------- | -------------------------- | --------------------------------------------------------- |
| `generate_section`         | `ui://kds/section-preview` | Single section preview with approve/reject/modify actions |
| `generate_content`         | `ui://kds/page-preview`    | Full page preview (multiple sections stacked)             |
| `plan_page`                | `ui://kds/plan-review`     | Section sequence diagram with reorder and approve         |
| `create_page_with_content` | — (resource link only)     | Link to Storyblok Visual Editor                           |
| `generate_seo`             | — (text only)              | SEO metadata summary                                      |

#### Theming: Host CSS Variables → kickstartDS Tokens

The ext-apps spec defines standardized CSS variables that hosts pass to views. The preview UI maps these to kickstartDS design tokens:

```css
/* Map host CSS variables to kickstartDS branding tokens */
:root {
  --ks-brand-primary: var(--color-background-info, #4e63e0);
  --ks-background-color-default: var(--color-background-primary, #ffffff);
  --ks-foreground-color-default: var(--color-text-primary, #171717);
  --ks-font-display-family: var(--font-sans, system-ui, sans-serif);
  --ks-font-copy-family: var(--font-sans, system-ui, sans-serif);
  --ks-font-mono-family: var(--font-mono, monospace);
  --ks-border-radius-default: var(--border-radius-md, 8px);
}
```

The view also supports host font injection via `styles.css.fonts` and responds to `ui/notifications/host-context-changed` for theme toggles.

#### Capability Negotiation

The server checks for ext-apps support during initialization:

```typescript
import {
  getUiCapability,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";

const uiCap = getUiCapability(clientCapabilities);
if (uiCap?.mimeTypes?.includes(RESOURCE_MIME_TYPE)) {
  // Register tools WITH ui metadata + register UI resources
  // Register app-only tools
} else {
  // Register tools WITHOUT ui metadata (text-only fallback)
  // Skip app-only tools
}
```

### 3.3 Elicitation for Interactive Decisions

Use MCP Elicitation to ask users structured questions mid-flow, replacing the current pattern of the AI guessing and the user correcting after the fact.

> **Elicitation vs. ext-apps UI:** Some interactive decisions (especially plan review and component selection) can be handled by either Elicitation (flat forms, works in all MCP clients) or the ext-apps UI (rich interactive views, requires ext-apps support). The server uses **Elicitation as the primary mechanism** since it's part of the core spec and works everywhere, then **upgrades to the UI** for plan review when ext-apps is available. See Open Question #6.

#### Elicitation Points

| When                         | Elicitation Schema                                                                      | Trigger                                          |
| ---------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **Component type selection** | `{ componentType: { type: "string", enum: ["hero", "features", "faq", ...] } }`         | Before `generate_section` when no type specified |
| **Plan review**              | `{ approved: { type: "boolean" }, notes: { type: "string" } }`                          | After `plan_page` returns section sequence       |
| **Content type selection**   | `{ contentType: { type: "string", enum: ["page", "blog-post", "event-detail", ...] } }` | When ambiguous from intent                       |
| **Publish confirmation**     | `{ publish: { type: "boolean" }, reviewInEditor: { type: "boolean" } }`                 | Before publishing created content                |
| **Asset upload approval**    | `{ uploadAssets: { type: "boolean" } }`                                                 | When content contains external image URLs        |

#### Example: Component Type Picker via Elicitation

```json
{
  "method": "elicitation/create",
  "params": {
    "message": "Which component type would you like to generate for this section?",
    "requestedSchema": {
      "type": "object",
      "properties": {
        "componentType": {
          "type": "string",
          "title": "Component Type",
          "description": "The section component to generate",
          "enum": [
            "hero",
            "features",
            "cta",
            "faq",
            "testimonials",
            "gallery",
            "stats",
            "text",
            "image-text",
            "logos"
          ],
          "enumNames": [
            "Hero Banner",
            "Features Grid",
            "Call to Action",
            "FAQ Accordion",
            "Testimonials",
            "Image Gallery",
            "Statistics",
            "Text Block",
            "Image + Text Split",
            "Logo Cloud"
          ]
        },
        "prompt": {
          "type": "string",
          "title": "Content Description",
          "description": "Describe what content this section should contain"
        }
      },
      "required": ["componentType"]
    }
  }
}
```

> **Graceful degradation:** If the client doesn't support Elicitation (capability not declared during initialization), the server falls back to the current behavior — the AI picks the component type from context, and the user can override it in a follow-up message.

### 3.4 Structured Output with `outputSchema`

Add `outputSchema` to tool definitions so clients can programmatically parse results. The `structuredContent` field carries the typed data, while `content` carries the human-readable summary.

#### Example: `generate_section` with `outputSchema`

```json
{
  "name": "generate_section",
  "description": "Generate a single section with site-aware context",
  "inputSchema": { "..." },
  "outputSchema": {
    "type": "object",
    "properties": {
      "section": {
        "type": "object",
        "description": "The generated section content (Storyblok-ready)"
      },
      "componentType": {
        "type": "string",
        "description": "The component type that was generated"
      },
      "warnings": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Compositional quality warnings"
      },
      "previewAvailable": {
        "type": "boolean",
        "description": "Whether an image preview was included in the content"
      }
    },
    "required": ["section", "componentType"]
  }
}
```

### 3.5 Resource Links for Post-Write Navigation

After write operations, return resource links that help the user navigate to the created content:

```json
{
  "type": "resource_link",
  "uri": "https://app.storyblok.com/#/me/spaces/123456/stories/0/0/789",
  "name": "Open in Storyblok Visual Editor",
  "description": "View and edit the created page in Storyblok",
  "mimeType": "text/html",
  "annotations": {
    "audience": ["user"],
    "priority": 1.0
  }
}
```

### 3.6 Progress Notifications

During multi-section generation (e.g., `create_page_with_content` with 6 sections via the `create-page` prompt workflow), emit progress notifications:

```json
{
  "method": "notifications/progress",
  "params": {
    "progressToken": "page-gen-abc123",
    "progress": 3,
    "total": 6,
    "message": "Generating section 3/6: features"
  }
}
```

---

## 4. Detailed Task Breakdown

### Phase 1: MCP Prompts (Foundation)

Add discoverable prompt templates for the 6 core workflows. This is the lowest-risk, highest-impact change — users immediately get guided workflows without any rendering infrastructure.

| #    | Task                                                                                            | Files                                                              | Effort |
| ---- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------ |
| 1.1  | Add `prompts` capability to server initialization                                               | `packages/storyblok-mcp/src/index.ts`                                 | S      |
| 1.2  | Create prompt definitions module with 6 prompt templates                                        | `packages/storyblok-mcp/src/prompts.ts` (new)                         | M      |
| 1.3  | Implement `prompts/list` handler                                                                | `packages/storyblok-mcp/src/index.ts`                                 | S      |
| 1.4  | Implement `prompts/get` handler with argument interpolation                                     | `packages/storyblok-mcp/src/index.ts`                                 | M      |
| 1.5  | Add argument auto-completion for prompt arguments (component types, content types, story slugs) | `packages/storyblok-mcp/src/index.ts`                                 | M      |
| 1.6  | Load available component types dynamically from schema registry for prompt enumeration          | `packages/storyblok-mcp/src/prompts.ts`                               | S      |
| 1.7  | Add `create-page` prompt with full workflow instructions                                        | `packages/storyblok-mcp/src/prompts.ts`                               | M      |
| 1.8  | Add `migrate-from-url` prompt                                                                   | `packages/storyblok-mcp/src/prompts.ts`                               | S      |
| 1.9  | Add `create-blog-post` prompt                                                                   | `packages/storyblok-mcp/src/prompts.ts`                               | S      |
| 1.10 | Add `content-audit` prompt                                                                      | `packages/storyblok-mcp/src/prompts.ts`                               | S      |
| 1.11 | Add `extend-page` prompt                                                                        | `packages/storyblok-mcp/src/prompts.ts`                               | S      |
| 1.12 | Add `translate-page` prompt                                                                     | `packages/storyblok-mcp/src/prompts.ts`                               | S      |
| 1.13 | Write tests for prompt listing and retrieval                                                    | `packages/storyblok-mcp/test/prompts.test.ts` (new)                   | M      |
| 1.14 | Update README and copilot-instructions with prompt documentation                                | `packages/storyblok-mcp/README.md`, `.github/copilot-instructions.md` | S      |

### Phase 2: Structured Output (`outputSchema`)

Add `outputSchema` to all tools and return `structuredContent` alongside text summaries. This is a backwards-compatible enhancement — existing clients ignore the new fields.

| #   | Task                                                                   | Files                                                      | Effort |
| --- | ---------------------------------------------------------------------- | ---------------------------------------------------------- | ------ |
| 2.1 | Define output schemas for all 25 tools                                 | `packages/storyblok-mcp/src/schemas/output-schemas.ts` (new)  | L      |
| 2.2 | Update tool registration to include `outputSchema` in tool definitions | `packages/storyblok-mcp/src/index.ts`                         | M      |
| 2.3 | Update tool result handlers to include `structuredContent` field       | `packages/storyblok-mcp/src/index.ts`                         | M      |
| 2.4 | Add resource links to write tool results (create, update, import)      | `packages/storyblok-mcp/src/index.ts`                         | M      |
| 2.5 | Add annotations to content blocks (audience, priority)                 | `packages/storyblok-mcp/src/index.ts`                         | S      |
| 2.6 | Update MCP SDK to latest version if needed for `outputSchema` support  | `packages/storyblok-mcp/package.json`                         | S      |
| 2.7 | Write tests for structured output format                               | `packages/storyblok-mcp/test/structured-output.test.ts` (new) | M      |

### Phase 3: Elicitation for Interactive Workflows

Add server-side Elicitation requests for component type selection, plan approval, and publish confirmation.

| #   | Task                                                                                  | Files                                                | Effort |
| --- | ------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------ |
| 3.1 | Check client Elicitation capability during initialization and store flag              | `packages/storyblok-mcp/src/index.ts`                   | S      |
| 3.2 | Create Elicitation helper module with schema builders for common patterns             | `packages/storyblok-mcp/src/elicitation.ts` (new)       | M      |
| 3.3 | Add component type picker Elicitation to `generate_section` (when type not specified) | `packages/storyblok-mcp/src/index.ts`                   | M      |
| 3.4 | Add plan review Elicitation to `plan_page` (approve/edit sequence)                    | `packages/storyblok-mcp/src/index.ts`                   | M      |
| 3.5 | Add content type picker Elicitation when intent is ambiguous                          | `packages/storyblok-mcp/src/index.ts`                   | S      |
| 3.6 | Add publish confirmation Elicitation to `create_page_with_content`                    | `packages/storyblok-mcp/src/index.ts`                   | S      |
| 3.7 | Add asset upload approval Elicitation when external images detected                   | `packages/storyblok-mcp/src/index.ts`                   | S      |
| 3.8 | Implement graceful degradation when client doesn't support Elicitation                | `packages/storyblok-mcp/src/elicitation.ts`             | S      |
| 3.9 | Write tests for Elicitation flows (accept, decline, cancel paths)                     | `packages/storyblok-mcp/test/elicitation.test.ts` (new) | M      |

### Phase 4: Interactive UI Previews (MCP Apps Extension)

The flagship feature: serve interactive HTML previews via `ui://` resources using the ext-apps SDK. No server-side rendering — the host renders HTML in a sandboxed iframe with full browser capabilities.

| #    | Task                                                                                                    | Files                                                   | Effort |
| ---- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------ |
| 4.1  | Add `@modelcontextprotocol/ext-apps` dependency and configure server extension                          | `packages/storyblok-mcp/package.json`, `src/index.ts`      | S      |
| 4.2  | Detect client ext-apps capability via `getUiCapability()` and branch tool registration accordingly      | `packages/storyblok-mcp/src/index.ts`                      | M      |
| 4.3  | Create section preview HTML template (`section-preview.html`) using kickstartDS CSS and design tokens   | `packages/storyblok-mcp/src/ui/section-preview.html` (new) | L      |
| 4.4  | Create page preview HTML template (`page-preview.html`) for multi-section stacked view                  | `packages/storyblok-mcp/src/ui/page-preview.html` (new)    | L      |
| 4.5  | Create plan review HTML template (`plan-review.html`) with section sequence display and approve/edit    | `packages/storyblok-mcp/src/ui/plan-review.html` (new)     | M      |
| 4.6  | Register `ui://kds/section-preview`, `ui://kds/page-preview`, `ui://kds/plan-review` as UI resources    | `packages/storyblok-mcp/src/ui/resources.ts` (new)         | M      |
| 4.7  | Add `_meta.ui.resourceUri` to `generate_section`, `generate_content`, `plan_page` tool definitions      | `packages/storyblok-mcp/src/index.ts`                      | S      |
| 4.8  | Implement app-only tools: `approve_section`, `reject_section`, `modify_section` (visibility: `["app"]`) | `packages/storyblok-mcp/src/ui/app-tools.ts` (new)         | M      |
| 4.9  | Implement app-only tools: `approve_plan`, `reorder_plan` for plan-review UI                             | `packages/storyblok-mcp/src/ui/app-tools.ts`               | M      |
| 4.10 | Build host-theme-to-kickstartDS token mapping in preview templates (CSS variable bridge)                | `packages/storyblok-mcp/src/ui/theme-bridge.css` (new)     | M      |
| 4.11 | Extract and inline kickstartDS design tokens (branding, semantic, component) into HTML templates        | `packages/storyblok-mcp/src/ui/tokens.ts` (new)            | M      |
| 4.12 | Implement `renderToStaticMarkup` pipeline using actual kickstartDS React components + `DsaProviders`    | `packages/storyblok-mcp/src/ui/render.ts` (new)            | M      |
| 4.13 | Add `ui/notifications/tool-input-partial` support for streaming preview while section generates         | `packages/storyblok-mcp/src/ui/section-preview.html`       | M      |
| 4.14 | Add display mode support (`inline` default, `fullscreen` for page preview) via `appCapabilities`        | `packages/storyblok-mcp/src/ui/section-preview.html`       | S      |
| 4.15 | Implement `ui/update-model-context` in preview UIs to feed visual feedback back to the model            | `packages/storyblok-mcp/src/ui/section-preview.html`       | S      |
| 4.16 | Write tests for UI resource registration, app-only tool handlers, and template generation               | `packages/storyblok-mcp/test/ui.test.ts` (new)             | M      |
| 4.17 | End-to-end testing with Claude Desktop, ChatGPT, and VS Code using published ext-apps examples          | —                                                       | L      |

### Phase 5: Progress Notifications & Polish

| #   | Task                                                                | Files                                  | Effort |
| --- | ------------------------------------------------------------------- | -------------------------------------- | ------ |
| 5.1 | Add progress token support to multi-step workflows                  | `packages/storyblok-mcp/src/index.ts`     | M      |
| 5.2 | Emit progress notifications during `create-page` prompt workflow    | `packages/storyblok-mcp/src/index.ts`     | S      |
| 5.3 | Add `listChanged` notification for dynamic prompt updates           | `packages/storyblok-mcp/src/index.ts`     | S      |
| 5.4 | Update n8n node to benefit from structured output where applicable  | `packages/storyblok-n8n/...`               | M      |
| 5.5 | Update Prompter API routes to align with new MCP capabilities       | `packages/website/pages/api/prompter/` | M      |
| 5.6 | End-to-end testing with Claude Desktop and VS Code Copilot          | —                                      | L      |
| 5.7 | Update all documentation (README, copilot-instructions, skill docs) | Multiple files                         | M      |
| 5.8 | Performance testing with HTTP transport under concurrent requests   | —                                      | M      |

---

## 5. Prompt Definitions (Detail)

### 5.1 `create-page` Prompt

```typescript
{
  name: "create-page",
  title: "Create a New Page",
  description: "Guided workflow to plan and create a new page with AI-generated content. Plans the section structure, generates each section with site-aware context, previews them, and creates the page in Storyblok.",
  arguments: [
    {
      name: "intent",
      description: "What the page is about (e.g., 'Product landing page for our new AI feature', 'Company about page')",
      required: true,
    },
    {
      name: "slug",
      description: "URL slug for the page (e.g., 'ai-feature', 'about-us')",
      required: false,
    },
    {
      name: "sectionCount",
      description: "Target number of sections (auto-determined if not specified)",
      required: false,
    },
    {
      name: "contentType",
      description: "Content type: 'page' (default), 'blog-post', 'blog-overview', 'event-detail', 'event-list'",
      required: false,
    },
    {
      name: "path",
      description: "Folder path in Storyblok (e.g., 'en/services/consulting')",
      required: false,
    },
  ],
}
```

### 5.2 `migrate-from-url` Prompt

```typescript
{
  name: "migrate-from-url",
  title: "Migrate Content from URL",
  description: "Scrape content from a URL, analyze its structure, and recreate it as a new page in Storyblok using the Design System components.",
  arguments: [
    {
      name: "url",
      description: "The URL to migrate content from",
      required: true,
    },
    {
      name: "slug",
      description: "URL slug for the new page",
      required: false,
    },
    {
      name: "contentType",
      description: "Content type for the new page (default: 'page')",
      required: false,
    },
  ],
}
```

### 5.3 `create-blog-post` Prompt

```typescript
{
  name: "create-blog-post",
  title: "Create a Blog Post",
  description: "Create a complete blog post with sections, head metadata, aside content, CTA, and SEO optimization.",
  arguments: [
    {
      name: "topic",
      description: "The topic or title of the blog post",
      required: true,
    },
    {
      name: "slug",
      description: "URL slug for the blog post",
      required: false,
    },
    {
      name: "author",
      description: "Author name for the blog post",
      required: false,
    },
  ],
}
```

---

## 6. UI Resource Architecture (ext-apps)

### 6.1 Approach: Why ext-apps Replaces Server-Side Rendering

The original PRD considered three server-side rendering approaches (Puppeteer, Satori, template HTML). The ext-apps extension (SEP-1865) eliminates this entire category by rendering HTML **client-side** in the host’s sandboxed iframe:

| Approach                          | Fidelity                     | Performance           | Dependencies             | Docker Size |
| --------------------------------- | ---------------------------- | --------------------- | ------------------------ | ----------- |
| ~~Puppeteer (headless Chrome)~~   | ~~★★★★★~~                    | ~~∼2-4s per shot~~    | ~~Chromium (∼400MB)~~    | ~~+500MB~~  |
| ~~Satori + @resvg/resvg-js~~      | ~~★★★☆☆~~                    | ~~∼200-500ms~~        | ~~Pure JS/WASM (∼20MB)~~ | ~~+25MB~~   |
| **ext-apps `ui://` resources** ✅ | ★★★★★ Full browser rendering | Instant (client-side) | ext-apps SDK only (~1MB) | +1MB        |

**Key advantages of ext-apps:**

- ✅ **Full CSS fidelity** — real browser rendering, not a CSS subset
- ✅ **Interactive** — approve/reject/modify buttons, drag-to-reorder, form inputs
- ✅ **No server-side dependencies** — no Chromium, no WASM, no Puppeteer
- ✅ **Host-native theming** — host passes CSS variables, view blends into the client
- ✅ **Streaming support** — `tool-input-partial` notifications enable progressive rendering
- ✅ **Already shipping** — supported by Claude, ChatGPT, VS Code, Goose, Postman

### 6.2 UI Resource Templates

Each UI resource is a self-contained HTML5 document that:

1. Imports the ext-apps SDK (`@modelcontextprotocol/ext-apps`)
2. Initializes via `ui/initialize` handshake
3. Receives tool data via `ui/notifications/tool-result`
4. Renders kickstartDS component HTML with inlined design tokens
5. Calls app-only tools via `tools/call` through the host

#### Template Structure (section-preview.html)

```html
<!DOCTYPE html>
<html>
  <head>
    <style>
      /* 1. Host theme variable bridge */
      :root {
        --ks-brand-primary: var(--color-background-info, #4e63e0);
        --ks-background-color-default: var(--color-background-primary, #ffffff);
        --ks-foreground-color-default: var(--color-text-primary, #171717);
        --ks-font-display-family: var(--font-sans, system-ui);
        /* ... full token mapping ... */
      }

      /* 2. Inlined kickstartDS component CSS */
      /* Extracted from the Design System at build time */

      /* 3. Preview chrome (action bar, loading state) */
      .preview-actions {
        display: flex;
        gap: 8px;
        padding: 12px;
      }
    </style>
  </head>
  <body>
    <div id="preview-container"></div>
    <div class="preview-actions">
      <button id="approve">✅ Approve</button>
      <button id="modify">✏️ Modify</button>
      <button id="reject">❌ Reject</button>
      <button id="regenerate">🔄 Regenerate</button>
    </div>

    <script type="module">
      import {
        App,
        PostMessageTransport,
      } from "@modelcontextprotocol/ext-apps";

      const transport = new PostMessageTransport(window.parent);
      const app = new App({ name: "section-preview", version: "1.0.0" });
      await app.connect(transport);

      let currentSection = null;

      // Receive tool result and render pre-built HTML
      app.onToolResult((result) => {
        currentSection = result.structuredContent;
        // Server pre-rendered the HTML via renderToStaticMarkup — just insert it
        document.getElementById("preview-container").innerHTML =
          currentSection.renderedHtml;
        // Initialize kickstartDS client-side behaviors on the new DOM
        // (accordions, sliders, scroll animations, etc.)
        window._ks?.init?.();
      });

      // App-only tool calls (no LLM roundtrip)
      document.getElementById("approve").onclick = () =>
        app.callTool("approve_section", { section: currentSection });

      document.getElementById("reject").onclick = () =>
        app.callTool("reject_section", { reason: "user rejected" });
    </script>
  </body>
</html>
```

### 6.3 Server-Side Rendering with `renderToStaticMarkup`

Instead of writing custom HTML renderer functions for each component type, the MCP server uses `renderToStaticMarkup` from `react-dom/server` with the **actual kickstartDS React components**. This is possible because the kickstartDS Design System has a **three-layer independence** architecture:

1. **CSS** — `@kickstartds/ds-agency-premium/global.css` plus component-specific CSS files target DOM class names and `data-*` attributes, not React component instances. They are plain CSS files that work on any HTML with the correct DOM structure.
2. **Client-side JS** — All `*.client.js` files (bundled via esbuild into `public/_/client.js` on the website) use the kickstartDS `Component` base class — vanilla JavaScript with lifecycle management that attaches to DOM nodes by CSS selectors. Completely React-independent.
3. **React components** — Pure functional, no local state, `forwardRef`-based. They produce HTML markup and get out of the way. No `useEffect`, no `useState`, no browser API dependencies.

This means the server can render any kickstartDS component to clean HTML without a browser:

```typescript
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import DsaProviders from "@kickstartds/ds-agency-premium/providers";
import { Hero } from "@kickstartds/ds-agency-premium/hero";
import { Section } from "@kickstartds/ds-agency-premium/components/section/index.js";

function renderSectionToHtml(sectionData: Record<string, any>): string {
  const componentMap: Record<string, React.ComponentType<any>> = {
    hero: Hero,
    // ... all section-level components
  };

  const Component = componentMap[sectionData.component];
  if (!Component)
    return `<div>Unknown component: ${sectionData.component}</div>`;

  // DsaProviders supplies rendering-time configuration (no browser APIs needed)
  return renderToStaticMarkup(
    <DsaProviders>
      <Section>
        <Component {...sectionData} />
      </Section>
    </DsaProviders>
  );
}
```

`renderToStaticMarkup` produces **clean HTML without React hydration markers** — no `data-reactroot`, no `<!-- -->` comment placeholders. The output is identical to the DOM structure that the website renders in the browser, which is exactly what the CSS and client JS expect.

#### Why This Works (Existing Architecture Proof)

The website's existing build pipeline already proves this separation:

- [bundleStaticAssets.js](packages/website/scripts/bundleStaticAssets.js) bundles all `*.client.js` files independently via esbuild (format: ESM, tree-shaking enabled, CSS/SCSS treated as empty)
- The built pages (e.g., `.next/server/pages/index.html`) include the client JS as a plain `<script>` tag: `<script defer type="module" src="/_/client.js?cacheBuster=AUtqdX4ujD0"></script>`
- CSS is imported in [\_app.tsx](packages/website/pages/_app.tsx) as side-effect imports (`import "@kickstartds/ds-agency-premium/global.css"`) and compiled by Next.js into standalone CSS files

The MCP server rendering pipeline mirrors this exact separation — just without Next.js in the middle.

#### Rendering Flow

```
generate_section tool call
  → OpenAI produces section data (JSON)
  → processForStoryblok() transforms data for Storyblok
  → renderToStaticMarkup() renders React component → clean HTML string
  → Tool returns:
      content: [{ type: "text", text: "Generated hero section..." }]
      structuredContent: {
        component: "hero",
        data: { headline: "...", ... },
        renderedHtml: "<div class='dsa-hero'>...</div>"  // ← pre-rendered
      }
  → Host passes structuredContent to ui:// resource iframe
  → UI template inserts renderedHtml into DOM
  → Inlined CSS styles the markup
  → Inlined client JS initializes behaviors (accordions, sliders, etc.)
```

#### Advantages Over Custom HTML Renderers

| Aspect                | Custom Renderers (per-component)        | `renderToStaticMarkup` (actual components)      |
| --------------------- | --------------------------------------- | ----------------------------------------------- |
| **Fidelity**          | Approximation of DS markup              | Exact DS output — same components as production |
| **Maintenance**       | Must update renderers when DS changes   | Automatically in sync — uses the DS package     |
| **Coverage**          | Must build 10+ renderers, one per type  | All components supported immediately            |
| **Effort**            | L (per-component development & testing) | S (one rendering pipeline, all components)      |
| **Provider support**  | N/A — no React context available        | Full provider chain (DsaProviders, etc.)        |
| **Nested components** | Must handle recursive nesting manually  | React handles composition naturally             |

### 6.4 Design Token Integration

Preview templates use three token layers:

1. **Host CSS variables** (from `HostContext.styles.variables`) — mapped to kickstartDS branding tokens via the CSS variable bridge
2. **kickstartDS semantic tokens** — inlined from `packages/website/token/` at build time
3. **Component tokens** (`--dsa-*`) — inlined from the Design System’s component CSS

Token extraction happens at **MCP server build time** (not runtime):

```bash
# Build step: extract tokens from the website package
pnpm --filter mcp-server build:tokens
# Produces: packages/storyblok-mcp/src/ui/tokens.generated.css
```

This CSS is then inlined into the HTML templates as a `<style>` block.

### 6.5 Display Modes

| UI Resource       | Default Mode | Supports Fullscreen | Use Case                              |
| ----------------- | ------------ | ------------------- | ------------------------------------- |
| `section-preview` | `inline`     | No                  | Quick section preview in chat flow    |
| `page-preview`    | `inline`     | Yes                 | Full page preview, expand to see more |
| `plan-review`     | `inline`     | No                  | Section sequence review and reorder   |

### 6.6 Security (CSP)

All preview templates use the **restrictive default CSP** (no external connections, no external resources). Since all CSS and fonts are inlined, and no external API calls are needed from the preview itself, no `connectDomains` or `resourceDomains` are required.

If we later add real images (e.g., from Storyblok CDN) to previews:

```typescript
_meta: {
  ui: {
    csp: {
      resourceDomains: ["https://a.storyblok.com"];
    }
  }
}
```

### 6.7 Graceful Degradation

When the host doesn’t support ext-apps (no `io.modelcontextprotocol/ui` in client capabilities):

| Feature               | With ext-apps                          | Without ext-apps (fallback)                   |
| --------------------- | -------------------------------------- | --------------------------------------------- |
| Section preview       | Interactive HTML in sandboxed iframe   | JSON summary as text + structuredContent      |
| Plan review           | Visual section list with reorder       | Text-formatted plan for LLM to present        |
| Approve/reject        | Buttons in UI calling app-only tools   | LLM asks user in natural language             |
| Component type picker | Could be a rich dropdown in UI         | Falls back to Elicitation (flat enum) or text |
| Theming               | Host CSS variables mapped to DS tokens | N/A (no visual)                               |

---

## 7. Elicitation Schema Details

### 7.1 Component Type Picker

Used when `generate_section` is called without a `componentType`. The enum values are derived dynamically from the schema registry.

```json
{
  "message": "Which component type would you like for this section?\n\nBased on the site's patterns, the most commonly used types are: hero (12×), features (8×), cta (7×), faq (5×), testimonials (4×).",
  "requestedSchema": {
    "type": "object",
    "properties": {
      "componentType": {
        "type": "string",
        "title": "Component Type",
        "enum": [
          "hero",
          "features",
          "cta",
          "faq",
          "testimonials",
          "gallery",
          "stats",
          "text",
          "image-text",
          "logos"
        ],
        "enumNames": [
          "Hero Banner",
          "Features Grid",
          "Call to Action",
          "FAQ",
          "Testimonials",
          "Gallery",
          "Statistics",
          "Text Block",
          "Image + Text",
          "Logo Cloud"
        ]
      }
    },
    "required": ["componentType"]
  }
}
```

### 7.2 Plan Review

Used after `plan_page` returns a section sequence:

```json
{
  "message": "Here's the planned page structure:\n\n1. hero — Opening banner\n2. features — Key capabilities (4 items)\n3. testimonials — Customer quotes\n4. cta — Final call to action\n\nWould you like to proceed with this plan?",
  "requestedSchema": {
    "type": "object",
    "properties": {
      "approved": {
        "type": "boolean",
        "title": "Approve Plan",
        "description": "Proceed with this section sequence?"
      },
      "notes": {
        "type": "string",
        "title": "Adjustments",
        "description": "Any changes you'd like to make (optional)"
      }
    },
    "required": ["approved"]
  }
}
```

### 7.3 Limitations of Elicitation Schemas

Per the MCP spec, Elicitation schemas are **limited to flat objects with primitive properties** — no nested objects, no arrays. This means:

- ✅ Can present enum dropdowns for single selections
- ✅ Can ask boolean yes/no questions
- ✅ Can collect text input
- ❌ Cannot present a multi-select checkbox list
- ❌ Cannot present a complex form with nested sections
- ❌ Cannot render custom UI components

For complex interactions (like reordering a section sequence), the workflow falls back to the AI interpreting the user's free-text instructions. **However, when ext-apps is available**, the `plan-review` UI resource provides a full drag-to-reorder interface — overcoming Elicitation's flat-schema limitation entirely.

---

## 8. Client Compatibility

| AI Client             | Prompts            | Elicitation      | ext-apps UI Resources | Structured Output    | Resource Links       |
| --------------------- | ------------------ | ---------------- | --------------------- | -------------------- | -------------------- |
| **Claude Desktop**    | ✅ Slash commands  | ✅ Modal dialogs | ✅ Sandboxed iframes  | ✅                   | ✅ Clickable links   |
| **ChatGPT**           | ✅                 | ✅               | ✅ Sandboxed iframes  | ✅                   | ✅                   |
| **VS Code Copilot**   | ✅ (via MCP tools) | ⚠️ Limited       | ✅ Sandboxed iframes  | ✅                   | ✅                   |
| **Goose**             | Varies             | Varies           | ✅ Sandboxed iframes  | Varies               | Varies               |
| **Postman**           | Varies             | Varies           | ✅ Sandboxed iframes  | Varies               | Varies               |
| **Other MCP clients** | Varies             | Varies           | Graceful fallback     | Backwards-compatible | Backwards-compatible |

> **ext-apps capability negotiation** ensures backwards compatibility: the server checks for `io.modelcontextprotocol/ui` in client capabilities during `initialize`. If absent, tools are registered without `_meta.ui` metadata and app-only tools are skipped entirely. All tools continue to return `text` content blocks regardless of ext-apps support.

> **Supported clients (as of 2026-01-26):** Claude, ChatGPT, VS Code, Goose, Postman, MCPJam. See the [ext-apps clients list](https://modelcontextprotocol.io/clients) for the latest.

---

## 9. Open Questions

1. **UI template bundling strategy:** Should the HTML templates be inlined as strings in the server code, or loaded from separate `.html` files at runtime? Inlining simplifies deployment but makes templates harder to develop. Consider a build step that compiles `.html` → TypeScript string constants.

2. **Design token synchronization:** The preview templates need kickstartDS design tokens inlined. Should we extract tokens at MCP server build time (from the website package), or fetch them dynamically from the Design Token MCP at server startup? Build-time extraction is more reliable; runtime is more flexible for multi-site deployments.

3. **Storyblok CDN images in previews:** To show actual images (hero backgrounds, feature icons) in previews, the UI resource needs `resourceDomains: ["https://a.storyblok.com"]` in its CSP. Should we always declare this, or only when the content includes images?

4. **App-only tool granularity:** Should `approve_section` immediately import to Storyblok, or should it accumulate approved sections and import them all at once when the user approves the full page? The latter is more aligned with the `create-page` workflow.

5. **Prompt dynamism:** Should prompts include dynamic context (e.g., the `create-page` prompt could list recently used component types)? The spec supports `listChanged` notifications for when prompt lists change.

6. **Elicitation vs. ext-apps UI for interactive decisions:** Some Elicitation use cases (component type picker, plan review) could be better served by the interactive UI itself. Should we implement both and let the capability negotiation decide, or favor the UI approach?

7. **n8n node integration:** Should the n8n node also benefit from structured output schemas, or keep its current direct-JSON approach?

8. **ext-apps SDK version pinning:** The ext-apps SDK is at v1.1.2. Should we pin to a specific version or use `^1.0.0`? The spec is marked Stable but the SDK is still actively evolving (20 releases so far).

9. **Preview template testing:** How do we test HTML templates outside of a host? The ext-apps repo includes a `basic-host` reference implementation — should we set that up as a dev dependency for local testing?

10. **DS component dependency scope:** The `renderToStaticMarkup` approach requires `@kickstartds/ds-agency-premium` as a dependency of the MCP server. Should we depend on the full package (simplest, all components available), or extract a lightweight rendering-only subset? The full package adds React components + CSS + client JS but no browser dependencies. For multi-site deployments, should the DS package be configurable per-space?

11. **Provider parity:** The website wraps components in `DsaProviders` → `ComponentProviders` → `ImageSizeProviders` → `ImageRatioProviders`. For `renderToStaticMarkup` in the MCP server, which providers are needed? `DsaProviders` is likely sufficient for rendering, but custom overrides (e.g., `PictureContext.Provider` for Next.js `Image`) may produce different HTML than the website. Should preview rendering use a minimal provider set or mirror the full website provider chain?

---

## 10. Success Metrics

- **Prompt adoption:** >50% of MCP interactions start from a prompt (vs. raw tool calls) within 30 days
- **Preview usage:** >80% of `generate_section` calls render an interactive preview when the client supports ext-apps UI resources
- **Elicitation completion:** >90% of Elicitation requests are accepted (not declined/cancelled), indicating they're well-targeted
- **Time-to-first-page:** Reduce average time from intent to published page by 30% through guided workflows
- **Error reduction:** Reduce "wrong component type" corrections by 50% through Elicitation-based selection
- **Client support:** MCP Apps features work in Claude Desktop, ChatGPT, and VS Code within 30 days of release

---

## 11. Dependencies

- **MCP SDK:** `@modelcontextprotocol/sdk` ≥ 1.0.0 (Prompts, Elicitation, Structured Output)
- **MCP Apps SDK (Phase 4):** `@modelcontextprotocol/ext-apps` ≥ 1.0.0 — provides:
  - `@modelcontextprotocol/ext-apps/server` — `getUiCapability()`, `RESOURCE_MIME_TYPE`, tool registration helpers
  - `@modelcontextprotocol/ext-apps` — `App`, `PostMessageTransport` for view-side code
  - `@modelcontextprotocol/ext-apps/react` — React hooks (`useApp`, `useHostStyles`) if we use React in templates
- **React + ReactDOM (Phase 4):** `react` and `react-dom` as dependencies for `renderToStaticMarkup` — used **server-side only** to render kickstartDS components to static HTML for preview templates. No browser, no hydration, no Puppeteer.
- **kickstartDS Design System (Phase 4):** `@kickstartds/ds-agency-premium` as a dependency for:
  - React components (`Hero`, `Section`, `Features`, etc.) — used with `renderToStaticMarkup`
  - `DsaProviders` — rendering-time context providers (no browser APIs needed)
  - `global.css` — complete CSS bundle, inlined into preview templates at build time
  - `*.client.js` — vanilla JS behaviors (accordions, sliders), bundled and inlined into preview templates
- **No Puppeteer/Satori** — ext-apps renders client-side; `renderToStaticMarkup` runs in Node.js without a browser
- **Design tokens:** Access to `branding-token.css` and semantic token files for preview styling (build-time extraction)
- **Schema registry:** `packages/storyblok-services/src/registry.ts` for dynamic component type enumeration
- **Existing infrastructure:** All current tools, resources, patterns cache, and section recipes remain unchanged

---

## 12. Migration & Backwards Compatibility

This upgrade is **fully backwards-compatible**:

| Change                         | Existing Clients                           | New Clients (ext-apps capable)           |
| ------------------------------ | ------------------------------------------ | ---------------------------------------- |
| Prompts added                  | Ignored (no prompts capability negotiated) | Discover and invoke via slash commands   |
| `outputSchema` on tools        | Ignored (field not read)                   | Use for typed parsing                    |
| `structuredContent` in results | Ignored (field not read)                   | Use alongside `content`                  |
| UI resources (`ui://`)         | Not fetched (no ext-apps capability)       | Rendered in sandboxed iframes            |
| Tool `_meta.ui.resourceUri`    | Ignored (field not read)                   | Host renders UI after tool execution     |
| App-only tools                 | Not registered (no ext-apps capability)    | UI calls them directly via `postMessage` |
| Resource links in results      | Ignored (unknown content type)             | Render as clickable links                |
| Elicitation requests           | Not sent (capability not declared)         | Presented as modal dialogs               |

No breaking changes. No API version bump required. The server continues to return `text` content blocks for all results — new content types are additive.

---

## 13. Appendix

### A. Current Server Capabilities Object

```typescript
// Before (current)
{
  capabilities: {
    tools: {},
    resources: {},
  }
}

// After (upgraded)
{
  capabilities: {
    tools: { listChanged: true },
    resources: { listChanged: true },
    prompts: { listChanged: true },
    // ext-apps support is negotiated via the extensions mechanism:
    // Client sends: extensions: { "io.modelcontextprotocol/ui": { mimeTypes: ["text/html;profile=mcp-app"] } }
    // Server responds by registering ui:// resources and tools with _meta.ui
  }
}
```

### B. Current Tool Result Format (all tools)

```typescript
// Before: text-only
{
  content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
}

// After: structured + UI-linked (when ext-apps supported)
// The tool returns structuredContent which the host passes to the UI resource
{
  content: [
    { type: "text", text: "Summary...", annotations: { audience: ["assistant"] } },
    { type: "resource_link", uri: "https://app.storyblok.com/...", name: "Open in Editor" },
  ],
  structuredContent: { /* typed JSON matching outputSchema — also passed to ui:// view */ }
}

// The host automatically:
// 1. Fetches the ui:// resource declared in the tool's _meta.ui.resourceUri
// 2. Renders it in a sandboxed iframe
// 3. Sends structuredContent to the view via ui/notifications/tool-result
```

### C. File Inventory (new files)

| File                                                 | Phase | Purpose                                                            |
| ---------------------------------------------------- | ----- | ------------------------------------------------------------------ |
| `packages/storyblok-mcp/src/prompts.ts`                 | 1     | Prompt definitions and handlers                                    |
| `packages/storyblok-mcp/src/schemas/output-schemas.ts`  | 2     | Output schema definitions for all tools                            |
| `packages/storyblok-mcp/src/elicitation.ts`             | 3     | Elicitation helpers and schema builders                            |
| `packages/storyblok-mcp/src/ui/resources.ts`            | 4     | UI resource registration (`ui://kds/*`)                            |
| `packages/storyblok-mcp/src/ui/app-tools.ts`            | 4     | App-only tool handlers (approve, reject, modify)                   |
| `packages/storyblok-mcp/src/ui/section-preview.html`    | 4     | Section preview HTML template                                      |
| `packages/storyblok-mcp/src/ui/page-preview.html`       | 4     | Full page preview HTML template                                    |
| `packages/storyblok-mcp/src/ui/plan-review.html`        | 4     | Plan review/approval HTML template                                 |
| `packages/storyblok-mcp/src/ui/theme-bridge.css`        | 4     | Host CSS variable → kickstartDS token mapping                      |
| `packages/storyblok-mcp/src/ui/tokens.ts`               | 4     | Design token extraction for preview templates                      |
| `packages/storyblok-mcp/src/ui/render.ts`               | 4     | `renderToStaticMarkup` pipeline using kickstartDS React components |
| `packages/storyblok-mcp/test/prompts.test.ts`           | 1     | Prompt tests                                                       |
| `packages/storyblok-mcp/test/structured-output.test.ts` | 2     | Structured output tests                                            |
| `packages/storyblok-mcp/test/elicitation.test.ts`       | 3     | Elicitation tests                                                  |
| `packages/storyblok-mcp/test/ui.test.ts`                | 4     | UI resource and app-only tool tests                                |

### D. Effort Summary

| Phase       | Description               | Tasks  | Effort        |
| ----------- | ------------------------- | ------ | ------------- |
| **Phase 1** | MCP Prompts               | 14     | ~2 weeks      |
| **Phase 2** | Structured Output         | 7      | ~1 week       |
| **Phase 3** | Elicitation               | 9      | ~1.5 weeks    |
| **Phase 4** | Interactive UI (ext-apps) | 17     | ~4 weeks      |
| **Phase 5** | Progress & Polish         | 8      | ~1.5 weeks    |
| **Total**   |                           | **55** | **~10 weeks** |

> Phase 4 is larger than the original estimate (+1 week) due to interactive UI development (HTML templates, component renderers, app-only tools, display modes, streaming support), but **eliminates** the Docker image bloat and server-side rendering complexity that would have been ongoing operational costs.

### E. Related Documents

- [docs/guided-generation-plan.md](../plans/guided-generation-plan.md) — Guided generation workflow design
- [docs/prompter-reactivation-prd.md](prompter-reactivation-prd.md) — Prompter (Visual Editor) reactivation
- [docs/skills/plan-page-structure.md](../../skills/plan-page-structure.md) — Section-by-section generation workflow guide
- [docs/skills/create-page-from-scratch.md](../../skills/create-page-from-scratch.md) — Page creation skill
- [docs/skills/migrate-from-url.md](../../skills/migrate-from-url.md) — URL migration skill
- **[SEP-1865: MCP Apps (2026-01-26 Stable)](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx)** — Interactive UI extension spec
- **[ext-apps SDK & Examples](https://github.com/modelcontextprotocol/ext-apps)** — SDK, starter templates, reference examples
- **[ext-apps API Documentation](https://apps.extensions.modelcontextprotocol.io/api/)** — TypeDoc API reference
- **[ext-apps Quickstart Guide](https://apps.extensions.modelcontextprotocol.io/api/documents/Quickstart.html)** — Getting started guide
- [MCP Core Specification 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18) — Core protocol reference
- [MCP Prompts Spec](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts) — Prompt protocol
- [MCP Elicitation Spec](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation) — Elicitation protocol
- [MCP Tools Spec (Structured Output)](https://modelcontextprotocol.io/specification/2025-06-18/server/tools) — Tool output types
