/**
 * @kickstartds/storyblok-services
 *
 * Shared Storyblok CMS and OpenAI content generation services.
 * Used by: Next.js API routes, MCP server, n8n community nodes.
 */

// ─── Types & errors ───────────────────────────────────────────────────
export type {
  StoryblokCredentials,
  OpenAiCredentials,
  PageContent,
  GenerateContentOptions,
  ImportByPrompterOptions,
  ImportAtPositionOptions,
  ReplaceSectionOptions,
  UpdateSeoOptions,
  ListStoriesOptions,
  CreateStoryOptions,
  CreatePageWithContentOptions,
  UpdateStoryOptions,
  ListAssetsOptions,
} from "./types.js";

export {
  ServiceError,
  StoryblokApiError,
  OpenAiApiError,
  PrompterNotFoundError,
  ContentGenerationError,
} from "./types.js";

// ─── Storyblok services ──────────────────────────────────────────────
export {
  createStoryblokClient,
  getStoryManagement,
  saveStory,
  importByPrompterReplacement,
  importAtPosition,
  replaceSection,
  updateSeo,
} from "./storyblok.js";

// ─── OpenAI services ─────────────────────────────────────────────────
export { createOpenAiClient, generateStructuredContent } from "./openai.js";

// ─── Schema preparation ──────────────────────────────────────────────
export {
  prepareSchemaForOpenAi,
  getComponentPresetSchema,
  getRootFieldSchema,
  listAvailableComponents,
  getSchemaName,
  UNSUPPORTED_KEYWORDS,
  DEFAULT_PROPERTIES_TO_DROP,
  PROPERTIES_TO_ANNOTATE,
  FIELD_ANNOTATIONS,
  SUPPORTED_COMPONENTS,
  SUB_COMPONENT_MAP,
} from "./schema.js";
export type {
  PrepareSchemaOptions,
  OpenAiSchemaEnvelope,
  SchemaValidation,
  PreparedSchema,
} from "./schema.js";

// ─── Content transformation ──────────────────────────────────────────
export {
  processOpenAiResponse,
  processForStoryblok,
  flattenNestedObjects,
  unflattenNestedObjects,
  injectRootFieldComponentTypes,
  ensureSubItemComponents,
  ensureRootFieldBloks,
} from "./transform.js";
export type { TransformedContent } from "./transform.js";

// ─── Asset management ────────────────────────────────────────────────
export {
  uploadAndReplaceAssets,
  findImageUrls,
  defaultIsImageUrl,
  stripStoryblokImageService,
  createAssetObject,
  wrapAssetUrls,
  normalizeAssetFieldNames,
} from "./assets.js";
export type {
  UploadAssetsOptions,
  UploadAssetsSummary,
  UploadedAsset,
} from "./assets.js";

// ─── Pipeline (high-level orchestrator) ──────────────────────────────
export {
  generateAndPrepareContent,
  generateRootFieldContent,
  generateSeoContent,
  PLACEHOLDER_IMAGE_INSTRUCTIONS,
} from "./pipeline.js";
export type {
  GenerateAndPrepareOptions,
  GenerateAndPrepareResult,
  GenerateRootFieldOptions,
  GenerateRootFieldResult,
  GenerateSeoOptions,
  GenerateSeoResult,
} from "./pipeline.js";

// ─── Schema validation ──────────────────────────────────────────────
export {
  buildValidationRules,
  validateContent,
  validateSections,
  validatePageContent,
  formatValidationErrors,
  checkCompositionalQuality,
} from "./validate.js";
export type {
  ValidationRules,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidateContentOptions,
  ContainerSlot,
} from "./validate.js";

// ─── Schema Registry ────────────────────────────────────────────────
export {
  SchemaRegistry,
  createRegistryFromDirectory,
  createRegistryFromSchemaDir,
  ROOT_CONTENT_TYPES,
} from "./registry.js";
export type {
  ContentTypeEntry,
  RootContentType,
  RootFieldMeta,
  RootFieldPriority,
} from "./registry.js";

// ─── Story CRUD & search ────────────────────────────────────────────
export {
  createContentClient,
  listStories,
  searchStories,
  findBySlug,
  createStory,
  createPageWithContent,
  updateStory,
  deleteStory,
  ensurePath,
  ensureUids,
  stripEmptyAssetFields,
  stripInternalAnnotations,
  stripEmptyAssets,
} from "./stories.js";

// ─── Component & asset introspection ────────────────────────────────
export { listComponents, getComponent, listAssets } from "./components.js";

// ─── URL scraping ───────────────────────────────────────────────────
export { scrapeUrl, pickBestFromSrcset } from "./scrape.js";
export type {
  ScrapedImage,
  ScrapeUrlOptions,
  ScrapeUrlResult,
} from "./scrape.js";

// ─── Content pattern analysis ───────────────────────────────────────
export { analyzeContentPatterns } from "./patterns.js";
export type {
  ContentPatternAnalysis,
  SubComponentStats,
  AnalyzeContentPatternsOptions,
} from "./patterns.js";

// ─── Field-level compositional guidance ─────────────────────────────
export {
  discoverStylisticFields,
  discoverPresenceFields,
  computeFieldDistribution,
  pruneFieldProfiles,
  assembleFieldGuidance,
} from "./guidance.js";
export type {
  StylisticFieldSpec,
  PresenceFieldSpec,
  FieldDistribution,
  FieldProfile,
  FieldProfileContext,
  SectionRecipe,
  SectionRecipes,
  PruneOptions,
  AssembleFieldGuidanceOptions,
} from "./guidance.js";

// ─── Page planning ──────────────────────────────────────────────────
export { planPageContent, formatPatternsContext } from "./plan.js";
export type {
  PlanPageOptions,
  PlanPageResult,
  PagePlan,
  PlannedSection,
  PlannedRootField,
  PlannedField,
} from "./plan.js";

// ─── Section generation ─────────────────────────────────────────────
export { generateSectionContent } from "./generate-section.js";
export type {
  GenerateSectionOptions,
  GenerateSectionResult,
} from "./generate-section.js";

// ─── Content audit ──────────────────────────────────────────────────
export { runContentAudit } from "./audit.js";
export type {
  AuditConfig,
  AuditFinding,
  AuditResults,
  AuditSummary,
  CategorySummary,
  FindingCategory,
  FindingSeverity,
  RunAuditOptions,
} from "./audit.js";

// ─── Theme management ──────────────────────────────────────────────
export {
  listThemes,
  getTheme,
  applyTheme,
  removeTheme,
  previewThemeCSS,
  createTheme,
  updateTheme,
  isSystemTheme,
} from "./themes.js";
export type {
  ThemeSummary,
  ThemeDetail,
  ApplyThemeResult,
  CreateThemeResult,
  UpdateThemeResult,
  TokensToCssFn,
  ComponentTokensToCssFn,
} from "./themes.js";
