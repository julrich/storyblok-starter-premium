/**
 * Tool handler implementations for the component-builder MCP server.
 *
 * Each handler returns an MCP CallToolResult with text content.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { toKebabCase } from "./helpers.js";

// ---------------------------------------------------------------------------
// Argument interfaces
// ---------------------------------------------------------------------------

interface ComponentStructureArgs {
  componentName: string;
  description: string;
}

interface JsonSchemaTemplateArgs {
  componentName: string;
  description: string;
  properties?: Array<{
    name: string;
    type: string;
    description: string;
    required?: boolean;
    enum?: string[];
    default?: unknown;
    format?: string;
  }>;
}

interface ReactComponentTemplateArgs {
  componentName: string;
  hasClientBehavior?: boolean;
  composesBaseComponent?: boolean;
  baseComponentImport?: string;
}

interface ClientBehaviorTemplateArgs {
  componentName: string;
  identifier: string;
  behaviorDescription?: string;
}

interface ScssTemplateArgs {
  componentName: string;
  cssClassName: string;
  includeTokens?: boolean;
}

interface StorybookTemplateArgs {
  componentName: string;
  defaultArgs?: Record<string, unknown>;
}

interface DefaultsTemplateArgs {
  componentName: string;
  defaults?: Record<string, unknown>;
}

interface ListExistingComponentsArgs {
  includeDetails?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function text(value: string): CallToolResult {
  return { content: [{ type: "text", text: value }] };
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export function handleGetUiBuildingInstructions(): CallToolResult {
  return text(`# Design System Component Building Instructions

## Overview

This Design System follows a strict component architecture with these key principles:

### 1. Component File Structure

Every component lives in its own folder under \`src/components/{component-name}/\` with these files:

| File | Purpose |
|------|---------|
| \`{ComponentName}Component.tsx\` | React component implementation |
| \`{ComponentName}Props.ts\` | TypeScript types (AUTO-GENERATED from schema) |
| \`{ComponentName}Defaults.ts\` | Default prop values |
| \`{component-name}.schema.json\` | JSON Schema defining the component API |
| \`{component-name}.schema.dereffed.json\` | Dereferenced schema (AUTO-GENERATED) |
| \`{component-name}.scss\` | Component styles |
| \`_{component-name}-tokens.scss\` | Component-level Design Tokens |
| \`{component-name}-tokens.json\` | Token documentation (AUTO-GENERATED) |
| \`{ComponentName}.stories.tsx\` | Storybook stories |
| \`{ComponentName}.mdx\` | Component documentation |
| \`js/{ComponentName}.client.js\` | Client-side behavior (if needed) |

### 2. JSON Schema First Development

**The JSON Schema is the source of truth for component APIs.**

1. Define properties in \`{component-name}.schema.json\`
2. Run \`yarn schema\` to generate:
   - TypeScript types (\`{ComponentName}Props.ts\`)
   - Dereferenced schemas (\`{component-name}.schema.dereffed.json\`)
   - Default values (\`{ComponentName}Defaults.ts\`)

### 3. React Component Patterns

Components MUST follow these patterns:

\`\`\`tsx
// Pure functional components - NO useState, NO useEffect for state
// Use forwardRef for ref forwarding
// Use Context pattern for overridability
// Use deepMergeDefaults for prop defaults

import { forwardRef, createContext, useContext, HTMLAttributes } from "react";
import { deepMergeDefaults } from "../helpers";
import defaults from "./ComponentDefaults";

export const ComponentContextDefault = forwardRef<
  HTMLDivElement,
  ComponentProps & HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const { prop1, prop2, className, ...rest } = deepMergeDefaults(defaults, props);
  // Render logic - PURE, no side effects
});

export const ComponentContext = createContext(ComponentContextDefault);
export const Component = forwardRef<...>((props, ref) => {
  const Component = useContext(ComponentContext);
  return <Component {...deepMergeDefaults(defaults, props)} ref={ref} />;
});
\`\`\`

### 4. Client-Side Behavior Separation

If a component needs interactivity:

1. Create \`js/{ComponentName}.client.js\`
2. Export an identifier: \`export const identifier = "dsa.component-name";\`
3. Create a Component class extending kickstartDS's Component
4. Use \`useKsComponent\` hook in React to connect them

\`\`\`javascript
import { Component, define } from "@kickstartds/core/lib/component";

export const identifier = "dsa.component-name";

class MyComponent extends Component {
  constructor(element) {
    super(element);
    // Set up event listeners, DOM manipulation
    this.onDisconnect(() => {
      // Cleanup
    });
  }
}

define(identifier, MyComponent);
\`\`\`

### 5. Styling with BEM + Design Tokens

**BEM Naming:**
- Block: \`.dsa-component-name\`
- Element: \`.dsa-component-name__element\`
- Modifier: \`.dsa-component-name--modifier\`

**Token Layers:**
1. Branding tokens: \`--ks-brand-*\` (core brand values)
2. Semantic tokens: \`--ks-*\` (purpose-based, reference branding)
3. Component tokens: \`--dsa-*\` (component-specific, reference semantic)

\`\`\`scss
// _component-tokens.scss - Define component tokens
.dsa-component {
  --dsa-component--padding: var(--ks-spacing-m);
  --dsa-component--color: var(--ks-text-color-default);
}

// component.scss - Use component tokens
@use "component-tokens.scss";

.dsa-component {
  padding: var(--dsa-component--padding);
  color: var(--dsa-component--color);
}
\`\`\`

### 6. Provider Pattern for Overrides

Every component exports a Provider for global overrides:

\`\`\`tsx
export const ComponentProvider: FC<PropsWithChildren> = (props) => (
  <ComponentContext.Provider {...props} value={Component} />
);
\`\`\`

### 7. Important Conventions

- **File naming**: kebab-case for folders/files, PascalCase for components
- **Schema $id**: \`http://schema.mydesignsystem.com/{component-name}.schema.json\`
- **CSS class prefix**: \`dsa-\` (Design System Agency)
- **Token prefix**: \`--dsa-\` for component tokens
- **Import styles**: Import SCSS in the component file
- **Re-export types**: \`export type { ComponentProps };\`

### 8. Commands Reference

\`\`\`bash
yarn schema                 # Generate types from schemas
yarn token                  # Extract tokens to JSON
yarn build-tokens           # Compile Design Tokens
yarn start                  # Start Storybook with watchers
yarn storybook              # Start Storybook only
\`\`\``);
}

export function handleGetComponentStructure(
  args: ComponentStructureArgs
): CallToolResult {
  const { componentName, description: _description } = args;
  const kebabName = toKebabCase(componentName);

  return text(`# Component Structure for ${componentName}

## Required Files

Create folder: \`src/components/${kebabName}/\`

### 1. ${kebabName}.schema.json
JSON Schema defining the component API (CREATE FIRST)

### 2. ${componentName}Component.tsx
React component implementation

### 3. ${componentName}Defaults.ts
Default prop values

### 4. ${kebabName}.scss
Component styles

### 5. _${kebabName}-tokens.scss
Component Design Tokens

### 6. ${componentName}.stories.tsx
Storybook stories

### 7. ${componentName}.mdx
Component documentation

## Auto-Generated Files (DO NOT EDIT)

- \`${componentName}Props.ts\` - Generated from schema
- \`${kebabName}.schema.dereffed.json\` - Dereferenced schema
- \`${kebabName}-tokens.json\` - Token documentation

## Optional Files

- \`js/${componentName}.client.js\` - If client-side behavior is needed

## File Templates

Use these tools to get templates for each file:
- \`get-json-schema-template\` - For the schema
- \`get-react-component-template\` - For the React component
- \`get-scss-template\` - For styles and tokens
- \`get-storybook-template\` - For stories
- \`get-defaults-template\` - For defaults
- \`get-client-behavior-template\` - For client JS (if needed)

## Creation Order

1. Create the schema first (\`${kebabName}.schema.json\`)
2. Run \`yarn schema\` to generate types
3. Create the component implementation
4. Create styles and tokens
5. Create Storybook stories
6. Add documentation`);
}

export function handleGetJsonSchemaTemplate(
  args: JsonSchemaTemplateArgs
): CallToolResult {
  const { componentName, description, properties = [] } = args;
  const kebabName = toKebabCase(componentName);

  const schemaProperties: Record<string, Record<string, unknown>> = {};
  const required: string[] = [];

  for (const prop of properties) {
    const propDef: Record<string, unknown> = {
      type: prop.type,
      title:
        prop.name.charAt(0).toUpperCase() +
        prop.name.slice(1).replace(/([A-Z])/g, " $1"),
      description: prop.description,
    };

    if (prop.enum) propDef.enum = prop.enum;
    if (prop.default !== undefined) propDef.default = prop.default;
    if (prop.format) propDef.format = prop.format;

    schemaProperties[prop.name] = propDef;

    if (prop.required) {
      required.push(prop.name);
    }
  }

  const schema = {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: `http://schema.mydesignsystem.com/${kebabName}.schema.json`,
    title: componentName,
    description: description,
    type: "object",
    properties: schemaProperties,
    additionalProperties: false,
    ...(required.length > 0 && { required }),
  };

  return text(`# JSON Schema Template for ${componentName}

## File: \`src/components/${kebabName}/${kebabName}.schema.json\`

\`\`\`json
${JSON.stringify(schema, null, 2)}
\`\`\`

## Schema Conventions

### Property Types and Formats

| Type | Format | Description |
|------|--------|-------------|
| \`string\` | \`markdown\` | Rich text with markdown support |
| \`string\` | \`image\` | Image URL/path |
| \`string\` | \`uri\` | URL/link |
| \`string\` | \`icon\` | Icon identifier |
| \`boolean\` | - | Toggle/flag |
| \`array\` | - | List of items |
| \`object\` | - | Nested properties |

### Referencing Other Schemas

\`\`\`json
{
  "buttonLabel": {
    "$ref": "http://schema.mydesignsystem.com/button.schema.json#/properties/label"
  }
}
\`\`\`

### Array of Components

\`\`\`json
{
  "buttons": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "label": { "$ref": "http://schema.mydesignsystem.com/button.schema.json#/properties/label" },
        "url": { "$ref": "http://schema.mydesignsystem.com/button.schema.json#/properties/url" }
      }
    }
  }
}
\`\`\`

### After Creating Schema

Run \`yarn schema\` to generate:
- \`${componentName}Props.ts\` - TypeScript types
- \`${kebabName}.schema.dereffed.json\` - Dereferenced schema`);
}

export function handleGetReactComponentTemplate(
  args: ReactComponentTemplateArgs
): CallToolResult {
  const {
    componentName,
    hasClientBehavior = false,
    composesBaseComponent = false,
    baseComponentImport,
  } = args;
  const kebabName = toKebabCase(componentName);

  let imports = `import { forwardRef, createContext, useContext, HTMLAttributes, FC, PropsWithChildren } from "react";
import classnames from "classnames";
import { ${componentName}Props } from "./${componentName}Props";
import "./${kebabName}.scss";
import { deepMergeDefaults } from "../helpers";
import defaults from "./${componentName}Defaults";`;

  if (hasClientBehavior) {
    imports += `
import { useKsComponent } from "@kickstartds/core/lib/react";
import { identifier } from "./js/${componentName}.client";`;
  }

  if (composesBaseComponent && baseComponentImport) {
    const baseComponentName = baseComponentImport.split("/").pop();
    imports += `
import { ${baseComponentName}ContextDefault } from "${baseComponentImport}";`;
  }

  const componentBody = hasClientBehavior
    ? `  const componentProps = useKsComponent(identifier, ref);

  return (
    <div
      {...rest}
      {...componentProps}
      ref={ref}
      className={classnames("dsa-${kebabName}", className)}
    >
      {/* Component content */}
    </div>
  );`
    : `  return (
    <div
      {...rest}
      ref={ref}
      className={classnames("dsa-${kebabName}", className)}
    >
      {/* Component content */}
    </div>
  );`;

  const template = `${imports}

