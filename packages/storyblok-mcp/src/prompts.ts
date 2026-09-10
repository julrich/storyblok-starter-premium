/**
 * MCP Prompt definitions for guided workflows.
 *
 * Each prompt exposes a multi-step workflow as a discoverable slash command
 * in AI clients (Claude, ChatGPT, VS Code). Prompts return a sequence of
 * PromptMessage objects that instruct the LLM on the workflow steps and
 * pre-fill tool call arguments.
 *
 * @see PRD Section 3.1 and Section 5 for design rationale
 */

/** A single prompt argument definition (matches MCP PromptArgument). */
export interface PromptArgument {
  name: string;
  description: string;
  required: boolean;
}

/** A prompt definition with its metadata and argument list. */
export interface PromptDefinition {
  name: string;
  description: string;
  arguments: PromptArgument[];
}

/** A prompt message (matches MCP PromptMessage). */
export interface PromptMessage {
  role: "user" | "assistant";
  content: {
    type: "text";
    text: string;
  };
}

// ── Prompt definitions ─────────────────────────────────────────────

export const PROMPT_DEFINITIONS: PromptDefinition[] = [
  {
    name: "create-page",
    description:
      "Guided workflow to plan and create a new page with AI-generated content. " +
      "Plans the section structure, generates each section with site-aware context, " +
      "previews them, and creates the page in Storyblok.",
    arguments: [
      {
        name: "intent",
        description:
          "What the page is about (e.g., 'Product landing page for our new AI feature', 'Company about page')",
        required: true,
      },
      {
        name: "slug",
        description: "URL slug for the page (e.g., 'ai-feature', 'about-us')",
        required: false,
      },
      {
        name: "sectionCount",
        description:
          "Target number of sections (auto-determined if not specified)",
        required: false,
      },
      {
        name: "contentType",
        description:
          "Content type: 'page' (default), 'blog-post', 'blog-overview', 'event-detail', 'event-list'",
        required: false,
      },
      {
        name: "path",
        description:
          "Folder path in Storyblok (e.g., 'en/services/consulting'). Folders created automatically.",
        required: false,
      },
    ],
  },
  {
    name: "migrate-from-url",
    description:
      "Scrape content from a URL, analyze its structure, and recreate it as a new page " +
      "in Storyblok using the Design System components. Preserves content while adapting " +
      "to the available component library.",
    arguments: [
      {
        name: "url",
        description: "The URL to migrate content from",
        required: true,
      },
      {
        name: "slug",
        description: "URL slug for the new page",
        required: false,
      },
      {
        name: "contentType",
        description: "Content type for the new page (default: 'page')",
        required: false,
      },
    ],
  },
  {
    name: "create-blog-post",
    description:
      "Create a complete blog post with sections, head metadata, aside content, CTA, " +
      "and SEO optimization. Uses the blog-post content type with its specialized " +
      "root fields (head, aside, cta, seo).",
    arguments: [
      {
        name: "topic",
        description: "The topic or title of the blog post",
        required: true,
      },
      {
        name: "slug",
        description: "URL slug for the blog post",
        required: false,
      },
      {
        name: "author",
        description: "Author name for the blog post",
        required: false,
      },
    ],
  },
  {
    name: "content-audit",
    description:
      "Audit existing content in the Storyblok space. Analyzes content patterns, " +
      "component usage, section sequences, and identifies quality issues like " +
      "missing SEO metadata, broken assets, or sparse sections.",
    arguments: [
      {
        name: "startsWith",
        description:
          "Filter stories by slug prefix (e.g., 'en/' for English pages only, 'blog/' for blog posts)",
        required: false,
      },
    ],
  },
  {
    name: "extend-page",
    description:
      "Add new sections to an existing page in Storyblok. Fetches the current page, " +
      "generates new sections, and inserts them at the specified position.",
    arguments: [
      {
        name: "storyId",
        description:
          "The story ID or slug of the page to extend (use list_stories to find it)",
        required: true,
      },
      {
        name: "intent",
        description:
          "What to add (e.g., 'Add a testimonials section and a FAQ', 'Add a CTA at the end')",
        required: false,
      },
      {
        name: "position",
        description:
          "Where to insert (-1 for end, 0 for beginning, or a specific index)",
        required: false,
      },
    ],
  },
  {
    name: "translate-page",
    description:
      "Translate an existing page to another language. Fetches the source page, " +
      "translates all content, and creates a new page in the target language folder.",
    arguments: [
      {
        name: "sourceSlug",
        description:
          "Slug of the source page to translate (e.g., 'en/about-us')",
        required: true,
      },
      {
        name: "targetLanguage",
        description: "Target language (e.g., 'de', 'fr', 'es', 'ja')",
        required: true,
      },
      {
        name: "targetPath",
        description:
          "Folder path for the translated page (e.g., 'de/ueber-uns'). Auto-derived if not specified.",
        required: false,
      },
    ],
  },
  {
    name: "theme-management",
    description:
      "Browse, create, update, and apply design token themes. " +
      "Lists themes, lets you preview one, create new themes from W3C DTCG tokens, " +
      "update existing themes, or apply a theme to a page or the global settings.",
    arguments: [
      {
        name: "storyId",
        description:
          "The story ID of the page or settings story to apply the theme to (use list_stories to find it)",
        required: false,
      },
      {
        name: "themeSlug",
        description:
          "Slug of the theme to apply (e.g., 'dark-mode'). If omitted, you'll be shown available themes first.",
        required: false,
      },
    ],
  },
];

