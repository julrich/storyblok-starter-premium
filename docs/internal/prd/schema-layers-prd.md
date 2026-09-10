# Schema Layers PRD: Language & Visibility Automation

> **Status:** Draft
> **Created:** 2026-02-25
> **Scope:** MCP Server, n8n Node, Website CMS config, storyblok-services

---

## 1 Problem Statement

The project already ships two JSON Schema overlay folders — `cms/language/` and `cms/visibility/` — that implement a **schema layering** architecture on top of the kickstartDS Design System. Today only the language layer is wired up; the visibility layer is prepared but inactive. Neither layer is consumed by the MCP server or the n8n node, leaving significant value on the table:

- **AI content generation ignores field visibility.** `generate_section` produces values for every field, including ones hidden from editors, wasting tokens and creating noise.
- **AI content generation ignores the target locale.** The language layer encodes both the locale and rich contextual descriptions, but neither signal is used during generation.
- **No automated localization workflow exists.** Creating translated pages or generating new language layers requires manual effort.
- **Editor experience is not tunable.** The visibility layer could simplify the Storyblok UI per-role or per-project, but it is not yet activated.

---

## 2 Background: Schema Layering Architecture

The kickstartDS CLI merges JSON Schema files in a configurable layer order. Each layer can override properties of the layers below it.

| Layer             | Folder                                                        | `$id` namespace                         | Purpose                                     |
| ----------------- | ------------------------------------------------------------- | --------------------------------------- | ------------------------------------------- |
| **Base (schema)** | `node_modules/@kickstartds/ds-agency-premium/dist/components` | `http://schema.mydesignsystem.com/`     | Canonical types, validation, defaults       |
| **CMS**           | `components/`                                                 | `http://cms.mydesignsystem.com/`        | Project-level field customisations          |
| **Language**      | `cms/language/`                                               | `http://language.mydesignsystem.com/`   | Localised `title` & `description` per field |
| **Visibility**    | `cms/visibility/`                                             | `http://visibility.mydesignsystem.com/` | `x-cms-hidden: true/false` per field        |

The `create-storyblok-config` script currently uses:

```
--schema-paths  .../dist/components  components  cms/language
--layer-order   language cms schema
```

The visibility layer is **not included**.

---

## 3 Goals

| #   | Goal                                                                                                   | Success metric                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| G1  | Activate the visibility layer so Storyblok hides advanced fields from editors                          | `push-components` produces field groups with hidden fields matching `x-cms-hidden: true`        |
| G2  | MCP & Prompter skip hidden fields during content generation                                            | Token cost per `generate_section` call drops; generated content contains no hidden-field values |
| G3  | MCP & Prompter auto-detect locale from the language layer and generate content in the correct language | Generated content matches the project's target locale without explicit user instruction         |
| G4  | Use localised field descriptions as enriched prompts for higher-quality generation                     | Field descriptions from the language layer appear in the system prompt of `generate_section`    |
| G5  | Provide n8n operations for managing and generating language/visibility layers                          | New n8n operations available: `generateLanguageLayer`, `generateVisibilityLayer`                |
| G6  | Enable multi-locale page generation via n8n workflows                                                  | End-to-end workflow: source page → translate → create localised page in target folder           |

---

## 4 Non-Goals

