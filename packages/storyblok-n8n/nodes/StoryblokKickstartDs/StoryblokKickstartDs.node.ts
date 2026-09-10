import {
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeApiError,
  NodeOperationError,
} from "n8n-workflow";

import { generateContentFields } from "./descriptions/GenerateContentDescription";
import { importContentFields } from "./descriptions/ImportContentDescription";
import { storyOperations, storyFields } from "./descriptions/StoryDescription";
import { spaceOperations, spaceFields } from "./descriptions/SpaceDescription";
import { themeOperations, themeFields } from "./descriptions/ThemeDescription";
import {
  getStoryblokManagementClient,
  getOpenAiClient,
  generateStructuredContent,
  generateAndPrepareContent,
  processForStoryblok,
  importContentIntoStory,
  insertContentAtPosition,
  PRESET_SCHEMAS,
  StoryblokCredentials,
  OpenAiCredentials,
  registry,
  // Story CRUD shared functions
  createContentClient,
  listStories,
  searchStories,
  createPageWithContent,
  updateStory,
  deleteStory,
  ensurePath,
  // Convenience update shared functions
  replaceSection,
  updateSeo,
  // Theme management shared functions
  listThemes,
  getTheme,
  applyTheme,
  removeTheme,
  createTheme,
  updateTheme,
  isSystemTheme,
  // Validation & quality
  checkCompositionalQuality,
  // Space introspection shared functions
  scrapeUrl,
  listComponents,
  getComponent,
  listAssets,
  // Content pattern analysis
  analyzeContentPatterns,
  // Field-level compositional guidance
  assembleFieldGuidance,
  // Root field & SEO generation
  generateRootFieldContent,
  generateSeoContent,
  getRootFieldSchema,
  // Prompt constants
  PLACEHOLDER_IMAGE_INSTRUCTIONS,
  type ContentPatternAnalysis,
  type SubComponentStats,
} from "./GenericFunctions";
import { tokensToCss } from "@kickstartds/design-system/tokens/tokensToCss.mjs";

// Backward-compatible alias via registry
const PAGE_SCHEMA: Record<string, any> = registry.page.schema;

