import { GetStaticPaths, GetStaticProps, NextPage } from "next";
import { StoryblokComponent, ISbStory, ISbStoryData } from "@storyblok/react";
import { Cache } from "file-system-cache";
import { fetchPageProps, fetchPaths, INDEX_SLUG } from "@/helpers/storyblok";
import { traverse } from "object-traversal";
import { isImgUrl } from "@/helpers/apiUtils";
import { fontClassNames } from "@/helpers/fonts";
import { HeadlineLevelProvider } from "@/components/headline/HeadlineLevelContext";
import { Language, languageOf, pathOf } from "@/helpers/i18n";

type PageProps = ISbStory["data"] & {
  settings?: ISbStoryData["content"];
  language: Language;
};

const Page: NextPage<PageProps> = ({ story }) => {
  return (
    <HeadlineLevelProvider>
      <StoryblokComponent
        blok={story.content}
        data-font-class-names={fontClassNames}
        pagefindUrl={pathOf(story.full_slug)}
      />
    </HeadlineLevelProvider>
  );
};

export default Page;

export const getStaticPaths = (async () => {
  const exclude = ["not-found"];

  return {
    paths: (await fetchPaths())
      .filter((path) => !exclude.includes(path.params.slug.join("/")))
      .map((path) => {
        return {
          params: {
            slug: path.params.slug,
          },
        };
      }),
    fallback: "blocking",
  };
}) satisfies GetStaticPaths;

export const getStaticProps = (async ({ params }) => {
  const slug = params?.slug?.join("/") || INDEX_SLUG;

  try {
    const { pageData, settingsData } = await fetchPageProps(slug);

    const storyImages: string[] = [];
    traverse(pageData, ({ value }) => {
      if (isImgUrl(value)) {
        storyImages.push(value.startsWith("//a") ? `https:${value}` : value);
      }
    });

    const blurHashes: Record<string, string> = {};

    const cache = new Cache({ basePath: "./public/blurhashes" });
    await cache.load();

    for (const imageUrl of storyImages) {
      blurHashes[imageUrl] ||= cache.getSync(imageUrl) || null;
    }

    const settingsStory = settingsData.stories.reduce(
      (closest, story) => {
        if (
          slug?.startsWith(story.full_slug.split("/").slice(0, -2).join("/")) &&
          story.full_slug.split("/").length >
            closest.full_slug.split("/").length
        ) {
          return story;
        }
        return closest;
      },
      settingsData.stories.reduce(
        (shortest, story) => {
          return story.full_slug.split("/").length <
            shortest.full_slug.split("/").length
            ? story
            : shortest;
        },
        { full_slug: "" } as ISbStoryData
      )
    );

    return {
      props: {
        ...pageData,
        blurHashes,
        fontClassNames,
        settings: settingsStory.content || null,
        key: pageData.story.id,
        // UPSTREAM BUG - deviates from monorepo/main, contribute back and
        // drop. The starter hardcodes this to the `locale` constant ("en"),
        // so `useLanguage()` never reports the language actually being
        // rendered: the switcher marks the wrong entry active and dates are
        // formatted in English on German pages. Derive it from the slug.
        language: languageOf(slug),
      },
    };
  } catch (e) {
    return {
      notFound: true,
    };
  }
}) satisfies GetStaticProps<PageProps, NodeJS.Dict<string[]>, string>;

// see: https://github.com/vercel/next.js/pull/11949
export const config = {
  unstable_runtimeJS: false,
};
