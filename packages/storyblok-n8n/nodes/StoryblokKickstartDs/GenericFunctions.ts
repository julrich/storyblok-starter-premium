/**
 * Generic helper functions for the Storyblok kickstartDS n8n node.
 *
 * Core Storyblok and OpenAI logic is delegated to `@kickstartds/storyblok-services`.
 * This file re-exports the shared functions and adds n8n-specific concerns
 * (credential types, preset schema loading, content transforms).
 */
import {
  createStoryblokClient,
  getStoryManagement,
  importByPrompterReplacement,
  importAtPosition,
  createOpenAiClient,
  generateStructuredContent,
  prepareSchemaForOpenAi,
  getComponentPresetSchema,
  listAvailableComponents,
  processOpenAiResponse,
  processForStoryblok,
  ensureSubItemComponents,
  generateAndPrepareContent,
  buildValidationRules,
  validateSections,
  formatValidationErrors,
  checkCompositionalQuality,
  createRegistryFromSchemaDir,
  // Story CRUD + search shared functions
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
  // Convenience update shared functions
  replaceSection,
  updateSeo,
  // Component & asset introspection shared functions
  listComponents,
  getComponent,
  listAssets,
  // Scraping shared functions
  scrapeUrl,
  // Content pattern analysis
  analyzeContentPatterns,
  // Root field & SEO generation
  generateRootFieldContent,
  generateSeoContent,
  getRootFieldSchema,
  // Field-level guidance
  assembleFieldGuidance,
  // Theme management
  listThemes,
  getTheme,
  applyTheme,
  removeTheme,
  previewThemeCSS,
  createTheme,
  updateTheme,
  isSystemTheme,
  // Prompt constants
  PLACEHOLDER_IMAGE_INSTRUCTIONS,
  type StoryblokCredentials,
  type OpenAiCredentials,
  type PrepareSchemaOptions,
  type ValidationRules,
  type SchemaRegistry,
  type ListStoriesOptions,
  type CreateStoryOptions,
  type CreatePageWithContentOptions,
  type UpdateStoryOptions,
  type ListAssetsOptions,
  type ReplaceSectionOptions,
  type UpdateSeoOptions,
  type ContentPatternAnalysis,
  type SubComponentStats,
  type AnalyzeContentPatternsOptions,
  type RootFieldMeta,
  type RootFieldPriority,
  type GenerateRootFieldOptions,
  type GenerateRootFieldResult,
  type GenerateSeoOptions,
  type GenerateSeoResult,
  type ThemeSummary,
  type ThemeDetail,
  type ApplyThemeResult,
  type CreateThemeResult,
  type UpdateThemeResult,
  type TokensToCssFn,
} from "@kickstartds/storyblok-services";
import type StoryblokClient from "storyblok-js-client";
import * as path from "path";
import * as fs from "fs";

// ─── Re-exports from shared library ──────────────────────────────────
// These are re-exported so the node and tests can import from one place.

export {
  createStoryblokClient as getStoryblokManagementClient,
  getStoryManagement,
  generateStructuredContent,
  prepareSchemaForOpenAi,
  getComponentPresetSchema,
  listAvailableComponents,
  processOpenAiResponse,
  processForStoryblok,
  generateAndPrepareContent,
  // Story CRUD + search
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
  // Component & asset introspection
  listComponents,
  getComponent,
  listAssets,
  // Scraping
  scrapeUrl,
  // Content pattern analysis
  analyzeContentPatterns,
  // Root field & SEO generation
  generateRootFieldContent,
  generateSeoContent,
  getRootFieldSchema,
  // Field-level guidance
  assembleFieldGuidance,
  // Convenience updates
  replaceSection,
  updateSeo,
  // Theme management
  listThemes,
  getTheme,
  applyTheme,
  removeTheme,
  previewThemeCSS,
  createTheme,
  updateTheme,
  isSystemTheme,
  // Validation & quality
  checkCompositionalQuality,
  // Prompt constants
  PLACEHOLDER_IMAGE_INSTRUCTIONS,
  type StoryblokCredentials,
  type OpenAiCredentials,
  type PrepareSchemaOptions,
  type ListStoriesOptions,
  type CreateStoryOptions,
  type CreatePageWithContentOptions,
  type UpdateStoryOptions,
  type ListAssetsOptions,
  type ReplaceSectionOptions,
  type UpdateSeoOptions,
  type ContentPatternAnalysis,
  type SubComponentStats,
  type RootFieldMeta,
  type RootFieldPriority,
  type GenerateRootFieldOptions,
  type GenerateRootFieldResult,
  type GenerateSeoOptions,
  type GenerateSeoResult,
  type ThemeSummary,
  type ThemeDetail,
  type ApplyThemeResult,
  type CreateThemeResult,
  type UpdateThemeResult,
  type TokensToCssFn,
};

