# Quick Start Guide

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Test the server:**
   ```bash
   npm start
   ```
   The server will start and wait for MCP client connections via stdio.

## Configuration

### For Claude Desktop

1. Open Claude Desktop settings
2. Navigate to Developer → Edit Config
3. Add the server configuration:

```json
{
  "mcpServers": {
    "design-tokens": {
      "command": "node",
      "args": [
        "/home/julrich/Projects/kickstartDS/code/ds-agency-premium-mcp-demo/design-tokens-mcp/index.js"
      ]
    }
  }
}
```

4. Restart Claude Desktop

## Usage Examples

Once connected to an MCP client (like Claude), you can use natural language:

### Explore the Token System

- "List all token files"
- "Show me token statistics"
- "What branding tokens are available?"

### Get Specific Tokens

- "What's the value of the primary brand color?"
- "Show me the ks-brand-color-primary token"

### List and Filter Tokens

- "List all color tokens"
- "Show tokens from the spacing file"
- "List tokens with prefix ks-background-color"

### Search Tokens

- "Find all tokens with 'primary' in the name"
- "Search for tokens with the value '#3065c0'"
- "Show tokens related to hover states"

### Domain-Specific Queries

- "Show the color palette for primary colors"
- "Get all typography tokens for display fonts"
- "List spacing tokens for size 'm'"
- "Find all interactive state tokens"

### Update Tokens

- "Change the primary color to #4075d0"
- "Update ks-brand-color-bg to #f5f5f5"

### Generate a Theme from an Image or Website

- "Generate a branding theme from this screenshot" (attach an image)
- "Extract a theme from https://example.com based on its CSS"
- "Analyze the CSS of https://example.com and create matching branding tokens"
- "Look at this website image and suggest branding tokens that match its style"

### Explore Component Tokens

- "List all available components"
- "Show me the form components"
- "What tokens does the button component have?"
- "Show me all hover state tokens across components"
- "Which component tokens reference the primary color?"
- "Search for color tokens in the hero component"

## Available Tools (16 total)

| Tool                        | Purpose                                               |
| --------------------------- | ----------------------------------------------------- |
| `get_token`                 | Get a specific token's value                          |
| `list_tokens`               | List tokens with filters (file, category, prefix)     |
| `list_files`                | Show all token files with counts                      |
| `get_token_stats`           | Get token distribution statistics                     |
| `search_tokens`             | Search by pattern in names/values                     |
| `get_tokens_by_type`        | Filter by semantic type (interactive, inverted, etc.) |
| `get_color_palette`         | Get colors by type (primary, positive, etc.)          |
| `get_typography_tokens`     | Get font-related tokens                               |
| `get_spacing_tokens`        | Get spacing tokens by size/type                       |
| `get_branding_tokens`       | Get core editable brand tokens                        |
| `update_token`              | Modify a token value                                  |
| `generate_theme_from_image` | Generate a theme from a screenshot or design image    |
| `extract_theme_from_css`    | Extract a theme from a website's CSS                  |
| `list_components`           | List all components with categories and token counts  |
| `get_component_tokens`      | Get enriched tokens for a specific component          |
| `search_component_tokens`   | Search component tokens by pattern, property, state   |

## Verifying It Works

After configuration, ask your MCP client:
"List all token files with their token counts"

If successful, you'll see a JSON response with the 12 global token files and their statistics.

You can also try:
"List all available components" — this should return all 50 components organized by category.

## Troubleshooting

### Server won't start

- Verify Node.js version: `node --version` (needs 16+)
- Check dependencies: `npm install`

### MCP client can't connect

- Check the absolute path in your config
- Ensure the config file is valid JSON
- Restart your MCP client after configuration changes

### Token not found

- Use `search_tokens` to find similar tokens
- Check for typos in token names
- Use `list_files` to see which file might contain it

### Changes not persisting

- Verify write permissions on token files
- Check for file system errors in the server logs

## Next Steps

- Explore the token architecture in the README
- Try different semantic type queries
- Modify branding tokens and see how derived tokens change
