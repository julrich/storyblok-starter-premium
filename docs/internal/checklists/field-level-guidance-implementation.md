# Field-Level Compositional Guidance — Implementation Checklist

> **Status: ✅ COMPLETE** — All phases implemented. See
> [field-level-guidance-plan.md](../plans/field-level-guidance-plan.md) for the design document.

---

## Phase 1 — Stylistic Field Discovery (`storyblok-services/src/schema.ts`)

- [x] **1.1** Define `StylisticFieldSpec` interface (field name, type enum/boolean, enum values, default value)
- [x] **1.2** Define `PresenceFieldSpec` interface (field name, type string-presence/array-presence)
- [x] **1.3** Implement `discoverStylisticFields(derefSchema, validationRules)` — walks component schemas in a dereffed page schema and classifies properties as stylistic (enum/boolean) vs content (free text/image/array)
- [x] **1.4** Implement `discoverPresenceFields(derefSchema, validationRules)` — identifies headline/sub string fields and button/CTA array fields where empty-vs-populated is compositionally significant
- [x] **1.5** Export `discoverStylisticFields`, `discoverPresenceFields`, `StylisticFieldSpec`, `PresenceFieldSpec` from `schema.ts`
- [x] **1.6** Unit tests for field discovery against the real `page.schema.dereffed.json` — verify section gets ~19 stylistic fields, hero gets ~9, features gets ~4

## Phase 2 — Field Profile Types & Pruning (`storyblok-services/src/guidance.ts`)

- [x] **2.1** Create new `guidance.ts` module in `storyblok-services/src/`
- [x] **2.2** Define `FieldDistribution` interface (field, values map, total, dominantValue, dominantPct, isDefault)
- [x] **2.3** Define `FieldProfile` interface (component, context, fields, samples)
- [x] **2.4** Define `FieldProfileContext` union type (contains / containedIn / position)
- [x] **2.5** Implement `pruneFieldProfiles(profiles, options)` — applies all pruning rules: min samples (≥3), dominance threshold (>60%), skip default-only (>95% at default), positional delta (differs from baseline by >15pp), top-N scoped profiles (15 for Dim 2A, 10 for Dim 2B)
- [x] **2.6** Implement `computeFieldDistribution(valueCounts, defaultValue?)` — converts raw value→count map into a `FieldDistribution` with dominant value and percentage
- [x] **2.7** Export all types and functions from `guidance.ts`
- [x] **2.8** Unit tests for pruning: verify profiles below thresholds are dropped, default-only fields are skipped, positional profiles that match baseline are suppressed

## Phase 3 — Field Extraction in Pattern Analysis (`storyblok-services/src/patterns.ts`)

- [x] **3.1** Extend `AnalyzeContentPatternsOptions` with optional `derefSchema: Record<string, any>` parameter
- [x] **3.2** Extend `ContentPatternAnalysis` with `fieldProfiles: FieldProfile[]` (defaults to `[]` when schema not provided)
- [x] **3.3** At the start of `analyzeContentPatterns()`, call `discoverStylisticFields()` and `discoverPresenceFields()` when schema is provided
- [x] **3.4** Implement Dimension 1 extraction — context-free field value tracking for both container (section) and child components, inside the existing story iteration loop
- [x] **3.5** Implement Dimension 2A extraction — container fields scoped by child component types (e.g. `section[contains: hero]`)
- [x] **3.6** Implement Dimension 2B extraction — child component fields scoped by non-default container settings (e.g. `hero[in section where width=full]`)
- [x] **3.7** Implement Dimension 3 extraction — section fields scoped by position (first/middle/last)
- [x] **3.8** Implement presence tracking for boundary fields (headline text empty vs non-empty, buttons array empty vs non-empty)
- [x] **3.9** After the iteration loop, aggregate accumulators into `FieldProfile[]` via `computeFieldDistribution()` and prune via `pruneFieldProfiles()`
- [x] **3.10** Ensure backward compatibility — when `derefSchema` is not provided, `fieldProfiles` is `[]` and no field tracking runs
- [x] **3.11** Unit tests: mock a set of stories with known field values, verify extracted profiles match expected distributions across all 3 dimensions

## Phase 4 — Prompt Assembly (`storyblok-services/src/guidance.ts`)

