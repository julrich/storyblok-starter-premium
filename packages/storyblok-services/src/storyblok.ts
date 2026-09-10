/**
 * Storyblok API service functions.
 *
 * Pure functions that accept a StoryblokClient and return results.
 * No framework-specific code — usable from API routes, MCP servers, or n8n nodes.
 */
import StoryblokClient from "storyblok-js-client";
import type {
  StoryblokCredentials,
  ImportByPrompterOptions,
  ImportAtPositionOptions,
  ReplaceSectionOptions,
  UpdateSeoOptions,
} from "./types.js";
import { StoryblokApiError, PrompterNotFoundError } from "./types.js";
import { uploadAndReplaceAssets, wrapAssetUrls } from "./assets.js";
import { stripInternalAnnotations, stripEmptyAssets } from "./stories.js";

// ─── Client factory ───────────────────────────────────────────────────

/**
 * Create a Storyblok Management API client.
 */
export function createStoryblokClient(
  credentials: StoryblokCredentials
): StoryblokClient {
  return new StoryblokClient({
    oauthToken: credentials.oauthToken,
    rateLimit: 1,
  });
}

// ─── Story operations ─────────────────────────────────────────────────

/**
 * Fetch a story via the Management API (includes drafts).
 */
export async function getStoryManagement(
  client: StoryblokClient,
  spaceId: string,
  storyId: string
): Promise<Record<string, any>> {
  try {
    const response = await client.get(`spaces/${spaceId}/stories/${storyId}`);
    return (response as any).data.story;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new StoryblokApiError(`Failed to fetch story ${storyId}: ${message}`);
  }
}

/**
 * Save (update) a story via the Management API.
 *
 * @param publish - If true the story is published; otherwise saved as draft.
 */
export async function saveStory(
  client: StoryblokClient,
  spaceId: string,
  storyId: string,
  story: Record<string, any>,
  publish: boolean = false
): Promise<Record<string, any>> {
  try {
    // Strip CDN runtime annotations (e.g. _editable) and empty asset objects
    // that should never be persisted via the Management API.
    if (story.content) {
      story.content = stripInternalAnnotations(story.content);
      story.content = stripEmptyAssets(story.content);
    }
    const response = await client.put(`spaces/${spaceId}/stories/${storyId}`, {
      story: story as any,
      publish: publish ? 1 : 0,
    });
    return (response as any).data.story;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new StoryblokApiError(`Failed to save story ${storyId}: ${message}`);
  }
}

// ─── Content import ───────────────────────────────────────────────────

/**
 * Import content into a Storyblok story by **replacing a prompter component**
 * with new section content.
 *
 * @returns The updated story object.
 * @throws {PrompterNotFoundError} when the prompter UID is not in the story.
 * @throws {StoryblokApiError} when the story has no section array.
 */
export async function importByPrompterReplacement(
  client: StoryblokClient,
  spaceId: string,
  options: ImportByPrompterOptions
): Promise<Record<string, any>> {
  const {
    storyUid,
    prompterUid,
    sections,
    publish = false,
    uploadAssets = false,
    assetFolderName,
  } = options;

  // 1. Fetch the current story
  const story = await getStoryManagement(client, spaceId, storyUid);

  // 2. Locate the prompter component by UID
  const sectionArray: Record<string, unknown>[] | undefined =
    story.content?.section;

  if (!sectionArray || !Array.isArray(sectionArray)) {
    throw new StoryblokApiError(
      `Story ${storyUid} does not have a "section" array in its content.`
    );
  }

  const prompterIndex = sectionArray.findIndex(
    (s: Record<string, unknown>) => s._uid === prompterUid
  );

  if (prompterIndex === -1) {
    const availableUids = sectionArray.map((s) => `${s.component}:${s._uid}`);
    throw new PrompterNotFoundError(prompterUid, availableUids);
  }

  // 3. Upload external images to Storyblok (if requested)
  let assetsSummary;
  if (uploadAssets) {
    const wrapper = { section: sections } as Record<string, any>;
    assetsSummary = await uploadAndReplaceAssets(client, wrapper, {
      spaceId,
      assetFolderName: assetFolderName || "AI Generated",
    });
  }

  // 4. Wrap plain URL strings in asset fields into Storyblok asset objects
  for (const section of sections) {
    wrapAssetUrls(section as Record<string, any>);
  }

  // 5. Replace the prompter with the new sections
  sectionArray.splice(prompterIndex, 1, ...sections);

  // 6. Save the story
  const savedStory = await saveStory(client, spaceId, storyUid, story, publish);

  return assetsSummary ? { ...savedStory, assetsSummary } : savedStory;
}

/**
 * Import content into a Storyblok story by **inserting at a specific position**
 * without removing existing content.
 *
 * @param options.position - `0` = beginning, `-1` = end, or a specific index (clamped to bounds).
 * @returns The updated story object.
 */
