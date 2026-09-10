const fs = require("node:fs");
const path = require("node:path");
const PromiseThrottle = require("promise-throttle");
const { traverse } = require("object-traversal");
const StoryblokClient = require("storyblok-js-client");
const { v4: uuidv4 } = require("uuid");
const generatedComponents = require("../cms/components.123456.json");
const initialStory = require("../resources/story.json");
const ffprobe = require("ffprobe");
const ffprobeStatic = require("ffprobe-static");
const { generatePresets } = require("./generatePresets");
const { signedUpload, getOrCreateAssetFolder } = require("./storyblokAssets");

require("@dotenvx/dotenvx").config({ path: ".env.local" });

if (!process.env.NEXT_STORYBLOK_SPACE_ID)
  throw new Error("Missing NEXT_STORYBLOK_SPACE_ID env variable");
if (!process.env.NEXT_STORYBLOK_OAUTH_TOKEN)
  throw new Error("Missing NEXT_STORYBLOK_OAUTH_TOKEN env variable");

/** Configuration */
const componentScreenshotAssetFolderName = "Component Screenshots";
const demoContentAssetFolderName = "Demo Content";

const Storyblok = new StoryblokClient({
  oauthToken: process.env.NEXT_STORYBLOK_OAUTH_TOKEN,
});

const SPACE_ID = process.env.NEXT_STORYBLOK_SPACE_ID;

let presets = {};
const images = new Map();
const promiseThrottle = new PromiseThrottle({
  requestsPerSecond: 2,
  promiseImplementation: Promise,
});

/** Custom size resolver that handles video files via ffprobe */
const getSizeFn = async (fullPath) => {
  if (fullPath.includes("mp4")) {
    const probe = await ffprobe(fullPath, { path: ffprobeStatic.path });
    return `${probe.streams[0].width}x${probe.streams[0].height}`;
  }
  return undefined; // fall through to default image-size
};

const uploadAsset = (fileName, assetFolderId) => {
  console.log("uploading: ", fileName);
  return signedUpload(Storyblok, SPACE_ID, fileName, assetFolderId, {
    getSizeFn: async (fullPath) => {
      const result = await getSizeFn(fullPath);
      return result; // undefined makes signedUpload use image-size
    },
  });
};

const getAssetsForFolder = async (folderId) =>
  Storyblok.get(
    `spaces/${SPACE_ID}/assets?per_page=100&page=1&in_folder=${folderId}`,
  );

const deleteAsset = async (assetId) =>
  Storyblok.delete(`spaces/${SPACE_ID}/assets/${assetId}`);

const deleteAssetFolder = async (folderId) =>
  Storyblok.delete(`spaces/${SPACE_ID}/asset_folders/${folderId}`);

const deleteStory = async (storyId) =>
  Storyblok.delete(`spaces/${SPACE_ID}/stories/${storyId}`);

const deleteComponent = async (componentId) =>
  Storyblok.delete(`spaces/${SPACE_ID}/components/${componentId}`);

const updateComponent = async (componentId, componentDefinition) =>
  Storyblok.put(
    `spaces/${SPACE_ID}/components/${componentId}`,
    componentDefinition,
  );

