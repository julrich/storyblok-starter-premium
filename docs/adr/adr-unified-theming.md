# ADR: Unified W3C Theming Architecture

**Status:** Accepted
**Date:** 2026-03-12
**Relates to:** [unified-theming-prd.md](../internal/prd/unified-theming-prd.md)

---

## ADR-1: Design System as Single Source of Truth for Default Theme

### Context

Two `branding-token.json` files existed:

- `packages/design-system/src/token/branding-tokens.json` — W3C DTCG format, canonical Design System tokens
- `packages/website/token/branding-token.json` — flat/legacy format, per-project customization compiled into `global.css`

The website-specific file was introduced when the Design System could serve multiple independent projects. Now that this is a monorepo, the duplication creates drift risk.

### Decision

**Use the Design System's `branding-tokens.json` as the single source of truth.** Remove the website-specific `branding-token.json` and update the website's build pipeline to read directly from the Design System.

### Consequences

- The website's `build-tokens` script must be updated to accept the Design System's W3C format instead of the flat format — this depends on `kickstartDS tokens compile` supporting W3C input, or using `tokensToCss.mjs` directly
- `packages/website/token/branding-token.json` is deleted
- Per-project customization is now achieved through Storyblok themes (create a new theme → apply it), not by editing a local file
- The `init-tokens` script in `packages/website/package.json` references the old path and must be updated or removed

---

## ADR-2: `tokensToCss()` as the Canonical Compiler

### Context

Two compilation paths exist:

1. `kickstartDS tokens compile` — CLI command used by the website's `build-tokens` script, consumes the flat JSON format and dictionary files
2. `tokensToCss.mjs` — Design System script that converts W3C DTCG JSON → CSS custom properties, used by the Design Tokens Editor

Both produce the same output (`:root { --ks-brand-*: ...; }`) but from different input formats.

### Decision

**Use `tokensToCss()` from `@kickstartds/design-system/scripts/tokensToCss.mjs` as the single CSS compilation function** for all theme operations (Storyblok MCP `create_theme`/`update_theme`, Design Tokens Editor, sync-default-theme script). The website's build pipeline continues using `kickstartDS tokens compile` for the full token build (which includes dictionary files, not just branding tokens), but the branding CSS compilation step uses the same W3C → CSS path.

### Consequences

- `storyblok-services` gains a dependency on `@kickstartds/design-system` (or receives `tokensToCss` as a parameter to avoid the hard dependency)
- All systems produce identical CSS from the same W3C input — eliminates format conversion bugs
- The Design Tokens Editor's standalone CSS compilation is replaced by the shared function

---

## ADR-3: Shared Theme CRUD in `storyblok-services`

### Context

Theme CRUD exists in two independent implementations:

1. `packages/storyblok-services/src/themes.ts` — used by Storyblok MCP and n8n node (read + apply only)
2. `packages/design-tokens-editor/src/server/storyblok.ts` — full CRUD with its own rate limiting, folder creation, and Storyblok API calls

This duplication means bug fixes and new features (like system-theme protection) must be applied in two places.

### Decision

**Add `createTheme()` and `updateTheme()` to `storyblok-services/src/themes.ts`** and refactor the Design Tokens Editor to delegate to these shared functions. All theme operations flow through a single implementation.

### Consequences

- `storyblok-services/src/themes.ts` becomes the single CRUD authority for themes
- The Design Tokens Editor's `storyblok.ts` reduces to a thin adapter (maps Express routes to shared functions)
- System-theme protection (`system: true` guard) is implemented once, enforced everywhere
- n8n node gains `create` and `update` operations with zero additional CRUD code

---

## ADR-4: `system` Field for Theme Protection

### Context

The default theme (synced from code) must be protected from accidental modification or deletion through the Editor, MCP, or n8n. Two approaches considered:

1. **Slug convention** — reserve the slug "default" and reject operations on it
2. **`system` boolean field** — mark the story content with `system: true`

### Decision

**Use a `system` boolean field on the `token-theme` content type.** Added to `token-theme.schema.json` with `default: false`.

### Rationale

- Explicit — the protection is visible in the story data, not implicit in naming
- Survives renames — if someone renames the story, the protection persists
- Extensible — future system themes (e.g., dark-mode baseline) can also be marked `system: true`
- Absence = false — no migration needed for existing themes

### Consequences

- Guard checks in: Storyblok MCP (`update_theme`, `delete_story`), Design Tokens Editor backend (PUT/DELETE → 403), Design Tokens Editor frontend (lock icon, disabled Save/Delete), n8n node (update/delete → reject)
- The `sync-default-theme` script sets `system: true` when upserting
- Existing themes without the field are treated as non-system (editable)

---

## ADR-5: Explicit Default Theme Reference with Skip-Injection Optimization

### Context

When the `settings` story references `theme: "default"`, the website runtime would normally fetch that theme's CSS and inject it via `<style data-tokens>`. But the default theme's CSS is already baked into `global.css` at build time — injecting it again is redundant.

### Decision

1. **The `settings` story explicitly references `theme: "default"`** — editors see "Default" in the theme dropdown and can switch away from it
2. **The website runtime skips `<style data-tokens>` injection when the resolved theme slug is `default`** — avoids loading and injecting duplicate CSS

### Consequences

- `fetchPageProps()` in `helpers/storyblok.ts` checks `settings.theme` and `pageContent.theme` — if the value is `"default"`, it skips the theme story fetch entirely
- The theme dropdown in Storyblok shows "Default" as the active selection
- Switching from "Default" to another theme works normally (injection resumes)
- The same skip applies at the page level — a page selecting `default` does not trigger injection

