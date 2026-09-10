/**
 * Tests for the auto-generated CSS tokens module.
 *
 * Verifies that the `KDS_GLOBAL_CSS` constant exported from the
 * build-time CSS extraction script contains valid kickstartDS CSS
 * with expected design tokens and component styles.
 *
 * @see src/ui/tokens.generated.ts
 * @see scripts/extract-tokens.js
 */

import { KDS_GLOBAL_CSS } from "../../src/ui/tokens.generated.js";

describe("KDS_GLOBAL_CSS", () => {
  it("is a non-empty string", () => {
    expect(typeof KDS_GLOBAL_CSS).toBe("string");
    expect(KDS_GLOBAL_CSS.length).toBeGreaterThan(1000);
  });

  it("contains CSS custom properties (design tokens)", () => {
    // kickstartDS tokens use the --ks- prefix
    expect(KDS_GLOBAL_CSS).toContain("--ks-");
  });

  it("contains branding tokens", () => {
    expect(KDS_GLOBAL_CSS).toContain("--ks-brand-");
  });

  it("contains component-level selectors", () => {
    // kickstartDS components use data attributes or class selectors
    // Check for at least one well-known component class
    expect(KDS_GLOBAL_CSS).toMatch(/\.(c-|l-|dsa-)/);
  });

  it("does not contain unescaped template literal syntax", () => {
    // The CSS is embedded as a template literal, so backticks must be escaped
    // We test the source string itself — if backticks appeared unescaped,
    // the import would have failed, but let's verify the content is clean
    expect(KDS_GLOBAL_CSS).not.toContain("${");
  });

  it("has reasonable size (> 100KB for global.css)", () => {
    // The full kickstartDS CSS bundle is ~240KB
    expect(KDS_GLOBAL_CSS.length).toBeGreaterThan(100_000);
  });
});
