# Design Tokens MCP Server

A production-ready Model Context Protocol (MCP) server for managing CSS Custom Properties (design tokens). This server enables AI assistants and other MCP clients to read, query, search, and update design tokens from CSS/SCSS files — including both global branding tokens and component-level tokens.

## Features

- 📖 **Multi-file Support** - Reads tokens from multiple CSS and SCSS files
- 🧩 **Component Tokens** - Discover and inspect design tokens for 50+ individual UI components
- 🔍 **Advanced Querying** - Filter by file, category, prefix, component, or semantic type
- 📊 **Statistics** - Get token counts and distribution across files and components
- 🎨 **Color Palette Tools** - Dedicated tools for color tokens with scale support
- ✏️ **Typography Tools** - Query font families, weights, sizes, and line heights
- 📐 **Spacing Tools** - Get spacing tokens by size or type
- 🔄 **Update Tokens** - Modify token values and persist changes
- 🖼️ **Theme from Image** - Generate a branding theme from a website screenshot or design image using LLM vision
- 🌐 **Theme from CSS** - Extract a branding theme by fetching and analyzing a website's CSS
- ⚡ **Pagination** - Handle large token sets efficiently

## Supported Token Files

### Global Token Files

| File                          | Description                                     | Category         |
| ----------------------------- | ----------------------------------------------- | ---------------- |
| `branding-token.css`          | Core brand tokens (colors, fonts, spacing base) | branding         |
| `color-token.scss`            | Derived color tokens with scales and mixing     | color            |
| `background-color-token.scss` | Background colors for UI states                 | background-color |
| `text-color-token.scss`       | Text/foreground colors                          | text-color       |
| `border-color-token.scss`     | Border colors for UI states                     | border-color     |
| `border-token.scss`           | Border width and radius                         | border           |
| `font-token.scss`             | Font families, weights, line heights            | font             |
| `font-size-token.scss`        | Font size scales with responsive calculations   | font-size        |
| `spacing-token.scss`          | Spacing scales for margins/padding              | spacing          |
| `box-shadow-token.scss`       | Box shadow tokens for elevation                 | box-shadow       |
| `transition-token.scss`       | Animation timing and duration                   | transition       |
| `scaling-token.scss`          | Scaling factors for responsive design           | scaling          |

### Component Token Files (50 files in `tokens/componentToken/`)

Component tokens control the visual styling of individual UI components. They are organized by category:

| Category         | Components                                                                                |
| ---------------- | ----------------------------------------------------------------------------------------- |
| **Navigation**   | header, nav-flyout, nav-toggle, nav-topbar, breadcrumb, content-nav, pagination           |
| **Content**      | headline, rich-text, text, image-text, image-story                                        |
| **Blog**         | blog-aside, blog-head, blog-teaser                                                        |
| **Cards**        | teaser-card, business-card, contact                                                       |
| **Heroes**       | hero, cta, video-curtain                                                                  |
| **Forms**        | button, checkbox, checkbox-group, radio, radio-group, text-field, text-area, select-field |
| **Layout**       | section, split-even, split-weighted, mosaic, gallery                                      |
| **Data Display** | stats, features, faq, testimonials, downloads, logos                                      |
| **Utility**      | divider, lightbox, slider, cookie-consent, footer, html                                   |

## Installation

```bash
npm install
```

## Usage

### Starting the Server (stdio — local)

```bash
npm start
```

This uses stdio transport, suitable for local MCP clients like Claude Desktop.

### Starting the Server (HTTP — remote / cloud)

```bash
npm run start:http
```

Or directly:

```bash
MCP_TRANSPORT=http PORT=3000 node index.js
```

This starts an HTTP server with the MCP Streamable HTTP transport, suitable for cloud deployments behind a reverse proxy.

| Endpoint  | Description                  |
| --------- | ---------------------------- |
| `/mcp`    | MCP Streamable HTTP endpoint |
| `/health` | Health check (JSON)          |

### MCP Client Configuration

For **local** use (stdio):

```json
{
  "mcpServers": {
    "design-tokens": {
      "command": "node",
      "args": ["/path/to/design-tokens-mcp/index.js"]
    }
  }
}
```

For **remote** use (Streamable HTTP):

```json
{
  "mcpServers": {
    "design-tokens": {
      "type": "streamable-http",
      "url": "https://tokens.yourdomain.com/mcp"
    }
  }
}
```

