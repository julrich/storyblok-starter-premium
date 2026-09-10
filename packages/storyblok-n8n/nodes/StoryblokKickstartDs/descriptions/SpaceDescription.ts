import { INodeProperties } from "n8n-workflow";

/**
 * Parameter definitions for the "Space" resource.
 *
 * Visible when resource = "space".
 * Operations: scrapeUrl, listComponents, getComponent, listAssets,
 *             listRecipes, listIcons, ensurePath
 */

// ─── Operations ─────────────────────────────────────────────────────────

export const spaceOperations: INodeProperties = {
  displayName: "Operation",
  name: "operation",
  type: "options",
  noDataExpression: true,
  options: [
    {
      name: "Scrape URL",
      value: "scrapeUrl",
      description:
        "Fetch a web page and convert it to Markdown with extracted images — useful for content migration",
      action: "Scrape a URL to Markdown",
    },
    {
      name: "List Components",
      value: "listComponents",
      description: "List all component schemas defined in the Storyblok space",
      action: "List components",
    },
    {
      name: "Get Component",
      value: "getComponent",
      description:
        "Get the full schema definition for a single component by name",
      action: "Get a component",
    },
    {
      name: "List Assets",
      value: "listAssets",
      description:
        "List assets (images, files) in the Storyblok space with optional search and folder filtering",
      action: "List assets",
    },
    {
      name: "List Recipes",
      value: "listRecipes",
      description:
        "List curated section recipes, page templates, and anti-patterns for content planning",
      action: "List section recipes",
    },
    {
      name: "List Icons",
      value: "listIcons",
      description:
        "List all available icon identifiers for component icon fields",
      action: "List available icons",
    },
    {
      name: "Ensure Path",
      value: "ensurePath",
      description:
        "Create a folder hierarchy idempotently (like mkdir -p). Returns the folder ID of the deepest folder.",
      action: "Ensure folder path exists",
    },
  ],
  default: "scrapeUrl",
  displayOptions: {
    show: {
      resource: ["space"],
    },
  },
};

// ─── Fields ─────────────────────────────────────────────────────────────

export const spaceFields: INodeProperties[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Scrape URL fields
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    displayName: "URL",
    name: "scrapeUrlTarget",
    type: "string",
    default: "",
    required: true,
    description: "The URL of the web page to scrape and convert to Markdown",
    placeholder: "https://example.com/blog/post-1",
    displayOptions: {
      show: {
        resource: ["space"],
        operation: ["scrapeUrl"],
      },
    },
  },
  {
    displayName: "CSS Selector",
    name: "scrapeSelector",
    type: "string",
    default: "",
    description:
      'Optional CSS selector to extract a specific part of the page (e.g. "main", "article", ".content"). Defaults to the main content area.',
    placeholder: "article",
    displayOptions: {
      show: {
        resource: ["space"],
        operation: ["scrapeUrl"],
      },
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // List Components fields (none required)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Get Component fields
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    displayName: "Component Name",
    name: "componentName",
    type: "string",
    default: "",
    required: true,
    description:
      'The technical name of the component to retrieve (e.g. "hero", "faq", "section")',
    placeholder: "hero",
    displayOptions: {
      show: {
        resource: ["space"],
        operation: ["getComponent"],
      },
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // List Assets fields
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    displayName: "Search",
    name: "assetSearch",
    type: "string",
    default: "",
    description: "Search term to filter assets by filename",
    placeholder: "logo",
    displayOptions: {
      show: {
        resource: ["space"],
        operation: ["listAssets"],
      },
    },
  },
  {
    displayName: "Folder ID",
    name: "assetFolderId",
    type: "number",
    default: 0,
    description: "Filter by asset folder ID. Leave at 0 to show all folders.",
    displayOptions: {
      show: {
        resource: ["space"],
        operation: ["listAssets"],
      },
    },
  },
  {
    displayName: "Page",
    name: "assetPage",
    type: "number",
    typeOptions: { minValue: 1 },
    default: 1,
    description: "Page number for pagination",
    displayOptions: {
      show: {
        resource: ["space"],
        operation: ["listAssets"],
      },
    },
  },
  {
    displayName: "Per Page",
    name: "assetPerPage",
    type: "number",
    typeOptions: { minValue: 1, maxValue: 100 },
    default: 25,
    description: "Number of assets per page (max 100)",
    displayOptions: {
      show: {
        resource: ["space"],
        operation: ["listAssets"],
      },
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // List Recipes fields
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    displayName: "Intent",
    name: "recipeIntent",
    type: "string",
    default: "",
    description:
      'Optional intent to help prioritize relevant recipes (e.g. "product landing page", "about page")',
    placeholder: "product landing page",
    displayOptions: {
      show: {
        resource: ["space"],
        operation: ["listRecipes"],
      },
    },
  },
  {
    displayName: "Content Type",
    name: "recipeContentType",
    type: "string",
    default: "",
    description:
      'Optional content type to filter recipes by (e.g. "page", "blog-post"). Leaves untyped recipes visible.',
    placeholder: "page",
    displayOptions: {
      show: {
        resource: ["space"],
        operation: ["listRecipes"],
      },
    },
  },
  {
    displayName: "Include Live Patterns",
    name: "recipeIncludeLivePatterns",
    type: "boolean",
    default: false,
    description:
      "Whether to merge live component usage patterns from the Storyblok space alongside static recipes. Requires an initial analyze_content_patterns call.",
    displayOptions: {
      show: {
        resource: ["space"],
        operation: ["listRecipes"],
      },
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // List Icons fields (no parameters needed)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Ensure Path fields
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    displayName: "Folder Path",
    name: "ensurePathValue",
    type: "string",
    default: "",
    required: true,
    description:
      'Forward-slash-separated folder path to create (like mkdir -p). E.g. "en/services/consulting". Missing intermediate folders are created automatically.',
    placeholder: "en/services/consulting",
    displayOptions: {
      show: {
        resource: ["space"],
        operation: ["ensurePath"],
      },
    },
  },
];
