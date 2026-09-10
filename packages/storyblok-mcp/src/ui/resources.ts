/**
 * UI resource registration for ext-apps previews.
 *
 * Registers three `ui://` resources that serve HTML preview templates:
 * - `ui://kds/section-preview` — Stateless single-section preview with approve/reject/modify
 * - `ui://kds/page-builder`    — Final assembly view for reviewing all sections before saving
 * - `ui://kds/plan-review`     — Section sequence planner with drag-to-reorder
 *
 * These resources are only registered when the connected client
 * supports ext-apps (detected via capability negotiation).
 *
 * Uses `registerAppResource()` from the ext-apps SDK which automatically
 * sets the `text/html;profile=mcp-app` MIME type.
 *
 * @see PRD Section 6.1 — Resource Registration
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppResource } from "@modelcontextprotocol/ext-apps/server";

import {
  SECTION_PREVIEW_URI,
  PAGE_BUILDER_URI,
  PLAN_REVIEW_URI,
  AUDIT_REPORT_URI,
  RESOURCE_MIME_TYPE,
} from "./capability.js";
import {
  SECTION_PREVIEW_HTML,
  PAGE_BUILDER_HTML,
  PLAN_REVIEW_HTML,
} from "./templates.js";
import { AUDIT_REPORT_HTML } from "./audit-report-template.js";

// ── Registration ───────────────────────────────────────────────────

/**
 * Register all ext-apps UI resources on the McpServer.
 *
 * Each resource serves a self-contained HTML document that the host
 * renders in a sandboxed iframe. The HTML includes:
 * - The ext-apps client SDK for host communication
 * - kickstartDS theme bridge CSS variables
 * - Preview chrome (action buttons, loading states)
 *
 * CSP is restrictive by default (no external connections needed).
 * When Storyblok CDN images are added, `resourceDomains` will be
 * extended to include `https://a.storyblok.com`.
 */
/** Shared CSP metadata — ext-apps SDK is loaded from unpkg.com */
const SHARED_UI_META = {
  ui: {
    csp: {
      resourceDomains: [
        "https://unpkg.com", // ext-apps SDK (app-with-deps.js)
        "https://a.storyblok.com", // Storyblok CDN assets
        "https://img2.storyblok.com", // Storyblok image service (resized/optimized)
        "https://placehold.co", // Placeholder images in AI-generated content
        "https://fonts.googleapis.com", // Google Fonts CSS stylesheets
        "https://fonts.gstatic.com", // Google Fonts font files (woff2)
      ],
    },
    prefersBorder: true,
  },
};

export function registerUiResources(server: McpServer): void {
  // ── Section Preview ────────────────────────────────────────────

  registerAppResource(
    server,
    "Section Preview",
    SECTION_PREVIEW_URI,
    {
      description:
        "Stateless single-section preview. Shows one generated section in isolation with approve/reject/modify actions. Each generate_section call gets its own preview — no state accumulation.",
      _meta: SHARED_UI_META,
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: RESOURCE_MIME_TYPE,
          text: SECTION_PREVIEW_HTML,
          _meta: SHARED_UI_META,
        },
      ],
    })
  );

  // ── Page Builder ───────────────────────────────────────────────

  registerAppResource(
    server,
    "Page Builder",
    PAGE_BUILDER_URI,
    {
      description:
        "Final assembly view for reviewing all generated sections together before saving to Storyblok. Supports reorder, remove, and save actions. Also used for editing existing pages via get_story.",
      _meta: SHARED_UI_META,
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: RESOURCE_MIME_TYPE,
          text: PAGE_BUILDER_HTML,
          _meta: SHARED_UI_META,
        },
      ],
    })
  );

  // ── Plan Review ────────────────────────────────────────────────

  registerAppResource(
    server,
    "Plan Review",
    PLAN_REVIEW_URI,
    {
      description:
        "Interactive plan review showing the planned section sequence. Supports drag-to-reorder and approve/reject actions for the overall page plan.",
      _meta: SHARED_UI_META,
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: RESOURCE_MIME_TYPE,
          text: PLAN_REVIEW_HTML,
          _meta: SHARED_UI_META,
        },
      ],
    })
  );

  // ── Audit Report ───────────────────────────────────────────────

  registerAppResource(
    server,
    "Audit Report",
    AUDIT_REPORT_URI,
    {
      description:
        "Interactive content audit dashboard showing health score, findings by category/severity, rule breakdown, top offenders, and orphaned assets.",
      _meta: SHARED_UI_META,
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: RESOURCE_MIME_TYPE,
          text: AUDIT_REPORT_HTML,
          _meta: SHARED_UI_META,
        },
      ],
    })
  );
}