// ── Prompt message generators ──────────────────────────────────────

/**
 * Generate the prompt messages for a given prompt name and arguments.
 * Returns the PromptMessage array that the LLM will use to guide the workflow.
 */
export function getPromptMessages(
  promptName: string,
  args: Record<string, string>,
): PromptMessage[] {
  switch (promptName) {
    case "create-page":
      return getCreatePageMessages(args);
    case "migrate-from-url":
      return getMigrateFromUrlMessages(args);
    case "create-blog-post":
      return getCreateBlogPostMessages(args);
    case "content-audit":
      return getContentAuditMessages(args);
    case "extend-page":
      return getExtendPageMessages(args);
    case "translate-page":
      return getTranslatePageMessages(args);
    case "theme-management":
      return getThemeManagementMessages(args);
    default:
      throw new Error(`Unknown prompt: ${promptName}`);
  }
}

function getCreatePageMessages(args: Record<string, string>): PromptMessage[] {
  const intent = args.intent || "a new page";
  const slug = args.slug ? `with slug '${args.slug}'` : "";
  const contentType = args.contentType || "page";
  const sectionCount = args.sectionCount
    ? `with approximately ${args.sectionCount} sections`
    : "";
  const path = args.path ? `in folder '${args.path}'` : "";

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: [
          `Create a new ${contentType} ${slug} ${path}: ${intent} ${sectionCount}`,
          "",
          "Follow this workflow:",
          "1. Call `analyze_content_patterns` to understand the site's existing style",
          "2. Call `plan_page` with the intent to get a recommended section sequence",
          "3. Review the plan with me — ask if I want to adjust the sections",
          "4. For each planned section, call `generate_section` with context from previous/next sections",
          "5. After generating all sections, call `create_page_with_content` to create the page",
          "",
          "Important guidelines:",
          "- Always use `generate_section` one at a time (not `generate_content` for the whole page)",
          "- Pass `previousSection` and `nextSection` to `generate_section` for better transitions",
          "- If the content type has root fields (like blog-post: head, aside, cta), use `generate_root_field` for each",
          "- Use `generate_seo` as the final step before creating the page",
          "- Always pass `uploadAssets: true` to `create_page_with_content` if content includes image URLs",
        ]
          .filter(Boolean)
          .join("\n"),
      },
    },
    {
      role: "assistant",
      content: {
        type: "text",
        text: `I'll help you create a new ${contentType} about "${intent}". Let me start by analyzing the site's content patterns to ensure the new page fits the established style, then plan the section structure.`,
      },
    },
  ];
}

function getMigrateFromUrlMessages(
  args: Record<string, string>,
): PromptMessage[] {
  const url = args.url || "[URL not provided]";
  const slug = args.slug ? ` with slug '${args.slug}'` : "";
  const contentType = args.contentType || "page";

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: [
          `Migrate the content from ${url} into a new ${contentType}${slug} in Storyblok.`,
          "",
          "Follow this workflow:",
          `1. Call \`scrape_url\` with url '${url}' to extract the page content and images`,
          "2. Analyze the scraped content to understand its structure and key sections",
          "3. Call `analyze_content_patterns` to understand our site's style",
          "4. Call `plan_page` with an intent derived from the scraped content",
          "5. For each planned section, call `generate_section` — use the scraped content as source material in the prompt",
          "6. Call `create_page_with_content` with `uploadAssets: true` to create the page and upload any images",
          "",
          "Important guidelines:",
          "- Preserve the original content's meaning and key messages",
          "- Adapt the structure to fit our Design System components",
          "- Don't copy HTML — regenerate content using our component types",
          "- Include all images from the scraped page (they'll be uploaded to Storyblok)",
        ].join("\n"),
      },
    },
    {
      role: "assistant",
      content: {
        type: "text",
        text: `I'll migrate the content from ${url} into your Storyblok space. Let me start by scraping the page to extract its content and images.`,
      },
    },
  ];
}