export type { ${componentName}Props };

export const ${componentName}ContextDefault = forwardRef<
  HTMLDivElement,
  ${componentName}Props & HTMLAttributes<HTMLDivElement>
>(
  (
    {
      // Destructure props here
      className,
      ...rest
    },
    ref
  ) => {
${componentBody}
  }
);

export const ${componentName}Context = createContext(${componentName}ContextDefault);
export const ${componentName} = forwardRef<
  HTMLDivElement,
  ${componentName}Props & HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const Component = useContext(${componentName}Context);
  return <Component {...deepMergeDefaults(defaults, props)} ref={ref} />;
});
${componentName}.displayName = "${componentName}";

export const ${componentName}Provider: FC<PropsWithChildren> = (props) => (
  <${componentName}Context.Provider {...props} value={${componentName}} />
);
`;

  return text(`# React Component Template for ${componentName}

## File: \`src/components/${kebabName}/${componentName}Component.tsx\`

\`\`\`tsx
${template}
\`\`\`

## Key Patterns Used

### 1. Pure Functional Component
- NO \`useState\` or \`useEffect\` for managing state
- All data comes through props
- Rendering is deterministic based on props

### 2. forwardRef
- Allows parent components to access the DOM element
- Required for integration with kickstartDS

### 3. Context Pattern
- \`${componentName}ContextDefault\` - The actual implementation
- \`${componentName}Context\` - React Context for overrides
- \`${componentName}\` - The exported component using context
- \`${componentName}Provider\` - For global component replacement

### 4. deepMergeDefaults
- Merges default values with provided props
- Handles nested objects and arrays intelligently

### 5. classnames
- Combines class names conditionally
- Pattern: \`classnames("dsa-${kebabName}", modifier && "dsa-${kebabName}--modifier", className)\`

${
  hasClientBehavior
    ? `### 6. useKsComponent Hook