## Available Tools (16 total)

### Core Tools

#### `get_token`

Retrieve a specific token by name with its source file and category.

```json
{ "name": "ks-brand-color-primary" }
```

#### `list_tokens`

List tokens with filtering and pagination. Set `includeComponentTokens: true` to also include component-level tokens in results.

```json
{
  "file": "branding",
  "category": "color",
  "prefix": "ks-brand",
  "includeComponentTokens": false,
  "limit": 50,
  "offset": 0
}
```

#### `list_files`

List all token files with descriptions and token counts. Set `includeComponentFiles: true` to include the 50 component token files.

```json
{ "includeComponentFiles": true }
```

#### `get_token_stats`

Get statistics: total tokens, counts by file, category, and prefix. Automatically includes component token statistics (by component, category, property type, and value type).

#### `search_tokens`

Search tokens by pattern in names or values. Set `includeComponentTokens: true` to also search component tokens.

```json
{
  "pattern": "primary",
  "searchIn": "name",
  "file": "color",
  "includeComponentTokens": false,
  "limit": 50
}
```

### Semantic Type Tools

#### `get_tokens_by_type`

Get tokens by semantic type:

- `interactive` - hover, active, selected, disabled states
- `inverted` - dark mode variants
- `scale` - alpha/mixing scale variants
- `base` - base tokens
- `responsive` - breakpoint-specific tokens
- `sizing` - size scale tokens (xxs-xxl)

```json
{ "type": "interactive", "file": "background-color" }
```

### Domain-Specific Tools

#### `get_color_palette`

Get color tokens organized by type.

```json
{
  "colorType": "primary",
  "includeScales": true
}
```

Color types: `primary`, `positive`, `negative`, `informative`, `notice`, `fg`, `bg`, `link`

#### `get_typography_tokens`

Get typography tokens filtered by font type or property.

```json
{
  "fontType": "display",
  "property": "size"
}
```

Font types: `display`, `copy`, `interface`, `mono`
Properties: `family`, `weight`, `size`, `line-height`

#### `get_spacing_tokens`

Get spacing tokens by size or type.

```json
{
  "size": "m",
  "type": "stack"
}
```

Sizes: `xxs`, `xs`, `s`, `m`, `l`, `xl`, `xxl`
Types: `stack`, `inline`, `inset`, `base`

#### `get_branding_tokens`

Get core branding tokens (the primary tokens to modify for theming).

```json
{ "type": "colors" }
```

Types: `colors`, `fonts`, `spacing`, `borders`, `shadows`, `all`

#### `update_token`

Update a token value in its source file.

```json
{
  "name": "ks-brand-color-primary",
  "value": "#4075d0"
}
```

### Component Token Tools

#### `list_components`

List all available components with their token counts and categories. Optionally filter by category.

```json
{ "category": "forms" }
```

Categories: `navigation`, `content`, `blog`, `cards`, `heroes`, `forms`, `layout`, `data-display`, `utility`

#### `get_component_tokens`

Get all tokens for a specific component with structural metadata (element, variant, CSS property, state, value type, referenced globals).

```json
{ "component": "button" }
```

Returns enriched token data including:

- **element** — sub-element (e.g., `icon`, `label`)
- **variant** — visual variant (e.g., `primary`, `clear`)
- **cssProperty** — the CSS property being set (e.g., `color`, `background-color`)
- **state** — interaction state (e.g., `hover`, `active`)
- **valueType** — `literal`, `global-reference`, `component-reference`, or `calculated`
- **referencedToken** — the global token being referenced, if any

#### `search_component_tokens`

Search across all component token files by pattern, property, state, or value type.

```json
{
  "pattern": "primary",
  "property": "color",
  "state": "hover",
  "valueType": "global-reference",
  "component": "button",
  "limit": 50
}
```

### Theme Generation Tools

#### `generate_theme_from_image`

Analyze a website screenshot or design image to generate a branding theme. Accepts a base64-encoded image or an image URL. Returns the image for LLM vision analysis alongside the current theme schema with field descriptions and tips.

```json
{ "imageUrl": "https://example.com/screenshot.png" }
```

Or with base64:

```json
{ "imageBase64": "iVBORw0KGgo...", "mimeType": "image/png" }
```