const prepare = async () => {
  try {
    // Clean up default content in space
    const stories = (await Storyblok.get(`spaces/${SPACE_ID}/stories/`)).data
      ?.stories;
    const defaultStory = stories.find(
      (story) => story.name === "Home" && story.slug === "home",
    );
    if (defaultStory) {
      await promiseThrottle.add(deleteStory.bind(this, defaultStory.id));
    } else {
      console.log(
        "Project already prepared, not running preparation script again.",
      );
      process.exit(1);
    }

    const components = (await Storyblok.get(`spaces/${SPACE_ID}/components/`))
      .data?.components;

    const defaultComponents = components.filter((component) =>
      ["feature", "grid", "teaser"].includes(component.name),
    );
    const defaultPageComponent = components.filter(
      (component) => component.name === "page",
    );

    await promiseThrottle.add(
      updateComponent.bind(
        this,
        defaultPageComponent[0].id,
        generatedComponents.components.find(
          (component) => component.name === "page",
        ),
      ),
    );

    for (const defaultComponent of defaultComponents) {
      await promiseThrottle.add(
        deleteComponent.bind(this, defaultComponent.id),
      );
    }

    // Clean up already existing folders
    const assetFolders = (
      await Storyblok.get(`spaces/${SPACE_ID}/asset_folders/`)
    ).data?.asset_folders;

    const componentScreenshotFolders = assetFolders.filter(
      (assetFolder) => assetFolder.name === componentScreenshotAssetFolderName,
    );
    const demoContentFolders = assetFolders.filter(
      (assetFolder) => assetFolder.name === demoContentAssetFolderName,
    );

    for (const componentScreenshotFolder of componentScreenshotFolders) {
      // Clean up assets currently in folder first
      const { assets } = (
        await promiseThrottle.add(
          getAssetsForFolder.bind(this, componentScreenshotFolder.id),
        )
      ).data;

      for (const asset of assets) {
        await promiseThrottle.add(deleteAsset.bind(this, asset.id));
      }

      // ... and then delete the asset folder itself
      await promiseThrottle.add(
        deleteAssetFolder.bind(this, componentScreenshotFolder.id),
      );
    }

    for (const demoContentFolder of demoContentFolders) {
      // Clean up assets currently in folder first
      const { assets } = (
        await promiseThrottle.add(
          getAssetsForFolder.bind(this, demoContentFolder.id),
        )
      ).data;

      for (const asset of assets) {
        await promiseThrottle.add(deleteAsset.bind(this, asset.id));
      }

      // ... and then delete the asset folder itself
      await promiseThrottle.add(
        deleteAssetFolder.bind(this, demoContentFolder.id),
      );
    }

    // Create new folders for assets to be uploaded
    const previewsFolderId = await getOrCreateAssetFolder(
      Storyblok,
      SPACE_ID,
      componentScreenshotAssetFolderName,
    );
    const demoFolderId = await getOrCreateAssetFolder(
      Storyblok,
      SPACE_ID,
      demoContentAssetFolderName,
    );

    // Generate presets (pure offline transformation)
    presets = generatePresets({ writeFile: false });

    // Upload screenshot images for each preset
    for (const preset of Object.values(presets)) {
      if (preset.image && !images.has(preset.image)) {
        const image = uploadAsset.bind(this, preset.image, previewsFolderId);
        images.set(preset.image, (await promiseThrottle.add(image)).url);
      }
      if (preset.image) {
        preset.image = images.get(preset.image) || preset.image;
      }
    }

    // Upload content images used in preset args
    const presetImages = [];
    traverse(presets, ({ parent, key, value }) => {
      if (
        value &&
        typeof value === "string" &&
        (value.startsWith("img/") || value === "/logo.svg")
      ) {
        presetImages.push({ parent, key, value });
      }
    });

    for (const presetImage of presetImages) {
      if (!images.has(presetImage.value)) {
        const image = uploadAsset.bind(this, presetImage.value, demoFolderId);
        images.set(presetImage.value, (await promiseThrottle.add(image)).url);
      }

      presetImage.parent[presetImage.key] = images.get(presetImage.value);
    }

    // Add preview for first (default) preset to component, too
    for (const generatedComponent of generatedComponents.components) {
      generatedComponent.image = Object.values(presets).find(
        (preset) => preset.preset.type === generatedComponent.name,
      )?.image;
    }

    // Find all images used in demo content...
    const initialImages = [];
    traverse(initialStory, ({ parent, key, value }) => {
      if (
        value &&
        typeof value === "string" &&
        (value.startsWith("img/") || value === "/logo.svg")
      ) {
        initialImages.push({ parent, key, value });
      }
    });

    // ... and lazily load them
    for (const initialImage of initialImages) {
      if (!images.has(initialImage.value)) {
        const image = uploadAsset.bind(this, initialImage.value, demoFolderId);
        images.set(initialImage.value, (await promiseThrottle.add(image)).url);
      }

      initialImage.parent[initialImage.key] = images.get(initialImage.value);
    }

    // Add demo content to space
    if (
      !stories.some(
        (story) => story.name === "Getting Started" && story.slug === "home",
      )
    ) {
      await Storyblok.post(`spaces/${SPACE_ID}/stories/`, {
        story: initialStory.story,
        publish: 1,
      });
    }

    const section = generatedComponents.components.find(
      (component) => component.name === "section",
    );

    generatedComponents.components.push({
      name: "global",
      display_name: "Global",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      id: 0,
      schema: {
        global: {
          id: 0,
          pos: 0,
          type: "bloks",
          restrict_type: "",
          restrict_components: true,
          component_whitelist: [
            ...section.schema.components.component_whitelist,
          ],
        },
      },
      is_root: true,
      is_nestable: false,
      real_name: "Global",
    });

    const globalReferenceUuid = uuidv4();
    generatedComponents.components.push({
      name: "global_reference",
      display_name: "Global Reference",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      id: 0,
      schema: {
        reference: {
          type: "options",
          pos: 0,
          is_reference_type: true,
          source: "internal_stories",
          entry_appearance: "card",
          allow_advanced_search: true,
          folder_slug: "global/",
        },
      },
      is_nestable: true,
      real_name: "Global Rereference",
      component_group_uuid: globalReferenceUuid,
      component_group_name: "Global",
    });

    section.schema.components.component_whitelist.push("global_reference");

    // Write output in v4 format (bare arrays) directly to the push path
    const spaceId = SPACE_ID;
    const outputDir = path.join("cms", "merged", "components", spaceId);
    fs.mkdirSync(outputDir, { recursive: true });

    const componentsList = generatedComponents.components;

    // Build groups.json from component_group_name/uuid references
    const groupMap = new Map();
    for (const comp of componentsList) {
      if (comp.component_group_uuid && comp.component_group_name) {
        groupMap.set(comp.component_group_uuid, {
          name: comp.component_group_name,
          id: 0,
          uuid: comp.component_group_uuid,
          parent_id: null,
          parent_uuid: null,
        });
      }
    }

    // Write components as bare array (v4 format)
    fs.writeFileSync(
      path.join(outputDir, "components.json"),
      JSON.stringify(componentsList, null, 2),
    );

    // Write groups as bare array (v4 format)
    fs.writeFileSync(
      path.join(outputDir, "groups.json"),
      JSON.stringify([...groupMap.values()], null, 2),
    );

    // Write presets as bare array (v4 format)
    fs.writeFileSync(
      path.join(outputDir, "presets.json"),
      JSON.stringify([...Object.values(presets)], null, 2),
    );
  } catch (error) {
    console.error(
      "There was an error generating the presets",
      JSON.stringify(error, null, 2),
    );
  }
};

prepare();
