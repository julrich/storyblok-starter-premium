/**
 * generatePresets.js
 *
 * Pure offline preset generation: reads design system presets and generated
 * Storyblok component schemas, transforms preset args into Storyblok format
 * (adds _uid / component typing for bloks fields, flattens nested objects,
 * strips unknown properties), and writes presets.123456.json.
 *
 * No API calls, no asset uploads — image paths stay local.
 *
 * Usage:
 *   node scripts/generatePresets.js
 *
 * Also importable:
 *   const { generatePresets } = require("./generatePresets");
 *   const presets = generatePresets();
 */

const fs = require("node:fs");
const path = require("node:path");
const { traverse } = require("object-traversal");
const { v4: uuidv4 } = require("uuid");
const jsonpointer = require("jsonpointer");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const presetIdToComponentName = (id) =>
  id
    .split("--")
    .shift()
    .split("-")
    .slice(1)
    .join("-")
    .replaceAll("archetypes-", "");

const groupToComponentName = (name) => name.split("/").pop().trim();

// ---------------------------------------------------------------------------
// Core generation
// ---------------------------------------------------------------------------

/**
 * Generate Storyblok presets from design system presets.
 *
 * @param {object} [options]
 * @param {string} [options.componentsPath] - Path to generated components JSON
 * @param {string} [options.outputPath]     - Path to write presets JSON
 * @param {boolean} [options.writeFile=true] - Whether to write the output file
 * @returns {Record<string, object>} presets keyed by preset ID
 */
function generatePresets(options = {}) {
  const {
    componentsPath = path.join(
      __dirname,
      "..",
      "cms",
      "components.123456.json",
    ),
    outputPath = path.join(__dirname, "..", "cms", "presets.123456.json"),
    writeFile = true,
  } = options;

  const designSystemPresets = require("@kickstartds/design-system/presets.json");

  const generatedRaw = JSON.parse(fs.readFileSync(componentsPath, "utf-8"));
  const componentsList = generatedRaw.components || generatedRaw;

  const presets = {};
  let nextPresetId = 1;

  // -- Step 1: Create preset structures ------------------------------------

  for (const preset of designSystemPresets) {
    const matchedComponent = componentsList.find(
      (component) =>
        component.display_name?.trim() === groupToComponentName(preset.group),
    );

    if (!matchedComponent) continue;

    const componentKey = presetIdToComponentName(preset.id);

    presets[preset.id] = {
      id: nextPresetId++,
      name: preset.name,
      preset: {
        _uid: uuidv4(),
        component: componentKey,
        ...preset.args,
      },
      component_id: matchedComponent.id || 0,
      space_id: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      color: "",
      icon: "",
      description: "",
      image: preset.screenshot || "",
    };
  }

  // -- Step 2: Add Storyblok component typing, flatten, clean ---------------

  for (const [presetId, preset] of Object.entries(presets)) {
    if (presetId.includes("layout-split")) continue;

    const component = componentsList.find(
      (c) => c.name === presetIdToComponentName(presetId),
    );

    if (!component) continue;

    // 2a. Add _uid and component discriminator to bloks fields
    traverse(
      preset.preset,
      ({ meta }) => {
        const config = jsonpointer.get(component.schema, `/${meta.nodePath}`);
        if (!config) return;
        if (config.type === "bloks") {
          jsonpointer.set(
            preset.preset,
            `/${meta.nodePath}`,
            Array.isArray(jsonpointer.get(preset.preset, `/${meta.nodePath}`))
              ? jsonpointer
                  .get(preset.preset, `/${meta.nodePath}`)
                  .map((entry) => {
                    if (typeof entry !== "object") return entry;
                    return {
                      ...entry,
                      _uid: uuidv4(),
                      component: config.component_whitelist[0],
                    };
                  })
              : {
                  ...jsonpointer.get(preset.preset, `/${meta.nodePath}`),
                  _uid: uuidv4(),
                  component: config.component_whitelist[0],
                },
          );
        }
      },
      { pathSeparator: "/" },
    );

    // 2b. Flatten nested objects to key_subkey format
    traverse(preset.preset, ({ parent, key, value }) => {
      if (typeof value === "object" && isNaN(key) && !Array.isArray(value)) {
        for (const [propKey, propValue] of Object.entries(value)) {
          parent[`${key}_${propKey}`] = propValue;
        }
        delete parent[key];
      }
    });

    // 2c. Clean properties not in component schema
    const storyblokProperties = ["_uid", "component"];

    traverse(preset.preset, ({ parent, key, meta, value }) => {
      const config = jsonpointer.get(component.schema, `/${meta.nodePath}`);

      if (config?.type === "bloks") {
        const originalValue = jsonpointer.get(
          preset.preset,
          `/${meta.nodePath}`,
        );

        if (Array.isArray(originalValue)) {
          const cleaned = jsonpointer
            .get(preset.preset, `/${meta.nodePath}`)
            .map((entry) => {
              const subComponent = componentsList.find(
                (c) => c.name === entry.component,
              );
              for (const property of Object.keys(entry)) {
                if (
                  subComponent &&
                  subComponent.schema &&
                  !subComponent.schema.hasOwnProperty(property) &&
                  !storyblokProperties.includes(property)
                ) {
                  delete entry[property];
                }
              }
              return { ...entry };
            });
          jsonpointer.set(preset.preset, `/${meta.nodePath}`, cleaned);
        } else {
          const subComponent = componentsList.find(
            (c) => c.name === originalValue.component,
          );
          for (const property of Object.keys(originalValue)) {
            if (
              subComponent &&
              subComponent.schema &&
              !subComponent.schema.hasOwnProperty(property) &&
              !storyblokProperties.includes(property)
            ) {
              delete originalValue[property];
            }
          }
          jsonpointer.set(preset.preset, `/${meta.nodePath}`, {
            ...originalValue,
          });
        }
      }

      if (config) return;

      if (
        parent &&
        key &&
        parent.hasOwnProperty(key) &&
        !storyblokProperties.includes(key) &&
        isNaN(key) &&
        !Array.isArray(value) &&
        parent.component === preset.preset.component
      ) {
        delete parent[key];
      }
    });
  }

  // -- Step 3: Write output ------------------------------------------------

  const presetArray = Object.values(presets);

  if (writeFile) {
    fs.writeFileSync(
      outputPath,
      JSON.stringify({ presets: presetArray }, null, 2),
    );
    console.log(`Generated ${presetArray.length} presets → ${outputPath}`);
  }

  return presets;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

if (require.main === module) {
  generatePresets();
}

module.exports = {
  generatePresets,
  presetIdToComponentName,
  groupToComponentName,
};
