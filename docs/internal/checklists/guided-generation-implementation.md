# Guided Generation — Implementation Checklist

> **Status: ✅ FULLY IMPLEMENTED** — All phases (1–4) complete. Subsequently extended with multi-content-type support (`contentType` parameter on all tools, content-type-specific recipes/templates) and hybrid content type support (`generate_root_field`, `generate_seo` tools, `rootFieldMeta` in `plan_page`).

Tracking document for implementing all four phases from
[guided-generation-plan.md](../plans/guided-generation-plan.md).

---

## Phase 1 — Immediate (skill files + static recipes)

- [x] **1.1** Create `storyblok-mcp/schemas/section-recipes.json` with curated recipes, page templates, and anti-patterns
- [x] **1.2** Register `section-recipes.json` as an MCP resource in `storyblok-mcp/src/index.ts`
- [x] **1.3** Add `typicalUsage` and `typicalSubItemCount` hints to `list_components` annotations in `storyblok-mcp/src/index.ts`
- [x] **1.4** Create `docs/skills/plan-page-structure.md` skill file (section-by-section workflow)
- [x] **1.5** Update `docs/skills/create-page-from-scratch.md` to prefer section-by-section generation
- [x] **1.6** Update `docs/skills/extend-existing-page.md` to reference pattern analysis
- [x] **1.7** Update `docs/skills/content-audit.md` to include structural consistency checks
- [x] **1.8** Update `docs/skills/migrate-from-url.md` to reference recipes and patterns

## Phase 2 — Space-Aware Intelligence

- [x] **2.1** Implement `analyzeContentPatterns()` function in `storyblok-mcp/src/services.ts`
- [x] **2.2** Add Zod schemas for all new tools in `storyblok-mcp/src/config.ts`
- [x] **2.3** Register `analyze_content_patterns` tool definition in `storyblok-mcp/src/index.ts`
- [x] **2.4** Add tool handler for `analyze_content_patterns` in `storyblok-mcp/src/index.ts`
- [x] **2.5** Update skill files to reference `analyze_content_patterns` as first step (done in Phase 1)

## Phase 3 — Unified Experience

- [x] **3.1** Add `ValidationWarning` type and `checkCompositionalQuality()` to `shared/storyblok-services/src/validate.ts`
- [x] **3.2** Export new warning types and functions from `shared/storyblok-services/src/index.ts`
- [x] **3.3** Add `getCompositionalWarnings()` helper in `storyblok-mcp/src/index.ts`
- [x] **3.4** Surface warnings in `import_content`, `import_content_at_position`, and `create_page_with_content` responses
- [x] **3.5** Implement `list_recipes` tool (merges static recipes + live patterns from `analyzeContentPatterns`)
- [x] **3.6** Implement `plan_page` tool (AI-assisted section planning with site patterns and OpenAI)

## Phase 4 — Polished Convenience

- [x] **4.1** Implement `generate_section` tool (auto-injects site context, recipe hints, transition guidance)
- [x] **4.2** Implement `generate_root_field` tool (generates content for a single root-level field on hybrid content types like blog-post)
- [x] **4.3** Implement `generate_seo` tool (generates SEO metadata with specialized SEO-expert system prompt)
- [x] **4.4** Extend `plan_page` to return `rootFieldMeta` with priority annotations for hybrid content types

---

## Verification

- [x] Shared services package compiles cleanly (`npx tsc --noEmit`)
- [x] Shared services package builds cleanly (`npm run build`)
- [x] MCP server compiles cleanly (`npx tsc --noEmit`)
