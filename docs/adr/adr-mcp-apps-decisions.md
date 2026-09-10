# ADR: MCP Apps Upgrade — Architecture Decisions

**Date:** 2026-02-27
**Status:** Accepted
**Context:** Implementing PRD [mcp-apps-upgrade-prd.md](../internal/prd/mcp-apps-upgrade-prd.md)

---

## ADR-001: Prompts Module as Separate File

**Decision:** Create `src/prompts.ts` as a standalone module exporting prompt definitions and a `getPromptMessages()` function, rather than inlining prompt definitions in `index.ts`.

**Rationale:**

- `index.ts` is already 2669 lines; adding 6 detailed prompt templates with multi-step workflow instructions would push it past 3000 lines
- Prompt definitions are conceptually self-contained — they define workflow guides, not server infrastructure
- A dedicated module makes it easy to add/modify prompts without touching the main server file
- The module exports a typed interface (`PromptDefinition`, `getPromptMessages`) that `index.ts` consumes via handlers

**Consequences:**

- Two new SDK type imports needed in `index.ts`: `ListPromptsRequestSchema`, `GetPromptRequestSchema`
- Prompt argument auto-completion deferred — would require dynamic loading from schema registry at runtime; initial implementation uses static `enum` values in descriptions instead

---

## ADR-002: Structured Output — Selective `outputSchema` Application

**Decision:** Add `outputSchema` to 15 tools via an `OUTPUT_SCHEMAS` map in `src/output-schemas.ts` — 8 read/generate tools (plan_page, generate_section, generate_content, list_stories, get_story, list_components, get_component, analyze_content_patterns) and 7 write tools (import_content, import_content_at_position, create_page_with_content, create_story, update_story, replace_section, update_seo). The schemas are injected dynamically in the `ListToolsRequestSchema` handler rather than hard-coded in the TOOLS array.

**Rationale:**

- The MCP spec notes `outputSchema` is optional and should be used when clients benefit from structured parsing
- Dynamic injection via `OUTPUT_SCHEMAS[tool.name]` keeps the TOOLS array clean and makes schemas independently testable
- Write tools share a common `writeResultOutputSchema` shape (success, message, story, warnings)
- Resource link annotations on write results provide direct Storyblok Editor URLs for the affected story
- Tools not in the map (e.g., scrape_url, list_icons, ensure_path) have opaque or trivial output that doesn't benefit from a schema

**Consequences:**

- Not all tools have `outputSchema` — clients must handle both patterns
- Future Phase 4 work relies on `structuredContent` from `generate_section` containing the rendered preview data

---

## ADR-003: Elicitation — Graceful Degradation Strategy

**Decision:** Wrap all Elicitation calls in a helper that checks `clientCapabilities.elicitation` and falls back silently — the tool continues with default behavior (AI picks the best option) rather than failing.

**Rationale:**

- Elicitation is client-optional per the MCP spec; many clients don't support it yet
- The server already works without Elicitation (current behavior)
- Failing a tool call because elicitation wasn't available would be a regression
- The helper pattern (`tryElicit()`) keeps the calling code clean — one-liner that either gets user input or returns `null`

**Implementation:**

```typescript
export async function tryElicit(
  server: Server,
  message: string,
  properties: Record<string, ElicitationProperty>,
  required?: string[]
): Promise<ElicitationResult> {
  const clientCapabilities = server.getClientCapabilities();
  if (!clientCapabilities?.elicitation) {
    return { accepted: false, reason: "unsupported" };
  }
  try {
    const result = await server.elicitInput({
      mode: "form",
      message,
      requestedSchema: { type: "object", properties, required: required || [] },
    });
    if (result.action === "accept" && result.content) {
      return { accepted: true, content: result.content };
    }
    return {
      accepted: false,
      reason: result.action === "decline" ? "declined" : "cancelled",
    };
  } catch {
    return { accepted: false, reason: "unsupported" };
  }
}
```

**Initial integration:** `delete_story` — elicits deletion confirmation; if declined/cancelled, returns `{ success: false, message: "Deletion cancelled by user" }`. When elicitation is unsupported, the delete proceeds as before (no regression).

**Consequences:**

- Elicitation is purely additive — no behavior changes for existing clients
- When available, users get interactive component type pickers, plan review, and publish confirmation

---

## ADR-004: Resource Links — Storyblok Editor URL Construction

**Decision:** Construct Storyblok Visual Editor URLs from the space ID and story ID returned by write operations, using the format `https://app.storyblok.com/#/me/spaces/{spaceId}/stories/0/0/{storyId}`.

**Rationale:**

- The space ID is available from the server config (`STORYBLOK_SPACE_ID`)
- Story IDs are returned by all write operations
- This URL pattern reliably opens the Visual Editor for any story
- No additional API calls needed — the URL is deterministic

**Consequences:**

- Links are only accurate for the Storyblok region the space belongs to (the default `app.storyblok.com` works for most; US/China regions use different subdomains)
- Consider making the base URL configurable via env var in the future

---

## ADR-005: Progress Notifications — `ProgressReporter` Class

**Decision:** Create a `ProgressReporter` class in `src/progress.ts` that wraps `server.notification()` with the `notifications/progress` method, using `progressToken` from the request's `_meta`.

**Rationale:**

- The SDK doesn't expose a dedicated `sendProgress()` method on the low-level `Server` class (it's on `McpServer` which we don't use); using `server.notification()` directly with the `notifications/progress` method achieves the same result
- A class-based approach (`ProgressReporter`) is cleaner than raw notification calls — it tracks step count automatically and provides `advance(message)` / `complete(message)` methods
- `getProgressToken(request)` extracts the token from `request.params._meta.progressToken`
- Progress is best-effort: errors in notification sending are caught and logged, never propagated

**Consequences:**

- Progress is only reported when the client passes a `progressToken` (which is optional per spec)
- Works out of the box with Claude Desktop, which supports progress display

---

## ADR-006: Phase 4 Deferred — ext-apps SDK Not Yet Integrated

**Decision:** Defer Phase 4 (Interactive UI Previews via ext-apps) to a follow-up implementation cycle. Phases 1–3 and 5.1 are implemented in this pass.

**Rationale:**

- Phase 4 is the largest phase (17 tasks, ~4 weeks estimated)
- It depends on `@modelcontextprotocol/ext-apps` SDK which needs evaluation for compatibility with the stateless HTTP transport mode
- The `renderToStaticMarkup` pipeline requires adding `react`, `react-dom`, and `@kickstartds/ds-agency-premium` as MCP server dependencies — significant dependency footprint change
- Phases 1–3 deliver immediate value (discoverable workflows, structured output, interactive decisions) and are prerequisites for Phase 4
- Phase 4 HTML templates will consume the `structuredContent` format established in Phase 2

**Consequences:**

- No visual previews in this implementation pass — users still see JSON in chat
- The `structuredContent` format includes all data Phase 4 needs; no rework expected
- Phase 4 can be implemented independently once Phases 1–3 are stable
