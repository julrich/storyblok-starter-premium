/**
 * MCP tool definitions for the component-builder server.
 *
 * Each entry follows the MCP Tool schema:
 *   { name, description, inputSchema, annotations }
 *
 * All tools in this server are read-only (they return documentation
 * and templates, never modify anything), so every tool carries
 * `readOnlyHint: true` and `destructiveHint: false`.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";

/** Shared annotations — all tools are read-only and idempotent. */
const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

export const tools: Tool[] = [
  {
    name: "get-ui-building-instructions",
    description: `Get comprehensive instructions for building UI components in this Design System.

ALWAYS call this tool FIRST before doing any UI/frontend/React/component development, including:
- Adding new components
- Updating existing components
- Creating pages, screens, or layouts
- Working with component styling

This returns the foundational patterns and conventions used across all components.`,
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
    annotations: READ_ONLY_ANNOTATIONS,
  },
  {
    name: "get-component-structure",
    description: `Get the standard file structure and templates for creating a new Design System component.

Use this when you need to:
- Create a new component from scratch
- Understand what files are needed for a component
- Get boilerplate templates for component files

Requires the component name (PascalCase) and description.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        componentName: {
          type: "string",
          description:
            "The PascalCase name of the component (e.g., 'Button', 'HeroSection')",
        },
        description: {
          type: "string",
          description: "A brief description of what the component does",
        },
      },
      required: ["componentName", "description"],
    },
    annotations: READ_ONLY_ANNOTATIONS,
  },
  {
    name: "get-json-schema-template",
    description: `Get a JSON Schema template for defining component props.

JSON Schema is the source of truth for component APIs in this Design System.
All props, types, and validation rules are defined here first, then TypeScript types are generated from it.

Use this when:
- Creating a new component and need to define its props
- Adding new properties to an existing component
- Understanding the schema patterns used in this Design System`,
    inputSchema: {
      type: "object" as const,
      properties: {
        componentName: {
          type: "string",
          description: "The PascalCase name of the component",
        },
        description: {
          type: "string",
          description: "Component description for the schema",
        },
        properties: {
          type: "array",
          description: "Array of property definitions to include",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Property name (camelCase)",
              },
              type: {
                type: "string",
                enum: ["string", "boolean", "number", "array", "object"],
                description: "JSON Schema type",
              },
              description: {
                type: "string",
                description: "Property description",
              },
              required: {
                type: "boolean",
                description: "Whether this property is required",
              },
              enum: {
                type: "array",
                items: { type: "string" },
                description: "Enum values for string properties",
              },
              default: { description: "Default value for the property" },
              format: {
                type: "string",
                description:
                  "Format hint (e.g., 'markdown', 'image', 'uri', 'icon')",
              },
            },
            required: ["name", "type", "description"],
          },
        },
      },
      required: ["componentName", "description"],
    },
    annotations: READ_ONLY_ANNOTATIONS,
  },
  {
    name: "get-react-component-template",
    description: `Get a React component template following the Design System patterns.

This Design System uses:
- Purely functional (pure) React components with NO local state
- forwardRef for ref forwarding
- Context pattern for component overrides (Provider pattern)
- Deep merge of defaults with props
- Composition with kickstartDS base components where applicable

Use this when creating or modifying React component implementations.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        componentName: {
          type: "string",
          description: "The PascalCase name of the component",
        },
        hasClientBehavior: {
          type: "boolean",
          description:
            "Whether the component needs client-side JavaScript behavior",
          default: false,
        },
        composesBaseComponent: {
          type: "boolean",
          description:
            "Whether this component wraps a kickstartDS base component",
          default: false,
        },
        baseComponentImport: {
          type: "string",
          description:
            "The import path for the base component (e.g., '@kickstartds/base/lib/button')",
        },
      },
      required: ["componentName"],
    },
    annotations: READ_ONLY_ANNOTATIONS,
  },
  {
    name: "get-client-behavior-template",
    description: `Get templates for adding client-side JavaScript behavior to components.

This Design System separates concerns:
- React components are pure and handle rendering only
- Client-side interactivity is handled by separate JavaScript classes
- Uses kickstartDS Component class with lifecycle management
- Supports dynamic imports for code splitting
- Uses radio events for cross-component communication

Use this when a component needs:
- DOM manipulation
- Event listeners
- Dynamic behavior
- Integration with third-party libraries`,
    inputSchema: {
      type: "object" as const,
      properties: {
        componentName: {
          type: "string",
          description: "The PascalCase name of the component",
        },
        identifier: {
          type: "string",
          description: "The component identifier (e.g., 'dsa.section')",
        },
        behaviorDescription: {
          type: "string",
          description: "Description of the client-side behavior needed",
        },
      },
      required: ["componentName", "identifier"],
    },
    annotations: READ_ONLY_ANNOTATIONS,
  },
  {
    name: "get-scss-template",
    description: `Get SCSS/CSS templates following the Design System's styling patterns.

This Design System uses:
- BEM naming convention (Block__Element--Modifier)
- Design Token layers: branding → semantic → component tokens
- Component-scoped CSS custom properties (--dsa-component-name--property)
- Separate token definition files (_component-tokens.scss)
- Token extraction to JSON for documentation

Use this when:
- Creating styles for a new component
- Understanding the token architecture
- Adding responsive styles`,
    inputSchema: {
      type: "object" as const,
      properties: {
        componentName: {
          type: "string",
          description: "The PascalCase name of the component",
        },
        cssClassName: {
          type: "string",
          description: "The BEM block class name (e.g., 'dsa-button')",
        },
        includeTokens: {
          type: "boolean",
          description: "Whether to include a component tokens file template",
          default: true,
        },
      },
      required: ["componentName", "cssClassName"],
    },
    annotations: READ_ONLY_ANNOTATIONS,
  },
  {
    name: "get-storybook-template",
    description: `Get Storybook story templates for component documentation and testing.

This Design System uses Storybook with:
- Schema-driven args generation via getArgsShared
- JSON Schema integration for prop documentation
- Component tokens documentation via cssprops parameter
- Visual regression testing support

Use this when creating stories for new or existing components.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        componentName: {
          type: "string",
          description: "The PascalCase name of the component",
        },
        defaultArgs: {
          type: "object",
          description: "Default args for the primary story",
        },
      },
      required: ["componentName"],
    },
    annotations: READ_ONLY_ANNOTATIONS,
  },
  {
    name: "get-defaults-template",
    description: `Get a defaults file template for component default props.

Each component has a defaults file that:
- Defines default values matching JSON Schema defaults
- Uses DeepPartial type for partial default definitions
- Is merged with incoming props at runtime

Use this when creating the defaults configuration for a component.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        componentName: {
          type: "string",
          description: "The PascalCase name of the component",
        },
        defaults: {
          type: "object",
          description: "The default values object",
        },
      },
      required: ["componentName"],
    },
    annotations: READ_ONLY_ANNOTATIONS,
  },
  {
    name: "get-token-architecture",
    description: `Get documentation on the Design Token architecture and layering system.

This Design System uses a three-layer token architecture:
1. Branding tokens (--ks-brand-*) - Core brand values
2. Semantic tokens (--ks-*) - Purpose-based tokens referencing branding
3. Component tokens (--dsa-*) - Component-specific tokens referencing semantic

Use this to understand how to properly use and create tokens.`,
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
    annotations: READ_ONLY_ANNOTATIONS,
  },
  {
    name: "list-existing-components",
    description: `List all existing components in the Design System with their file structures.

Use this to:
- Discover available components
- Find components to reference or extend
- Understand which components have client behavior`,
    inputSchema: {
      type: "object" as const,
      properties: {
        includeDetails: {
          type: "boolean",
          description: "Include detailed file lists for each component",
          default: false,
        },
      },
      required: [],
    },
    annotations: READ_ONLY_ANNOTATIONS,
  },
];
