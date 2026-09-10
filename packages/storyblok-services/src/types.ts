/**
 * Shared types for Storyblok services.
 *
 * These types are intentionally kept minimal and dependency-free so they can
 * be used across Next.js API routes, MCP servers, and n8n community nodes
 * without pulling in framework-specific dependencies.
 */

// ─── Credentials / Config ─────────────────────────────────────────────

/**
 * Credentials required to interact with the Storyblok Management API.
 */
export interface StoryblokCredentials {
  /** Storyblok space ID (numeric string). */
  spaceId: string;
  /** Content Delivery API preview token (for read operations). */
  apiToken?: string;
  /** Management API OAuth token (for write operations). */
  oauthToken: string;
}

/**
 * Credentials required to interact with the OpenAI API.
 */
export interface OpenAiCredentials {
  /** OpenAI API key starting with `sk-`. */
  apiKey: string;
}

// ─── Content structures ───────────────────────────────────────────────

/**
 * Minimal representation of a Storyblok story's page content.
 * Used as input for import operations.
 */
export interface PageContent {
  content: {
    section: Record<string, unknown>[];
  };
}

/**
 * Options for generating structured content via OpenAI.
 */
export interface GenerateContentOptions {
  /** System prompt guiding the AI's persona and behaviour. */
  system: string;
  /** User prompt describing what to generate. */
  prompt: string;
  /** JSON Schema definition for structured output. */
  schema: {
    name: string;
    strict?: boolean;
    schema: Record<string, unknown>;
  };
  /**
   * OpenAI model identifier.
   * @default "gpt-4o-2024-08-06"
   */
  model?: string;
}

/**
 * Options for importing content by replacing a prompter component.
 */
export interface ImportByPrompterOptions {
  /** Numeric story ID or UID. */
  storyUid: string;
  /** The `_uid` of the prompter component to replace. */
  prompterUid: string;
  /** Section objects to insert in place of the prompter. */
  sections: Record<string, unknown>[];
  /** Whether to publish the story immediately. @default false */
  publish?: boolean;
  /**
   * When `true`, image URLs in the sections are downloaded and uploaded
   * to Storyblok as native assets before the story is saved.
   * @default false
   */
  uploadAssets?: boolean;
  /**
   * Name of the Storyblok asset folder to upload images into.
   * Created if it doesn't exist. @default "AI Generated"
   */
  assetFolderName?: string;
}

/**
 * Options for importing content at a specific position.
 */
export interface ImportAtPositionOptions {
  /** Numeric story ID or UID. */
  storyUid: string;
  /**
   * Zero-based insertion index.
   * - `0` inserts at the beginning.
   * - `-1` appends at the end.
   * - Any other value is clamped to `[0, section.length]`.
   */
  position: number;
  /** Section objects to insert. */
  sections: Record<string, unknown>[];
  /** Whether to publish the story immediately. @default false */
  publish?: boolean;
  /**
   * When `true`, image URLs in the sections are downloaded and uploaded
   * to Storyblok as native assets before the story is saved.
   * @default false
   */
  uploadAssets?: boolean;
  /**
   * Name of the Storyblok asset folder to upload images into.
   * Created if it doesn't exist. @default "AI Generated"
   */
  assetFolderName?: string;
}

/**
 * Options for replacing a section at a specific index.
 */
export interface ReplaceSectionOptions {
  /** Numeric story ID or UID. */
  storyUid: string;
  /**
   * Zero-based index of the section to replace.
   * - `-1` replaces the last section.
   * - Any other value is clamped to `[0, section.length - 1]`.
   */
  position: number;
  /** The replacement section object. */
  section: Record<string, unknown>;
  /** Whether to publish the story immediately. @default false */
  publish?: boolean;
  /**
   * When `true`, image URLs in the section are downloaded and uploaded
   * to Storyblok as native assets before the story is saved.
   * @default false
   */
  uploadAssets?: boolean;
  /**
   * Name of the Storyblok asset folder to upload images into.
   * Created if it doesn't exist. @default "AI Generated"
   */
  assetFolderName?: string;
}

/**
 * Options for updating SEO metadata on a story.
 */
