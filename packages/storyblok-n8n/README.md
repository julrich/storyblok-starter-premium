# n8n-nodes-storyblok-kickstartds

n8n community node package for **Storyblok CMS** with **kickstartDS Design System** — AI-powered content generation, story management, and space introspection.

This package provides **26 operations** across **4 resources** as a single n8n node:

| Resource       | Operations | Description                                                             |
| -------------- | ---------- | ----------------------------------------------------------------------- |
| **AI Content** | 7          | Generate, import, plan, analyze, and generate root fields & SEO with AI |
| **Story**      | 8          | Full CRUD + search + replace section + update SEO                       |
| **Space**      | 7          | Scrape URLs, introspect components/assets/recipes/icons                 |
| **Theme**      | 4          | List, get, apply, and remove design token themes                        |

Together they enable fully automated content pipelines: analyze → plan → generate → create → publish.

## Installation

### n8n Community Nodes (recommended)

1. Open your n8n instance
2. Go to **Settings → Community Nodes**
3. Click **Install a community node**
4. Enter: `n8n-nodes-storyblok-kickstartds`
5. Click **Install**

### Manual Installation

```bash
# In your n8n installation directory
npm install n8n-nodes-storyblok-kickstartds

# Or via N8N_CUSTOM_EXTENSIONS
export N8N_CUSTOM_EXTENSIONS="/path/to/n8n-nodes-storyblok-kickstartds"
```

### Docker

```dockerfile
FROM n8nio/n8n:latest
RUN cd /usr/local/lib/node_modules/n8n && npm install n8n-nodes-storyblok-kickstartds
```

## Credentials Setup

### Storyblok API

| Field                      | Description                                                                    |
| -------------------------- | ------------------------------------------------------------------------------ |
| **Space ID**               | Your numeric Storyblok space ID (visible in dashboard URL)                     |
| **Preview API Token**      | Content Delivery API token (Settings → API-Keys → Preview)                     |
| **Management OAuth Token** | Personal access token for Management API (My Account → Personal access tokens) |

### OpenAI API

| Field       | Description                             |
| ----------- | --------------------------------------- |
| **API Key** | Your OpenAI API key starting with `sk-` |

> The OpenAI credential is only required for the **Generate**, **Generate Section**, **Plan Page**, **Generate Root Field**, and **Generate SEO** operations.

---

## Node Reference

### Resource: AI Content

#### Operation: Generate

Generate structured content using OpenAI with JSON Schema constraints. Three schema modes are available:

| Parameter            | Type   | Required    | Description                                                                      |
| -------------------- | ------ | ----------- | -------------------------------------------------------------------------------- |
| **System Prompt**    | String | ✅          | Sets the AI's persona, tone, and domain knowledge                                |
| **Prompt**           | String | ✅          | Describes what content to generate                                               |
| **Schema Mode**      | Select | ✅          | `Auto (Design System)` (default), `Preset`, or `Custom JSON Schema`              |
| **Component Type**   | String | When Auto   | Component to generate (e.g. `hero`, `faq`). Leave empty for full-page generation |
| **Section Count**    | Number | When Auto   | Number of sections to generate (default: 1, for full-page mode)                  |
| **Component Schema** | Select | When Preset | Choose from built-in component schemas (Hero, FAQ, Testimonials, etc.)           |
| **Schema Name**      | String | When Custom | Identifier for the custom schema                                                 |
| **JSON Schema**      | JSON   | When Custom | Full JSON Schema object for structured output                                    |
| **Model**            | Select | ✅          | OpenAI model to use                                                              |

**Output (Auto mode):**

```json
{
  "designSystemProps": { "headline": "...", "sub": "...", "text": "..." },
  "storyblokContent": { "component": "hero", "headline": "..." },
  "rawResponse": {},
  "_meta": {
    "model": "gpt-4o-2024-08-06",
    "schemaMode": "auto",
    "schemaName": "page_schema",
    "timestamp": "..."
  }
}
```

