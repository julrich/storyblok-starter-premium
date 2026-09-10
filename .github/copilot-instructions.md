# Copilot Instructions for kickstartDS Storyblok Starter

## Project Overview

This is a **pnpm workspaces monorepo** containing a Next.js 13 website, a design system with 74+ React components, three MCP servers, a shared services library, an n8n community node, and two editor UIs — all powered by the **kickstartDS** design system (`@kickstartds/design-system`).

### Monorepo Structure

```
packages/
  design-system/          — Core Design System (74+ React components, tokens, Storybook, Playroom)
  website/                — Next.js 13 site (Storyblok CMS, ISR, Visual Editor)
  storyblok-services/     — Shared library (schema, validation, transforms)
  shared-auth/            — Shared JWT authentication library (HS256 verification, revocation)
  storyblok-mcp/          — Storyblok MCP server (content generation, CMS tools)
  storyblok-n8n/          — n8n community node for Storyblok workflows
  component-builder-mcp/  — MCP server (component-building instructions & templates)
  design-tokens-mcp/      — MCP server (design token querying, analysis, governance)
  design-tokens-editor/   — Browser-based Design Token WYSIWYG editor (Vite SPA + Express, Kamal/Docker)
  schema-layer-editor/    — Schema Layer Editor (Vite SPA)
```

**Package manager:** pnpm 10.30.3 (declared in root `packageManager` field)
**Versioning:** Changesets (`@changesets/cli`) for independent per-package publishing

### Key Commands (run from monorepo root)

```bash
pnpm install                              # Install all workspaces
pnpm -r run build                         # Build all packages (topological order)
pnpm --filter website dev                 # Start website dev server
pnpm --filter storyblok-mcp dev           # Start MCP server in dev mode
pnpm --filter @kickstartds/design-system storybook  # Start Storybook dev server
pnpm --filter @kickstartds/design-system build      # Build design system (tokens → schema → rollup)
pnpm --filter design-tokens-editor dev    # Start token editor dev server (port 5173)
pnpm --filter component-builder-mcp dev   # Start component builder MCP in watch mode
pnpm --filter design-tokens-mcp dev       # Start design tokens MCP in watch mode
pnpm changeset                            # Create a new changeset
pnpm version-packages                     # Bump versions from changesets
pnpm publish-packages                     # Publish to npm
```

## Architecture

### Data Flow

```
Storyblok CMS → storyblok.ts (fetch/transform) → unflatten() → React Components
```

