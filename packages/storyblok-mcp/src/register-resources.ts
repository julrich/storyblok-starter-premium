/**
 * Resource registrations for the Storyblok MCP server.
 *
 * Each resource is registered individually via McpServer.registerResource().
 * When ext-apps is enabled (always registered; clients that don't support
 * ext-apps simply ignore ui:// resources), UI resources are also registered
 * for interactive previews.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StoryblokService } from "./services.js";
import { registerUiResources } from "./ui/resources.js";
import { registerAppOnlyTools } from "./ui/app-tools.js";

// ── Types ──────────────────────────────────────────────────────────

export interface Skill {
  id: string;
  name: string;
  description: string;
  content: string;
}

export interface ResourceRegistrationDeps {
  storyblokService: StoryblokService;
  sectionRecipes: Record<string, any>;
  skills: Skill[];
}

// ── Registration ───────────────────────────────────────────────────

/**
 * Register all resources on the McpServer instance.
 */
export function registerResources(
  server: McpServer,
  deps: ResourceRegistrationDeps
): void {
  const { storyblokService, sectionRecipes, skills } = deps;

  // Enable listChanged notifications for resources
  server.server.registerCapabilities({ resources: { listChanged: true } });

  // ── storyblok://components ─────────────────────────────────────

  server.registerResource(
    "Component Schemas",
    "storyblok://components",
    {
      description: "All component schemas defined in the Storyblok space",
      mimeType: "application/json",
    },
    async (uri) => {
      const components = await storyblokService.listComponents();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(components, null, 2),
          },
        ],
      };
    }
  );

  // ── storyblok://stories ────────────────────────────────────────

  server.registerResource(
    "Stories Overview",
    "storyblok://stories",
    {
      description: "Overview of all stories in the space",
      mimeType: "application/json",
    },
    async (uri) => {
      const stories = await storyblokService.listStories({ perPage: 100 });
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(stories, null, 2),
          },
        ],
      };
    }
  );

  // ── recipes://section-recipes ──────────────────────────────────

  server.registerResource(
    "Section Recipes",
    "recipes://section-recipes",
    {
      description:
        "Curated component combinations, page templates, and anti-patterns. Use this as a guide when planning page structure and choosing section types.",
      mimeType: "application/json",
    },
    async (uri) => {
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(sectionRecipes, null, 2),
          },
        ],
      };
    }
  );

  // ── skill:// resources ─────────────────────────────────────────

  for (const skill of skills) {
    server.registerResource(
      `Skill: ${skill.name}`,
      `skill://${skill.id}`,
      {
        description: skill.description,
        mimeType: "text/markdown",
      },
      async (uri) => {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "text/markdown",
              text: skill.content,
            },
          ],
        };
      }
    );
  }

  // ── ext-apps UI resources (ui://) ──────────────────────────────
  // Registered unconditionally — clients that don't support ext-apps
  // simply ignore ui:// resources. This avoids the complexity of
  // post-initialize conditional registration.

  registerUiResources(server);

  // ── ext-apps app-only tools ────────────────────────────────────
  // Tools with visibility: ["app"] — hidden from the LLM, callable
  // only from the UI iframe via app.callTool().

  registerAppOnlyTools(server);
}
