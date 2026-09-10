/**
 * GET /api/prompter/ideas
 *
 * Fetches Storyblok Ideas for the current space.
 * Mirrors the existing /api/ideas route for backward compatibility.
 */
import type { NextApiRequest, NextApiResponse } from "next";
import StoryblokClient from "storyblok-js-client";
import { corsGET, requireEnv, handleError } from "./_helpers";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await corsGET(req, res);

  try {
    const oauthToken = requireEnv("NEXT_STORYBLOK_OAUTH_TOKEN");
    const spaceId = requireEnv("NEXT_STORYBLOK_SPACE_ID");

    const storyblok = new StoryblokClient({ oauthToken });
    const response = await storyblok.get(`spaces/${spaceId}/ideas/`);

    return res.status(200).json({ response });
  } catch (err) {
    return handleError(res, err);
  }
}