export { createOpenAiClient as getOpenAiClient } from "@kickstartds/storyblok-services";

// ─── Schema Registry ─────────────────────────────────────────────────
// Load all content type schemas from the schemas directory and build
// a registry for multi-content-type validation support.

const schemasDir = path.join(__dirname, "schemas");
const registry: SchemaRegistry = createRegistryFromSchemaDir(schemasDir);

// Backward-compatible aliases
const PAGE_SCHEMA: Record<string, any> = registry.page.schema;
const PAGE_VALIDATION_RULES: ValidationRules = registry.page.rules;

export { PAGE_VALIDATION_RULES, registry };

// ─── n8n-facing wrappers ─────────────────────────────────────────────
// These preserve the original function signatures used by the node.

/**
 * Import content by replacing a prompter component.
 * Validates sections against the Design System schema before writing.
 * Delegates to `@kickstartds/storyblok-services`.
 */
export async function importContentIntoStory(
  client: StoryblokClient,
  spaceId: string,
  storyUid: string,
  prompterUid: string,
  sections: Record<string, unknown>[],
  publish: boolean,
  skipValidation = false,
  contentType = "page",
): Promise<Record<string, any>> {
  const rules = registry.has(contentType)
    ? registry.get(contentType).rules
    : PAGE_VALIDATION_RULES;

  // Inject missing `component` fields on sub-items in monomorphic slots
  if (rules.containerSlots?.size) {
    const rootArrayField = rules.rootArrayFields[0] || "section";
    ensureSubItemComponents(
      sections as Record<string, any>[],
      rules.containerSlots,
      rootArrayField,
    );
  }

  if (!skipValidation) {
    const result = validateSections(sections, rules);
    if (!result.valid) {
      throw new Error(formatValidationErrors(result.errors));
    }
  }

  return importByPrompterReplacement(client as any, spaceId, {
    storyUid,
    prompterUid,
    sections,
    publish,
  });
}

/**
 * Insert content at a specific position (no prompter needed).
 * Validates sections against the Design System schema before writing.
 * Delegates to `@kickstartds/storyblok-services`.
 */
export async function insertContentAtPosition(
  client: StoryblokClient,
  spaceId: string,
  storyUid: string,
  position: number,
  sections: Record<string, unknown>[],
  publish: boolean,
  skipValidation = false,
  contentType = "page",
): Promise<Record<string, any>> {
  const rules = registry.has(contentType)
    ? registry.get(contentType).rules
    : PAGE_VALIDATION_RULES;

  // Inject missing `component` fields on sub-items in monomorphic slots
  if (rules.containerSlots?.size) {
    const rootArrayField = rules.rootArrayFields[0] || "section";
    ensureSubItemComponents(
      sections as Record<string, any>[],
      rules.containerSlots,
      rootArrayField,
    );
  }

  if (!skipValidation) {
    const result = validateSections(sections, rules);
    if (!result.valid) {
      throw new Error(formatValidationErrors(result.errors));
    }
  }

  return importAtPosition(client as any, spaceId, {
    storyUid,
    position,
    sections,
    publish,
  });
}

// ─── Preset schemas (legacy, kept for backward compatibility) ─────────
// These static imports are retained so existing preset-based workflows
// continue to work. New "auto" mode uses the shared lib's schema
// preparation instead.

import heroSchema from "./schemas/hero.schema.json";
import faqSchema from "./schemas/faq.schema.json";
import testimonialsSchema from "./schemas/testimonials.schema.json";
import featuresSchema from "./schemas/features.schema.json";
import ctaSchema from "./schemas/cta.schema.json";
import textSchema from "./schemas/text.schema.json";
import blogTeaserSchema from "./schemas/blog-teaser.schema.json";
import statsSchema from "./schemas/stats.schema.json";
import imageTextSchema from "./schemas/image-text.schema.json";

export const PRESET_SCHEMAS: Record<
  string,
  { name: string; schema: Record<string, unknown> }
> = {
  hero: { name: "hero_section", schema: heroSchema },
  faq: { name: "faq_section", schema: faqSchema },
  testimonials: { name: "testimonials_section", schema: testimonialsSchema },
  features: { name: "features_section", schema: featuresSchema },
  cta: { name: "cta_section", schema: ctaSchema },
  text: { name: "text_section", schema: textSchema },
  "blog-teaser": { name: "blog_teaser", schema: blogTeaserSchema },
  stats: { name: "stats_section", schema: statsSchema },
  "image-text": { name: "image_text_section", schema: imageTextSchema },
};
