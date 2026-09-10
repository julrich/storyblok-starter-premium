# ADR — Schema Layer Editor Architectural Decisions

> **Status:** Living document
> **Created:** 2026-03-05
> **Context:** [schema-layer-editor-prd.md](../internal/prd/schema-layer-editor-prd.md) | [schema-layer-editor-checklist.md](../internal/checklists/schema-layer-editor-checklist.md)

---

## ADR-001: Vite + Express Dual-Server Architecture

**Date:** 2026-03-05
**Status:** Accepted

### Context

The Schema Layer Editor needs both a frontend SPA (for the tree editor UI) and a backend (for filesystem I/O — loading schemas, reading/writing layer files). We need to decide how to wire these together during development and for production use.

### Options Considered

1. **Vite dev server + separate Express backend (proxy):** Vite serves the SPA on one port, Express runs API routes on another. Vite proxies `/api/*` to Express.
2. **Express serves everything:** Express serves both the built SPA static files and the API routes on a single port. No Vite proxy.
3. **Vite plugin for API routes:** Use a Vite middleware plugin to handle API routes inside the Vite dev server process.

### Decision

Option 1 for development, Option 2 for production. During development, we run Vite's dev server (with HMR) and an Express server concurrently. Vite's `server.proxy` forwards `/api/*` to Express. For the CLI `start` command, Express serves the pre-built SPA static files from `dist/app/` and handles API routes — single-process, single-port.

### Rationale

- Vite's HMR provides instant frontend feedback during development.
- Express is minimal — only 5 API routes needed, no ORM or auth.
- A single `start` command (CLI entry) boots Express which serves everything — simple for end users.
- Avoids coupling filesystem I/O to the Vite plugin system.

---

## ADR-002: Global Component Overrides (Not Per-Content-Type)

**Date:** 2026-03-05
**Status:** Accepted

### Context

The PRD states that components are shared across content types — a `hero` is the same `hero` whether used in a `page` or `blog-post`. The UI shows content types for _navigation_ (discovery) but stores/saves overrides per component globally.

### Options Considered

1. **Per-content-type overrides:** Allow hiding `hero.image` in `page` but showing it in `blog-post`.
2. **Global component overrides:** One set of overrides per component, applied everywhere.

### Decision

Global overrides. A single `hero.schema.json` layer file applies to all usages.

### Rationale

- Matches the existing CMS layer convention (one layer file per component name).
- Per-content-type overrides would explode file count and complicate the CMS config pipeline.
- The dereffed schemas already inline sub-schemas per component, so nested sub-component visibility (e.g. `hero.buttons[].icon` vs `cta.buttons[].icon`) is naturally independent.

---

## ADR-003: Content Type Hierarchy for Navigation

**Date:** 2026-03-05
**Status:** Accepted

### Context

With 76+ component schemas, a flat alphabetical list is not user-friendly. The PRD defines a three-tier hierarchy: Content Types → Layout (section) → Content Components.

### Decision

Implement a three-panel layout:

- **Panel 1:** 7 content types (static list from schema classification).
- **Panel 2:** Groups (Layout, Root Fields, Content) for the selected content type.
- **Panel 3:** Field tree editor for the selected component/root field.

Content types that have a `section[]` array show all three groups. Non-section types (`settings`, `event-detail`, `event-list`, `search`) show only Root Fields.

### Rationale

- Mirrors how editors think about content — top-down from page type to component.
- Section-based vs flat content types have genuinely different structures.
- Keeps the component count manageable per view.

---

## ADR-004: Schema Classification Strategy

**Date:** 2026-03-05
**Status:** Accepted

### Context

The `--schemas` directory contains `*.schema.dereffed.json` files for both content types (page, blog-post, etc.) and individual components (hero, cta, etc.). We need to classify them automatically.

### Decision

Use a hardcoded allowlist of known root content types: `page`, `blog-post`, `blog-overview`, `settings`, `event-detail`, `event-list`, `search`. Any schema whose name matches is classified as a content type; all others are classified as components.

### Rationale