---

## ADR-6: Design Tokens MCP Becomes Stateless

### Context

The Design Tokens MCP reads/writes a local `branding-token.json` file in flat format. This file is disconnected from Storyblok — themes created via the MCP never reach the CMS. The workflow requires 15+ sequential `update_theme_config` calls to build a theme field-by-field.

### Decision

**Remove all file I/O from the Design Tokens MCP.** It becomes a pure analysis and validation service:

- `generate_theme_from_image` / `extract_theme_from_css` return schema guidance (not file references)
- `validate_theme` (new) validates a W3C token object against the schema
- `get_theme_schema` (replaces `get_theme_config`) returns the W3C schema structure
- `list_theme_values` accepts a W3C token object as input (no file read)
- `update_theme_config` is **removed** — the LLM constructs the full token object in-context and persists it via the Storyblok MCP's `create_theme`/`update_theme`

### Consequences

- `packages/design-tokens-mcp/tokens/branding-token.json` is deleted
- `branding.ts` loses `readBrandingJson()`, `writeBrandingJson()`, `setNestedValue()` — gains `flattenW3CTokens()`, `getW3CSchemaDescription()`, `validateW3CTokens()`
- The `tokens://branding` resource returns the W3C schema reference instead of file contents
- Theme creation becomes a two-MCP-server workflow: Design Tokens MCP (analyze + validate) → Storyblok MCP (persist)
- The `update-branding` prompt is rewritten to describe this new flow

---

## ADR-7: `tokensToCss` Injection Strategy

### Context

`createTheme()` and `updateTheme()` need to compile W3C tokens to CSS. The `tokensToCss()` function lives in the Design System package. `storyblok-services` currently has no dependency on the Design System.

### Decision

**Pass `tokensToCss` as a parameter** to `createTheme()` and `updateTheme()` rather than adding a hard dependency from `storyblok-services` to `@kickstartds/design-system`. The caller (Storyblok MCP, Design Tokens Editor backend, website scripts) imports `tokensToCss` from the Design System and provides it.

### Rationale

- Keeps `storyblok-services` lightweight and decoupled from the Design System build
- `storyblok-services` is published to npm — adding a Design System dependency would create a circular or heavyweight transitive dependency
- The function signature is simple: `(tokens: object) => string`

### Consequences

- `createTheme()` and `updateTheme()` accept a `tokensToCss: (tokens: object) => string` parameter
- Each consumer imports `tokensToCss` from `@kickstartds/design-system/scripts/tokensToCss.mjs` and passes it
- If the compiler changes, only the Design System package is updated — consumers get the new behavior automatically

---

## ADR-8: Strict Token Validation

### Context

The `validate_theme` tool validates W3C token objects against `branding-tokens.schema.json`. Two strictness levels were considered:

- **Strict** — all required fields present, all values in range, partial themes rejected
- **Lenient** — validate present fields, allow partial themes

### Decision

**Strict validation for all write operations.** A theme must be complete (all required sections: color, font, spacing, border, box-shadow, duration) to pass validation or be created/updated.

### Consequences

- `validate_theme` rejects partial token objects with specific field-level error messages
- `create_theme` and `update_theme` run the same validation before persisting
- The LLM must construct a complete token object — it cannot create a "colors-only" theme
- Analysis tools like `list_theme_values` do not require valid input (they operate on whatever is provided)

---

## ADR-9: Custom Manager Tool for Dynamic Storybook Theme Dropdown

### Context

Storybook's built-in `globalTypes.toolbar` annotation provides a static dropdown — items are declared at configuration time and cannot be changed at runtime. The Storybook theme switcher needs to show both static Design System themes (known at build time) and CMS-managed themes from Storyblok (only known at runtime after an API call).

Two approaches were considered:

1. **`globalTypes.toolbar`** — Simple, declarative, but limited to static items. CMS themes would require a build-time fetch script to generate the items array before Storybook starts.
2. **Custom manager Tool component** — Register a Tool via `addons.add()` with `types.TOOL` in `.storybook/manager.tsx`. The Tool renders its own dropdown using `WithTooltip` + `TooltipLinkList` from `storybook/internal/components`, fetches CMS themes at runtime, and uses `useGlobals()` / `updateGlobals()` to communicate with the preview decorator.

### Decision

**Use a custom manager Tool component.** This allows runtime-fetched CMS themes to appear in the toolbar dropdown alongside static themes, without requiring a build-time script. The Tool fetches themes on mount and renders a grouped dropdown (Default | CMS Themes | Static Themes) with visual separators between groups (provided by `TooltipLinkList`'s grouped links array).

### Data Flow

```
Manager Tool (mount) → fetch CMS themes from Storyblok CDN API
Manager Tool (select) → updateGlobals({ theme: "blizzard" | "cms:slug", themeCss: "..." })
Preview Decorator → reads globals.theme + globals.themeCss → injects CSS
```

For CMS themes, the manager stores the CSS content in `globals.themeCss` so the preview decorator can inject it without making a separate API call. For static themes, `themeCss` is cleared and the decorator injects a `<link>` tag pointing to the static CSS file.

### Consequences

- Requires `.storybook/manager.tsx` (renamed from `.ts`) to support JSX in the Tool component
- The manager and preview communicate via globals — the standard Storybook pattern for cross-frame state
- CMS themes appear automatically if `STORYBLOK_API_TOKEN` is set — no manual configuration
- If the API token is not set or the fetch fails, only static themes are shown (graceful degradation)
- The Storybook manager UI chrome remains unchanged (OQ12 decision: preview canvas only)
