/**
 * MCP resource definitions for the component-builder server.
 *
 * Exposes static design-system documentation as browsable resources
 * so MCP clients can introspect the component catalog and architecture
 * without invoking tools.
 */

import type {
  Resource,
  ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";

import {
  handleGetUiBuildingInstructions,
  handleGetTokenArchitecture,
  handleListExistingComponents,
} from "./handlers.js";

// ---------------------------------------------------------------------------
// Resource list
// ---------------------------------------------------------------------------

export const resources: Resource[] = [
  {
    uri: "design-system://instructions",
    name: "UI Building Instructions",
    description:
      "Comprehensive instructions for building UI components in the kickstartDS Design System — file structure, patterns, conventions.",
    mimeType: "text/markdown",
  },
  {
    uri: "design-system://token-architecture",
    name: "Token Architecture",
    description:
      "Three-layer design token architecture (branding → semantic → component) with naming conventions and usage examples.",
    mimeType: "text/markdown",
  },
  {
    uri: "design-system://components",
    name: "Component Catalog",
    description:
      "All existing components in the Design System with descriptions, file structure, and client-behavior annotations.",
    mimeType: "text/markdown",
  },
];

// ---------------------------------------------------------------------------
// Resource reader
// ---------------------------------------------------------------------------

/**
 * Read a resource by URI and return its contents.
 *
 * Delegates to the same handler functions used by the corresponding tools,
 * extracting the text content from the CallToolResult.
 */
export function readResource(uri: string): ReadResourceResult {
  switch (uri) {
    case "design-system://instructions": {
      const result = handleGetUiBuildingInstructions();
      const text =
        result.content?.[0]?.type === "text"
          ? (result.content[0] as { type: "text"; text: string }).text
          : "";
      return {
        contents: [{ uri, mimeType: "text/markdown", text }],
      };
    }

    case "design-system://token-architecture": {
      const result = handleGetTokenArchitecture();
      const text =
        result.content?.[0]?.type === "text"
          ? (result.content[0] as { type: "text"; text: string }).text
          : "";
      return {
        contents: [{ uri, mimeType: "text/markdown", text }],
      };
    }

    case "design-system://components": {
      const result = handleListExistingComponents({ includeDetails: true });
      const text =
        result.content?.[0]?.type === "text"
          ? (result.content[0] as { type: "text"; text: string }).text
          : "";
      return {
        contents: [{ uri, mimeType: "text/markdown", text }],
      };
    }

    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
}