**Output (Preset / Custom mode):**

```json
{
  "generatedContent": {},
  "_meta": {
    "model": "gpt-4o-2024-08-06",
    "schemaMode": "preset",
    "schemaName": "hero_section",
    "timestamp": "..."
  }
}
```

#### Operation: Import

Import generated content into a Storyblok story. Two placement modes:

- **Replace Prompter Component** — finds a prompter component by its `_uid` and replaces it
- **Insert at Position** — inserts at beginning, end, or specific index

| Parameter                  | Type    | Required            | Description                                             |
| -------------------------- | ------- | ------------------- | ------------------------------------------------------- |
| **Story UID**              | String  | ✅                  | Numeric ID of the Storyblok story                       |
| **Placement Mode**         | Select  | ✅                  | `Replace Prompter Component` or `Insert at Position`    |
| **Prompter Component UID** | String  | When Replace        | `_uid` of the prompter component to replace             |
| **Insert Position**        | Select  | When Insert         | `Beginning`, `End`, or `Specific Index`                 |
| **Index**                  | Number  | When Specific Index | Zero-based insertion index                              |
| **Page Content**           | JSON    | ✅                  | Object with `{ content: { section: [...] } }` structure |
| **Content Type**           | String  | No                  | Content type (default: `page`)                          |
| **Skip Transform**         | Boolean | No                  | Skip automatic Storyblok flattening (default: false)    |
| **Publish Immediately**    | Boolean | No                  | Publish or save as draft (default: false)               |

#### Operation: Generate Section

Generate a single section with site-aware context injection. Automatically injects sub-component counts, transition context, and recipe best practices.

| Parameter            | Type   | Required | Description                                                 |
| -------------------- | ------ | -------- | ----------------------------------------------------------- |
| **Component Type**   | String | ✅       | Section type to generate (`hero`, `features`, `faq`, `cta`) |
| **Prompt**           | String | ✅       | Content description for this section                        |
| **System Prompt**    | String | No       | Override default content-writer system prompt               |
| **Previous Section** | String | No       | Component type before this one (for transition context)     |
| **Next Section**     | String | No       | Component type after this one (for transition context)      |
| **Content Type**     | String | No       | Content type (default: `page`)                              |
| **Starts With**      | String | No       | Slug prefix filter for site patterns (e.g. `case-studies/`) |
| **Model**            | String | No       | OpenAI model (default: `gpt-4o`)                            |

**Output:**

```json
{
  "generatedContent": {
    "component": "section",
    "components": [{ "component": "features", "headline": "..." }]
  },
  "designSystemProps": { "headline": "...", "text": "...", "feature": [] },
  "_meta": {
    "model": "gpt-4o",
    "componentType": "features",
    "timestamp": "..."
  }
}
```

#### Operation: Plan Page

AI-assisted page structure planning. Returns a recommended section sequence based on available components, recipes, and existing content patterns.

| Parameter         | Type   | Required | Description                                                       |
| ----------------- | ------ | -------- | ----------------------------------------------------------------- |
| **Intent**        | String | ✅       | Page description (e.g. "Product landing page with pricing tiers") |
| **Section Count** | Number | No       | Target number of sections (0 = auto-determined)                   |
| **Content Type**  | String | No       | Content type (default: `page`)                                    |
| **Starts With**   | String | No       | Slug prefix filter for site patterns (e.g. `case-studies/`)       |
| **Model**         | String | No       | OpenAI model (default: `gpt-4o`)                                  |

**Output:**

```json
{
  "plan": {
    "sections": [
      {
        "componentType": "hero",
        "intent": "Opening hero with...",
        "notes": "..."
      },
      {
        "componentType": "features",
        "intent": "Feature grid showing...",
        "notes": "..."
      }
    ]
  },
  "_meta": {
    "model": "gpt-4o",
    "intent": "...",
    "availableComponents": 15,
    "timestamp": "..."
  }
}
```