Supported formats: `image/png`, `image/jpeg`, `image/webp`

#### `extract_theme_from_css`

Fetch all CSS from a website (inline `<style>` blocks and linked `<link rel="stylesheet">` stylesheets) and return it for analysis. Extracts exact color values, font families, font sizes, CSS custom properties, and more.

```json
{ "url": "https://example.com" }
```

With full raw CSS included:

```json
{
  "url": "https://example.com",
  "includeRawCSS": true,
  "maxStylesheets": 10
}
```

Returns:

- Pre-parsed summary (unique hex/RGB/HSL colors, font families, custom property count)
- `:root` / `html` CSS custom properties (most valuable for theming)
- All CSS custom properties found (up to 200)
- Current theme schema with field descriptions
- Optionally, the full raw CSS text

## Token Architecture

The design token system follows a layered architecture:

1. **Branding Tokens** (`branding-token.css`)
   - Core values: primary colors, font families, base sizes
   - These are the tokens to modify for theming

2. **Derived Tokens** (SCSS files)
   - Computed from branding tokens using `var()` references
   - Include scales, states, and responsive variants

3. **Semantic Tokens**
   - Purpose-specific tokens (background, text, border colors)
   - Interactive states (hover, active, selected, disabled)
   - Inverted variants for dark mode

4. **Component Tokens** (`tokens/componentToken/` — 50 files)
   - Per-component styling tokens following the naming convention:
     `--dsa-{component}[__{element}][_{variant}]--{property}[_{state}]`
   - Reference global/derived tokens via `var()` for consistency
   - Enable component-level customization without touching global tokens
   - Organized into 9 categories: navigation, content, blog, cards, heroes, forms, layout, data-display, utility

## Example Workflows

### Get an overview of the token system

```
1. list_files → See all token files with counts
2. get_token_stats → See distribution by category
```

### Find and modify a brand color

```
1. get_branding_tokens { type: "colors" } → See editable colors
2. update_token { name: "ks-brand-color-primary", value: "#new-color" }
```

### Explore the color system

```
1. get_color_palette { colorType: "primary" } → See primary colors
2. get_color_palette { colorType: "primary", includeScales: true } → With alpha scales
```

### Query interactive states

```
1. get_tokens_by_type { type: "interactive", file: "background-color" }
```

### Generate a theme from a website screenshot

```
1. generate_theme_from_image { imageUrl: "https://example.com/screenshot.png" }
   → LLM analyzes the image using vision
2. update_theme_config { path: "color.primary", value: "#extracted-color" }
   → Apply each extracted value
```

### Generate a theme from a website's CSS

```
1. extract_theme_from_css { url: "https://example.com" }
   → Returns parsed CSS with colors, fonts, custom properties
2. update_theme_config { path: "color.primary", value: "#exact-color-from-css" }
   → Apply each extracted value
```

### Discover and explore component tokens

```
1. list_components → See all 50 components by category
2. list_components { category: "forms" } → Filter to form components
3. get_component_tokens { component: "button" } → See all button tokens with variants/states
```

### Customize a component's styling

```
1. get_component_tokens { component: "hero" } → See all hero tokens
2. search_component_tokens { property: "color", state: "hover" } → Find hover color tokens
3. search_component_tokens { valueType: "global-reference", component: "hero" } → See which globals hero uses
```

### Combine image + CSS for best results

```
1. extract_theme_from_css { url: "https://example.com" }
   → Get exact values (colors, font families, sizes)
2. generate_theme_from_image { imageUrl: "https://screenshot-url.png" }
   → Get visual cues (spacing density, personality, layout rhythm)
3. update_theme_config for each value
```

## Error Handling

All errors return consistent JSON:

```json
{
  "error": "Error message",
  "tool": "tool_name",
  "timestamp": "2026-01-22T12:00:00.000Z"
}
```

## Requirements

- Node.js 16+ (ES modules support)
- @modelcontextprotocol/sdk ^1.25.3

## Environment Variables

| Variable        | Description                         | Default      |
| --------------- | ----------------------------------- | ------------ |
| `MCP_TRANSPORT` | Transport mode: `stdio` or `http`   | `stdio`      |
| `PORT`          | HTTP server port (when `http` mode) | `3000`       |
| `NODE_ENV`      | Environment mode                    | `production` |

## License

ISC
