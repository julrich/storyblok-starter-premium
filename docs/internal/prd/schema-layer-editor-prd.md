# Schema Layer Editor — PRD

> **Status:** Draft
> **Created:** 2026-03-05
> **Scope:** New monorepo package `packages/schema-layer-editor` > **Relation:** Implements the tooling prerequisite for Phase 1 of [schema-layers-prd.md](schema-layers-prd.md)

---

## 1 Problem Statement

The kickstartDS schema layering architecture allows overlaying field-level metadata (visibility, language, ordering) onto the base Design System schemas. Today, creating or editing a layer — e.g. `cms/visibility/` — is entirely manual: a developer must open each JSON Schema file, cross-reference the dereffed base schema, and hand-write `x-cms-hidden`, `title`, `description`, or field-order overrides for every field.

This is error-prone and tedious because:

1. **Schemas are deeply nested.** A hero's `image` field is an object with 5 sub-properties (`srcMobile`, `srcDesktop`, `src`, `indent`, `alt`), yet the current visibility layer only records a single flat entry for `image`. There is no way to hide `image.indent` while keeping `image.srcMobile` visible.
2. **76 component schemas** exist in the Design System. Walking through all of them by hand is impractical.
3. **Shared sub-schemas expand differently per context.** The same `button` schema is embedded inside `hero.buttons[]`, `cta.buttons[]`, and `features.feature[].buttons[]`. A visibility layer must be able to hide `button.icon` inside a hero without affecting `button.icon` inside a CTA — meaning the layer must work off **dereferenced** schemas, not shared `$ref` targets.
4. **No round-trip editing.** Once a layer is written, there is no tool to reload it, visualise the current state, and make incremental changes.

We need a dedicated **Schema Layer Editor** tool: a local web application that loads dereffed component schemas, presents a UI for configuring field-level overrides, and writes out a complete set of layer JSON Schema files.

---

## 2 Goals

| #   | Goal                                                                                                                         | Success metric                                                                                                               |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| G1  | Provide a hierarchical UI that mirrors the real content architecture: content types → layout components → content components | Navigation follows the mental model of page builders: pick a content type, see its structure, drill into components          |
| G2  | Provide a visual UI to browse all component schemas and their full field trees (recursively nested)                          | Every field in every component — including nested object sub-fields — is visible and navigable in the UI                     |
| G3  | Allow toggling field visibility (`x-cms-hidden: true/false`) at any nesting depth                                            | A user can hide `hero.image.indent` without hiding `hero.image.srcMobile`                                                    |
| G4  | Allow overriding field `title`, `description`, and display order at any nesting depth                                        | Overrides appear in the generated layer file and are preserved on reload                                                     |
| G5  | Support loading an existing layer to make incremental changes                                                                | Opening the editor with a pre-existing `cms/visibility/` folder pre-populates all toggles and overrides                      |
| G6  | Generate a complete folder of valid JSON Schema layer files on save                                                          | Output files conform to the established `$id` / `allOf` / `$ref` convention used by existing layers                          |
| G7  | Skip polymorphic composition fields (`anyOf`/`oneOf` arrays like `section.components`)                                       | These fields are managed centrally by the component schemas themselves; expanding them would create unmanageable duplication |
| G8  | Work as a standalone package in the monorepo, usable via a single CLI command                                                | `pnpm --filter schema-layer-editor start` opens the editor in a browser                                                      |

---

## 3 Non-Goals

- **Runtime layer switching.** This tool produces static JSON Schema files. Dynamic per-user visibility is handled by Storyblok's native permissions system (see Phase 5 of `schema-layers-prd.md`).
- **Generating language layers via AI translation.** That is Phase 3 of `schema-layers-prd.md`. This tool only supports manual title/description editing.
- **Integrating with the MCP server or Prompter.** Consuming the generated layers in the generation pipeline is Phase 1 of `schema-layers-prd.md`.
- **Modifying the base Design System schemas.** The editor is read-only with respect to the base layer.
- **Publishing this package to npm.** It is a development-time tool, not a distributable library.

---

## 4 Concepts

### 4.1 Layer Types

The editor supports creating / editing layers with one or more of these override capabilities:

| Capability      | JSON Schema extension         | Example                                              |
| --------------- | ----------------------------- | ---------------------------------------------------- |
| **Visibility**  | `x-cms-hidden: true \| false` | Hide `hero.overlay` from editors                     |
| **Title**       | `title: "..."`                | Rename `srcMobile` to "Mobile Hintergrundbild"       |
| **Description** | `description: "..."`          | Add editorial guidance for a field                   |
| **Order**       | `x-cms-order: <number>`       | Move `headline` to position 1, `image` to position 2 |

A single layer file may contain any combination of these. The editor UI makes all four capabilities available simultaneously, and the saved output includes only the capabilities that have been explicitly set (i.e. unchanged fields are omitted from the output to keep layer files minimal).

### 4.2 Content Hierarchy Model

The project's content architecture has three distinct tiers. The editor must reflect this hierarchy in both its navigation and its schema tree rendering, rather than presenting a flat list of 76 component schemas.

#### Tier 1 — Content Types (root schemas)

The 7 content types define what kinds of pages/entries exist:

| Content Type    | Root Fields                                                                                        | Has Sections? |
| --------------- | -------------------------------------------------------------------------------------------------- | ------------- |
| `page`          | `header`, `footer`, `token`, `hidePageBreadcrumbs`, `seo`                                          | ✓ `section[]` |
| `blog-post`     | `head`, `aside`, `content`, `cta`, `seo`                                                           | ✓ `section[]` |
| `blog-overview` | `latestTitle`, `latest`, `listTitle`, `list[]`, `moreTitle`, `more[]`, `cta`, `seo`                | ✓ `section[]` |
| `settings`      | `header`, `footer`, `seo`, `iconSprite`, `token`, `hideBreadcrumbs`                                | ✗             |
| `event-detail`  | `title`, `categories[]`, `intro`, `locations[]`, `download[]`, `description`, `images[]`, `button` | ✗             |
| `event-list`    | `filter`, `events[]`                                                                               | ✗             |
| `search`        | `headline`, `searchBar`, `searchFilter`, `searchResults[]`                                         | ✗             |

Content type root fields (e.g. `page.seo`, `blog-post.head`, `event-detail.locations[]`) are **editable in-place** — their sub-fields can be shown/hidden, reordered, and renamed just like any component field.

#### Tier 2 — Layout Components (section)

Content types that have a `section[]` array use the **section** component as a layout wrapper. The section schema has its own scalar fields (`width`, `style`, `spaceBefore`, etc.) plus a polymorphic `components` array that holds the actual content components. The `section` itself is editable (its own fields can be shown/hidden), but its `components` field is not expandable — each component inside it is managed at Tier 3.

#### Tier 3 — Content Components

The individual components placed inside sections (or referenced from root fields): `hero`, `cta`, `features`, `testimonials`, `faq`, `headline`, `text`, etc. These are the schemas where most field-level editing happens.

**Components are shared across content types.** A `hero` is always a `hero`, regardless of whether it appears in a `page` or a `blog-post`. The layer file `hero.schema.json` applies everywhere a hero is used. The content type tiers in this UI exist purely for **navigation** — they help the user discover which components exist — but overrides are stored and saved per component, not per content type.

Within a single component's dereferenced schema, nested sub-schemas _are_ independent. For example, the `button` embedded in `hero.buttons[]` is a different sub-tree from the `button` in `cta.buttons[]`, so hiding `hero.buttons[].icon` does not affect `cta.buttons[].icon`. This differentiation happens naturally because each component's dereffed schema has already inlined its own copy of shared sub-schemas.

### 4.3 Schema Tree Model

Each schema (whether a content type root or a component) is parsed into a tree:

```
ComponentNode ("hero")
├── FieldNode ("headline", type: string)
├── FieldNode ("sub", type: string)
├── FieldNode ("text", type: string)
├── FieldNode ("highlightText", type: boolean)
├── FieldNode ("buttons", type: array)
│   └── ItemNode (type: object)          ← array items are expandable
│       ├── FieldNode ("label", type: string)
│       ├── FieldNode ("icon", type: string)
│       └── FieldNode ("url", type: string)
├── FieldNode ("image", type: object)
│   ├── FieldNode ("srcMobile", type: string)
│   ├── FieldNode ("srcDesktop", type: string)
│   ├── FieldNode ("src", type: string)
│   ├── FieldNode ("indent", type: string)
│   └── FieldNode ("alt", type: string)
└── FieldNode ("textPosition", type: string)
```

A content type root schema is parsed the same way, but its section array and polymorphic composition slots are treated specially:

```
ContentTypeNode ("blog-post")
├── FieldNode ("head", type: object)     ← editable, deep sub-fields
│   ├── FieldNode ("date", type: string)
│   ├── FieldNode ("tags", type: array)
│   ├── FieldNode ("headline", type: string)
│   └── ...
├── FieldNode ("aside", type: object)    ← editable, deep sub-fields
├── FieldNode ("content", type: string)  ← editable scalar
├── FieldNode ("section", type: array)   ← NOT expanded (→ section + components at Tier 2/3)
├── FieldNode ("cta", type: object)      ← editable, deep sub-fields
└── FieldNode ("seo", type: object)      ← editable, deep sub-fields
```

**Polymorphic fields** (those whose `items` or direct value contains `anyOf`/`oneOf` with multiple sub-schemas) are rendered as a non-expandable leaf with a label like _"components (polymorphic — managed per component)"_. They cannot be drilled into. This covers `section.components`, `slider.components`, and similar composition slots.

### 4.4 Override Semantics

Overrides are path-based. The key for a field is its dot-separated path within the component:

- `headline` → top-level field
- `image.srcMobile` → nested object field
- `buttons[].label` → field inside array items

When a parent field has `x-cms-hidden: true`, all of its children are implicitly hidden. The UI reflects this by greying out children and showing an "(inherited)" badge. Children can still be individually overridden — if the parent is later un-hidden, the child overrides take effect.

### 4.5 Output Format

