# @kickstartds/storyblok-services

Shared Storyblok CMS, OpenAI content generation, and Design System schema services for the kickstartDS starter project.

This package provides pure, framework-agnostic functions consumed by three different runtimes:

| Consumer                                    | Module format | Description                                                               |
| ------------------------------------------- | ------------- | ------------------------------------------------------------------------- |
| [MCP Server](../storyblok-mcp/)                | ESM           | Model Context Protocol server for AI assistants (stdio + Streamable HTTP) |
| [n8n Nodes](../storyblok-n8n/)                  | CJS           | n8n community nodes for workflow automation                               |
| [Next.js API Routes](../website/pages/api/) | ESM (bundled) | REST endpoints for the Storyblok starter site                             |

## API

### Storyblok

```typescript
import {
  createStoryblokClient,
  getStoryManagement,
  saveStory,
  importByPrompterReplacement,
  importAtPosition,
} from "@kickstartds/storyblok-services";
```

| Function                                                | Description                                    |
| ------------------------------------------------------- | ---------------------------------------------- |
| `createStoryblokClient(credentials)`                    | Create a Storyblok Management API client       |
| `getStoryManagement(client, spaceId, storyId)`          | Fetch a story (including drafts)               |
| `saveStory(client, spaceId, storyId, story, publish?)`  | Save/publish a story                           |
| `importByPrompterReplacement(client, spaceId, options)` | Replace a prompter component with new sections |
| `importAtPosition(client, spaceId, options)`            | Insert sections at a specific position         |

### OpenAI

```typescript
import {
  createOpenAiClient,
  generateStructuredContent,
} from "@kickstartds/storyblok-services";
```

| Function                                     | Description                                                                 |
| -------------------------------------------- | --------------------------------------------------------------------------- |
| `createOpenAiClient(credentials)`            | Create an OpenAI client                                                     |
| `generateStructuredContent(client, options)` | Generate JSON content via structured output (JSON Schema `response_format`) |

### Schema Preparation

Transforms kickstartDS Design System JSON Schemas into a format compatible with OpenAI's structured output (`response_format: json_schema`). Handles 15 transformation passes including `const` → discriminator replacement, field annotation, unsupported keyword removal, and strict-mode enforcement.

```typescript
import {
  prepareSchemaForOpenAi,
  getComponentPresetSchema,
  listAvailableComponents,
  getSchemaName,
  SUPPORTED_COMPONENTS,
  SUB_COMPONENT_MAP,
  UNSUPPORTED_KEYWORDS,
  DEFAULT_PROPERTIES_TO_DROP,
} from "@kickstartds/storyblok-services";
```

