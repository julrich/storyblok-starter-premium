/**
 * Story CRUD and search functions for Storyblok.
 *
 * Pure functions that accept a StoryblokClient (Management or Content Delivery)
 * and return results. No framework-specific code — usable from API routes,
 * MCP servers, or n8n nodes.
 */
import { randomUUID } from "node:crypto";
import StoryblokClient from "storyblok-js-client";
import { StoryblokApiError } from "./types.js";
import type {
  StoryblokCredentials,
  ListStoriesOptions,
  CreateStoryOptions,
  CreatePageWithContentOptions,
  UpdateStoryOptions,
} from "./types.js";
import {
  uploadAndReplaceAssets,
  wrapAssetUrls,
  normalizeAssetFieldNames,
} from "./assets.js";
import {
  validateSections,
  validatePageContent,
  formatValidationErrors,
  type ValidationRules,
} from "./validate.js";
import { ensureSubItemComponents, ensureRootFieldBloks } from "./transform.js";
import { getStoryManagement, saveStory } from "./storyblok.js";

// ─── Content Delivery client factory ──────────────────────────────────

/**
 * Create a Storyblok Content Delivery API client (for read operations).
 */
export function createContentClient(
  credentials: Pick<StoryblokCredentials, "spaceId" | "apiToken">
): StoryblokClient {
  return new StoryblokClient({
    accessToken: credentials.apiToken,
    rateLimit: 1,
  });
}

// ─── Asset stripping ──────────────────────────────────────────────────

/**
 * Values that are considered "empty" for Storyblok asset fields and should
 * be stripped to reduce token overhead. Only applies to objects with
 * `fieldtype: "asset"`.
 */
function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined || value === false) return true;
  if (value === "") return true;
  if (typeof value === "object" && !Array.isArray(value)) {
    return Object.keys(value as Record<string, unknown>).length === 0;
  }
  return false;
}

/**
 * Recursively strip empty/null/default fields from Storyblok asset objects.
 *
 * Storyblok asset objects contain ~12 fields, most of which are empty by default
 * (empty strings, null, `false`, `{}`). Each asset takes ~150 tokens raw but
 * only ~15–20 tokens when stripped to non-empty fields.
 *
 * Only objects with `fieldtype: "asset"` are affected — all other objects are
 * left untouched. The `filename` and `fieldtype` fields are always preserved.
 *
 * This function returns a deep copy — the original object is not mutated.
 */
export function stripEmptyAssetFields<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => stripEmptyAssetFields(item)) as T;
  }

  const record = obj as Record<string, unknown>;

  // Asset object: strip empty fields, keep filename + fieldtype always
  if (record.fieldtype === "asset") {
    const stripped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record)) {
      if (key === "filename" || key === "fieldtype") {
        stripped[key] = value;
      } else if (!isEmptyValue(value)) {
        stripped[key] = value;
      }
    }
    return stripped as T;
  }

  // Non-asset object: recurse into values
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    result[key] = stripEmptyAssetFields(value);
  }
  return result as T;
}

// ─── Internal annotation stripping ────────────────────────────────────

/**
 * Keys injected by the Storyblok Content Delivery API at runtime that must
 * never be persisted back via the Management API.
 *
 * - `_editable`: HTML comment added in draft mode for Visual Editor mapping.
 *   If saved, Storyblok flags every occurrence as "item out of schema".
 */
const INTERNAL_ANNOTATION_KEYS = new Set(["_editable"]);

/**
 * Recursively strip Storyblok CDN runtime annotations from a content tree.
 *
 * The Content Delivery API injects fields like `_editable` when returning
 * draft content. These are **not** part of any component schema and must be
 * removed before writing content back via the Management API — otherwise
 * Storyblok shows "item out of schema" warnings for every component.
 *
 * This function returns a deep copy — the original object is not mutated.
 * Legitimate internal fields like `_uid` are preserved.
 */
export function stripInternalAnnotations<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => stripInternalAnnotations(item)) as T;
  }

  const record = obj as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (INTERNAL_ANNOTATION_KEYS.has(key)) continue;
    result[key] = stripInternalAnnotations(value);
  }
  return result as T;
}

// ─── Empty asset stripping ────────────────────────────────────────────

/**
 * Recursively remove Storyblok asset objects whose `filename` is empty.
 *
 * When the CDN API returns draft content it expands every schema-defined
 * asset field into a full object — even when no file was ever uploaded:
 *
 * ```json
 * { "id": null, "alt": null, "name": "", "filename": "", "fieldtype": "asset", … }
 * ```
 *
 * If an LLM echoes this back through `update_story`, these empty objects
 * get persisted. Downstream code (e.g. `unflatten()`) then produces nested
 * props like `image.srcMobile = { filename: "" }` — a truthy *object* where
 * a *string* (or nothing) was expected — causing runtime crashes.
 *
 * This function **deletes** any key whose value is an asset object with an
 * empty `filename`. Non-asset objects and assets with data are preserved.
 * Returns a deep copy — the original object is not mutated.
 */
