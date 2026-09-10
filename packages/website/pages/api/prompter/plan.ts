/**
 * POST /api/prompter/plan
 *
 * AI-assisted page structure planning. Takes a page intent and returns
 * a recommended section sequence based on available components and
 * site patterns.
 *
 * Request body (JSON):
 *   - intent (required): Description of the page to plan
 *   - contentType (optional): Target content type (default: "page")
 *   - sectionCount (optional): Target number of sections
 *   - patterns (optional): Pre-resolved patterns (if omitted, uses cached)
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { planPageContent } from "@kickstartds/storyblok-services";
import {
  corsPOST,
  getOpenAiClient,
  getRegistry,
  hasEnv,
  handleError,
} from "./_helpers";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await corsPOST(req, res);

  try {
    // Pre-flight: check for OpenAI key before doing any work
    if (!hasEnv("NEXT_OPENAI_API_KEY")) {
      return res.status(503).json({
        error:
          "OpenAI API key is not configured. Page planning requires an AI model.",
        code: "ENV_MISSING",
      });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const { intent, contentType = "page", sectionCount, patterns } = body;

    if (!intent) {
      return res.status(400).json({ error: "intent is required" });
    }

    const registry = getRegistry();
    const entry = registry.has(contentType)
      ? registry.get(contentType)
      : registry.page;

    const client = getOpenAiClient();

    const result = await planPageContent(client as any, entry, {
      intent,
      sectionCount,
      patterns: patterns || null,
    });

    return res.status(200).json({
      ...result,
      reviewStatus: "pending",
    });
  } catch (err) {
    return handleError(res, err);
  }
}