| Export                                                | Description                                                                                                                                                           |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prepareSchemaForOpenAi(pageSchema, options?)`        | Takes a dereffed schema + options (`{ sections?, allowedComponents?, propertiesToDrop?, contentType?, rootArrayField? }`) and returns an OpenAI-ready schema envelope |
| `getComponentPresetSchema(pageSchema, componentName)` | Returns a single-component OpenAI-ready schema (replaces hand-written JSON presets)                                                                                   |
| `listAvailableComponents()`                           | Returns the list of supported component names                                                                                                                         |
| `getSchemaName()`                                     | Returns the schema name string for the OpenAI envelope                                                                                                                |
| `SUPPORTED_COMPONENTS`                                | (**deprecated** — use `ValidationRules.allKnownComponents` from registry) Array of component type names                                                               |
| `SUB_COMPONENT_MAP`                                   | (**deprecated** — use `ValidationRules.containerSlots` from registry) Map of parent → sub-component key                                                               |
| `UNSUPPORTED_KEYWORDS`                                | JSON Schema keywords stripped for OpenAI compatibility                                                                                                                |
| `DEFAULT_PROPERTIES_TO_DROP`                          | Properties removed by default (visual styling: `backgroundColor`, `backgroundImage`, `spotlight`, `textColor`)                                                        |
| `PROPERTIES_TO_ANNOTATE`                              | Properties kept in the schema but enriched with contextual descriptions (`spaceBefore`, `spaceAfter`, `variant`)                                                      |
| `FIELD_ANNOTATIONS`                                   | Map of field names to contextual description strings for schema annotation                                                                                            |

### Content Transformation

Handles two directions of transformation between OpenAI output, Design System props, and Storyblok content:

```typescript
import {
  processOpenAiResponse,
  processForStoryblok,
  injectRootFieldComponentTypes,
  flattenNestedObjects,
  unflattenNestedObjects,
} from "@kickstartds/storyblok-services";
```

| Function                                                         | Description                                                                                                                                                                                                                               |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `processOpenAiResponse(response, schemaMap?, defaults?, merge?)` | Reverses `type__X` → `type: X` mangling, merges component defaults. Returns Design System–shaped props                                                                                                                                    |
| `processForStoryblok(page)`                                      | Flattens nested objects to `key_subKey`, moves `type` → `component` (and removes `type`), adds `aiDraft: true`. Guarantees Storyblok output never carries both `type` and `component`                                                     |
| `injectRootFieldComponentTypes(content, fieldSchema)`            | Injects `type` discriminators into root field content using the original schema's `$id` values, so `processForStoryblok` can convert them to `component` identifiers. Wraps single component objects in arrays for Storyblok bloks fields |
| `flattenNestedObjects(obj)`                                      | Utility: flattens one level of nested objects using `_` separator. Skips objects with `type` or `component` (component blocks)                                                                                                            |
| `unflattenNestedObjects(obj)`                                    | Reverse utility: `key_subKey` → `{ key: { subKey } }`                                                                                                                                                                                     |

### Asset Management

Handles downloading external images (e.g. AI-generated URLs from DALL·E), uploading them to Storyblok as native assets via the signed upload flow, and rewriting URLs in content trees.

```typescript
import {
  uploadAndReplaceAssets,
  findImageUrls,
  defaultIsImageUrl,
} from "@kickstartds/storyblok-services";
```

| Function                                           | Description                                                                                                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `uploadAndReplaceAssets(client, content, options)` | Find image URLs in a content tree, download them, upload to Storyblok, and rewrite URLs in place. Deduplicates and rate-limits automatically      |
| `findImageUrls(content, predicate?)`               | Traverse a JSON structure and collect all string values matching image URLs                                                                       |
| `defaultIsImageUrl(value)`                         | Default heuristic: matches `http(s)://` URLs with common image extensions (`.jpg`, `.png`, `.webp`, etc.) plus known AI image hosts (e.g. DALL·E) |

**`UploadAssetsOptions`:**

| Option              | Type                         | Default             | Description                                                   |
| ------------------- | ---------------------------- | ------------------- | ------------------------------------------------------------- |
| `spaceId`           | `string`                     | —                   | Storyblok space ID (required)                                 |
| `assetFolderId`     | `number`                     | —                   | Upload into a specific asset folder                           |
| `assetFolderName`   | `string`                     | —                   | Create or reuse a folder by name (ignored if `assetFolderId`) |
| `requestsPerSecond` | `number`                     | `2`                 | Rate limit for Storyblok API requests                         |
| `isImageUrl`        | `(value: string) => boolean` | `defaultIsImageUrl` | Custom predicate for detecting image URLs                     |

### Pipeline (High-Level Orchestrator)

End-to-end content generation pipeline for consumers who don't need fine-grained control:

```typescript
import {
  generateAndPrepareContent,
  generateRootFieldContent,
  generateSeoContent,
} from "@kickstartds/storyblok-services";
```

