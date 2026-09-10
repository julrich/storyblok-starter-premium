# Design System Component Builder MCP Server

An MCP (Model Context Protocol) server that provides instructions and templates for building UI components following the kickstartDS Design System patterns.

## Features

This MCP server exposes tools to help LLMs understand and generate code for:

- **Component Structure**: Standard file organization for components
- **JSON Schema First Development**: Schema templates for defining component APIs
- **React Patterns**: Pure functional components with Context pattern
- **Client-Side Behavior**: Separated JavaScript for DOM interactions
- **SCSS/BEM Styling**: Design Token layers and BEM naming conventions
- **Storybook Integration**: Story templates and documentation

## Installation

```bash
npm install
```

## Usage

### With Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "design-system-component-builder": {
      "command": "node",
      "args": ["/path/to/component-implementation-mcp/src/index.js"]
    }
  }
}
```

### With VS Code + Copilot

Add to your VS Code settings:

```json
{
  "mcp.servers": {
    "design-system-component-builder": {
      "command": "node",
      "args": ["${workspaceFolder}/src/index.js"]
    }
  }
}
```

## Available Tools

### `get-ui-building-instructions`

Get comprehensive instructions for building UI components. **Always call this first** before any component development work.

### `get-component-structure`

Get the standard file structure and creation order for a new component.

### `get-json-schema-template`

Generate a JSON Schema template for defining component props. The schema is the source of truth for component APIs.

### `get-react-component-template`

Get a React component template following the Design System patterns (pure functional, forwardRef, Context pattern).

### `get-client-behavior-template`

Get templates for adding client-side JavaScript behavior to components using the kickstartDS Component class.

### `get-scss-template`

Get SCSS templates with BEM naming and Design Token layers.

### `get-storybook-template`

Get Storybook story templates with schema integration.

### `get-defaults-template`

Get a defaults file template for component default props.

### `get-token-architecture`

Get documentation on the three-layer Design Token architecture.

### `list-existing-components`

List all existing components in the Design System with their file structures.

## Design System Patterns

### Component File Structure

Each component lives in its own folder with colocated files:

```
src/components/{component-name}/
├── {ComponentName}Component.tsx     # React implementation
├── {ComponentName}Props.ts          # TypeScript types (generated)
├── {ComponentName}Defaults.ts       # Default prop values
├── {component-name}.schema.json     # JSON Schema (source of truth)
├── {component-name}.scss            # Component styles
├── _{component-name}-tokens.scss    # Design Tokens
├── {ComponentName}.stories.tsx      # Storybook stories
├── {ComponentName}.mdx              # Documentation
└── js/                              # Client behavior (optional)
    └── {ComponentName}.client.js
```

### JSON Schema First

Component APIs are defined in JSON Schema, then types are generated:

1. Create `{component-name}.schema.json`
2. Run `yarn schema` to generate TypeScript types
3. Implement the component using generated types

### Pure React Components

Components are pure functions with no local state:

- Use `forwardRef` for ref forwarding
- Use Context pattern for component overrides
- Use `deepMergeDefaults` for prop defaults
- Client-side behavior is separated into `.client.js` files

### Design Token Layers

```
Branding Tokens (--ks-brand-*)
         ↓
Semantic Tokens (--ks-*)
         ↓
Component Tokens (--dsa-*)
```

## Related

- [kickstartDS](https://www.kickstartds.com/) - The underlying Design System framework
- [Model Context Protocol](https://modelcontextprotocol.io/) - The protocol specification

## License

MIT
