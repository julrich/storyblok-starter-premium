/**
 * Capability negotiation for MCP Apps (ext-apps) extension.
 *
 * Checks whether the connected client supports the MCP Apps extension
 * (ui:// resources rendered in sandboxed iframes). When the client
 * advertises ext-apps support, the server conditionally registers:
 * - ui:// resources for previews (section, page, plan review)
 * - App-only tools (approve, reject, modify — hidden from the LLM)
 * - Tool-UI linkage via `_meta.ui.resourceUri` on generation tools
 *
 * ## Why three detection layers?
 *
 * Clients advertise ext-apps support by sending the extension identifier
 * `io.modelcontextprotocol/ui` inside `capabilities.extensions` during
 * the MCP `initialize` handshake (per SEP-1724 / ext-apps spec §5.15).
 *
 * However, the MCP SDK (as of v1.27.1) does NOT include `extensions` in
 * its `ClientCapabilitiesSchema` Zod schema — that field is pending
 * SEP-1724. Zod's default `.strip()` mode silently removes unknown keys,
 * so `server.getClientCapabilities()` returns an object WITHOUT the
 * `extensions` field, even when the client sent it.
 *
 * To handle this reliably, we use three fallback layers:
 * 1. **SDK helper** — `getUiCapability(clientCaps)` checks
 *    `clientCaps.extensions["io.modelcontextprotocol/ui"]`. Works when
 *    a future SDK version adds `extensions` to the schema.
 * 2. **`experimental` fallback** — clients may advertise ext-apps
 *    support under `capabilities.experimental["io.modelcontextprotocol/ui"]`
 *    since `experimental` is a `Record<string, object>` that survives
 *    Zod parsing.
 * 3. **Raw transport intercept** — `installCapabilityInterceptor()`
 *    wraps the transport's `onmessage` callback to capture the raw
 *    `extensions` field from the `initialize` request BEFORE the SDK's
 *    Zod parser strips it. This is the bulletproof fallback that works
 *    regardless of SDK version or client behavior.
 *
 * @see https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx
 * @see https://modelcontextprotocol.info/specification/2024-11-05/basic/lifecycle/
 */

import {
  getUiCapability,
  RESOURCE_MIME_TYPE,
  EXTENSION_ID,
} from "@modelcontextprotocol/ext-apps/server";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

// ── Constants ──────────────────────────────────────────────────────

/** URI prefix for all kickstartDS UI resources */
export const UI_URI_PREFIX = "ui://kds";

/** Section preview resource URI — stateless single-section preview */
export const SECTION_PREVIEW_URI = `${UI_URI_PREFIX}/section-preview`;

/** Page builder resource URI — final assembly with reorder/remove/save */
export const PAGE_BUILDER_URI = `${UI_URI_PREFIX}/page-builder`;

/** Plan review resource URI */
export const PLAN_REVIEW_URI = `${UI_URI_PREFIX}/plan-review`;

/** Audit report resource URI — content quality dashboard */
export const AUDIT_REPORT_URI = `${UI_URI_PREFIX}/audit-report`;

// Re-export for convenience
export { RESOURCE_MIME_TYPE };

// ── Raw extensions capture ─────────────────────────────────────────

/**
 * Store for raw `extensions` captured from the `initialize` request
 * before the SDK's Zod parser strips unrecognized fields.
 *
 * Keyed by Server instance so each connection has its own state.
 */
const rawExtensionsStore = new WeakMap<Server, Record<string, unknown>>();

