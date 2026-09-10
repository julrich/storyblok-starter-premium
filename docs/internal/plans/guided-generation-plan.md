# Plan: Guided Content Generation for the Storyblok MCP Server

> **Status: ✅ FULLY IMPLEMENTED** — All proposals (1–8) and all phases (1–4) have been implemented. The MCP server now supports `analyze_content_patterns`, `plan_page`, `generate_section`, `generate_root_field`, `generate_seo`, `list_recipes`, compositional warnings, and section recipes. Multi-content-type support (`contentType` parameter) has also been added across all tools, including hybrid content type support where `plan_page` returns `rootFieldMeta` with priority annotations. See [docs/skills/plan-page-structure.md](../../skills/plan-page-structure.md) for the current workflow guide. Recipe counts are now 19 recipes, 14 page templates, 13 anti-patterns. All recipes and templates are tagged with a `contentType` (page, blog-post, blog-overview, event-detail, event-list) so that `list_recipes` returns only content-type-appropriate results. Blog-post recipes are text/split-even-focused (no hero or cta sections — those are handled by root objects). Anti-patterns are also filtered by content type.

## Problem Statement

The MCP server currently supports two extremes for content creation:

| Approach            | How it works                                                           | Quality                                                               | Control         |
| ------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------- |
| **Fully automated** | `generate_content(sectionCount=N)` → `create_page_with_content`        | Variable — OpenAI must choose from 27+ component types simultaneously | Low             |
| **Fully manual**    | `list_components` + `get_component` → hand-craft JSON → `create_story` | Potentially highest — but depends entirely on LLM discipline          | High, but risky |

Neither extreme is ideal. The automated path produces inconsistent component combinations because the decision surface is too large. The manual path gives no compositional guidance, so the LLM may invent invalid structures or miss opportunities.

**Goal:** create a middle ground that combines the quality of manual composition with the convenience of automation, and — critically — learns from the existing content in each Storyblok space to produce results that are consistent with the website's established style and patterns.

---

## Key Insight: Every Storyblok Space Is Its Own Style Guide

Different websites built with the same Design System use components in very different ways. A SaaS landing page favors `hero → features → testimonials → cta`. A consulting firm's site might rely heavily on `split-even`, `business-card`, and `faq`. A portfolio site uses `mosaic` and `gallery` extensively.

**The existing stories in a Storyblok space _are_ the style guide.** By analyzing them, we can:

1. Discover which components are actually used (vs. theoretically available)
2. Learn the most common section sequences and component pairings
3. Detect per-section component combinations (e.g. "this site always groups 3 `blog-teaser`s together")
4. Identify the typical number of sub-component items (e.g. "features always has 3-4 items here")
5. Surface the site's vocabulary, tone, and content density norms
6. Generate new content that feels native to the site, not generic

This is something the `generate_content(sectionCount=N)` path can never achieve — it has no awareness of the existing corpus.

---

## Proposals

### Proposal 1: `analyze_content_patterns` Tool

**Effort:** Medium
**Impact:** Very High

A new MCP tool that reads all published stories and extracts structural patterns. No AI call needed — pure structural analysis.

#### Input Parameters

| Parameter     | Type   | Required | Default  | Description                      |
| ------------- | ------ | -------- | -------- | -------------------------------- |
| `contentType` | string | no       | `"page"` | Filter by Storyblok content type |
| `startsWith`  | string | no       | —        | Filter by slug prefix            |

#### Analysis Algorithm

1. **Fetch all stories** by paginating `list_stories` (100 per page) until exhausted
2. **For each story**, walk the `content.section[]` array and extract:
   - The ordered list of component types per section (e.g. `["hero"]`, `["blog-teaser", "blog-teaser", "blog-teaser"]`)
   - Sub-component counts (e.g. `features` has 4 `feature` items)
   - Which section-level props are used (`inverted`, `backgroundColor`, `width`, etc.)
