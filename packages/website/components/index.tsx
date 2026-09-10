import { ComponentProps, FC } from "react";
import dynamic from "next/dynamic";
import {
  SbBlokData,
  storyblokEditable,
  StoryblokComponent,
} from "@storyblok/react";
import { unflatten } from "@/helpers/unflatten";
import { Section } from "@kickstartds/design-system/section";
import { Slider } from "@kickstartds/design-system/slider";
import editablePage from "./Page";
import { ImageAutoSizeProvider } from "./ImageAutoSizeProvider";
import {
  isGlobal,
  isGlobalReference,
  isStoryblokComponent,
} from "@/helpers/storyblok";
import {
  GlobalReferenceStoryblok,
  GlobalStoryblok,
} from "@/types/components-schema";

export const locale = "en";

export const Global: FC<GlobalStoryblok & SbBlokData> = (props) =>
  isGlobal(props.blok) &&
  props.blok.global &&
  props.blok.global.map((global) => (
    <StoryblokComponent blok={global} key={global._uid} />
  ));

export const GlobalReference: FC<GlobalReferenceStoryblok & SbBlokData> = (
  props,
) =>
  isGlobalReference(props.blok) &&
  props.blok.reference?.map(
    (reference) =>
      isGlobal(reference) &&
      reference.global?.map((global) => (
        <StoryblokComponent blok={global} key={global._uid} />
      )),
  );

export const editable =
  (Component: React.ComponentType<any>, nestedBloksKey?: string) =>
  // eslint-disable-next-line react/display-name
  ({ blok }: { blok: SbBlokData }) => {
    const { component, components, type, typeProp, _uid, ...props } = unflatten(
      isStoryblokComponent(blok) ? blok.content : blok,
    );

    if (isGlobalReference(blok)) {
      return (
        <div className="editable">
          {blok.reference?.map(
            (reference) =>
              isGlobal(reference) &&
              reference.global?.map((global) => (
                <StoryblokComponent blok={global} key={global._uid} />
              )),
          )}
        </div>
      );
    }

    return (
      <Component {...storyblokEditable(blok)} {...props} type={typeProp}>
        {nestedBloksKey &&
          (blok[nestedBloksKey] as SbBlokData[] | undefined)?.map(
            (nestedBlok) => {
              if (isGlobalReference(nestedBlok)) {
                return nestedBlok.reference?.map((reference) =>
                  reference
                    ? isGlobal(reference) &&
                      reference.global?.map((global) => (
                        <StoryblokComponent blok={global} key={global._uid} />
                      ))
                    : "",
                );
              }

              return (
                <StoryblokComponent blok={nestedBlok} key={nestedBlok._uid} />
              );
            },
          )}
      </Component>
    );
  };

const Hero = dynamic(() =>
  import("@kickstartds/design-system/hero").then((mod) => mod.Hero),
);

const DynamicMosaic = dynamic(() =>
  import("@kickstartds/design-system/mosaic").then((mod) => mod.Mosaic),
);

const MosaicWrapper: FC<Record<string, any>> = (props) => {
  const processedTile = props.tile?.map((t: Record<string, any>) => {
    const { component, _uid, ...tileProps } = unflatten(t);
    return tileProps;
  });
  return <DynamicMosaic {...props} tile={processedTile} />;
};

