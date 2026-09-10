import { ComponentProps } from "react";
import {
  SbBlokData,
  StoryblokComponent,
  storyblokEditable,
} from "@storyblok/react";
import { Section } from "@kickstartds/design-system/components/section/index.js";
import { BlogAside } from "@kickstartds/design-system/components/blog-aside/index.js";
import { Text } from "@kickstartds/design-system/components/text/index.js";
import { BlogHead } from "@kickstartds/design-system/components/blog-head/index.js";
import { Cta } from "@kickstartds/design-system/components/cta/index.js";
import { BlogPost as DsaBlogPost } from "@kickstartds/design-system/components/blog-post/index.js";
import { SplitWeightedContextDefault as SplitWeighted } from "@kickstartds/design-system/components/split-weighted/index.js";
import { unflatten } from "@/helpers/unflatten";
import { pagefindAttributes } from "@/helpers/pagefind";

type PageProps = {
  blok: Omit<ComponentProps<typeof DsaBlogPost>, "section"> &
    SbBlokData & {
      section?: (ComponentProps<typeof DsaBlogPost>["section"] & {
        _uid: string;
      })[];
    };
  pagefindUrl?: string;
};

const BlogPost: React.FC<PageProps> = ({ blok, pagefindUrl }) => {
  if (blok) {
    const { cta, aside, head, content } = blok;

    return (
      <main {...storyblokEditable(blok)} {...pagefindAttributes(pagefindUrl)}>
        <Section width="wide" content={{ mode: "list" }}>
          <SplitWeighted
            main={
              <div>
                {head && <BlogHead {...head} />}
                {content ? (
                  <Text text={content} />
                ) : (
                  blok.section?.map((nestedBlok) => (
                    <StoryblokComponent
                      blok={unflatten(nestedBlok)}
                      key={nestedBlok._uid}
                    />
                  ))
                )}
              </div>
            }
            aside={aside && <BlogAside {...aside} />}
          />
        </Section>
        {cta && (
          <Section
            backgroundColor="accent"
            spaceAfter="none"
            spaceBefore="none"
          >
            <Cta {...cta} />
          </Section>
        )}
      </main>
    );
  }
  return null;
};

export default BlogPost;