- The list of content types is small (7) and changes extremely rarely.
- Trying to detect content types heuristically (e.g. "has a section array") is fragile.
- Consistent with `ROOT_CONTENT_TYPES` in `packages/storyblok-services/src/registry.ts`.

---

## ADR-005: Polymorphic Field Handling

**Date:** 2026-03-05
**Status:** Accepted

### Context

Some fields use `anyOf`/`oneOf` to represent polymorphic composition slots (e.g. `section.components`, `slider.components`). These hold arbitrary child components and should not be expanded in the layer editor.

### Decision

Fields whose `items` (for arrays) or direct value contains `anyOf`/`oneOf` with multiple sub-schemas are rendered as non-expandable leaf nodes labeled "(polymorphic — managed per component)". They cannot be drilled into or overridden at the child level.

### Rationale

- Expanding polymorphic slots would duplicate every child component's fields inside each parent — unmanageable.
- Each child component already has its own standalone schema and layer file.
- Matches the PRD's explicit goal G7.

---

## ADR-006: CLI Argument Design

**Date:** 2026-03-05
**Status:** Accepted

### Context

Need a CLI interface for `pnpm --filter schema-layer-editor start` with configurable paths.

### Decision

Use `commander` (widely used, zero-config, declarative API) for CLI argument parsing with these flags:

| Flag          | Required | Default                                      |
| ------------- | -------- | -------------------------------------------- |
| `--schemas`   | Yes      | —                                            |
| `--layer`     | No       | —                                            |
| `--namespace` | Yes      | —                                            |
| `--base-url`  | No       | `http://<namespace>.mydesignsystem.com`      |
| `--output`    | No       | Same as `--layer`, or `./output/<namespace>` |
| `--port`      | No       | `4200`                                       |

### Rationale

- `commander` is lightweight, TypeScript-friendly, and already common in Node.js CLIs.
- Two required flags (`--schemas`, `--namespace`) are the minimum needed to produce valid output.
- Defaults for `--base-url` and `--output` follow the existing convention.

---

## ADR-007: State Management with useReducer + Context

**Date:** 2026-03-05
**Status:** Accepted

### Context

The editor needs to manage override state for all components. Each component has a map of path-based overrides with visibility, title, description, and order values.

### Decision

Use React's built-in `useReducer` with Context. The reducer handles actions like `SET_VISIBILITY`, `SET_TITLE`, `SET_DESCRIPTION`, `SET_ORDER`, `RESET_COMPONENT`, `BULK_SHOW_ALL`, `BULK_HIDE_ALL`, `LOAD_OVERRIDES`.

### Rationale

- The state shape is well-defined and predictable — a nested map.
- No external state management library needed for this scope.
- Context provides clean component access without prop drilling.
- Consistent with other monorepo packages that use React built-ins.

---

## ADR-008: Override Path Convention

**Date:** 2026-03-05
**Status:** Accepted

### Context

Override keys need to uniquely identify a field at any nesting depth within a component schema.

### Decision

Use dot-separated paths with `[]` for array item traversal:

- `headline` → top-level field
- `image.srcMobile` → nested object property
- `buttons[].label` → field inside array items
- `buttons[].icon` → another field inside the same array items

### Rationale

- Consistent with JSON pointer conventions (adapted for readability).
- The `[]` marker clearly distinguishes array item traversal from object nesting.
- Matches the PRD's override semantics definition (§4.4).

---

## ADR-009: Layer Output Format Compatibility

**Date:** 2026-03-05
**Status:** Accepted

### Context

The existing CMS pipeline reads layer files with specific `$id` / `allOf` / `$ref` conventions. The editor's output must be compatible.

### Decision

Emit layer files that match the exact existing convention:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "http://<namespace>.mydesignsystem.com/<component>.schema.json",
  "type": "object",
  "allOf": [
    { "type": "object", "properties": { ... }, "additionalProperties": false },
    { "$ref": "http://schema.mydesignsystem.com/<component>.schema.json" }
  ],
  "additionalProperties": false
}
```

### Rationale

- Direct compatibility with the existing `create-storyblok-config` pipeline.
- The `$ref` in `allOf[1]` always points to the base Design System schema namespace.
- `additionalProperties: false` at both levels matches existing layer files.
