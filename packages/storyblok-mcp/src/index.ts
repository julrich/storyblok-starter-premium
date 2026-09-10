#!/usr/bin/env node

import { createServer } from "node:http";
import { readFileSync, readdirSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import {
  verifyToken,
  extractBearerToken,
  isAuthEnabled,
  createOAuthMiddleware,
  wwwAuthenticateHeader,
} from "@kickstartds/shared-auth";
import { loadConfig } from "./config.js";
import {
  StoryblokService,
  ContentGenerationService,
  analyzeContentPatterns,
  PAGE_VALIDATION_RULES,
  registry,
  type ContentPatternAnalysis,
} from "./services.js";

import { registerTools, type ToolRegistrationDeps } from "./register-tools.js";
import {
  registerResources,
  type Skill,
  type ResourceRegistrationDeps,
} from "./register-resources.js";
import { registerPrompts } from "./register-prompts.js";
import { installCapabilityInterceptor } from "./ui/capability.js";

/**
 * MCP Server for Storyblok CMS integration
 *
 * Provides tools for:
 * - AI content generation
 * - Story management (CRUD)
 * - Component introspection
 * - Asset management
 * - Content search
 */

// ── Skill loader ───────────────────────────────────────────────────

function loadSkills(): Skill[] {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  // In Docker / production: skills/ sits next to dist/ → ../skills/
  // In local dev (from dist/): monorepo root docs/skills/ → ../../../docs/skills/
  const candidates = [
    join(__dirname, "..", "skills"),
    join(__dirname, "..", "..", "..", "docs", "skills"),
  ];

  const skillsDir = candidates.find((dir) => {
    try {
      readdirSync(dir);
      return true;
    } catch {
      return false;
    }
  });

  if (!skillsDir) {
    console.error(
      `Skills directory not found (searched: ${candidates.join(
        ", ",
      )}), skipping skill loading`,
    );
    return [];
  }

  try {
    const files = readdirSync(skillsDir).filter((f) => f.endsWith(".md"));
    return files.map((file) => {
      const content = readFileSync(join(skillsDir, file), "utf-8");
      const id = basename(file, ".md");
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : id;
      const descMatch = content.match(/^##\s+Wann verwenden\n\n(.+?)$/m);
      const description = descMatch ? descMatch[1] : `Workflow guide: ${title}`;
      return { id, name: title, description, content };
    });
  } catch {
    console.error(
      `Skills directory not found at ${skillsDir}, skipping skill loading`,
    );
    return [];
  }
}

// ── Static data ────────────────────────────────────────────────────

const skills = loadSkills();
console.error(
  `Loaded ${skills.length} skill(s): ${
    skills.map((s) => s.id).join(", ") || "none"
  }`,
);

// Load section recipes (curated component combination guidance)
let sectionRecipes: Record<string, any> = {};
try {
  const __filename_recipes = fileURLToPath(import.meta.url);
  const __dirname_recipes = dirname(__filename_recipes);
  const recipesPath = join(
    __dirname_recipes,
    "..",
    "schemas",
    "section-recipes.json",
  );
  sectionRecipes = JSON.parse(readFileSync(recipesPath, "utf-8"));
  console.error(
    `Loaded section recipes: ${
      (sectionRecipes.recipes || []).length
    } recipes, ${(sectionRecipes.pageTemplates || []).length} page templates`,
  );
} catch {
  console.error("Section recipes not found, skipping");
}

/**
 * Available icon identifiers.
 */
const AVAILABLE_ICONS = [
  "arrow-left",
  "arrow-right",
  "chevron-down",
  "chevron-left",
  "chevron-right",
  "close",
  "search",
  "skip-back",
  "skip-forward",
  "zoom",
  "arrow-down",
  "date",
  "download",
  "email",
  "facebook",
  "file",
  "home",
  "linkedin",
  "login",
  "map-pin",
  "map",
  "person",
  "phone",
  "star",
  "time",
  "twitter",
  "upload",
  "xing",
];

// ── Services ───────────────────────────────────────────────────────

let storyblokService: StoryblokService;
let contentService: ContentGenerationService;

try {
  const config = loadConfig();
  storyblokService = new StoryblokService(config);
  contentService = new ContentGenerationService(config.openAiApiKey);
} catch (error) {
  console.error("Failed to initialize services:", error);
  process.exit(1);
}

// ── Content pattern cache ──────────────────────────────────────────

/**
 * Mutable cache holder — passed by reference to tool handlers so they
 * can both read and update the cache.
 */
const cachedPatterns: { current: ContentPatternAnalysis | null } = {
  current: null,
};

/**
 * Cached global branding token CSS from the Storyblok settings story.
 * Fetched at startup and passed by reference to tool handlers so they
 * can inject it into ext-apps preview iframes.
 */
const globalTokenCss: { current: string | null } = { current: null };

async function warmPatternCache(): Promise<ContentPatternAnalysis> {
  console.error("[MCP] Warming content pattern cache...");
  cachedPatterns.current = await analyzeContentPatterns(
    storyblokService.getContentClient(),
    PAGE_VALIDATION_RULES,
    { contentType: "page", derefSchema: registry.page.schema },
  );
  console.error(
    `[MCP] Pattern cache ready (${cachedPatterns.current.totalStoriesAnalyzed} stories, ${cachedPatterns.current.componentFrequency.length} components, ${cachedPatterns.current.fieldProfiles.length} field profiles)`,
  );
  return cachedPatterns.current;
}

// ── Server factory ─────────────────────────────────────────────────

/**
 * Create a fresh MCP Server instance with all handlers registered.
 *
 * In HTTP mode the SDK requires one Server per transport/session,
 * so we mint a new instance for every request (stateless).
 * In stdio mode a single instance is reused for the lifetime of the process.
 */
function createMcpServer(): McpServer {
  const mcpServer = new McpServer({
    name: "storyblok-mcp-server",
    version: "1.0.0",
  });

  // Register all tools
  const toolDeps: ToolRegistrationDeps = {
    storyblokService,
    contentService,
    cachedPatterns,
    sectionRecipes,
    availableIcons: AVAILABLE_ICONS,
    globalTokenCss,
  };
  registerTools(mcpServer, toolDeps);

  // Register all resources
  const resourceDeps: ResourceRegistrationDeps = {
    storyblokService,
    sectionRecipes,
    skills,
  };
  registerResources(mcpServer, resourceDeps);

  // Register all prompts
  registerPrompts(mcpServer);

  return mcpServer;
}

// ── Entry point ────────────────────────────────────────────────────

/**
 * Main entry point
 *
 * Supports two transport modes:
 * - stdio (default): For local usage with Claude Desktop, etc.
 * - http: For cloud deployment via Streamable HTTP (set MCP_TRANSPORT=http)
 */
async function main() {
  // Warm pattern cache once at startup
  try {
    await warmPatternCache();
  } catch (err) {
    console.error(`[MCP] Warning: Could not warm pattern cache: ${err}`);
    console.error(
      "[MCP] Patterns will be fetched on first analyze_content_patterns call.",
    );
  }

  // Fetch global branding token CSS from Storyblok settings
  try {
    const tokenCss = await storyblokService.getSettingsTokenCss();
    if (tokenCss) {
      globalTokenCss.current = tokenCss;
      console.error(`[MCP] Global token CSS loaded (${tokenCss.length} chars)`);
    } else {
      console.error("[MCP] No global token CSS found in settings.");
    }
  } catch (err) {
    console.error(`[MCP] Warning: Could not fetch settings token CSS: ${err}`);
  }

  const transportMode = process.env.MCP_TRANSPORT || "stdio";

  if (transportMode === "http") {
    const PORT = parseInt(process.env.MCP_PORT || "8080", 10);

    const handleOAuth = createOAuthMiddleware({ serviceName: "Storyblok MCP" });

    const httpServer = createServer(async (req, res) => {
      const url = new URL(req.url || "/", `http://${req.headers.host}`);

      // Health check endpoint for Kamal / load balancer probes
      if (url.pathname === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
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
        // Parse the request body for POST
        let body: unknown;
        if (req.method === "POST") {
          const chunks: Uint8Array[] = [];
          for await (const chunk of req) {
            chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
          }
          body = JSON.parse(Buffer.concat(chunks).toString());
        }

        // Stateless mode: create a fresh server + transport for every request.
        const mcpServer = createMcpServer();
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined as unknown as () => string,
        });

        await mcpServer.connect(transport);

        // Intercept raw initialize to capture extensions before Zod strips them
        installCapabilityInterceptor(mcpServer.server, transport);

        await transport.handleRequest(req, res, body);

        // Clean up after the response is sent
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
        `Storyblok MCP Server (Streamable HTTP, stateless) listening on port ${PORT}`,
      );
      console.error(`Endpoint: http://0.0.0.0:${PORT}/mcp`);
      console.error(`Health check: http://0.0.0.0:${PORT}/health`);
      console.error(
        `OpenAI integration: ${
          contentService.isConfigured() ? "enabled" : "disabled"
        }`,
      );
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
    const transport = new StdioServerTransport();
    const mcpServer = createMcpServer();

    console.error("Starting Storyblok MCP Server...");
    console.error(
      `OpenAI integration: ${
        contentService.isConfigured() ? "enabled" : "disabled"
      }`,
    );

    await mcpServer.connect(transport);

    // Intercept raw initialize to capture extensions before Zod strips them
    installCapabilityInterceptor(mcpServer.server, transport);

    console.error("Storyblok MCP Server running on stdio");
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
