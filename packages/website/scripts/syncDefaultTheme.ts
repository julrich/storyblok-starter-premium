#!/usr/bin/env node
/**
 * syncDefaultTheme.ts
 *
 * Syncs the Design System's default branding tokens to Storyblok as a
 * system-managed `token-theme` story at `settings/themes/default`.
 *
 * This ensures the default theme is always available in the CMS and matches
 * the Design System's compiled tokens. The theme is marked `system: true`
 * so it cannot be modified or deleted by users.
 *
 * Usage:
 *   npx tsx scripts/syncDefaultTheme.ts
 *
 * Environment variables (via .env.local):
 *   NEXT_STORYBLOK_OAUTH_TOKEN — Management API OAuth token (required)
 *   NEXT_STORYBLOK_API_TOKEN   — Content Delivery API token (required)
 *   NEXT_STORYBLOK_SPACE_ID    — Storyblok space ID (required)
 *
 * Skips with a warning if any env var is missing (safe for CI/preview builds).
 * Skips if the existing theme content is identical (avoids unnecessary publishes).
 *
 * @see docs/adr/adr-unified-theming.md ADR-5 (Explicit Default with Skip-Injection)
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import StoryblokClient from "storyblok-js-client";
import { tokensToCss } from "@kickstartds/design-system/tokens/tokensToCss.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const THEME_NAME = "Default";
const THEME_SLUG = "default";
const THEME_FOLDER = "settings/themes";

async function main(): Promise<void> {
  // ── Check environment ──────────────────────────────────────────
  const oauthToken = process.env.NEXT_STORYBLOK_OAUTH_TOKEN;
  const apiToken = process.env.NEXT_STORYBLOK_API_TOKEN;
  const spaceId = process.env.NEXT_STORYBLOK_SPACE_ID;

  if (!oauthToken || !apiToken || !spaceId) {
    console.warn(
      "⚠️  sync-default-theme: skipping — missing NEXT_STORYBLOK_OAUTH_TOKEN, NEXT_STORYBLOK_API_TOKEN, or NEXT_STORYBLOK_SPACE_ID",
    );
    return;
  }

  // ── Read branding tokens from the Design System ────────────────
  const tokensPath = join(
    __dirname,
    "..",
    "node_modules",
    "@kickstartds",
    "design-system",
    "dist",
    "tokens",
    "branding-tokens.json",
  );

  let tokens: Record<string, unknown>;
  try {
    tokens = JSON.parse(readFileSync(tokensPath, "utf-8"));
  } catch (err) {
    console.error(
      `❌ sync-default-theme: could not read branding-tokens.json at ${tokensPath}`,
      err,
    );
    process.exit(1);
  }

  // ── Compile CSS ────────────────────────────────────────────────
  const css = tokensToCss(tokens);
  const tokensJson = JSON.stringify(tokens);

  // ── Create Storyblok clients ───────────────────────────────────
  const managementClient = new StoryblokClient({
    oauthToken,
  });

  // ── Check if the default theme already exists ──────────────────
  // Use management API (not CDN) so we find unpublished/draft stories too
  let existingStory: Record<string, any> | null = null;
  try {
    const response = await managementClient.get(`spaces/${spaceId}/stories`, {
      with_slug: `${THEME_FOLDER}/${THEME_SLUG}`,
      per_page: 1,
    });
    const stories: Record<string, any>[] = (response.data as any).stories || [];
    existingStory = stories.find((s) => s.slug === THEME_SLUG) || null;
  } catch {
    // Not found — will create
  }

  if (existingStory) {
    // ── Compare content — skip if identical ────────────────────
    const existingContent = existingStory.content || {};
    if (
      existingContent.tokens === tokensJson &&
      existingContent.css === css &&
      existingContent.system === true
    ) {
      console.log(
        "✅ sync-default-theme: default theme is up-to-date, skipping",
      );
      return;
    }

    // ── Update existing story ──────────────────────────────────
    console.log("🔄 sync-default-theme: updating default theme...");
    const storyResponse = await managementClient.get(
      `spaces/${spaceId}/stories/${existingStory.id}`,
    );
    const story = (storyResponse.data as any).story;
    const content = story.content as Record<string, unknown>;

    content.name = THEME_NAME;
    content.tokens = tokensJson;
    content.css = css;
    content.system = true;

    await managementClient.put(`spaces/${spaceId}/stories/${story.id}`, {
      story: { content },
      publish: 1,
    });

    console.log(
      `✅ sync-default-theme: updated and published (story #${story.id})`,
    );
  } else {
    // ── Ensure folder hierarchy exists ─────────────────────────
    console.log("🆕 sync-default-theme: creating default theme...");
    const parentId = await ensureFolder(managementClient, spaceId);

    // ── Create new story ────────────────────────────────────────
    const createResponse = await managementClient.post(
      `spaces/${spaceId}/stories`,
      {
        story: {
          name: THEME_NAME,
          slug: THEME_SLUG,
          parent_id: parentId,
          content: {
            component: "token-theme",
            _uid: randomUUID(),
            name: THEME_NAME,
            tokens: tokensJson,
            css,
            system: true,
          },
        },
        publish: 1,
      },
    );

    const newStory = (createResponse.data as any).story;
    console.log(
      `✅ sync-default-theme: created and published (story #${newStory.id})`,
    );
  }
}

/**
 * Ensure the `settings/themes` folder hierarchy exists.
 * Returns the folder ID of the deepest folder.
 */
async function ensureFolder(
  client: StoryblokClient,
  spaceId: string,
): Promise<number> {
  const segments = THEME_FOLDER.split("/");
  let parentId = 0;

  for (const segment of segments) {
    // Check if folder exists
    const searchParams: Record<string, any> = {
      with_slug: segment,
      is_folder: true,
    };
    if (parentId) {
      searchParams.with_parent = parentId;
    }

    const response = await client.get(
      `spaces/${spaceId}/stories`,
      searchParams,
    );
    const stories: Record<string, any>[] = (response.data as any).stories || [];
    const existing = stories.find((s) => s.slug === segment);

    if (existing) {
      parentId = existing.id;
    } else {
      // Create the folder, handling "slug already taken" gracefully
      try {
        const createResponse = await client.post(`spaces/${spaceId}/stories`, {
          story: {
            name: segment.charAt(0).toUpperCase() + segment.slice(1),
            slug: segment,
            parent_id: parentId || undefined,
            is_folder: true,
            content: {
              component: "page",
              _uid: randomUUID(),
            },
          },
        });
        parentId = (createResponse.data as any).story.id;
      } catch (err: any) {
        if (err?.status === 422 || err?.response?.status === 422) {
          // Folder already exists — look it up by full slug path so far
          const fullSlug = segments
            .slice(0, segments.indexOf(segment) + 1)
            .join("/");
          const retryResponse = await client.get(`spaces/${spaceId}/stories`, {
            with_slug: fullSlug,
            is_folder: true,
          });
          const retryStories: Record<string, any>[] =
            (retryResponse.data as any).stories || [];
          const found = retryStories.find((s) => s.slug === segment);
          if (found) {
            parentId = found.id;
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }
    }
  }

  return parentId;
}

main().catch((err) => {
  console.error("❌ sync-default-theme:", err);
  process.exit(1);
});