#### Operation: Analyze Patterns

Analyze content patterns across published stories. Returns component frequency, section sequences, sub-component counts, and page archetypes.

| Parameter        | Type   | Required | Description                               |
| ---------------- | ------ | -------- | ----------------------------------------- |
| **Content Type** | String | No       | Content type to analyze (default: `page`) |
| **Starts With**  | String | No       | Slug prefix filter (e.g. `en/`)           |

**Output:**

```json
{
  "patterns": {
    "totalStories": 42,
    "componentFrequency": { "hero": 38, "features": 25, "cta": 20 },
    "sectionSequences": [{ "pair": "hero→features", "count": 18 }],
    "subComponentCounts": {
      "features.feature": { "min": 3, "max": 6, "avg": 4 }
    },
    "pageArchetypes": [
      { "name": "Landing Page", "pattern": ["hero", "features", "cta"] }
    ]
  },
  "_meta": { "contentType": "page", "timestamp": "..." }
}
```

#### Operation: Generate Root Field

Generate content for a single root-level field (e.g. `head`, `aside`, `cta`) on hybrid content types like `blog-post`. Uses OpenAI structured output with the field's sub-schema extracted from the content type schema.

| Parameter         | Type   | Required | Description                                           |
| ----------------- | ------ | -------- | ----------------------------------------------------- |
| **Field Name**    | String | ✅       | Root field to generate (`head`, `aside`, `cta`, etc.) |
| **Prompt**        | String | ✅       | Content description for this field                    |
| **System Prompt** | String | No       | Override default content-writer system prompt         |
| **Content Type**  | String | No       | Content type (default: `blog-post`)                   |
| **Model**         | String | No       | OpenAI model (default: `gpt-4o`)                      |

**Output:**

```json
{
  "fieldName": "head",
  "storyblokContent": [
    {
      "component": "blog-head",
      "headline": "...",
      "date": "..."
    }
  ],
  "designSystemProps": { "headline": "...", "date": "..." },
  "_meta": {
    "operation": "generateRootField",
    "fieldName": "head",
    "contentType": "blog-post",
    "timestamp": "..."
  }
}
```

#### Operation: Generate SEO

Generate SEO metadata (title, description, keywords, OG image) for any content type that has a `seo` root field. Uses a specialized SEO-expert system prompt.

| Parameter         | Type   | Required | Description                                                            |
| ----------------- | ------ | -------- | ---------------------------------------------------------------------- |
| **Prompt**        | String | ✅       | Summary of page content with key topics, target audience, and keywords |
| **Content Type**  | String | No       | Content type (default: `page`)                                         |
| **System Prompt** | String | No       | Override default SEO-specialist system prompt                          |
| **Model**         | String | No       | OpenAI model (default: `gpt-4o`)                                       |

**Output:**

```json
{
  "seo": {
    "title": "...",
    "description": "...",
    "og_title": "...",
    "og_description": "...",
    "og_image": "..."
  },
  "designSystemProps": { "title": "...", "description": "..." },
  "_meta": {
    "operation": "generateSeo",
    "contentType": "blog-post",
    "timestamp": "..."
  }
}
```

---

### Resource: Story

#### Operation: List

List stories with optional filtering and pagination.

| Parameter           | Type    | Required | Description                                                                                                                                        |
| ------------------- | ------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Content Type**    | String  | No       | Filter by content type (default: `page`)                                                                                                           |
| **Starts With**     | String  | No       | Filter by slug prefix (e.g. `en/`)                                                                                                                 |
| **Page**            | Number  | No       | Page number (default: 1)                                                                                                                           |
| **Per Page**        | Number  | No       | Items per page, max 100 (default: 25)                                                                                                              |
| **Exclude Content** | Boolean | No       | Exclude story content from response (default: `true`). When true, only metadata is returned. Set to `false` for content audits, SEO analysis, etc. |