| Function                                     | Description                                                                                                                                                                                                                  |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generateAndPrepareContent(client, options)` | User prompt → schema preparation → OpenAI generation → response post-processing → Storyblok flattening. Returns `{ designSystemProps, storyblokContent, rawResponse, preparedSchema }`                                       |
| `generateRootFieldContent(client, options)`  | Generates a single root-level field (e.g. `head`, `aside`, `cta`). Injects component types from schema `$id`, runs full transform pipeline, wraps in array. Returns `{ designSystemProps, storyblokContent: [], fieldName }` |
| `generateSeoContent(client, options)`        | Generates SEO metadata for a content type's `seo` field. Delegates to `generateRootFieldContent` with a specialized SEO-expert system prompt                                                                                 |

```typescript
const result = await generateAndPrepareContent(openaiClient, {
  system: "You are a content writer.",
  prompt: "Create a hero section with a background image",
  pageSchema: dereferencedPageSchema,
  schemaOptions: { allowedComponents: ["hero", "section"] },
});
```

### Storyblok Import with Asset Upload

The import functions (`importByPrompterReplacement` and `importAtPosition`) support **automatic asset upload**: when `uploadAssets: true` is passed, any image URLs in the content are downloaded, uploaded to Storyblok as native assets, and their URLs rewritten before the story is saved.

### Content Validation

Schema-driven validation for content before writing to Storyblok:

```typescript
import {
  buildValidationRules,
  validateSections,
  validatePageContent,
  formatValidationErrors,
  checkCompositionalQuality,
} from "@kickstartds/storyblok-services";
```

| Function                                              | Description                                                                                                                                                                                                           |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------- |
| `buildValidationRules(schema)`                        | Build validation rules from a dereffed schema (component hierarchy, container slots, root array fields)                                                                                                               |
| `validateSections(sections, rules)`                   | Validate an array of sections against rules. Returns `{ valid, errors }`                                                                                                                                              |
| `validatePageContent(content, rules)`                 | Validate full page content (detects `component` discriminator). Returns `{ valid, errors }`                                                                                                                           |
| `formatValidationErrors(errors)`                      | Format validation errors as human-readable string                                                                                                                                                                     |
| `checkCompositionalQuality(sections, rules, options)` | Non-blocking quality checks (duplicate heroes, sparse sub-items, missing CTAs, redundant headlines, competing CTAs, inappropriate content_mode, first section spacing). Returns warnings array with `level: "warning" | "info" | "suggestion"` |

### Field-Level Compositional Guidance

Discovers stylistic and presence fields from schemas, tracks their distributions across content, and assembles field-level guidance for content generation prompts:

```typescript
import {
  discoverStylisticFields,
  discoverPresenceFields,
  computeFieldDistribution,
  pruneFieldProfiles,
  assembleFieldGuidance,
} from "@kickstartds/storyblok-services";
```

| Function                                                 | Description                                                                                                                                       |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `discoverStylisticFields(derefSchema, rules)`            | Walk component schemas and classify enum/boolean properties as stylistic fields (e.g. `width`, `spaceBefore`, `content_mode`)                     |
| `discoverPresenceFields(derefSchema, rules)`             | Identify headline/button fields where empty-vs-populated is compositionally significant                                                           |
| `computeFieldDistribution(field, valueCounts, default?)` | Convert raw value→count map into a `FieldDistribution` with dominant value and percentage                                                         |
| `pruneFieldProfiles(profiles, options?)`                 | Apply 5 pruning rules: min samples (≥3), dominance (>60%), default-only (>95%), positional delta (>15pp), top-N cap                               |
| `assembleFieldGuidance(options)`                         | Assemble a field guidance prompt fragment from patterns + recipes, with 5 priority layers and ~800 token budget. Returns string for system prompt |

The `analyzeContentPatterns()` function in `patterns.ts` now accepts an optional `derefSchema` parameter. When provided, it automatically discovers fields, tracks their distributions across all 3 dimensions (context-free, container-scoped/child-scoped, positional), and returns `fieldProfiles` in the analysis result.

### Schema Registry (Multi-Content-Type)

Load and manage schemas for multiple content types:

```typescript
import {
  SchemaRegistry,
  createRegistryFromSchemaDir,
  createRegistryFromDirectory,
  ROOT_CONTENT_TYPES,
} from "@kickstartds/storyblok-services";
```

| Export                                        | Description                                                                                                                                    |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `createRegistryFromSchemaDir(dir)`            | Load all `*.schema.dereffed.json` files from a flat directory and build a `SchemaRegistry`                                                     |
| `createRegistryFromDirectory(baseDir, types)` | Load schemas from component subdirectories (`baseDir/{type}/{type}.schema.dereffed.json`)                                                      |
| `ROOT_CONTENT_TYPES`                          | Array of 5 supported content types: `page`, `blog-post`, `blog-overview`, `event-detail`, `event-list`                                         |
| `SchemaRegistry`                              | Registry class with `get(type)`, `has(type)`, `listContentTypes()`, `listSectionBasedTypes()`, `listFlatTypes()`, `detectContentType(content)` |
| `ContentTypeEntry`                            | `{ name, schema, rules, hasSections, rootArrayFields }` for each registered content type                                                       |

### Page Planning

AI-assisted page structure planning, extracted from the MCP server's `plan_page` handler:

```typescript
import {
  planPageContent,
  formatPatternsContext,
} from "@kickstartds/storyblok-services";
```

| Function                                  | Description                                                                                                                                                                                                                |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `planPageContent(client, entry, options)` | Takes an OpenAI client, a `ContentTypeEntry` from the registry, and options (intent, patterns, recipes, sectionCount). Returns a structured plan with section sequence and optional rootFieldMeta for hybrid content types |
| `formatPatternsContext(patterns)`         | Formats a `ContentPatternAnalysis` into a human-readable prompt fragment (component frequency, section sequences, sub-item counts)                                                                                         |

```typescript
const plan = await planPageContent(openaiClient, entry, {
  intent: "Product landing page for our new AI feature",
  patterns: cachedPatterns,
  recipes: loadedRecipes,
  sectionCount: 5,
});
// plan.plan.sections → [{ componentType: "hero", intent: "..." }, ...]
```

### Section Generation

Single-section generation with automatic site-aware context injection, extracted from the MCP server's `generate_section` handler:

```typescript
import { generateSectionContent } from "@kickstartds/storyblok-services";
```

| Function                                         | Description                                                                                                                                                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `generateSectionContent(client, entry, options)` | Takes an OpenAI client, a `ContentTypeEntry`, and options (componentType, prompt, previousSection, nextSection, patterns, recipes). Builds a layered system prompt with site context, transition awareness, and field-level guidance |

```typescript
const result = await generateSectionContent(openaiClient, entry, {
  componentType: "features",
  prompt: "4 key capabilities of our AI consulting service",
  previousSection: "hero",
  nextSection: "testimonials",
  patterns: cachedPatterns,
  recipes: loadedRecipes,
});
// result.designSystemProps → { type: "features", ... }
// result.storyblokContent → { component: "features", ... }
```

```typescript
const result = await importByPrompterReplacement(storyblokClient, {
  storyId: "home",
  prompterUid: "abc-123",
  storyblokContent: generatedContent,
  spaceId: "123456",
  uploadAssets: true,
  assetFolderName: "AI Generated", // Created if it doesn't exist
});