export function stripEmptyAssets<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => stripEmptyAssets(item)) as T;
  }

  const record = obj as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    // Skip empty asset objects (filename is "" or missing)
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      (value as Record<string, unknown>).fieldtype === "asset" &&
      !(value as Record<string, unknown>).filename
    ) {
      continue;
    }
    result[key] = stripEmptyAssets(value);
  }
  return result as T;
}

// ─── List Stories ─────────────────────────────────────────────────────

/**
 * List stories with optional filtering by content type and slug prefix.
 *
 * Uses the Content Delivery API for fast reads.
 */
export async function listStories(
  client: StoryblokClient,
  options: ListStoriesOptions = {}
): Promise<{
  stories: Record<string, any>[];
  total: number;
  perPage: number;
}> {
  const params: Record<string, unknown> = {
    page: options.page || 1,
    per_page: options.perPage || 25,
  };

  if (options.startsWith) {
    params.starts_with = options.startsWith;
  }

  if (options.contentType) {
    params.content_type = options.contentType;
  }

  if (options.excludeContent) {
    // Storyblok's `excluding_fields` works on fields *inside* story content,
    // not on `content` itself. List all known content-level fields to
    // effectively return metadata-only responses.
    params.excluding_fields = [
      "seo",
      "token",
      "section",
      "component",
      "footer_logo",
      "header_logo",
      "footer_inverted",
      "header_floating",
      "header_inverted",
      "hidePageBreadcrumbs",
    ].join(",");
  }

  const response = await client.get("cdn/stories", params);
  return {
    stories: response.data.stories,
    total: response.total!,
    perPage: response.perPage!,
  };
}

// ─── Search Stories ───────────────────────────────────────────────────

/**
 * Full-text search across stories.
 *
 * Uses the Content Delivery API's `search_term` parameter.
 */
export async function searchStories(
  client: StoryblokClient,
  query: string,
  contentType?: string
): Promise<{
  stories: Record<string, any>[];
  total: number;
}> {
  const params: Record<string, unknown> = {
    search_term: query,
    per_page: 100,
  };

  if (contentType) {
    params.content_type = contentType;
  }

  const response = await client.get("cdn/stories", params);
  return {
    stories: response.data.stories,
    total: response.total!,
  };
}

// ─── Find by Slug ─────────────────────────────────────────────────────

/**
 * Find a folder or story by its full slug path.
 *
 * Uses `by_slugs` filtering on the CDN API for fast lookup.
 * Returns the story/folder object if found, or `null` if no match.
 */