function getCreateBlogPostMessages(
  args: Record<string, string>,
): PromptMessage[] {
  const topic = args.topic || "[topic not provided]";
  const slug = args.slug ? ` with slug '${args.slug}'` : "";
  const author = args.author ? ` by ${args.author}` : "";

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: [
          `Create a blog post about: ${topic}${slug}${author}`,
          "",
          "Follow this workflow:",
          "1. Call `plan_page` with `contentType: 'blog-post'` and the topic as intent",
          "2. Review the plan with me — the plan will include both sections and root field recommendations",
          "3. For each planned section, call `generate_section` with `contentType: 'blog-post'`",
          "4. For each recommended root field (head, aside, cta), call `generate_root_field` with `contentType: 'blog-post'`",
          "5. Call `generate_seo` with a summary of the post content",
          "6. Call `create_page_with_content` with:",
          "   - `contentType: 'blog-post'`",
          "   - `sections: [...]` (generated sections)",
          "   - `rootFields: { head: ..., aside: ..., cta: ..., seo: ... }` (generated root fields)",
          "   - `path: 'blog/'` (or appropriate blog folder)",
          "   - `uploadAssets: true`",
          "",
          "Important guidelines:",
          "- Blog posts use 'blog-post' content type, not 'page'",
          "- Root fields (head, aside, cta) are specific to blog-post — don't generate these as sections",
          "- The 'head' field typically includes title, date, author, and category",
          "- Keep sections focused on content (text, image-text) — avoid hero and CTA sections in blog posts",
        ].join("\n"),
      },
    },
    {
      role: "assistant",
      content: {
        type: "text",
        text: `I'll create a blog post about "${topic}". Let me plan the structure using the blog-post content type, which includes specialized fields for the post header, sidebar, and call-to-action.`,
      },
    },
  ];
}

function getContentAuditMessages(
  args: Record<string, string>,
): PromptMessage[] {
  const startsWith = args.startsWith
    ? ` (filtered to stories starting with '${args.startsWith}')`
    : "";

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: [
          `Audit the existing content in our Storyblok space${startsWith}.`,
          "",
          "Follow this workflow:",
          `1. Call \`content_audit\`${
            args.startsWith ? ` with startsWith: '${args.startsWith}'` : ""
          } to run the full automated audit (images, content quality, SEO, freshness)`,
          "2. Review the audit report — it includes a health score, findings by severity, and top offenders",
          `3. Optionally call \`analyze_content_patterns\`${
            args.startsWith ? ` with startsWith: '${args.startsWith}'` : ""
          } for additional structural analysis (component frequency, section sequences)`,
          "4. For any stories that look problematic, call `get_story` to inspect their content",
          "",
          "The `content_audit` tool provides a comprehensive report with:",
          "- **Health score** (0–100) — overall content quality",
          "- **Image issues:** Empty sources, missing alt text, placeholder/external images",
          "- **Content quality:** Empty sections, missing headlines, sparse pages, thin content",
          "- **SEO health:** Missing metadata, title/description length violations",
          "- **Freshness:** Stale content, unpublished changes",
          "- **Composition:** Structural anti-patterns — duplicate heroes, sparse sub-items, adjacent same-type sections, missing CTAs, redundant headlines, competing buttons, first-section spacing",
          "- **Top offenders:** Stories with the most issues",
          "",
          "Present the findings as a structured report with specific recommendations.",
        ].join("\n"),
      },
    },
    {
      role: "assistant",
      content: {
        type: "text",
        text: `I'll audit your content${startsWith}. Let me run the comprehensive content audit to check images, SEO, content quality, and freshness across all stories.`,
      },
    },
  ];
}

function getExtendPageMessages(args: Record<string, string>): PromptMessage[] {
  const storyId = args.storyId || "[story ID not provided]";
  const intent = args.intent || "add new sections";
  const position = args.position || "-1";

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: [
          `Extend the page '${storyId}': ${intent}`,
          "",
          "Follow this workflow:",
          `1. Call \`get_story\` with identifier '${storyId}' to see the current page content`,
          "2. Analyze the existing sections to understand what's already there",
          "3. Generate new sections using `generate_section` — pass the last existing section as `previousSection` for context",
          `4. Call \`import_content_at_position\` with position ${position} to add the new sections`,
          "",
          "Important guidelines:",
          "- Review the existing sections before generating new ones to avoid duplication",
          "- Maintain stylistic consistency with the existing content",
          "- Use `previousSection` and `nextSection` context for smooth transitions",
        ].join("\n"),
      },
    },
    {
      role: "assistant",
      content: {
        type: "text",
        text: `I'll extend the page '${storyId}'. Let me first fetch the current content to understand what's already there, then generate new sections that complement the existing ones.`,
      },
    },
  ];
}