#### Operation: Get

Retrieve a single story by slug, ID, or UUID.

| Parameter            | Type   | Required | Description                       |
| -------------------- | ------ | -------- | --------------------------------- |
| **Story Identifier** | String | ✅       | Slug, numeric ID, or UUID         |
| **Find By**          | Select | No       | `Slug` (default), `ID`, or `UUID` |
| **Version**          | Select | No       | `Published` (default) or `Draft`  |

#### Operation: Create Page

Create a new page pre-populated with section content. Supports automatic UID injection, schema validation, Storyblok flattening, folder creation, and asset upload.

| Parameter             | Type    | Required    | Description                                                                            |
| --------------------- | ------- | ----------- | -------------------------------------------------------------------------------------- |
| **Name**              | String  | ✅          | Display name (shown in Storyblok dashboard)                                            |
| **Slug**              | String  | ✅          | URL slug (must be unique within parent folder)                                         |
| **Sections**          | JSON    | ✅          | Array of section objects (typically from Generate operations)                          |
| **Content Type**      | String  | No          | Root content type (default: `page`)                                                    |
| **Path**              | String  | No          | Folder path with auto-creation (e.g. `en/services`). Mutually exclusive with Parent ID |
| **Parent ID**         | Number  | No          | Numeric parent folder ID. Mutually exclusive with Path                                 |
| **Root Fields**       | JSON    | No          | Additional root-level fields (e.g. `{ "title": "..." }` for blog-post)                 |
| **Publish**           | Boolean | No          | Publish immediately (default: false)                                                   |
| **Upload Assets**     | Boolean | No          | Upload external images as Storyblok assets (default: false)                            |
| **Asset Folder Name** | String  | When Upload | Storyblok asset folder name (default: `AI Generated`)                                  |
| **Skip Validation**   | Boolean | No          | Skip schema validation (default: false)                                                |
| **Skip Transform**    | Boolean | No          | Skip Storyblok flattening (default: false)                                             |

#### Operation: Update

Update an existing story's content, name, or slug.

| Parameter           | Type    | Required | Description                                      |
| ------------------- | ------- | -------- | ------------------------------------------------ |
| **Story ID**        | Number  | ✅       | Numeric story ID                                 |
| **Content**         | JSON    | No       | Updated content object (replaces entire content) |
| **Name**            | String  | No       | Updated display name                             |
| **Slug**            | String  | No       | Updated URL slug                                 |
| **Publish**         | Boolean | No       | Publish after updating (default: false)          |
| **Skip Validation** | Boolean | No       | Skip schema validation (default: false)          |

#### Operation: Delete

Permanently delete a story. This action cannot be undone.

| Parameter    | Type   | Required | Description      |
| ------------ | ------ | -------- | ---------------- |
| **Story ID** | Number | ✅       | Numeric story ID |

#### Operation: Replace Section

Replace a single section in a story by zero-based index. Avoids fetching and resubmitting the entire content tree via Update. Supports asset upload.

| Parameter             | Type    | Required    | Description                                           |
| --------------------- | ------- | ----------- | ----------------------------------------------------- |
| **Story UID**         | String  | ✅          | Story UUID or numeric ID                              |
| **Position**          | Number  | ✅          | Zero-based section index (`-1` = last)                |
| **Section**           | JSON    | ✅          | Replacement section object                            |
| **Publish**           | Boolean | No          | Publish after replacing (default: false)              |
| **Upload Assets**     | Boolean | No          | Upload external images to Storyblok (default: false)  |
| **Asset Folder Name** | String  | When Upload | Storyblok asset folder name (default: `AI Generated`) |
| **Skip Validation**   | Boolean | No          | Skip schema validation (default: false)               |
| **Skip Transform**    | Boolean | No          | Skip Storyblok flattening (default: false)            |

#### Operation: Update SEO

