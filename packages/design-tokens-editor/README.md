# Design Tokens Editor

A browser-based WYSIWYG editor for modifying [kickstartDS](https://www.kickstartds.com/) design tokens with live component preview. Non-technical editors can adjust branding colors, typography, spacing, and more — and see changes reflected instantly on real components.

Part of the [kickstartDS Storyblok Starter](../../README.md) monorepo.

## Features

- **Visual Token Editing** — Schema-driven forms (via [JSON Forms](https://jsonforms.io/)) for all branding token categories
- **Live Preview** — Real kickstartDS components rendered with modified tokens in an embedded preview pane
- **Color Picker** — HSL/RGB/Hex color input with palette support (via [tinycolor2](https://github.com/bgrins/TinyColor))
- **Dual Entry Points** — Full editor (`index.html`) and preview-only mode (`preview.html`)
- **Serverless Persistence** — Token state stored via [Netlify Blobs](https://docs.netlify.com/blobs/overview/) with Netlify Functions API
- **Design System Integration** — Imports `@kickstartds/design-system` (workspace:\*) for live component rendering

## Tech Stack

- **React 19** + **TypeScript**
- **Vite 7** (dev server & build)
- **MUI v7** (Material UI components)
- **JSON Forms** (schema-driven form rendering)
- **tinycolor2** (color manipulation)
- **Netlify** (deployment — Functions + Blobs)

## Getting Started

### Prerequisites

- **Node.js 24+**
- **pnpm 10.30.3** (from monorepo root)
- Build the design system first: `pnpm --filter @kickstartds/design-system build`

### Development

```bash
# From monorepo root
pnpm --filter design-tokens-editor dev
```

Starts a Vite dev server on port **5173**.

### Build

```bash
pnpm --filter design-tokens-editor build
```

### Preview production build

```bash
pnpm --filter design-tokens-editor preview
```

## Deployment

Deployed to **Netlify** (stays on Netlify due to deep integration with Functions and Blobs for serverless persistence). Not published to npm (`private: true`).

## License

(MIT OR Apache-2.0)
