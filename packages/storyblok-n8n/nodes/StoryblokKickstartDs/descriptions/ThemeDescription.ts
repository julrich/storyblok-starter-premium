import { INodeProperties } from "n8n-workflow";

/**
 * Parameter definitions for the "Theme" resource.
 *
 * Visible when resource = "theme".
 * Operations: list, get, create, update, apply, remove
 */

// ─── Operations ─────────────────────────────────────────────────────────

export const themeOperations: INodeProperties = {
  displayName: "Operation",
  name: "operation",
  type: "options",
  noDataExpression: true,
  options: [
    {
      name: "List Themes",
      value: "list",
      description:
        "List all available design token themes stored as token-theme stories in Storyblok",
      action: "List themes",
    },
    {
      name: "Get Theme",
      value: "get",
      description:
        "Get the full details of a theme including branding tokens and compiled CSS",
      action: "Get a theme",
    },
    {
      name: "Create Theme",
      value: "create",
      description:
        "Create a new design token theme from a W3C DTCG branding token object",
      action: "Create a theme",
    },
    {
      name: "Update Theme",
      value: "update",
      description:
        "Update an existing theme with new W3C DTCG branding tokens (rejects system themes)",
      action: "Update a theme",
    },
    {
      name: "Apply Theme",
      value: "apply",
      description:
        "Apply a design token theme to a page or settings story by setting its theme field",
      action: "Apply a theme to a story",
    },
    {
      name: "Remove Theme",
      value: "remove",
      description:
        "Remove the theme from a story, resetting it to the default branding",
      action: "Remove theme from a story",
    },
  ],
  default: "list",
  displayOptions: {
    show: {
      resource: ["theme"],
    },
  },
};

// ─── Fields ─────────────────────────────────────────────────────────────

export const themeFields: INodeProperties[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Get Theme fields
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    displayName: "Theme Slug or UUID",
    name: "themeSlugOrUuid",
    type: "string",
    default: "",
    required: true,
    description: 'The slug (e.g. "dark-mode") or UUID of the theme to retrieve',
    placeholder: "dark-mode",
    displayOptions: {
      show: {
        resource: ["theme"],
        operation: ["get"],
      },
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Create Theme fields
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    displayName: "Theme Name",
    name: "createThemeName",
    type: "string",
    default: "",
    required: true,
    description:
      'Display name for the new theme (e.g. "Dark Mode", "Corporate Blue")',
    placeholder: "My Theme",
    displayOptions: {
      show: {
        resource: ["theme"],
        operation: ["create"],
      },
    },
  },
  {
    displayName: "Tokens (JSON)",
    name: "createThemeTokens",
    type: "json",
    default: "{}",
    required: true,
    description:
      "W3C DTCG branding token object as JSON. Must include at least a color section.",
    typeOptions: {
      rows: 10,
    },
    displayOptions: {
      show: {
        resource: ["theme"],
        operation: ["create"],
      },
    },
  },
  {
    displayName: "Publish",
    name: "createPublish",
    type: "boolean",
    default: true,
    description: "Whether to publish the theme after creation",
    displayOptions: {
      show: {
        resource: ["theme"],
        operation: ["create"],
      },
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Update Theme fields
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    displayName: "Theme Slug or UUID",
    name: "updateThemeSlugOrUuid",
    type: "string",
    default: "",
    required: true,
    description: 'The slug (e.g. "dark-mode") or UUID of the theme to update',
    placeholder: "dark-mode",
    displayOptions: {
      show: {
        resource: ["theme"],
        operation: ["update"],
      },
    },
  },
  {
    displayName: "Tokens (JSON)",
    name: "updateThemeTokens",
    type: "json",
    default: "{}",
    required: true,
    description:
      "New W3C DTCG branding token object as JSON. Replaces the existing tokens entirely.",
    typeOptions: {
      rows: 10,
    },
    displayOptions: {
      show: {
        resource: ["theme"],
        operation: ["update"],
      },
    },
  },
  {
    displayName: "Publish",
    name: "updatePublish",
    type: "boolean",
    default: true,
    description: "Whether to publish the theme after update",
    displayOptions: {
      show: {
        resource: ["theme"],
        operation: ["update"],
      },
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Apply Theme fields
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    displayName: "Story ID",
    name: "applyStoryId",
    type: "string",
    default: "",
    required: true,
    description:
      "Numeric ID of the page or settings story to apply the theme to",
    displayOptions: {
      show: {
        resource: ["theme"],
        operation: ["apply"],
      },
    },
  },
  {
    displayName: "Theme UUID",
    name: "applyThemeUuid",
    type: "string",
    default: "",
    required: true,
    description: "UUID of the theme to apply to the story",
    displayOptions: {
      show: {
        resource: ["theme"],
        operation: ["apply"],
      },
    },
  },
  {
    displayName: "Publish",
    name: "applyPublish",
    type: "boolean",
    default: false,
    description: "Whether to publish the story after applying the theme",
    displayOptions: {
      show: {
        resource: ["theme"],
        operation: ["apply"],
      },
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Remove Theme fields
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    displayName: "Story ID",
    name: "removeStoryId",
    type: "string",
    default: "",
    required: true,
    description:
      "Numeric ID of the story to remove the theme from (resets to default branding)",
    displayOptions: {
      show: {
        resource: ["theme"],
        operation: ["remove"],
      },
    },
  },
  {
    displayName: "Publish",
    name: "removePublish",
    type: "boolean",
    default: false,
    description: "Whether to publish the story after removing the theme",
    displayOptions: {
      show: {
        resource: ["theme"],
        operation: ["remove"],
      },
    },
  },
];