Set or update SEO metadata fields on a story. Auto-creates the SEO component if the story doesn't have one yet. Only provided fields are updated — omitted fields are left unchanged.

| Parameter             | Type    | Required    | Description                                                     |
| --------------------- | ------- | ----------- | --------------------------------------------------------------- |
| **Story UID**         | String  | ✅          | Story UUID or numeric ID                                        |
| **SEO Title**         | String  | No          | Page title (og:title). Leave empty to keep current.             |
| **SEO Description**   | String  | No          | Meta description (og:description). Leave empty to keep current. |
| **SEO Keywords**      | String  | No          | Comma-separated keywords. Leave empty to keep current.          |
| **SEO Image**         | String  | No          | OG image URL. Uploaded when Upload Assets enabled.              |
| **SEO Card Image**    | String  | No          | Twitter/social card image URL. Leave empty to keep current.     |
| **Publish**           | Boolean | No          | Publish after updating (default: false)                         |
| **Upload Assets**     | Boolean | No          | Upload external SEO image URLs to Storyblok (default: false)    |
| **Asset Folder Name** | String  | When Upload | Storyblok asset folder name (default: `AI Generated`)           |

#### Operation: Search

Full-text search across all stories.

| Parameter        | Type   | Required | Description                    |
| ---------------- | ------ | -------- | ------------------------------ |
| **Search Query** | String | ✅       | Full-text search query         |
| **Content Type** | String | No       | Filter results by content type |

---

### Resource: Space

#### Operation: Scrape URL

Fetch a web page and convert it to clean Markdown with extracted images. Useful for content migration.

| Parameter        | Type   | Required | Description                                         |
| ---------------- | ------ | -------- | --------------------------------------------------- |
| **URL**          | String | ✅       | Web page URL to scrape                              |
| **CSS Selector** | String | No       | CSS selector to extract a specific part of the page |

**Output:**

```json
{
  "title": "Page Title",
  "url": "https://example.com/page",
  "markdown": "# Heading\n\nParagraph text...",
  "images": [{ "src": "https://...", "alt": "...", "context": "content" }]
}
```

#### Operation: List Components

List all component schemas defined in the Storyblok space. No parameters required.

#### Operation: Get Component

Get the full schema definition for a single component.

| Parameter          | Type   | Required | Description                            |
| ------------------ | ------ | -------- | -------------------------------------- |
| **Component Name** | String | ✅       | Technical component name (e.g. `hero`) |

#### Operation: List Assets

List assets (images, files) in the Storyblok space.

| Parameter     | Type   | Required | Description                           |
| ------------- | ------ | -------- | ------------------------------------- |
| **Search**    | String | No       | Filter by filename                    |
| **Folder ID** | Number | No       | Filter by asset folder ID             |
| **Page**      | Number | No       | Page number (default: 1)              |
| **Per Page**  | Number | No       | Items per page, max 100 (default: 25) |

#### Operation: List Recipes

List curated section recipes, page templates, and anti-patterns for content planning. Includes 19 recipes, 14 page templates, and 13 anti-patterns. All entries are tagged with a `contentType` — filtering returns only content-type-appropriate results (e.g. blog-post recipes are text/split-focused, no hero or cta). Anti-patterns are also filtered by content type.

| Parameter                 | Type    | Required | Description                                          |
| ------------------------- | ------- | -------- | ---------------------------------------------------- |
| **Intent**                | String  | No       | Intent to prioritize relevant recipes                |
| **Content Type**          | String  | No       | Filter recipes by content type                       |
| **Include Live Patterns** | Boolean | No       | Merge live component usage patterns (default: false) |

#### Operation: List Icons

List all 28 available icon identifiers for component icon fields (e.g. `arrow-right`, `star`, `email`, `phone`). No parameters required.

#### Operation: Ensure Path

Create a folder hierarchy idempotently (like `mkdir -p`). Returns the folder ID of the deepest folder.

