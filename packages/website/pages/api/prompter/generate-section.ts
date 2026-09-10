/**
 * POST /api/prompter/generate-section
 *
 * Generates a single section with automatic site-aware context injection.
 * Uses the shared `generateSectionContent()` function from storyblok-services.
 *
 * Request body (JSON):
 *   - componentType (required): Component type to generate (e.g. "hero", "faq")
 *   - prompt (required): Content description for this section
 *   - contentType (optional): Root content type for schema derivation (default: "page")
 *   - system (optional): System prompt override
 *   - previousSection (optional): Component type of the preceding section
 *   - nextSection (optional): Component type of the following section
 *   - patterns (optional): Pre-resolved content patterns
 *   - recipes (optional): Section recipes for best-practice injection
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { generateSectionContent } from "@kickstartds/storyblok-services";
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
          "OpenAI API key is not configured. Content generation requires an AI model.",
        code: "ENV_MISSING",
      });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const {
      componentType,
      prompt,
      contentType = "page",
      system,
      previousSection,
      nextSection,
      patterns,
      recipes,
    } = body;

    const registry = getRegistry();

    if (!componentType) {
      // List available component types for a helpful error
      const entry = registry.has(contentType)
        ? registry.get(contentType)
        : registry.page;
      const allowed: string[] = [];
      Array.from(entry.rules.containerSlots).forEach(([, types]) => {
        (types as Set<string>).forEach((t: string) => {
          if (!allowed.includes(t)) allowed.push(t);
        });
      });
      return res.status(400).json({
        error: "componentType is required",
        availableTypes: allowed,
      });
    }
    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    const entry = registry.has(contentType)
      ? registry.get(contentType)
      : registry.page;

    const client = getOpenAiClient();

    const result = await generateSectionContent(client as any, entry, {
      componentType,
      prompt,
      system,
      previousSection: previousSection || null,
      nextSection: nextSection || null,
      patterns: patterns || null,
      recipes: recipes || null,
    });

    return res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
}
