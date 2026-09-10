/**
 * Tests for the ext-apps HTML preview templates.
 *
 * Verifies that each template is well-formed HTML containing the
 * required elements: DOCTYPE, ext-apps SDK, action buttons, correct
 * callback names, and the kickstartDS CSS tokens.
 *
 * @see src/ui/templates.ts
 */

import {
  SECTION_PREVIEW_HTML,
  PAGE_BUILDER_HTML,
  PLAN_REVIEW_HTML,
} from "../../src/ui/templates.js";

// ── Shared structure ───────────────────────────────────────────────

describe.each([
  ["SECTION_PREVIEW_HTML", SECTION_PREVIEW_HTML],
  ["PAGE_BUILDER_HTML", PAGE_BUILDER_HTML],
  ["PLAN_REVIEW_HTML", PLAN_REVIEW_HTML],
])("%s — common structure", (_name, html) => {
  it("is a non-empty string", () => {
    expect(typeof html).toBe("string");
    expect(html.length).toBeGreaterThan(100);
  });

  it("starts with <!DOCTYPE html>", () => {
    expect(html.trimStart()).toMatch(/^<!DOCTYPE html>/i);
  });

  it("has <html> with lang attribute", () => {
    expect(html).toMatch(/<html\s+lang="en">/);
  });

  it("includes charset meta tag", () => {
    expect(html).toContain('<meta charset="utf-8"');
  });

  it("includes viewport meta tag", () => {
    expect(html).toContain("viewport");
  });

  it("loads the ext-apps SDK via ESM script", () => {
    expect(html).toContain("@modelcontextprotocol/ext-apps");
    expect(html).toContain('type="module"');
    expect(html).toContain("app-with-deps.js");
  });

  it("calls app.connect()", () => {
    expect(html).toContain("app.connect()");
  });

  it("uses lowercase ontoolresult callback", () => {
    expect(html).toContain("app.ontoolresult");
    // Ensure the old PascalCase form is NOT present
    expect(html).not.toContain("app.onToolResult");
  });

  it("has ontoolinput handler for pre-result notification", () => {
    expect(html).toContain("app.ontoolinput");
    expect(html).not.toContain("app.onToolInput =");
  });

  it("has ontoolcancelled handler", () => {
    expect(html).toContain("app.ontoolcancelled");
  });

  it("has onteardown handler", () => {
    expect(html).toContain("app.onteardown");
  });

  it("imports applyDocumentTheme from ext-apps SDK", () => {
    expect(html).toContain("applyDocumentTheme");
  });

  it("imports applyHostStyleVariables from ext-apps SDK", () => {
    expect(html).toContain("applyHostStyleVariables");
  });

  it("imports applyHostFonts from ext-apps SDK", () => {
    expect(html).toContain("applyHostFonts");
  });

  it("applies initial host styles after connect()", () => {
    expect(html).toContain("app.getHostContext()");
    expect(html).toContain("applyHostStyles");
  });

  it("uses callServerTool not callTool for server tools", () => {
    expect(html).toContain("app.callServerTool(");
    expect(html).not.toContain("app.callTool(");
  });

  it("extracts structuredContent from result", () => {
    expect(html).toContain("structuredContent");
  });

  it("contains a preview container div", () => {
    expect(html).toContain('id="preview-container"');
  });

  it("includes the kickstartDS global CSS tokens", () => {
    // The KDS_GLOBAL_CSS is inlined in the <style> block
    expect(html).toContain("--ks-");
  });

  it("includes theme bridge CSS", () => {
    expect(html).toContain("kds-preview");
  });
});

// ── Section Preview specifics ──────────────────────────────────────

describe("SECTION_PREVIEW_HTML — section-specific", () => {
  it("has approve, modify, and reject buttons", () => {
    expect(SECTION_PREVIEW_HTML).toContain('id="btn-approve"');
    expect(SECTION_PREVIEW_HTML).toContain('id="btn-modify"');
    expect(SECTION_PREVIEW_HTML).toContain('id="btn-reject"');
  });

  it("calls approve_section tool on approve", () => {
    expect(SECTION_PREVIEW_HTML).toContain('"approve_section"');
  });

  it("calls modify_section tool on modify", () => {
    expect(SECTION_PREVIEW_HTML).toContain('"modify_section"');
  });

  it("calls reject_section tool on reject", () => {
    expect(SECTION_PREVIEW_HTML).toContain('"reject_section"');
  });

  it("uses lowercase ontoolinputpartial for streaming", () => {
    expect(SECTION_PREVIEW_HTML).toContain("app.ontoolinputpartial");
    expect(SECTION_PREVIEW_HTML).not.toContain("app.onToolInputPartial");
  });

  it("reads componentType from partial arguments", () => {
    expect(SECTION_PREVIEW_HTML).toContain("args?.componentType");
  });

  it("renders renderedHtml from structuredContent", () => {
    expect(SECTION_PREVIEW_HTML).toContain("renderedHtml");
  });

  it("has the correct title", () => {
    expect(SECTION_PREVIEW_HTML).toContain("<title>Section Preview</title>");
  });

  it("creates App with section-preview name", () => {
    expect(SECTION_PREVIEW_HTML).toContain("kds-section-preview");
  });

  it("has onhostcontextchanged handler for dynamic theming", () => {
    expect(SECTION_PREVIEW_HTML).toContain("app.onhostcontextchanged");
  });
});