/**
 * Install a transport interceptor that captures the raw `extensions`
 * field from the client's `initialize` request.
 *
 * MUST be called between `mcpServer.connect(transport)` and the first
 * incoming message (for stdio: immediately after connect; for HTTP:
 * between connect and `transport.handleRequest()`).
 *
 * The interceptor wraps the transport's `onmessage` callback to inspect
 * incoming JSON-RPC messages. When it sees an `initialize` request with
 * `params.capabilities.extensions`, it stores the raw extensions in a
 * WeakMap keyed by the Server instance. The original handler is then
 * called unchanged — the SDK processes the message normally (and Zod
 * strips `extensions` as usual).
 *
 * This is safe because:
 * - JavaScript is single-threaded; the interceptor runs synchronously
 *   before the SDK's handler
 * - The `initialize` request is always the first message in an MCP
 *   session (per the MCP lifecycle spec)
 * - For stdio transport, `connect()` calls `transport.start()` which
 *   begins async I/O — messages arrive via the event loop AFTER
 *   `connect()` returns
 * - For HTTP transport, messages arrive when `transport.handleRequest()`
 *   is called, which happens AFTER our interceptor is installed
 *
 * @param server  The low-level Server instance (mcpServer.server)
 * @param transport  The transport instance AFTER connect() has been called
 */
export function installCapabilityInterceptor(
  server: Server,
  transport: Transport
): void {
  const sdkHandler = transport.onmessage;

  transport.onmessage = (message) => {
    // Check for the `initialize` JSON-RPC request
    if (
      message &&
      typeof message === "object" &&
      "method" in message &&
      (message as any).method === "initialize"
    ) {
      const extensions = (message as any).params?.capabilities?.extensions;
      if (extensions && typeof extensions === "object") {
        rawExtensionsStore.set(server, extensions);
        console.error(
          `[MCP] Captured raw extensions from initialize: ${Object.keys(
            extensions
          ).join(", ")}`
        );
      }
    }

    // Always forward to the SDK's handler
    sdkHandler?.(message);
  };
}

// ── Capability detection ───────────────────────────────────────────

/**
 * Check whether a capability entry contains the ext-apps MIME type.
 *
 * @param cap  The capability object (e.g. from extensions or experimental)
 * @returns true if the capability advertises `text/html;profile=mcp-app`
 */
function hasExtAppsMimeType(cap: unknown): boolean {
  if (!cap || typeof cap !== "object") return false;
  const mimeTypes = (cap as any).mimeTypes;
  return Array.isArray(mimeTypes) && mimeTypes.includes(RESOURCE_MIME_TYPE);
}

/**
 * Check whether the connected MCP client supports ext-apps UI resources.
 *
 * Uses three detection layers (in priority order):
 *
 * 1. **SDK helper** — `getUiCapability()` checks `extensions["io.modelcontextprotocol/ui"]`
 *    on the parsed `ClientCapabilities`. Works when a future SDK version
 *    preserves the `extensions` field.
 *
 * 2. **`experimental` fallback** — checks `experimental["io.modelcontextprotocol/ui"]`
 *    on the parsed capabilities. The `experimental` field is declared as
 *    `Record<string, object>` in the SDK's schema, so Zod preserves it.
 *    Clients MAY advertise ext-apps support here as a compatibility measure.
 *
 * 3. **Raw transport intercept** — checks the raw `extensions` field captured
 *    by `installCapabilityInterceptor()` before Zod stripped it. This is the
 *    bulletproof fallback that works with the current SDK (v1.27.1) where
 *    `extensions` is not in `ClientCapabilitiesSchema`.
 *
 * @param server  The low-level Server instance (mcpServer.server)
 * @returns true if the client advertises ext-apps support via any layer
 */
export function clientSupportsExtApps(server: Server): boolean {
  try {
    const clientCaps = server.getClientCapabilities();

    // Layer 1: SDK helper — checks extensions (works when SDK adds extensions to schema)
    const uiCap = getUiCapability(clientCaps as any);
    if (hasExtAppsMimeType(uiCap)) {
      return true;
    }

    // Layer 2: experimental fallback — clients may use experimental as compat shim
    const experimentalCap = (clientCaps as any)?.experimental?.[EXTENSION_ID];
    if (hasExtAppsMimeType(experimentalCap)) {
      return true;
    }

    // Layer 3: raw transport intercept — extensions captured before Zod stripping
    const rawExtensions = rawExtensionsStore.get(server);
    const rawCap = rawExtensions?.[EXTENSION_ID];
    if (hasExtAppsMimeType(rawCap)) {
      return true;
    }

    return false;
  } catch {
    // If capabilities haven't been negotiated yet, assume no support
    return false;
  }
}