3. **Aggregate across all stories:**

```
Component Frequency:
  hero: 12 pages (85%)      ← used on almost every page
  features: 8 pages (57%)
  cta: 10 pages (71%)
  testimonials: 5 pages (36%)
  mosaic: 2 pages (14%)
  ...

Section Sequences (bigrams):
  hero → features: 6 times
  hero → split-even: 3 times
  features → testimonials: 4 times
  testimonials → cta: 5 times
  stats → cta: 3 times
  ...

Section Compositions (components per section):
  [hero]: 12 times
  [blog-teaser, blog-teaser, blog-teaser]: 3 times
  [cta]: 10 times
  [features]: 8 times
  ...

Sub-component Item Counts:
  features → feature: median 4, range [3, 6]
  testimonials → testimonial: median 3, range [2, 4]
  faq → questions: median 6, range [4, 10]
  mosaic → tile: median 6, range [4, 9]
  ...

Page Archetypes:
  "hero, features, testimonials, cta": 3 pages (Landing pattern)
  "hero, split-even, split-even, cta": 2 pages (Detail pattern)
  "hero, blog-teaser": 2 pages (Blog hub pattern)
  ...
```

#### Output Format

Return a structured JSON summary that an LLM can directly use for planning:

```json
{
  "totalStoriesAnalyzed": 14,
  "componentFrequency": [
    { "component": "hero", "count": 12, "percentage": 85 },
    { "component": "cta", "count": 10, "percentage": 71 }
  ],
  "commonSequences": [
    { "from": "hero", "to": "features", "count": 6 },
    { "from": "testimonials", "to": "cta", "count": 5 }
  ],
  "sectionCompositions": [
    { "components": ["hero"], "count": 12 },
    { "components": ["blog-teaser", "blog-teaser", "blog-teaser"], "count": 3 }
  ],
  "subComponentCounts": {
    "features.feature": { "median": 4, "min": 3, "max": 6 },
    "testimonials.testimonial": { "median": 3, "min": 2, "max": 4 }
  },
  "pageArchetypes": [
    {
      "pattern": ["hero", "features", "testimonials", "cta"],
      "count": 3,
      "exampleSlug": "home"
    }
  ],
  "unusedComponents": ["gallery", "logos", "event-list-teaser"]
}
```

#### Why This Is Powerful

- **Zero configuration**: works out of the box by reading existing content
- **Self-updating**: every new page makes the patterns more accurate
- **Per-space**: each Storyblok space gets its own style guidance
- **LLM-friendly**: the output is compact and directly usable in prompts

---

### Proposal 2: Section-by-Section Generation Workflow

**Effort:** Low (skill file only) to Medium (new tool)
**Impact:** High

Today `generate_content` supports `componentType` (single component) or `sectionCount` (whole page). The missing middle is a **section-level workflow** where the LLM plans first, then generates each section individually.

#### Option A: Skill File (Low Effort)

Add `docs/skills/plan-page-structure.md`:

```markdown
# Skill: Plan and Build a Page Section-by-Section

## When to Use

When creating a page with 3+ sections. Produces higher-quality results than
`generate_content` with `sectionCount` because each section gets focused attention.

## Steps

1. **Analyze existing patterns** (if `analyze_content_patterns` tool is available):
   Call `analyze_content_patterns` to learn this site's component preferences,
   common sequences, and typical sub-component counts.

2. **Check available components**:
   Call `list_components` to see the full palette and nesting rules.

3. **Plan the section sequence**:
   Based on the user's brief + the site's patterns, decide on 4-7 sections.
   Prefer component sequences that already exist in the site's content.
   Example plan: hero → features (4 items) → testimonials (3 items) → cta

4. **Generate each section individually**:
   For EACH planned section, call `generate_content` with:

   - `componentType` set to the section's main component (e.g. `"hero"`)
   - A `prompt` describing ONLY that section's purpose and content
   - A `system` prompt that includes relevant context from earlier sections
     (e.g. "This follows a hero section about X. Maintain the same tone.")

5. **Assemble and create the page**:
   Collect all generated sections into a single array.
   Call `create_page_with_content` with:

   - `sections`: the combined array
   - `uploadAssets: true` (if images are present)

6. **Confirm with the editor**: Share the Storyblok editor link.

## Section Planning Heuristics

- Start with `hero` or `video-curtain` for visual impact
- Follow with `features`, `split-even`, or `mosaic` to present core content
- Add social proof via `testimonials`, `stats`, or `logos`
- Address objections with `faq`
- End with `cta` for conversion
- Use `divider` sparingly between thematic shifts
- Match sub-component counts to site norms (check `analyze_content_patterns`)

## Common Mistakes

| Mistake                                        | Why it's wrong                              |
| ---------------------------------------------- | ------------------------------------------- |
| Using `sectionCount` for 5+ sections           | Schema too large, OpenAI makes poor choices |
| Not checking existing patterns                 | New content feels foreign to the site       |
| Generating all sections with same prompt       | Each section needs specific direction       |
| Skipping `list_icons` before using icon fields | Generates invalid icon identifiers          |
```

#### Option B: `plan_page` Tool (Medium Effort)

A lightweight tool that returns a recommended section sequence without generating content.

**Input:**

- `intent` (string, required): "Product landing page for our new AI feature"
- `sectionCount` (number, optional): target number of sections

**Algorithm:**

1. Call `analyze_content_patterns` internally (or use cached results)
2. Send a small OpenAI call with ONLY:
   - Component names + one-line descriptions (not full schemas)
   - The site's existing patterns as context
   - The user's intent
3. Return a plan:

```json
{
  "suggestedSections": [
    {
      "component": "hero",
      "intent": "Introduce the AI feature with strong visual",
      "subItems": 2
    },
    { "component": "features", "intent": "3 key capabilities", "subItems": 3 },
    {
      "component": "split-even",
      "intent": "Detailed demo with screenshot",
      "subItems": 0
    },
    {
      "component": "testimonials",
      "intent": "Early adopter quotes",
      "subItems": 3
    },
    { "component": "cta", "intent": "Free trial signup", "subItems": 2 }
  ],
  "basedOnPattern": "home",
  "confidence": "high"
}
```

The LLM then iterates over this plan, calling `generate_content(componentType=X)` for each section.

---

### Proposal 3: Section Recipes Resource

**Effort:** Low
**Impact:** High

A curated JSON file of proven component combinations, exposed as an MCP resource. This provides **universal** guidance (not space-specific), complementing the space-specific patterns from Proposal 1.

#### File: `storyblok-mcp/schemas/section-recipes.json`

