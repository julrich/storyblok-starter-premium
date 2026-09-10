/**
 * Prompt registrations for the Storyblok MCP server.
 *
 * Prompts are registered on the underlying Server (not McpServer) because
 * McpServer.registerPrompt() requires Zod-based argsSchema, while our
 * prompt definitions use the MCP PromptArgument format ({name, description,
 * required}).
 *
 * This module sets up ListPromptsRequestSchema + GetPromptRequestSchema
 * handlers on server.server.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { PROMPT_DEFINITIONS, getPromptMessages } from "./prompts.js";

// ── Registration ───────────────────────────────────────────────────

/**
 * Register all prompts on the McpServer's underlying Server.
 */
export function registerPrompts(server: McpServer): void {
  const lowLevel = server.server;

  // Register the prompts capability (listChanged enables dynamic prompt notifications)
  lowLevel.registerCapabilities({ prompts: { listChanged: true } });

  // Handle prompt listing
  lowLevel.setRequestHandler(ListPromptsRequestSchema, async () => {
    return { prompts: PROMPT_DEFINITIONS };
  });

  // Handle prompt retrieval
  lowLevel.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: promptArgs } = request.params;
    const definition = PROMPT_DEFINITIONS.find((p) => p.name === name);
    if (!definition) {
      throw new Error(`Unknown prompt: ${name}`);
    }

    // Validate required arguments
    for (const arg of definition.arguments) {
      if (arg.required && (!promptArgs || !promptArgs[arg.name])) {
        throw new Error(
          `Missing required argument '${arg.name}' for prompt '${name}'`
        );
      }
    }

    const messages = getPromptMessages(name, promptArgs || {});
    return {
      description: definition.description,
      messages,
    };
  });
}