- [x] **4.1** Define `SectionRecipes` type (matching the shape of `section-recipes.json` including new `compositionHints`)
- [x] **4.2** Implement `assembleFieldGuidance(options)` — the shared prompt assembly function that layers: (1) editorial hints from recipes, (2) composition profile Dim 2A, (3) component profile Dim 1, (4) positional context Dim 3, (5) container-scoped component profile Dim 2B
- [x] **4.3** Implement token budget management — estimate token count of assembled guidance, truncate lower-priority layers (5→4→3) if exceeding ~800 tokens, always keep layers 1 and 2
- [x] **4.4** When `startsWith` was used for pattern analysis, include scope label in prompt text (e.g. "On this site section (en/services/)...")
- [x] **4.5** Export `assembleFieldGuidance` and `SectionRecipes` type from `guidance.ts`
- [x] **4.6** Unit tests: verify layered prompt assembly with mock profiles and recipes, verify truncation behavior, verify empty/null patterns produce empty guidance

## Phase 5 — Schema Description Enrichment (`storyblok-services/src/schema.ts`)

- [x] **5.1** Define `FIELD_ANNOTATIONS` map with contextual descriptions for: `spaceBefore`, `spaceAfter`, `headerSpacing`, `width`, `content_mode`, `content_tileWidth`
- [x] **5.2** Split `DEFAULT_PROPERTIES_TO_DROP`: remove `spaceBefore` and `spaceAfter` from the drop list (keep `backgroundColor`, `backgroundImage`, `spotlight`, `textColor`); define a new `PROPERTIES_TO_ANNOTATE` list
- [x] **5.3** Implement `annotateFieldDescriptions` traversal callback — enriches `description` on matching properties during schema prep
- [x] **5.4** Wire `annotateFieldDescriptions` into the `prepareSchemaForOpenAi()` pass list (after removing unsupported properties, before validation passes)
- [x] **5.5** For properties in `PROPERTIES_TO_ANNOTATE`, skip the drop pass and instead apply the annotation pass
- [x] **5.6** Unit tests: verify `spaceBefore` and `spaceAfter` survive in the prepared schema with enriched descriptions, verify `backgroundColor` is still dropped

## Phase 6 — Composition Hints in Recipes (`section-recipes.json`)

- [x] **6.1** Add `compositionHints` to "Hero with CTA" recipe — section (headline, buttons, spaceBefore, spaceAfter, headerSpacing, width, content_mode) + hero (height, textbox)
- [x] **6.2** Add `compositionHints` to "Video Opener" recipe — section (headline, buttons, spaceBefore, width) + video-curtain hints
- [x] **6.3** Add `compositionHints` to "Feature Showcase" recipe — section (content_mode, content_tileWidth, width) + features (layout, style)
- [x] **6.4** Add `compositionHints` to "Call to Action" recipe — section (buttons, headline, width)
- [x] **6.5** Add `compositionHints` to "Social Proof Block" recipe — section (content_mode) + testimonials hints
- [x] **6.6** Add `compositionHints` to "Statistics Display" recipe — section (content_mode) + stats hints
- [x] **6.7** Add `compositionHints` to "FAQ Section" recipe — section (headline, content_mode)
- [x] **6.8** Add `compositionHints` to "Content Split" recipe — section (width, content_mode)
- [x] **6.9** Add `compositionHints` to "Logo Wall" recipe — section (content_mode, width)
- [x] **6.10** Add `compositionHints` to "Blog Teaser Group" recipe — section (content_mode, content_tileWidth)
- [x] **6.11** Add `compositionHints` to "Content Slider" recipe — section (content_mode)
- [x] **6.12** Review remaining recipes and add `compositionHints` where applicable

## Phase 7 — Post-Generation Quality Warnings (`storyblok-services/src/validate.ts`)

- [x] **7.1** Add "redundant section headline" warning — section has `headline_text` (or Storyblok `headline_text`) AND contains a component with its own headline (hero, cta, video-curtain)
- [x] **7.2** Add "competing CTAs" warning — section has non-empty `buttons` AND contains a component with its own buttons (hero, cta)
- [x] **7.3** Add "inappropriate content_mode" warning — section has `content_mode` other than `default` but contains only 1 component (tile/slider/list modes are for multi-item layouts)
- [x] **7.4** Add "first section spacing" warning — first section in the array has `spaceBefore` set to `default` instead of `none`
- [x] **7.5** Ensure new warnings use `level: "suggestion"` (not blocking) to distinguish from structural `"warning"` level
- [x] **7.6** Unit tests for each new warning type — verify triggering and non-triggering cases

