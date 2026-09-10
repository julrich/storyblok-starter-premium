/**
 * POST /api/prompter/import
 *
 * Imports generated sections into a Storyblok story by replacing the
 * Prompter component. Wraps `importByPrompterReplacement()` from shared
 * services with schema validation and optional asset upload.
 *
 * Request body (JSON):
 *   - storyUid (required): Story UID (numeric ID or UUID)
 *   - prompterUid (required): _uid of the Prompter blok to replace
 *   - sections (required): Array of section objects to insert
 *   - contentType (optional): Content type for validation (default: "page")
 *   - publish (optional): Publish after import (default: false)
 *   - uploadAssets (optional): Upload external images to Storyblok (default: false)
 *   - assetFolderName (optional): Storyblok asset folder name (default: "AI Generated")
 */
import type { NextApiRequest, NextApiResponse } from "next";
import {
  importByPrompterReplacement,
  validateSections,
  formatValidationErrors,
  checkCompositionalQuality,
  ensureSubItemComponents,
} from "@kickstartds/storyblok-services";
import {
  corsPOST,
  getRegistry,
  getStoryblokManagementClient,
  handleError,
} from "./_helpers";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await corsPOST(req, res);

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const {
      storyUid,
      prompterUid,
      sections,
      contentType = "page",
      publish = false,
      uploadAssets = false,
      assetFolderName,
    } = body;

    if (!storyUid) {
      return res.status(400).json({ error: "storyUid is required" });
    }
    if (!prompterUid) {
      return res.status(400).json({ error: "prompterUid is required" });
    }
    if (!sections || !Array.isArray(sections)) {
      return res
        .status(400)
        .json({ error: "sections is required and must be an array" });
    }

    // Validate sections against the Design System schema
    const registry = getRegistry();
    const entry = registry.has(contentType)
      ? registry.get(contentType)
      : registry.page;

    // Inject missing `component` fields on sub-items in monomorphic slots
    if (entry.rules.containerSlots?.size) {
      const rootArrayField = entry.rules.rootArrayFields[0] || "section";
      ensureSubItemComponents(
        sections,
        entry.rules.containerSlots,
        rootArrayField
      );
    }

    const validationResult = validateSections(sections, entry.rules);
    if (!validationResult.valid) {
      return res.status(400).json({
        error: "Content validation failed",
        details: formatValidationErrors(validationResult.errors),
      });
    }

    // Check compositional quality (non-blocking warnings)
    const warnings = checkCompositionalQuality(sections, entry.rules);

    // Import sections by replacing the Prompter component
    const { client, spaceId } = getStoryblokManagementClient();

    const story = await importByPrompterReplacement(client, spaceId, {
      storyUid,
      prompterUid,
      sections,
      publish,
      uploadAssets,
      assetFolderName,
    });

    return res.status(200).json({
      story,
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (err) {
    return handleError(res, err);
  }
}
