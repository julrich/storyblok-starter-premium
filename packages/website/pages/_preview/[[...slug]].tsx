import { GetStaticPaths, GetStaticProps, NextPage } from "next";
import { StoryblokComponent, ISbStory, ISbStoryData } from "@storyblok/react";
import { fetchPageProps, fetchPaths, INDEX_SLUG } from "@/helpers/storyblok";
import { fontClassNamesPreview } from "@/helpers/fonts";
import { Language, languageOf } from "@/helpers/i18n";
import { HeadlineLevelProvider } from "@/components/headline/HeadlineLevelContext";

type PageProps = ISbStory["data"] & {
  settings?: ISbStoryData["content"];
  language: Language;
};

const Page: NextPage<PageProps> = ({ story }) => {
  return story ? (
    <HeadlineLevelProvider>
      <StoryblokComponent
        blok={story.content}
        data-font-class-names={fontClassNamesPreview}
      />
    </HeadlineLevelProvider>
  ) : null;
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

export const getStaticProps = (async ({ params, previewData }) => {
  if (!previewData) {
    return {
      notFound: true,
    };
  }

  const StoryblokClient = await import("storyblok-js-client").then(
    (mod) => mod.default,
  );
  const previewStoryblokApi = new StoryblokClient({ accessToken: previewData });
  const slug = params?.slug?.join("/") || INDEX_SLUG;

  try {
    const { pageData, settingsData } = await fetchPageProps(
      slug,
      previewStoryblokApi,
    );

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
        { full_slug: "" } as ISbStoryData,
      ),
    );

    return {
      props: {
        ...pageData,
        blurHashes: {},
        fontClassNames: fontClassNamesPreview,
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