export async function findBySlug(
  client: StoryblokClient,
  fullSlug: string
): Promise<Record<string, any> | null> {
  try {
    const response = await client.get("cdn/stories", {
      by_slugs: fullSlug,
      version: "draft",
      per_page: 1,
    });
    const stories = response.data.stories;
    if (stories && stories.length > 0) {
      return stories[0];
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Create Story ─────────────────────────────────────────────────────

/**
 * Create a new story in Storyblok.
 *
 * @returns The created story object from the Management API.
 */
export async function createStory(
  client: StoryblokClient,
  spaceId: string,
  options: CreateStoryOptions
): Promise<Record<string, any>> {
  const story: Record<string, unknown> = {
    name: options.name,
    slug: options.slug,
    content: options.content,
    is_folder: options.isFolder || false,
  };

  if (options.parentId) {
    story.parent_id = options.parentId;
  }

  try {
    const response = await client.post(`spaces/${spaceId}/stories/`, {
      story,
    } as any);
    return (response as any).data.story;
  } catch (error: any) {
    // Extract meaningful message from Storyblok API error responses
    const apiMessage =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      (typeof error?.response?.data === "string"
        ? error.response.data
        : undefined);
    const status = error?.response?.status || error?.status;
    const message =
      apiMessage || error?.message || JSON.stringify(error) || String(error);
    const err = new StoryblokApiError(
      `Failed to create story "${options.name}": ${message}`
    );
    // Preserve the HTTP status for upstream error handling (e.g. ensurePath)
    (err as any).status = status;
    (err as any).response = error?.response;
    throw err;
  }
}

// ─── Create Page With Content ─────────────────────────────────────────

/**
 * Create a new page pre-populated with section content.
 *
 * Convenience method that:
 * 1. Auto-generates `_uid` fields for every nested component that lacks one
 * 2. Validates content against the Design System schema (unless skipped)
 * 3. Uploads external images to Storyblok assets (if requested)
 * 4. Wraps plain URL strings in Storyblok asset object format
 * 5. Creates the story via the Management API
 * 6. Optionally publishes it
 */
export async function createPageWithContent(
  client: StoryblokClient,
  spaceId: string,
  options: CreatePageWithContentOptions & {
    /** Validation rules for the target content type. */
    validationRules: ValidationRules;
    /** Component name for the root content type (e.g. "page", "blog-post"). */
    componentName: string;
    /** Root array field name (e.g. "section"). */
    rootArrayField: string;
  }
): Promise<Record<string, any>> {
  // 0. Normalize wrongly-flattened asset field names (e.g. image_src → image)
  // Must run before validation and asset wrapping so field names are correct.
  if (options.validationRules.flatAssetFields?.size) {
    normalizeAssetFieldNames(
      options.sections as Record<string, any>[],
      options.validationRules.flatAssetFields
    );
    if (options.rootFields) {
      for (const value of Object.values(options.rootFields)) {
        if (value && typeof value === "object") {
          normalizeAssetFieldNames(
            value as Record<string, any>,
            options.validationRules.flatAssetFields
          );
        }
      }
    }
  }

  // 0b. Inject missing `component` fields on sub-items in monomorphic
  // container slots (e.g. stat items inside stats.stat[], feature items
  // inside features.feature[]). Must run before validation.
  if (options.validationRules.containerSlots?.size) {
    ensureSubItemComponents(
      options.sections as Record<string, any>[],
      options.validationRules.containerSlots,
      options.rootArrayField
    );
  }

  // 0c. Ensure root-level bloks fields are correctly formatted
  // (wrapped in arrays with `component` injected).
  if (options.rootFields && options.validationRules.rootBloksFields?.size) {
    options = {
      ...options,
      rootFields: ensureRootFieldBloks(
        options.rootFields as Record<string, unknown>,
        options.validationRules.rootBloksFields
      ),
    };
  }

  // 1. Validate sections
  if (!options.skipValidation) {
    const validationResult = validateSections(
      options.sections as Record<string, any>[],
      options.validationRules
    );
    if (!validationResult.valid) {
      throw new Error(formatValidationErrors(validationResult.errors));
    }
  }

  // 2. Recursively inject _uid where missing
  const sections = options.sections.map((s) => ensureUids(s)) as Record<
    string,
    unknown
  >[];

  // 3. Upload external images to Storyblok (if requested)
  let assetsSummary;
  if (options.uploadAssets) {
    const wrapper = {
      [options.rootArrayField]: sections,
      ...(options.rootFields || {}),
    } as Record<string, any>;
    assetsSummary = await uploadAndReplaceAssets(client, wrapper, {
      spaceId,
      assetFolderName: options.assetFolderName || "AI Generated",
    });
  }

  // 4. Wrap plain URL strings in asset fields into Storyblok asset objects
  for (const section of sections) {
    wrapAssetUrls(section as Record<string, any>);
  }

  // 4b. Process root fields: ensure UIDs and wrap asset URLs
  const processedRootFields: Record<string, unknown> = {};
  if (options.rootFields) {
    for (const [key, value] of Object.entries(options.rootFields)) {
      const withUids = ensureUids(value);
      if (Array.isArray(withUids)) {
        for (const item of withUids) {
          if (typeof item === "object" && item !== null) {
            wrapAssetUrls(item as Record<string, any>);
          }
        }
      } else if (typeof withUids === "object" && withUids !== null) {
        wrapAssetUrls(withUids as Record<string, any>);
      }
      processedRootFields[key] = withUids;
    }
  }

  // 5. Build content envelope
  const content: Record<string, unknown> = {
    component: options.componentName,
    _uid: randomUUID(),
    [options.rootArrayField]: sections,
    ...processedRootFields,
  };

  // 6. Create the story
  const story = await createStory(client, spaceId, {
    name: options.name,
    slug: options.slug,
    parentId: options.parentId,
    content,
    skipValidation: true, // already validated above
  });

  // 7. Optionally publish
  if (options.publish) {
    const storyId = (story as Record<string, any>).id;
    if (storyId) {
      const savedStory = await saveStory(
        client,
        spaceId,
        String(storyId),
        story,
        true
      );
      return assetsSummary ? { ...savedStory, assetsSummary } : savedStory;
    }
  }

  return assetsSummary ? { ...story, assetsSummary } : story;
}

// ─── Update Story ─────────────────────────────────────────────────────

/**
 * Update an existing story.
 *
 * Fetches the current story, merges updates, validates (optionally),
 * and saves via the Management API.
 */
export async function updateStory(
  client: StoryblokClient,
  spaceId: string,
  storyId: string,
  options: UpdateStoryOptions,
  validationRules?: ValidationRules
): Promise<Record<string, any>> {
  // Validate updated content if applicable
  if (options.content && validationRules) {
    // Normalize wrongly-flattened asset field names before validation
    if (validationRules.flatAssetFields?.size) {
      normalizeAssetFieldNames(
        options.content as Record<string, any>,
        validationRules.flatAssetFields
      );
    }

    if (!options.skipValidation) {
      const content = options.content as Record<string, any>;
      const validationResult = validatePageContent(content, validationRules);
      if (!validationResult.valid) {
        throw new Error(formatValidationErrors(validationResult.errors));
      }
    }
  }

  // Fetch the current story
  const currentStory = await getStoryManagement(client, spaceId, storyId);
  const story = currentStory;

  // Merge updates
  if (options.content) {
    story.content = options.content;
  }
  if (options.name) {
    story.name = options.name;
  }
  if (options.slug) {
    story.slug = options.slug;
  }

  return saveStory(client, spaceId, storyId, story, options.publish || false);
}

// ─── Delete Story ─────────────────────────────────────────────────────

/**
 * Permanently delete a story.
 */
export async function deleteStory(
  client: StoryblokClient,
  spaceId: string,
  storyId: string
): Promise<void> {
  try {
    await client.delete(`spaces/${spaceId}/stories/${storyId}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new StoryblokApiError(
      `Failed to delete story ${storyId}: ${message}`
    );
  }
}

// ─── Ensure Path ──────────────────────────────────────────────────────

/**
 * Ensure a full folder path exists, creating missing intermediate folders.
 *
 * Works like `mkdir -p`: given a path like `"en/services/consulting"`,
 * it walks segment by segment, checks if each folder exists, and creates
 * it if not. Returns the numeric ID of the deepest (last) folder.
 *
 * @param managementClient - Management API client (for folder creation).
 * @param contentClient - Content Delivery API client (for slug lookup).
 * @param spaceId - Storyblok space ID.
 * @param folderPath - Forward-slash-separated folder path.
 * @returns The numeric ID of the deepest folder in the path.
 */
export async function ensurePath(
  managementClient: StoryblokClient,
  contentClient: StoryblokClient,
  spaceId: string,
  folderPath: string
): Promise<number> {
  const segments = folderPath
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean);

  if (segments.length === 0) {
    throw new Error("ensurePath requires at least one path segment");
  }

  let parentId: number | undefined = undefined;
  let currentFullSlug = "";

  for (const segment of segments) {
    currentFullSlug = currentFullSlug
      ? `${currentFullSlug}/${segment}`
      : segment;

    // Try to find existing folder/story at this slug
    const existing = await findBySlug(contentClient, currentFullSlug);

    if (existing) {
      parentId = existing.id;
      continue;
    }

    // Folder doesn't exist — create it
    try {
      const folder = await createStory(managementClient, spaceId, {
        name: segment.charAt(0).toUpperCase() + segment.slice(1),
        slug: segment,
        parentId,
        content: { component: "page", _uid: randomUUID() },
        isFolder: true,
        skipValidation: true,
      });
      parentId = (folder as Record<string, any>).id;
    } catch (err: any) {
      // mkdir -p semantics: if creation failed (e.g. slug already exists due
      // to race condition or CDN cache lag), try to look it up again. The CDN
      // read in findBySlug may have returned stale data on the first attempt.
      const retried = await findBySlug(contentClient, currentFullSlug);
      if (retried) {
        parentId = retried.id;
        continue;
      }

      // Still not found — try the Management API directly as a last resort,
      // since the CDN may have significant cache lag after a recent creation.
      try {
        const mgmtResponse = await managementClient.get(
          `spaces/${spaceId}/stories`,
          { by_slugs: currentFullSlug, per_page: 1 }
        );
        const mgmtStories = (mgmtResponse as any)?.data?.stories;
        if (mgmtStories && mgmtStories.length > 0) {
          parentId = mgmtStories[0].id;
          continue;
        }
      } catch {
        // Management API lookup failed too — fall through to throw
      }

      throw new Error(
        `Failed to create folder "${currentFullSlug}": ${err?.message || err}`
      );
    }
  }

  if (parentId === undefined) {
    throw new Error(`ensurePath failed: could not resolve "${folderPath}"`);
  }

  return parentId;
}

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Recursively walk a Storyblok component tree and add a `_uid` (UUID v4)
 * to every object that has a `component` key but is missing `_uid`.
 * Arrays are traversed element-by-element.
 */
export function ensureUids<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => ensureUids(item)) as unknown as T;
  }

  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;

    // If it looks like a component block, ensure _uid
    if (obj.component && !obj._uid) {
      obj._uid = randomUUID();
    }

    // Recurse into all values
    for (const key of Object.keys(obj)) {
      obj[key] = ensureUids(obj[key]);
    }

    return obj as T;
  }

  return value;
}
