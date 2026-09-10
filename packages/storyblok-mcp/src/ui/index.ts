/**
 * MCP Apps (ext-apps) integration — barrel export.
 *
 * Provides interactive UI previews via `ui://` resources, app-only tools,
 * and capability negotiation for the Storyblok MCP server.
 *
 * @see PRD Phase 4 — Interactive UI Previews
 */

export {
  clientSupportsExtApps,
  installCapabilityInterceptor,
  SECTION_PREVIEW_URI,
  PAGE_BUILDER_URI,
  PLAN_REVIEW_URI,
  AUDIT_REPORT_URI,
  RESOURCE_MIME_TYPE,
} from "./capability.js";

export { registerUiResources } from "./resources.js";

export { registerAppOnlyTools } from "./app-tools.js";

export { THEME_BRIDGE_CSS, PREVIEW_CHROME_CSS } from "./theme-bridge.js";

export { KDS_GLOBAL_CSS } from "./tokens.generated.js";

export { KDS_COMPONENT_CSS } from "./components-css.generated.js";

export {
  SECTION_PREVIEW_HTML,
  PAGE_BUILDER_HTML,
  PLAN_REVIEW_HTML,
} from "./templates.js";

export { AUDIT_REPORT_HTML } from "./audit-report-template.js";

export {
  renderComponentToHtml,
  renderSectionToHtml,
  renderPageSectionsToHtml,
  getSupportedComponentTypes,
} from "./render.js";
