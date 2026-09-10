/**
 * syncPresetImages.js
 *
 * Syncs preset screenshot images to Storyblok:
 *   1. Reads merged presets (which have local image paths like "img/screenshots/...")
 *   2. Fetches existing presets from the Storyblok space
 *   3. Uploads missing screenshots to a "Component Screenshots" asset folder
 *   4. Updates each preset's `image` field via the Management API
 *
 * Also uploads any content images (img/*, /logo.svg) referenced inside preset
 * args to a "Demo Content" asset folder — so preset previews render correctly.
 *
 * Usage:
 *   dotenvx run -f .env.local -- node scripts/syncPresetImages.js
 *
 * Requires: NEXT_STORYBLOK_SPACE_ID, NEXT_STORYBLOK_OAUTH_TOKEN
 */

const fs = require("node:fs");
const path = require("node:path");
const StoryblokClient = require("storyblok-js-client");
const PromiseThrottle = require("promise-throttle");
const { traverse } = require("object-traversal");
const { signedUpload, getOrCreateAssetFolder } = require("./storyblokAssets");

require("@dotenvx/dotenvx").config({ path: ".env.local" });

if (!process.env.NEXT_STORYBLOK_SPACE_ID)
  throw new Error("Missing NEXT_STORYBLOK_SPACE_ID env variable");
if (!process.env.NEXT_STORYBLOK_OAUTH_TOKEN)
  throw new Error("Missing NEXT_STORYBLOK_OAUTH_TOKEN env variable");

const SPACE_ID = process.env.NEXT_STORYBLOK_SPACE_ID;
const SCREENSHOT_FOLDER_NAME = "Component Screenshots";
const DEMO_CONTENT_FOLDER_NAME = "Demo Content";

const Storyblok = new StoryblokClient({
  oauthToken: process.env.NEXT_STORYBLOK_OAUTH_TOKEN,
});

const promiseThrottle = new PromiseThrottle({
  requestsPerSecond: 2,
  promiseImplementation: Promise,
});

// ---------------------------------------------------------------------------
// Storyblok API helpers
// ---------------------------------------------------------------------------

const fetchAllPresets = async () => {
  const res = await Storyblok.get(`spaces/${SPACE_ID}/presets`);
  return res.data?.presets || [];
};

const fetchAllComponents = async () => {
  const res = await Storyblok.get(`spaces/${SPACE_ID}/components`);
  return res.data?.components || [];
};

const updatePreset = async (presetId, fields) =>
  Storyblok.put(`spaces/${SPACE_ID}/presets/${presetId}`, {
    preset: fields,
  });

const updateComponent = async (componentId, fields) =>
  Storyblok.put(`spaces/${SPACE_ID}/components/${componentId}`, {
    component: fields,
  });

const getOrCreateFolder = async (folderName) =>
  getOrCreateAssetFolder(Storyblok, SPACE_ID, folderName);

// ---------------------------------------------------------------------------
// Main sync logic
// ---------------------------------------------------------------------------

