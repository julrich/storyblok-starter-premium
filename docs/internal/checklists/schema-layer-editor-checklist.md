# Schema Layer Editor — Implementation Checklist

> **Status:** In progress — core + UI features complete, integration tests remaining
> **Created:** 2026-03-05
> **PRD:** [schema-layer-editor-prd.md](../prd/schema-layer-editor-prd.md) > **ADRs:** [adr-schema-layer-editor.md](../../adr/adr-schema-layer-editor.md)

---

## Phase A — Schema Loading & Tree Model

- [x] `packages/schema-layer-editor/package.json` — package setup with Vite, React, Express, TypeScript
- [x] `packages/schema-layer-editor/tsconfig.json` — TypeScript config (+ `tsconfig.server.json`)
- [x] `packages/schema-layer-editor/vite.config.ts` — Vite config for React SPA
- [x] `src/shared/types.ts` — shared types for server and client (FieldType, FieldMeta, FieldNode, ComponentNode, ContentTypeInfo, OverrideMap, API types)
- [x] `src/server/schema-loader.ts` — recursively load `*.schema.dereffed.json`, classify into content types vs components, extract section/component hierarchy
- [x] `src/app/lib/schema-tree.ts` — JSON Schema → tree model conversion for both content types and components
- [x] `src/app/lib/override-model.ts` — override data structure (Map of component → path-based overrides)
- [x] Unit tests for tree parsing with sample schemas (38 tests in `test/schema-tree.test.ts`)
- [x] Unit tests for content type classification (18 tests in `test/content-type-classification.test.ts`)
- [x] `$ref` warning in `parseField()` for unexpected unresolved references in dereffed schemas

## Phase B — Server & CLI

- [x] `src/cli.ts` — argument parsing (`--schemas`, `--layer`, `--namespace`, `--output`, `--base-url`, `--port`)
- [x] `src/server/index.ts` — Express server serving SPA + API routes
- [x] `src/server/routes.ts` — API endpoints (GET /api/schemas, GET/POST /api/layer, POST /api/save, GET /api/config)
- [x] `src/server/layer-loader.ts` — load existing layer files into override model
- [x] `src/server/layer-writer.ts` — serialize override model → JSON Schema layer files
- [ ] Integration tests: load schemas → apply overrides → save → reload → verify round-trip

## Phase C — UI: Component List & Field Tree

- [x] `src/app/App.tsx` — three-panel layout shell (content types → components → field editor)
- [x] `src/app/main.tsx` — React app bootstrap
- [x] `src/app/index.html` — SPA entry
- [x] `src/app/styles/editor.css` — full CSS styles (dark theme, three-panel layout, field rows, dialogs)
- [x] `src/app/components/ContentTypeList.tsx` — Panel 1: content type selector with override counts
- [x] `src/app/components/ComponentList.tsx` — Panel 2: grouped list (Layout / Root Fields / Content)
- [x] `src/app/components/SchemaTreeView.tsx` — Panel 3: recursive field tree rendering
- [x] `src/app/components/FieldRow.tsx` — single field with visibility checkbox, title, type badge
- [x] `src/app/components/FieldBadges.tsx` — type/format/required/inherited badges
- [x] `src/app/hooks/useSchemas.ts` — fetch content type and component schemas from `/api/schemas`
- [x] `src/app/hooks/useOverrides.tsx` — `useReducer`-based state management for per-component overrides

## Phase D — UI: Editing Capabilities

- [x] Visibility toggle with inherited-hidden cascading logic
- [x] Inline title editing
- [x] Detail expansion panel: description textarea, order spinner, read-only metadata
- [x] Field reordering via ▴▾ buttons
- [x] `src/app/components/BulkActions.tsx` — show all, hide all, reset buttons
- [x] Diff indicators for changed/new/removed overrides (baseline snapshot in context, badges in FieldBadges)
- [x] Expand All / Collapse All bulk actions (generation-based state broadcast)
- [x] Stale override warnings (server-side path comparison, `stale` badge in UI)
- [x] Order normalization on save (`normalizeOrders()` in layer-serializer)

## Phase E — Save & Persistence

- [x] `src/app/components/SaveDialog.tsx` — output folder, namespace, write mode, file preview
- [x] `src/app/hooks/useLayerPersistence.ts` — save via `/api/save`, load via `/api/layer`
- [x] `src/app/lib/layer-serializer.ts` — client-side preview of output JSON
- [x] Cleanup logic: delete layer files for components with zero overrides (in layer-writer.ts)
- [ ] End-to-end test: create layer from scratch, save, reload, modify, re-save

## Integration & Polish

- [x] TypeScript compilation passes (zero errors in both client and server configs)
- [x] Vite build passes (42 modules, ~159 KB JS + ~10 KB CSS)
- [x] README.md with usage instructions, CLI options, UI overview, output format, architecture
- [ ] Verify `pnpm --filter schema-layer-editor dev` works end-to-end with real schemas