// result.assetsSummary?.uploaded  — number of unique images uploaded
// result.assetsSummary?.rewritten — number of URL references replaced
// result.assetsSummary?.assets    — details of each uploaded asset
```

### Error Classes

| Class                    | Code                       | Description                                         |
| ------------------------ | -------------------------- | --------------------------------------------------- |
| `ServiceError`           | —                          | Base error class with `code` and `details`          |
| `StoryblokApiError`      | `STORYBLOK_API_ERROR`      | Storyblok API call failures                         |
| `PrompterNotFoundError`  | `PROMPTER_NOT_FOUND`       | Prompter UID not in story (includes available UIDs) |
| `OpenAiApiError`         | `OPENAI_API_ERROR`         | OpenAI API call failures                            |
| `ContentGenerationError` | `CONTENT_GENERATION_ERROR` | Empty or invalid AI responses                       |

### Types

```typescript
import type {
  // Core types
  StoryblokCredentials,
  OpenAiCredentials,
  GenerateContentOptions,
  ImportByPrompterOptions,
  ImportAtPositionOptions,
  PageContent,
  // Schema types
  PrepareSchemaOptions,
  OpenAiSchemaEnvelope,
  SchemaValidation,
  PreparedSchema,
  // Transform types
  TransformedContent,
  // Pipeline types
  GenerateAndPrepareOptions,
  GenerateAndPrepareResult,
  GenerateRootFieldOptions,
  GenerateRootFieldResult,
  GenerateSeoOptions,
  GenerateSeoResult,
  // Asset types
  UploadAssetsOptions,
  UploadAssetsSummary,
  UploadedAsset,
  // Validation types
  ValidationRules,
  ValidationResult,
  ValidationError,
  // Registry types
  SchemaRegistry,
  ContentTypeEntry,
  RootContentType,
  // Guidance types
  StylisticFieldSpec,
  PresenceFieldSpec,
  FieldDistribution,
  FieldProfile,
  FieldProfileContext,
  SectionRecipe,
  SectionRecipes,
  PruneOptions,
  AssembleFieldGuidanceOptions,
  // Page planning types
  PlanPageOptions,
  PlanPageResult,
  PagePlan,
  PlannedSection,
  PlannedRootField,
  PlannedField,
  // Section generation types
  GenerateSectionOptions,
  GenerateSectionResult,
} from "@kickstartds/storyblok-services";
```

## File Structure

```
shared/storyblok-services/
├── package.json           # @kickstartds/storyblok-services v1.0.0
├── tsconfig.json          # Type-checking config
├── tsconfig.esm.json      # ESM build → dist/esm/
├── tsconfig.cjs.json      # CJS build → dist/cjs/
├── jest.config.js
├── README.md
├── src/
│   ├── index.ts           # Barrel export
│   ├── types.ts           # Types & error classes
│   ├── storyblok.ts       # Storyblok API functions
│   ├── openai.ts          # OpenAI API functions
│   ├── schema.ts          # Schema preparation for OpenAI structured output
│   ├── transform.ts       # Content transformation (OpenAI ↔ DS ↔ Storyblok)
│   ├── validate.ts        # Schema-driven content validation (nesting, hierarchy, compositional quality)
│   ├── guidance.ts        # Field-level compositional guidance (discovery, pruning, prompt assembly)
│   ├── patterns.ts        # Content pattern analysis (component frequency, sequences, field profiles)
│   ├── registry.ts        # Schema registry for multi-content-type support
│   ├── stories.ts         # Story CRUD, listStories (excludeContent), stripEmptyAssetFields
│   ├── assets.ts          # Asset download, upload to Storyblok, URL rewriting
│   ├── pipeline.ts        # High-level orchestrator (schema prep → OpenAI → transform)
│   ├── plan.ts            # Page planning (AI-assisted section sequence via OpenAI)
│   ├── generate-section.ts # Single-section generation with site-aware context injection
│   ├── components.ts      # Component & asset introspection (listComponents, getComponent, listAssets)
│   └── scrape.ts          # URL scraping (Readability + Turndown + image extraction)
└── test/
    ├── storyblok.test.ts  # 15 tests
    └── openai.test.ts     # 6 tests
