/**
 * Tests for ext-apps UI resource registration.
 *
 * Verifies that `registerUiResources` correctly registers all four
 * preview resources via the ext-apps SDK's `registerAppResource`.
 * - Section Preview (stateless single-section approve/reject/modify)
 * - Page Builder (final assembly view with reorder/remove/save)
 * - Plan Review (section sequence planner with drag-to-reorder)
 * - Audit Report (interactive content audit dashboard)
 *
 * @see src/ui/resources.ts
 */

import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// Track calls to registerAppResource
const mockRegisterAppResource = jest.fn();

jest.unstable_mockModule("@modelcontextprotocol/ext-apps/server", () => ({
  registerAppResource: mockRegisterAppResource,
  registerAppTool: jest.fn(),
  getUiCapability: jest.fn(),
  EXTENSION_ID: "io.modelcontextprotocol/ui",
  RESOURCE_MIME_TYPE: "text/html;profile=mcp-app",
}));

// Dynamic import AFTER mock setup
const { registerUiResources } = await import("../../src/ui/resources.js");

describe("registerUiResources", () => {
  beforeEach(() => {
    mockRegisterAppResource.mockClear();
  });

  it("registers exactly 4 resources", () => {
    const mockServer = {} as any;
    registerUiResources(mockServer);
    expect(mockRegisterAppResource).toHaveBeenCalledTimes(4);
  });

  it("registers section preview resource", () => {
    const mockServer = {} as any;
    registerUiResources(mockServer);

    const calls = mockRegisterAppResource.mock.calls;
    const sectionCall = calls.find(
      (call: any[]) => call[1] === "Section Preview"
    );
    expect(sectionCall).toBeDefined();
    expect(sectionCall![2]).toBe("ui://kds/section-preview");
  });

  it("registers page builder resource", () => {
    const mockServer = {} as any;
    registerUiResources(mockServer);

    const calls = mockRegisterAppResource.mock.calls;
    const pageCall = calls.find((call: any[]) => call[1] === "Page Builder");
    expect(pageCall).toBeDefined();
    expect(pageCall![2]).toBe("ui://kds/page-builder");
  });

  it("registers plan review resource", () => {
    const mockServer = {} as any;
    registerUiResources(mockServer);

    const calls = mockRegisterAppResource.mock.calls;
    const planCall = calls.find((call: any[]) => call[1] === "Plan Review");
    expect(planCall).toBeDefined();
    expect(planCall![2]).toBe("ui://kds/plan-review");
  });

  it("registers audit report resource", () => {
    const mockServer = {} as any;
    registerUiResources(mockServer);

    const calls = mockRegisterAppResource.mock.calls;
    const auditCall = calls.find((call: any[]) => call[1] === "Audit Report");
    expect(auditCall).toBeDefined();
    expect(auditCall![2]).toBe("ui://kds/audit-report");
  });

  it("passes the McpServer instance to each registration", () => {
    const mockServer = { name: "test-server" } as any;
    registerUiResources(mockServer);

    mockRegisterAppResource.mock.calls.forEach((call: any[]) => {
      expect(call[0]).toBe(mockServer);
    });
  });

  it("provides an async handler that returns contents array", async () => {
    const mockServer = {} as any;
    registerUiResources(mockServer);

    // Each call's last argument is the handler function
    for (const call of mockRegisterAppResource.mock.calls) {
      const handler = call[call.length - 1];
      expect(typeof handler).toBe("function");

      const result = await handler(new URL("ui://kds/test"));
      expect(result).toHaveProperty("contents");
      expect(Array.isArray(result.contents)).toBe(true);
      expect(result.contents[0]).toHaveProperty("uri");
      expect(result.contents[0]).toHaveProperty("text");
      expect(typeof result.contents[0].text).toBe("string");
    }
  });
});