- Building a full i18n framework with runtime locale switching (Storyblok's field-level translation or folder-based i18n handles that).
- Replacing Storyblok's native field-level permissions system — the visibility layer is a UX simplification, not a security boundary.
- Auto-generating the base Design System schema layer.

---

## 5 Phases

### Phase 1 — Activate Visibility Layer

**Objective:** Wire up `cms/visibility/` so that `x-cms-hidden` metadata flows into Storyblok component definitions and the MCP/Prompter generation pipeline.

#### 5.1.1 Update `create-storyblok-config` Script

Modify the command in `packages/website/package.json` to include the visibility layer:

```
--schema-paths  .../dist/components  components  cms/visibility  cms/language
--layer-order   visibility language cms schema
```

The kickstartDS CLI will translate `x-cms-hidden: true` into the appropriate Storyblok field configuration (e.g. placing hidden fields into a collapsed "Advanced" tab/group, or using Storyblok's `display_name` / `tab` features).

#### 5.1.2 Expose Visibility Metadata in storyblok-services

Add a utility to `packages/storyblok-services/src/` that:

1. Loads the visibility schemas from disk (or from the dereffed schemas that already inline `x-cms-hidden`).
2. Produces a `Map<componentType, Set<hiddenFieldName>>` lookup.
3. Exports it for consumption by the MCP server and the Prompter API routes.

```typescript
// packages/storyblok-services/src/visibility.ts
export interface VisibilityMap {
  [componentType: string]: {
    hidden: string[];
    visible: string[];
  };
}
export function loadVisibilityMap(schemaDir: string): VisibilityMap;
```

#### 5.1.3 Filter Hidden Fields in Generation Pipeline

In `packages/storyblok-services/src/schema.ts` (schema preparation for OpenAI structured output):

- Add a new transformation pass (pass 16) that **removes properties marked `x-cms-hidden: true`** from the schema sent to OpenAI.
- Hidden fields receive their default values (from the base schema) during `processForStoryblok()` post-processing, so the final Storyblok content is still complete.

In `packages/storyblok-services/src/guidance.ts` (field-level guidance):

- Exclude hidden fields from the `fieldProfiles` analysis and from the compositional guidance injected into the system prompt.

#### 5.1.4 Update Prompter Component Picker

In the Prompter's section-mode flow, the component picker already shows field previews. When visibility metadata is available, grey out or omit hidden fields from the preview to set correct editor expectations.

**Deliverables:**

- [ ] Updated `create-storyblok-config` command in `package.json`
- [ ] `packages/storyblok-services/src/visibility.ts` — visibility map loader
- [ ] Schema preparation pass 16 — strip hidden fields before OpenAI
- [ ] Guidance module excludes hidden fields
- [ ] Prompter component picker respects visibility
- [ ] Tests for visibility map loading and schema stripping

---

### Phase 2 — Language-Aware Content Generation

**Objective:** Auto-detect the project locale from the language layer and use localised descriptions as enriched generation prompts.

#### 5.2.1 Locale Detection

Add a utility that reads one or more `cms/language/*.schema.json` files, samples the `description` values, and infers the ISO 639-1 locale (e.g. `de`, `en`, `fr`). Heuristics:

- Detect common German/French/Spanish/etc. stopwords in descriptions.
- Fall back to a configurable `CONTENT_LOCALE` env var.
- Cache the result at startup.

```typescript
// packages/storyblok-services/src/locale.ts
export function detectLocale(languageSchemaDir: string): string; // "de", "en", etc.
```

#### 5.2.2 Inject Locale into Generation System Prompt

In `packages/storyblok-services/src/generate-section.ts` and `packages/storyblok-services/src/plan.ts`:

- Prepend the detected locale to the system prompt: `"Generate all content in German (de). …"`
- Append a locale reminder at the end of the prompt to prevent drift in long outputs.

#### 5.2.3 Use Localised Field Descriptions as Prompt Context

When building the field-level guidance (in `guidance.ts`), prefer the language-layer descriptions over the base schema descriptions. For example, instead of injecting `"headline: The hero headline"`, inject `"headline: Headline für das Visual"` — this gives OpenAI richer, locale-specific context about each field's editorial intent.

Implementation:

1. Load language schemas alongside the base schemas in the schema registry.
2. During guidance assembly, look up the language-layer `description` for each field; fall back to the base description if absent.

#### 5.2.4 MCP Server Configuration

Add environment variables to the MCP server:

| Variable              | Default             | Description                                            |
| --------------------- | ------------------- | ------------------------------------------------------ |
| `CONTENT_LOCALE`      | auto-detected       | Override the auto-detected locale                      |
| `LANGUAGE_SCHEMA_DIR` | `schemas/language/` | Path to language layer schemas (bundled at build time) |

The MCP server's `Dockerfile` and build step should copy `cms/language/` into the server image.

#### 5.2.5 Prompter API Routes

The Prompter API routes (`/api/prompter/generate-section`, `/api/prompter/plan`) should pass the detected locale through to the shared service functions, so content generated inside the Visual Editor also respects the locale.

**Deliverables:**

- [ ] `packages/storyblok-services/src/locale.ts` — locale detection
- [ ] System prompt locale injection in `generate-section.ts` and `plan.ts`
- [ ] Guidance module uses language-layer descriptions
- [ ] MCP server bundles language schemas and exposes `CONTENT_LOCALE`
- [ ] Prompter routes forward locale
- [ ] Tests for locale detection with German, English, French samples

---

### Phase 3 — n8n Operations for Layer Management

**Objective:** Expose operations in the n8n node that let workflows generate, validate, and manage language and visibility layers.

#### 5.3.1 New n8n Resource: "Schema Layer"

Add a new resource group to the n8n node (`packages/storyblok-n8n/`) with operations:

| Operation                 | Description                                                                                                                                                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generateLanguageLayer`   | Given a target locale (e.g. `fr`) and the base component schemas, use OpenAI to generate a complete set of `language/*.schema.json` files with translated `title` and `description` values. Returns the generated schemas as JSON. |
| `generateVisibilityLayer` | Given a visibility strategy (e.g. "minimal for content editors" or "full for developers"), use OpenAI to produce `visibility/*.schema.json` files with appropriate `x-cms-hidden` flags. Can also accept an explicit field list.   |
| `getVisibilityMap`        | Returns the current visibility map (component → hidden/visible fields) for introspection.                                                                                                                                          |
| `getLocale`               | Returns the auto-detected or configured locale for the project.                                                                                                                                                                    |
| `validateLayer`           | Validates a set of layer schemas against the base Design System schema — ensures every field referenced in the layer actually exists in the base.                                                                                  |

#### 5.3.2 Shared Service Functions

Extract the core logic into `packages/storyblok-services/src/`:

```typescript
// packages/storyblok-services/src/layers.ts
export async function generateLanguageLayer(
  baseSchemas: ComponentSchema[],
  targetLocale: string,
  openaiApiKey: string
): Promise<LayerSchema[]>;

export async function generateVisibilityLayer(
  baseSchemas: ComponentSchema[],
  strategy: "minimal" | "standard" | "full" | string,
  openaiApiKey: string
): Promise<LayerSchema[]>;

export function validateLayer(
  layerSchemas: LayerSchema[],
  baseSchemas: ComponentSchema[]
): ValidationResult[];
```

#### 5.3.3 MCP Server Tools

Expose corresponding MCP tools:

- `generate_language_layer(targetLocale, strategy?)` — generates and returns language schemas
- `generate_visibility_layer(strategy)` — generates and returns visibility schemas
- `get_visibility_map()` — returns the current visibility map
- `get_locale()` — returns detected locale

**Deliverables:**

- [ ] `packages/storyblok-services/src/layers.ts` — layer generation & validation
- [ ] n8n operations: `generateLanguageLayer`, `generateVisibilityLayer`, `getVisibilityMap`, `getLocale`, `validateLayer`
- [ ] MCP tools: `generate_language_layer`, `generate_visibility_layer`, `get_visibility_map`, `get_locale`
- [ ] n8n workflow template: "Generate French language layer from German source"
- [ ] Tests for layer generation and validation

---

### Phase 4 — Multi-Locale Page Generation Workflow

**Objective:** Enable end-to-end workflows that produce translated pages with correct folder structure and locale metadata.

#### 5.4.1 n8n Workflow: Translate Existing Page

```
Trigger (manual or webhook)
  → Get Story (source page)
  → Detect source locale (from language layer or explicit)
  → For each target locale:
      → Translate content (OpenAI or dedicated translation API)
      → Ensure Path (e.g. "fr/services/consulting")
      → Create Page With Content (translated content, target folder)
      → Update SEO (translated metadata)
```

#### 5.4.2 n8n Workflow: Bulk Site Translation

```
Trigger (manual)
  → List Stories (all pages under source locale prefix, e.g. "de/")
  → For each story:
      → Get Story (full content)
      → Translate content to target locale
      → Ensure Path (mirror folder structure under target prefix)
      → Create Page With Content
      → Update SEO
  → Generate Language Layer (for target locale)
  → Output: summary report
```

#### 5.4.3 Shared Translation Utility

Add to `packages/storyblok-services/src/`:

```typescript
// packages/storyblok-services/src/translate.ts
export async function translateContent(
  content: StoryContent,
  sourceLocale: string,
  targetLocale: string,
  openaiApiKey: string
): Promise<StoryContent>;
```

This function:

1. Walks the content tree and extracts all translatable string values (text fields, headlines, descriptions — skip asset URLs, enum values, boolean/number fields).
2. Batches strings into OpenAI translation calls with component context.
3. Reassembles the translated content into the same structure.

#### 5.4.4 n8n Operation: `translateContent`

Expose the translation utility as an n8n operation under the "AI Content" resource:

| Operation          | Input                                       | Output                                                              |
| ------------------ | ------------------------------------------- | ------------------------------------------------------------------- |
| `translateContent` | `storyUid`, `targetLocale`, `sourceLocale?` | Translated content object (ready for `createPage` or `updateStory`) |

#### 5.4.5 MCP Tool: `translate_content`

Expose as an MCP tool:

```
translate_content(storyUid, targetLocale, sourceLocale?, targetPath?)
```

If `targetPath` is provided, the tool also creates the page at that path (combines translation + creation in one step).

**Deliverables:**

- [ ] `packages/storyblok-services/src/translate.ts` — content translation utility
- [ ] n8n operation: `translateContent`
- [ ] MCP tool: `translate_content`
- [ ] n8n workflow template: "Translate single page to French"
- [ ] n8n workflow template: "Bulk translate site from DE to EN"
- [ ] Tests for content tree walking and string extraction

---

### Phase 5 — Dynamic Visibility Profiles

**Objective:** Support multiple named visibility profiles that can be swapped per editorial role or project phase.

#### 5.5.1 Visibility Profile Convention

Instead of a single `cms/visibility/` folder, support named profiles:

```
cms/visibility/
  minimal/          — Content editors: only essential fields
  standard/         — Senior editors: essential + styling fields
  full/             — Developers: all fields visible
```

The active profile is selected via:

- An env var: `VISIBILITY_PROFILE=minimal`
- The `create-storyblok-config` script points at the selected profile folder

#### 5.5.2 MCP Tool: `switch_visibility_profile`

```
switch_visibility_profile(profile: "minimal" | "standard" | "full")
```

This tool:

1. Updates the CMS config generation to use the selected profile.
2. Runs `create-storyblok-config` and `push-components` to apply it.
3. Returns the resulting visibility map.

> **Note:** This changes the Storyblok component schema for all editors. It's a project-wide setting, not per-user. Per-user visibility would require Storyblok's native field-level permissions.

#### 5.5.3 n8n Workflow: Scheduled Profile Switching

```
Cron Trigger (e.g. business hours vs off-hours)
  → Switch Visibility Profile ("minimal" during business hours, "standard" after)
  → Push Components
  → Notify team via Slack/email
```

#### 5.5.4 Content Audit Against Visibility

An n8n workflow that audits whether hidden fields are actually being used:

```
Trigger (weekly)
  → Analyze Content Patterns
  → Get Visibility Map
  → Compare: find hidden fields that have non-default values in published content
  → Report: "These hidden fields are actively used — consider making them visible"
  → Reverse: "These visible fields are never populated — consider hiding them"
```

**Deliverables:**

- [ ] Convention for named visibility profiles
- [ ] MCP tool: `switch_visibility_profile`
- [ ] n8n workflow template: "Audit field usage vs visibility"
- [ ] Documentation for profile management

---

## 6 Technical Considerations

### 6.1 Schema Registry Integration

The `packages/storyblok-services/src/registry.ts` schema registry currently loads dereferenced schemas per content type. It needs to be extended to also carry:

- The visibility map for the loaded schemas
- The detected locale
- Optionally, the language-layer descriptions keyed by `componentType.fieldName`

This data should be loaded once at startup and cached alongside the existing schema cache.

### 6.2 Token Cost Impact

Stripping hidden fields from OpenAI schemas (Phase 1) directly reduces:

- **Input tokens**: smaller JSON schema in the system prompt
- **Output tokens**: fewer fields generated

Rough estimate: if ~40% of fields across all components are hidden (based on current `visibility/` files), the token savings per `generate_section` call could be 20–35%.

### 6.3 Backward Compatibility

- All changes are additive. Existing generation behaviour is preserved when no visibility or language layer is present.
- The `CONTENT_LOCALE` env var defaults to auto-detection; if detection fails, it falls back to `"en"` (current implicit behaviour).
- The visibility filtering pass is skipped when no `x-cms-hidden` metadata exists in the loaded schemas.

### 6.4 MCP Server Schema Bundling

The MCP server's Docker image currently bundles `packages/storyblok-mcp/schemas/*.dereffed.json`. For Phase 2+, it should also bundle:

- `cms/language/*.schema.json` (or a pre-compiled locale + descriptions index)
- `cms/visibility/*.schema.json` (or a pre-compiled visibility map)

The build step in `packages/storyblok-mcp/package.json` should copy these from the website package.

---

## 7 Open Questions

| #   | Question                                                                                                                                                         | Owner                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| Q1  | Does the kickstartDS CLI already support `x-cms-hidden` → Storyblok field hiding, or does it need an upstream PR?                                                | kickstartDS core team |
| Q2  | Should visibility filtering also apply to `generate_content` (auto-schema derivation), or only to `generate_section` (guided generation)?                        | MCP server maintainer |
| Q3  | For multi-locale sites, should the MCP server support per-folder locale detection (e.g. `de/` vs `en/` prefixes), or is a single project-wide locale sufficient? | Product               |
| Q4  | Should translated content be created as separate Storyblok stories (folder-based i18n) or use Storyblok's field-level translation feature?                       | Product               |
| Q5  | Is OpenAI the right backend for translation, or should we support pluggable providers (DeepL, Google Translate)?                                                 | Architecture          |
| Q6  | Should `generateVisibilityLayer` use content pattern analysis to auto-suggest which fields to hide (based on actual usage frequency)?                            | Product               |

---

## 8 Dependencies

| Dependency                             | Phase      | Notes                                    |
| -------------------------------------- | ---------- | ---------------------------------------- |
| kickstartDS CLI `x-cms-hidden` support | Phase 1    | Verify or implement upstream             |
| OpenAI API key                         | Phases 2–4 | Already required for existing generation |
| storyblok-services shared library      | All phases | All new utilities live here              |
| Dereferenced schemas                   | Phases 1–2 | Already available in MCP server          |
| n8n node framework                     | Phase 3    | Extends existing `packages/storyblok-n8n/`   |

---

## 9 Milestones

| Milestone                                  | Target | Phases     |
| ------------------------------------------ | ------ | ---------- |
| Visibility layer active in CMS             | TBD    | Phase 1    |
| AI generation respects visibility + locale | TBD    | Phases 1–2 |
| Layer management operations in n8n + MCP   | TBD    | Phase 3    |
| Multi-locale page generation               | TBD    | Phase 4    |
| Dynamic visibility profiles                | TBD    | Phase 5    |