export interface UpdateSeoOptions {
  /** Numeric story ID or UID. */
  storyUid: string;
  /** SEO metadata fields to set or update. */
  seo: {
    /** Page title (og:title). */
    title?: string;
    /** Meta description (og:description). */
    description?: string;
    /** Comma-separated keywords. */
    keywords?: string;
    /**
     * OG image. Can be:
     * - A plain URL string (uploaded when `uploadAssets` is true, or wrapped)
     * - A Storyblok asset object `{ id, filename, fieldtype: "asset", ... }`
     */
    image?: string | Record<string, unknown>;
    /**
     * Twitter/social card image. Same format options as `image`.
     */
    cardImage?: string | Record<string, unknown>;
  };
  /** Whether to publish the story immediately. @default false */
  publish?: boolean;
  /**
   * When `true`, image URLs in the SEO data are downloaded and uploaded
   * to Storyblok as native assets before the story is saved.
   * @default false
   */
  uploadAssets?: boolean;
  /**
   * Name of the Storyblok asset folder to upload images into.
   * Created if it doesn't exist. @default "AI Generated"
   */
  assetFolderName?: string;
}

// ─── Error types ──────────────────────────────────────────────────────

/**
 * Base error for all service-layer errors.
 */
export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export class StoryblokApiError extends ServiceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "STORYBLOK_API_ERROR", details);
    this.name = "StoryblokApiError";
  }
}

export class OpenAiApiError extends ServiceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "OPENAI_API_ERROR", details);
    this.name = "OpenAiApiError";
  }
}

export class PrompterNotFoundError extends ServiceError {
  constructor(
    prompterUid: string,
    availableUids: string[],
    details?: Record<string, unknown>
  ) {
    super(
      `Prompter component with UID "${prompterUid}" not found in story. ` +
        `Available section UIDs: ${availableUids.join(", ")}`,
      "PROMPTER_NOT_FOUND",
      { ...details, prompterUid, availableUids }
    );
    this.name = "PrompterNotFoundError";
  }
}

export class ContentGenerationError extends ServiceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "CONTENT_GENERATION_ERROR", details);
    this.name = "ContentGenerationError";
  }
}

// ─── Story CRUD option types ──────────────────────────────────────────

/**
 * Options for listing stories.
 */
export interface ListStoriesOptions {
  /** Filter by slug prefix (e.g. `"en/blog/"`). */
  startsWith?: string;
  /** Filter by content type (e.g. `"page"`, `"blog-post"`). */
  contentType?: string;
  /** Pagination page number (1-based). @default 1 */
  page?: number;
  /** Results per page. @default 25 */
  perPage?: number;
  /**
   * Exclude content fields from each story in the response.
   * When `true`, uses Storyblok's `excluding_fields` parameter with all
   * known content-level field names (section, seo, token, etc.) so only
   * metadata (id, slug, name, timestamps, etc.) is returned.
   * @default false (for backward compatibility with internal consumers)
   */
  excludeContent?: boolean;
}

/**
 * Options for creating a story.
 */
export interface CreateStoryOptions {
  /** Display name. */
  name: string;
  /** URL slug. */
  slug: string;
  /** Parent folder ID for nested content. */
  parentId?: number;
  /** Content object with component data. */
  content: Record<string, unknown>;
  /** Create as a folder instead of a story. @default false */
  isFolder?: boolean;
  /** Skip Design System schema validation. @default false */
  skipValidation?: boolean;
}

/**
 * Options for creating a page pre-populated with section content.
 */
export interface CreatePageWithContentOptions {
  /** Display name. */
  name: string;
  /** URL slug. */
  slug: string;
  /** Parent folder ID (mutually exclusive with `path`). */
  parentId?: number;
  /** Array of section objects (Design System format). */
  sections: Record<string, unknown>[];
  /** Root-level fields for flat content types (event-detail, event-list). */
  rootFields?: Record<string, unknown>;
  /** Publish immediately after creation. @default false */
  publish?: boolean;
  /** Download external images and upload to Storyblok. @default false */
  uploadAssets?: boolean;
  /** Storyblok asset folder name. @default "AI Generated" */
  assetFolderName?: string;
  /** Skip Design System schema validation. @default false */
  skipValidation?: boolean;
}

/**
 * Options for updating an existing story.
 */
export interface UpdateStoryOptions {
  /** Updated content object (replaces entire content). */
  content?: Record<string, unknown>;
  /** Updated display name. */
  name?: string;
  /** Updated URL slug. */
  slug?: string;
  /** Publish after update. @default false */
  publish?: boolean;
  /** Skip Design System schema validation. @default false */
  skipValidation?: boolean;
}

/**
 * Options for listing assets.
 */
export interface ListAssetsOptions {
  /** Pagination page number (1-based). @default 1 */
  page?: number;
  /** Results per page. @default 25 */
  perPage?: number;
  /** Filter assets by filename. */
  search?: string;
  /** Filter by asset folder ID. */
  inFolder?: number;
}