```json
{
  "recipes": [
    {
      "name": "Hero with CTA",
      "intent": "Landing page opener, product launch, campaign entry point",
      "components": ["hero"],
      "subComponents": { "buttons": 2 },
      "notes": "Use buttons sub-component for primary + secondary CTA. Set image or video.",
      "frequency": "very-common",
      "goodFollowUps": ["features", "split-even", "stats"]
    },
    {
      "name": "Feature Showcase",
      "intent": "Present product capabilities, service offerings, key benefits",
      "components": ["features"],
      "subComponents": { "feature": [3, 4] },
      "notes": "3-4 feature items with icons. Keep text concise. Use consistent icon style.",
      "frequency": "very-common",
      "goodFollowUps": ["testimonials", "cta", "split-even"]
    },
    {
      "name": "Social Proof Block",
      "intent": "Build trust, show customer validation",
      "components": ["testimonials"],
      "subComponents": { "testimonial": [2, 3] },
      "notes": "Include real names, roles, companies. Photos increase trust.",
      "frequency": "common",
      "goodFollowUps": ["cta", "stats", "faq"]
    },
    {
      "name": "Stats + CTA Combo",
      "intent": "Data-driven persuasion followed by conversion action",
      "components": ["stats"],
      "subComponents": { "stat": [3, 4] },
      "notes": "3-4 stat items. Place before a CTA to establish credibility first.",
      "frequency": "common",
      "goodFollowUps": ["cta"]
    },
    {
      "name": "Content Split",
      "intent": "Side-by-side detail: image + text, before/after, feature deep-dive",
      "components": ["split-even"],
      "notes": "Visual on one side, text + buttons on the other. Alternate sides across sections.",
      "frequency": "common",
      "goodFollowUps": ["features", "testimonials", "cta"]
    },
    {
      "name": "FAQ Section",
      "intent": "Answer common questions, reduce support load, boost SEO",
      "components": ["faq"],
      "subComponents": { "questions": [5, 8] },
      "notes": "5-8 questions. Keep answers concise but complete.",
      "frequency": "common",
      "goodFollowUps": ["cta", "contact"]
    },
    {
      "name": "Visual Portfolio / Team Grid",
      "intent": "Mosaic gallery, team members, product showcase",
      "components": ["mosaic"],
      "subComponents": { "tile": [4, 6] },
      "notes": "4-6 tiles with images. Each tile can have its own link.",
      "frequency": "occasional",
      "goodFollowUps": ["cta", "testimonials"]
    },
    {
      "name": "Blog Teaser Group",
      "intent": "Cross-promote articles, content hub, related reading",
      "components": ["blog-teaser", "blog-teaser", "blog-teaser"],
      "notes": "Always group 3 blog-teasers per section. Include tags and author info.",
      "frequency": "occasional",
      "goodFollowUps": ["cta"]
    },
    {
      "name": "Logo Wall",
      "intent": "Client logos, partner brands, trust signals",
      "components": ["logos"],
      "subComponents": { "logo": [5, 8] },
      "notes": "Minimum 5 logos. Works best after hero or before CTA.",
      "frequency": "occasional",
      "goodFollowUps": ["testimonials", "cta"]
    },
    {
      "name": "Video Opener",
      "intent": "Video-first landing page, brand storytelling",
      "components": ["video-curtain"],
      "subComponents": { "buttons": [1, 2] },
      "notes": "Full-width video background with overlay text and CTA.",
      "frequency": "occasional",
      "goodFollowUps": ["features", "split-even"]
    }
  ],
  "pageTemplates": [
    {
      "name": "Product Landing Page",
      "sequence": ["hero", "features", "testimonials", "stats", "cta"],
      "intent": "Convert visitors for a product or service"
    },
    {
      "name": "Company About Page",
      "sequence": ["hero", "split-even", "mosaic", "testimonials", "cta"],
      "intent": "Tell the company story with visual elements"
    },
    {
      "name": "Service Detail Page",
      "sequence": ["hero", "features", "faq", "testimonials", "cta"],
      "intent": "Explain a service, address objections, build trust"
    },
    {
      "name": "Blog / Content Hub",
      "sequence": ["hero", "blog-teaser", "blog-teaser", "cta"],
      "intent": "Showcase articles and drive engagement"
    },
    {
      "name": "Minimal Landing Page",
      "sequence": ["hero", "cta"],
      "intent": "Single-purpose conversion page"
    }
  ],
  "antiPatterns": [
    "Never place two hero or video-curtain sections on the same page",
    "Avoid consecutive text-heavy sections without visual breaks",
    "Don't use slider with fewer than 3 items",
    "blog-teaser without link_url creates dead-end content",
    "stats with fewer than 3 stat items looks sparse",
    "logos with fewer than 4 logos looks empty",
    "Don't repeat the same component type in adjacent sections (except blog-teaser groups)",
    "Always end a conversion-oriented page with a cta section"
  ]
}
```

#### Exposure

Register as an MCP resource alongside existing skills:

```typescript
// In index.ts, resource listing
{ uri: "recipes://section-recipes", name: "Section Recipes", description: "Curated component combinations..." }
```

---

### Proposal 4: Inline Component Hints on `list_components`

**Effort:** Low
**Impact:** Medium

Augment the `list_components` annotations with a `typicalUsage` field per component, derived from the recipes file or hardcoded:

```json
{
  "name": "hero",
  "allowedIn": ["section.components"],
  "isSubComponent": false,
  "typicalUsage": "Page opener. Usually the first section. Include 1-2 CTA buttons. Pair with features or split-even below.",
  "typicalSubItemCount": { "buttons": [1, 2] }
}
```

This gives the LLM per-component guidance at the moment it discovers what's available — without needing a separate tool call.

---

### Proposal 5: Update Existing Skill Files

**Effort:** Low
**Impact:** Medium

All five existing skills currently recommend `generate_content(sectionCount=N)` for multi-section pages. Update them to prefer section-by-section generation.

#### Changes to `create-new-page.md`

- Step 1: Add "Call `analyze_content_patterns` to learn this site's established patterns" (if the tool exists)
- Step 3: Change from "Call `generate_content` with `sectionCount`" to "Plan sections individually. For each section, call `generate_content` with `componentType=<type>` and a section-specific prompt"
- Add a "Section Planning" subsection referencing the recipes resource

#### Changes to `extend-existing-page.md`

Already uses `componentType` for single sections — this is the right pattern. Add:

- "Before choosing a component, check what the existing page already contains to maintain variety"
- "Use `analyze_content_patterns` to see what components typically follow the current last section"

#### Changes to `content-audit.md`

Add a structural consistency check:

- "Compare this page's section sequence against the site's common patterns from `analyze_content_patterns`"
- "Flag unusual component choices that don't appear elsewhere on the site"

#### Changes to `migrate-website.md`

Add:

- "After scraping, compare the source page structure to available recipes to find the best mapping"
- "Use `analyze_content_patterns` to match the migrated page's structure to the target site's established patterns"

---

### Proposal 6: Soft Compositional Warnings in Validation

**Effort:** Medium
**Impact:** Medium

The validation layer in `shared/storyblok-services/src/validate.ts` currently validates **structural correctness** only. Add a second pass for **compositional quality warnings**.

#### Warning Rules (derived from recipes + anti-patterns)

| Rule                                       | Warning Message                                                        |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| Multiple `hero` / `video-curtain` sections | "Page has {n} hero-type sections — typically only one is used"         |
| `stats` with <3 `stat` items               | "Stats section has only {n} items — 3+ recommended"                    |
| `features` with <2 `feature` items         | "Features section has only {n} items — 3-4 recommended"                |
| `testimonials` with <2 items               | "Testimonials section has only {n} items — 2-3 recommended"            |
| `slider` with <3 items                     | "Slider has only {n} items — 3+ recommended for meaningful navigation" |
| `logos` with <4 `logo` items               | "Logo wall has only {n} logos — 5+ recommended"                        |
| `blog-teaser` without `link_url`           | "Blog teaser '{headline}' has no link — creates dead-end content"      |
| Same component in adjacent sections        | "Adjacent sections both use '{type}' — consider varying the layout"    |
| No `cta` section on page                   | "Page has no CTA section — consider adding one for conversion"         |

#### Output Format

Return alongside validation errors, but as a separate `warnings` array:

```typescript
interface ValidationResult {
  errors: ValidationError[]; // Structural — blocks saving
  warnings: ValidationWarning[]; // Compositional — advisory only
}

interface ValidationWarning {
  path: string;
  message: string;
  severity: "suggestion" | "warning";
}
```

#### Integration

- `create_page_with_content`, `import_content`, `import_content_at_position` would include warnings in their success response
- The LLM can self-correct before finalizing (e.g. add more items, remove duplicate heroes)

---

### Proposal 7: `list_recipes` Tool