// ── Page Builder specifics ─────────────────────────────────────────

describe("PAGE_BUILDER_HTML — builder-specific", () => {
  it("has save and fullscreen buttons (no approve/modify/reject)", () => {
    expect(PAGE_BUILDER_HTML).toContain('id="btn-save"');
    expect(PAGE_BUILDER_HTML).toContain('id="btn-fullscreen"');
    // Page builder does NOT have approve/modify/reject — those are on section preview
    expect(PAGE_BUILDER_HTML).not.toContain('id="btn-approve"');
    expect(PAGE_BUILDER_HTML).not.toContain('id="btn-modify"');
    expect(PAGE_BUILDER_HTML).not.toContain('id="btn-reject"');
  });

  it("creates App with fullscreen in availableDisplayModes", () => {
    expect(PAGE_BUILDER_HTML).toContain("availableDisplayModes");
    expect(PAGE_BUILDER_HTML).toContain('"fullscreen"');
  });

  it("uses requestDisplayMode (not setDisplayMode)", () => {
    expect(PAGE_BUILDER_HTML).toContain("app.requestDisplayMode");
    expect(PAGE_BUILDER_HTML).not.toContain("app.setDisplayMode");
  });

  it("passes mode object to requestDisplayMode", () => {
    expect(PAGE_BUILDER_HTML).toContain("requestDisplayMode({ mode:");
  });

  it("has onhostcontextchanged handler", () => {
    expect(PAGE_BUILDER_HTML).toContain("app.onhostcontextchanged");
    expect(PAGE_BUILDER_HTML).not.toContain("app.onHostContextChanged");
  });

  it("renders multiple sections with badges", () => {
    expect(PAGE_BUILDER_HTML).toContain("kds-section-badge");
    expect(PAGE_BUILDER_HTML).toContain("renderedSections");
  });

  it("has the correct title", () => {
    expect(PAGE_BUILDER_HTML).toContain("<title>Page Builder</title>");
  });

  it("creates App with page-builder name", () => {
    expect(PAGE_BUILDER_HTML).toContain("kds-page-builder");
  });

  it("toggles fullscreen class on body", () => {
    expect(PAGE_BUILDER_HTML).toContain("classList.toggle");
    expect(PAGE_BUILDER_HTML).toContain('"fullscreen"');
  });

  it("calls save_page tool on save", () => {
    expect(PAGE_BUILDER_HTML).toContain('"save_page"');
  });

  it("calls remove_section tool for section removal", () => {
    expect(PAGE_BUILDER_HTML).toContain('"remove_section"');
  });

  it("calls move_section tool for section reorder", () => {
    expect(PAGE_BUILDER_HTML).toContain('"move_section"');
  });
});

// ── Plan Review specifics ──────────────────────────────────────────

describe("PLAN_REVIEW_HTML — plan-specific", () => {
  it("has approve and reject buttons (no modify)", () => {
    expect(PLAN_REVIEW_HTML).toContain('id="btn-approve"');
    expect(PLAN_REVIEW_HTML).toContain('id="btn-reject"');
    // Plan review uses approve_plan, not modify_section
    expect(PLAN_REVIEW_HTML).not.toContain('id="btn-modify"');
  });

  it("calls approve_plan tool on approve", () => {
    expect(PLAN_REVIEW_HTML).toContain('"approve_plan"');
  });

  it("supports drag-and-drop reorder", () => {
    expect(PLAN_REVIEW_HTML).toContain('draggable="true"');
    expect(PLAN_REVIEW_HTML).toContain("dragstart");
    expect(PLAN_REVIEW_HTML).toContain("dragend");
    expect(PLAN_REVIEW_HTML).toContain("dragover");
  });

  it("renders plan items as an ordered list", () => {
    expect(PLAN_REVIEW_HTML).toContain("kds-plan-list");
    expect(PLAN_REVIEW_HTML).toContain("kds-plan-item");
  });

  it("has the correct title", () => {
    expect(PLAN_REVIEW_HTML).toContain("<title>Plan Review</title>");
  });

  it("creates App with plan-review name", () => {
    expect(PLAN_REVIEW_HTML).toContain("kds-plan-review");
  });

  it("extracts plan from structuredContent", () => {
    expect(PLAN_REVIEW_HTML).toContain("structuredContent");
    expect(PLAN_REVIEW_HTML).toContain("sc?.plan");
  });
});
