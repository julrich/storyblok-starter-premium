/**
 * GET /api/prompter/patterns
 *
 * Analyzes content patterns across published stories for site-aware
 * content generation. Returns component frequency, section sequences,
 * sub-component counts, page archetypes, and field profiles.
 *
 * Query params:
 *   - contentType (optional): Filter by content type (default: "page")
 *   - startsWith (optional): Filter by slug prefix (e.g. "en/blog/")
 */
import type { NextApiRequest, NextApiResponse } from "next";
import {
  analyzeContentPatterns,
  type ContentPatternAnalysis,
} from "@kickstartds/storyblok-services";
import {
  corsGET,
  getRegistry,
  getStoryblokContentClient,
  handleError,
} from "./_helpers";

// ─── In-memory cache ──────────────────────────────────────────────────
let cachedPatterns: ContentPatternAnalysis | null = null;
let cacheKey: string | null = null;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await corsGET(req, res);

  try {
    const contentType = (req.query.contentType as string | undefined) || "page";
    const startsWith = req.query.startsWith as string | undefined;
    const refresh = req.query.refresh === "true";

    // Build a cache key from the params
    const key = `${contentType}:${startsWith || ""}`;

    // Return cached result if available and not refreshing
    if (!refresh && cachedPatterns && cacheKey === key) {
      return res.status(200).json(cachedPatterns);
    }

    const registry = getRegistry();
    const entry = registry.has(contentType)
      ? registry.get(contentType)
      : registry.page;

    const { client } = getStoryblokContentClient();

    const patterns = await analyzeContentPatterns(client, entry.rules, {
      contentType,
      startsWith,
      derefSchema: entry.schema,
    });

    // Cache the result
    cachedPatterns = patterns;
    cacheKey = key;

    return res.status(200).json(patterns);
  } catch (err) {
    return handleError(res, err);
  }
}