The editor produces one `.schema.json` file per component, following the existing convention:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "http://<layer-namespace>.mydesignsystem.com/hero.schema.json",
  "type": "object",
  "allOf": [
    {
      "type": "object",
      "properties": {
        "headline": {
          "x-cms-hidden": false,
          "title": "Headline override",
          "x-cms-order": 1
        },
        "image": {
          "x-cms-hidden": false,
          "properties": {
            "srcMobile": {
              "x-cms-hidden": false,
              "title": "Mobiles Hintergrundbild"
            },
            "indent": {
              "x-cms-hidden": true
            }
          }
        },
        "textPosition": {
          "x-cms-hidden": true
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

Key points:

- Nested objects recurse into `properties` inside the override, mirroring the base schema structure.
- Array items recurse via an `items` key (e.g. `"buttons": { "items": { "properties": { "icon": { "x-cms-hidden": true } } } }`).
- Only fields with explicit overrides are included. A component with zero overrides produces no output file.
- The `$ref` in the second `allOf` entry always points to the base Design System schema namespace.

---

## 5 Architecture

### 5.1 Package Structure

```
packages/schema-layer-editor/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── cli.ts                   — CLI entry: parse args, start dev server
│   ├── server/
│   │   ├── index.ts             — Express/Fastify dev server
│   │   ├── schema-loader.ts     — Load dereffed schemas, classify into content types vs components, build hierarchy
│   │   ├── layer-loader.ts      — Load existing layer files into override model
│   │   ├── layer-writer.ts      — Serialize override model → JSON Schema layer files
│   │   └── routes.ts            — API routes (GET schemas, GET/POST overrides, POST save)
│   └── app/
│       ├── index.html           — SPA entry
│       ├── main.tsx             — React app bootstrap
│       ├── App.tsx              — Root layout: sidebar + editor pane
│       ├── components/
│       │   ├── ContentTypeList.tsx    — Panel 1: content type selector
│       │   ├── ComponentList.tsx      — Panel 2: layout + root fields + content components
│       │   ├── SchemaTreeView.tsx     — Panel 3: recursive field tree with expand/collapse
│       │   ├── FieldRow.tsx           — Single field: visibility toggle, title, desc, order
│       │   ├── FieldBadges.tsx        — Type badge, required badge, inherited-hidden badge
│       │   ├── BulkActions.tsx        — "Show all" / "Hide all" / "Reset" for a component
│       │   └── SaveDialog.tsx         — Output folder picker, namespace config, save confirmation
│       ├── hooks/
│       │   ├── useSchemas.ts          — Fetch schemas from server API
│       │   ├── useOverrides.ts        — In-memory override state management
│       │   └── useLayerPersistence.ts — Save/load layer via server API
│       ├── lib/
│       │   ├── schema-tree.ts         — Parse JSON Schema → tree model (§4.2)
│       │   ├── override-model.ts      — Override data structure and merge logic
│       │   └── layer-serializer.ts    — Convert override model → layer JSON (client-side preview)
│       └── styles/
│           └── editor.css             — Minimal, functional CSS
```

### 5.2 Technology Choices

| Concern            | Choice                       | Rationale                                                             |
| ------------------ | ---------------------------- | --------------------------------------------------------------------- |
| Frontend framework | React 18 + TypeScript        | Consistent with the rest of the monorepo                              |
| Bundler            | Vite                         | Fast dev server, zero-config for React+TS                             |
| Backend            | Express (minimal)            | Serves the SPA, provides a handful of API routes for file I/O         |
| Styling            | Plain CSS / CSS modules      | No design system dependency — this is a dev tool, not a production UI |
| State management   | React `useReducer` + Context | Sufficient for a single-page tree editor                              |

### 5.3 API Routes

| Method | Path           | Description                                                                                                              |
| ------ | -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `GET`  | `/api/schemas` | Returns all loaded schemas: content types (with classified root fields) and component schemas (parsed tree model per §7) |
| `GET`  | `/api/layer`   | Returns the currently loaded layer overrides (if an existing layer was specified)                                        |
| `POST` | `/api/layer`   | Updates the in-memory override state                                                                                     |
| `POST` | `/api/save`    | Writes the layer files to the specified output directory                                                                 |
| `GET`  | `/api/config`  | Returns current config (schema source dir, layer namespace, output dir)                                                  |

### 5.4 CLI Interface

```bash
# Start the editor with schema source and optional existing layer
pnpm --filter schema-layer-editor start \
  --schemas ../website/node_modules/@kickstartds/ds-agency-premium/dist/components \
  --layer ../website/cms/visibility \
  --namespace visibility \
  --output ../website/cms/visibility

# Or with a base-url (for custom $id namespaces)
pnpm --filter schema-layer-editor start \
  --schemas ../website/node_modules/@kickstartds/ds-agency-premium/dist/components \
  --namespace language \
  --base-url "http://language.mydesignsystem.com" \
  --output ../website/cms/language
```

| Flag          | Required | Default                                      | Description                                                                                                                                                                          |
| ------------- | -------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--schemas`   | Yes      | —                                            | Path to directory containing `*.schema.dereffed.json` files (scanned recursively). Must include both content type schemas (page, blog-post, …) and component schemas (hero, cta, …). |
| `--layer`     | No       | —                                            | Path to existing layer directory to load for editing                                                                                                                                 |
| `--namespace` | Yes      | —                                            | Layer name used in `$id` URLs (e.g. `visibility`, `language`, `editorial`)                                                                                                           |
| `--base-url`  | No       | `http://<namespace>.mydesignsystem.com`      | Custom base URL for `$id` generation                                                                                                                                                 |
| `--output`    | No       | Same as `--layer`, or `./output/<namespace>` | Where to write generated layer files                                                                                                                                                 |
| `--port`      | No       | `4200`                                       | Dev server port                                                                                                                                                                      |

---

## 6 UI Design

### 6.1 Layout — Three-Panel Hierarchy

The UI uses three coordinated panels that mirror the content hierarchy (§4.2), rather than a flat component list:

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  Schema Layer Editor                        [namespace: visibility]      [💾 Save]  │
├───────────────┬─────────────────────┬────────────────────────────────────────────────┤
│ Content Types │ Components          │  hero                             [Actions]   │
│               │                     │                                               │
│ ▸ page ◀      │ Layout              │  ☑ headline        "Headline"       ○ ① ▴▾   │
│   blog-post   │   ● section         │    type: string (markdown)                    │
│   blog-over…  │                     │                                               │
│   settings    │ Root Fields         │  ☑ sub             "Module Subhea…" ○ ② ▴▾   │
│   event-det…  │   ● header          │    type: string (markdown)                    │
│   event-list  │     footer          │                                               │
│   search      │     seo             │  ☑ text            "Module Text"    ○ ③ ▴▾   │
│               │                     │    type: string (markdown)                    │
│               │ Content             │                                               │
│               │   ● blog-teaser     │  ☐ highlightText   "Highlight Text" ○ ④ ▴▾   │
│               │     contact         │    type: boolean  [hidden]                    │
│               │     cta             │                                               │
│               │     faq             │  ☑ buttons                          ○ ⑤ ▴▾   │
│               │     features        │    type: array                                │
│               │     gallery         │    ▾ items (object)                           │
│               │     headline        │      ☑ label       "Label"          ○ ① ▴▾   │
│               │   ▸ hero ◀          │      ☐ icon        "Icon"           ○ ② ▴▾   │
│               │     html            │        [hidden]                               │
│               │     image-story     │      ☑ url         "URL"            ○ ③ ▴▾   │
│               │     image-text      │                                               │
│               │     logos           │  ☑ image                            ○ ⑥ ▴▾   │
│               │     mosaic          │    type: object                                │
│               │     slider          │    ▾ properties                                │
│               │     ...             │      ☑ srcMobile   "Mobile image…"  ○ ① ▴▾   │
│               │                     │      ☑ srcDesktop  "Desktop imag…"  ○ ② ▴▾   │
│               │ Legend:             │      ☐ indent      "Image indent"   ○ ③ ▴▾   │
│               │ ● = has overrides   │        [hidden]                               │
│               │ ☑ = visible         │      ☑ alt         "Alt text"       ○ ④ ▴▾   │
│               │ ☐ = hidden          │                                               │
│               │ ○ = edit details    │  ☐ textPosition    "Module aligm…"  ○ ⑦ ▴▾   │
│               │                     │    type: string (enum)  [hidden]              │
└───────────────┴─────────────────────┴────────────────────────────────────────────────┘
```

**Panel 1 — Content Types** (leftmost, narrow): Lists the 7 content types. Selecting one populates Panel 2.

**Panel 2 — Components** (middle): Shows three groups for the selected content type:

- **Layout**: The section component (for content types that have `section[]`). Clicking it opens section's own fields in Panel 3.
- **Root Fields**: Non-section root fields of the content type (e.g. `header`, `footer`, `seo` for `page`; `head`, `aside`, `cta`, `seo` for `blog-post`). Clicking a root field opens its sub-fields in Panel 3. Scalar root fields (e.g. `token`, `content`) are shown inline with a visibility toggle directly in Panel 2.
- **Content**: The components available inside sections (for section-based content types) — `hero`, `cta`, `features`, etc. For non-section content types like `event-detail`, this group is omitted since all fields are root fields.

**Panel 3 — Field Editor** (rightmost, wide): Shows the field tree for the selected component or root field, with all editing controls.

### 6.2 Panel 1: Content Type List

- All 7 content types listed vertically.
- A badge shows how many components/root fields have overrides (e.g. `page (3/28)`).
- Active content type is highlighted.
- No search needed — the list is short enough.

### 6.3 Panel 2: Component & Root Field List

This panel changes based on the selected content type and is divided into up to three groups:

**Layout group** — Shown only for section-based content types (`page`, `blog-post`, `blog-overview`). Contains the `section` component. Clicking it opens section's own fields (width, style, spaceBefore, etc.) in Panel 3. The polymorphic `components` field inside section is shown as a non-expandable label.

**Root Fields group** — Shows root-level fields of the content type that are not the section array:

- Object root fields (e.g. `seo`, `header`, `head`, `aside`, `cta`, `filter`) are clickable — they open their sub-field tree in Panel 3.
- Scalar root fields (e.g. `token`, `content`, `title`, `hideBreadcrumbs`) are shown inline with a simple visibility toggle, since they have no sub-structure.
- Array-of-object root fields (e.g. `event-detail.locations[]`, `blog-overview.list[]`) are clickable — they open their item's sub-field tree in Panel 3.

**Content group** — Components available in the section's `components` anyOf. Alphabetical list with search/filter. A dot indicator (●) marks components with overrides. This group is omitted for content types that have no section array (`settings`, `event-detail`, `event-list`, `search`).

**Important:** The content type hierarchy is purely navigational. Components are **shared** — a `hero` is the same `hero` in every content type that uses sections. Clicking `hero` in the `page` content type or in `blog-post` opens the same component with the same overrides. The content type grouping helps editors discover which components exist, but overrides are stored and saved per component globally (one `hero.schema.json` output file, not one per content type).

### 6.4 Panel 3: Field Editor

Each field is rendered as a **FieldRow** with:

1. **Visibility checkbox** — ☑ visible / ☐ hidden. Toggling sets `x-cms-hidden`. When a parent is hidden, children show greyed-out checkboxes with "(inherited)" label.
2. **Field name** — the JSON property name, displayed as code.
3. **Title override** — inline-editable text field, pre-populated with the base schema's `title`. Editing sets the layer's `title`.
4. **Detail edit button** (○) — opens an inline expansion or modal with:
   - `description` override (textarea)
   - `x-cms-order` (number spinner)
   - Read-only metadata from the base schema: type, format, enum values, default, required status
5. **Order controls** (▴▾) — reorder fields within their parent. Sets `x-cms-order` on all siblings.
6. **Type badge** — shows the field type (`string`, `boolean`, `object`, `array`, enum values, format like `markdown` / `image` / `uri`).

**Nested fields** are rendered as collapsible sub-trees:

- **Object fields** → expand to show child properties, indented.
- **Array fields** → expand to show the `items` schema. If `items` is an object, its properties are shown. If `items` is itself polymorphic (`anyOf`), a label _"(polymorphic — managed per component)"_ is shown instead and the node is not expandable.
- **Scalar fields** (string, number, boolean) → leaf nodes, no expansion.

### 6.5 Bulk Actions

A toolbar above the field tree offers:

| Action                        | Effect                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Show All**                  | Sets `x-cms-hidden: false` on every field in the current component (recursive)                         |
| **Hide All**                  | Sets `x-cms-hidden: true` on every field                                                               |
| **Reset**                     | Removes all overrides for the current component                                                        |
| **Expand All / Collapse All** | Toggle the tree view                                                                                   |
| **Copy from…**                | Copy overrides from another component (useful when e.g. `features` and `stats` have similar structure) |

### 6.6 Save Dialog

Triggered by the Save button. Shows:

1. **Output directory** — pre-filled from `--output` CLI flag, editable.
2. **Namespace** — pre-filled from `--namespace`, editable. Controls the `$id` URL.
3. **Preview** — list of files that will be written, with a diff indicator (new / modified / unchanged).
4. **Write mode** — "Overwrite existing files" (default) or "Merge with existing" (adds new overrides, preserves overrides not present in the editor's state).
5. **Confirm** button.

### 6.7 Diff Indicators

When an existing layer is loaded, the editor shows visual diff indicators:

- Fields whose overrides **match** the loaded layer: shown normally.
- Fields whose overrides have been **changed** in this session: highlighted with a subtle color.
- Fields with **new** overrides (not in the loaded layer): marked with a "new" badge.
- Fields whose overrides have been **removed** (present in loaded layer, cleared in editor): shown with a strikethrough.

---

## 7 Schema Tree Parsing Rules

The `schema-tree.ts` module converts dereffed JSON Schemas into the tree model. There are two entry points:

### 7.1 Content Type Parsing

A content type schema (e.g. `page.schema.dereffed.json`) is parsed into a `ContentTypeNode`:

1. Its `properties` are classified into three groups:
   - **Section array** — a property of `type: "array"` whose `items` have a `properties.components` with `anyOf`. This identifies the section-based layout pattern. There is at most one such property per content type.
   - **Root object/array fields** — non-section properties with `type: "object"` or `type: "array"` (with non-polymorphic items). These become clickable entries in Panel 2's "Root Fields" group.
   - **Root scalar fields** — simple properties (`string`, `boolean`, `number`). These get inline toggles in Panel 2.
2. If a section array is found, its `items` schema is extracted as the **section component** (shown in Panel 2's "Layout" group). The `components` property within the section `items` is parsed to extract the `anyOf` variants — each variant becomes an entry in Panel 2's "Content" group.

### 7.2 Component Parsing

A component schema (extracted from a section's `anyOf` variant or from a root field) is parsed into a `ComponentNode`:

1. **Root object** → `ComponentNode`. Its `properties` become child `FieldNode`s.
2. **Object field** (`type: "object"` with `properties`) → `FieldNode` with children from `properties`.
3. **Array field** (`type: "array"` with `items`) →
   - If `items` is an object schema (has `properties`): `FieldNode` with a single `ItemNode` child, whose children are the item's properties.
   - If `items` has `anyOf`/`oneOf`: `FieldNode` marked as polymorphic. Not expandable. No children.
   - If `items` is a scalar schema: `FieldNode` as a leaf (same as a scalar field).
4. **Scalar field** (`type: "string"`, `"number"`, `"boolean"`, `"integer"`) → leaf `FieldNode`.
5. **Enum field** (has `enum` array) → leaf `FieldNode` with enum values shown as metadata.
6. **`anyOf`/`oneOf` at field level** (not inside `items`) → if it represents a polymorphic composition slot, mark as non-expandable. Otherwise, if all branches share the same type, treat as that type.
7. **`allOf`** → merge all sub-schemas, then apply rules above.
8. **`$ref`** → should not appear in dereffed schemas, but if encountered, log a warning and treat as opaque.

**Maximum recursion depth** is not explicitly limited but is naturally bounded by the dereffed schema structure (typically 3-4 levels in this Design System).

---

## 8 Layer Serialization Rules

When writing output files, `layer-writer.ts` follows these rules:

1. **Only fields with explicit overrides are included.** If a field has no visibility toggle, no title/description change, and no order change, it is omitted entirely.
2. **Nested overrides produce nested `properties`/`items`.** If `image.indent` is hidden but `image` itself has no direct override, the output still includes `"image": { "properties": { "indent": { "x-cms-hidden": true } } }` to provide the structural path.
3. **Structural-only parents are minimal.** A parent included only for pathing contains no override keys of its own — just `properties` or `items`.
4. **The `$id` uses the configured namespace.** E.g. `http://visibility.mydesignsystem.com/hero.schema.json`.
5. **The `$ref` always points to the base schema namespace** (`http://schema.mydesignsystem.com/`).
6. **Components with zero overrides produce no output file.** A save operation skips them entirely (and deletes them from the output directory if a previous version existed).
7. **`additionalProperties: false`** is set at the root and on the override object within `allOf`, matching the existing convention.
8. **Field order** (`x-cms-order`) values are written as integers starting from 1, reflecting the user's desired display order. Only included when the user has explicitly reordered fields (not just accepted the default schema order).

---

## 9 Loading Existing Layers

When `--layer` is provided, `layer-loader.ts`:

1. Scans the directory for `*.schema.json` files.
2. Parses each file, extracting the override object from the first entry in `allOf`.
3. Walks the override properties recursively, building the same path-based override model used by the editor.
4. Matches overrides to fields in the loaded base schemas by component name (derived from `$id` or filename).
5. Logs warnings for overrides that reference fields not present in the base schema (stale overrides from a schema version mismatch).
6. Pre-populates the editor's state so checks, titles, descriptions, and order values reflect the loaded layer.

---

## 10 Implementation Plan

### Phase A — Schema Loading & Tree Model

**Deliverables:**

- [ ] `packages/schema-layer-editor/package.json` — package setup with Vite, React, Express, TypeScript
- [ ] `src/server/schema-loader.ts` — recursively load `*.schema.dereffed.json`, classify into content types vs components, extract section/component hierarchy (§7.1)
- [ ] `src/app/lib/schema-tree.ts` — JSON Schema → tree model conversion for both content types and components (§7 rules)
- [ ] `src/app/lib/override-model.ts` — override data structure (Map of component → path-based overrides). Components are global, not scoped per content type.
- [ ] Unit tests for tree parsing with sample schemas of varying nesting depths
- [ ] Unit tests for content type classification (section-based vs flat)

### Phase B — Server & CLI

**Deliverables:**

- [ ] `src/cli.ts` — argument parsing (`--schemas`, `--layer`, `--namespace`, `--output`, `--base-url`, `--port`)
- [ ] `src/server/index.ts` — Express server serving SPA + API routes
- [ ] `src/server/routes.ts` — API endpoints per §5.3
- [ ] `src/server/layer-loader.ts` — load existing layer files into override model
- [ ] `src/server/layer-writer.ts` — serialize override model to JSON Schema layer files per §8 rules
- [ ] Integration tests: load schemas → apply overrides → save → reload → verify round-trip

### Phase C — UI: Component List & Field Tree

**Deliverables:**

- [ ] `src/app/App.tsx` — three-panel layout shell (content types → components → field editor)
- [ ] `src/app/components/ContentTypeList.tsx` — Panel 1: content type selector with override counts
- [ ] `src/app/components/ComponentList.tsx` — Panel 2: grouped list (Layout / Root Fields / Content) for selected content type
- [ ] `src/app/components/SchemaTreeView.tsx` — Panel 3: recursive field tree rendering
- [ ] `src/app/components/FieldRow.tsx` — single field with visibility checkbox, title, type badge
- [ ] `src/app/components/FieldBadges.tsx` — type/format/required/inherited badges
- [ ] `src/app/hooks/useSchemas.ts` — fetch content type and component schemas from `/api/schemas`
- [ ] `src/app/hooks/useOverrides.ts` — `useReducer`-based state management for per-component overrides

### Phase D — UI: Editing Capabilities

**Deliverables:**

- [ ] Visibility toggle with inherited-hidden cascading logic
- [ ] Inline title editing
- [ ] Detail expansion panel: description textarea, order spinner, read-only metadata
- [ ] Field reordering via drag-and-drop or ▴▾ buttons
- [ ] `src/app/components/BulkActions.tsx` — show all, hide all, reset, expand/collapse, copy-from
- [ ] Diff indicators for changed/new/removed overrides (when loaded from existing layer)

### Phase E — Save & Persistence

**Deliverables:**

- [ ] `src/app/components/SaveDialog.tsx` — output folder, namespace, write mode, file preview
- [ ] `src/app/hooks/useLayerPersistence.ts` — save via `/api/save`, load via `/api/layer`
- [ ] `src/app/lib/layer-serializer.ts` — client-side preview of output JSON
- [ ] Cleanup logic: delete layer files for components with zero overrides
- [ ] End-to-end test: create layer from scratch, save, reload, modify, re-save

---

## 11 Edge Cases

| Scenario                                                                              | Handling                                                                                                                                                 |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base schema has `anyOf` at property level (not `items`)                               | If all variants share compatible structure (e.g. same type, different enum values), merge and show as single field. Otherwise, mark as polymorphic leaf. |
| Base schema field uses `$ref` (should be dereffed but isn't)                          | Log warning: "Unexpected $ref in dereffed schema at `<path>`. Field will be shown as opaque."                                                            |
| Parent object hidden, child has explicit `x-cms-hidden: false`                        | Store child override. UI shows child as greyed with "(overridden, but parent hidden)". If parent is un-hidden, child becomes visibly overridden.         |
| Field order conflicts (two fields get same `x-cms-order`)                             | Normalize on save: re-number all siblings sequentially.                                                                                                  |
| Loaded layer references a field not in the base schema                                | Show a "(stale)" warning badge. Override is preserved on save unless explicitly removed by the user.                                                     |
| Very large component (section with many fields)                                       | Virtual scrolling / windowing if field count exceeds ~50 rows.                                                                                           |
| Component name collision (two schemas with same base name from different directories) | Use full relative path as key. Display a disambiguation suffix in the UI.                                                                                |

---

## 12 Example: Hero Visibility Layer — Before & After

### Before (current flat layer)

```json
{
  "image": { "x-cms-hidden": false },
  "buttons": { "x-cms-hidden": false }
}
```

No way to hide `image.indent` or `buttons[].icon` individually.

### After (deep layer produced by this tool)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "http://visibility.mydesignsystem.com/hero.schema.json",
  "type": "object",
  "allOf": [
    {
      "type": "object",
      "properties": {
        "headline": { "x-cms-hidden": false },
        "sub": { "x-cms-hidden": false },
        "text": { "x-cms-hidden": false },
        "highlightText": { "x-cms-hidden": true },
        "colorNeutral": { "x-cms-hidden": true },
        "height": { "x-cms-hidden": true },
        "textbox": { "x-cms-hidden": true },
        "buttons": {
          "x-cms-hidden": false,
          "items": {
            "properties": {
              "label": { "x-cms-hidden": false },
              "icon": { "x-cms-hidden": true },
              "url": { "x-cms-hidden": false }
            }
          }
        },
        "overlay": { "x-cms-hidden": true },
        "image": {
          "x-cms-hidden": false,
          "properties": {
            "srcMobile": { "x-cms-hidden": false },
            "srcDesktop": { "x-cms-hidden": false },
            "src": { "x-cms-hidden": true },
            "indent": { "x-cms-hidden": true },
            "alt": { "x-cms-hidden": false }
          }
        },
        "textPosition": { "x-cms-hidden": true }
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

---

## 13 Open Questions

1. **Should the editor support multiple simultaneous layers?** E.g. editing both visibility and language layers side-by-side for the same component. Current design says no — one layer at a time. The tool can be opened multiple times with different `--namespace` flags.

2. **Should `x-cms-order` affect the base schema's property iteration order, or is it purely a CMS hint?** Current assumption: it is a CMS hint consumed by `create-storyblok-config`, which maps it to Storyblok's field `pos` attribute. The base schema iteration order is unaffected.

3. **Should the tool support "template" layers?** E.g. a "minimal" template that auto-hides all fields except those tagged `required` in the base schema. This could be a useful starting point but may add scope. Recommendation: add as a post-MVP enhancement — a "Hide non-required fields" bulk action.
