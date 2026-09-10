# Documentation

## Guides

Operator-facing documentation for setup, deployment, and day-to-day use.

- [Authentication](guides/authentication.md) — JWT auth setup for all hosted services
- [Content Operations Workflows](guides/content-operations-workflows.md) — 12 content workflows using MCP tools and n8n
- [Design Tokens MCP Quickstart](guides/design-tokens-mcp-quickstart.md) — Getting started with the Design Tokens MCP server
- [Design Tokens MCP Deployment](guides/design-tokens-mcp-deployment.md) — Cloud deployment guide for the Design Tokens MCP server

## Skills

MCP prompt workflows for AI-assisted content generation (referenced by `copilot-instructions.md`).

- [Plan Page Structure](skills/plan-page-structure.md) — Section-by-section generation workflow
- [Create Page from Scratch](skills/create-page-from-scratch.md) — Full page creation skill
- [Migrate from URL](skills/migrate-from-url.md) — Import and recreate content from a URL
- [Extend Existing Page](skills/extend-existing-page.md) — Add sections to an existing page
- [Content Audit](skills/content-audit.md) — Audit content quality across the space
- [Translate Page](skills/translate-page.md) — Translate a page to another language

## Architecture Decision Records

- [JWT Auth](adr/adr-jwt-auth.md)
- [Design Tokens Editor Migration](adr/adr-design-tokens-editor-migration.md)
- [MCP Apps Decisions](adr/adr-mcp-apps-decisions.md)
- [Monorepo Integration](adr/adr-monorepo-integration.md)
- [Schema Layer Editor](adr/adr-schema-layer-editor.md)
- [Storyblok Config Merge](adr/adr-storyblok-config-merge.md)
- [Unified Theming](adr/adr-unified-theming.md)

## Internal

Development-only documents — PRDs, implementation plans, checklists, research, and marketing drafts. See [internal/](internal/) for the full tree.

### PRDs (14)

Product requirements documents for planned or completed features.

| PRD                                                                                                | Topic                                    |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| [jwt-auth-prd](internal/prd/jwt-auth-prd.md)                                                       | JWT authentication                       |
| [prompter-reactivation-prd](internal/prd/prompter-reactivation-prd.md)                             | Prompter (Visual Editor AI) reactivation |
| [mcp-apps-upgrade-prd](internal/prd/mcp-apps-upgrade-prd.md)                                       | MCP Apps extension upgrade               |
| [page-builder-ui-prd](internal/prd/page-builder-ui-prd.md)                                         | Page Builder UI                          |
| [design-token-theming-prd](internal/prd/design-token-theming-prd.md)                               | Design token theming                     |
| [design-system-theme-cleanup-prd](internal/prd/design-system-theme-cleanup-prd.md)                 | Design system theme cleanup              |
| [design-tokens-editor-migration-prd](internal/prd/design-tokens-editor-migration-prd.md)           | Design Tokens Editor migration           |
| [design-tokens-mcp-prd-component-tokens](internal/prd/design-tokens-mcp-prd-component-tokens.md)   | Design Tokens MCP component tokens       |
| [design-tokens-mcp-prd-intent-governance](internal/prd/design-tokens-mcp-prd-intent-governance.md) | Design Tokens MCP intent governance      |
| [unified-theming-prd](internal/prd/unified-theming-prd.md)                                         | Unified theming                          |
| [monorepo-migration-prd](internal/prd/monorepo-migration-prd.md)                                   | Monorepo migration                       |
| [monorepo-inline-packages-prd](internal/prd/monorepo-inline-packages-prd.md)                       | Monorepo inline packages                 |
| [schema-layers-prd](internal/prd/schema-layers-prd.md)                                             | Schema layers                            |
| [schema-layer-editor-prd](internal/prd/schema-layer-editor-prd.md)                                 | Schema Layer Editor                      |

### Plans (9)

Design and implementation plans.

Located in [internal/plans/](internal/plans/).

### Checklists (18)

Implementation tracking checklists.

Located in [internal/checklists/](internal/checklists/).

### Research (2)

Located in [internal/research/](internal/research/).

### Marketing (3)

Located in [internal/marketing/](internal/marketing/).

### Data (2)

Located in [internal/data/](internal/data/).
