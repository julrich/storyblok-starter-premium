import { INodeProperties } from "n8n-workflow";

/**
 * Parameter definitions for the "Story" resource.
 *
 * Visible when resource = "story".
 * Operations: list, get, createPage, update, delete, search
 */

// ─── Operations ─────────────────────────────────────────────────────────

export const storyOperations: INodeProperties = {
  displayName: "Operation",
  name: "operation",
  type: "options",
  noDataExpression: true,
  options: [
    {
      name: "List",
      value: "list",
      description: "List stories with optional filtering",
      action: "List stories",
    },
    {
      name: "Get",
      value: "get",
      description: "Get a single story by ID, slug, or UUID",
      action: "Get a story",
    },
    {
      name: "Create Page",
      value: "createPage",
      description:
        "Create a new page pre-populated with section content, with auto-UID injection, validation, and optional asset upload",
      action: "Create a page with content",
    },
    {
      name: "Update",
      value: "update",
      description: "Update an existing story's content, name, or slug",
      action: "Update a story",
    },
    {
      name: "Delete",
      value: "delete",
      description: "Permanently delete a story",
      action: "Delete a story",
    },
    {
      name: "Replace Section",
      value: "replaceSection",
      description:
        "Replace a single section by zero-based index — avoids fetching/resubmitting the entire content tree",
      action: "Replace a section in a story",
    },
    {
      name: "Update SEO",
      value: "updateSeo",
      description:
        "Set or update SEO metadata fields (title, description, keywords, image, cardImage) — auto-creates the SEO component if missing",
      action: "Update SEO metadata on a story",
    },
    {
      name: "Search",
      value: "search",
      description: "Full-text search across all stories",
      action: "Search stories",
    },
  ],
  default: "list",
  displayOptions: {
    show: {
      resource: ["story"],
    },
  },
};

// ─── Fields ─────────────────────────────────────────────────────────────

