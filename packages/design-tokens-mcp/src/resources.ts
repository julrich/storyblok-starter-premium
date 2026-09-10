/**
 * MCP resource definitions for the design-tokens server.
 *
 * Exposes token catalog metadata as browsable resources so MCP clients
 * can introspect the token system without invoking tools.
 */

import type {
  Resource,
  ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";

import {
  TOKEN_FILES,
  COMPONENT_TOKEN_FILES,
  COMPONENT_CATEGORIES,
} from "./constants.js";
import { getTokenStats, getComponentTokenStats } from "./parser.js";
import {
  readBrandingTokensW3C,
  getBrandingSchemaDescription,
} from "./branding.js";

// ---------------------------------------------------------------------------
// Resource list
// ---------------------------------------------------------------------------

export const resources: Resource[] = [
  {
    uri: "tokens://overview",
    name: "Token Overview",
    description:
      "Summary statistics of the design token system — total tokens, files, categories, and component token counts.",
    mimeType: "application/json",
  },
  {
    uri: "tokens://files",
    name: "Token Files",
    description:
      "All available token file categories (branding, color, spacing, etc.) with descriptions. Use this to understand which token files exist before querying specific tokens.",
    mimeType: "application/json",
  },
  {
    uri: "tokens://branding",
    name: "Branding Tokens (W3C DTCG)",
    description:
      "Current default branding tokens in W3C DTCG format — the foundational layer (colors, fonts, spacing) that all other tokens derive from. Includes schema field descriptions.",
    mimeType: "application/json",
  },
  {
    uri: "tokens://components",
    name: "Component Token Catalog",
    description:
      "List of all 50 component token files organized by category (navigation, content, forms, layout, etc.) with descriptions.",
    mimeType: "application/json",
  },
];

// ---------------------------------------------------------------------------
// Resource reader
// ---------------------------------------------------------------------------

/**
 * Read a resource by URI and return its contents.
 */
export async function readResource(uri: string): Promise<ReadResourceResult> {
  switch (uri) {
    case "tokens://overview": {
      const stats = await getTokenStats();
      const componentStats = await getComponentTokenStats();
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(
              {
                globalTokens: stats,
                componentTokens: componentStats,
                tokenFileCategories: Object.keys(TOKEN_FILES),
                componentCategories: Object.keys(COMPONENT_CATEGORIES),
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    case "tokens://files": {
      const files = Object.entries(TOKEN_FILES).map(([key, meta]) => ({
        key,
        file: meta.file,
        category: meta.category,
        description: meta.description,
        isJson: "isJson" in meta ? meta.isJson : false,
      }));
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(files, null, 2),
          },
        ],
      };
    }

    case "tokens://branding": {
      const branding = await readBrandingTokensW3C();
      const schemaDescription = getBrandingSchemaDescription();
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(
              {
                format: "W3C DTCG",
                tokens: branding,
                schemaDescription,
                note: "These are the default branding tokens synced from the Design System. To create or update themes, use the Storyblok MCP create_theme/update_theme tools.",
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    case "tokens://components": {
      const catalog = Object.entries(COMPONENT_CATEGORIES).map(
        ([category, components]) => ({
          category,
          components: components.map((name) => {
            const meta = COMPONENT_TOKEN_FILES[name];
            return {
              name,
              file: meta?.file ?? `${name}-tokens.scss`,
              description: meta?.description ?? "",
            };
          }),
        }),
      );
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(catalog, null, 2),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
}