- Connects React to client-side JavaScript behavior
- Returns props to spread on the root element
- Handles lifecycle integration`
    : ""
}`);
}

export function handleGetClientBehaviorTemplate(
  args: ClientBehaviorTemplateArgs
): CallToolResult {
  const { componentName, identifier, behaviorDescription = "" } = args;
  const kebabName = toKebabCase(componentName);

  const template = `import { Component, define } from "@kickstartds/core/lib/component";

export const identifier = "${identifier}";

class ${componentName} extends Component {
  constructor(element) {
    super(element);

    // Cache DOM references
    const $ = element.querySelector.bind(element);
    this.elements = {
      // example: $(".dsa-${kebabName}__element"),
    };

    // Define event handlers
    const handleClick = (event) => {
      // Handle click
    };

    // Set up event listeners
    element.addEventListener("click", handleClick);

    // Dynamic imports for heavy features (code splitting)
    // if (element.classList.contains("dsa-${kebabName}--feature")) {
    //   import("./feature.client").then((mod) => {
    //     const cleanup = mod.initFeature(element);
    //     this.onDisconnect(cleanup);
    //   });
    // }

    // Cross-component communication via radio events
    // const radioToken = window._ks.radio.on("${identifier}.event", (_, value) => {
    //   // Handle event
    // });

    // Cleanup on disconnect (IMPORTANT for memory management)
    this.onDisconnect(() => {
      element.removeEventListener("click", handleClick);
      // window._ks.radio.off(radioToken);
    });
  }

  // Optional: Setters for reactive properties
  // set someProperty(value) {
  //   this.elements.example.textContent = value;
  // }
}

define(identifier, ${componentName});
`;

  const featureModuleTemplate = `// Optional: Separate module for a specific feature
// File: js/feature.client.js

export const initFeature = (element) => {
  // Set up feature-specific behavior

  const handleMousemove = (event) => {
    // Feature logic
  };

  element.addEventListener("mousemove", handleMousemove, { passive: true });

  // Return cleanup function
  return () => {
    element.removeEventListener("mousemove", handleMousemove, { passive: true });
  };
};
`;

  return text(`# Client-Side Behavior Template for ${componentName}

${
  behaviorDescription ? `## Behavior Description\n${behaviorDescription}\n` : ""
}

## Main File: \`src/components/${kebabName}/js/${componentName}.client.js\`

\`\`\`javascript
${template}
\`\`\`

## Optional Feature Module: \`src/components/${kebabName}/js/feature.client.js\`

\`\`\`javascript
${featureModuleTemplate}
\`\`\`

## Key Patterns

### 1. Component Class
- Extends kickstartDS \`Component\` base class
- Constructor receives the DOM element
- Called automatically when element enters the DOM

### 2. Identifier Pattern
- Export \`identifier\` constant matching the component registration
- Format: \`"dsa.component-name"\`
- Used by \`define()\` and \`useKsComponent()\`

### 3. Cleanup Pattern
- Always use \`this.onDisconnect()\` for cleanup
- Remove event listeners
- Cancel timers/animations
- Unsubscribe from radio events

### 4. Dynamic Imports
- Use \`import()\` for heavy features
- Enables code splitting
- Chain with \`.then()\` and register cleanup

### 5. Radio Events (Cross-Component Communication)
- Emit: \`window._ks.radio.emit("${identifier}.event", data)\`
- Listen: \`window._ks.radio.on("${identifier}.event", handler)\`
- Cleanup: \`window._ks.radio.off(token)\`

## Connecting to React

In your React component:

\`\`\`tsx
import { useKsComponent } from "@kickstartds/core/lib/react";
import { identifier } from "./js/${componentName}.client";

const ${componentName}ContextDefault = forwardRef((props, ref) => {
  const componentProps = useKsComponent(identifier, ref);

  return (
    <div {...componentProps} ref={ref}>
      {/* Content */}
    </div>
  );
});
\`\`\``);
}