export class StoryblokKickstartDs implements INodeType {
  description: INodeTypeDescription = {
    displayName: "Storyblok kickstartDS",
    name: "storyblokKickstartDs",
    icon: "file:storyblokKickstartDs.svg",
    group: ["transform"],
    version: 1,
    subtitle: '={{$parameter["resource"] + " / " + $parameter["operation"]}}',
    description:
      "Manage Storyblok stories and generate AI-powered content using kickstartDS Design System components",
    defaults: {
      name: "Storyblok kickstartDS",
    },
    inputs: ["main"],
    outputs: ["main"],
    credentials: [
      {
        name: "storyblokApi",
        required: true,
      },
      {
        name: "openAiApi",
        required: true,
        displayOptions: {
          show: {
            resource: ["aiContent"],
            operation: [
              "generate",
              "generateSection",
              "planPage",
              "generateRootField",
              "generateSeo",
            ],
          },
        },
      },
    ],
    properties: [
      // ── Resource ──────────────────────────────────────────────
      {
        displayName: "Resource",
        name: "resource",
        type: "options",
        noDataExpression: true,
        options: [
          {
            name: "AI Content",
            value: "aiContent",
            description:
              "Generate and import AI-powered content for kickstartDS components",
          },
          {
            name: "Story",
            value: "story",
            description:
              "CRUD operations for Storyblok stories — list, get, create, update, delete, search",
          },
          {
            name: "Space",
            value: "space",
            description:
              "Space-level utilities — scrape URLs, introspect components/assets/recipes/icons, manage folder paths",
          },
          {
            name: "Theme",
            value: "theme",
            description:
              "Manage design token themes — list, get, apply to pages/settings, remove",
          },
        ],
        default: "aiContent",
      },

      // ── Operation ─────────────────────────────────────────────
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        options: [
          {
            name: "Generate",
            value: "generate",
            description:
              "Generate structured content using OpenAI GPT-4 and a JSON Schema",
            action: "Generate structured content via OpenAI",
          },
          {
            name: "Import",
            value: "import",
            description:
              "Import generated content into a Storyblok story by replacing a prompter component",
            action: "Import content into a Storyblok story",
          },
          {
            name: "Generate Section",
            value: "generateSection",
            description:
              "Generate a single section with site-aware context injection (sub-component counts, transitions, recipes)",
            action: "Generate a single section with AI",
          },
          {
            name: "Plan Page",
            value: "planPage",
            description:
              "AI-assisted page structure planning — recommends a section sequence based on intent and existing patterns",
            action: "Plan a page structure with AI",
          },
          {
            name: "Analyze Patterns",
            value: "analyzePatterns",
            description:
              "Analyze content patterns across published stories — component frequency, section sequences, page archetypes",
            action: "Analyze content patterns",
          },
          {
            name: "Generate Root Field",
            value: "generateRootField",
            description:
              "Generate content for a single root-level field (e.g. head, aside, cta) on hybrid content types like blog-post",
            action: "Generate a root field with AI",
          },
          {
            name: "Generate SEO",
            value: "generateSeo",
            description:
              "Generate SEO metadata (title, description, keywords, og image) for any content type",
            action: "Generate SEO metadata with AI",
          },
        ],
        default: "generate",
        displayOptions: {
          show: {
            resource: ["aiContent"],
          },
        },
      },

      // ── Spread operation-specific fields ──────────────────────
      ...generateContentFields,
      ...importContentFields,

      // ── Generate Section fields ───────────────────────────────
      {
        displayName: "Component Type",
        name: "sectionComponentType",
        type: "string",
        default: "",
        required: true,
        description:
          'The section component type to generate (e.g. "hero", "features", "faq", "cta")',
        placeholder: "hero",
        displayOptions: {
          show: {
            resource: ["aiContent"],
            operation: ["generateSection"],
          },
        },
      },
      {
        displayName: "Prompt",
        name: "sectionPrompt",
        type: "string",
        typeOptions: { rows: 4 },
        default: "",
        required: true,
        description: "Content description for this section",
        placeholder:
          "A hero section for our AI-powered analytics platform, highlighting real-time insights",
        displayOptions: {
          show: {
            resource: ["aiContent"],
            operation: ["generateSection"],
          },
        },
      },
      {
        displayName: "System Prompt",
        name: "sectionSystem",
        type: "string",
        typeOptions: { rows: 3 },
        default: "",
        description:
          "Optional system prompt override. If empty, a default content-writer system prompt is used.",
        displayOptions: {
          show: {
            resource: ["aiContent"],
            operation: ["generateSection"],
          },
        },
      },
      {
        displayName: "Previous Section",
        name: "sectionPrevious",
        type: "string",
        default: "",
        description:
          "Component type of the section before this one (for transition context)",
        placeholder: "hero",
        displayOptions: {
          show: {
            resource: ["aiContent"],
            operation: ["generateSection"],
          },
        },
      },
      {
        displayName: "Next Section",
        name: "sectionNext",
        type: "string",
        default: "",
        description:
          "Component type of the section after this one (for transition context)",
        placeholder: "features",
        displayOptions: {
          show: {
            resource: ["aiContent"],
            operation: ["generateSection"],
          },
        },
      },
      {
        displayName: "Content Type",
        name: "sectionContentType",
        type: "string",
        default: "page",
        description:
          'Content type to generate for (e.g. "page", "blog-post"). Default: "page".',
        displayOptions: {
          show: {
            resource: ["aiContent"],
            operation: ["generateSection"],
          },
        },
      },
      {
        displayName: "Starts With",
        name: "sectionStartsWith",
        type: "string",
        default: "",
        description:
          'Filter content patterns by slug prefix (e.g. "case-studies/" or "en/blog/"). When set, patterns are fetched live from stories matching this prefix instead of using the global startup cache.',
        placeholder: "case-studies/",
        displayOptions: {
          show: {
            resource: ["aiContent"],
            operation: ["generateSection"],
          },
        },
      },
      {
        displayName: "Model",
        name: "sectionModel",
        type: "string",
        default: "gpt-4o",
        description: "OpenAI model to use for generation",
        displayOptions: {
          show: {
            resource: ["aiContent"],
            operation: ["generateSection"],
          },
        },
      },

      // ── Plan Page fields ──────────────────────────────────────
      {
        displayName: "Intent",
        name: "planIntent",
        type: "string",
        typeOptions: { rows: 3 },
        default: "",
        required: true,
        description:
          "Description of the page to plan (e.g. 'Product landing page for our new AI feature')",
        placeholder:
          "Product landing page for our new AI feature with pricing tiers",
        displayOptions: {
          show: {
            resource: ["aiContent"],
            operation: ["planPage"],
          },
        },
      },
      {
        displayName: "Section Count",
        name: "planSectionCount",
        type: "number",
        default: 0,
        description:
          "Target number of sections. Leave at 0 for auto-determined count.",
        displayOptions: {
          show: {
            resource: ["aiContent"],
            operation: ["planPage"],
          },
        },
      },
      {
        displayName: "Content Type",
        name: "planContentType",
        type: "string",
        default: "page",
        description:
          'Content type to plan for (e.g. "page", "blog-post", "event-detail"). Default: "page".',
        displayOptions: {
          show: {
            resource: ["aiContent"],
            operation: ["planPage"],
          },
        },
      },
      {
        displayName: "Starts With",
        name: "planStartsWith",
        type: "string",
        default: "",
        description:
          'Filter content patterns by slug prefix (e.g. "case-studies/" or "en/blog/"). When set, patterns are fetched live from stories matching this prefix instead of using the global startup cache.',
        placeholder: "case-studies/",
        displayOptions: {
          show: {
            resource: ["aiContent"],
            operation: ["planPage"],
          },
        },
      },
      {
        displayName: "Model",
        name: "planModel",
        type: "string",
        default: "gpt-4o",
        description: "OpenAI model to use for planning",
        displayOptions: {
          show: {
            resource: ["aiContent"],
            operation: ["planPage"],
          },
        },
      },

      // ── Analyze Patterns fields ───────────────────────────────
      {
        displayName: "Content Type",
        name: "patternContentType",
        type: "string",
        default: "page",
        description:
          'Content type to analyze (e.g. "page", "blog-post"). Default: "page".',
        displayOptions: {
          show: {
            resource: ["aiContent"],
            operation: ["analyzePatterns"],
          },
        },
      },
      {
        displayName: "Starts With",
        name: "patternStartsWith",
        type: "string",
        default: "",
        description:
          "Optional slug prefix filter for stories to include in analysis",
        placeholder: "en/",
        displayOptions: {
          show: {
            resource: ["aiContent"],
            operation: ["analyzePatterns"],
          },
        },
      },

      // ── Generate Root Field fields ────────────────────────────
      {
        displayName: "Field Name",
        name: "rootFieldName",
        type: "string",
        default: "",
        required: true,
        description:
          'The root-level field to generate (e.g. "head", "aside", "cta"). Must be a valid root property on the content type schema.',
        placeholder: "head",
        displayOptions: {
          show: {
            resource: ["aiContent"],
            operation: ["generateRootField"],
          },
        },
      },
      {
        displayName: "Prompt",
        name: "rootFieldPrompt",
        type: "string",
        typeOptions: { rows: 4 },
        default: "",
        required: true,
        description:
          "Content description for this field (e.g. author info, blog meta, CTA details)",
        placeholder:
          "Blog post about AI trends in 2026, author is Jane Doe, CTO at TechCorp",
        displayOptions: {
          show: {
            resource: ["aiContent"],
            operation: ["generateRootField"],
          },
        },
      },
      {
        displayName: "System Prompt",
        name: "rootFieldSystem",
        type: "string",
        typeOptions: { rows: 3 },
        default: "",
        description:
          "Optional system prompt override. If empty, a default content-writer system prompt is used.",
        displayOptions: {
          show: {
            resource: ["aiContent"],
            operation: ["generateRootField"],
          },
        },
      },
      {
        displayName: "Content Type",
        name: "rootFieldContentType",
        type: "string",
        default: "blog-post",
        description:
          'Content type to generate for (e.g. "blog-post", "blog-overview"). Default: "blog-post".',
        displayOptions: {
          show: {
            resource: ["aiContent"],
            operation: ["generateRootField"],
          },
        },
      },
      {
        displayName: "Model",
        name: "rootFieldModel",
        type: "string",
        default: "gpt-4o",
        description: "OpenAI model to use for generation",
        displayOptions: {
          show: {
            resource: ["aiContent"],
            operation: ["generateRootField"],
          },
        },
      },

      // ── Generate SEO fields ───────────────────────────────────
      {
        displayName: "Prompt",
        name: "seoPrompt",
        type: "string",
        typeOptions: { rows: 4 },
        default: "",
        required: true,
        description:
          "Summary of the page content to derive SEO metadata from. Include key topics, target audience, and primary keywords.",
        placeholder:
          "Blog post about AI trends in 2026 targeting CTOs and engineering leaders. Keywords: AI, machine learning, enterprise",
        displayOptions: {
          show: {
            resource: ["aiContent"],
            operation: ["generateSeo"],
          },
        },
      },
      {
        displayName: "Content Type",
        name: "seoContentType",
        type: "string",
        default: "page",
        description:
          'Content type (e.g. "page", "blog-post"). Determines which seo sub-schema to use. Default: "page".',
        displayOptions: {
          show: {
            resource: ["aiContent"],
            operation: ["generateSeo"],
          },
        },
      },
      {
        displayName: "System Prompt",
        name: "seoSystem",
        type: "string",
        typeOptions: { rows: 3 },
        default: "",
        description:
          "Optional system prompt override. If empty, a default SEO-specialist system prompt is used.",
        displayOptions: {
          show: {
            resource: ["aiContent"],
            operation: ["generateSeo"],
          },
        },
      },
      {
        displayName: "Model",
        name: "seoModel",
        type: "string",
        default: "gpt-4o",
        description: "OpenAI model to use for generation",
        displayOptions: {
          show: {
            resource: ["aiContent"],
            operation: ["generateSeo"],
          },
        },
      },

      // ── Story resource ────────────────────────────────────────
      storyOperations,
      ...storyFields,

      // ── Space resource ────────────────────────────────────────
      spaceOperations,
      ...spaceFields,

      // ── Theme resource ────────────────────────────────────────
      themeOperations,
      ...themeFields,
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    const resource = this.getNodeParameter("resource", 0) as string;
    const operation = this.getNodeParameter("operation", 0) as string;

    for (let i = 0; i < items.length; i++) {
      try {
        let result: Record<string, unknown>;

        if (resource === "aiContent") {
          if (operation === "generate") {
            result = await executeGenerate.call(this, i);
          } else if (operation === "import") {
            result = await executeImport.call(this, i);
          } else if (operation === "generateSection") {
            result = await executeGenerateSection.call(this, i);
          } else if (operation === "planPage") {
            result = await executePlanPage.call(this, i);
          } else if (operation === "analyzePatterns") {
            result = await executeAnalyzePatterns.call(this, i);
          } else if (operation === "generateRootField") {
            result = await executeGenerateRootField.call(this, i);
          } else if (operation === "generateSeo") {
            result = await executeGenerateSeo.call(this, i);
          } else {
            throw new NodeOperationError(
              this.getNode(),
              `Unknown AI Content operation: ${operation}`,
              { itemIndex: i },
            );
          }
        } else if (resource === "story") {
          if (operation === "list") {
            result = await executeListStories.call(this, i);
          } else if (operation === "get") {
            result = await executeGetStory.call(this, i);
          } else if (operation === "createPage") {
            result = await executeCreatePage.call(this, i);
          } else if (operation === "update") {
            result = await executeUpdateStory.call(this, i);
          } else if (operation === "delete") {
            result = await executeDeleteStory.call(this, i);
          } else if (operation === "replaceSection") {
            result = await executeReplaceSection.call(this, i);
          } else if (operation === "updateSeo") {
            result = await executeUpdateSeo.call(this, i);
          } else if (operation === "search") {
            result = await executeSearchStories.call(this, i);
          } else {
            throw new NodeOperationError(
              this.getNode(),
              `Unknown Story operation: ${operation}`,
              { itemIndex: i },
            );
          }
        } else if (resource === "space") {
          if (operation === "scrapeUrl") {
            result = await executeScrapeUrl.call(this, i);
          } else if (operation === "listComponents") {
            result = await executeListComponents.call(this, i);
          } else if (operation === "getComponent") {
            result = await executeGetComponent.call(this, i);
          } else if (operation === "listAssets") {
            result = await executeListAssets.call(this, i);
          } else if (operation === "listRecipes") {
            result = await executeListRecipes.call(this, i);
          } else if (operation === "listIcons") {
            result = await executeListIcons.call(this, i);
          } else if (operation === "ensurePath") {
            result = await executeEnsurePath.call(this, i);
          } else {
            throw new NodeOperationError(
              this.getNode(),
              `Unknown Space operation: ${operation}`,
              { itemIndex: i },
            );
          }
        } else if (resource === "theme") {
          if (operation === "list") {
            result = await executeListThemes.call(this, i);
          } else if (operation === "get") {
            result = await executeGetTheme.call(this, i);
          } else if (operation === "apply") {
            result = await executeApplyTheme.call(this, i);
          } else if (operation === "remove") {
            result = await executeRemoveTheme.call(this, i);
          } else if (operation === "create") {
            result = await executeCreateTheme.call(this, i);
          } else if (operation === "update") {
            result = await executeUpdateTheme.call(this, i);
          } else {
            throw new NodeOperationError(
              this.getNode(),
              `Unknown Theme operation: ${operation}`,
              { itemIndex: i },
            );
          }
        } else {
          throw new NodeOperationError(
            this.getNode(),
            `Unknown resource: ${resource}`,
            { itemIndex: i },
          );
        }

        returnData.push({ json: result as IDataObject });
      } catch (error) {
        if (this.continueOnFail()) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          returnData.push({
            json: { error: errorMessage },
            pairedItem: { item: i },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}

// ─── Generate Content execution ───────────────────────────────────────

async function executeGenerate(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  // 1. Gather credentials
  const openAiCredentials = (await this.getCredentials(
    "openAiApi",
    itemIndex,
  )) as unknown as OpenAiCredentials;

  const client = getOpenAiClient(openAiCredentials);

  // 2. Gather parameters
  const system = this.getNodeParameter("system", itemIndex) as string;
  const prompt = this.getNodeParameter("prompt", itemIndex) as string;
  const schemaMode = this.getNodeParameter("schemaMode", itemIndex) as string;
  const model = this.getNodeParameter("model", itemIndex) as string;

  // 3. Auto mode — uses shared library's full pipeline
  if (schemaMode === "auto") {
    const componentType = this.getNodeParameter(
      "autoComponentType",
      itemIndex,
      "",
    ) as string;
    const sectionCount = this.getNodeParameter(
      "autoSectionCount",
      itemIndex,
      1,
    ) as number;

    try {
      const result = await generateAndPrepareContent(client, {
        system,
        prompt,
        pageSchema: PAGE_SCHEMA,
        schemaOptions: {
          ...(componentType
            ? { allowedComponents: [componentType, "section"] }
            : {}),
          ...(sectionCount ? { sections: sectionCount } : {}),
        },
        model,
      });

      return {
        generatedContent: result.storyblokContent,
        designSystemProps: result.designSystemProps,
        rawResponse: result.rawResponse,
        _meta: {
          model,
          schemaMode: "auto",
          componentType: componentType || "full-page",
          sectionCount,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new NodeApiError(this.getNode(), { message } as any, {
        message: `Auto schema generation failed: ${message}`,
        itemIndex,
      });
    }
  }

  // 4. Resolve schema (preset or custom mode)
  let schema: {
    name: string;
    strict?: boolean;
    schema: Record<string, unknown>;
  };

  if (schemaMode === "preset") {
    const presetKey = this.getNodeParameter(
      "presetSchema",
      itemIndex,
    ) as string;
    const preset = PRESET_SCHEMAS[presetKey];
    if (!preset) {
      throw new NodeOperationError(
        this.getNode(),
        `Unknown preset schema: "${presetKey}". Available: ${Object.keys(
          PRESET_SCHEMAS,
        ).join(", ")}`,
        { itemIndex },
      );
    }
    schema = { name: preset.name, strict: true, schema: preset.schema };
  } else {
    const customSchemaName = this.getNodeParameter(
      "customSchemaName",
      itemIndex,
    ) as string;
    const customSchemaRaw = this.getNodeParameter(
      "customSchema",
      itemIndex,
    ) as string;

    let parsedSchema: Record<string, unknown>;
    try {
      parsedSchema =
        typeof customSchemaRaw === "string"
          ? JSON.parse(customSchemaRaw)
          : (customSchemaRaw as Record<string, unknown>);
    } catch (parseError) {
      throw new NodeOperationError(
        this.getNode(),
        "Invalid JSON in custom schema field. Please provide a valid JSON Schema.",
        { itemIndex },
      );
    }

    schema = { name: customSchemaName, strict: true, schema: parsedSchema };
  }

  // 5. Call OpenAI
  try {
    const result = await generateStructuredContent(client, {
      system,
      prompt,
      schema,
      model,
    });

    return {
      generatedContent: result,
      _meta: {
        model,
        schemaMode,
        schemaName: schema.name,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new NodeApiError(this.getNode(), { message } as any, {
      message: `OpenAI content generation failed: ${message}`,
      itemIndex,
    });
  }
}

// ─── Import Content execution ─────────────────────────────────────────

async function executeImport(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  // 1. Gather credentials
  const storyblokCredentials = (await this.getCredentials(
    "storyblokApi",
    itemIndex,
  )) as unknown as StoryblokCredentials;

  const client = getStoryblokManagementClient(storyblokCredentials);
  const spaceId = storyblokCredentials.spaceId;

  // 2. Gather parameters
  const storyUid = this.getNodeParameter("storyUid", itemIndex) as string;
  const placementMode = this.getNodeParameter(
    "placementMode",
    itemIndex,
  ) as string;
  const publish = this.getNodeParameter("publish", itemIndex, false) as boolean;

  const pageRaw = this.getNodeParameter("page", itemIndex) as string | object;

  // 3. Parse page content
  let page: { content: { section: Record<string, unknown>[] } };
  try {
    const parsed = typeof pageRaw === "string" ? JSON.parse(pageRaw) : pageRaw;

    // Support both { content: { section: [...] } } and direct array
    if (Array.isArray(parsed)) {
      page = { content: { section: parsed } };
    } else if (parsed?.content?.section) {
      page = parsed as typeof page;
    } else if (parsed?.generatedContent) {
      // Direct output from the Generate Content operation — wrap it
      const content = parsed.generatedContent;
      if (Array.isArray(content)) {
        page = { content: { section: content } };
      } else {
        page = { content: { section: [content] } };
      }
    } else {
      // Treat the entire object as a single section
      page = { content: { section: [parsed] } };
    }
  } catch (parseError) {
    throw new NodeOperationError(
      this.getNode(),
      "Invalid JSON in Page Content field. Expected an object with { content: { section: [...] } }.",
      { itemIndex },
    );
  }

  if (!page.content.section || page.content.section.length === 0) {
    throw new NodeOperationError(
      this.getNode(),
      "Page content has no sections to import. Provide at least one section object.",
      { itemIndex },
    );
  }

  // 3b. Auto-flatten for Storyblok unless content was generated in auto mode
  const skipTransform = this.getNodeParameter(
    "skipTransform",
    itemIndex,
    false,
  ) as boolean;

  if (!skipTransform) {
    const flattened = processForStoryblok(page);
    page = flattened as typeof page;
  }

  // 4. Import into Storyblok
  try {
    let updatedStory: Record<string, any>;
    let placementDetail: string;

    if (placementMode === "position") {
      // ── Position-based insertion (no prompter needed) ───────────
      const insertPosition = this.getNodeParameter(
        "insertPosition",
        itemIndex,
      ) as string;

      let positionIndex: number;
      if (insertPosition === "beginning") {
        positionIndex = 0;
      } else if (insertPosition === "end") {
        positionIndex = -1; // sentinel handled by insertContentAtPosition
      } else {
        // "index"
        positionIndex = this.getNodeParameter(
          "insertIndex",
          itemIndex,
          0,
        ) as number;
      }

      updatedStory = await insertContentAtPosition(
        client as any,
        spaceId,
        storyUid,
        positionIndex,
        page.content.section,
        publish,
      );

      placementDetail =
        insertPosition === "end"
          ? "appended at end"
          : insertPosition === "beginning"
            ? "inserted at beginning"
            : `inserted at index ${positionIndex}`;
    } else {
      // ── Prompter replacement (original behaviour) ──────────────
      const prompterUid = this.getNodeParameter(
        "prompterUid",
        itemIndex,
      ) as string;

      updatedStory = await importContentIntoStory(
        client as any,
        spaceId,
        storyUid,
        prompterUid,
        page.content.section,
        publish,
      );

      placementDetail = `replaced prompter ${prompterUid}`;
    }

    // Check compositional quality (non-blocking warnings)
    const warnings = checkCompositionalQuality(
      page.content.section,
      registry.page.rules,
    );

    return {
      success: true,
      message: publish
        ? "Content imported and published successfully"
        : "Content imported as draft successfully",
      story: updatedStory,
      warnings: warnings.length > 0 ? warnings : undefined,
      _meta: {
        storyUid,
        placementMode,
        placementDetail,
        sectionsImported: page.content.section.length,
        published: publish,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new NodeApiError(this.getNode(), { message } as any, {
      message: `Storyblok import failed: ${message}`,
      itemIndex,
    });
  }
}

// ─── Story CRUD execution functions ───────────────────────────────────

async function executeListStories(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  const storyblokCredentials = (await this.getCredentials(
    "storyblokApi",
    itemIndex,
  )) as unknown as StoryblokCredentials;

  const client = createContentClient({
    spaceId: storyblokCredentials.spaceId,
    apiToken: storyblokCredentials.apiToken,
  });

  const contentType = this.getNodeParameter(
    "contentType",
    itemIndex,
    "page",
  ) as string;
  const startsWith = this.getNodeParameter(
    "startsWith",
    itemIndex,
    "",
  ) as string;
  const page = this.getNodeParameter("page", itemIndex, 1) as number;
  const perPage = this.getNodeParameter("perPage", itemIndex, 25) as number;
  const excludeContent = this.getNodeParameter(
    "excludeContent",
    itemIndex,
    true,
  ) as boolean;

  try {
    const result = await listStories(client, {
      contentType: contentType || undefined,
      startsWith: startsWith || undefined,
      page,
      perPage,
      excludeContent,
    });

    return {
      stories: result.stories,
      total: result.total,
      perPage: result.perPage,
      _meta: {
        operation: "list",
        contentType,
        startsWith,
        page,
        perPage,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new NodeApiError(this.getNode(), { message } as any, {
      message: `Failed to list stories: ${message}`,
      itemIndex,
    });
  }
}

async function executeGetStory(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  const storyblokCredentials = (await this.getCredentials(
    "storyblokApi",
    itemIndex,
  )) as unknown as StoryblokCredentials;

  const client = createContentClient({
    spaceId: storyblokCredentials.spaceId,
    apiToken: storyblokCredentials.apiToken,
  });

  const identifier = this.getNodeParameter(
    "storyIdentifier",
    itemIndex,
  ) as string;
  const findBy = this.getNodeParameter("findBy", itemIndex, "slug") as string;
  const version = this.getNodeParameter(
    "version",
    itemIndex,
    "published",
  ) as string;

  try {
    const params: Record<string, unknown> = { version };
    if (findBy === "uuid") {
      params.find_by = "uuid";
    }

    const response = await client.get(`cdn/stories/${identifier}`, params);
    const story = response.data.story;

    return {
      story,
      _meta: {
        operation: "get",
        identifier,
        findBy,
        version,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new NodeApiError(this.getNode(), { message } as any, {
      message: `Failed to get story "${identifier}": ${message}`,
      itemIndex,
    });
  }
}

async function executeCreatePage(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  const storyblokCredentials = (await this.getCredentials(
    "storyblokApi",
    itemIndex,
  )) as unknown as StoryblokCredentials;

  const managementClient = getStoryblokManagementClient(storyblokCredentials);
  const contentClient = createContentClient({
    spaceId: storyblokCredentials.spaceId,
    apiToken: storyblokCredentials.apiToken,
  });
  const spaceId = storyblokCredentials.spaceId;

  const name = this.getNodeParameter("name", itemIndex) as string;
  const slug = this.getNodeParameter("slug", itemIndex) as string;
  const sectionsRaw = this.getNodeParameter("sections", itemIndex) as
    | string
    | object;
  const contentType = this.getNodeParameter(
    "createContentType",
    itemIndex,
    "page",
  ) as string;
  const path = this.getNodeParameter("path", itemIndex, "") as string;
  const parentIdParam = this.getNodeParameter(
    "parentId",
    itemIndex,
    0,
  ) as number;
  const rootFieldsRaw = this.getNodeParameter("rootFields", itemIndex, "{}") as
    | string
    | object;
  const publish = this.getNodeParameter("publish", itemIndex, false) as boolean;
  const uploadAssets = this.getNodeParameter(
    "uploadAssets",
    itemIndex,
    false,
  ) as boolean;
  const assetFolderName = this.getNodeParameter(
    "assetFolderName",
    itemIndex,
    "AI Generated",
  ) as string;
  const skipValidation = this.getNodeParameter(
    "skipValidation",
    itemIndex,
    false,
  ) as boolean;
  const skipTransform = this.getNodeParameter(
    "skipTransform",
    itemIndex,
    false,
  ) as boolean;

  // Parse sections
  let sections: Record<string, unknown>[];
  try {
    const parsed =
      typeof sectionsRaw === "string" ? JSON.parse(sectionsRaw) : sectionsRaw;
    sections = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    throw new NodeOperationError(
      this.getNode(),
      "Invalid JSON in Sections field. Expected an array of section objects.",
      { itemIndex },
    );
  }

  // Parse root fields
  let rootFields: Record<string, unknown> = {};
  try {
    rootFields =
      typeof rootFieldsRaw === "string"
        ? JSON.parse(rootFieldsRaw || "{}")
        : (rootFieldsRaw as Record<string, unknown>);
  } catch {
    throw new NodeOperationError(
      this.getNode(),
      "Invalid JSON in Root Fields field.",
      { itemIndex },
    );
  }

  // Auto-flatten for Storyblok
  if (!skipTransform) {
    const flattened = processForStoryblok({ section: sections });
    sections = (flattened as any).section;
  }

  // Resolve parentId from path if provided
  let parentId: number | undefined = parentIdParam || undefined;
  if (path) {
    parentId = await ensurePath(managementClient, contentClient, spaceId, path);
  }

  // Resolve content type entry from registry
  const entry = registry.has(contentType)
    ? registry.get(contentType)
    : registry.page;

  try {
    const result = await createPageWithContent(managementClient, spaceId, {
      name,
      slug,
      parentId,
      sections,
      rootFields,
      publish,
      uploadAssets,
      assetFolderName,
      skipValidation,
      validationRules: entry.rules,
      componentName: entry.name,
      rootArrayField: entry.rootArrayFields[0] || "section",
    });

    // Check compositional quality (non-blocking warnings)
    const warnings = checkCompositionalQuality(sections, entry.rules);

    return {
      success: true,
      story: result,
      warnings: warnings.length > 0 ? warnings : undefined,
      _meta: {
        operation: "createPage",
        name,
        slug,
        contentType,
        path: path || undefined,
        parentId,
        published: publish,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new NodeApiError(this.getNode(), { message } as any, {
      message: `Failed to create page "${name}": ${message}`,
      itemIndex,
    });
  }
}

async function executeUpdateStory(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  const storyblokCredentials = (await this.getCredentials(
    "storyblokApi",
    itemIndex,
  )) as unknown as StoryblokCredentials;

  const client = getStoryblokManagementClient(storyblokCredentials);
  const spaceId = storyblokCredentials.spaceId;

  const storyId = this.getNodeParameter("updateStoryId", itemIndex) as number;
  const contentRaw = this.getNodeParameter("updateContent", itemIndex, "") as
    | string
    | object;
  const name = this.getNodeParameter("updateName", itemIndex, "") as string;
  const slug = this.getNodeParameter("updateSlug", itemIndex, "") as string;
  const publish = this.getNodeParameter(
    "updatePublish",
    itemIndex,
    false,
  ) as boolean;
  const skipValidation = this.getNodeParameter(
    "updateSkipValidation",
    itemIndex,
    false,
  ) as boolean;

  // Parse content if provided
  let content: Record<string, unknown> | undefined;
  if (contentRaw && typeof contentRaw === "string" && contentRaw.trim()) {
    try {
      content = JSON.parse(contentRaw);
    } catch {
      throw new NodeOperationError(
        this.getNode(),
        "Invalid JSON in Content field.",
        { itemIndex },
      );
    }
  } else if (contentRaw && typeof contentRaw === "object") {
    content = contentRaw as Record<string, unknown>;
  }

  // Determine validation rules
  let validationRules;
  if (content && !skipValidation) {
    const ct = (content as any).component || (content as any).type;
    if (ct && registry.has(ct)) {
      validationRules = registry.get(ct).rules;
    }
  }

  try {
    const result = await updateStory(
      client,
      spaceId,
      String(storyId),
      {
        content,
        name: name || undefined,
        slug: slug || undefined,
        publish,
        skipValidation,
      },
      validationRules,
    );

    return {
      success: true,
      story: result,
      _meta: {
        operation: "update",
        storyId,
        published: publish,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new NodeApiError(this.getNode(), { message } as any, {
      message: `Failed to update story ${storyId}: ${message}`,
      itemIndex,
    });
  }
}

async function executeDeleteStory(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  const storyblokCredentials = (await this.getCredentials(
    "storyblokApi",
    itemIndex,
  )) as unknown as StoryblokCredentials;

  const client = getStoryblokManagementClient(storyblokCredentials);
  const spaceId = storyblokCredentials.spaceId;

  const storyId = this.getNodeParameter("deleteStoryId", itemIndex) as number;

  try {
    await deleteStory(client, spaceId, String(storyId));

    return {
      success: true,
      message: `Story ${storyId} deleted successfully`,
      _meta: {
        operation: "delete",
        storyId,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new NodeApiError(this.getNode(), { message } as any, {
      message: `Failed to delete story ${storyId}: ${message}`,
      itemIndex,
    });
  }
}

async function executeReplaceSection(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  const storyblokCredentials = (await this.getCredentials(
    "storyblokApi",
    itemIndex,
  )) as unknown as StoryblokCredentials;

  const client = getStoryblokManagementClient(storyblokCredentials);
  const spaceId = storyblokCredentials.spaceId;

  const storyUid = this.getNodeParameter(
    "replaceSectionStoryUid",
    itemIndex,
  ) as string;
  const position = this.getNodeParameter(
    "replaceSectionPosition",
    itemIndex,
  ) as number;
  const sectionRaw = this.getNodeParameter(
    "replaceSectionContent",
    itemIndex,
  ) as string | object;
  const publish = this.getNodeParameter(
    "replaceSectionPublish",
    itemIndex,
    false,
  ) as boolean;
  const uploadAssets = this.getNodeParameter(
    "replaceSectionUploadAssets",
    itemIndex,
    false,
  ) as boolean;
  const assetFolderName = this.getNodeParameter(
    "replaceSectionAssetFolderName",
    itemIndex,
    "AI Generated",
  ) as string;
  const skipValidation = this.getNodeParameter(
    "replaceSectionSkipValidation",
    itemIndex,
    false,
  ) as boolean;
  const skipTransform = this.getNodeParameter(
    "replaceSectionSkipTransform",
    itemIndex,
    false,
  ) as boolean;

  // Parse section JSON
  let section: Record<string, unknown>;
  try {
    section =
      typeof sectionRaw === "string" ? JSON.parse(sectionRaw) : sectionRaw;
  } catch {
    throw new NodeOperationError(
      this.getNode(),
      "Invalid JSON in Section field.",
      { itemIndex },
    );
  }

  // Auto-flatten for Storyblok
  if (!skipTransform) {
    const flattened = processForStoryblok({ section: [section] });
    section = (flattened as any).section[0];
  }

  // Validate if requested
  if (!skipValidation) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {
      validateSections,
      formatValidationErrors,
    } = require("@kickstartds/storyblok-services");
    const rules = registry.page.rules;
    const validationResult = validateSections([section], rules);
    if (!validationResult.valid) {
      throw new NodeOperationError(
        this.getNode(),
        formatValidationErrors(validationResult.errors),
        { itemIndex },
      );
    }
  }

  try {
    const result = await replaceSection(client, spaceId, {
      storyUid,
      position,
      section,
      publish,
      uploadAssets,
      assetFolderName,
    });

    // Check compositional quality (non-blocking warnings)
    const warnings = checkCompositionalQuality([section], registry.page.rules);

    return {
      success: true,
      story: result,
      replacedIndex: (result as any).replacedIndex,
      warnings: warnings.length > 0 ? warnings : undefined,
      _meta: {
        operation: "replaceSection",
        storyUid,
        position,
        replacedIndex: (result as any).replacedIndex,
        published: publish,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new NodeApiError(this.getNode(), { message } as any, {
      message: `Failed to replace section at position ${position}: ${message}`,
      itemIndex,
    });
  }
}

async function executeUpdateSeo(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  const storyblokCredentials = (await this.getCredentials(
    "storyblokApi",
    itemIndex,
  )) as unknown as StoryblokCredentials;

  const client = getStoryblokManagementClient(storyblokCredentials);
  const spaceId = storyblokCredentials.spaceId;

  const storyUid = this.getNodeParameter(
    "updateSeoStoryUid",
    itemIndex,
  ) as string;
  const title = this.getNodeParameter(
    "updateSeoTitle",
    itemIndex,
    "",
  ) as string;
  const description = this.getNodeParameter(
    "updateSeoDescription",
    itemIndex,
    "",
  ) as string;
  const keywords = this.getNodeParameter(
    "updateSeoKeywords",
    itemIndex,
    "",
  ) as string;
  const image = this.getNodeParameter(
    "updateSeoImage",
    itemIndex,
    "",
  ) as string;
  const cardImage = this.getNodeParameter(
    "updateSeoCardImage",
    itemIndex,
    "",
  ) as string;
  const publish = this.getNodeParameter(
    "updateSeoPublish",
    itemIndex,
    false,
  ) as boolean;
  const uploadAssets = this.getNodeParameter(
    "updateSeoUploadAssets",
    itemIndex,
    false,
  ) as boolean;
  const assetFolderName = this.getNodeParameter(
    "updateSeoAssetFolderName",
    itemIndex,
    "AI Generated",
  ) as string;

  // Build SEO object — only include non-empty fields
  const seo: Record<string, string> = {};
  if (title) seo.title = title;
  if (description) seo.description = description;
  if (keywords) seo.keywords = keywords;
  if (image) seo.image = image;
  if (cardImage) seo.cardImage = cardImage;

  if (Object.keys(seo).length === 0) {
    throw new NodeOperationError(
      this.getNode(),
      "At least one SEO field must be provided (title, description, keywords, image, or cardImage).",
      { itemIndex },
    );
  }

  try {
    const result = await updateSeo(client, spaceId, {
      storyUid,
      seo,
      publish,
      uploadAssets,
      assetFolderName,
    });

    return {
      success: true,
      story: result,
      _meta: {
        operation: "updateSeo",
        storyUid,
        seoFieldsUpdated: Object.keys(seo),
        published: publish,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new NodeApiError(this.getNode(), { message } as any, {
      message: `Failed to update SEO for story ${storyUid}: ${message}`,
      itemIndex,
    });
  }
}

async function executeSearchStories(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  const storyblokCredentials = (await this.getCredentials(
    "storyblokApi",
    itemIndex,
  )) as unknown as StoryblokCredentials;

  const client = createContentClient({
    spaceId: storyblokCredentials.spaceId,
    apiToken: storyblokCredentials.apiToken,
  });

  const query = this.getNodeParameter("searchQuery", itemIndex) as string;
  const contentType = this.getNodeParameter(
    "searchContentType",
    itemIndex,
    "",
  ) as string;

  try {
    const result = await searchStories(client, query, contentType || undefined);

    return {
      stories: result.stories,
      total: result.total,
      _meta: {
        operation: "search",
        query,
        contentType: contentType || undefined,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new NodeApiError(this.getNode(), { message } as any, {
      message: `Search failed: ${message}`,
      itemIndex,
    });
  }
}

// ─── Guided Generation execution functions ──────────────────────────────

async function executeGenerateSection(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  const openAiCredentials = (await this.getCredentials(
    "openAiApi",
    itemIndex,
  )) as unknown as OpenAiCredentials;

  const client = getOpenAiClient(openAiCredentials);

  const componentType = this.getNodeParameter(
    "sectionComponentType",
    itemIndex,
    "",
  ) as string;

  if (!componentType) {
    // List available component types for a helpful error
    const ct = this.getNodeParameter(
      "sectionContentType",
      itemIndex,
      "page",
    ) as string;
    const entry = registry.has(ct) ? registry.get(ct) : registry.page;
    const allowed: string[] = [];
    for (const [, types] of entry.rules.containerSlots) {
      for (const t of types) if (!allowed.includes(t)) allowed.push(t);
    }
    throw new NodeOperationError(
      this.getNode(),
      `componentType is required. Available types: ${allowed.join(", ")}`,
      { itemIndex },
    );
  }

  const prompt = this.getNodeParameter("sectionPrompt", itemIndex) as string;
  const systemOverride = this.getNodeParameter(
    "sectionSystem",
    itemIndex,
    "",
  ) as string;
  const previousSection = this.getNodeParameter(
    "sectionPrevious",
    itemIndex,
    "",
  ) as string;
  const nextSection = this.getNodeParameter(
    "sectionNext",
    itemIndex,
    "",
  ) as string;
  const contentType = this.getNodeParameter(
    "sectionContentType",
    itemIndex,
    "page",
  ) as string;
  const startsWith = this.getNodeParameter(
    "sectionStartsWith",
    itemIndex,
    "",
  ) as string;
  const model = this.getNodeParameter(
    "sectionModel",
    itemIndex,
    "gpt-4o",
  ) as string;

  // Build system prompt with site-aware context
  let system =
    systemOverride ||
    `You are an expert content writer creating a ${componentType} section for a website.`;

  // Always inject placeholder image instructions so image fields are never left empty
  system += `\n\n${PLACEHOLDER_IMAGE_INSTRUCTIONS}`;

  // If startsWith is provided, fetch filtered patterns and inject site context
  if (startsWith) {
    const storyblokCredentials = (await this.getCredentials(
      "storyblokApi",
      itemIndex,
    )) as unknown as StoryblokCredentials;
    const contentClient = createContentClient({
      spaceId: storyblokCredentials.spaceId,
      apiToken: storyblokCredentials.apiToken,
    });
    const entry = registry.has(contentType)
      ? registry.get(contentType)
      : registry.page;
    const filteredPatterns = await analyzeContentPatterns(
      contentClient,
      entry.rules,
      { contentType, startsWith },
    );
    const relevantStats = filteredPatterns.subComponentCounts[componentType] as
      | SubComponentStats
      | undefined;
    if (relevantStats) {
      system += `\n\nOn this site section (${startsWith}), ${componentType} sections typically have ${relevantStats.median} sub-items (range: ${relevantStats.min}-${relevantStats.max}).`;
    }
    const freq = filteredPatterns.componentFrequency.find(
      (c: { component: string }) => c.component === componentType,
    );
    if (freq) {
      system += `\nIn this site section (${startsWith}), this component is used ${freq.count} times.`;
    }
  }

  // Add transition context if provided
  if (previousSection) {
    system += `\n\nThis section follows a "${previousSection}" section — ensure a smooth content transition.`;
  }
  if (nextSection) {
    system += `\n\nThis section will be followed by a "${nextSection}" section — set up a natural lead-in.`;
  }

  // Look up recipe notes for this component type (prefer content-type-specific match)
  const matchingRecipe =
    (sectionRecipesData.recipes || []).find(
      (r: Record<string, unknown>) =>
        Array.isArray(r.components) &&
        r.components.includes(componentType) &&
        r.contentType === contentType,
    ) ||
    (sectionRecipesData.recipes || []).find(
      (r: Record<string, unknown>) =>
        Array.isArray(r.components) && r.components.includes(componentType),
    );
  if (matchingRecipe && (matchingRecipe as Record<string, unknown>).notes) {
    system += `\n\nBest practices for ${componentType}: ${
      (matchingRecipe as Record<string, unknown>).notes
    }`;
  }

  // Assemble field-level compositional guidance from patterns + recipes
  if (startsWith) {
    // We already fetched filtered patterns above — pass them for guidance
    const storyblokCredentials2 = (await this.getCredentials(
      "storyblokApi",
      itemIndex,
    )) as unknown as StoryblokCredentials;
    const contentClient2 = createContentClient({
      spaceId: storyblokCredentials2.spaceId,
      apiToken: storyblokCredentials2.apiToken,
    });
    const guidanceEntry = registry.has(contentType)
      ? registry.get(contentType)
      : registry.page;
    const guidancePatterns = await analyzeContentPatterns(
      contentClient2,
      guidanceEntry.rules,
      { contentType, startsWith, derefSchema: guidanceEntry.schema },
    );
    const fieldGuidance = assembleFieldGuidance({
      componentType,
      patterns: guidancePatterns,
      recipes: sectionRecipesData as any,
      scopeLabel: startsWith,
    });
    if (fieldGuidance) {
      system += fieldGuidance;
    }
  } else {
    // No startsWith — use recipes only (no cached patterns in n8n)
    const fieldGuidance = assembleFieldGuidance({
      componentType,
      patterns: null,
      recipes: sectionRecipesData as any,
    });
    if (fieldGuidance) {
      system += fieldGuidance;
    }
  }

  // Resolve content type for schema
  const entry = registry.has(contentType)
    ? registry.get(contentType)
    : registry.page;

  try {
    const result = await generateAndPrepareContent(client, {
      system,
      prompt,
      pageSchema: entry.schema,
      schemaOptions: {
        allowedComponents: [componentType, "section"],
        sections: 1,
      },
      model,
    });

    // Unwrap the page-level envelope produced by processForStoryblok.
    // The pipeline always returns a page wrapper like { section: [{ component: "section", ... }] }.
    // For generateSection we return just the section object, not the wrapper.
    const rootField = entry.rootArrayFields?.[0] || "section";
    const storyblokSections = result.storyblokContent[rootField] || [];
    const sectionContent =
      Array.isArray(storyblokSections) && storyblokSections.length > 0
        ? storyblokSections[0]
        : result.storyblokContent;

    return {
      generatedContent: sectionContent,
      designSystemProps: result.designSystemProps,
      rawResponse: result.rawResponse,
      _meta: {
        operation: "generateSection",
        componentType,
        contentType,
        model,
        startsWith: startsWith || undefined,
        previousSection: previousSection || undefined,
        nextSection: nextSection || undefined,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new NodeApiError(this.getNode(), { message } as any, {
      message: `Section generation failed for "${componentType}": ${message}`,
      itemIndex,
    });
  }
}

async function executeGenerateRootField(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  const openAiCredentials = (await this.getCredentials(
    "openAiApi",
    itemIndex,
  )) as unknown as OpenAiCredentials;

  const client = getOpenAiClient(openAiCredentials);

  const fieldName = this.getNodeParameter("rootFieldName", itemIndex) as string;
  const prompt = this.getNodeParameter("rootFieldPrompt", itemIndex) as string;
  const systemOverride = this.getNodeParameter(
    "rootFieldSystem",
    itemIndex,
    "",
  ) as string;
  const contentType = this.getNodeParameter(
    "rootFieldContentType",
    itemIndex,
    "blog-post",
  ) as string;
  const model = this.getNodeParameter(
    "rootFieldModel",
    itemIndex,
    "gpt-4o",
  ) as string;

  // Build system prompt
  let system =
    systemOverride ||
    `You are an expert content writer. Generate content for the "${fieldName}" field of a ${contentType}.`;
  system += `\n\n${PLACEHOLDER_IMAGE_INSTRUCTIONS}`;

  // Resolve content type schema
  const entry = registry.has(contentType)
    ? registry.get(contentType)
    : registry.page;

  try {
    const result = await generateRootFieldContent(client, {
      system,
      prompt,
      contentTypeSchema: entry.schema,
      fieldName,
      contentType: entry.name,
      model,
    });

    return {
      fieldName: result.fieldName,
      storyblokContent: result.storyblokContent,
      designSystemProps: result.designSystemProps,
      _meta: {
        operation: "generateRootField",
        fieldName,
        contentType,
        model,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new NodeApiError(this.getNode(), { message } as any, {
      message: `Root field generation failed for "${fieldName}": ${message}`,
      itemIndex,
    });
  }
}

async function executeGenerateSeo(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  const openAiCredentials = (await this.getCredentials(
    "openAiApi",
    itemIndex,
  )) as unknown as OpenAiCredentials;

  const client = getOpenAiClient(openAiCredentials);

  const prompt = this.getNodeParameter("seoPrompt", itemIndex) as string;
  const contentType = this.getNodeParameter(
    "seoContentType",
    itemIndex,
    "page",
  ) as string;
  const systemOverride = this.getNodeParameter(
    "seoSystem",
    itemIndex,
    "",
  ) as string;
  const model = this.getNodeParameter(
    "seoModel",
    itemIndex,
    "gpt-4o",
  ) as string;

  // Resolve content type schema
  const entry = registry.has(contentType)
    ? registry.get(contentType)
    : registry.page;

  try {
    const result = await generateSeoContent(client, {
      prompt,
      contentTypeSchema: entry.schema,
      contentType: entry.name,
      model,
      system: systemOverride || undefined,
    });

    return {
      seo: result.storyblokContent,
      designSystemProps: result.designSystemProps,
      _meta: {
        operation: "generateSeo",
        contentType,
        model,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new NodeApiError(this.getNode(), { message } as any, {
      message: `SEO generation failed: ${message}`,
      itemIndex,
    });
  }
}

async function executePlanPage(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  const openAiCredentials = (await this.getCredentials(
    "openAiApi",
    itemIndex,
  )) as unknown as OpenAiCredentials;

  const client = getOpenAiClient(openAiCredentials);

  const intent = this.getNodeParameter("planIntent", itemIndex) as string;
  const sectionCount = this.getNodeParameter(
    "planSectionCount",
    itemIndex,
    0,
  ) as number;
  const contentType = this.getNodeParameter(
    "planContentType",
    itemIndex,
    "page",
  ) as string;
  const startsWith = this.getNodeParameter(
    "planStartsWith",
    itemIndex,
    "",
  ) as string;
  const model = this.getNodeParameter(
    "planModel",
    itemIndex,
    "gpt-4o",
  ) as string;

  // Resolve content type from registry
  const entry = registry.has(contentType)
    ? registry.get(contentType)
    : registry.page;
  const rules = entry.rules;

  // Get available component names from the primary container slot
  const containerSlots = rules.containerSlots;
  let allowedComponents: string[] = [];
  for (const [, types] of containerSlots) {
    for (const t of types) {
      if (!allowedComponents.includes(t)) {
        allowedComponents.push(t);
      }
    }
  }

  // Gather site intelligence — use filtered patterns if startsWith is provided
  let patternsContext = "";
  if (startsWith) {
    const storyblokCredentials = (await this.getCredentials(
      "storyblokApi",
      itemIndex,
    )) as unknown as StoryblokCredentials;
    const contentClient = createContentClient({
      spaceId: storyblokCredentials.spaceId,
      apiToken: storyblokCredentials.apiToken,
    });
    const filteredPatterns = await analyzeContentPatterns(
      contentClient,
      rules,
      { contentType, startsWith },
    );
    const topComponents = filteredPatterns.componentFrequency
      .slice(0, 10)
      .map(
        (c: { component: string; count: number }) =>
          `${c.component} (used ${c.count}x)`,
      )
      .join(", ");
    const topSequences = filteredPatterns.commonSequences
      .slice(0, 8)
      .map(
        (s: { from: string; to: string; count: number }) =>
          `${s.from} → ${s.to} (${s.count}x)`,
      )
      .join(", ");
    const subItems = Object.entries(filteredPatterns.subComponentCounts)
      .map(
        ([component, s]) =>
          `${component}: median ${(s as SubComponentStats).median} items (${
            (s as SubComponentStats).min
          }-${(s as SubComponentStats).max})`,
      )
      .join(", ");
    patternsContext = `\n\nSite patterns (from ${startsWith}):\n- Most used: ${topComponents}\n- Common sequences: ${topSequences}\n- Sub-item counts: ${subItems}`;
  }

  // Build a planning prompt
  const systemPrompt = `You are a website content architect. Given a page intent, recommend a sequence of sections using the available component types.

Available section component types: ${allowedComponents.join(", ")}

${
  sectionCount > 0
    ? `Target section count: ${sectionCount}`
    : "Choose an appropriate number of sections (typically 4-8)."
}${patternsContext}

Return a JSON object with:
- "sections": array of objects, each with "componentType" (one of the available types) and "intent" (brief description of what this section should contain)
- "reasoning": brief explanation of why this structure works for the intent`;

  // Build a simple schema for the plan output
  const planSchema = {
    name: "page_plan",
    strict: true,
    schema: {
      type: "object" as const,
      properties: {
        sections: {
          type: "array" as const,
          items: {
            type: "object" as const,
            properties: {
              componentType: {
                type: "string" as const,
                enum: allowedComponents,
              },
              intent: { type: "string" as const },
            },
            required: ["componentType", "intent"] as const,
            additionalProperties: false,
          },
        },
        reasoning: { type: "string" as const },
      },
      required: ["sections", "reasoning"] as const,
      additionalProperties: false,
    },
  };

  try {
    const result = await generateStructuredContent(client, {
      system: systemPrompt,
      prompt: intent,
      schema: planSchema,
      model,
    });

    return {
      plan: result,
      reviewStatus: "pending",
      usage:
        'Use "Generate Section" for each section in the plan, then "Create Page" to assemble the full page.',
      _meta: {
        operation: "planPage",
        intent,
        contentType,
        model,
        startsWith: startsWith || undefined,
        availableComponents: allowedComponents,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new NodeApiError(this.getNode(), { message } as any, {
      message: `Page planning failed: ${message}`,
      itemIndex,
    });
  }
}

async function executeAnalyzePatterns(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  const storyblokCredentials = (await this.getCredentials(
    "storyblokApi",
    itemIndex,
  )) as unknown as StoryblokCredentials;

  const contentClient = createContentClient({
    spaceId: storyblokCredentials.spaceId,
    apiToken: storyblokCredentials.apiToken,
  });

  const contentType = this.getNodeParameter(
    "patternContentType",
    itemIndex,
    "page",
  ) as string;
  const startsWith = this.getNodeParameter(
    "patternStartsWith",
    itemIndex,
    "",
  ) as string;

  // Resolve validation rules for the content type
  const entry = registry.has(contentType)
    ? registry.get(contentType)
    : registry.page;

  try {
    const analysis = await analyzeContentPatterns(contentClient, entry.rules, {
      contentType: contentType || "page",
      startsWith: startsWith || undefined,
    });

    return {
      ...analysis,
      _meta: {
        operation: "analyzePatterns",
        contentType,
        startsWith: startsWith || undefined,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new NodeApiError(this.getNode(), { message } as any, {
      message: `Pattern analysis failed: ${message}`,
      itemIndex,
    });
  }
}

// ─── Space resource execution functions ─────────────────────────────────

// Hardcoded icon list — same as MCP server
const AVAILABLE_ICONS = [
  "arrow-left",
  "arrow-right",
  "chevron-down",
  "chevron-left",
  "chevron-right",
  "close",
  "search",
  "skip-back",
  "skip-forward",
  "zoom",
  "arrow-down",
  "date",
  "download",
  "email",
  "facebook",
  "file",
  "home",
  "linkedin",
  "login",
  "map-pin",
  "map",
  "person",
  "phone",
  "star",
  "time",
  "twitter",
  "upload",
  "xing",
];

// Section recipes loaded from bundled JSON
import sectionRecipesData from "./schemas/section-recipes.json";

async function executeScrapeUrl(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  const url = this.getNodeParameter("scrapeUrlTarget", itemIndex) as string;
  const selector = this.getNodeParameter(
    "scrapeSelector",
    itemIndex,
    "",
  ) as string;

  try {
    const result = await scrapeUrl({
      url,
      selector: selector || undefined,
    });

    return {
      title: result.title,
      sourceUrl: result.url,
      markdown: result.markdown,
      images: result.images,
      _meta: {
        operation: "scrapeUrl",
        url,
        selector: selector || undefined,
        imageCount: result.images.length,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new NodeApiError(this.getNode(), { message } as any, {
      message: `Failed to scrape URL "${url}": ${message}`,
      itemIndex,
    });
  }
}

async function executeListComponents(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  const storyblokCredentials = (await this.getCredentials(
    "storyblokApi",
    itemIndex,
  )) as unknown as StoryblokCredentials;

  const client = getStoryblokManagementClient(storyblokCredentials);
  const spaceId = storyblokCredentials.spaceId;

  try {
    const components = await listComponents(client, spaceId);

    return {
      components,
      total: (components as unknown[]).length,
      _meta: {
        operation: "listComponents",
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new NodeApiError(this.getNode(), { message } as any, {
      message: `Failed to list components: ${message}`,
      itemIndex,
    });
  }
}

async function executeGetComponent(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  const storyblokCredentials = (await this.getCredentials(
    "storyblokApi",
    itemIndex,
  )) as unknown as StoryblokCredentials;

  const client = getStoryblokManagementClient(storyblokCredentials);
  const spaceId = storyblokCredentials.spaceId;

  const componentName = this.getNodeParameter(
    "componentName",
    itemIndex,
  ) as string;

  try {
    const component = await getComponent(client, spaceId, componentName);

    return {
      component,
      _meta: {
        operation: "getComponent",
        componentName,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new NodeApiError(this.getNode(), { message } as any, {
      message: `Failed to get component "${componentName}": ${message}`,
      itemIndex,
    });
  }
}

async function executeListAssets(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  const storyblokCredentials = (await this.getCredentials(
    "storyblokApi",
    itemIndex,
  )) as unknown as StoryblokCredentials;

  const client = getStoryblokManagementClient(storyblokCredentials);
  const spaceId = storyblokCredentials.spaceId;

  const search = this.getNodeParameter("assetSearch", itemIndex, "") as string;
  const folderId = this.getNodeParameter(
    "assetFolderId",
    itemIndex,
    0,
  ) as number;
  const page = this.getNodeParameter("assetPage", itemIndex, 1) as number;
  const perPage = this.getNodeParameter(
    "assetPerPage",
    itemIndex,
    25,
  ) as number;

  try {
    const result = await listAssets(client, spaceId, {
      search: search || undefined,
      inFolder: folderId || undefined,
      page,
      perPage,
    });

    return {
      assets: result,
      total: (result as unknown[]).length,
      _meta: {
        operation: "listAssets",
        search: search || undefined,
        folderId: folderId || undefined,
        page,
        perPage,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new NodeApiError(this.getNode(), { message } as any, {
      message: `Failed to list assets: ${message}`,
      itemIndex,
    });
  }
}

async function executeListRecipes(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  const intent = this.getNodeParameter("recipeIntent", itemIndex, "") as string;
  const contentType = this.getNodeParameter(
    "recipeContentType",
    itemIndex,
    "",
  ) as string;
  const includeLivePatterns = this.getNodeParameter(
    "recipeIncludeLivePatterns",
    itemIndex,
    false,
  ) as boolean;

  // Filter recipes by contentType if specified
  const recipes = sectionRecipesData.recipes || [];
  const pageTemplates = sectionRecipesData.pageTemplates || [];
  const antiPatterns = sectionRecipesData.antiPatterns || [];

  const filteredRecipes = contentType
    ? recipes.filter(
        (r: Record<string, unknown>) =>
          !r.contentType || r.contentType === contentType,
      )
    : recipes;

  const filteredTemplates = contentType
    ? pageTemplates.filter(
        (t: Record<string, unknown>) =>
          !t.contentType || t.contentType === contentType,
      )
    : pageTemplates;

  const filteredAntiPatterns = contentType
    ? antiPatterns.filter(
        (a: Record<string, unknown>) =>
          !a.contentType || a.contentType === contentType,
      )
    : antiPatterns;

  const result: Record<string, unknown> = {
    recipes: filteredRecipes,
    pageTemplates: filteredTemplates,
    antiPatterns: filteredAntiPatterns,
  };

  // Note: live patterns require analyzeContentPatterns which is not yet
  // available in n8n (planned for M11). For now, return a helpful message.
  if (includeLivePatterns) {
    result.livePatterns = {
      note: "Live pattern merging is not yet available in the n8n node. Use the MCP server's list_recipes tool with includePatterns=true, or use the Analyze Content Patterns operation (coming in a future release).",
    };
  }

  return {
    ...result,
    _meta: {
      operation: "listRecipes",
      intent: intent || undefined,
      contentType: contentType || undefined,
      recipesCount: (filteredRecipes as unknown[]).length,
      templatesCount: (filteredTemplates as unknown[]).length,
      antiPatternsCount: (filteredAntiPatterns as unknown[]).length,
      timestamp: new Date().toISOString(),
    },
  };
}

async function executeListIcons(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  return {
    icons: AVAILABLE_ICONS,
    count: AVAILABLE_ICONS.length,
    usage:
      "Use these identifiers for any icon field in component content (e.g. hero cta_icon, feature icon, contact-info icon)",
    _meta: {
      operation: "listIcons",
      timestamp: new Date().toISOString(),
    },
  };
}

async function executeEnsurePath(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  const storyblokCredentials = (await this.getCredentials(
    "storyblokApi",
    itemIndex,
  )) as unknown as StoryblokCredentials;

  const managementClient = getStoryblokManagementClient(storyblokCredentials);
  const contentClient = createContentClient({
    spaceId: storyblokCredentials.spaceId,
    apiToken: storyblokCredentials.apiToken,
  });
  const spaceId = storyblokCredentials.spaceId;

  const folderPath = this.getNodeParameter(
    "ensurePathValue",
    itemIndex,
  ) as string;

  try {
    const folderId = await ensurePath(
      managementClient,
      contentClient,
      spaceId,
      folderPath,
    );

    return {
      success: true,
      folderId,
      path: folderPath,
      _meta: {
        operation: "ensurePath",
        path: folderPath,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new NodeApiError(this.getNode(), { message } as any, {
      message: `Failed to ensure path "${folderPath}": ${message}`,
      itemIndex,
    });
  }
}

// ─── Theme execution ──────────────────────────────────────────────────

async function executeListThemes(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  const storyblokCredentials = (await this.getCredentials(
    "storyblokApi",
    itemIndex,
  )) as unknown as StoryblokCredentials;

  const contentClient = createContentClient({
    spaceId: storyblokCredentials.spaceId,
    apiToken: storyblokCredentials.apiToken,
  });

  try {
    const themes = await listThemes(contentClient);

    return {
      themes,
      total: themes.length,
      _meta: {
        operation: "listThemes",
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new NodeApiError(this.getNode(), { message } as any, {
      message: `Failed to list themes: ${message}`,
      itemIndex,
    });
  }
}

async function executeGetTheme(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  const storyblokCredentials = (await this.getCredentials(
    "storyblokApi",
    itemIndex,
  )) as unknown as StoryblokCredentials;

  const contentClient = createContentClient({
    spaceId: storyblokCredentials.spaceId,
    apiToken: storyblokCredentials.apiToken,
  });

  const slugOrUuid = this.getNodeParameter(
    "themeSlugOrUuid",
    itemIndex,
  ) as string;

  try {
    const theme = await getTheme(contentClient, slugOrUuid);

    if (!theme) {
      throw new Error(`Theme not found: ${slugOrUuid}`);
    }

    return {
      ...theme,
      _meta: {
        operation: "getTheme",
        slugOrUuid,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new NodeApiError(this.getNode(), { message } as any, {
      message: `Failed to get theme "${slugOrUuid}": ${message}`,
      itemIndex,
    });
  }
}

async function executeApplyTheme(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  const storyblokCredentials = (await this.getCredentials(
    "storyblokApi",
    itemIndex,
  )) as unknown as StoryblokCredentials;

  const managementClient = getStoryblokManagementClient(storyblokCredentials);
  const spaceId = storyblokCredentials.spaceId;

  const storyId = this.getNodeParameter("applyStoryId", itemIndex) as string;
  const themeUuid = this.getNodeParameter(
    "applyThemeUuid",
    itemIndex,
  ) as string;
  const publish = this.getNodeParameter("applyPublish", itemIndex) as boolean;

  try {
    const result = await applyTheme(
      managementClient,
      spaceId,
      storyId,
      themeUuid,
      publish,
    );

    return {
      ...result,
      _meta: {
        operation: "applyTheme",
        storyId,
        themeUuid,
        published: publish,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new NodeApiError(this.getNode(), { message } as any, {
      message: `Failed to apply theme to story ${storyId}: ${message}`,
      itemIndex,
    });
  }
}

async function executeRemoveTheme(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  const storyblokCredentials = (await this.getCredentials(
    "storyblokApi",
    itemIndex,
  )) as unknown as StoryblokCredentials;

  const managementClient = getStoryblokManagementClient(storyblokCredentials);
  const spaceId = storyblokCredentials.spaceId;

  const storyId = this.getNodeParameter("removeStoryId", itemIndex) as string;
  const publish = this.getNodeParameter("removePublish", itemIndex) as boolean;

  try {
    const result = await removeTheme(
      managementClient,
      spaceId,
      storyId,
      publish,
    );

    return {
      ...result,
      _meta: {
        operation: "removeTheme",
        storyId,
        published: publish,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new NodeApiError(this.getNode(), { message } as any, {
      message: `Failed to remove theme from story ${storyId}: ${message}`,
      itemIndex,
    });
  }
}

async function executeCreateTheme(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  const storyblokCredentials = (await this.getCredentials(
    "storyblokApi",
    itemIndex,
  )) as unknown as StoryblokCredentials;

  const managementClient = getStoryblokManagementClient(storyblokCredentials);
  const contentClient = createContentClient({
    spaceId: storyblokCredentials.spaceId,
    apiToken: storyblokCredentials.apiToken,
  });
  const spaceId = storyblokCredentials.spaceId;

  const name = this.getNodeParameter("createThemeName", itemIndex) as string;
  const tokensJson = this.getNodeParameter(
    "createThemeTokens",
    itemIndex,
  ) as string;
  const publish = this.getNodeParameter("createPublish", itemIndex) as boolean;

  let tokens: Record<string, unknown>;
  try {
    tokens = JSON.parse(tokensJson);
  } catch {
    throw new NodeOperationError(
      this.getNode(),
      "createThemeTokens must be valid JSON",
      { itemIndex },
    );
  }

  try {
    const result = await createTheme(managementClient, contentClient, spaceId, {
      name,
      tokens,
      tokensToCss,
      publish,
    });

    return {
      ...result,
      _meta: {
        operation: "createTheme",
        name,
        published: publish,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new NodeApiError(this.getNode(), { message } as any, {
      message: `Failed to create theme "${name}": ${message}`,
      itemIndex,
    });
  }
}

async function executeUpdateTheme(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<Record<string, unknown>> {
  const storyblokCredentials = (await this.getCredentials(
    "storyblokApi",
    itemIndex,
  )) as unknown as StoryblokCredentials;

  const managementClient = getStoryblokManagementClient(storyblokCredentials);
  const contentClient = createContentClient({
    spaceId: storyblokCredentials.spaceId,
    apiToken: storyblokCredentials.apiToken,
  });
  const spaceId = storyblokCredentials.spaceId;

  const slugOrUuid = this.getNodeParameter(
    "updateThemeSlugOrUuid",
    itemIndex,
  ) as string;
  const tokensJson = this.getNodeParameter(
    "updateThemeTokens",
    itemIndex,
  ) as string;
  const publish = this.getNodeParameter("updatePublish", itemIndex) as boolean;

  let tokens: Record<string, unknown>;
  try {
    tokens = JSON.parse(tokensJson);
  } catch {
    throw new NodeOperationError(
      this.getNode(),
      "updateThemeTokens must be valid JSON",
      { itemIndex },
    );
  }

  try {
    const result = await updateTheme(managementClient, contentClient, spaceId, {
      slugOrUuid,
      tokens,
      tokensToCss,
      publish,
    });

    return {
      ...result,
      _meta: {
        operation: "updateTheme",
        slugOrUuid,
        published: publish,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new NodeApiError(this.getNode(), { message } as any, {
      message: `Failed to update theme "${slugOrUuid}": ${message}`,
      itemIndex,
    });
  }
}
