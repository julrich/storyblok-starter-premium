import { StorybookConfig } from "@storybook/react-vite";
import { mergeConfig } from "vite";
import type { Manifests } from "storybook/internal/types";

import {
  dereference,
  getCustomSchemaIds,
  getSchemaRegistry,
  IProcessingOptions,
  processSchemaGlobs,
} from "@kickstartds/jsonschema-utils";

const processingConfiguration: Partial<IProcessingOptions> = {
  typeResolution: false,
  layerOrder: ["language", "visibility", "cms", "schema", "kickstartds"],
};

const config: StorybookConfig = {
  stories: [
    "../docs/**/*.mdx",
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|ts|tsx)",
  ],

  // @ts-expect-error
  experimental_manifests: async (existingManifests: Manifests = {}) => {
    const ajv = getSchemaRegistry();
    const schemaIds = await processSchemaGlobs(
      ["src/components/**/*.schema.json"],
      ajv,
      processingConfiguration,
    );
    const customSchemaIds = getCustomSchemaIds(schemaIds);
    const dereferencedSchemas = await dereference(customSchemaIds, ajv);

    const modifiedManifests = existingManifests;

    for (const [manifestId, componentManifest] of Object.entries(
      modifiedManifests.components.components,
    )) {
      const componentName = manifestId.split("-").slice(1).join("-");
      if (componentName.startsWith("archetypes-")) continue;

      const schemaPath = Object.keys(dereferencedSchemas).find((path) =>
        path.endsWith(`${componentName}.schema.json`),
      );
      if (!schemaPath) continue;

      componentManifest.description =
        dereferencedSchemas[schemaPath].description ||
        componentManifest.description;
    }

    return modifiedManifests;
  },

  addons: [
    "@storybook/addon-links",
    // "@kickstartds/storybook-addon-html",
    // "storybook-addon-playroom",
    // "@kickstartds/storybook-addon-component-tokens",
    // "storybook-design-token",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-mcp",
  ],

  framework: {
    name: "@storybook/react-vite",
    options: {},
  },

  features: {
    experimentalComponentsManifest: true,
    experimentalCodeExamples: true,
  },

  staticDirs: ["../static"],

  core: {
    disableTelemetry: true,
  },

  managerHead: (head) => {
    // Load Montserrat locally from static assets (served via staticDirs)
    const fontFaces = `<style>
@font-face {
  font-family: "Montserrat";
  font-style: normal;
  font-weight: 300;
  font-display: swap;
  src: url("/fonts/Montserrat-Light.woff2") format("woff2");
}
@font-face {
  font-family: "Montserrat";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("/fonts/Montserrat-Regular.woff2") format("woff2");
}
@font-face {
  font-family: "Montserrat";
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url("/fonts/Montserrat-Medium.woff2") format("woff2");
}
@font-face {
  font-family: "Montserrat";
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url("/fonts/Montserrat-SemiBold.woff2") format("woff2");
}
@font-face {
  font-family: "Montserrat";
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url("/fonts/Montserrat-Bold.woff2") format("woff2");
}
</style>`;
    return `${head}${fontFaces}<script>window.__STORYBLOK_TOKEN__=${JSON.stringify(process.env.STORYBLOK_API_TOKEN || "")}</script>`;
  },

  viteFinal: async (config) => {
    return mergeConfig(config, {
      define: {
        STORYBLOK_API_TOKEN: JSON.stringify(
          process.env.STORYBLOK_API_TOKEN || "",
        ),
      },
      optimizeDeps: {
        include: ["@storybook/addon-docs"],
      },
      plugins: [
        {
          name: "fix-mdx-react-shim",
          enforce: "pre",
          resolveId(source) {
            if (
              source.startsWith("file://") &&
              source.includes("mdx-react-shim.js")
            ) {
              // Convert file:///... path to normal filesystem path for Vite
              return new URL(source).pathname;
            }
            return null;
          },
        },
      ],
    });
  },
};
export default config;