export const components = {
  page: editablePage,
  global: Global,
  global_reference: GlobalReference,
  settings: dynamic(() => import("./SettingsPreview")),
  "token-theme": dynamic(() => import("./TokenThemePreview")),
  "blog-overview": dynamic(() => import("./BlogOverview")),
  "blog-post": dynamic(() => import("./BlogPost")),
  "event-detail": dynamic(() => import("./EventDetail")),
  "event-list": dynamic(() => import("./EventList")),
  search: dynamic(() => import("./Search")),
  "blog-teaser": editable(
    dynamic(() =>
      import("@kickstartds/design-system/blog-teaser").then(
        (mod) => mod.BlogTeaserContextDefault,
      ),
    ),
  ),
  "blog-aside": editable(
    dynamic(() =>
      import("@kickstartds/design-system/blog-aside").then(
        (mod) => mod.BlogAsideContextDefault,
      ),
    ),
  ),
  "blog-author": editable(
    dynamic(() =>
      import("@kickstartds/design-system/blog-author").then(
        (mod) => mod.BlogAuthorContextDefault,
      ),
    ),
  ),
  "blog-head": editable(
    dynamic(() =>
      import("@kickstartds/design-system/blog-head").then(
        (mod) => mod.BlogHeadContextDefault,
      ),
    ),
  ),
  section: editable(Section, "components"),
  "business-card": editable(
    dynamic(() =>
      import("@kickstartds/design-system/business-card").then(
        (mod) => mod.BusinessCardContextDefault,
      ),
    ),
  ),
  button: editable(
    dynamic(() =>
      import("@kickstartds/design-system/button").then((mod) => mod.Button),
    ),
  ),
  contact: editable(
    dynamic(() =>
      import("@kickstartds/design-system/contact").then((mod) => mod.Contact),
    ),
  ),
  "content-nav": editable(
    dynamic(() =>
      import("@kickstartds/design-system/content-nav").then(
        (mod) => mod.ContentNavContextDefault,
      ),
    ),
  ),
  cta: editable(
    dynamic(() =>
      import("@kickstartds/design-system/cta").then(
        (mod) => mod.CtaContextDefault,
      ),
    ),
  ),
  divider: editable(
    dynamic(() =>
      import("@kickstartds/design-system/divider").then(
        (mod) => mod.DividerContextDefault,
      ),
    ),
  ),
  downloads: editable(
    dynamic(() =>
      import("@kickstartds/design-system/downloads").then(
        (mod) => mod.DownloadsContextDefault,
      ),
    ),
  ),
  "event-latest-teaser": editable(
    dynamic(() =>
      import("@kickstartds/design-system/event-latest-teaser").then(
        (mod) => mod.EventLatestTeaserContextDefault,
      ),
    ),
  ),
  "event-list-teaser": editable(
    dynamic(() =>
      import("@kickstartds/design-system/event-list-teaser").then(
        (mod) => mod.EventListTeaserContextDefault,
      ),
    ),
  ),
  faq: editable(
    dynamic(() =>
      import("@kickstartds/design-system/faq").then(
        (mod) => mod.FaqContextDefault,
      ),
    ),
  ),
  features: editable(
    dynamic(() =>
      import("@kickstartds/design-system/features").then(
        (mod) => mod.FeaturesContextDefault,
      ),
    ),
  ),
  feature: editable(
    dynamic(() =>
      import("@kickstartds/design-system/feature").then(
        (mod) => mod.FeatureContextDefault,
      ),
    ),
  ),
  gallery: editable(
    dynamic(() =>
      import("@kickstartds/design-system/gallery").then((mod) => mod.Gallery),
    ),
  ),
  headline: editable(
    dynamic(() =>
      import("@kickstartds/design-system/headline").then((mod) => mod.Headline),
    ),
  ),
  html: editable(
    dynamic(() =>
      import("@kickstartds/design-system/html").then(
        (mod) => mod.HtmlContextDefault,
      ),
    ),
  ),
  prompter: editable(
    dynamic(() =>
      import("./prompter/PrompterComponent").then(
        (mod) => mod.PrompterComponent,
      ),
    ),
  ),

  "info-table": editable(
    dynamic(() =>
      import("./info-table/InfoTableComponent").then(
        (mod) => mod.InfoTableContextDefault,
      ),
    ),
  ),
  "split-even": editable(
    dynamic(() =>
      import("@kickstartds/design-system/split-even").then(
        (mod) => mod.SplitEven,
      ),
    ),
    "firstComponents",
  ),
  "split-weighted": editable(
    dynamic(() =>
      import("@kickstartds/design-system/split-weighted").then(
        (mod) => mod.SplitWeighted,
      ),
    ),
    "mainComponents",
  ),
  stats: editable(
    dynamic(() =>
      import("@kickstartds/design-system/stats").then(
        (mod) => mod.StatsContextDefault,
      ),
    ),
  ),
  stat: editable(
    dynamic(() =>
      import("@kickstartds/design-system/stat").then(
        (mod) => mod.StatContextDefault,
      ),
    ),
  ),
  "teaser-card": editable(
    dynamic(() =>
      import("@kickstartds/design-system/teaser-card").then(
        (mod) => mod.TeaserCard,
      ),
    ),
  ),
  testimonials: editable(
    dynamic(() =>
      import("@kickstartds/design-system/testimonials").then(
        (mod) => mod.Testimonials,
      ),
    ),
  ),
  testimonial: editable(
    dynamic(() =>
      import("@kickstartds/design-system/testimonial").then(
        (mod) => mod.TestimonialContextDefault,
      ),
    ),
  ),
  text: editable(
    dynamic(() =>
      import("@kickstartds/design-system/text").then(
        (mod) => mod.TextContextDefault,
      ),
    ),
  ),
  "image-text": editable(
    dynamic(() =>
      import("@kickstartds/design-system/image-text").then(
        (mod) => mod.ImageTextContextDefault,
      ),
    ),
  ),
  logos: editable(
    dynamic(() =>
      import("@kickstartds/design-system/logos").then((mod) => mod.Logos),
    ),
  ),
  hero: editable((props: ComponentProps<typeof Hero>) => (
    <ImageAutoSizeProvider>
      <Hero {...props} />
    </ImageAutoSizeProvider>
  )),
  mosaic: editable(MosaicWrapper),
  "video-curtain": editable(
    dynamic(() =>
      import("@kickstartds/design-system/video-curtain").then(
        (mod) => mod.VideoCurtainContextDefault,
      ),
    ),
  ),
  "image-story": editable(
    dynamic(() =>
      import("@kickstartds/design-system/image-story").then(
        (mod) => mod.ImageStory,
      ),
    ),
  ),
  slider: editable(Slider, "components"),
};
