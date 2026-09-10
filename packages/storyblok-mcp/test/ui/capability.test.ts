/**
 * Tests for the ext-apps capability detection module.
 *
 * Tests all three detection layers:
 * 1. SDK helper (getUiCapability checks extensions)
 * 2. experimental fallback
 * 3. Raw transport intercept (installCapabilityInterceptor)
 *
 * @see src/ui/capability.ts
 */

import { jest } from "@jest/globals";

// Mock the ext-apps server module so we control getUiCapability's return
const mockGetUiCapability = jest.fn();
jest.unstable_mockModule("@modelcontextprotocol/ext-apps/server", () => ({
  getUiCapability: mockGetUiCapability,
  RESOURCE_MIME_TYPE: "text/html;profile=mcp-app",
  EXTENSION_ID: "io.modelcontextprotocol/ui",
}));

// Dynamic imports must come AFTER jest.unstable_mockModule
const {
  clientSupportsExtApps,
  installCapabilityInterceptor,
  SECTION_PREVIEW_URI,
  PAGE_BUILDER_URI,
  PLAN_REVIEW_URI,
  UI_URI_PREFIX,
} = await import("../../src/ui/capability.js");

// ── URI constants ──────────────────────────────────────────────────

describe("UI URI constants", () => {
  it("uses the correct URI prefix", () => {
    expect(UI_URI_PREFIX).toBe("ui://kds");
  });

  it("has correct section preview URI", () => {
    expect(SECTION_PREVIEW_URI).toBe("ui://kds/section-preview");
  });

  it("has correct page builder URI", () => {
    expect(PAGE_BUILDER_URI).toBe("ui://kds/page-builder");
  });

  it("has correct plan review URI", () => {
    expect(PLAN_REVIEW_URI).toBe("ui://kds/plan-review");
  });

  it("all preview URIs start with the prefix", () => {
    expect(SECTION_PREVIEW_URI).toMatch(/^ui:\/\/kds\//);
    expect(PAGE_BUILDER_URI).toMatch(/^ui:\/\/kds\//);
    expect(PLAN_REVIEW_URI).toMatch(/^ui:\/\/kds\//);
  });
});

// ── Layer 1: SDK helper (getUiCapability) ──────────────────────────

describe("clientSupportsExtApps — Layer 1: SDK helper", () => {
  beforeEach(() => {
    mockGetUiCapability.mockReset();
  });

  it("returns false when getUiCapability returns undefined", () => {
    mockGetUiCapability.mockReturnValue(undefined);
    const mockServer = {
      getClientCapabilities: () => ({}),
    } as any;

    expect(clientSupportsExtApps(mockServer)).toBe(false);
  });

  it("returns false when getUiCapability returns empty object", () => {
    mockGetUiCapability.mockReturnValue({});
    const mockServer = {
      getClientCapabilities: () => ({}),
    } as any;

    expect(clientSupportsExtApps(mockServer)).toBe(false);
  });

  it("returns true when getUiCapability returns matching MIME type", () => {
    mockGetUiCapability.mockReturnValue({
      mimeTypes: ["text/html;profile=mcp-app"],
    });
    const mockServer = {
      getClientCapabilities: () => ({ experimental: {} }),
    } as any;

    expect(clientSupportsExtApps(mockServer)).toBe(true);
  });

  it("returns false when MIME types list does not include ext-apps type", () => {
    mockGetUiCapability.mockReturnValue({
      mimeTypes: ["text/plain"],
    });
    const mockServer = {
      getClientCapabilities: () => ({ experimental: {} }),
    } as any;

    expect(clientSupportsExtApps(mockServer)).toBe(false);
  });

  it("returns false when mimeTypes is empty array", () => {
    mockGetUiCapability.mockReturnValue({
      mimeTypes: [],
    });
    const mockServer = {
      getClientCapabilities: () => ({}),
    } as any;

    expect(clientSupportsExtApps(mockServer)).toBe(false);
  });
});

// ── Layer 2: experimental fallback ─────────────────────────────────

describe("clientSupportsExtApps — Layer 2: experimental fallback", () => {
  beforeEach(() => {
    mockGetUiCapability.mockReset();
    // Layer 1 returns nothing — force fallback to layer 2
    mockGetUiCapability.mockReturnValue(undefined);
  });

  it("returns true when experimental contains ext-apps MIME type", () => {
    const mockServer = {
      getClientCapabilities: () => ({
        experimental: {
          "io.modelcontextprotocol/ui": {
            mimeTypes: ["text/html;profile=mcp-app"],
          },
        },
      }),
    } as any;

    expect(clientSupportsExtApps(mockServer)).toBe(true);
  });

  it("returns false when experimental has wrong MIME type", () => {
    const mockServer = {
      getClientCapabilities: () => ({
        experimental: {
          "io.modelcontextprotocol/ui": {
            mimeTypes: ["text/plain"],
          },
        },
      }),
    } as any;

    expect(clientSupportsExtApps(mockServer)).toBe(false);
  });

  it("returns false when experimental has wrong extension key", () => {
    const mockServer = {
      getClientCapabilities: () => ({
        experimental: {
          "some.other.extension": {
            mimeTypes: ["text/html;profile=mcp-app"],
          },
        },
      }),
    } as any;

    expect(clientSupportsExtApps(mockServer)).toBe(false);
  });

  it("returns false when experimental is empty", () => {
    const mockServer = {
      getClientCapabilities: () => ({
        experimental: {},
      }),
    } as any;

    expect(clientSupportsExtApps(mockServer)).toBe(false);
  });

  it("returns false when experimental is undefined", () => {
    const mockServer = {
      getClientCapabilities: () => ({}),
    } as any;

    expect(clientSupportsExtApps(mockServer)).toBe(false);
  });
});

// ── Layer 3: raw transport intercept ───────────────────────────────

describe("clientSupportsExtApps — Layer 3: raw transport intercept", () => {
  beforeEach(() => {
    mockGetUiCapability.mockReset();
    // Layers 1 & 2 return nothing — force fallback to layer 3
    mockGetUiCapability.mockReturnValue(undefined);
  });

  it("returns true after interceptor captures extensions from initialize", () => {
    const mockServer = {
      getClientCapabilities: () => ({}), // Zod stripped extensions
    } as any;

    // Simulate transport with onmessage handler set by SDK
    let sdkHandlerCalled = false;
    const mockTransport = {
      onmessage: (_msg: any) => {
        sdkHandlerCalled = true;
      },
    } as any;

    // Install interceptor
    installCapabilityInterceptor(mockServer, mockTransport);

    // Simulate raw initialize message arriving with extensions
    mockTransport.onmessage({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {
          extensions: {
            "io.modelcontextprotocol/ui": {
              mimeTypes: ["text/html;profile=mcp-app"],
            },
          },
        },
        clientInfo: { name: "test-client", version: "1.0.0" },
      },
    });

    // SDK handler should still be called
    expect(sdkHandlerCalled).toBe(true);

    // Now clientSupportsExtApps should return true
    expect(clientSupportsExtApps(mockServer)).toBe(true);
  });

  it("forwards messages to SDK handler unchanged", () => {
    const mockServer = {} as any;
    const receivedMessages: any[] = [];
    const mockTransport = {
      onmessage: (msg: any) => {
        receivedMessages.push(msg);
      },
    } as any;

    installCapabilityInterceptor(mockServer, mockTransport);

    const initMsg = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {
          extensions: {
            "io.modelcontextprotocol/ui": {
              mimeTypes: ["text/html;profile=mcp-app"],
            },
          },
        },
      },
    };

    mockTransport.onmessage(initMsg);

    expect(receivedMessages).toHaveLength(1);
    expect(receivedMessages[0]).toBe(initMsg);
  });

  it("handles non-initialize messages without error", () => {
    const mockServer = {
      getClientCapabilities: () => ({}),
    } as any;
    const mockTransport = { onmessage: jest.fn() } as any;

    installCapabilityInterceptor(mockServer, mockTransport);

    // Send a tools/call message — should not throw
    mockTransport.onmessage({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "test" },
    });

    // Should still return false (no initialize seen)
    expect(clientSupportsExtApps(mockServer)).toBe(false);
  });

  it("handles initialize without extensions gracefully", () => {
    const mockServer = {
      getClientCapabilities: () => ({}),
    } as any;
    const mockTransport = { onmessage: jest.fn() } as any;

    installCapabilityInterceptor(mockServer, mockTransport);

    mockTransport.onmessage({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {
          roots: { listChanged: true },
        },
      },
    });

    expect(clientSupportsExtApps(mockServer)).toBe(false);
  });

  it("handles null onmessage gracefully", () => {
    const mockServer = {} as any;
    const mockTransport = { onmessage: null } as any;

    installCapabilityInterceptor(mockServer, mockTransport);

    // Should not throw when calling the wrapped handler
    mockTransport.onmessage({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {
          extensions: {
            "io.modelcontextprotocol/ui": {
              mimeTypes: ["text/html;profile=mcp-app"],
            },
          },
        },
      },
    });
  });
});