- **Storyblok stores flattened props** (e.g., `image_src`, `image_alt`) which get transformed via `unflatten()` in [packages/website/helpers/unflatten.ts](packages/website/helpers/unflatten.ts) into nested objects (`{ image: { src, alt } }`)
- **Story processing** in [packages/website/helpers/storyblok.ts](packages/website/helpers/storyblok.ts#L70-L200) handles asset URLs, link resolution, and global references

### Component Registration Pattern

All Storyblok components are registered in [packages/website/components/index.tsx](packages/website/components/index.tsx):

```tsx
export const components = {
  page: editablePage,
  section: editable(Section, "components"), // "components" = nested bloks key
  hero: editable(Hero),
  // ...
};
```

The `editable()` HOC wraps kickstartDS components with `storyblokEditable()` for Visual Editor support.

### Page Types

- **page**: Standard pages ([packages/website/components/Page.tsx](packages/website/components/Page.tsx))
- **blog-post**: Blog articles ([packages/website/components/BlogPost.tsx](packages/website/components/BlogPost.tsx))
- **blog-overview**: Blog listing
- **event-list**, **event-detail**: Events
- **search**: Site search with Pagefind

### Provider Hierarchy

App providers in [packages/website/pages/\_app.tsx](packages/website/pages/_app.tsx#L108-L175):

```
LanguageProvider → BlurHashProvider → DsaProviders → ComponentProviders → ImageSizeProviders → ImageRatioProviders
```

[packages/website/components/ComponentProviders.tsx](packages/website/components/ComponentProviders.tsx) provides custom implementations for `Picture`, `Link`, and various kickstartDS contexts.

## Key Conventions

### Component Customization

Override kickstartDS components via React Context:

```tsx
// In ComponentProviders.tsx
<PictureContext.Provider value={CustomPicture} {...props} />
```

### Local Component Extensions

Custom components live in `packages/website/components/{name}/`:

- [packages/website/components/prompter/](packages/website/components/prompter/) - In-Visual-Editor AI content generation (see **Prompter Architecture** section below)
- [packages/website/components/info-table/](packages/website/components/info-table/) - Custom info table
- [packages/website/components/headline/](packages/website/components/headline/) - Extended headline

### TypeScript Types

- **Generated types**: [packages/website/types/components-schema.d.ts](packages/website/types/components-schema.d.ts) from Storyblok schema
- Regenerate with: `pnpm --filter website generate-content-types`

## Design Tokens

### Token Architecture (3 layers)

1. **Branding** (`--ks-brand-*`): Core values in [packages/website/token/branding-token.css](packages/website/token/branding-token.css)
2. **Semantic** (`--ks-*`): Purpose-based tokens in `packages/website/token/*.scss`
3. **Component** (`--dsa-*`): Component-specific customizations

### Token Commands

```bash
pnpm --filter website extract-tokens   # Extract component tokens
```

## Developer Workflows

### Local Development

```bash
pnpm -r run build            # Full build (required before dev)
pnpm --filter website dev    # Start dev server with SSL proxy on :3010
```

Set Storyblok Visual Editor preview URL to `https://localhost:3010/api/preview/`

### CMS Sync Commands

```bash
pnpm --filter website update-storyblok-config  # Full workflow: generate → rename → pull → merge → push
pnpm --filter website push-components          # Push merged config from cms/merged/ to Storyblok
pnpm --filter website pull-content-schema      # Pull schema from Storyblok → types/
pnpm --filter website create-storyblok-config  # Regenerate CMS config from JSON schemas
pnpm --filter website generate-content-types   # Pull + generate TypeScript types
```

### Build Pipeline

```bash
pnpm --filter website build  # Runs: build-tokens → extract-tokens → blurhashes → bundle-static-assets → next build → sitemap → pagefind
```

## Environment Variables

Required in `packages/website/.env.local`:

- `NEXT_STORYBLOK_API_TOKEN` - Preview API token
- `NEXT_STORYBLOK_OAUTH_TOKEN` - Management API token
- `NEXT_STORYBLOK_SPACE_ID` - Space ID (without #)
- `NEXT_OPENAI_API_KEY` - OpenAI API key (required for Prompter AI generation)
- `NEXT_PUBLIC_SITE_URL` - Public site URL (used for API route calls in the Visual Editor)

## Prompter Architecture

The Prompter is an **in-Visual-Editor AI content generation component**. Editors place it inside a section in Storyblok's Visual Editor to generate content via OpenAI.

### Two Generation Modes

- **Section mode** (default): Generate a single section — editor picks a component type, enters a prompt, content is generated and imported in one step
- **Page mode**: Multi-section generation — AI plans a section sequence, editor reviews the plan, then sections are generated one-by-one and imported together

### Component Structure

```
PrompterComponent.tsx          — Main UI with step-based flow
├── usePrompter.ts             — State machine hook (steps: configure → planning → plan-review → generating → preview → importing → submitted)
├── PrompterModeToggle.tsx     — Section/Page mode toggle
├── PrompterComponentPicker.tsx — Component type selector (section mode)
├── PrompterPlanReview.tsx     — Plan review/edit (page mode)
├── PrompterProgress.tsx       — Generation progress bar
├── PrompterWarnings.tsx       — Compositional quality warnings
├── prompter.schema.json       — JSON Schema (CMS fields: mode, componentTypes, contentType, startsWith, uploadAssets)
├── PrompterProps.ts           — TypeScript prop types
└── PrompterDefaults.ts        — Default prop values
```

### API Routes

All Prompter API routes live under `packages/website/pages/api/prompter/`:

| Route                            | Method | Purpose                                                                 |
| -------------------------------- | ------ | ----------------------------------------------------------------------- |
| `/api/prompter/story`            | GET    | Fetch a story by UID (server-side proxy, keeps token off the client)    |
| `/api/prompter/patterns`         | GET    | Fetch content patterns (component frequency, section sequences)         |
| `/api/prompter/recipes`          | GET    | Fetch section recipes and anti-patterns                                 |
| `/api/prompter/plan`             | POST   | AI-assisted page structure planning (requires OpenAI key)               |
| `/api/prompter/generate-section` | POST   | Generate a single section with site-aware context (requires OpenAI key) |
| `/api/prompter/import`           | POST   | Import generated content into Storyblok story                           |
| `/api/prompter/ideas`            | GET    | Fetch Storyblok Ideas for seed content                                  |

**Deprecated routes** (sunset 2026-06-01): `/api/content`, `/api/import`, `/api/ideas` — replaced by the routes above.

### Data Flow

```
Visual Editor → usePrompter hook → /api/prompter/* routes → storyblok-services → OpenAI / Storyblok API
```

## MCP Server

The project includes a Storyblok MCP server ([packages/storyblok-mcp/](packages/storyblok-mcp/)) that exposes CMS tools to AI assistants via the Model Context Protocol.

The MCP server supports **auto-schema derivation**: the `generate_content` and `generate_section` tools can automatically derive OpenAI-compatible schemas from the kickstartDS Design System schema (via `componentType` or `sectionCount` parameters), and import tools automatically run `processForStoryblok()` to convert Design System props into Storyblok's flat format.

Current main MCP spec: https://modelcontextprotocol.io/specification/2025-11-25
Current main MCP Schema Reference: https://modelcontextprotocol.io/specification/2025-11-25/schema
Current MCP Apps: Interactive User Interfaces for MCP spec: https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx

### Multi-Content-Type Support

The MCP server supports **5 root content types** via a schema registry:

- **Tier 1 (section-based):** `page`, `blog-post`, `blog-overview` — these have a root array of polymorphic sections
- **Tier 2 (flat):** `event-detail`, `event-list` — these use root-level scalar/array/object fields without sections

All generation, import, and validation tools accept a `contentType` parameter (default: `"page"`). The schema registry automatically loads dereferenced schemas from `packages/storyblok-mcp/schemas/` and builds content-type-specific validation rules. Key tools with `contentType` support:

- `generate_section(componentType: "hero", contentType: "blog-post")` — generates a single section using blog-post schema (preferred for interactive use)
- `generate_content(contentType: "blog-post", componentType: "hero")` — bulk generation using blog-post schema (for automation only)
- `plan_page(intent: "...", contentType: "event-detail")` — returns a field population plan for flat types
- `import_content_at_position(contentType: "blog-post", targetField: "section")` — specifies target array
- `create_page_with_content(contentType: "event-detail", sections: [], rootFields: { title: "...", categories: [...] })` — the `rootFields` parameter sets root-level fields for flat content types
- `list_recipes(contentType: "blog-post")` — filters recipes by content type
- `analyze_content_patterns(contentType: "blog-post")` — analyzes patterns for specific content types

For Tier 2 types, `plan_page` returns a field population plan (`fields` array) instead of a section sequence.

The `import_content`, `import_content_at_position`, `create_page_with_content`, `replace_section`, and `update_seo` tools all support **automatic asset upload**: when `uploadAssets: true` is passed, any image URLs in the content (e.g. from DALL·E, scraped pages, or other external sources) are downloaded and uploaded to Storyblok as native assets before the story is saved. The original URLs are replaced with Storyblok CDN URLs. An optional `assetFolderName` parameter controls which Storyblok asset folder images are uploaded to (defaults to "AI Generated"). **Always pass `uploadAssets: true`** when creating or importing content that contains external image URLs — images should never reference third-party domains in published stories.

The `list_icons` tool returns all available icon identifiers (e.g. `arrow-right`, `star`, `email`, `phone`) that can be used in component icon fields such as hero `cta_icon`, feature `icon`, or contact-info `icon`. Always call `list_icons` before generating or importing content that includes icon fields to ensure only valid identifiers are used.

The `list_stories` tool **returns metadata-only by default** (`excludeContent: true`): IDs, slugs, names, timestamps, and published status — no `content` field. This keeps responses small (~1,250 tokens for 25 stories vs ~125,000 with full content). Pass `excludeContent: false` only when your workflow needs to inspect `story.content` (e.g. content audits, SEO analysis, broken asset detection). The `get_story` and `search_content` tools automatically strip empty Storyblok asset boilerplate fields to further reduce response size.

The MCP server supports **guided content generation** via six tools that produce higher-quality content than generating entire pages at once:

- **`analyze_content_patterns`** — Returns structural patterns (component frequency, section sequences, sub-component item counts, page archetypes, field value distributions) from a **startup cache** — instant, no API call. The cache is also used internally by `plan_page`, `generate_section`, and `list_recipes`. Pass `refresh: true` after publishing new content to re-fetch.
- **`list_recipes`** — Returns curated section recipes, page templates, and anti-patterns, optionally merged with live patterns from `analyze_content_patterns`.
- **`plan_page`** — AI-assisted page structure planning. Takes an intent (e.g. "product landing page") and returns a recommended section sequence based on available components and site patterns. Accepts an optional `startsWith` parameter (e.g. `"case-studies/"`) to fetch patterns only from stories matching that slug prefix, instead of using the global startup cache — useful for creating pages that match the style of a specific site section. For **hybrid content types** (e.g. `blog-post`, `blog-overview`), also returns `rootFieldMeta` with priority annotations (`required`, `recommended`, `optional`) for non-section root fields. Requires OpenAI API key.
- **`generate_section`** — Generates a single section with automatic site-aware context injection. Auto-injects sub-component counts, component frequency, transition context (`previousSection`/`nextSection`), recipe best practices, and **field-level compositional guidance** (field value distributions from existing content + composition hints from recipes) into the system prompt. Accepts an optional `startsWith` parameter to use filtered patterns from a specific site section instead of the global startup cache. Requires OpenAI API key.
- **`generate_root_field`** — Generates content for a single root-level field on a content type (e.g. `head`, `aside`, `cta` on `blog-post`). Extracts the field's sub-schema, generates via OpenAI structured output, and returns Storyblok-ready content. Use after `plan_page` returns `rootFieldMeta` for hybrid types. Requires OpenAI API key.
- **`generate_seo`** — Generates SEO metadata (title, description, keywords, OG image) for any content type that has a `seo` root field. Uses a specialized SEO-expert system prompt. Pass the page content summary as the prompt. Requires OpenAI API key.

The recommended workflow for multi-section pages is: `analyze_content_patterns` → `plan_page` → `generate_section` (per section) → `create_page_with_content`. For **hybrid content types** like `blog-post`, extend the workflow: `plan_page` → `generate_section` (per section) → `generate_root_field` (per root field) → `generate_seo` → `create_page_with_content(sections: [...], rootFields: { head, aside, cta, seo })`. See [docs/skills/plan-page-structure.md](docs/skills/plan-page-structure.md) for the full workflow.

The `create_page_with_content` and `create_story` tools support **automatic folder creation** via the `path` parameter: provide a forward-slash-separated folder path (e.g. `path: "en/services/consulting"`) and missing intermediate folders are created automatically, like `mkdir -p`. The `path` parameter is mutually exclusive with `parentId` — use one or the other. A standalone `ensure_path` tool is also available for pre-creating folder hierarchies (useful for sitemap migration workflows where the folder tree should be established before pages are created in parallel).

Section recipes are also available as an MCP resource (`recipes://section-recipes`) with 19 proven component combinations (14 page-specific, 3 blog-post-specific, 2 event-specific), 14 page templates, and 13 anti-patterns (10 universal, 3 blog-post-specific). All recipes and templates are tagged with a `contentType` — the `list_recipes` tool filters by content type so that e.g. `blog-post` only receives blog-appropriate recipes (text and split-even focused, no hero or cta sections). Anti-patterns are also filtered by content type.

All write tools (`create_story`, `update_story`, `import_content`, `import_content_at_position`, `create_page_with_content`, `replace_section`) validate content against the Design System schema before writing to Storyblok. Validation rules are derived automatically from the dereferenced schema for each content type — no component names or nesting rules are hardcoded. Validation catches unknown component types, nesting violations, sub-component misplacement, and dual-discriminator conflicts (`type` + `component` on the same node). Write tools also return **compositional quality warnings** (non-blocking) for issues like duplicate heroes, sparse sub-items, missing CTAs, redundant section headlines, competing CTAs, inappropriate content_mode, and first-section spacing. Storyblok content must only use `component` as its discriminator — `type` is reserved for user-facing variant props (e.g. CTA visual style). `processForStoryblok()` enforces this by moving `type` → `component` and deleting the original `type`, with a final safety pass to strip any leftover `type` from nodes that already carry `component`. All validated tools accept `skipValidation: true` as an escape hatch. The `list_components` and `get_component` introspection tools annotate their output with nesting and composition rules so LLMs understand where components can be placed.

The `ensure_path` tool creates folder hierarchies idempotently (like `mkdir -p`) and returns the folder ID of the deepest folder. Use it for sitemap migration or when you need to pre-create a folder tree before bulk page creation.

The MCP server provides two **convenience tools** for targeted, low-token-cost updates:

- **`replace_section`** — Surgically replace a single section in a story by zero-based index. Accepts `storyUid`, `position` (0-based, -1 for last), and a `section` object. Goes through the full validation/transform pipeline. Use this instead of `update_story` when you only need to swap one section — avoids fetching and resubmitting the entire content tree.
- **`update_seo`** — Set or update SEO metadata fields (`title`, `description`, `keywords`, `image`, `cardImage`) on any story. Accepts `storyUid` and a `seo` object with the fields to set. Auto-creates the SEO component if the story doesn't have one yet. Only merges provided fields — omitted fields are left unchanged. Use this instead of `update_story` when you only need to touch SEO metadata.

Both tools support `publish`, `uploadAssets`, and `assetFolderName` parameters.

### MCP Prompts

The MCP server exposes **6 guided workflow prompts** via `prompts/list` and `prompts/get`. Each prompt returns a user+assistant message pair that instructs the LLM through a multi-step workflow using the available tools:

| Prompt             | Required Args                  | Workflow                                                                                                                                               |
| ------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `create-page`      | `intent`                       | `analyze_content_patterns` → `plan_page` → `generate_section` (×N) → `generate_seo` → `create_page_with_content`                                       |
| `migrate-from-url` | `url`                          | `scrape_url` → `analyze_content_patterns` → `plan_page` → `generate_section` (×N) → `create_page_with_content`                                         |
| `create-blog-post` | `topic`                        | `plan_page(contentType: 'blog-post')` → `generate_section` (×N) → `generate_root_field` (head/aside/cta) → `generate_seo` → `create_page_with_content` |
| `content-audit`    | —                              | `content_audit` (images, content, SEO, freshness, composition) → `analyze_content_patterns` → structured report with health score                      |
| `extend-page`      | `storyId`                      | `get_story` → `generate_section` (×N) → `import_content_at_position`                                                                                   |
| `translate-page`   | `sourceSlug`, `targetLanguage` | `get_story` → `generate_section` (×N, same componentTypes) → `generate_seo` → `create_page_with_content`                                               |

Prompts are discoverable by any MCP client that supports the `prompts` capability. They appear as slash commands or in prompt picker UIs.

### Structured Output & Elicitation

The MCP server declares `outputSchema` on write and generation tools so clients can parse results programmatically. Write tools return structured results with `success`, `storyId`, `storySlug`, `warnings` (compositional quality), and resource link annotations.

The server also supports **elicitation** — interactive form-based prompts during tool execution:

- `generate_section`: Elicits a component type picker when `componentType` is omitted
- `plan_page`: Elicits plan review (approve/modify/cancel) after plan generation
- `create_page_with_content`: Elicits publish confirmation after page creation
- `delete_story`: Elicits delete confirmation before permanent deletion

All elicitation uses graceful degradation via `tryElicit()` — clients that don't support elicitation get sensible defaults or error messages with available options.

### Progress Notifications & UI Previews

Multi-step tools (`generate_section`, `create_page_with_content`) emit progress notifications with step counts. The server declares `listChanged: true` on all three capabilities (tools, resources, prompts).

When connected to clients supporting the **MCP Apps extension** (`@modelcontextprotocol/ext-apps`), the server provides interactive HTML previews via `ui://` resources (section preview, page preview, plan review) with approve/reject/modify action bars, rendered with actual kickstartDS React components.

### Transport Modes

- **stdio** (default): For local usage with Claude Desktop — `npm start`
- **http**: For cloud deployment via Streamable HTTP — `MCP_TRANSPORT=http npm start`
  - Exposes `/mcp` (Streamable HTTP endpoint) and `/health` (health check)
  - Port configured via `MCP_PORT` (default: 8080)

### Cloud Deployment

The MCP server has its own Kamal config at [config/deploy-storyblok-mcp.yml](config/deploy-storyblok-mcp.yml) and deploys to the same server as the main site under a separate subdomain.

```bash
kamal deploy -d storyblok-mcp    # Deploy MCP server
kamal setup -d storyblok-mcp     # First-time setup
```

Key env vars for deployment: `DOCKER_MCP_IMAGE_NAME`, `MCP_PUBLIC_DOMAIN`, `HOSTING_SERVER_IP`, `STORYBLOK_API_TOKEN`, `STORYBLOK_OAUTH_TOKEN`, `STORYBLOK_SPACE_ID`, `OPENAI_API_KEY`.

## Important Files

- [packages/website/cms/components.123456.json](packages/website/cms/components.123456.json) - Generated Storyblok component definitions (source, renamed to `.generated.json` during merge workflow)
- [packages/website/cms/presets.123456.json](packages/website/cms/presets.123456.json) - Generated component presets (source, renamed to `.generated.json` during merge workflow)
- [packages/website/scripts/mergeStoryblokConfig.ts](packages/website/scripts/mergeStoryblokConfig.ts) - Merge script: combines generated config with live config, preserving manual fields
- [packages/website/helpers/storyblok.ts](packages/website/helpers/storyblok.ts) - Storyblok API utilities and story transformations
- [packages/website/scripts/prepareProject.js](packages/website/scripts/prepareProject.js) - Project initialization script (should never be run by Copilot)
- [config/deploy-storyblok-mcp.yml](config/deploy-storyblok-mcp.yml) - Kamal deployment config for the MCP server
- [config/deploy-website.yml](config/deploy-website.yml) - Kamal deployment config for the main Next.js site
- [packages/storyblok-services/src/schema.ts](packages/storyblok-services/src/schema.ts) - Schema preparation for OpenAI structured output (15 transformation passes)
- [packages/storyblok-services/src/transform.ts](packages/storyblok-services/src/transform.ts) - Content transformation (OpenAI ↔ Design System ↔ Storyblok)
- [packages/storyblok-services/src/pipeline.ts](packages/storyblok-services/src/pipeline.ts) - End-to-end content generation pipeline
- [packages/storyblok-services/src/validate.ts](packages/storyblok-services/src/validate.ts) - Schema-driven content validation (nesting rules, component hierarchy) and compositional quality warnings
- [packages/storyblok-services/src/registry.ts](packages/storyblok-services/src/registry.ts) - Schema registry for multi-content-type support (loads all root content type schemas)
- [packages/storyblok-services/src/assets.ts](packages/storyblok-services/src/assets.ts) - Asset download, upload to Storyblok, and URL rewriting
- [packages/storyblok-services/src/patterns.ts](packages/storyblok-services/src/patterns.ts) - Content pattern analysis (component frequency, section sequences, sub-component counts, page archetypes, field profiles)
- [packages/storyblok-services/src/guidance.ts](packages/storyblok-services/src/guidance.ts) - Field-level compositional guidance (field discovery, distribution tracking, pruning, prompt assembly)
- [packages/storyblok-services/src/plan.ts](packages/storyblok-services/src/plan.ts) - Page planning (`planPageContent()`) — AI-assisted section sequence via OpenAI, extracted from MCP server
- [packages/storyblok-services/src/generate-section.ts](packages/storyblok-services/src/generate-section.ts) - Single-section generation (`generateSectionContent()`) with site-aware context injection, extracted from MCP server
- [packages/storyblok-mcp/schemas/section-recipes.json](packages/storyblok-mcp/schemas/section-recipes.json) - Curated section recipes, page templates, and anti-patterns
- [packages/storyblok-mcp/src/prompts.ts](packages/storyblok-mcp/src/prompts.ts) - 6 MCP prompt definitions + message generator
- [packages/storyblok-mcp/src/output-schemas.ts](packages/storyblok-mcp/src/output-schemas.ts) - Output schemas for 15 tools + annotation helpers
- [packages/storyblok-mcp/src/elicitation.ts](packages/storyblok-mcp/src/elicitation.ts) - tryElicit() helper + 5 pre-built elicitation form schemas
- [packages/storyblok-mcp/src/progress.ts](packages/storyblok-mcp/src/progress.ts) - ProgressReporter class for step-by-step progress notifications
- [packages/storyblok-mcp/src/ui/](packages/storyblok-mcp/src/ui/) - MCP Apps extension: interactive HTML previews, app-only tools, theme bridge
- [packages/storyblok-n8n/nodes/StoryblokKickstartDs/StoryblokKickstartDs.node.ts](packages/storyblok-n8n/nodes/StoryblokKickstartDs/StoryblokKickstartDs.node.ts) - Main n8n node implementation (28 operations across 4 resources)
- [packages/storyblok-n8n/nodes/StoryblokKickstartDs/GenericFunctions.ts](packages/storyblok-n8n/nodes/StoryblokKickstartDs/GenericFunctions.ts) - Re-exports from shared services for use in n8n node
- [packages/design-system/rollup.config.mjs](packages/design-system/rollup.config.mjs) - Design system Rollup build config (component bundling, token extraction)
- [packages/design-system/.storybook/main.ts](packages/design-system/.storybook/main.ts) - Storybook configuration (addons, framework, stories)
- [packages/design-system/sd.config.cjs](packages/design-system/sd.config.cjs) - Style Dictionary config (default theme token compilation)
- [packages/component-builder-mcp/src/index.ts](packages/component-builder-mcp/src/index.ts) - Component builder MCP server entry point
- [packages/component-builder-mcp/src/handlers.ts](packages/component-builder-mcp/src/handlers.ts) - Template generators for component scaffolding
- [packages/design-tokens-mcp/src/index.ts](packages/design-tokens-mcp/src/index.ts) - Design tokens MCP server entry point
- [packages/design-tokens-mcp/src/handlers.ts](packages/design-tokens-mcp/src/handlers.ts) - Token query/update dispatch handlers
- [packages/design-tokens-mcp/src/parser.ts](packages/design-tokens-mcp/src/parser.ts) - CSS custom property parsing and analysis
- [packages/design-tokens-editor/src/App.tsx](packages/design-tokens-editor/src/App.tsx) - Token editor main app component
- [packages/design-tokens-editor/src/server/index.ts](packages/design-tokens-editor/src/server/index.ts) - Token editor Express backend (Storyblok Management API CRUD)
- [packages/website/components/prompter/PrompterComponent.tsx](packages/website/components/prompter/PrompterComponent.tsx) - Prompter main UI component
- [packages/website/components/prompter/usePrompter.ts](packages/website/components/prompter/usePrompter.ts) - Prompter state machine hook
- [packages/website/pages/api/prompter/\_helpers.ts](packages/website/pages/api/prompter/_helpers.ts) - Shared helpers for Prompter API routes
- [docs/internal/prd/prompter-reactivation-prd.md](docs/internal/prd/prompter-reactivation-prd.md) - Prompter reactivation PRD (all 5 phases)
- [docs/skills/plan-page-structure.md](docs/skills/plan-page-structure.md) - Section-by-section generation workflow guide
- [docs/internal/plans/guided-generation-plan.md](docs/internal/plans/guided-generation-plan.md) - Design document for guided content generation

## n8n Community Node

The project includes an n8n community node package ([packages/storyblok-n8n/](packages/storyblok-n8n/)) that provides **28 operations across 4 resources** for automating Storyblok content workflows without an LLM intermediary:

| Resource       | Operations | Description                                                                                  |
| -------------- | ---------- | -------------------------------------------------------------------------------------------- |
| **AI Content** | 7          | generate, import, generateSection, planPage, analyzePatterns, generateRootField, generateSeo |
| **Story**      | 8          | list, get, createPage, update, delete, replaceSection, updateSeo, search                     |
| **Space**      | 7          | scrapeUrl, listComponents, getComponent, listAssets, listRecipes, listIcons, ensurePath      |
| **Theme**      | 6          | list, get, apply, remove, create, update                                                     |

The n8n node consumes the same shared service library (`@kickstartds/storyblok-services`) as the MCP server, so validation, schema preparation, content transformation, and pattern analysis behave identically across both interfaces.

Ten workflow templates are included in `packages/storyblok-n8n/workflows/` covering content audit, blog autopilot, content migration, SEO fixes, section-by-section generation, broken asset detection, and bulk theme application.

## Design System

The core design system ([packages/design-system/](packages/design-system/)) provides **74+ React components**, design tokens, JSON Schemas, Storybook documentation, and Playroom prototyping. It publishes as `@kickstartds/design-system` and is consumed by `website`, `storyblok-mcp`, and `design-tokens-editor` via `workspace:*`.

### Build Pipeline

The design system build runs in sequence: tokens → schema → token extraction → branding tokens → rollup.

```bash
pnpm --filter @kickstartds/design-system build
```

1. **`build-tokens`** — Style Dictionary compiles 5 theme variations (DS Agency, Business, NGO, Google, Telekom) from `src/token*/dictionary/` JSON sources to CSS/SCSS/JS outputs
2. **`schema`** — 4 parallel tasks: dereference JSON Schemas, generate TypeScript prop types, layer types, create component defaults
3. **`token`** — Extracts CSS custom properties from compiled SCSS token files
4. **`branding-tokens`** — Builds branding token JSON outputs
5. **Rollup** — Bundles 74 components to ES modules (`dist/components/{name}/index.js`), CSS, JSON Schemas, token exports, icon sprite, and static assets
6. **`presets`** — Vitest runs `generatePresets.test.ts` to produce `snippets.json` (one entry per Storybook story with `id`, `group`, `name`, `code`, `args`, `screenshot`), then copies it to `dist/components/presets.json`

### Screenshot Pipeline

Preset screenshots are visual snapshots captured from a built Storybook via `@storybook/test-runner`. They live in `__snapshots__/` (source) and `static/img/screenshots/` (committed via Git LFS), and are copied to `dist/static/` by Rollup.

```
build-storybook → test-storybook (captures __snapshots__/*.png)
               → create-component-previews (copies to static/img/screenshots/)
               → build (Rollup copies static/ → dist/static/)
```

The `presets` step generates a screenshot path (`img/screenshots/{story.id}.png`) for **every** story, but the actual `.png` files only exist if `create-component-previews` has been run after those stories were added. After adding or renaming stories, run:

```bash
pnpm --filter @kickstartds/design-system build-storybook
pnpm --filter @kickstartds/design-system create-component-previews
```

Then commit the updated `__snapshots__/` and `static/img/screenshots/` files.

### Component Architecture

Each component follows a strict structure:

```
src/components/{name}/
  {Name}Component.tsx      — Pure React component (forwardRef, Context-overridable)
  {Name}Component.scss     — BEM-scoped styles using design tokens
  {Name}Component.client.ts — Client-side behavior (vanilla JS, no React state)
  {name}.schema.json       — JSON Schema (source of truth for props)
```

### Multi-Theme Support

5 pre-built theme variations compiled via Style Dictionary configs (`sd.config*.cjs`):

- DS Agency (default), Business, NGO, Google, Telekom

### Storybook & Playroom

- **Storybook** (v10.2.x): Full component documentation with a11y audits, design token display, MCP addon
- **Playroom** (port 9000): Interactive component prototyping with responsive previews (425/768/1440px)

## Design Tokens Editor

The design tokens editor ([packages/design-tokens-editor/](packages/design-tokens-editor/)) is a **browser-based visual token editor** (Vite SPA + Express backend) for non-technical editors to modify design tokens with live preview. Token themes are stored as `token-theme` content type stories in Storyblok under `settings/themes/`.

- **Tech stack**: React 19, Vite, MUI v7, JSON Forms (schema-driven UI), tinycolor2, Express backend
- **Deployment**: Kamal/Docker (Express serves Vite SPA + API routes) — config at [config/deploy-design-tokens-editor.yml](config/deploy-design-tokens-editor.yml)
- **Backend**: Express server manages `token-theme` stories via Storyblok Management API (CRUD at `/api/tokens/*`), auto-computes CSS from branding tokens on save
- **Private**: `private: true` — not published to npm
- **Dual entry points**: `index.html` (editor) + `preview.html` (preview-only)
- **Design system integration**: Imports `@kickstartds/design-system` (workspace:\*) for live component rendering with modified tokens

```bash
pnpm --filter design-tokens-editor dev   # Dev server on port 5173 (Vite proxies /api to Express)
```

## Component Builder MCP

The component builder MCP server ([packages/component-builder-mcp/](packages/component-builder-mcp/)) provides **component-building instructions and templates** to AI assistants. It is a read-only documentation server — no write operations.

### Tools (7, all read-only)

| Tool                           | Purpose                                                     |
| ------------------------------ | ----------------------------------------------------------- |
| `get-ui-building-instructions` | Comprehensive component development guidelines (call first) |
| `get-component-structure`      | File structure templates for new components                 |
| `get-json-schema-template`     | JSON Schema boilerplate for component props                 |
| `get-react-component-template` | React component boilerplate (forwardRef + Context)          |
| `get-client-behavior-template` | Vanilla JS client-side behavior templates                   |
| `get-scss-template`            | SCSS/BEM styling templates with token layers                |
| `get-storybook-template`       | Storybook story template                                    |

### Resources (3)

- `design-system://instructions` — UI building instructions
- `design-system://token-architecture` — Token layer architecture docs
- `design-system://components` — Component catalog listing

### Transport

- **stdio** (default): `npm start`
- **HTTP** (streamable): `npm run start:http`

## Design Tokens MCP

The design tokens MCP server ([packages/design-tokens-mcp/](packages/design-tokens-mcp/)) enables AI assistants to **query, search, analyze, and update design tokens** across 12 global + 50 component token files.

### Tools (29)

**Query/Search**: `get_token`, `list_tokens`, `search_tokens`, `get_tokens_by_type`, `list_files`, `get_token_stats`
**Color**: `get_branding_color_palette`, color-specific analysis tools
**Typography/Spacing**: `get_typography_tokens`, `get_spacing_tokens`
**Component tokens**: Query tokens for any of 50+ individual components
**Write**: `update_branding_token` — Modify token values
**Analysis**: `audit_tokens` — Quality checks (naming, refs, governance)
**Theme schema**: `get_theme_schema` — Returns W3C DTCG schema description with reference values for all branding token sections
**Theme validation**: `validate_theme` — Validates a W3C DTCG token object against the branding schema (stateless, no side effects)
**Theme listing**: `list_theme_values` — Flattens W3C DTCG tokens into a readable table; accepts optional `tokens` param for stateless use
**Theme generation**: `theme_from_image` (vision-based), `theme_from_css` (CSS extraction) — both output W3C DTCG tokens for use with `create_theme`

Branding tokens use **W3C Design Token Community Group (DTCG)** format. The recommended workflow for creating themes is: `get_theme_schema` → build W3C DTCG token object → `validate_theme` → `create_theme` (Storyblok MCP) or `update_theme`.

### Resources (4)

- `tokens://overview` — Summary stats (total tokens, files, categories)
- `tokens://files` — Token file catalog with descriptions
- `tokens://branding` — Current branding token values (W3C DTCG format)
- `tokens://components` — Component token catalog (50 files)

### Prompts (3 guided workflows)

| Prompt                     | Purpose                                 |
| -------------------------- | --------------------------------------- |
| `audit-tokens`             | Token quality audit workflow            |
| `update-branding`          | Guided branding token modification      |
| `explore-component-tokens` | Explore tokens for a specific component |

### Transport

- **stdio** (default): `npm start`
- **HTTP** (streamable): `npm run start:http` (port 8080)

### Token Sync

Tokens are synced from the design system at build time:

```bash
pnpm --filter design-tokens-mcp run sync-tokens  # Part of `build` script
```

## Common Patterns

### Adding a New Component to Storyblok

Always consult specialized MCP servers for the Design System for this:

1. Design System Component Builder MCP - for instructions on creating components
2. Design System Design Tokens MCP - for design token extraction and lookup

Steps:

1. Create component locally in `packages/website/components/`
2. Add to `components` map in [packages/website/components/index.tsx](packages/website/components/index.tsx)
3. Update `packages/website/components/section/section.schema.json` to include new component in the `anyOf` clause of the `components` field
4. Update `packages/website/package.json` to also include the new component schema in the `create-storyblok-config` script
5. Run `pnpm --filter website update-storyblok-config` to generate, merge, and push the updated CMS schema
6. Run `pnpm --filter website generate-content-types` to update TypeScript types

Important:

- Never create or use React state, always write indpendent, pure components, implementing client behaviour using vanilla JavaScript. See the Design System Component Builder MCP for more details.
- Always keep inside the already existing token definitions when adding styles to components, don't try to adopt the shown styling ever. Consult the Design System Design Tokens MCP for more details.
- Always check for existing Design System components before creating new ones, or using native HTML controls. E.g. use `Button` from kickstartDS instead of native `<button>`, the same for form fields. If in question, ask the Design System Storybook MCP.
- In the JSON Schema and prop naming, never use unspecific terms like `items`, prefer more specific names, or prefix with the component name, e.g. `timelineItems` for a Timeline component.
- CSS / SCSS should not be imported in created components, but instead be added to `index.scss` for global inclusion.

### Handling Nested Bloks

Use second argument in `editable()` for components with nested content:

```tsx
section: editable(Section, "components"),  // "components" is the blok field name
slider: editable(Slider, "components"),
```

## Authentication

All hosted services (3 MCP servers + Design Tokens Editor) use **JWT authentication** with HS256 (HMAC-SHA256), implemented in the shared `packages/shared-auth/` package.

### Architecture

- **Single shared secret** (`MCP_JWT_SECRET` env var) used across all 4 services
- **Graceful degradation**: when `MCP_JWT_SECRET` is unset, auth is disabled — backward-compatible for local development
- **Token issuance**: Admin-only via CLI script `scripts/issue-token.mjs`
- **Token revocation**: Comma-separated JTI blocklist via `MCP_REVOKED_TOKENS` env var

### MCP Server Auth (Storyblok MCP, Design Tokens MCP, Component Builder MCP)

- Bearer token in `Authorization` header: `Authorization: Bearer <jwt>`
- Auth guard runs after CORS/OPTIONS handling but before body parsing
- Returns JSON-RPC error `{code: -32001, message: "Unauthorized"}` on 401 with `WWW-Authenticate` header pointing to resource metadata
- MCP client config adds the header via `requestInit.headers`

### OAuth 2.1 Layer (claude.ai compatibility)

All three MCP servers expose a thin **OAuth 2.1 authorization code + PKCE** layer for clients like claude.ai that require OAuth instead of static Bearer tokens. Implemented in `packages/shared-auth/src/oauth.ts` via `createOAuthMiddleware()`.

- **Discovery**: `/.well-known/oauth-protected-resource` (RFC 9728) + `/.well-known/oauth-authorization-server-metadata` (RFC 8414)
- **Authorization**: `/authorize` — shows a token-paste form where the user pastes their pre-issued JWT
- **Token exchange**: `/token` — exchanges authorization code + PKCE `code_verifier` for the original JWT as `access_token`
- **Client registration**: `/register` — dynamic registration (RFC 7591), accepts any client
- The `access_token` returned by `/token` IS the pre-issued JWT — the existing auth guard handles it unchanged
- When `MCP_JWT_SECRET` is unset, the OAuth flow auto-approves without showing the form

### Design Tokens Editor Auth

- **Token-paste login**: User pastes a JWT into a login form, server verifies it and sets an `httpOnly` cookie
- **Routes**: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- **Middleware**: `requireAuth` protects all `/api/tokens/*` routes (accepts cookie or Bearer header)
- **SPA gating**: `main.tsx` checks `/api/auth/me` on load; shows `LoginPage` when unauthenticated

### Key Files

- [packages/shared-auth/src/verify.ts](packages/shared-auth/src/verify.ts) — `verifyToken()`, `extractBearerToken()`, `isAuthEnabled()`
- [packages/shared-auth/src/revocation.ts](packages/shared-auth/src/revocation.ts) — `isRevoked()` via `MCP_REVOKED_TOKENS`
- [packages/shared-auth/src/oauth.ts](packages/shared-auth/src/oauth.ts) — `createOAuthMiddleware()`, `wwwAuthenticateHeader()` — OAuth 2.1 layer for claude.ai
- [scripts/issue-token.mjs](scripts/issue-token.mjs) — CLI for issuing JWTs (`--user`, `--role`, `--expires`, `--generate-secret`)
- [packages/design-tokens-editor/src/server/auth.ts](packages/design-tokens-editor/src/server/auth.ts) — Editor auth routes + middleware
- [packages/design-tokens-editor/src/LoginPage.tsx](packages/design-tokens-editor/src/LoginPage.tsx) — Token-paste login UI

### Issuing Tokens

```bash
# Generate a secret (first time)
node scripts/issue-token.mjs --generate-secret

# Issue a token for a user
MCP_JWT_SECRET=<secret> node scripts/issue-token.mjs --user alice --role admin --expires 90d
```

### Deployment

All 4 Kamal deploy configs include `MCP_JWT_SECRET` in `env.secret`. Set the secret via `kamal env push`.