export function handleGetScssTemplate(args: ScssTemplateArgs): CallToolResult {
  const { componentName, cssClassName, includeTokens = true } = args;
  const kebabName = toKebabCase(componentName);

  const tokensTemplate = `@use "../../selectors" as *;

.${cssClassName} {
  // Base tokens - reference semantic tokens (--ks-*)
  --${cssClassName}--padding: var(--ks-spacing-m);
  --${cssClassName}--gap: var(--ks-spacing-s);
  --${cssClassName}--border-radius: var(--ks-border-radius-card);

  // Color tokens
  --${cssClassName}--color: var(--ks-text-color-default);
  --${cssClassName}--background-color: var(--ks-background-color-default);
  --${cssClassName}--border-color: var(--ks-border-color-default);

  // Typography tokens
  --${cssClassName}--font: var(--ks-font-copy-m);

  // State variations
  --${cssClassName}--color_hover: var(--ks-text-color-default-interactive-hover);
  --${cssClassName}--background-color_hover: var(--ks-background-color-interface-interactive-hover);

  // Variant-specific tokens
  // --${cssClassName}_primary--background-color: var(--ks-background-color-primary-interactive);

  // Size-specific tokens
  // --${cssClassName}_small--font: var(--ks-font-copy-s);
  // --${cssClassName}_large--font: var(--ks-font-copy-l);
}
`;

  const stylesTemplate = `@use "${kebabName}-tokens.scss";

.${cssClassName} {
  // Base styles using component tokens
  padding: var(--${cssClassName}--padding);
  gap: var(--${cssClassName}--gap);
  border-radius: var(--${cssClassName}--border-radius);
  color: var(--${cssClassName}--color);
  background-color: var(--${cssClassName}--background-color);
  border: var(--ks-border-width-default) solid var(--${cssClassName}--border-color);
  font: var(--${cssClassName}--font);

  // Element styles (BEM)
  &__header {
    // Header element styles
  }

  &__content {
    // Content element styles
  }

  &__footer {
    // Footer element styles
  }

  // Hover state
  &:hover {
    color: var(--${cssClassName}--color_hover);
    background-color: var(--${cssClassName}--background-color_hover);
  }

  // Modifier styles
  &--primary {
    // --${cssClassName}--background-color: var(--${cssClassName}_primary--background-color);
  }

  &--small {
    // --${cssClassName}--font: var(--${cssClassName}_small--font);
  }

  &--large {
    // --${cssClassName}--font: var(--${cssClassName}_large--font);
  }
}
`;

  return text(`# SCSS Templates for ${componentName}

${
  includeTokens
    ? `## Tokens File: \`src/components/${kebabName}/_${kebabName}-tokens.scss\`

\`\`\`scss
${tokensTemplate}
\`\`\`

`
    : ""
}## Styles File: \`src/components/${kebabName}/${kebabName}.scss\`

\`\`\`scss
${stylesTemplate}
\`\`\`

## BEM Naming Convention

| Type | Pattern | Example |
|------|---------|---------|
| Block | \`.dsa-{name}\` | \`.${cssClassName}\` |
| Element | \`.dsa-{name}__{element}\` | \`.${cssClassName}__content\` |
| Modifier | \`.dsa-{name}--{modifier}\` | \`.${cssClassName}--primary\` |

## Token Naming Convention

| Type | Pattern | Example |
|------|---------|---------|
| Base | \`--{block}--{property}\` | \`--${cssClassName}--padding\` |
| State | \`--{block}--{property}_{state}\` | \`--${cssClassName}--color_hover\` |
| Variant | \`--{block}_{variant}--{property}\` | \`--${cssClassName}_primary--color\` |
| Element | \`--{block}__{element}--{property}\` | \`--${cssClassName}__header--padding\` |

## Token Layer Reference

\`\`\`
Branding Tokens (--ks-brand-*)
         ↓
Semantic Tokens (--ks-*)
         ↓
Component Tokens (--dsa-*)
         ↓
CSS Properties
\`\`\`

### Semantic Token Categories

| Category | Examples |
|----------|----------|
| Spacing | \`--ks-spacing-xs\`, \`--ks-spacing-m\`, \`--ks-spacing-xl\` |
| Colors | \`--ks-text-color-default\`, \`--ks-background-color-primary\` |
| Typography | \`--ks-font-copy-m\`, \`--ks-font-display-l\` |
| Borders | \`--ks-border-radius-card\`, \`--ks-border-width-default\` |
| Shadows | \`--ks-box-shadow-card\`, \`--ks-box-shadow-overlay\` |`);
}