const sync = async () => {
  // 1. Read merged presets
  const mergedDir = path.join("cms", "merged", "components", SPACE_ID);
  const presetsPath = path.join(mergedDir, "presets.json");
  if (!fs.existsSync(presetsPath)) {
    console.error(
      `No merged presets found at ${presetsPath}. Run update-storyblok-config first.`,
    );
    process.exit(1);
  }
  const localPresets = JSON.parse(fs.readFileSync(presetsPath, "utf-8"));
  console.log(
    `Loaded ${localPresets.length} local presets from ${presetsPath}`,
  );

  // 2. Fetch live presets and components from Storyblok
  console.log("Fetching live presets from Storyblok...");
  const livePresets = await fetchAllPresets();
  console.log(`  Found ${livePresets.length} live presets`);

  console.log("Fetching live components from Storyblok...");
  const liveComponents = await fetchAllComponents();
  console.log(`  Found ${liveComponents.length} live components`);

  // Build live preset lookup by name+component
  const liveByKey = new Map();
  for (const lp of livePresets) {
    const componentName =
      lp.preset && typeof lp.preset === "object"
        ? lp.preset.component
        : undefined;
    const key = `${componentName}:${lp.name}`;
    liveByKey.set(key, lp);
  }

  // 3. Determine which presets need image uploads
  const imageCache = new Map(); // local path → Storyblok CDN URL
  let screenshotFolderId = null;
  let demoContentFolderId = null;

  const needsUpload = [];
  for (const local of localPresets) {
    const componentName =
      local.preset && typeof local.preset === "object"
        ? local.preset.component
        : undefined;
    const key = `${componentName}:${local.name}`;
    const live = liveByKey.get(key);

    if (!live) continue; // preset not in Storyblok yet (will be pushed next time)

    // Check if the screenshot image needs uploading
    const localImage = local.image || "";
    const isLocalPath =
      localImage &&
      !localImage.startsWith("http") &&
      !localImage.startsWith("//");
    const liveHasImage = live.image && live.image.startsWith("http");

    if (isLocalPath && !liveHasImage) {
      needsUpload.push({ local, live });
    }
  }

  console.log(
    `\n${needsUpload.length} presets need screenshot uploads (${localPresets.length - needsUpload.length} already have images or are not live yet)`,
  );

  // 4. Ensure asset folders exist
  if (needsUpload.length > 0) {
    console.log("\nEnsuring asset folders...");
    screenshotFolderId = await getOrCreateFolder(SCREENSHOT_FOLDER_NAME);
    console.log(`  ${SCREENSHOT_FOLDER_NAME}: folder ${screenshotFolderId}`);
  }

  // 5. Upload screenshots and update presets
  let uploaded = 0;
  let skipped = 0;

  for (let i = 0; i < needsUpload.length; i++) {
    const { local, live } = needsUpload[i];
    const localImage = local.image;
    const label = `${local.name} (${local.preset?.component})`;

    process.stdout.write(`  [${i + 1}/${needsUpload.length}] ${label}...`);

    // Upload (or reuse cached URL)
    if (!imageCache.has(localImage)) {
      const result = await promiseThrottle.add(
        signedUpload.bind(
          null,
          Storyblok,
          SPACE_ID,
          localImage,
          screenshotFolderId,
        ),
      );
      imageCache.set(localImage, result.url);
    }

    const cdnUrl = imageCache.get(localImage);
    if (!cdnUrl) {
      console.log(" skipped (not found)");
      skipped++;
      continue;
    }

    // Update the preset's image in Storyblok
    await promiseThrottle.add(
      updatePreset.bind(null, live.id, { image: cdnUrl }),
    );
    uploaded++;
    console.log(" ✓");
  }

  // 6. Sync content images inside preset args
  //    Find all local image paths in preset data and upload them
  const contentImages = [];
  for (const local of localPresets) {
    traverse(local.preset, ({ parent, key, value, meta }) => {
      if (
        value &&
        typeof value === "string" &&
        (value.startsWith("img/") || value === "/logo.svg") &&
        !value.startsWith("http")
      ) {
        contentImages.push({ parent, key, value, presetName: local.name });
      }
    });
  }

  if (contentImages.length > 0) {
    if (!demoContentFolderId) {
      demoContentFolderId = await getOrCreateFolder(DEMO_CONTENT_FOLDER_NAME);
    }

    const uniqueContentImages = [
      ...new Set(contentImages.map((ci) => ci.value)),
    ];
    console.log(
      `\nUploading ${uniqueContentImages.length} unique content images...`,
    );

    for (let i = 0; i < uniqueContentImages.length; i++) {
      const imagePath = uniqueContentImages[i];
      process.stdout.write(
        `  [${i + 1}/${uniqueContentImages.length}] ${imagePath}...`,
      );
      if (!imageCache.has(imagePath)) {
        const result = await promiseThrottle.add(
          signedUpload.bind(
            null,
            Storyblok,
            SPACE_ID,
            imagePath,
            demoContentFolderId,
          ),
        );
        imageCache.set(imagePath, result.url);
        console.log(result.url ? " ✓" : " skipped");
      } else {
        console.log(" cached");
      }
    }

    // Now update preset args in live presets with the CDN URLs
    let contentUpdated = 0;
    for (const local of localPresets) {
      const componentName = local.preset?.component;
      const key = `${componentName}:${local.name}`;
      const live = liveByKey.get(key);
      if (!live) continue;

      // Check if any content image paths exist in this preset's live data
      let hasLocalImages = false;
      traverse(live.preset, ({ value }) => {
        if (
          value &&
          typeof value === "string" &&
          (value.startsWith("img/") || value === "/logo.svg")
        ) {
          hasLocalImages = true;
        }
      });

      if (!hasLocalImages) continue;

      // Replace local paths with CDN URLs in a copy of the live preset data
      const updatedPreset = JSON.parse(JSON.stringify(live.preset));
      traverse(updatedPreset, ({ parent, key: propKey, value }) => {
        if (value && typeof value === "string" && imageCache.has(value)) {
          parent[propKey] = imageCache.get(value);
        }
      });

      await promiseThrottle.add(
        updatePreset.bind(null, live.id, { preset: updatedPreset }),
      );
      contentUpdated++;
    }

    if (contentUpdated > 0) {
      console.log(`  Updated content images in ${contentUpdated} presets`);
    }
  }

  // 7. Sync component images (set each component's image to its first preset screenshot)
  console.log("\nSyncing component preview images...");
  const liveComponentsByName = new Map();
  for (const comp of liveComponents) {
    liveComponentsByName.set(comp.name, comp);
  }

  // Build a map: componentName → first preset screenshot CDN URL
  const componentImageMap = new Map();
  for (const lp of livePresets) {
    const componentName = lp.preset?.component;
    if (!componentName || componentImageMap.has(componentName)) continue;
    if (lp.image && lp.image.startsWith("http")) {
      componentImageMap.set(componentName, lp.image);
    }
  }
  // Also check freshly-uploaded screenshots from this run
  for (const { local } of needsUpload) {
    const componentName = local.preset?.component;
    if (!componentName || componentImageMap.has(componentName)) continue;
    const cdnUrl = imageCache.get(local.image);
    if (cdnUrl) componentImageMap.set(componentName, cdnUrl);
  }

  let componentImagesUpdated = 0;
  const componentEntries = [...componentImageMap.entries()];
  for (let i = 0; i < componentEntries.length; i++) {
    const [componentName, imageUrl] = componentEntries[i];
    const comp = liveComponentsByName.get(componentName);
    if (!comp) continue;

    // Skip if the component already has this image
    if (comp.image === imageUrl) continue;

    process.stdout.write(
      `  [${i + 1}/${componentEntries.length}] ${componentName}...`,
    );
    await promiseThrottle.add(
      updateComponent.bind(null, comp.id, { image: imageUrl }),
    );
    componentImagesUpdated++;
    console.log(" ✓");
  }
  console.log(`  Updated ${componentImagesUpdated} component images`);

  // Summary
  console.log("\n--- Summary ---");
  console.log(`  Screenshots uploaded: ${uploaded}`);
  console.log(`  Screenshots skipped:  ${skipped}`);
  console.log(`  Content images:       ${imageCache.size}`);
  console.log(`  Component images:     ${componentImagesUpdated}`);
  console.log("Done!");
};

sync()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Sync failed:", err);
    process.exit(1);
  });
