import { INodeProperties } from "n8n-workflow";

/**
 * Parameter definitions for the "Import Content" operation.
 *
 * Visible when resource = "AI Content" and operation = "Import".
 */
export const importContentFields: INodeProperties[] = [
  // ── Story UID ─────────────────────────────────────────────────────
  {
    displayName: "Story UID",
    name: "storyUid",
    type: "string",
    default: "",
    required: true,
    description:
      'The numeric ID or UID of the Storyblok story to update. You can find this in the Storyblok dashboard URL or via the "list_stories" tool.',
    placeholder: "123456789",
    displayOptions: {
      show: {
        resource: ["aiContent"],
        operation: ["import"],
      },
    },
  },

  // ── Placement mode ────────────────────────────────────────────────
  {
    displayName: "Placement Mode",
    name: "placementMode",
    type: "options",
    options: [
      {
        name: "Replace Prompter Component",
        value: "prompter",
        description:
          "Find a prompter component by its UID and replace it with the new sections",
      },
      {
        name: "Insert at Position",
        value: "position",
        description:
          "Insert the new sections at a specific position in the section array (no component is removed)",
      },
    ],
    default: "prompter",
    description:
      'How to place the new sections in the story. Use "Replace Prompter" when a prompter component exists, or "Insert at Position" to add sections at a specific index.',
    displayOptions: {
      show: {
        resource: ["aiContent"],
        operation: ["import"],
      },
    },
  },

  // ── Prompter UID (visible when mode = prompter) ───────────────────
  {
    displayName: "Prompter Component UID",
    name: "prompterUid",
    type: "string",
    default: "",
    required: true,
    description:
      "The _uid of the prompter component in the story that should be replaced with the generated sections. This is the unique identifier assigned by Storyblok to the specific component instance.",
    placeholder: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    displayOptions: {
      show: {
        resource: ["aiContent"],
        operation: ["import"],
        placementMode: ["prompter"],
      },
    },
  },

  // ── Position (visible when mode = position) ───────────────────────
  {
    displayName: "Insert Position",
    name: "insertPosition",
    type: "options",
    options: [
      {
        name: "Beginning",
        value: "beginning",
        description: "Insert at the start of the section array (index 0)",
      },
      {
        name: "End",
        value: "end",
        description: "Append after the last section",
      },
      {
        name: "Specific Index",
        value: "index",
        description: "Insert at a specific 0-based index",
      },
    ],
    default: "end",
    description:
      "Where to insert the new sections in the story's section array",
    displayOptions: {
      show: {
        resource: ["aiContent"],
        operation: ["import"],
        placementMode: ["position"],
      },
    },
  },
  {
    displayName: "Index",
    name: "insertIndex",
    type: "number",
    default: 0,
    typeOptions: {
      minValue: 0,
    },
    description:
      "0-based index at which to insert the new sections. 0 = before the first section, 1 = after the first section, etc.",
    displayOptions: {
      show: {
        resource: ["aiContent"],
        operation: ["import"],
        placementMode: ["position"],
        insertPosition: ["index"],
      },
    },
  },

  // ── Page content (sections) ───────────────────────────────────────
  {
    displayName: "Page Content",
    name: "page",
    type: "json",
    default: "",
    required: true,
    description:
      'JSON object with the page content to import. Must have the structure: { "content": { "section": [ ...sectionObjects ] } }. Typically this comes from the output of a Generate Content node.',
    placeholder:
      '{{ $json }}  or  { "content": { "section": [{ "component": "hero", ... }] } }',
    displayOptions: {
      show: {
        resource: ["aiContent"],
        operation: ["import"],
      },
    },
  },

  // ── Publish toggle ────────────────────────────────────────────────
  {
    displayName: "Publish Immediately",
    name: "publish",
    type: "boolean",
    default: false,
    description:
      "Whether to publish the story immediately after importing content. When false (default), the story is saved as a draft.",
    displayOptions: {
      show: {
        resource: ["aiContent"],
        operation: ["import"],
      },
    },
  },

  // ── Skip transform toggle ────────────────────────────────────────
  {
    displayName: "Skip Auto-Transform",
    name: "skipTransform",
    type: "boolean",
    default: false,
    description:
      "Skip automatic content flattening for Storyblok. Enable this if the content is already in Storyblok-compatible format (e.g. from the Auto schema mode which flattens automatically).",
    displayOptions: {
      show: {
        resource: ["aiContent"],
        operation: ["import"],
      },
    },
  },
];