export const storyFields: INodeProperties[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // List operation fields
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    displayName: "Content Type",
    name: "contentType",
    type: "string",
    default: "page",
    description:
      'Filter stories by content type (root component name). E.g. "page", "blog-post", "event-detail".',
    placeholder: "page",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["list"],
      },
    },
  },
  {
    displayName: "Starts With",
    name: "startsWith",
    type: "string",
    default: "",
    description:
      'Filter stories by slug prefix. E.g. "en/" for English pages only.',
    placeholder: "en/",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["list"],
      },
    },
  },
  {
    displayName: "Page",
    name: "page",
    type: "number",
    typeOptions: { minValue: 1 },
    default: 1,
    description: "Page number for pagination",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["list"],
      },
    },
  },
  {
    displayName: "Per Page",
    name: "perPage",
    type: "number",
    typeOptions: { minValue: 1, maxValue: 100 },
    default: 25,
    description: "Number of stories per page (max 100)",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["list"],
      },
    },
  },
  {
    displayName: "Exclude Content",
    name: "excludeContent",
    type: "boolean",
    default: true,
    description:
      "When enabled (default), only story metadata is returned (id, slug, name, timestamps). Disable to include the full content tree — needed for content inspection workflows but significantly increases response size.",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["list"],
      },
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Get operation fields
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    displayName: "Story Identifier",
    name: "storyIdentifier",
    type: "string",
    default: "",
    required: true,
    description: "The story slug, numeric ID, or UUID to retrieve",
    placeholder: "en/home or 123456789",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["get"],
      },
    },
  },
  {
    displayName: "Find By",
    name: "findBy",
    type: "options",
    options: [
      { name: "Slug", value: "slug" },
      { name: "ID", value: "id" },
      { name: "UUID", value: "uuid" },
    ],
    default: "slug",
    description: "How to interpret the Story Identifier value",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["get"],
      },
    },
  },
  {
    displayName: "Version",
    name: "version",
    type: "options",
    options: [
      { name: "Published", value: "published" },
      { name: "Draft", value: "draft" },
    ],
    default: "published",
    description: "Which version of the story to fetch",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["get"],
      },
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Create Page operation fields
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    displayName: "Name",
    name: "name",
    type: "string",
    default: "",
    required: true,
    description: "Display name for the new page (shown in Storyblok dashboard)",
    placeholder: "About Us",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["createPage"],
      },
    },
  },
  {
    displayName: "Slug",
    name: "slug",
    type: "string",
    default: "",
    required: true,
    description:
      "URL slug for the new page. Must be unique within its parent folder.",
    placeholder: "about-us",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["createPage"],
      },
    },
  },
  {
    displayName: "Sections",
    name: "sections",
    type: "json",
    default: "[]",
    required: true,
    description:
      "JSON array of section objects to populate the page. Each section should be a Design System component object. Typically the output from a Generate Content operation.",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["createPage"],
      },
    },
  },
  {
    displayName: "Content Type",
    name: "createContentType",
    type: "string",
    default: "page",
    description:
      'Root content type for the page. E.g. "page", "blog-post", "blog-overview".',
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["createPage"],
      },
    },
  },
  {
    displayName: "Path",
    name: "path",
    type: "string",
    default: "",
    description:
      'Forward-slash-separated folder path. Missing intermediate folders are auto-created (like mkdir -p). E.g. "en/services/consulting". Mutually exclusive with Parent ID.',
    placeholder: "en/services",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["createPage"],
      },
    },
  },
  {
    displayName: "Parent ID",
    name: "parentId",
    type: "number",
    default: 0,
    description:
      "Numeric ID of the parent folder. Use 0 for root level. Mutually exclusive with Path.",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["createPage"],
      },
    },
  },
  {
    displayName: "Root Fields",
    name: "rootFields",
    type: "json",
    default: "{}",
    description:
      'Additional root-level fields for the content type (e.g. { "title": "...", "categories": [...] } for blog-post).',
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["createPage"],
      },
    },
  },
  {
    displayName: "Publish",
    name: "publish",
    type: "boolean",
    default: false,
    description: "Whether to publish the story immediately after creation",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["createPage"],
      },
    },
  },
  {
    displayName: "Upload Assets",
    name: "uploadAssets",
    type: "boolean",
    default: false,
    description:
      "Whether to download external image URLs and upload them as Storyblok assets. Recommended when content contains AI-generated or scraped images.",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["createPage"],
      },
    },
  },
  {
    displayName: "Asset Folder Name",
    name: "assetFolderName",
    type: "string",
    default: "AI Generated",
    description:
      "Storyblok asset folder to upload images into (created if it doesn't exist)",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["createPage"],
        uploadAssets: [true],
      },
    },
  },
  {
    displayName: "Skip Validation",
    name: "skipValidation",
    type: "boolean",
    default: false,
    description:
      "Whether to skip Design System schema validation before writing. Use with caution.",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["createPage"],
      },
    },
  },
  {
    displayName: "Skip Transform",
    name: "skipTransform",
    type: "boolean",
    default: false,
    description:
      "Whether to skip the automatic Storyblok flattening transform. Set to true if content is already in Storyblok format.",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["createPage"],
      },
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Update operation fields
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    displayName: "Story ID",
    name: "updateStoryId",
    type: "number",
    default: 0,
    required: true,
    description: "The numeric ID of the story to update",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["update"],
      },
    },
  },
  {
    displayName: "Content",
    name: "updateContent",
    type: "json",
    default: "",
    description:
      "Updated content object (JSON). If provided, replaces the entire story content.",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["update"],
      },
    },
  },
  {
    displayName: "Name",
    name: "updateName",
    type: "string",
    default: "",
    description:
      "Updated display name for the story (leave empty to keep current)",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["update"],
      },
    },
  },
  {
    displayName: "Slug",
    name: "updateSlug",
    type: "string",
    default: "",
    description: "Updated URL slug (leave empty to keep current)",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["update"],
      },
    },
  },
  {
    displayName: "Publish",
    name: "updatePublish",
    type: "boolean",
    default: false,
    description: "Whether to publish the story after updating",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["update"],
      },
    },
  },
  {
    displayName: "Skip Validation",
    name: "updateSkipValidation",
    type: "boolean",
    default: false,
    description:
      "Whether to skip Design System schema validation before writing",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["update"],
      },
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Delete operation fields
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    displayName: "Story ID",
    name: "deleteStoryId",
    type: "number",
    default: 0,
    required: true,
    description:
      "The numeric ID of the story to permanently delete. This action cannot be undone.",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["delete"],
      },
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Replace Section operation fields
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    displayName: "Story UID",
    name: "replaceSectionStoryUid",
    type: "string",
    default: "",
    required: true,
    description:
      "The UUID or numeric ID of the story containing the section to replace",
    placeholder: "abc-123-def or 123456789",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["replaceSection"],
      },
    },
  },
  {
    displayName: "Position",
    name: "replaceSectionPosition",
    type: "number",
    default: 0,
    required: true,
    description:
      "Zero-based index of the section to replace. Use -1 to replace the last section.",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["replaceSection"],
      },
    },
  },
  {
    displayName: "Section",
    name: "replaceSectionContent",
    type: "json",
    default: "{}",
    required: true,
    description:
      "The replacement section object (JSON). Should be a Design System component object.",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["replaceSection"],
      },
    },
  },
  {
    displayName: "Publish",
    name: "replaceSectionPublish",
    type: "boolean",
    default: false,
    description: "Whether to publish the story after replacing the section",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["replaceSection"],
      },
    },
  },
  {
    displayName: "Upload Assets",
    name: "replaceSectionUploadAssets",
    type: "boolean",
    default: false,
    description:
      "Whether to download external image URLs and upload them as Storyblok assets",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["replaceSection"],
      },
    },
  },
  {
    displayName: "Asset Folder Name",
    name: "replaceSectionAssetFolderName",
    type: "string",
    default: "AI Generated",
    description:
      "Storyblok asset folder to upload images into (created if it doesn't exist)",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["replaceSection"],
        replaceSectionUploadAssets: [true],
      },
    },
  },
  {
    displayName: "Skip Validation",
    name: "replaceSectionSkipValidation",
    type: "boolean",
    default: false,
    description:
      "Whether to skip Design System schema validation before writing",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["replaceSection"],
      },
    },
  },
  {
    displayName: "Skip Transform",
    name: "replaceSectionSkipTransform",
    type: "boolean",
    default: false,
    description:
      "Whether to skip the automatic Storyblok flattening transform. Set to true if content is already in Storyblok format.",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["replaceSection"],
      },
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Update SEO operation fields
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    displayName: "Story UID",
    name: "updateSeoStoryUid",
    type: "string",
    default: "",
    required: true,
    description: "The UUID or numeric ID of the story to update SEO for",
    placeholder: "abc-123-def or 123456789",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["updateSeo"],
      },
    },
  },
  {
    displayName: "SEO Title",
    name: "updateSeoTitle",
    type: "string",
    default: "",
    description:
      "Page title for search engines and social sharing (og:title). Leave empty to keep current.",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["updateSeo"],
      },
    },
  },
  {
    displayName: "SEO Description",
    name: "updateSeoDescription",
    type: "string",
    default: "",
    description:
      "Meta description for search engines (og:description). Leave empty to keep current.",
    typeOptions: {
      rows: 3,
    },
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["updateSeo"],
      },
    },
  },
  {
    displayName: "SEO Keywords",
    name: "updateSeoKeywords",
    type: "string",
    default: "",
    description: "Comma-separated keywords. Leave empty to keep current.",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["updateSeo"],
      },
    },
  },
  {
    displayName: "SEO Image",
    name: "updateSeoImage",
    type: "string",
    default: "",
    description:
      "OG image URL. Will be uploaded to Storyblok when Upload Assets is enabled. Leave empty to keep current.",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["updateSeo"],
      },
    },
  },
  {
    displayName: "SEO Card Image",
    name: "updateSeoCardImage",
    type: "string",
    default: "",
    description: "Twitter/social card image URL. Leave empty to keep current.",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["updateSeo"],
      },
    },
  },
  {
    displayName: "Publish",
    name: "updateSeoPublish",
    type: "boolean",
    default: false,
    description: "Whether to publish the story after updating SEO",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["updateSeo"],
      },
    },
  },
  {
    displayName: "Upload Assets",
    name: "updateSeoUploadAssets",
    type: "boolean",
    default: false,
    description:
      "Whether to download external image URLs in SEO fields and upload them as Storyblok assets",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["updateSeo"],
      },
    },
  },
  {
    displayName: "Asset Folder Name",
    name: "updateSeoAssetFolderName",
    type: "string",
    default: "AI Generated",
    description:
      "Storyblok asset folder to upload SEO images into (created if it doesn't exist)",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["updateSeo"],
        updateSeoUploadAssets: [true],
      },
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Search operation fields
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    displayName: "Search Query",
    name: "searchQuery",
    type: "string",
    default: "",
    required: true,
    description: "Full-text search query to find matching stories",
    placeholder: "e.g. digital transformation",
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["search"],
      },
    },
  },
  {
    displayName: "Content Type",
    name: "searchContentType",
    type: "string",
    default: "",
    description:
      'Optionally filter search results by content type (e.g. "page", "blog-post")',
    displayOptions: {
      show: {
        resource: ["story"],
        operation: ["search"],
      },
    },
  },
];