export function handleGetStorybookTemplate(
  args: StorybookTemplateArgs
): CallToolResult {
  const { componentName, defaultArgs = {} } = args;
  const kebabName = toKebabCase(componentName);

  const template = `import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { ${componentName} } from "./${componentName}Component";
import schema from "./${kebabName}.schema.dereffed.json";
import customProperties from "./${kebabName}-tokens.json";

const meta: Meta<typeof ${componentName}> = {
  title: "Components/${componentName}",
  component: ${componentName},
  parameters: {
    jsonschema: { schema },
    cssprops: { customProperties },
  },
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof ${componentName}>;

export const Default: Story = {
  args: pack(${JSON.stringify(defaultArgs, null, 4)}),
};

// Add variant stories as needed
// export const Primary: Story = {
//   args: pack({
//     ...Default.args,
//     variant: "primary",
//   }),
// };
`;

  const mdxTemplate = `import { Canvas, Meta, ArgTypes } from "@storybook/addon-docs/blocks";
import LinkTo from "@storybook/addon-links/react";
import * as ${componentName}Stories from "./${componentName}.stories";

<Meta of={${componentName}Stories} />

# ${componentName}

Brief description of what the ${componentName} component does.

<Canvas of={${componentName}Stories.Default} />

## Properties

<ArgTypes />

## Usage

\\\`\\\`\\\`jsx
<${componentName} prop="value" />
\\\`\\\`\\\`

## Variants

{/* Add variant canvases here */}

## Design Tokens

Refer to the component tokens panel for available customization options.
`;

  return text(`# Storybook Templates for ${componentName}

## Stories File: \`src/components/${kebabName}/${componentName}.stories.tsx\`

\`\`\`tsx
${template}
\`\`\`

## Documentation File: \`src/components/${kebabName}/${componentName}.mdx\`

\`\`\`mdx
${mdxTemplate}
\`\`\`

## Key Features

### 1. Schema Integration
- \`getArgsShared(schema)\` - Generates Storybook args from JSON Schema
- \`jsonschema\` parameter - Enables JSON Schema addon panel

### 2. Token Documentation
- \`cssprops\` parameter - Shows component tokens in addon panel
- Auto-generated from \`_${kebabName}-tokens.scss\`

### 3. Story Args
- Use \`pack()\` to wrap args for proper handling
- Args should match the component's JSON Schema

### 4. Visual Testing
- Add viewport parameters for consistent screenshots:
\`\`\`tsx
parameters: {
  viewport: {
    width: 770,
    height: 200,
  },
},
\`\`\``);
}

