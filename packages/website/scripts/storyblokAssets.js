/**
 * storyblokAssets.js
 *
 * Shared helpers for uploading assets to Storyblok. Used by both
 * prepareProject.js (init) and syncPresetImages.js (incremental sync).
 */

const fs = require("node:fs");
const path = require("node:path");
const FormData = require("form-data");
const sizeOf = require("image-size");

/**
 * Upload a file to a pre-signed S3 URL from Storyblok.
 */
const upload = (signed_request, filePath) =>
  new Promise((resolve, reject) => {
    const form = new FormData();
    for (const key in signed_request.fields) {
      form.append(key, signed_request.fields[key]);
    }
    form.append("file", fs.createReadStream(filePath));
    form.submit(signed_request.post_url, (err, res) => {
      if (err) reject(err);
      return resolve(res);
    });
  });

/**
 * Upload a file from the design system's static dist directory to Storyblok.
 *
 * @param {object} storyblok - StoryblokClient instance
 * @param {string} spaceId - Storyblok space ID
 * @param {string} fileName - Relative path inside dist/static/ (e.g. "img/screenshots/foo.png")
 * @param {number|null} assetFolderId - Target asset folder ID, or null
 * @param {object} [options]
 * @param {Function} [options.getSizeFn] - Custom size resolver (for video files). Receives fullPath, returns "WxH" string.
 * @returns {Promise<{id: number, url: string}>}
 */
const signedUpload = async (
  storyblok,
  spaceId,
  fileName,
  assetFolderId,
  options = {},
) => {
  const fullPath = path.join(
    "node_modules/@kickstartds/design-system/dist/static",
    fileName,
  );
  if (!fs.existsSync(fullPath)) {
    console.log(`  skip (not found): ${fileName}`);
    return { id: 0, url: "" };
  }

  // Skip video files — Storyblok space may not allow them
  if (fileName.endsWith(".mp4")) {
    console.log(`  skip (mp4 not supported): ${fileName}`);
    return { id: 0, url: "" };
  }

  let size;
  if (options.getSizeFn) {
    size = await options.getSizeFn(fullPath);
  } else {
    const dimensions = sizeOf(fullPath);
    size = `${dimensions.width}x${dimensions.height}`;
  }

  const assetResponse = await storyblok.post(`spaces/${spaceId}/assets/`, {
    filename: fileName,
    size,
    asset_folder_id: assetFolderId || null,
  });

  await upload(assetResponse.data, fullPath);

  return {
    id: assetResponse.data.id,
    url: assetResponse.data.pretty_url,
  };
};

/**
 * Get an existing asset folder by name, or create it if it doesn't exist.
 *
 * @param {object} storyblok - StoryblokClient instance
 * @param {string} spaceId - Storyblok space ID
 * @param {string} folderName - Asset folder name
 * @returns {Promise<number>} folder ID
 */
const getOrCreateAssetFolder = async (storyblok, spaceId, folderName) => {
  const foldersRes = await storyblok.get(`spaces/${spaceId}/asset_folders/`);
  const existing = (foldersRes.data?.asset_folders || []).find(
    (f) => f.name === folderName,
  );
  if (existing) return existing.id;

  const created = await storyblok.post(`spaces/${spaceId}/asset_folders/`, {
    asset_folder: { name: folderName },
  });
  return created.data.asset_folder.id;
};

module.exports = {
  upload,
  signedUpload,
  getOrCreateAssetFolder,
};