**Effort:** Medium
**Impact:** Medium

A dedicated tool that returns recipes from the static file (Proposal 3) **merged with** live patterns from the space (Proposal 1).

#### Input Parameters

| Parameter         | Type    | Required | Default | Description                                 |
| ----------------- | ------- | -------- | ------- | ------------------------------------------- |
| `intent`          | string  | no       | —       | Filter recipes by relevance to this intent  |
| `includePatterns` | boolean | no       | `true`  | Include live patterns from existing content |

#### Output

Returns the static recipes, page templates, and anti-patterns — plus, if `includePatterns` is true, appends the live analysis:

```json
{
  "recipes": [ /* from section-recipes.json */ ],
  "pageTemplates": [ /* from section-recipes.json */ ],
  "antiPatterns": [ /* from section-recipes.json */ ],
  "sitePatterns": {
    /* output from analyze_content_patterns */
    "componentFrequency": [...],
    "commonSequences": [...],
    "pageArchetypes": [...]
  }
}
```

This gives the LLM everything it needs in a single tool call to plan a page that is both well-composed (recipes) and consistent with the site (patterns).

---

### Proposal 8: `generate_section` Convenience Wrapper

**Effort:** Medium
**Impact:** Medium

A thin wrapper around `generate_content` that is explicitly designed for single-section generation with site-aware context.

#### How It Differs from `generate_content(componentType=X)`

- **Automatic context injection**: Reads the site patterns and injects them into the system prompt (e.g. "This site typically uses 4 feature items")
- **Sub-component count guidance**: Uses the site's median sub-component counts as constraints
- **Sequence awareness**: Accepts optional `previousSection` and `nextSection` parameters so the prompt includes transitional context
- **Recipe validation**: Checks the generated output against the recipes anti-patterns before returning

#### Input Parameters

| Parameter         | Type   | Required | Description                                   |
| ----------------- | ------ | -------- | --------------------------------------------- |
| `componentType`   | string | yes      | Which component to generate                   |
| `prompt`          | string | yes      | Content description for this section          |
| `system`          | string | no       | System prompt override                        |
| `previousSection` | string | no       | Component type of the section before this one |
| `nextSection`     | string | no       | Component type of the section after this one  |

This is the highest-effort proposal but produces the most seamless experience — the LLM just calls `generate_section` for each planned section and gets site-consistent results without managing context manually.

---

## Comparison Matrix

| #   | Proposal                          | Effort | Impact    | Dependencies           |
| --- | --------------------------------- | ------ | --------- | ---------------------- |
| 1   | `analyze_content_patterns` tool   | Medium | Very High | None                   |
| 2a  | Section-by-section skill file     | Low    | High      | None (1 enhances it)   |
| 2b  | `plan_page` tool                  | Medium | High      | 1 recommended          |
| 3   | Section recipes resource          | Low    | High      | None                   |
| 4   | Inline hints on `list_components` | Low    | Medium    | 3 optional             |
| 5   | Update existing skill files       | Low    | Medium    | None (1, 3 enhance it) |
| 6   | Soft compositional warnings       | Medium | Medium    | 3 optional             |
| 7   | `list_recipes` tool (unified)     | Medium | Medium    | 1 + 3                  |
| 8   | `generate_section` wrapper        | Medium | Medium    | 1 recommended          |

---

## Recommended Implementation Phases

### Phase 1 — Immediate (skill files + static recipes)

**Proposals: 2a, 3, 4, 5**

- Add `docs/skills/plan-page-structure.md` skill file
- Add `storyblok-mcp/schemas/section-recipes.json` and register as MCP resource
- Add `typicalUsage` hints to `list_components` annotations
- Update existing skill files to prefer section-by-section generation

**Result:** LLMs immediately get compositional guidance and a better workflow. Zero changes to the generation pipeline. Works today.

### Phase 2 — Space-Aware Intelligence

**Proposals: 1, 5 (enhanced)**