export function handleGetDefaultsTemplate(
  args: DefaultsTemplateArgs
): CallToolResult {
  const { componentName, defaults = {} } = args;
  const kebabName = toKebabCase(componentName);

  const template = `import { DeepPartial } from "../helpers";
import { ${componentName}Props } from "./${componentName}Props";

const defaults: DeepPartial<${componentName}Props> = ${JSON.stringify(
    defaults,
    null,
    2
  )};

export default defaults;
`;

  return text(`# Defaults Template for ${componentName}

## File: \`src/components/${kebabName}/${componentName}Defaults.ts\`

\`\`\`typescript
${template}
\`\`\`

## Purpose

The defaults file:
1. Provides default values for optional props
2. Should match the \`default\` values in the JSON Schema
3. Uses \`DeepPartial\` type for partial definitions
4. Is merged with props via \`deepMergeDefaults()\`

## Example with Values

\`\`\`typescript
const defaults: DeepPartial<${componentName}Props> = {
  variant: "secondary",
  size: "medium",
  disabled: false,
  // Nested objects
  options: {
    animate: true,
  },
};
\`\`\`

## Auto-Generation

You can auto-generate defaults from schema by running:
\`\`\`bash
yarn schema
\`\`\`

This extracts default values from the JSON Schema.`);
}