```

## Build

The package produces dual ESM + CJS output to serve all consumers:

```bash
npm run build        # Build both formats
npm run build:esm    # ESM only → dist/esm/
npm run build:cjs    # CJS only → dist/cjs/
npm run typecheck    # Type-check without emitting
npm test             # Run 21 unit tests
```

## Dependencies

| Package                | Version   | Purpose                                               |
| ---------------------- | --------- | ----------------------------------------------------- |
| `openai`               | `^6.18.0` | OpenAI API client                                     |
| `storyblok-js-client`  | `^7.2.3`  | Storyblok Management API client                       |
| `json-schema-traverse` | `^1.0.0`  | Traverses JSON Schema trees for transformation passes |
| `object-traversal`     | `^1.0.1`  | Deep object traversal for content post-processing     |

## Cross-Module Type Note

Sub-packages with their own `node_modules` (MCP server, n8n nodes) may install separate copies of `openai` and `storyblok-js-client`. Because `OpenAI` and `StoryblokClient` use private properties, TypeScript treats the duplicate declarations as incompatible types. This requires `as any` casts when passing clients to shared library functions — specifically in `mcp-server/src/services.ts` (for the OpenAI client) and in the n8n test files (for mock clients). The n8n production code in `GenericFunctions.ts` does not need casts. The Next.js API routes also do **not** need casts because the bundler resolves all imports through the root `node_modules`.

## License

MIT OR Apache-2.0
