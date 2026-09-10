import { StoryblokComponent } from "@storyblok/react";
import { Cache } from "file-system-cache";
import { traverse } from "object-traversal";
import { isImgUrl } from "@/helpers/apiUtils";
import { fetchPageProps } from "@/helpers/storyblok";
import { fontClassNames } from "@/helpers/fonts";
import { HeadlineLevelProvider } from "@/components/headline/HeadlineLevelContext";
import { Headline } from "@kickstartds/design-system/components/headline/index.js";
import { Page } from "@kickstartds/design-system/components/page/index.js";
import { Section } from "@kickstartds/design-system/components/section/index.js";
import { Text } from "@kickstartds/design-system/components/text/index.js";

export default function Custom404({ story }) {
  if (story && story.content) {
    return (
      <HeadlineLevelProvider>
        <StoryblokComponent
          blok={story.content}
          data-font-class-names={fontClassNames}
        />
      </HeadlineLevelProvider>
    );
  } else {
    return (
      <Page>
        <Section content={{ mode: "list" }}>
          <Headline content={"Page not found"} />
          <Text text={"The page you requested was not found."} />
        </Section>
      </Page>
    );
  }
}

export const getStaticProps = async () => {
  try {
    const { pageData, settingsData } = await fetchPageProps("not-found");

    const storyImages = [];
    traverse(pageData, ({ value }) => {
      if (isImgUrl(value)) {
        storyImages.push(value.startsWith("//a") ? `https:${value}` : value);
      }
    });

    const blurHashes = {};

    const cache = new Cache({ basePath: "./public/blurhashes" });
    await cache.load();

    for (const imageUrl of storyImages) {
      blurHashes[imageUrl] ||= cache.getSync(imageUrl) || null;
    }

    const settingsStory = settingsData.stories.reduce((closest, story) => {
      if (
        story.full_slug.split("/").length < closest.full_slug.split("/").length
      ) {
        return story;
      }
      return closest;
    }, settingsData.stories[0] || { full_slug: "" });

    return {
      props: {
        ...pageData,
        blurHashes,
        fontClassNames,
        settings: settingsStory.content || null,
        key: pageData.story.id,
        language: "de",
      },
    };
  } catch (e) {
    return {
      props: {},
    };
  }
};
