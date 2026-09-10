import { HTMLAttributes, createContext, forwardRef, useContext } from "react";
import { ImageStoryProps } from "./ImageStoryProps";
import "./image-story.scss";
import { Storytelling } from "@kickstartds/content/lib/storytelling";
import { ButtonContext } from "@kickstartds/base/lib/button";
import classnames from "classnames";
import { useButtonGroup } from "../button-group/ButtonGroupComponent";
import { deepMergeDefaults } from "../helpers";
import defaults from "./ImageStoryDefaults";

export type { ImageStoryProps };

export const ImageStoryContextDefault = forwardRef<
  HTMLDivElement,
  ImageStoryProps & HTMLAttributes<HTMLDivElement>
>(
  (
    {
      headline,
      largeHeadline = false,
      sub,
      image,
      padding = false,
      textAlign = "left",
      layout = "textLeft",
      buttons = [],
      text,
      ...rest
    },
    ref
  ) => {
    const ButtonGroup = useButtonGroup();

    return (
      <ButtonContext.Provider
        // @ts-expect-error
        value={ButtonGroup}
      >
        <Storytelling
          {...rest}
          ref={ref}
          className={classnames("dsa-image-story")}
          full={padding === false ? true : false}
          image={{
            source: image?.src,
            vAlign: image?.vAlign,
            ratio:
              image?.aspectRatio === "square"
                ? "1:1"
                : image?.aspectRatio === "wide"
                ? "4:3"
                : image?.aspectRatio === "landscape"
                ? "16:9"
                : image?.aspectRatio === "unset"
                ? "none"
                : "none",
            order: {
              desktopImageLast: layout === "imageLeft" ? false : true,
            },
          }}
          box={{
            text: text,
            textAlign: textAlign,
            vAlign: "top",
            link: { buttons },
            headline: {
              text: headline,
              level: "h2",
              style: largeHeadline === true ? "h1" : undefined,
              sub: sub,
              spaceAfter: largeHeadline === true ? "large" : undefined,
              align: textAlign,
            },
          }}
        />
      </ButtonContext.Provider>
    );
  }
);

export const ImageStoryContext = createContext(ImageStoryContextDefault);
export const ImageStory = forwardRef<
  HTMLDivElement,
  ImageStoryProps & HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const Component = useContext(ImageStoryContext);
  return <Component {...deepMergeDefaults(defaults, props)} ref={ref} />;
});
ImageStory.displayName = "ImageStory";
