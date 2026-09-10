# Schema Layer Editor

A local web application for creating and editing JSON Schema layer files. Layers define field-level overrides (visibility, title, description, order, polymorphic component restrictions) that sit on top of the base kickstartDS Design System schemas.

## Quick Start

```bash
# From the monorepo root
pnpm install

# Start the editor against your Design System schemas
pnpm --filter @kickstartds/schema-layer-editor dev -- \
  --schemas ../website/node_modules/@kickstartds/design-system/dist/components \
  --layer ../website/cms/visibility \
  --namespace visibility

# Open http://localhost:4200
```

## CLI Options

| Flag          | Required | Default                                      | Description                                                                       |
| ------------- | -------- | -------------------------------------------- | --------------------------------------------------------------------------------- |
| `--schemas`   | Yes      | —                                            | Path to directory containing `*.schema.dereffed.json` files (scanned recursively) |
| `--layer`     | No       | —                                            | Path to existing layer directory to load for editing                              |
| `--namespace` | No       | `"visibility"`                               | Layer name used in `$id` URLs and as the layer folder name                        |
| `--base-url`  | No       | `http://<namespace>.mydesignsystem.com`      | Custom base URL for `$id` generation                                              |
| `--output`    | No       | Same as `--layer`, or `./output/<namespace>` | Where to write generated layer files                                              |
| `--port`      | No       | `4201`                                       | Server API port (Vite dev server runs on 4200)                                    |

### Examples

```bash
# Edit the visibility layer (most common)
pnpm --filter @kickstartds/schema-layer-editor dev -- \
  --schemas ../website/node_modules/@kickstartds/design-system/dist/components \
  --layer ../website/cms/visibility \
  --namespace visibility

# Create a new language layer from scratch
pnpm --filter @kickstartds/schema-layer-editor dev -- \
  --schemas ../website/node_modules/@kickstartds/design-system/dist/components \
  --namespace language \
  --output ../website/cms/language

# Use a custom base URL
pnpm --filter @kickstartds/schema-layer-editor dev -- \
  --schemas ../website/node_modules/@kickstartds/design-system/dist/components \
  --namespace editorial \
  --base-url "http://editorial.myproject.com"
```

## UI Overview

