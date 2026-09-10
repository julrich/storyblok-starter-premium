/// <reference types="vite/client"/>
// @vitest-environment happy-dom

import path from "node:path";
import { describe, test } from "vitest";
import { ReactRenderer, composeStories } from "@storybook/react";
import { Store_CSFExports } from "@storybook/types";
import { unpackDecorator } from "@kickstartds/core/lib/storybook";
import { renderToStaticMarkup } from "react-dom/server";
import * as pagefind from "pagefind";

const preview = {
  decorators: [unpackDecorator],
};

function getAllStoryFiles() {
  const storyFiles = Object.entries(
    import.meta.glob<Store_CSFExports<ReactRenderer>>(
      "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
    )
  );

  return storyFiles.map(([filePath, storyFile]) => {
    const storyDir = path.dirname(filePath);
    const componentName = path
      .basename(filePath)
      .replace(/\.(stories)\.[^/.]+$/, "");
    return { filePath, storyFile, componentName, storyDir };
  });
}

describe("Create Seach Index", async () => {
  const { index } = await pagefind.createIndex();
  if (!index) throw new Error("Index could not be created.");
  const storyFiles = getAllStoryFiles();

  for (const storyFile of storyFiles) {
    describe(storyFile.componentName, async () => {
      const storyModule = await storyFile.storyFile();
      const composed = composeStories(storyModule, preview);

      for (const storyName in composed) {
        const story = composed[storyName];
        let html: string | undefined;
        try {
          html = renderToStaticMarkup(story());
        } catch (e) {
          test.skip(`${storyName} - ${e}`);
        }
        if (html) {
          test(storyName, async () => {
            const { errors } = await index.addHTMLFile({
              url: `/?path=/story/${story.id}`,
              content: `\
                <html lang="en">
                  <head><title>${storyFile.componentName} - ${storyName}</title></head>
                  <body>
                    <img data-pagefind-meta="image[src]" src="/img/screenshots/${story.id}.png" />
                    ${html}
                  </body>
                </html>`,
            });
            if (errors.length) {
              throw new Error(errors[0]);
            }
          });
        }
      }
    });
  }

  test("💾 write index", async () => {
    await index.writeFiles({
      outputPath: "static/pagefind",
    });
    await pagefind.close();
  });
});