| Parameter       | Type   | Required | Description                                        |
| --------------- | ------ | -------- | -------------------------------------------------- |
| **Folder Path** | String | ✅       | Forward-slash path (e.g. `en/services/consulting`) |

---

### Resource: Theme

Manage design token themes stored as `token-theme` stories in Storyblok under `settings/themes/`.

#### List Themes

List all available design token themes.

No parameters required — returns all `token-theme` stories with their name, slug, UUID, and full slug.

#### Get Theme

Get the full details of a theme including branding tokens and compiled CSS.

| Parameter              | Type   | Required | Description                                |
| ---------------------- | ------ | -------- | ------------------------------------------ |
| **Theme Slug or UUID** | String | ✅       | Slug (e.g. `dark-mode`) or UUID of a theme |

#### Apply Theme

Apply a design token theme to a page or settings story by setting its `theme` UUID reference field.

| Parameter      | Type    | Required | Description                                           |
| -------------- | ------- | -------- | ----------------------------------------------------- |
| **Story ID**   | String  | ✅       | Numeric ID of the target story                        |
| **Theme UUID** | String  | ✅       | UUID of the theme to apply                            |
| **Publish**    | Boolean | —        | Whether to publish the story after applying the theme |

#### Remove Theme

Remove the theme from a story, resetting it to default branding.

| Parameter    | Type    | Required | Description                                      |
| ------------ | ------- | -------- | ------------------------------------------------ |
| **Story ID** | String  | ✅       | Numeric ID of the story to remove the theme from |
| **Publish**  | Boolean | —        | Whether to publish the story after removal       |

---

## Cross-Node Expression Examples

### Plan → Generate Section → Create Page pipeline

```
# In Generate Section node, reference the Plan Page output:
Component Type: {{ $('Plan Page').item.json.plan.sections[0].componentType }}
Prompt:         {{ $('Plan Page').item.json.plan.sections[0].intent }}

# In Create Page node, collect all generated sections:
Sections:       {{ JSON.stringify($('Generate Section').all().map(i => i.json.generatedContent)) }}
```

### Generate → Import pipeline

```
# In Import node, reference Generate output:
Page Content:   {{ JSON.stringify({ content: { section: [$json.generatedContent] } }) }}
```

### Scrape URL → Generate from scraped content

```
# In Generate node, use scraped markdown as context:
Prompt:         Rewrite this content for our website: {{ $('Scrape URL').item.json.markdown }}
```

### List Stories → Loop → Update each

```
# In IF node after List Stories, check if more pages exist:
{{ $json.total > ($json._meta.page * $json._meta.perPage) }}
```

---

## Preset Component Schemas

The following kickstartDS component schemas are built in for the **Preset** schema mode. For most use cases, the **Auto (Design System)** mode is recommended — it dynamically derives schemas from the Design System schema for any content type, supporting all components. The node uses a `SchemaRegistry` to load schemas for all 5 content types (`page`, `blog-post`, `blog-overview`, `event-detail`, `event-list`).

| Preset           | Key Fields                                                               |
| ---------------- | ------------------------------------------------------------------------ |
| **Hero**         | `headline`, `sub`, `text`, `buttons[]`, `textPosition`, `height`         |
| **FAQ**          | `questions[]` → `{ question, answer }`                                   |
| **Testimonials** | `testimonial[]` → `{ quote, name, title, rating }`                       |
| **Features**     | `feature[]` → `{ icon, title, text, cta_label, cta_url }`                |
| **CTA**          | `headline`, `sub`, `text`, `buttons[]`, `textAlign`                      |
| **Text**         | `text`, `layout`, `align`, `highlightText`                               |
| **Blog Teaser**  | `headline`, `teaserText`, `date`, `readingTime`, `author_name`, `tags[]` |
| **Stats**        | `stat[]` → `{ number, title, description, icon }`                        |
| **Image + Text** | `text`, `layout`, `highlightText`, `image_alt`                           |