The editor uses a **three-panel layout** reflecting the content architecture:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Schema Layer Editor                      [namespace: visibility] [Save]│
├──────────────┬──────────────────┬────────────────────────────────────────┤
│ Content Types│ Components       │ hero                      [Actions]   │
│              │                  │                                       │
│ ▸ page       │ Layout           │ ☑ headline     "Headline"    ▴▾      │
│   blog-post  │   ● section      │ ☑ text         "Body Text"   ▴▾      │
│   …          │                  │ ☐ highlightText              ▴▾      │
│              │ Root Fields      │ ☑ buttons                    ▴▾      │
│              │   seo            │   ▾ items                            │
│              │   header         │     ☑ label     "Label"      ▴▾      │
│              │                  │     ☐ icon                   ▴▾      │
│              │ Content          │ ☑ image                      ▴▾      │
│              │   ● hero         │   ▾ properties                       │
│              │     cta          │     ☑ srcMobile              ▴▾      │
│              │     faq          │     ☐ indent                 ▴▾      │
│              │     …            │                                       │
└──────────────┴──────────────────┴────────────────────────────────────────┘
```

### Panel 1 — Content Types

Lists all 7 content types (page, blog-post, blog-overview, settings, event-detail, event-list, search). Selecting one populates Panel 2.

### Panel 2 — Components & Root Fields

Shows three groups for the selected content type:

- **Layout** — The `section` component (for section-based types)
- **Root Fields** — Non-section root fields (seo, header, etc.). Object/array fields are clickable; scalar fields have inline toggles.
- **Content** — Components available in `section.components` anyOf (hero, cta, features, etc.)

### Panel 3 — Field Editor

Recursive field tree for the selected component or root field, with:

- **Visibility checkbox** — Toggle `x-cms-hidden`
- **Inline title editing** — Override the field's `title`
- **Detail panel** — Edit `description`, `x-cms-order`, view metadata
- **Order controls** (▴▾) — Swap-based reordering with siblings
- **Polymorphic picker** — For `anyOf`/`oneOf` slots, select which components are allowed

### Diff Indicators

When editing an existing layer, fields show visual badges:

- **new** — Override added in this session
- **changed** — Override modified from loaded value
- **removed** — Override cleared that was in the loaded layer

### Bulk Actions

- **Show All** / **Hide All** — Set visibility on all fields
- **Reset** — Remove all overrides for the component
- **Expand All** / **Collapse All** — Toggle the tree view

## Override Capabilities

| Capability         | JSON Schema Extension            | Example                                    |
| ------------------ | -------------------------------- | ------------------------------------------ |
| Visibility         | `x-cms-hidden: true/false`       | Hide `hero.overlay` from editors           |
| Title              | `title: "..."`                   | Rename `srcMobile` to "Mobile Background"  |
| Description        | `description: "..."`             | Add editorial guidance                     |
| Order              | `x-cms-order: <number>`          | Reorder fields within their parent         |
| Allowed Components | `anyOf: [{ title: "..." }, ...]` | Restrict which components appear in a slot |

## Output Format

The editor produces one `.schema.json` file per component in the standard layer convention:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "http://visibility.mydesignsystem.com/hero.schema.json",
  "type": "object",
  "allOf": [
    {
      "type": "object",
      "properties": {
        "headline": { "x-cms-hidden": false, "title": "Headline" },
        "image": {
          "properties": {
            "indent": { "x-cms-hidden": true }
          }
        }
      },
      "additionalProperties": false
    },
    {
      "$ref": "http://schema.mydesignsystem.com/hero.schema.json"
    }
  ],
  "additionalProperties": false
}
```

Key rules:

- Only fields with explicit overrides are included
- Components with zero overrides produce no output file
- Nested overrides create nested `properties`/`items` structures
- Order values are normalized to sequential integers on save
- Stale files (from removed overrides) are automatically deleted

## Development

```bash
# Type check
pnpm --filter @kickstartds/schema-layer-editor typecheck

# Run tests
pnpm --filter @kickstartds/schema-layer-editor test

# Build (SPA + server)
pnpm --filter @kickstartds/schema-layer-editor build
```

## Architecture

```
src/
├── cli.ts                    — CLI entry (commander)
├── shared/
│   └── types.ts              — Shared types (FieldNode, OverrideMap, etc.)
├── server/
│   ├── index.ts              — Express server
│   ├── routes.ts             — API endpoints
│   ├── schema-loader.ts      — Load *.schema.dereffed.json files
│   ├── layer-loader.ts       — Load existing layer files
│   └── layer-writer.ts       — Write layer files to disk
└── app/
    ├── App.tsx               — Three-panel layout
    ├── main.tsx              — React bootstrap
    ├── index.html            — SPA entry
    ├── components/
    │   ├── ContentTypeList.tsx
    │   ├── ComponentList.tsx
    │   ├── SchemaTreeView.tsx
    │   ├── FieldRow.tsx
    │   ├── FieldBadges.tsx
    │   ├── BulkActions.tsx
    │   └── SaveDialog.tsx
    ├── hooks/
    │   ├── useSchemas.ts
    │   ├── useOverrides.tsx
    │   └── useLayerPersistence.ts
    ├── lib/
    │   ├── schema-tree.ts    — JSON Schema → tree model
    │   ├── override-model.ts — Override data structure
    │   ├── layer-serializer.ts — Override model → JSON Schema
    │   └── sort-fields.ts    — Sort by x-cms-order / schemaOrder
    └── styles/
        └── editor.css
```

## Related Docs

- [PRD](../docs/internal/prd/schema-layer-editor-prd.md)
- [ADRs](../docs/adr/adr-schema-layer-editor.md)
- [Checklist](../docs/internal/checklists/schema-layer-editor-checklist.md)
