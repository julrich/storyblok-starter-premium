/**
 * Tests for ext-apps app-only tool registration.
 *
 * Verifies that `registerAppOnlyTools` registers all 7 app-only tools
 * with correct names, schemas, and response formats.
 *
 * @see src/ui/app-tools.ts
 */

import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// Track calls to registerAppTool
const mockRegisterAppTool = jest.fn();

jest.unstable_mockModule("@modelcontextprotocol/ext-apps/server", () => ({
  registerAppTool: mockRegisterAppTool,
  registerAppResource: jest.fn(),
  getUiCapability: jest.fn(),
  EXTENSION_ID: "io.modelcontextprotocol/ui",
  RESOURCE_MIME_TYPE: "text/html;profile=mcp-app",
}));

// Dynamic import AFTER mock setup
const { registerAppOnlyTools } = await import("../../src/ui/app-tools.js");

describe("registerAppOnlyTools", () => {
  beforeEach(() => {
    mockRegisterAppTool.mockClear();
  });

  it("registers exactly 7 app-only tools", () => {
    const mockServer = {} as any;
    registerAppOnlyTools(mockServer);
    expect(mockRegisterAppTool).toHaveBeenCalledTimes(7);
  });

  it("registers the expected tool names", () => {
    const mockServer = {} as any;
    registerAppOnlyTools(mockServer);

    const toolNames = mockRegisterAppTool.mock.calls.map(
      (call: any[]) => call[1]
    );
    expect(toolNames).toContain("approve_section");
    expect(toolNames).toContain("reject_section");
    expect(toolNames).toContain("modify_section");
    expect(toolNames).toContain("approve_plan");
    expect(toolNames).toContain("remove_section");
    expect(toolNames).toContain("move_section");
    expect(toolNames).toContain("save_page");
  });

  it("passes the McpServer instance to each registration", () => {
    const mockServer = { name: "test-server" } as any;
    registerAppOnlyTools(mockServer);

    mockRegisterAppTool.mock.calls.forEach((call: any[]) => {
      expect(call[0]).toBe(mockServer);
    });
  });

  it("each tool has a title and description", () => {
    const mockServer = {} as any;
    registerAppOnlyTools(mockServer);

    mockRegisterAppTool.mock.calls.forEach((call: any[]) => {
      const options = call[2]; // 3rd argument is the options object
      expect(options).toHaveProperty("title");
      expect(options).toHaveProperty("description");
      expect(typeof options.title).toBe("string");
      expect(typeof options.description).toBe("string");
    });
  });

  it("each tool has app visibility meta", () => {
    const mockServer = {} as any;
    registerAppOnlyTools(mockServer);

    mockRegisterAppTool.mock.calls.forEach((call: any[]) => {
      const options = call[2];
      expect(options._meta?.ui?.visibility).toEqual(["app"]);
    });
  });

  describe("tool handlers", () => {
    it("approve_section returns approved action with section data", async () => {
      const mockServer = {} as any;
      registerAppOnlyTools(mockServer);

      const approveCall = mockRegisterAppTool.mock.calls.find(
        (call: any[]) => call[1] === "approve_section"
      );
      const handler = approveCall![approveCall!.length - 1];
      const section = { component: "hero", headline: "Test" };
      const result = await handler({ section });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.action).toBe("approved");
      expect(parsed.section).toEqual(section);
    });

    it("reject_section returns rejected action with reason", async () => {
      const mockServer = {} as any;
      registerAppOnlyTools(mockServer);

      const rejectCall = mockRegisterAppTool.mock.calls.find(
        (call: any[]) => call[1] === "reject_section"
      );
      const handler = rejectCall![rejectCall!.length - 1];
      const result = await handler({ reason: "Too generic" });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.action).toBe("rejected");
      expect(parsed.reason).toBe("Too generic");
    });

    it("reject_section uses default reason when none provided", async () => {
      const mockServer = {} as any;
      registerAppOnlyTools(mockServer);

      const rejectCall = mockRegisterAppTool.mock.calls.find(
        (call: any[]) => call[1] === "reject_section"
      );
      const handler = rejectCall![rejectCall!.length - 1];
      const result = await handler({});

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.action).toBe("rejected");
      expect(typeof parsed.reason).toBe("string");
    });

    it("modify_section returns modify action with section data", async () => {
      const mockServer = {} as any;
      registerAppOnlyTools(mockServer);

      const modifyCall = mockRegisterAppTool.mock.calls.find(
        (call: any[]) => call[1] === "modify_section"
      );
      const handler = modifyCall![modifyCall!.length - 1];
      const section = { component: "faq" };
      const result = await handler({ section });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.action).toBe("modify");
      expect(parsed.section).toEqual(section);
    });

    it("approve_plan returns plan_approved with order", async () => {
      const mockServer = {} as any;
      registerAppOnlyTools(mockServer);

      const approveCall = mockRegisterAppTool.mock.calls.find(
        (call: any[]) => call[1] === "approve_plan"
      );
      const handler = approveCall![approveCall!.length - 1];
      const order = ["hero", "features", "cta"];
      const result = await handler({ order });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.action).toBe("plan_approved");
      expect(parsed.order).toEqual(order);
    });

    it("remove_section returns section_removed with index", async () => {
      const mockServer = {} as any;
      registerAppOnlyTools(mockServer);

      const removeCall = mockRegisterAppTool.mock.calls.find(
        (call: any[]) => call[1] === "remove_section"
      );
      const handler = removeCall![removeCall!.length - 1];
      const result = await handler({ index: 2, sectionId: "abc" });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.action).toBe("section_removed");
      expect(parsed.index).toBe(2);
    });

    it("move_section returns section_moved with fromIndex/toIndex", async () => {
      const mockServer = {} as any;
      registerAppOnlyTools(mockServer);

      const moveCall = mockRegisterAppTool.mock.calls.find(
        (call: any[]) => call[1] === "move_section"
      );
      const handler = moveCall![moveCall!.length - 1];
      const result = await handler({ fromIndex: 0, toIndex: 2 });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.action).toBe("section_moved");
      expect(parsed.fromIndex).toBe(0);
      expect(parsed.toIndex).toBe(2);
    });

    it("save_page returns save_page action with sections", async () => {
      const mockServer = {} as any;
      registerAppOnlyTools(mockServer);

      const saveCall = mockRegisterAppTool.mock.calls.find(
        (call: any[]) => call[1] === "save_page"
      );
      const handler = saveCall![saveCall!.length - 1];
      const sections = [{ component: "hero" }, { component: "faq" }];
      const result = await handler({
        mode: "create",
        sections,
        name: "Test",
        slug: "test",
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.action).toBe("save_page");
      expect(parsed.sections).toEqual(sections);
      expect(parsed.mode).toBe("create");
    });
  });
});
