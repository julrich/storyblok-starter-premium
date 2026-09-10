# kickstartDS Design System

[![npm version](https://img.shields.io/npm/v/@kickstartds/design-system.svg)](https://www.npmjs.com/package/@kickstartds/design-system)
[![license](https://img.shields.io/npm/l/@kickstartds/design-system.svg)](https://github.com/kickstartDS/storyblok-starter-premium/blob/main/LICENSE-MIT)

The **kickstartDS Design System** is a production-ready component library built on top of [kickstartDS](https://www.kickstartds.com/). It provides **74+ content components**, a multi-theme token architecture, CMS page templates, full-text search, and rich Storybook integration — all tailored for digital agencies building marketing websites and landing pages.

This design system extends the open-source [kickstartDS Content module](https://www.kickstartds.com/content-module/) with more visually rich, agency-focused components and a complete project scaffold including bundling, release automation, and prototyping tools.

Part of the [kickstartDS Storyblok Starter](../../README.md) monorepo.

## Features

- **80+ Components:** A comprehensive set of UI components for marketing pages — from heroes and CTAs to blog templates, event pages, and cookie consent.
- **Multi-Theme Support:** 5 pre-built themes (DS Agency, Business, Google, Telekom, NGO) with runtime switching via a single `data-ks-theme` attribute.
- **Design Token Architecture:** A layered token system with Branding Tokens, a Style Dictionary pipeline, and per-theme SCSS/CSS output.
- **CMS Page Templates:** Ready-to-use page-level schemas and components for headless CMS integration (Page, Blog Overview, Blog Post, Event Detail, Event List, Search, Settings).
- **Storybook 10 Integration:** Fully configured with addons for accessibility, design tokens, HTML output, JSON Schema, Playroom, component tokens, and Chromatic visual testing.
- **Playroom Integration:** Interactive prototyping environment with live component previews.
- **Full-Text Search:** Pagefind-powered search index generated from all Storybook stories.
- **Cookie Consent:** GDPR-compliant cookie consent with optional [c15t](https://c15t.com/) integration.
- **Bedrock Layouts:** [Bedrock Layout Primitives](https://bedrock-layout.dev/) integrated with the Design System's spacing scale.
- **Bundling:** Rollup-based production build outputting ES modules, CSS, schemas, and static assets — usable with and without React.
- **Release Automation:** Versioning and publishing via [Changesets](https://github.com/changesets/changesets) (monorepo-integrated).
- **Page Archetypes:** Pre-composed page examples (Landing, About, Overview, Showcase, Jobs, Job Detail) demonstrating real-world usage.
- **Token Playground:** Interactive Storybook demos for visualizing color, typography, spacing, shadow, border, and transition tokens.
- **Token Picker**: Interactive picker to choose Design Tokens

## Installation

### Prerequisites

- **Node.js 24+** — We recommend managing versions with [nvm](https://github.com/nvm-sh/nvm).
- **pnpm 10.30.3** — Managed via Corepack from the monorepo root.

### As a dependency

```bash
pnpm add @kickstartds/design-system
```

**Peer dependencies** — You'll also need to install:

```bash
yarn add @kickstartds/base @kickstartds/blog @kickstartds/content @kickstartds/core @kickstartds/form react react-dom
```

Or with pnpm:

```bash
pnpm add @kickstartds/base @kickstartds/blog @kickstartds/content @kickstartds/core @kickstartds/form react react-dom
```

Optional peer dependencies:

- `c15t` — For advanced GDPR cookie consent management
- `tinycolor2` — For color manipulation utilities
- `traverse` — For JSON traversal utilities

### From template

1. Create a new repository based on this template.
2. Clone and install dependencies: `pnpm install`.
3. Update `package.json` with your project details.
4. Customize your branding (see [Applying your Design / Brand](#applying-your-design--brand)).

## Getting Started

```bash
# Start Storybook with hot reload (watches schemas, tokens, and code)
pnpm run start

# Start Playroom prototyping environment
pnpm run playroom

# Build Storybook for deployment
pnpm run build-storybook

# Build the library
pnpm run build
```

### Key Scripts

| Script                     | Description                                                                |
| -------------------------- | -------------------------------------------------------------------------- |
| `pnpm run start`           | Start Storybook dev server (port 6006) with file watchers                  |
| `pnpm run storybook`       | Start Storybook without watchers                                           |
| `pnpm run playroom`        | Start Playroom with watchers                                               |
| `pnpm run build-storybook` | Build static Storybook site                                                |
| `pnpm run build-tokens`    | Compile all theme tokens via Style Dictionary                              |
| `pnpm run init-tokens`     | Initialize tokens from branding token JSON                                 |
| `pnpm run schema`          | Generate dereferenced schemas, TypeScript types, layer types, and defaults |
| `pnpm run token`           | Extract CSS custom properties from SCSS token files                        |
| `pnpm run branding-tokens` | Build branding token CSS from JSON source files                            |
| `pnpm run search`          | Generate Pagefind search index from Storybook stories                      |
| `pnpm run presets`         | Generate component presets (JSX snippets) from stories                     |
| `pnpm run test`            | Run visual regression tests against Storybook                              |
| `pnpm run chromatic`       | Run Chromatic visual testing                                               |

## Components

The Design System includes **80+ components** organized into several categories:

### Content Components

| Component         | Description                                                          |
| ----------------- | -------------------------------------------------------------------- |
| **Button**        | Versatile button with label, icon, variant, size, and disabled state |
| **Button Group**  | Group of buttons with layout options                                 |
| **CTA**           | Call to Action with headline, text, buttons, and alignment options   |
| **Divider**       | Visual divider between content sections                              |
| **FAQ**           | Collapsible FAQ section with questions and answers                   |
| **Features**      | Feature grid/list with icons, titles, and descriptions               |
| **Gallery**       | Image gallery with lightbox support                                  |
| **Hero**          | Full-width hero banner with headline, text, image/video, and CTA     |
| **Headline**      | Configurable headline with semantic level, style, and sub-headline   |
| **Html**          | Raw HTML content block                                               |
| **Image Story**   | Image with accompanying narrative text                               |
| **Image Text**    | Side-by-side image and text layout                                   |
| **Logos**         | Logo strip / client logo showcase                                    |
| **Mosaic**        | Tile-based mosaic layout for showcasing work                         |
| **Section**       | Page section wrapper with title, background, spacing, and layout     |
| **Slider**        | Content carousel / slider                                            |
| **Stats**         | Statistics display with animated counters                            |
| **Teaser Card**   | Card with image, headline, text, and link                            |
| **Testimonials**  | Testimonial display with author, quote, and image                    |
| **Text**          | Rich text content block                                              |
| **Video Curtain** | Full-width video background with overlay content                     |
| **Contact**       | Contact information display                                          |
| **Downloads**     | Downloadable file listing                                            |
| **Signpost**      | Directional signpost / link card                                     |
| **Tile**          | Compact content tile                                                 |
| **Business Card** | Personal/team member card                                            |
| **Rich Text**     | Markdown-rendered rich text content                                  |

### Layout Components

| Component          | Description                                             |
| ------------------ | ------------------------------------------------------- |
| **Split Even**     | Equal two-column split layout                           |
| **Split Weighted** | Weighted split layout (e.g., sidebar + main content)    |
| **Page Wrapper**   | Full page wrapper with header, footer, and content area |
| **Selection Rack** | Selectable option layout                                |

### Blog Components

| Component       | Description                                                            |
| --------------- | ---------------------------------------------------------------------- |
| **Blog Aside**  | Sidebar meta info for blog posts (author, sharing, reading time, date) |
| **Blog Author** | Author bio display                                                     |
| **Blog Head**   | Blog post header with date, tags, headline, and cover image            |
| **Blog Tag**    | Blog tag/category label                                                |
| **Blog Teaser** | Blog post preview card with image, excerpt, author, and metadata       |

### Event Components

| Component               | Description                                 |
| ----------------------- | ------------------------------------------- |
| **Event Appointment**   | Event date/time display                     |
| **Event Filter**        | Filterable event categories                 |
| **Event Header**        | Event page header with title and categories |
| **Event Latest**        | Latest events showcase                      |
| **Event Latest Teaser** | Compact latest event teaser                 |
| **Event List Teaser**   | Event listing card                          |
| **Event Location**      | Event venue/location display                |
| **Event Login**         | Event access/login form                     |
| **Event Registration**  | Event registration form                     |

### Navigation Components

| Component        | Description                                                      |
| ---------------- | ---------------------------------------------------------------- |
| **Header**       | Site header with logo, navigation, and actions                   |
| **Footer**       | Site footer with logo, navigation, legal links, and social icons |
| **Nav Main**     | Primary navigation menu                                          |
| **Nav Dropdown** | Dropdown navigation sub-menu                                     |
| **Nav Flyout**   | Flyout navigation panel                                          |
| **Nav Topbar**   | Top bar navigation strip                                         |
| **Breadcrumb**   | Breadcrumb trail navigation                                      |
| **Content Nav**  | In-page content navigation                                       |
| **Pagination**   | Page navigation for lists                                        |

### Search Components

| Component               | Description                       |
| ----------------------- | --------------------------------- |
| **Search Bar**          | Search input with suggestions     |
| **Search Filter**       | Faceted search filters            |
| **Search Form**         | Complete search form              |
| **Search Modal**        | Full-screen search overlay        |
| **Search Result**       | Individual search result display  |
| **Search Result Match** | Highlighted text match in results |

### Form Components

| Component                     | Description                           |
| ----------------------------- | ------------------------------------- |
| **Checkbox / Checkbox Group** | Checkbox inputs with group layout     |
| **Radio / Radio Group**       | Radio button inputs with group layout |
| **Select Field**              | Dropdown select input                 |
| **Text Field**                | Single-line text input                |
| **Text Area**                 | Multi-line text input                 |
| **Form**                      | Complete form wrapper                 |

### Utility Components

| Component            | Description                                                  |
| -------------------- | ------------------------------------------------------------ |
| **Cookie Consent**   | GDPR-compliant consent banner with optional c15t integration |
| **SEO**              | SEO meta tag management                                      |
| **Image / Lightbox** | Image display with optional lightbox                         |
| **Page Teaser**      | Page-level teaser for internal linking                       |

## CMS Page Templates

Pre-built page-level schemas and React components designed for headless CMS integration:

| Template          | Description                                                                               |
| ----------------- | ----------------------------------------------------------------------------------------- |
| **Page**          | Generic page with sections, header/footer config, token overrides, and SEO                |
| **Blog Overview** | Blog listing page with latest post highlight, post grid, and CTA                          |
| **Blog Post**     | Individual blog post with sidebar (aside), content sections, and CTA                      |
| **Event Detail**  | Event detail page with locations, description, gallery, and downloads                     |
| **Event List**    | Filterable, paginated event listing with sidebar filters                                  |
| **Search**        | Search results page with filters, search bar, and paginated results                       |
| **Settings**      | Global settings schema for header, footer, SEO defaults, icon sprite, and token overrides |

Each template includes a JSON Schema (`.schema.json`), dereferenced schema, TypeScript types, and default values — ready for integration with Sanity, Storyblok, Contentful, or any schema-driven CMS.

## Themes

The Design System ships with **5 pre-built themes** that can be switched at runtime:

| Theme                   | Token Path            | Description                     |
| ----------------------- | --------------------- | ------------------------------- |
| **DS Agency** (default) | `src/token/`          | The base Systemics theme        |
| **Business**            | `src/token-business/` | Corporate business theme        |
| **Google**              | `src/token-google/`   | Google-inspired theme           |
| **Telekom**             | `src/token-telekom/`  | Deutsche Telekom-inspired theme |
| **NGO**                 | `src/token-ngo/`      | Non-profit organization theme   |

Themes are applied via a `data-ks-theme` attribute on `<html>` and can be switched at runtime using the `useTheme` hook. In Storybook, a toolbar dropdown lets you preview all themes live.

Pre-compiled theme CSS files are available in `static/`:

- `tokens.css` (default)
- `tokens-business.css`
- `tokens-google.css`
- `tokens-telekom.css`
- `tokens-ngo.css`
- `tokens-lughausen.css`

## Token Playground

Interactive Storybook demos (under **Token / Playground**) for visualizing and testing design tokens:

- **Color** — Full color palette visualization
- **Typography** — Font family, size, weight, and line-height tokens
- **Spacing** — Spacing scale visualization
- **Shadow** — Box shadow token preview
- **Border** — Border radius tokens with live component previews
- **Transition** — Animation and transition token demos

## Customizing

### Applying your Design / Brand

To apply your branding and corporate design to kickstartDS, follow these steps:

1. **Edit Branding Tokens** — Update `src/token/branding-token.json` with your brand's primary colors, fonts, and base values. Multiple pre-built branding presets are also available (blizzard, burgundy, coffee, ember, granit, mint, neon, water).

2. **Initialize tokens** — Run `pnpm run init-tokens` to generate the full Design Token set from your branding values.

3. **Fine-tune** — Adjust the resulting token set in `src/token/dictionary/` to closely fit your corporate identity (colors, spacing, typography, shadows, borders, transitions, background/text/border colors, and scaling).

4. **Build** — Run `pnpm run build-tokens` to compile all token variants and themes.

For a more in-depth overview of the token architecture, see:

- [Foundations — Token](https://www.kickstartds.com/docs/foundations/token/)
- [Branding Token](https://www.kickstartds.com/docs/foundations/token/branding-token/)

### Creating a New Theme

To create an additional theme:

1. Create a new token directory (e.g., `src/token-mytheme/`) with a `dictionary/` folder and `branding-token.json`.
2. Create a Style Dictionary config file (e.g., `sd.config-mytheme.cjs`) following the pattern of existing configs.
3. Add a build script to `package.json`: `"build-tokens-mytheme": "kickstartDS tokens compile --token-dictionary-path src/token-mytheme/dictionary --sd-config-path sd.config-mytheme.cjs"`.
4. Register the theme in `src/themes/index.ts` with a name, CSS path, and logo.

### Adding Your Own Component

To add your own component, follow the guide ["Create a component"](https://www.kickstartds.com/docs/guides/examples/components/teaser-card/) or read about the ideas behind [component creation](https://www.kickstartds.com/docs/guides/components/create/). Here is a brief overview:

1. **Create your component file** — A `.tsx` file in `src/components/my-component/`. Follow the structure of existing components (functional React component with kickstartDS patterns).

2. **Create your JSON Schema** — A `.schema.json` file in the same directory defining the [component API](https://www.kickstartds.com/docs/foundations/components/component-api/). TypeScript props are auto-generated from this schema via `pnpm run schema`.

3. **Create Storybook stories** — A `.stories.tsx` file with example stories for your component.

4. **Register in Playroom** — Add an export in `src/playroom/components.ts` to make the component available in Playroom.

5. **Register in Providers** — If the component uses React context, add it to `src/components/Providers.tsx`.

## Architecture

### Build System

- **Rollup** — Production library builds (ES modules to `dist/`), handling TypeScript, SCSS, JSON, schemas, and static assets.
- **Vite** — Powers Storybook dev server and Vitest test runner.
- **Style Dictionary** — Compiles design tokens from JSON to CSS/SCSS via the kickstartDS CLI.

### Key Directories

| Path                  | Purpose                                                        |
| --------------------- | -------------------------------------------------------------- |
| `src/components/`     | All UI components (schemas, React, SCSS, stories)              |
| `src/components/cms/` | CMS page template components and schemas                       |
| `src/pages/`          | Pre-composed page archetypes for Storybook                     |
| `src/playground/`     | Token visualization demo components                            |
| `src/themes/`         | Theme registry and runtime switching                           |
| `src/token/`          | Base design tokens and branding presets                        |
| `src/token-*/`        | Per-theme token overrides                                      |
| `src/types/`          | Ambient type declarations for kickstartDS module augmentations |
| `src/bedrock/`        | Bedrock Layout Primitives spacing integration                  |
| `scripts/`            | Build tooling (token compilation, presets, search index, etc.) |
| `static/`             | Pre-compiled CSS tokens, fonts, images, and Pagefind index     |
| `docs/`               | MDX documentation for design tokens in Storybook               |

### Provider Architecture

Components using React context are wrapped via a nested provider tree in `src/components/Providers.tsx`, mapping Design System components to their kickstartDS base counterparts (Button, Checkbox, Headline, Section, TeaserBox, and more).

## Contributing

Contributions are welcome. Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as below, without any additional terms or conditions.

## License

This project is licensed under either of

- [Apache License, Version 2.0](https://www.apache.org/licenses/LICENSE-2.0) ([LICENSE-APACHE](LICENSE-APACHE))
- [MIT license](https://opensource.org/license/mit/) ([LICENSE-MIT](LICENSE-MIT))

at your option.

The SPDX license identifier for this project is `MIT OR Apache-2.0`.