export function handleGetTokenArchitecture(): CallToolResult {
  return text(`# Design Token Architecture

## Three-Layer Token System

This Design System uses a layered token architecture for maximum flexibility and consistency:

\`\`\`
┌─────────────────────────────────────────────────────────┐
│                    Branding Tokens                       │
│                   (--ks-brand-*)                         │
│                                                          │
│  Core brand values: colors, fonts, spacing base          │
│  Example: --ks-brand-color-primary: #0066cc              │
└───────────────────────────┬─────────────────────────────┘
                            │ referenced by
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Semantic Tokens                       │
│                       (--ks-*)                           │
│                                                          │
│  Purpose-based tokens for consistent usage               │
│  Example: --ks-text-color-primary: var(--ks-brand-...)  │
└───────────────────────────┬─────────────────────────────┘
                            │ referenced by
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   Component Tokens                       │
│                      (--dsa-*)                           │
│                                                          │
│  Component-specific customization points                 │
│  Example: --dsa-button--color: var(--ks-text-color-...) │
└─────────────────────────────────────────────────────────┘
\`\`\`

## Token Categories

### Branding Tokens (--ks-brand-*)

The foundational values that define the brand:

| Category | Examples |
|----------|----------|
| Colors | \`--ks-brand-color-primary\`, \`--ks-brand-color-secondary\` |
| Fonts | \`--ks-brand-font-family-display\`, \`--ks-brand-font-family-copy\` |
| Base values | \`--ks-brand-scale-factor\`, \`--ks-brand-border-radius\` |

### Semantic Tokens (--ks-*)

Purpose-driven tokens that reference branding:

| Category | Tokens | Purpose |
|----------|--------|---------|
| Text colors | \`--ks-text-color-default\`, \`--ks-text-color-primary\`, \`--ks-text-color-muted\` | Text legibility and hierarchy |
| Background colors | \`--ks-background-color-default\`, \`--ks-background-color-accent\` | Surface colors |
| Border colors | \`--ks-border-color-default\`, \`--ks-border-color-interactive\` | Edge definition |
| Spacing | \`--ks-spacing-xs\` through \`--ks-spacing-xxl\` | Consistent spacing scale |
| Typography | \`--ks-font-copy-s\`, \`--ks-font-display-l\` | Complete font stacks |
| Border radius | \`--ks-border-radius-control\`, \`--ks-border-radius-card\` | Rounded corners |
| Shadows | \`--ks-box-shadow-card\`, \`--ks-box-shadow-overlay\` | Elevation |
| Transitions | \`--ks-transition-fade\`, \`--ks-transition-slide\` | Motion |

### Component Tokens (--dsa-*)

Component-level customization:

\`\`\`scss
// Defined in _component-tokens.scss
.dsa-button {
  --dsa-button--padding: var(--ks-spacing-m);
  --dsa-button--color: var(--ks-text-color-default);
  --dsa-button_primary--background: var(--ks-background-color-primary-interactive);
}
\`\`\`

## Token File Structure

\`\`\`
src/
├── token/
│   ├── branding-token.css       # Branding layer
│   ├── color-token.scss         # Color semantic tokens
│   ├── spacing-token.scss       # Spacing semantic tokens
│   ├── font-token.scss          # Typography semantic tokens
│   └── dictionary/              # Token source files
├── _global-token.scss           # Global Design System tokens
├── _selectors.scss              # Root selector definition
└── components/
    └── button/
        ├── _button-tokens.scss  # Component tokens (source)
        └── button-tokens.json   # Token docs (generated)
\`\`\`

## Using Tokens in Components

### 1. Define Component Tokens

\`\`\`scss
// _button-tokens.scss
.dsa-button {
  // Base tokens - reference semantic
  --dsa-button--padding: var(--ks-spacing-m);
  --dsa-button--color: var(--ks-text-color-default);

  // Variant tokens
  --dsa-button_primary--background: var(--ks-background-color-primary-interactive);
  --dsa-button_primary--color: var(--ks-text-color-on-primary);
}
\`\`\`

### 2. Use in Component Styles

\`\`\`scss
// button.scss
@use "button-tokens.scss";

.dsa-button {
  padding: var(--dsa-button--padding);
  color: var(--dsa-button--color);

  &--primary {
    background: var(--dsa-button_primary--background);
    color: var(--dsa-button_primary--color);
  }
}
\`\`\`

## Token Naming Conventions

| Pattern | Example | Use Case |
|---------|---------|----------|
| \`--dsa-{component}--{property}\` | \`--dsa-button--padding\` | Base property |
| \`--dsa-{component}--{property}_{state}\` | \`--dsa-button--color_hover\` | State variation |
| \`--dsa-{component}_{variant}--{property}\` | \`--dsa-button_primary--color\` | Variant property |
| \`--dsa-{component}__{element}--{property}\` | \`--dsa-card__header--padding\` | Element property |

## Token Extraction

Component tokens are auto-extracted to JSON for documentation:

\`\`\`bash
yarn token  # Extracts all component tokens to JSON
\`\`\`

This creates \`{component}-tokens.json\` files used by Storybook's token addon.

## Theming Support

The token architecture enables easy theming:

1. Override branding tokens for brand themes
2. Override semantic tokens for mood themes
3. Override component tokens for component-specific customization

\`\`\`css
[ks-theme="dark"] {
  --ks-background-color-default: var(--ks-brand-color-gray-900);
  --ks-text-color-default: var(--ks-brand-color-gray-100);
}
\`\`\``);
}

