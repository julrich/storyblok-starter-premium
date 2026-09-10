# Getting Started

This guide walks you through setting up a fresh instance of the kickstartDS Storyblok Starter — from creating a new Storyblok space to running the site locally and deploying to production.

## Prerequisites

- **Node.js** ≥ 18
- **pnpm** 10.30.3+ (`corepack enable && corepack prepare pnpm@10.30.3 --activate`)
- A **Storyblok** account with a new, empty space
- An **OpenAI** API key (optional — needed for Prompter / AI content generation)

## 1. Install Dependencies

```bash
pnpm install
```

## 2. Configure Environment Variables

grep -A2 -B2 "create-component-previews" package.json && echo "===" && grep -A2 -B2 '"test"' package.json | head -20

### Local Development

#### `packages/website/.env.local`

Copy the sample and fill in your values:

```bash
cp packages/website/.env.local.sample packages/website/.env.local
```

| Variable                     | Where to get it                                                      | Required            |
| ---------------------------- | -------------------------------------------------------------------- | ------------------- |
| `NEXT_STORYBLOK_API_TOKEN`   | Storyblok → Space Settings → Access Tokens → **Preview** token       | Yes                 |
| `NEXT_STORYBLOK_OAUTH_TOKEN` | Storyblok → My Account → **Personal access tokens**                  | Yes                 |
| `NEXT_STORYBLOK_SPACE_ID`    | Storyblok → Space Settings → **Space ID** (numeric, no `#`)          | Yes                 |
| `NEXT_OPENAI_API_KEY`        | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | For AI features     |
| `KAMAL_REGISTRY_PASSWORD`    | Docker Hub access token                                              | For deployment      |
| `POSTGRES_PASSWORD`          | Your choice                                                          | For Umami analytics |

#### `.vscode/mcp.json` (MCP server dev config)

If you use the Storyblok MCP server locally in VS Code, update the hardcoded values:

| Variable                | What to set                          |
| ----------------------- | ------------------------------------ |
| `STORYBLOK_API_TOKEN`   | Same as `NEXT_STORYBLOK_API_TOKEN`   |
| `STORYBLOK_OAUTH_TOKEN` | Same as `NEXT_STORYBLOK_OAUTH_TOKEN` |
| `STORYBLOK_SPACE_ID`    | Same as `NEXT_STORYBLOK_SPACE_ID`    |
| `OPENAI_API_KEY`        | Same as `NEXT_OPENAI_API_KEY`        |

#### `packages/website/.env` (domain / infra — checked into git)

Update these if you're deploying to a new domain. For local-only testing, the defaults work fine.

| Variable                                   | Default                      | Purpose                   |
| ------------------------------------------ | ---------------------------- | ------------------------- |
| `NEXT_PUBLIC_PRIMARY_PUBLIC_SITE_DOMAIN`   | `demo.ruhmesmeile.com`       | Primary site domain       |
| `NEXT_PUBLIC_SECONDARY_PUBLIC_SITE_DOMAIN` | `www.demo.ruhmesmeile.com`   | WWW alias                 |
| `NEXT_PUBLIC_SITE_URL`                     | `https://${PRIMARY_DOMAIN}`  | Full public URL (derived) |
| `NEXT_PUBLIC_C15T_URL`                     | c15t.dev URL                 | Consent management API    |
| `NEXT_PUBLIC_ANALYTICS_DOMAIN`             | `usage.${PRIMARY_DOMAIN}`    | Umami analytics domain    |
| `NEXT_PUBLIC_ANALYTICS_SITE_ID`            | UUID                         | Umami site identifier     |
| `DOCKER_SITE_IMAGE_NAME`                   | `ruhmesmeile/corporate-demo` | Docker image name         |
| `HOSTING_SERVER_IP`                        | `91.98.143.83`               | Deploy target server IP   |

## 3. Authenticate Storyblok CLI

The Storyblok CLI v4 requires a one-time login:

```bash
cd packages/website
pnpm storyblok-login
```

This opens an interactive prompt — enter your management token and select region `eu`.

## 4. Build All Packages

A full build is required before first run:

```bash
pnpm -r run build
```

## 5. Initialize the Storyblok Space

This seeds the empty space with components, presets, demo content, and asset uploads:

```bash
pnpm --filter @kickstartds/ruhmesmeile-storyblok-starter run init
```

What this does:

1. Runs `prepareProject.js` — cleans default Storyblok content, uploads design system assets and preset screenshots, creates demo story, writes component/preset/group configs in CLI v4 format
2. Pushes components to Storyblok (`storyblok components push`)
3. Pulls back the schema and generates TypeScript types

> **Note:** This script is designed for fresh spaces only. It checks for a default "Home" story and exits if the space appears already initialized.

## 6. Start Development

```bash
pnpm --filter @kickstartds/ruhmesmeile-storyblok-starter dev
```

The dev server starts with an SSL proxy on `https://localhost:3010`.

Set the Storyblok Visual Editor preview URL to `https://localhost:3010/api/preview/`.

## 7. Regenerating Component Screenshots

Preset screenshots are visual snapshots of each Storybook story, uploaded to Storyblok during `init` to serve as component previews in the Visual Editor. They must be regenerated whenever you add, rename, or remove Storybook stories.

### How the pipeline works

```
build-storybook → test-storybook (captures __snapshots__/*.png via @storybook/test-runner)
               → create-component-previews (copies __snapshots__/ → static/img/screenshots/)
               → build (Rollup copies static/ → dist/static/)
               → presets (generates snippets.json referencing img/screenshots/{story.id}.png)
```