- Implement `analyze_content_patterns` tool
- Update skill files to reference pattern analysis as the first step

**Result:** Generated content is now consistent with each specific website. The LLM understands "how this site works" before creating anything.

### Phase 3 — Unified Experience

**Proposals: 6, 7, 2b**

- Add soft compositional warnings to the validation layer
- Implement `list_recipes` tool that merges static recipes with live patterns
- Implement `plan_page` tool for AI-assisted section planning

**Result:** End-to-end guided generation: plan → generate section-by-section → validate → warnings → self-correct.

### Phase 4 — Polished Convenience (optional)

**Proposal: 8**

- Implement `generate_section` wrapper with automatic context injection

**Result:** Single-call section generation that is site-aware out of the box. Most seamless LLM experience.

---

## How the Full Flow Would Work (Phase 3+)

```
User: "Create a page about our new AI consulting service"

LLM:
  1. analyze_content_patterns()
     → Learns: this site uses hero→features→testimonials→cta pattern,
       features always has 4 items, testimonials has 3

  2. list_recipes(intent="service landing page")
     → Gets: "Service Detail Page" template + site patterns merged
     → Suggested: hero → features → faq → testimonials → cta

  3. plan_page(intent="AI consulting service", sectionCount=5)
     → Returns: validated section plan with per-section intent + sub-item counts

  4. For each section in plan:
       generate_content(componentType="hero", prompt="Introduce AI consulting...")
       generate_content(componentType="features", prompt="4 key service areas...")
       generate_content(componentType="faq", prompt="6 common questions about AI consulting...")
       generate_content(componentType="testimonials", prompt="3 client success stories...")
       generate_content(componentType="cta", prompt="Book a consultation...")

  5. create_page_with_content(sections=[...all 5 sections], uploadAssets=true)
     → Validation runs: structural ✓, compositional warnings: none
     → Page created, assets uploaded

  6. Share editor link with user
```

### Hybrid Content Type Flow (blog-post)

For content types with both sections and root fields (blog-post, blog-overview), the workflow extends:

```
User: "Create a blog post about AI trends in 2026"

LLM:
  1. analyze_content_patterns(contentType="blog-post")
     → Learns: blog posts use hero→text→cta, head/aside/cta/seo root fields

  2. plan_page(intent="AI trends blog post", contentType="blog-post")
     → Returns: section plan + rootFieldMeta with priorities
       rootFieldMeta: [
         { name: "head", priority: "required" },
         { name: "aside", priority: "recommended" },
         { name: "cta", priority: "recommended" },
         { name: "seo", priority: "recommended" }
       ]

  3. For each section (blog-post: predominantly text and split-even, no hero/cta):
       generate_section(componentType="text", prompt="...", contentType="blog-post")
       generate_section(componentType="split-even", prompt="...", contentType="blog-post")

  4. For each root field:
       generate_root_field(fieldName="head", prompt="Author: Jane Doe...", contentType="blog-post")
       generate_root_field(fieldName="aside", prompt="Author bio, related articles...", contentType="blog-post")
       generate_root_field(fieldName="cta", prompt="Newsletter signup...", contentType="blog-post")

  5. generate_seo(prompt="Blog about AI trends, targeting CTOs...", contentType="blog-post")

  6. create_page_with_content(
       contentType="blog-post",
       sections=[...],
       rootFields={ head, aside, cta, seo },
       uploadAssets=true
     )
```

Compare this to the current flow:

```
User: "Create a page about our new AI consulting service"

LLM:
  1. generate_content(sectionCount=5, prompt="AI consulting service page")
     → OpenAI gets entire page schema, picks random component mix
     → Maybe: hero, hero (duplicate!), text-only section, stats with 1 item, cta

  2. create_page_with_content(sections=[...])
     → Structurally valid, but compositionally poor
```

The difference is significant: focused generation with site-specific guidance vs. a single massive schema dump.
