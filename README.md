# ruhmesmeile Storyblok Starter

A **pnpm workspaces monorepo** for building AI-powered websites with [Storyblok CMS](https://www.storyblok.com/) and the [kickstartDS](https://www.kickstartds.com/) design system. Includes a Next.js website, a design system with 74+ React components, three MCP servers, a shared services library, an n8n community node, and two editor UIs.

## Monorepo Structure

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

| Package                                                  | npm                                      | Description                                                                     |
| -------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------- |
| [design-system](packages/design-system/)                 | `@kickstartds/design-system`             | 74+ React components, 5 themes, design tokens, Storybook, Playroom              |
| [website](packages/website/)                             | `@kickstartds/ruhmesmeile-storyblok-starter` | Next.js 13 site with Storyblok CMS, ISR, Visual Editor, AI Prompter             |
| [storyblok-services](packages/storyblok-services/)       | `@kickstartds/storyblok-services`        | Shared library for schema preparation, validation, transforms, pattern analysis |
| [storyblok-mcp](packages/storyblok-mcp/)                 | `@kickstartds/storyblok-mcp-server`      | MCP server exposing 30+ CMS tools to AI assistants                              |
| [storyblok-n8n](packages/storyblok-n8n/)                 | `n8n-nodes-storyblok-kickstartds`        | n8n community node with 22 operations for automated content pipelines           |
| [component-builder-mcp](packages/component-builder-mcp/) | `@kickstartds/component-builder-mcp`     | MCP server with 7 read-only tools for component development guidance            |
| [design-tokens-mcp](packages/design-tokens-mcp/)         | `@kickstartds/design-tokens-mcp`         | MCP server with 28 tools for token querying, analysis, and governance           |
| [shared-auth](packages/shared-auth/)                     | `@kickstartds/shared-auth`               | Shared JWT authentication library (HS256 verification, revocation)              |
| [design-tokens-editor](packages/design-tokens-editor/)   | _(private)_                              | Browser-based visual token editor with live preview (Vite + Express)            |
| [schema-layer-editor](packages/schema-layer-editor/)     | `@kickstartds/schema-layer-editor`       | Visual editor for JSON Schema layers (Vite SPA)                                 |

**Package manager:** pnpm 10.30.3 · **Versioning:** [Changesets](https://github.com/changesets/changesets) for independent per-package publishing

## Quick Start

### Requirements

- **Node.js 24+** — `nvs use` or `nvm use` for automatic version selection
- **pnpm 10.30.3** — `corepack enable && corepack prepare pnpm@10.30.3 --activate`
- [`mkcert`](https://github.com/FiloSottile/mkcert#installation) — for local SSL (required by the Storyblok Visual Editor iframe)

### Install & Build

```bash
pnpm install                # Install all workspaces
pnpm -r run build           # Build all packages (topological order)
```

### Environment Variables

Create `packages/website/.env.local` (see `.env.local.sample`):

| Variable                     | Required        | Description                    |
| ---------------------------- | --------------- | ------------------------------ |
| `NEXT_STORYBLOK_API_TOKEN`   | ✅              | Storyblok Preview API token    |
| `NEXT_STORYBLOK_OAUTH_TOKEN` | ✅              | Storyblok Management API token |
| `NEXT_STORYBLOK_SPACE_ID`    | ✅              | Space ID (without `#`)         |
| `NEXT_OPENAI_API_KEY`        | For AI features | OpenAI API key                 |
| `NEXT_PUBLIC_SITE_URL`       | For Prompter    | Public site URL                |

### Local Development

```bash
pnpm --filter website dev     # Website dev server (SSL on :3010)
pnpm --filter storyblok-mcp dev  # MCP server in dev mode
```

Set Storyblok Visual Editor preview URL to `https://localhost:3010/api/preview/`

### All Commands

```bash
# Development
pnpm --filter website dev                                   # Website dev server
pnpm --filter storyblok-mcp dev                             # Storyblok MCP server dev mode
pnpm --filter @kickstartds/design-system storybook          # Storybook dev server
pnpm --filter @kickstartds/design-system build              # Build design system
pnpm --filter design-tokens-editor dev                      # Token editor dev server (port 5173)
pnpm --filter component-builder-mcp dev                     # Component builder MCP (watch mode)
pnpm --filter design-tokens-mcp dev                         # Design tokens MCP (watch mode)

# Build
pnpm -r run build                                           # Build all packages

# CMS sync
pnpm --filter website push-components                       # Push component schema to Storyblok
pnpm --filter website generate-content-types                # Pull schema + generate TypeScript types
pnpm --filter website create-storyblok-config               # Regenerate CMS config from JSON schemas

# Quality
pnpm -r run typecheck                                       # Type-check all packages
pnpm -r run lint                                            # Lint all packages
pnpm -r run test                                            # Run all tests

# Publishing
pnpm changeset                                              # Create a new changeset
pnpm version-packages                                       # Bump versions from changesets
pnpm publish-packages                                       # Publish to npm
```

## Packages

### Website

A **Next.js 13** site with Storyblok CMS integration, featuring 7 content types, 30+ design system components, ISR, Visual Editor support, and an in-editor AI Prompter for content generation.

Key features:

- **Section-based page composition** with the kickstartDS design system
- **Prompter** — AI content generation directly inside the Visual Editor (section mode and page mode)
- **Three-layer design token architecture** with 5 pre-built color themes
- **BlurHash image placeholders**, breadcrumb with JSON-LD, Markdown endpoint, Pagefind search
- **Kamal** or **Netlify** deployment

See [packages/website/README.md](packages/website/README.md) for full documentation.

### Storyblok Services

A **shared, framework-agnostic library** consumed by the website, MCP server, and n8n nodes. Provides:

- **Schema preparation** — 15-pass transformation of kickstartDS JSON Schemas into OpenAI-compatible structured output format
- **Content validation** — Schema-driven nesting rules, component hierarchy checks, compositional quality warnings
- **Content transformation** — Bidirectional conversion between Design System props, OpenAI output, and Storyblok's flat format
- **Pattern analysis** — Component frequency, section sequences, sub-component counts, page archetypes, field value distributions
- **Guided generation** — Page planning, section-by-section generation with site-aware context, field-level compositional guidance
- **Asset management** — Download, upload to Storyblok CDN, and URL rewriting

See [packages/storyblok-services/README.md](packages/storyblok-services/README.md) for API documentation.

### MCP Server

A **Model Context Protocol server** that exposes 30+ CMS tools to AI assistants like Claude. Supports both local (stdio) and cloud (Streamable HTTP) transport.

Key capabilities:

- **Content CRUD** — list, get, create, update, delete stories; replace sections; update SEO
- **AI content generation** — auto-schema derivation, structured output, guided section-by-section generation
- **Component introspection** — list/get component schemas with nesting rules and composition annotations
- **Content intelligence** — pattern analysis, section recipes, page planning
- **Web scraping** — fetch pages as clean Markdown for content migration
- **Multi-content-type support** — 5 content types with per-type schema validation

Deploy with Kamal: `kamal deploy -d storyblok-mcp`

See [packages/storyblok-mcp/README.md](packages/storyblok-mcp/README.md) for setup and deployment instructions.

### n8n Nodes

An **n8n community node** package providing 22 operations across 3 resources (AI Content, Story, Space) for automated content pipelines — without an LLM intermediary.

Includes 9 workflow templates for content audit, blog autopilot, content migration, SEO fixes, and more.

See [packages/storyblok-n8n/README.md](packages/storyblok-n8n/README.md) for the full node reference.

### Design System

The **core design system** providing 74+ React components, design tokens, JSON Schemas, Storybook documentation, and Playroom prototyping. Published as `@kickstartds/design-system` and consumed by website, storyblok-mcp, and design-tokens-editor.

Key features:

- **74+ React components** with JSON Schema-driven props (forwardRef, Context-overridable)
- **5 pre-built themes** — DS Agency, Business, NGO, Google, Telekom — compiled via Style Dictionary
- **Three-layer token architecture** — Branding → Semantic → Component tokens
- **Storybook 10** with a11y audits, design token display, MCP addon
- **Playroom** — Interactive component prototyping at 425/768/1440px
- **Rollup build** — ES modules, CSS, JSON Schemas, token exports, icon sprite

See [packages/design-system/README.md](packages/design-system/README.md) for component catalog and theming guide.

### Component Builder MCP

A **read-only MCP server** providing component-building instructions and templates to AI assistants. Exposes 7 tools for scaffolding new kickstartDS components (JSON Schema, React, SCSS, client behavior, Storybook) and 3 browsable documentation resources.

See [packages/component-builder-mcp/README.md](packages/component-builder-mcp/README.md) for tool reference.

### Design Tokens MCP

An **MCP server for design token management** — 28 tools for querying, searching, analyzing, and updating CSS custom properties across 12 global + 50 component token files. Includes theme generation from images (vision) or CSS extraction, plus 3 guided workflow prompts.

See [packages/design-tokens-mcp/README.md](packages/design-tokens-mcp/README.md) for tool reference and token architecture.

### Design Tokens Editor

A **browser-based visual token editor** (Vite SPA) for non-technical editors to modify design tokens with live preview. Built with React 19, MUI v7, and JSON Forms. Deployed on Netlify with Functions + Blobs for serverless persistence. Private package — not published to npm.

See [packages/design-tokens-editor/README.md](packages/design-tokens-editor/README.md) for setup.

### Schema Layer Editor

A **visual editor for JSON Schema layers** used to configure CMS field visibility and behavior per schema layer. Built with Vite.

See [packages/schema-layer-editor/README.md](packages/schema-layer-editor/README.md) for usage.

## Architecture

### Shared Service Layer

All three Storyblok consumers (website, MCP server, n8n nodes) use the same `@kickstartds/storyblok-services` library, ensuring identical behavior for schema preparation, validation, content transformation, and pattern analysis:

```
                    ┌──────────────────────────────────────────┐
                    │         @kickstartds/design-system       │
                    │   (74+ components, tokens, schemas)      │
                    └────┬──────────┬──────────┬───────────────┘
                         │          │          │
              ┌──────────┘    ┌─────┘     ┌────┘
              ▼               ▼           ▼
┌─────────────────┐  ┌──────────────┐  ┌──────────────────┐
│     Website     │  │  Storyblok   │  │  Design Tokens   │
│   (Next.js)     │  │  MCP Server  │  │     Editor       │
└────────┬────────┘  └──────┬───────┘  └──────────────────┘
         │                  │
         │     ┌────────────┤
         │     │   ┌────────┘
         ▼     ▼   ▼
┌────────────────────────┐  ┌─────────────┐
│   storyblok-services   │  │  n8n Nodes  │
│   (shared library)     │◄─┤             │
└───────────┬────────────┘  └─────────────┘
            │
  ┌─────────┴─────────┐
  │                    │
  ▼                    ▼
┌───────────┐   ┌─────────────┐
│ Storyblok │   │   OpenAI    │
│    CMS    │   │  (GPT-4o)   │
└───────────┘   └─────────────┘

┌──────────────────────┐  ┌──────────────────┐
│ Component Builder    │  │ Design Tokens    │
│ MCP (read-only docs) │  │ MCP (28 tools)   │
└──────────────────────┘  └──────────────────┘
```

### Content Generation Pipeline

```
Prompt → Schema Preparation → OpenAI Structured Output → Post-Processing → Storyblok Import
```

1. **Schema preparation**: kickstartDS JSON Schema → 15 transformation passes → OpenAI-compatible `response_format`
2. **Content generation**: OpenAI GPT-4o with enforced JSON Schema → guaranteed valid structure
3. **Post-processing**: Restore Design System discriminators, clean annotations
4. **Transform**: Design System nested props → Storyblok flat format (`image.src` → `image_src`)
5. **Validation**: Schema-driven nesting rules + compositional quality warnings
6. **Import**: Create or update stories in Storyblok via Management API

## Authentication

All hosted services (3 MCP servers + Design Tokens Editor) support optional **JWT authentication** with a shared HS256 secret. Auth is disabled by default for local development.

```bash
# Generate a signing secret
node scripts/issue-token.mjs --generate-secret

# Issue a token for a user
MCP_JWT_SECRET="your-secret" node scripts/issue-token.mjs --user alice --role admin --expires 90d
```

See [docs/guides/authentication.md](docs/guides/authentication.md) for the full guide — setup, client configuration, revocation, and troubleshooting.

## Deployment

### Website (Kamal)

```bash
kamal deploy -d website   # Deploy to production
kamal setup -d website    # First-time server setup
```

Config: [config/deploy-website.yml](config/deploy-website.yml)

### Storyblok MCP Server (Kamal)

```bash
kamal deploy -d storyblok-mcp       # Deploy MCP server
kamal setup -d storyblok-mcp        # First-time setup
```

Config: [config/deploy-storyblok-mcp.yml](config/deploy-storyblok-mcp.yml)

### Design Tokens MCP (Kamal)

```bash
kamal deploy -d design-tokens-mcp
```

Config: [config/deploy-design-tokens-mcp.yml](config/deploy-design-tokens-mcp.yml)

### Component Builder MCP (Kamal)

```bash
kamal deploy -d component-builder-mcp
```

Config: [config/deploy-component-builder-mcp.yml](config/deploy-component-builder-mcp.yml)

### Schema Layer Editor (Kamal)

```bash
kamal deploy -d schema-layer-editor
```

Config: [config/deploy-schema-layer-editor.yml](config/deploy-schema-layer-editor.yml)

### Design System / Storybook (Kamal)

```bash
kamal deploy -d design-system
```

Config: [config/deploy-design-system.yml](config/deploy-design-system.yml)

### Design Tokens Editor (Netlify)

Deployed on Netlify — see `packages/design-tokens-editor/netlify.toml` for build config.

### Analytics (Kamal)

```bash
kamal deploy -d umami-analytics
```

Config: [config/deploy-umami-analytics.yml](config/deploy-umami-analytics.yml)

Endpoint: `https://mcp.your-domain.com/mcp`

## Contributing

Contributions are welcome. Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as below, without any additional terms or conditions.

## License

This project is licensed under either of

- [Apache License, Version 2.0](https://www.apache.org/licenses/LICENSE-2.0) ([LICENSE-APACHE](LICENSE-APACHE))
- [MIT license](https://opensource.org/license/mit/) ([LICENSE-MIT](LICENSE-MIT))

at your option.

The SPDX license identifier for this project is `MIT OR Apache-2.0`.

## Support

Join our [Discord community](https://discord.gg/mwKzD5gejY) for support, or leave an issue on this repository!