## Example Workflows

Ten ready-to-import workflow templates are included in the `workflows/` directory:

### Template 1: Manual → Generate Hero → Import

Simple manual trigger. Good for testing and one-off content generation.

### Template 2: Webhook → Generate Full Page → Import → Slack

Webhook-triggered full-page generation with Slack notification.

### Template 3: Schedule → Batch Blog Teasers → Import

Weekly batch generation of blog teaser content.

### Template 4: Weekly Content Audit

Scheduled audit of all stories — checks for missing CTAs, sparse sections, and structural issues using Analyze Patterns.

### Template 5: Blog Autopilot (RSS → Generate → Create)

Monitors an RSS feed, scrapes each new article, generates a blog post, and creates it in Storyblok.

### Template 6: Content Migration (Scrape → Generate → Create)

Scrapes pages from an external website, generates Design System–compatible content, and creates pages with folder structure.

### Template 7: SEO Fix Pipeline

Lists all pages, identifies those missing meta descriptions or with short content, generates improvements, and updates them.

### Template 8: Section-by-Section Page Generation

Full guided generation pipeline: Analyze Patterns → Plan Page → Generate Section (loop) → Create Page.

### Template 9: Broken Asset Detection

Lists all assets and stories, cross-references to find unused or broken asset references.

### Template 10: Bulk Theme Apply

Apply a design token theme to all pages matching a slug prefix. Resolves theme by slug, lists matching pages, applies in rate-limited batches, and summarizes results.

## Error Handling

| Error                              | Cause                                             | Resolution                                                                                   |
| ---------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `OpenAI content generation failed` | Invalid API key, rate limit, or model error       | Check OpenAI credentials and quota                                                           |
| `Storyblok import failed`          | Invalid story UID or API permissions              | Verify the story exists and tokens have write access                                         |
| `Prompter component not found`     | The `_uid` doesn't match any section in the story | The error message lists all available section UIDs. Or switch to **Insert at Position** mode |
| `Invalid JSON in custom schema`    | Malformed JSON Schema input                       | Validate your JSON Schema syntax                                                             |
| `Failed to list stories`           | Invalid API token or network error                | Verify Storyblok credentials and connectivity                                                |
| `Validation error`                 | Content doesn't match Design System schema        | Check component nesting rules, or use Skip Validation as escape hatch                        |

All operations support n8n's built-in **Retry on Fail** setting for transient errors.

## Development

```bash
cd n8n-nodes-storyblok-kickstartds

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Type check
npm run typecheck

# Watch mode
npm run dev
```

### Local Testing with n8n

```bash
# Link the package globally
npm link

# In your n8n installation
npm link n8n-nodes-storyblok-kickstartds

# Start n8n
n8n start
```

## Related

- [Shared Service Library](../shared/storyblok-services/) — `@kickstartds/storyblok-services` — shared Storyblok, OpenAI, schema preparation, content transformation, pattern analysis, and validation logic consumed by this package, the MCP server, and the Next.js API routes
- [Storyblok MCP Server](../storyblok-mcp/) — The MCP server that exposes the same capabilities via Model Context Protocol (deployable via Kamal with Streamable HTTP transport)
- [kickstartDS Design System](https://www.kickstartds.com/) — The component library powering the content schemas
- [n8n Community Nodes docs](https://docs.n8n.io/integrations/community-nodes/) — How to install and use community nodes

## Key Dependencies

| Package                           | Version   | Purpose                                         |
| --------------------------------- | --------- | ----------------------------------------------- |
| `@kickstartds/storyblok-services` | `file:..` | Shared Storyblok + OpenAI + validation services |
| `openai`                          | `^6.18.0` | OpenAI API client                               |
| `storyblok-js-client`             | `^7.2.3`  | Storyblok Management + Content API client       |
| `n8n-workflow`                    | `^1.0.0`  | n8n workflow types                              |

## License

MIT