// ── Error handling ─────────────────────────────────────────────────

describe("clientSupportsExtApps — error handling", () => {
  beforeEach(() => {
    mockGetUiCapability.mockReset();
  });

  it("returns false when getClientCapabilities throws", () => {
    const mockServer = {
      getClientCapabilities: () => {
        throw new Error("Not initialized");
      },
    } as any;

    expect(clientSupportsExtApps(mockServer)).toBe(false);
  });

  it("returns false when getClientCapabilities returns undefined", () => {
    mockGetUiCapability.mockReturnValue(undefined);
    const mockServer = {
      getClientCapabilities: () => undefined,
    } as any;

    expect(clientSupportsExtApps(mockServer)).toBe(false);
  });
});

// ── Layer priority ─────────────────────────────────────────────────

describe("clientSupportsExtApps — layer priority", () => {
  beforeEach(() => {
    mockGetUiCapability.mockReset();
  });

  it("prefers Layer 1 (SDK helper) when available", () => {
    // Layer 1 returns true
    mockGetUiCapability.mockReturnValue({
      mimeTypes: ["text/html;profile=mcp-app"],
    });

    const mockServer = {
      getClientCapabilities: () => ({
        // Layer 2 also has it
        experimental: {
          "io.modelcontextprotocol/ui": {
            mimeTypes: ["text/html;profile=mcp-app"],
          },
        },
      }),
    } as any;

    expect(clientSupportsExtApps(mockServer)).toBe(true);
    // getUiCapability was called (Layer 1 was checked)
    expect(mockGetUiCapability).toHaveBeenCalled();
  });

  it("falls through to Layer 2 when Layer 1 returns nothing", () => {
    mockGetUiCapability.mockReturnValue(undefined);

    const mockServer = {
      getClientCapabilities: () => ({
        experimental: {
          "io.modelcontextprotocol/ui": {
            mimeTypes: ["text/html;profile=mcp-app"],
          },
        },
      }),
    } as any;

    expect(clientSupportsExtApps(mockServer)).toBe(true);
  });

  it("falls through all layers and returns false when none match", () => {
    mockGetUiCapability.mockReturnValue(undefined);

    const mockServer = {
      getClientCapabilities: () => ({
        experimental: {},
      }),
    } as any;

    expect(clientSupportsExtApps(mockServer)).toBe(false);
  });
});