export function handleListExistingComponents(
  args: ListExistingComponentsArgs
): CallToolResult {
  const { includeDetails = false } = args;

  const components = [
    {
      name: "Button",
      hasClient: false,
      description: "Interactive button component",
    },
    {
      name: "ButtonGroup",
      hasClient: false,
      description: "Group of buttons with layout options",
    },
    { name: "CTA", hasClient: false, description: "Call to action component" },
    {
      name: "Section",
      hasClient: true,
      description: "Page section with layout options and spotlight effect",
    },
    { name: "Hero", hasClient: false, description: "Hero banner component" },
    {
      name: "Header",
      hasClient: true,
      description: "Site header with navigation",
    },
    { name: "Footer", hasClient: false, description: "Site footer" },
    {
      name: "Headline",
      hasClient: false,
      description: "Heading component with subheadline",
    },
    {
      name: "Gallery",
      hasClient: false,
      description: "Image gallery with lightbox support",
    },
    {
      name: "CookieConsent",
      hasClient: true,
      description: "Cookie consent manager",
    },
    {
      name: "SearchModal",
      hasClient: true,
      description: "Search dialog component",
    },
    {
      name: "Form",
      hasClient: true,
      description: "Form container with validation",
    },
    { name: "TextField", hasClient: false, description: "Text input field" },
    {
      name: "TextArea",
      hasClient: false,
      description: "Multi-line text input",
    },
    { name: "SelectField", hasClient: false, description: "Dropdown select" },
    { name: "Checkbox", hasClient: false, description: "Checkbox input" },
    { name: "Radio", hasClient: false, description: "Radio button input" },
    {
      name: "Slider",
      hasClient: false,
      description: "Content slider/carousel",
    },
    {
      name: "TeaserCard",
      hasClient: false,
      description: "Card for teaser content",
    },
    {
      name: "Contact",
      hasClient: false,
      description: "Contact information display",
    },
    { name: "FAQ", hasClient: false, description: "FAQ accordion component" },
    {
      name: "Testimonial",
      hasClient: false,
      description: "Testimonial display",
    },
    { name: "Feature", hasClient: false, description: "Feature highlight" },
    { name: "Split", hasClient: false, description: "Two-column split layout" },
    { name: "Mosaic", hasClient: false, description: "Mosaic grid layout" },
    { name: "BlogTeaser", hasClient: false, description: "Blog post teaser" },
    { name: "Divider", hasClient: false, description: "Visual divider" },
    { name: "RichText", hasClient: false, description: "Rich text content" },
  ];

  let output = `# Existing Components

## Component List

| Component | Has Client Behavior | Description |
|-----------|---------------------|-------------|
`;

  for (const comp of components) {
    output += `| ${comp.name} | ${comp.hasClient ? "✅" : "❌"} | ${
      comp.description
    } |\n`;
  }

  if (includeDetails) {
    output += `

## Standard File Structure

Each component folder contains:

\`\`\`
{component-name}/
├── {ComponentName}Component.tsx    # React implementation
├── {ComponentName}Props.ts         # TypeScript types (generated)
├── {ComponentName}Defaults.ts      # Default values
├── {component-name}.schema.json    # JSON Schema (source of truth)
├── {component-name}.schema.dereffed.json  # Dereferenced (generated)
├── {component-name}.scss           # Styles
├── _{component-name}-tokens.scss   # Component tokens
├── {component-name}-tokens.json    # Token docs (generated)
├── {ComponentName}.stories.tsx     # Storybook stories
├── {ComponentName}.mdx             # Documentation
└── js/                             # Client behavior (if needed)
    └── {ComponentName}.client.js
\`\`\`

## Components with Client Behavior

The following components have client-side JavaScript:

- **Section**: Spotlight effect, slider functionality
- **Header**: Mobile menu, scroll behavior
- **CookieConsent**: Consent management, dialog control
- **SearchModal**: Modal open/close, form handling
- **Form**: Validation, submission handling`;
  }

  return text(output);
}

// ---------------------------------------------------------------------------
// Dispatcher — maps tool names to handler functions
// ---------------------------------------------------------------------------

export function dispatch(
  name: string,
  args: Record<string, unknown>
): CallToolResult {
  switch (name) {
    case "get-ui-building-instructions":
      return handleGetUiBuildingInstructions();
    case "get-component-structure":
      return handleGetComponentStructure(
        args as unknown as ComponentStructureArgs
      );
    case "get-json-schema-template":
      return handleGetJsonSchemaTemplate(
        args as unknown as JsonSchemaTemplateArgs
      );
    case "get-react-component-template":
      return handleGetReactComponentTemplate(
        args as unknown as ReactComponentTemplateArgs
      );
    case "get-client-behavior-template":
      return handleGetClientBehaviorTemplate(
        args as unknown as ClientBehaviorTemplateArgs
      );
    case "get-scss-template":
      return handleGetScssTemplate(args as unknown as ScssTemplateArgs);
    case "get-storybook-template":
      return handleGetStorybookTemplate(
        args as unknown as StorybookTemplateArgs
      );
    case "get-defaults-template":
      return handleGetDefaultsTemplate(args as unknown as DefaultsTemplateArgs);
    case "get-token-architecture":
      return handleGetTokenArchitecture();
    case "list-existing-components":
      return handleListExistingComponents(
        args as unknown as ListExistingComponentsArgs
      );
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