## Phase 8 — Shared Services Exports (`storyblok-services/src/index.ts`)

- [x] **8.1** Export new types from `guidance.ts`: `FieldDistribution`, `FieldProfile`, `FieldProfileContext`, `SectionRecipes`
- [x] **8.2** Export new functions from `guidance.ts`: `assembleFieldGuidance`, `pruneFieldProfiles`, `computeFieldDistribution`
- [x] **8.3** Export new functions from `schema.ts`: `discoverStylisticFields`, `discoverPresenceFields`
- [x] **8.4** Export new types from `schema.ts`: `StylisticFieldSpec`, `PresenceFieldSpec`
- [x] **8.5** Export updated `PROPERTIES_TO_ANNOTATE` and `FIELD_ANNOTATIONS` from `schema.ts`
- [x] **8.6** Verify `ContentPatternAnalysis` type export includes new `fieldProfiles` field
- [x] **8.7** Verify shared services package compiles cleanly (`npx tsc --noEmit`)
- [x] **8.8** Verify shared services package builds cleanly (`pnpm run build`)

## Phase 9 — MCP Server Integration (`storyblok-mcp/src/index.ts`, `storyblok-mcp/src/services.ts`)

- [x] **9.1** Import `assembleFieldGuidance` and `SectionRecipes` type from `@kickstartds/storyblok-services`
- [x] **9.2** Load `section-recipes.json` into a typed `SectionRecipes` object (already partially loaded — ensure `compositionHints` are included)
- [x] **9.3** Update `warmPatternCache()` to pass the dereferenced schema to `analyzeContentPatterns()` so field profiles are included in the startup cache
- [x] **9.4** In the `generate_section` handler, replace the manual site-context and recipe-notes injection with a call to `assembleFieldGuidance()`, passing: `componentType`, `cachedPatterns` (or filtered patterns if `startsWith` provided), `sectionRecipes`, `position` (if derivable from plan context), `previousSection`, `nextSection`
- [x] **9.5** Verify the existing `previousSection`/`nextSection` transition context is preserved (it should be — `assembleFieldGuidance` doesn't handle transitions, those stay in the handler)
- [x] **9.6** Verify compositional quality warnings returned by `create_page_with_content` and `import_content` now include the new field-level warnings from Phase 7
- [x] **9.7** Verify MCP server compiles cleanly (`npx tsc --noEmit`)

## Phase 10 — n8n Node Integration (`storyblok-n8n/`)

- [x] **10.1** Import `assembleFieldGuidance` and `SectionRecipes` from `GenericFunctions.ts` (re-export from shared services)
- [x] **10.2** Load `section-recipes.json` in `GenericFunctions.ts` (or re-use existing load if present)
- [x] **10.3** In the `generateSection` handler, replace the manual site-context injection with a call to `assembleFieldGuidance()`, mirroring the MCP pattern
- [x] **10.4** Add compositional quality warnings to `createPage` output — call `checkCompositionalQuality()` after page creation and include warnings in `_meta`
- [x] **10.5** Add compositional quality warnings to `update` output — same pattern
- [x] **10.6** Verify n8n node compiles cleanly (`npx tsc --noEmit`)

## Phase 11 — Documentation & Copilot Instructions

- [x] **11.1** Update `.github/copilot-instructions.md` — add section about field-level guidance: mention `assembleFieldGuidance()`, composition hints, field profiles, and the interaction between them
- [x] **11.2** Update `docs/skills/plan-page-structure.md` — note that `generate_section` now auto-injects field-level guidance
- [x] **11.3** Update `packages/storyblok-mcp/README.md` — document the field guidance system in the guided generation section
- [x] **11.4** Update `packages/storyblok-services/README.md` — document `guidance.ts` module, `discoverStylisticFields()`, and the extended `analyzeContentPatterns()` API
- [x] **11.5** Update `field-level-guidance-plan.md` status to ✅ IMPLEMENTED

## Phase 12 — Verification & Compilation

- [x] **12.1** Shared services: `npx tsc --noEmit` passes
- [x] **12.2** Shared services: `pnpm run build` succeeds
- [x] **12.3** MCP server: `npx tsc --noEmit` passes
- [x] **12.4** n8n node: `npx tsc --noEmit` passes
- [x] **12.5** Run shared services unit tests
- [x] **12.6** Smoke test: generate a hero section via MCP and verify field guidance appears in the system prompt
- [x] **12.7** Smoke test: create a page and verify field-level quality warnings appear in response
