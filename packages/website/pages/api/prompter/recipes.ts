/**
 * GET /api/prompter/recipes
 *
 * Returns curated section recipes, page templates, and anti-patterns.
 * Optionally filtered by content type and merged with live patterns.
 *
 * Query params:
 *   - contentType (optional): Filter recipes by content type
 *   - includePatterns (optional): "true" to merge live patterns (default: "false")
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import type { SectionRecipes } from "@kickstartds/storyblok-services";
import { corsGET, handleError } from "./_helpers";

// ─── Load recipes at module init ──────────────────────────────────────
let sectionRecipes: SectionRecipes = {
  recipes: [],
  pageTemplates: [],
  antiPatterns: [],
};

try {
  // Load from the MCP server package (workspace sibling)
  const mcpPkgJson = require.resolve(
    "@kickstartds/storyblok-mcp-server/package.json"
  );
  const recipesPath = resolve(
    dirname(mcpPkgJson),
    "schemas",
    "section-recipes.json"
  );
  sectionRecipes = JSON.parse(readFileSync(recipesPath, "utf-8"));
} catch {
  console.warn(
    "[/api/prompter/recipes] Could not load section-recipes.json from MCP server package — serving empty recipes"
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await corsGET(req, res);

  try {
    const contentType = req.query.contentType as string | undefined;

    // Filter by content type if specified
    const filteredRecipes = contentType
      ? sectionRecipes.recipes.filter(
          (r: any) => !r.contentType || r.contentType === contentType
        )
      : sectionRecipes.recipes;

    const filteredTemplates = contentType
      ? sectionRecipes.pageTemplates.filter(
          (t: any) => !t.contentType || t.contentType === contentType
        )
      : sectionRecipes.pageTemplates;

    const filteredAntiPatterns = contentType
      ? sectionRecipes.antiPatterns.filter(
          (a: any) => !a.contentType || a.contentType === contentType
        )
      : sectionRecipes.antiPatterns;

    return res.status(200).json({
      recipes: filteredRecipes,
      pageTemplates: filteredTemplates,
      antiPatterns: filteredAntiPatterns,
    });
  } catch (err) {
    return handleError(res, err);
  }
}
