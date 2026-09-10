/**
 * GET /api/prompter/story?uid=<storyUid>
 *
 * Fetches a Storyblok story by UID via the Content Delivery API.
 * Keeps the Storyblok preview token server-side instead of exposing it
 * to the browser via NEXT_PUBLIC_ env vars.
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { corsGET, handleError, getStoryblokContentClient } from "./_helpers";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await corsGET(req, res);

  const uid = req.query.uid as string;
  if (!uid) {
    return res.status(400).json({ error: "Missing required query param: uid" });
  }

  try {
    const { client } = getStoryblokContentClient();
    const response = await client.get(`cdn/stories/${uid}`, {
      version: "draft",
      resolve_links: "url",
    });

    return res.status(200).json({ story: response.data.story });
  } catch (err) {
    return handleError(res, err);
  }
}
