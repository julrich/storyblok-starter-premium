# Task List: Expose Component Tokens via MCP

**PRD:** [PRD-component-tokens.md](../prd/design-tokens-mcp-prd-component-tokens.md)
**Date:** 2026-02-12
**Status:** ✅ Complete

---

## Phase 1 — Data Layer (Foundation)

### 1.1 Component Token File Registry

- [x] Define `COMPONENT_TOKEN_FILES` map with all 50 entries (file name, component slug, category, description)
- [x] Define `COMPONENT_CATEGORIES` map grouping components into semantic categories (navigation, content, blog, cards, heroes, forms, layout, data-display, utility)
- [x] Add `COMPONENT_TOKENS_DIR` constant pointing to `tokens/componentToken/`

### 1.2 Token Name Parser

- [x] Implement `parseComponentTokenName(name)` function that decomposes `--dsa-{component}[__{element}][_{variant}]--{property}[_{state}]` into structured parts
- [x] Handle edge cases: multi-word component names (`teaser-card`, `nav-flyout`), multi-word elements (`tag-label`, `toggle-more`), multi-word variants (`color-neutral`, `highlight-text`)
- [x] Verified with button (28 tokens, 6 variants, 2 states), hero (24 tokens, 4 variants, 5 elements), section, teaser-card, headline components

### 1.3 Token Value Classifier

- [x] Implement `classifyTokenValue(value)` that returns `"literal"`, `"global-reference"`, `"component-reference"`, or `"calculated"`
- [x] Extract referenced token name from `var()` expressions (handle `var(--xxx, fallback)` with fallbacks)
- [x] Classify `calc(...)` containing `var()` as `"calculated"`

### 1.4 Component Token Parser

- [x] Implement `parseAllComponentTokens(componentFilter?)` that reads SCSS files from `componentToken/` directory
- [x] Reuse existing `parseTokenFile()` for the low-level CSS custom property extraction
- [x] Enrich each parsed token with: `component`, `element`, `variant`, `cssProperty`, `state`, `valueType`, `referencedToken`
- [x] Fixed `parseTokenFile` regex to support underscore characters in token names (`[a-zA-Z0-9_-]+`)
- [x] Skip empty files gracefully (return 0 tokens, don't error)

---

## Phase 2 — New MCP Tools

### 2.1 `list_components` Tool

- [x] Add tool definition to `ListToolsRequestSchema` handler with name, description, and input schema
- [x] Implement handler in `CallToolRequestSchema` switch
- [x] For each component: return `name`, `slug`, `category`, `file`, `tokenCount`, `description`, `hasResponsiveOverrides`, `tokenPropertyTypes`
- [x] Support `category` filter parameter (9 categories + "all")
- [x] Sort components alphabetically by slug
- [x] Support `includeEmpty` flag (default: false, excludes 0-token components)

### 2.2 `get_component_tokens` Tool

- [x] Add tool definition with `component` (required), `element`, `property`, `statesOnly` parameters
- [x] Implement handler: load tokens for the requested component, apply filters
- [x] Return enriched token records with `valueType`, `element`, `variant`, `cssProperty`, `state`, `referencedToken`
- [x] Include a `summary` object listing all unique variants, elements, states, and property types for the component
- [x] Return helpful error message with suggestions when component slug is not found

### 2.3 `search_component_tokens` Tool

- [x] Add tool definition with `pattern` (required), `searchIn`, `component`, `category`, `limit` parameters
- [x] Implement handler: load all component tokens, apply search pattern to names/values/comments/component
- [x] Support filtering by component slug and category
- [x] Sort results by component then token name
- [x] Paginate with `limit` (default 50)
- [x] Include component name and category in each result for context

---

## Phase 3 — Extend Existing Tools

### 3.1 Extend `list_tokens`

- [x] Add `includeComponentTokens` boolean parameter to input schema (default: `false`)
- [x] When `true`, merge component tokens into the result set with `source: "component"` marker
- [x] Existing `file`, `category`, `prefix` filters work with component tokens
- [x] Result metadata includes component token state

### 3.2 Extend `search_tokens`

- [x] Add `includeComponentTokens` boolean parameter (default: `false`)
- [x] When `true`, search across both global and component tokens
- [x] Merge and sort results; indicate `source` (global vs component) in each result

### 3.3 Extend `get_token_stats`

- [x] Add `componentTokens` section to stats output
- [x] Include: total component tokens (728), per-component counts, per-category counts, per-property-type counts
- [x] Include: top referenced global tokens (top 20 most-referenced `--ks-*` tokens by components)

### 3.4 Extend `list_files`

- [x] Include component token files in the file listing (50 files)
- [x] Add `type: "component"` discriminator to differentiate from `type: "global"` files
- [x] Include component slug and category for each component file
- [x] Response includes `globalFiles` and `componentFiles` counts

---

## Phase 4 — Quality & Polish

### 4.1 Component Descriptions

- [x] Written concise, accurate descriptions for all 50 components (used in `list_components` and `list_files`)
- [x] Include key variants, notable features, and typical use cases in each description

### 4.2 Testing

- [x] Tested `list_components` with no filter (46 results) and `forms` category filter (8 results)
- [x] Tested `get_component_tokens` for button (28 tokens), hero (24 tokens), and verified variant/state/element parsing
- [x] Tested `search_component_tokens` with `hover` pattern (54 matches across all components)
- [x] Tested `get_token_stats` — 1066 global + 728 component tokens, with per-category breakdowns
- [x] Tested `list_files` — 63 total files (13 global + 50 component), with type discriminators
- [x] Tested error case: unknown component slug returns suggestions (e.g., "card" → suggests "business-card", "teaser-card")

### 4.3 Documentation

- [x] Update README.md with new tool descriptions and example queries
- [x] Add component token section to the tool listing
- [x] Document typical workflows (discover → inspect → search)
- [x] Update version number to 4.0.0 in package.json and server metadata

### 4.4 Performance Validation

- [x] `list_components` responds in < 2 seconds
- [x] `get_component_tokens` for a single component responds in < 500ms
- [x] `search_component_tokens` full scan responds in < 3 seconds
