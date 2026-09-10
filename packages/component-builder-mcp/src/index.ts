#!/usr/bin/env node

/**
 * Design System Component Builder — MCP Server
 *
 * Provides instructions and templates for building kickstartDS
 * Design System components via the Model Context Protocol.
 *
 * Transport: stdio (default) or Streamable HTTP (MCP_TRANSPORT=http)
 */

import { createServer } from "node:http";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  verifyToken,
  extractBearerToken,
  isAuthEnabled,
  createOAuthMiddleware,
  wwwAuthenticateHeader,
} from "@kickstartds/shared-auth";
import { tools } from "./tools.js";
import { dispatch } from "./handlers.js";
import { resources, readResource } from "./resources.js";

const SERVER_NAME = "design-system-component-builder";
const SERVER_VERSION = "1.0.0";

// ---------------------------------------------------------------------------
// Server factory
// ---------------------------------------------------------------------------

/**
 * Create a fresh Server instance with all handlers registered.
 *
 * In HTTP mode the SDK requires one Server per transport/session,
 * so we mint a new instance for every request (stateless).
 * In stdio mode a single instance is reused for the lifetime of the process.
 */
function createMcpServer(): Server {
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    },
  );

  // ── Tool handlers ─────────────────────────────────────────────

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return dispatch(name, (args ?? {}) as Record<string, unknown>);
  });

  // ── Resource handlers ─────────────────────────────────────────

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return { resources };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    return readResource(request.params.uri);
  });

  return server;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const transportMode = process.env.MCP_TRANSPORT || "stdio";

  if (transportMode === "http") {
    const PORT = parseInt(process.env.MCP_PORT || "8080", 10);

    const handleOAuth = createOAuthMiddleware({
      serviceName: "Component Builder MCP",
    });

    const httpServer = createServer(async (req, res) => {
      const url = new URL(req.url || "/", `http://${req.headers.host}`);

      // Health check endpoint
      if (url.pathname === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", version: SERVER_VERSION }));
        return;
      }

      // ── OAuth endpoints (authorize, token, registration, metadata) ──
      if (await handleOAuth(req, res)) return;

      // Only handle /mcp path
      if (url.pathname !== "/mcp") {
        res.writeHead(404).end("Not found");
        return;
      }

      // CORS headers for remote clients
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, DELETE, OPTIONS",
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, mcp-session-id, Last-Event-ID, mcp-protocol-version",
      );
      res.setHeader(
        "Access-Control-Expose-Headers",
        "mcp-session-id, mcp-protocol-version",
      );

      if (req.method === "OPTIONS") {
        res.writeHead(204).end();
        return;
      }

      // ── Auth guard ──────────────────────────────────────
      if (isAuthEnabled()) {
        const token = extractBearerToken(req);
        const user = token ? verifyToken(token) : null;
        if (!user) {
          res.writeHead(401, {
            "Content-Type": "application/json",
            "WWW-Authenticate": wwwAuthenticateHeader(req),
          });
          res.end(
            JSON.stringify({
              jsonrpc: "2.0",
              error: { code: -32001, message: "Unauthorized" },
              id: null,
            }),
          );
          return;
        }
        console.error(`Authenticated: ${user.sub} (role: ${user.role})`);
      }

      try {
        // Parse request body for POST
        let body: unknown;
        if (req.method === "POST") {
          const chunks: Uint8Array[] = [];
          for await (const chunk of req) {
            chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
          }
          body = JSON.parse(Buffer.concat(chunks).toString());
        }

        // Stateless: fresh server + transport per request
        const mcpServer = createMcpServer();
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined as unknown as () => string,
        });

        await mcpServer.connect(transport);
        await transport.handleRequest(req, res, body);

        // Clean up after response
        res.on("finish", () => {
          mcpServer.close().catch(() => {});
          transport.close().catch(() => {});
        });
      } catch (error) {
        console.error("Error handling MCP request:", error);
        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              jsonrpc: "2.0",
              error: { code: -32603, message: "Internal server error" },
              id: null,
            }),
          );
        }
      }
    });

    httpServer.listen(PORT, () => {
      console.error(
        `Component Builder MCP Server (Streamable HTTP, stateless) listening on port ${PORT}`,
      );
      console.error(`  Endpoint:     http://0.0.0.0:${PORT}/mcp`);
      console.error(`  Health check: http://0.0.0.0:${PORT}/health`);
      if (!isAuthEnabled()) {
        console.error(
          "⚠ MCP_JWT_SECRET not set — authentication disabled. All requests are unauthenticated.",
        );
      }
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      console.error("Shutting down...");
      httpServer.close();
      process.exit(0);
    });
  } else {
    // Default: stdio transport for local usage
    const mcpServer = createMcpServer();
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    console.error(
      "Design System Component Builder MCP server running on stdio",
    );
  }
}

main().catch(console.error);