export async function importAtPosition(
  client: StoryblokClient,
  spaceId: string,
  options: ImportAtPositionOptions
): Promise<Record<string, any>> {
  const {
    storyUid,
    position,
    sections,
    publish = false,
    uploadAssets = false,
    assetFolderName,
  } = options;

  // 1. Fetch the current story
  const story = await getStoryManagement(client, spaceId, storyUid);

  // 2. Ensure section array exists
  if (!story.content) {
    story.content = { component: "page" };
  }
  if (!Array.isArray(story.content.section)) {
    story.content.section = [];
  }

  const sectionArray: Record<string, unknown>[] = story.content.section;

  // 3. Upload external images to Storyblok (if requested)
  let assetsSummary;
  if (uploadAssets) {
    const wrapper = { section: sections } as Record<string, any>;
    assetsSummary = await uploadAndReplaceAssets(client, wrapper, {
      spaceId,
      assetFolderName: assetFolderName || "AI Generated",
    });
  }

  // 4. Wrap plain URL strings in asset fields into Storyblok asset objects
  for (const section of sections) {
    wrapAssetUrls(section as Record<string, any>);
  }

  // 5. Clamp position to valid range
  const insertAt =
    position < 0
      ? Math.max(0, sectionArray.length + 1 + position) // -1 → end
      : Math.min(position, sectionArray.length); // cap at length

  // 6. Insert sections (no deletion)
  sectionArray.splice(insertAt, 0, ...sections);

  // 7. Save the story
  const savedStory = await saveStory(client, spaceId, storyUid, story, publish);

  return assetsSummary ? { ...savedStory, assetsSummary } : savedStory;
}

// ─── Section replacement ──────────────────────────────────────────────

/**
 * Replace a single section at a specific index in a story's section array.
 *
 * @param options.position - Zero-based index. `-1` replaces the last section.
 * @returns The updated story object.
 * @throws {StoryblokApiError} when the story has no section array or the index is out of range.
 */
export async function replaceSection(
  client: StoryblokClient,
  spaceId: string,
  options: ReplaceSectionOptions
): Promise<Record<string, any>> {
  const {
    storyUid,
    position,
    section,
    publish = false,
    uploadAssets = false,
    assetFolderName,
  } = options;

  // 1. Fetch the current story
  const story = await getStoryManagement(client, spaceId, storyUid);

  // 2. Ensure section array exists
  const sectionArray: Record<string, unknown>[] | undefined =
    story.content?.section;

  if (!sectionArray || !Array.isArray(sectionArray)) {
    throw new StoryblokApiError(
      `Story ${storyUid} does not have a "section" array in its content.`
    );
  }

  if (sectionArray.length === 0) {
    throw new StoryblokApiError(
      `Story ${storyUid} has an empty section array — nothing to replace.`
    );
  }

  // 3. Resolve index (support -1 for last)
  const resolvedIndex =
    position < 0
      ? Math.max(0, sectionArray.length + position)
      : Math.min(position, sectionArray.length - 1);

  // 4. Upload external images to Storyblok (if requested)
  let assetsSummary;
  if (uploadAssets) {
    const wrapper = { section: [section] } as Record<string, any>;
    assetsSummary = await uploadAndReplaceAssets(client, wrapper, {
      spaceId,
      assetFolderName: assetFolderName || "AI Generated",
    });
  }

  // 5. Wrap plain URL strings in asset fields into Storyblok asset objects
  wrapAssetUrls(section as Record<string, any>);

  // 6. Replace the section at the resolved index
  sectionArray[resolvedIndex] = section;

  // 7. Save the story
  const savedStory = await saveStory(client, spaceId, storyUid, story, publish);

  return assetsSummary
    ? { ...savedStory, assetsSummary, replacedIndex: resolvedIndex }
    : { ...savedStory, replacedIndex: resolvedIndex };
}

// ─── SEO update ───────────────────────────────────────────────────────

/**
 * Update (or create) the SEO metadata on a story.
 *
 * Merges the provided SEO fields into the story's existing `seo` component.
 * If no `seo` component exists yet, one is created. Supports asset upload
 * for OG and card images.
 *
 * @returns The updated story object.
 */
export async function updateSeo(
  client: StoryblokClient,
  spaceId: string,
  options: UpdateSeoOptions
): Promise<Record<string, any>> {
  const {
    storyUid,
    seo,
    publish = false,
    uploadAssets = false,
    assetFolderName,
  } = options;

  // 1. Fetch the current story
  const story = await getStoryManagement(client, spaceId, storyUid);

  if (!story.content) {
    throw new StoryblokApiError(`Story ${storyUid} has no content object.`);
  }

  // 2. Find or create the SEO component
  let seoComponent: Record<string, any>;
  if (Array.isArray(story.content.seo) && story.content.seo.length > 0) {
    // Update existing SEO component
    seoComponent = story.content.seo[0];
  } else {
    // Create new SEO component
    seoComponent = {
      _uid: crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) +
          Math.random().toString(36).slice(2),
      component: "seo",
      title: "",
      description: "",
      keywords: "",
      image: "",
      cardImage: "",
    };
    story.content.seo = [seoComponent];
  }

  // 3. Merge provided SEO fields (only set non-undefined fields)
  if (seo.title !== undefined) seoComponent.title = seo.title;
  if (seo.description !== undefined) seoComponent.description = seo.description;
  if (seo.keywords !== undefined) seoComponent.keywords = seo.keywords;
  if (seo.image !== undefined) seoComponent.image = seo.image;
  if (seo.cardImage !== undefined) seoComponent.cardImage = seo.cardImage;

  // 4. Upload external images to Storyblok (if requested)
  let assetsSummary;
  if (uploadAssets) {
    assetsSummary = await uploadAndReplaceAssets(client, seoComponent, {
      spaceId,
      assetFolderName: assetFolderName || "AI Generated",
    });
  }

  // 5. Wrap plain URL strings in asset fields into Storyblok asset objects
  wrapAssetUrls(seoComponent);

  // 6. Save the story
  const savedStory = await saveStory(client, spaceId, storyUid, story, publish);

  return assetsSummary ? { ...savedStory, assetsSummary } : savedStory;
}
