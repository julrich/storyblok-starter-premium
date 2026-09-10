# ruhmesmeile Storyblok Website

A **Next.js 13** website powered by [Storyblok CMS](https://www.storyblok.com/) and the [kickstartDS](https://www.kickstartds.com/) design system (`@kickstartds/design-system`). Features ISR (Incremental Static Regeneration), Storyblok Visual Editor integration, AI-powered in-editor content generation, and a three-layer design token architecture.

## Quick Start

### Requirements

- **Node.js 24+** — `nvs use` or `nvm use` for automatic version selection
- **pnpm 9.15.0** — `corepack enable && corepack prepare pnpm@9.15.0 --activate`
- [`mkcert`](https://github.com/FiloSottile/mkcert#installation) — for local SSL (required for the Storyblok Visual Editor iframe)

### Environment Variables

Create `.env.local` (see `.env.local.sample`) with:

| Variable                     | Required     | Description                                                     |
| ---------------------------- | ------------ | --------------------------------------------------------------- |
| `NEXT_STORYBLOK_API_TOKEN`   | ✅           | Preview API token                                               |
| `NEXT_STORYBLOK_OAUTH_TOKEN` | ✅           | Management API token                                            |
| `NEXT_STORYBLOK_SPACE_ID`    | ✅           | Space ID (without `#`)                                          |
| `NEXT_OPENAI_API_KEY`        | For Prompter | OpenAI API key for AI content generation                        |
| `NEXT_PUBLIC_SITE_URL`       | For Prompter | Public site URL (used for API route calls in the Visual Editor) |

### Install & Run

```bash
# From the monorepo root
pnpm install
pnpm -r run build           # Build all packages (required before first dev run)
pnpm --filter website dev   # Start dev server with SSL proxy on :3010
```

Set Storyblok Visual Editor preview URL to `https://localhost:3010/api/preview/`

## Features

### Content Types

The website supports **7 content types** with full Visual Editor integration:

| Content Type      | Description                                              |
| ----------------- | -------------------------------------------------------- |
| **page**          | Standard section-based pages                             |
| **blog-post**     | Blog articles with head, aside, CTA, and SEO root fields |
| **blog-overview** | Blog listing page                                        |
| **event-detail**  | Event detail pages (flat/Tier 2)                         |
| **event-list**    | Event listing pages                                      |
| **search**        | Site search powered by [Pagefind](https://pagefind.app/) |
| **settings**      | Global settings (header, footer, SEO defaults)           |

### Design System Components

Over 30 components from `@kickstartds/design-system` are registered, including:

`blog-teaser` · `business-card` · `contact` · `content-nav` · `cta` · `divider` · `downloads` · `faq` · `features` · `gallery` · `headline` · `hero` · `html` · `image-story` · `image-text` · `logos` · `mosaic` · `section` · `slider` · `split-even` · `split-weighted` · `stats` · `teaser-card` · `testimonials` · `text` · `video-curtain`

Plus custom local components: `prompter` · `info-table`

### Prompter (In-Editor AI Generation)

The **Prompter** component enables AI content generation directly inside Storyblok's Visual Editor. Editors place a Prompter inside a section, enter a prompt, and generate content via OpenAI — all without leaving the editor.

- **Section mode**: Generate a single section by picking a component type and entering a prompt
- **Page mode**: AI plans a multi-section page structure, generates each section sequentially, and imports them all at once
- **CMS-configurable**: Default mode, allowed component types, content type, and upload behavior are all configurable as Storyblok fields

### Design Token Architecture

A three-layer token system with five pre-built color themes:

| Layer     | Prefix         | Location                   | Description                               |
| --------- | -------------- | -------------------------- | ----------------------------------------- |
| Branding  | `--ks-brand-*` | `token/branding-token.css` | Core brand values                         |
| Semantic  | `--ks-*`       | `token/*.scss`             | Purpose-based tokens referencing branding |
| Component | `--dsa-*`      | `token/component-token/`   | Component-specific customizations         |

**Pre-built themes**: default, burgundy, coffee, mint, neon, water

Per-page token overrides are also supported — stories can carry inline CSS custom properties for page-level theming.

### Provider Hierarchy

The app shell wraps all pages in a layered provider stack:

```
LanguageProvider → BlurHashProvider → DsaProviders → ComponentProviders → ImageSizeProviders → ImageRatioProviders
```

`ComponentProviders` supplies custom implementations for `Picture`, `Link`, and various kickstartDS contexts.

### Additional Features

- **ISR (Incremental Static Regeneration)** with Storyblok webhook-triggered revalidation
- **Storyblok Visual Editor** with live preview via `editable()` HOC
- **Hero section extraction** — detects hero components and renders them before the breadcrumb for full-width layouts
- **BlurHash image placeholders** — pre-generated for all images
- **Breadcrumb with JSON-LD** — auto-generated from URL path segments with Schema.org structured data
- **Markdown endpoint** — every page is also available as Markdown (via middleware that rewrites `.md` URLs)
- **Global/GlobalReference system** — reusable content blocks that can be referenced across pages
- **Header/footer inversion** — per-page toggle fields override global dark/light settings
- **Consent management** via [c15t](https://github.com/nickreese/c15t)
- **Dynamic imports** — nearly all content components use `next/dynamic` for code splitting
- **Sitemap generation** via `next-sitemap`
- **Client-side search** via Pagefind

## API Routes

| Route                            | Method | Description                                             |
| -------------------------------- | ------ | ------------------------------------------------------- |
| `/api/preview`                   | GET    | Enter Storyblok preview/draft mode                      |
| `/api/exit-preview`              | GET    | Exit preview mode                                       |
| `/api/up`                        | GET    | Health check                                            |
| `/api/markdown`                  | GET    | Render any page as Markdown                             |
| `/api/prompter/story`            | GET    | Fetch a story by UID (server-side proxy)                |
| `/api/prompter/patterns`         | GET    | Fetch content patterns (component frequency, sequences) |
| `/api/prompter/recipes`          | GET    | Fetch section recipes and anti-patterns                 |
| `/api/prompter/plan`             | POST   | AI-assisted page structure planning                     |
| `/api/prompter/generate-section` | POST   | Generate a single section with site-aware context       |
| `/api/prompter/import`           | POST   | Import generated content into Storyblok                 |
| `/api/prompter/ideas`            | GET    | Fetch Storyblok Ideas                                   |

## Build Pipeline

The `build` script runs the following steps in order:

1. **`build-tokens`** — Compile design tokens via Style Dictionary
2. **`extract-tokens`** — Extract component tokens and calculate CSS properties
3. **`blurhashes`** — Generate BlurHash placeholders for all images
4. **`bundle-static-assets`** — Bundle static assets via esbuild
5. **`next build`** — Next.js production build
6. **`next-sitemap`** — Generate sitemap XML
7. **`pagefind`** — Index the built site for client-side search

## CMS Sync Commands

```bash
pnpm --filter website update-storyblok-config  # Full workflow: generate → rename → pull → merge → push
pnpm --filter website push-components          # Push merged config from cms/merged/ to Storyblok
pnpm --filter website pull-content-schema      # Pull schema from Storyblok → types/
pnpm --filter website create-storyblok-config  # Regenerate CMS config from JSON schemas
pnpm --filter website generate-content-types   # Pull + generate TypeScript types
```

## Data Flow

```
Storyblok CMS → storyblok.ts (fetch/transform) → unflatten() → React Components
```

- **Storyblok stores flattened props** (e.g., `image_src`, `image_alt`) which get transformed via `unflatten()` into nested objects (`{ image: { src, alt } }`)
- **Story processing** in `helpers/storyblok.ts` handles asset URLs, link resolution, global references, empty image cleanup, and number coercion — all schema-driven

## Deployment

### Kamal (Docker)

The website deploys via [Kamal](https://kamal-deploy.org/) using the config at `config/deploy.yml`:

```bash
kamal deploy          # Deploy to production
kamal setup           # First-time server setup
```

### Netlify

A `netlify.toml` configuration is included. Set the required environment variables in the Netlify dashboard and deploy as a standard Next.js site.

## Creating Branded Component Previews

The design system (now inlined in `packages/design-system/`) includes a screenshot pipeline that captures visual snapshots from Storybook stories. These are uploaded to Storyblok during `init` to serve as component previews in the Visual Editor.

### How it works

```
build-storybook → test-storybook (captures __snapshots__/*.png)
               → create-component-previews (copies to static/img/screenshots/)
               → build (Rollup copies static/ → dist/static/)
               → presets (generates snippets.json referencing img/screenshots/{story.id}.png)
```

### Regenerate after adding or renaming stories

```bash
cd packages/design-system
pnpm run build-storybook
pnpm run create-component-previews
pnpm -r run build
```

Commit the updated files in `__snapshots__/` and `static/img/screenshots/` (tracked via Git LFS).

### Update previews in Storyblok

```bash
pnpm --filter @kickstartds/ruhmesmeile-storyblok-starter run update-previews
```

## Content Schema & Migrations

### TypeScript Types

Generated types live in `types/components-schema.d.ts`. Regenerate with:

```bash
pnpm --filter website generate-content-types
```

### Migrations

Follow [Storyblok's Best Practices](https://www.storyblok.com/tp/storyblok-cli-best-practices#modify-blok-structure) when changing the content schema.

## License

This project is licensed under either of

- [Apache License, Version 2.0](https://www.apache.org/licenses/LICENSE-2.0) ([LICENSE-APACHE](../../LICENSE-APACHE))
- [MIT license](https://opensource.org/license/mit/) ([LICENSE-MIT](../../LICENSE-MIT))

at your option.
