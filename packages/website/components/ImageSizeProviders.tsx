import {
  Children,
  ComponentProps,
  FC,
  forwardRef,
  HTMLAttributes,
  PropsWithChildren,
  useContext,
  useMemo,
} from "react";
import { ImageSizeProvider, useImageSize } from "./ImageSizeContext";
import {
  SectionContext,
  SectionContextDefault,
} from "@kickstartds/design-system/section";
import {
  LogosContext,
  LogosContextDefault,
} from "@kickstartds/design-system/logos";
// TODO why does this import look different? Investigate!
import {
  ImageStoryContext,
  ImageStoryContextDefault,
} from "@kickstartds/design-system/components/image-story/index.js";
import {
  PostMetaContext,
  PostMetaContextDefault,
} from "@kickstartds/blog/lib/post-meta";
import {
  BlogTeaserContext,
  BlogTeaserContextDefault,
} from "@kickstartds/design-system/blog-teaser";
import {
  DownloadsContext,
  DownloadsContextDefault,
} from "@kickstartds/design-system/downloads";
import { DownloadsProps } from "@kickstartds/design-system/downloads";
import calculated from "@/token/calculated";

const SectionProvider: FC<PropsWithChildren> = (props) => {
  const UpstreamSection = useContext(SectionContext);

  const Section = useMemo(
    () =>
      forwardRef<
        HTMLDivElement,
        ComponentProps<typeof SectionContextDefault> &
          Omit<HTMLAttributes<HTMLElement>, "style" | "content">
      >(function SectionImageSize(props, ref) {
        // TODO should also take into account section gap width
        const childCount = Children.count(props.children) || 1;

        const sectionWidthName =
          props.content?.width === "unset" || !props.content?.width
            ? props.width || "default"
            : calculated.sectionWidths[props.content?.width || "default"] >
                calculated.sectionWidths[props.width || "default"]
              ? props.width || "default"
              : props.content?.width || "default";

        const sectionWidth =
          calculated.sectionWidths[sectionWidthName] *
          calculated.baseFontSizePx;

        const componentWidth =
          props.content?.mode === "list"
            ? sectionWidth
            : props.content?.mode === "slider"
              ? sectionWidth
              : sectionWidth / childCount;

        return (
          <ImageSizeProvider size={componentWidth}>
            <UpstreamSection {...props} ref={ref} />
          </ImageSizeProvider>
        );
      }),
    [UpstreamSection],
  );

  return <SectionContext.Provider {...props} value={Section} />;
};

const LogosProvider: FC<PropsWithChildren> = (props) => {
  const UpstreamLogos = useContext(LogosContext);

  const Logos = useMemo(
    () =>
      forwardRef<
        HTMLDivElement,
        ComponentProps<typeof LogosContextDefault> &
          HTMLAttributes<HTMLDivElement>
      >(function LogosImageSize(props, ref) {
        const size = useImageSize();
        const gapSize = calculated.desktop["--dsa-logos__grid--gap-horizontal"];
        const logoSize = Math.ceil(
          (size - gapSize * (props.logosPerRow || 3)) /
            (props.logosPerRow || 3),
        );

        return (
          <ImageSizeProvider size={logoSize}>
            <UpstreamLogos {...props} ref={ref} />
          </ImageSizeProvider>
        );
      }),
    [UpstreamLogos],
  );

  return <LogosContext.Provider {...props} value={Logos} />;
};

const ImageStoryProvider: FC<PropsWithChildren> = (props) => {
  const UpstreamImageStory = useContext(ImageStoryContext);

  const ImageStory = useMemo(
    () =>
      forwardRef<
        HTMLDivElement,
        ComponentProps<typeof ImageStoryContextDefault> &
          HTMLAttributes<HTMLDivElement>
      >(function ImageStoryImageSize(props, ref) {
        const size = useImageSize();
        // The two image-story images sit side by side with the horizontal
        // padding between them, so the available width is (size - gap) split in
        // two - not size/2 minus a full gap. Uses the desktop value because
        // that is the breakpoint where the side-by-side layout applies.
        const gapSize =
          calculated.desktop["--dsa-image-story--horizontal-padding"];
        const imageSize = Math.ceil((size - gapSize) / 2);

        return (
          <ImageSizeProvider size={imageSize}>
            <UpstreamImageStory {...props} ref={ref} />
          </ImageSizeProvider>
        );
      }),
    [UpstreamImageStory],
  );

  return <ImageStoryContext.Provider {...props} value={ImageStory} />;
};

const BlogTeaserProvider: FC<PropsWithChildren> = (props) => {
  const UpstreamBlogTeaser = useContext(BlogTeaserContext);

  const BlogTeaser = useMemo(
    () =>
      forwardRef<
        HTMLDivElement,
        ComponentProps<typeof BlogTeaserContextDefault> &
          HTMLAttributes<HTMLElement>
      >(function BlogTeaserImageSize(props, ref) {
        const size = useImageSize();

        // TODO get "500" from tokens
        const resultingSize = size < 500 ? size : size / 2;

        return (
          <ImageSizeProvider size={resultingSize}>
            <UpstreamBlogTeaser {...props} ref={ref} />
          </ImageSizeProvider>
        );
      }),
    [UpstreamBlogTeaser],
  );

  return <BlogTeaserContext.Provider {...props} value={BlogTeaser} />;
};

const PostMetaProvider: FC<PropsWithChildren> = (props) => {
  const UpstreamPostMeta = useContext(PostMetaContext);

  const PostMeta = useMemo(
    () =>
      forwardRef<
        HTMLDivElement,
        ComponentProps<typeof PostMetaContextDefault> &
          HTMLAttributes<HTMLElement>
      >(function PostMetaImageSize(props, ref) {
        const avatarSize =
          calculated.desktop["--dsa-blog-teaser__avatar--size"];
        return (
          <ImageSizeProvider size={avatarSize}>
            <UpstreamPostMeta {...props} ref={ref} />
          </ImageSizeProvider>
        );
      }),
    [UpstreamPostMeta],
  );

  return <PostMetaContext.Provider {...props} value={PostMeta} />;
};

const DownloadsImageSizeProvider: FC<PropsWithChildren> = (props) => {
  const UpstreamDownloads = useContext(DownloadsContext);

  const Downloads = useMemo(
    () =>
      forwardRef<
        HTMLDivElement,
        ComponentProps<typeof DownloadsContextDefault> &
          HTMLAttributes<HTMLDivElement>
      >(function DownloadsImageSize(props, ref) {
        const iconSize =
          calculated.desktop["--dsa-downloads-item__placeholder-icon--size"];
        return (
          <ImageSizeProvider size={iconSize}>
            <UpstreamDownloads {...props} ref={ref} />
          </ImageSizeProvider>
        );
      }),
    [UpstreamDownloads],
  );

  return <DownloadsContext.Provider {...props} value={Downloads} />;
};

const ImageSizeProviders = (props: PropsWithChildren) => (
  <SectionProvider>
    <LogosProvider>
      <PostMetaProvider>
        <BlogTeaserProvider>
          <ImageStoryProvider>
            <DownloadsImageSizeProvider>
              {props.children}
            </DownloadsImageSizeProvider>
          </ImageStoryProvider>
        </BlogTeaserProvider>
      </PostMetaProvider>
    </LogosProvider>
  </SectionProvider>
);

export default ImageSizeProviders;