> **Important:** The `presets` step in the build generates a screenshot path for _every_ story, but the actual `.png` files only exist if `create-component-previews` has been run after those stories were added. New or renamed stories will have missing screenshots until the pipeline is re-run.

### Prerequisites

The screenshot pipeline uses `@storybook/test-runner` which runs Playwright under the hood. On first run (or after updating Playwright), you need to install browser binaries:

```bash
pnpm exec playwright install
```

### Regenerate screenshots

```bash
cd packages/design-system
pnpm run build-storybook     # Build static Storybook
pnpm run create-component-previews  # Run test-runner → copy snapshots → static/img/screenshots/
pnpm -r run build            # Rebuild to include new screenshots in dist/
```

After regenerating, commit the updated files in `__snapshots__/` and `static/img/screenshots/` (both tracked via Git LFS).

## 8. Updating Components After Schema Changes

After modifying JSON Schema layers, use the merge workflow to safely push changes:

```bash
pnpm --filter @kickstartds/ruhmesmeile-storyblok-starter run update-storyblok-config
```

This runs: `create-storyblok-config` → `rename-generated-config` → `pull-content-schema` → `merge-storyblok-config` → `push-components`

The merge script preserves manually-added fields, maps tab UUIDs, and produces a report at `cms/merge-report.json`. See [docs/adr/adr-storyblok-config-merge.md](docs/adr/adr-storyblok-config-merge.md) for details.

---

## Production Deployment

Deployment uses [Kamal](https://kamal-deploy.org/) with configs in `config/`.

### Kamal Secrets

Set these in `.kamal/secrets` or your CI environment:

| Variable                     | Used by                             | Notes               |
| ---------------------------- | ----------------------------------- | ------------------- |
| `KAMAL_REGISTRY_PASSWORD`    | All deploys                         | Docker Hub password |
| `NEXT_STORYBLOK_API_TOKEN`   | Website                             | Build arg + runtime |
| `NEXT_STORYBLOK_OAUTH_TOKEN` | Website                             | Build arg + runtime |
| `NEXT_STORYBLOK_SPACE_ID`    | Website                             | Build arg + runtime |
| `NEXT_OPENAI_API_KEY`        | Website                             | Runtime only        |
| `STORYBLOK_API_TOKEN`        | Storyblok MCP                       | Runtime             |
| `STORYBLOK_OAUTH_TOKEN`      | Storyblok MCP, Design Tokens Editor | Runtime             |
| `STORYBLOK_SPACE_ID`         | Storyblok MCP, Design Tokens Editor | Runtime             |
| `OPENAI_API_KEY`             | Storyblok MCP                       | Runtime             |
| `MCP_JWT_SECRET`             | All MCP servers, Design Tokens Editor | JWT signing secret |
| `POSTGRES_PASSWORD`          | Umami Analytics                     | DB password         |

> **Why two sets of Storyblok vars?** The website uses the `NEXT_` prefix (Next.js convention). The MCP server and token editor are standalone services that use unprefixed names. Both point to the same Storyblok space.

> **JWT Auth:** `MCP_JWT_SECRET` enables authentication on all MCP servers and the Design Tokens Editor. Generate a secret and issue tokens with `scripts/issue-token.mjs`. See [docs/guides/authentication.md](docs/guides/authentication.md) for the full guide.

### Deploy Config Files

Update domain and infra settings in these files for a new deployment target:

| Config file                               | Key variables to update                                                                 |
| ----------------------------------------- | --------------------------------------------------------------------------------------- |
| `config/deploy-website.yml`               | `NEXT_PUBLIC_PRIMARY_PUBLIC_SITE_DOMAIN`, `HOSTING_SERVER_IP`, `DOCKER_SITE_IMAGE_NAME` |
| `config/deploy-storyblok-mcp.yml`         | `MCP_PUBLIC_DOMAIN`, `HOSTING_SERVER_IP`, `DOCKER_MCP_IMAGE_NAME`                       |
| `config/deploy-design-tokens-editor.yml`  | `DESIGN_TOKENS_EDITOR_PUBLIC_DOMAIN`, `HOSTING_SERVER_IP`                               |
| `config/deploy-design-tokens-mcp.yml`     | `DESIGN_TOKENS_MCP_PUBLIC_DOMAIN`, `HOSTING_SERVER_IP`                                  |
| `config/deploy-component-builder-mcp.yml` | `COMPONENT_BUILDER_MCP_PUBLIC_DOMAIN`, `HOSTING_SERVER_IP`                              |
| `config/deploy-design-system.yml`         | `STORYBOOK_PUBLIC_DOMAIN`, `HOSTING_SERVER_IP`                                          |

### Deploy Commands

```bash
# First-time setup
kamal setup -d website

# Subsequent deploys
kamal deploy -d website

# MCP server
kamal deploy -d storyblok-mcp
```

---

## Quick Reference: Minimum Setup

For testing locally with a fresh Storyblok space, you only need:

1. Set 3 vars in `packages/website/.env.local`:
   - `NEXT_STORYBLOK_API_TOKEN`
   - `NEXT_STORYBLOK_OAUTH_TOKEN`
   - `NEXT_STORYBLOK_SPACE_ID`
2. Run `storyblok login` (CLI auth)
3. Run `pnpm -r run build && pnpm --filter @kickstartds/ruhmesmeile-storyblok-starter run init`
4. Run `pnpm --filter @kickstartds/ruhmesmeile-storyblok-starter dev`