function getTranslatePageMessages(
  args: Record<string, string>,
): PromptMessage[] {
  const sourceSlug = args.sourceSlug || "[source slug not provided]";
  const targetLanguage =
    args.targetLanguage || "[target language not provided]";
  const targetPath = args.targetPath
    ? `in folder '${args.targetPath}'`
    : `(auto-derived from source slug and target language)`;

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: [
          `Translate the page '${sourceSlug}' to ${targetLanguage} ${targetPath}.`,
          "",
          "Follow this workflow:",
          `1. Call \`get_story\` with identifier '${sourceSlug}' to fetch the source page content`,
          "2. Analyze the page structure — count sections, identify content types",
          "3. For each section, call `generate_section` with:",
          `   - The same \`componentType\` as the original section`,
          `   - A prompt that includes the original content and instructs translation to ${targetLanguage}`,
          "   - `previousSection` and `nextSection` for context",
          "4. If the page has root fields (blog-post), translate those with `generate_root_field`",
          "5. Call `generate_seo` with translated content summary",
          `6. Call \`create_page_with_content\` with the translated sections and \`path: '${
            args.targetPath || targetLanguage + "/"
          }'\ and \`uploadAssets: true\``,
          "",
          "Important guidelines:",
          "- Preserve the exact same section structure and component types as the source",
          "- Translate naturally — don't do word-for-word translation",
          "- Adapt cultural references, date formats, and idioms for the target language",
          "- Keep the same images (they don't need re-uploading)",
          "- Translate SEO metadata (title, description, keywords) for the target language",
        ].join("\n"),
      },
    },
    {
      role: "assistant",
      content: {
        type: "text",
        text: `I'll translate the page '${sourceSlug}' to ${targetLanguage}. Let me first fetch the source content to understand its structure, then translate each section while preserving the layout.`,
      },
    },
  ];
}

function getThemeManagementMessages(
  args: Record<string, string>,
): PromptMessage[] {
  const storyId = args.storyId || "";
  const themeSlug = args.themeSlug || "";

  const hasStory = !!storyId;
  const hasTheme = !!themeSlug;

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: [
          hasTheme && hasStory
            ? `Apply the theme '${themeSlug}' to story ${storyId}.`
            : hasTheme
              ? `Show me what the '${themeSlug}' theme contains and help me apply it.`
              : "Help me browse and apply a design token theme.",
          "",
          "Follow this workflow:",
          "1. Call `list_themes` to see all available themes",
          ...(hasTheme
            ? [`2. Call \`get_theme\` with slug '${themeSlug}' to preview it`]
            : [
                "2. Show me the available themes and ask which one I'd like to apply",
                "3. Call `get_theme` on the chosen theme to preview its tokens and CSS",
              ]),
          ...(hasStory
            ? [
                `${
                  hasTheme ? "3" : "4"
                }. Call \`apply_theme\` with storyId '${storyId}' and the theme UUID`,
              ]
            : [
                `${
                  hasTheme ? "3" : "4"
                }. Ask me which story to apply the theme to (use \`list_stories\` if I need help finding it)`,
                `${
                  hasTheme ? "4" : "5"
                }. Call \`apply_theme\` with the chosen story ID and theme UUID`,
              ]),
          "",
          "Tips:",
          "- Use `list_stories` with `contentType: 'page'` to find pages, or look for the settings story",
          "- To apply a theme globally, apply it to the `settings` story",
          "- To apply per-page, apply it to that specific page story",
          "- Use `remove_theme` to reset a story to the default branding",
          "- To create a new theme: build W3C DTCG tokens → call `create_theme` with name + tokens",
          "- To update an existing theme: call `update_theme` with slugOrUuid + tokens",
          "- System-managed themes (system: true) cannot be updated or deleted",
        ].join("\n"),
      },
    },
    {
      role: "assistant",
      content: {
        type: "text",
        text: hasTheme
          ? `I'll help you apply the '${themeSlug}' theme. Let me first fetch the available themes to confirm it exists, then show you its details.`
          : "I'll help you browse and apply a design token theme. Let me start by listing all available themes in the space.",
      },
    },
  ];
}
