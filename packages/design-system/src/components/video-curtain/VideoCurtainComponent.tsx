import { HTMLAttributes, createContext, forwardRef, useContext } from "react";
import { VisualContextDefault } from "@kickstartds/content/lib/visual";
import classnames from "classnames";
import { VideoCurtainProps } from "./VideoCurtainProps";
import "./video-curtain.scss";
import { Container } from "@kickstartds/core/lib/container";
import { ButtonContext } from "@kickstartds/base/lib/button";
import { useButtonGroup } from "../button-group/ButtonGroupComponent";
import { deepMergeDefaults } from "../helpers";
import defaults from "./VideoCurtainDefaults";

export type { VideoCurtainProps };

export const VideoCurtainContextDefault = forwardRef<
  HTMLDivElement,
  VideoCurtainProps & HTMLAttributes<HTMLDivElement>
>(
  (
    {
      headline,
      sub,
      text,
      highlightText,
      colorNeutral,
      textPosition,
      overlay,
      video,
      className,
      buttons = [],
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
        <Container name="visual">
          <VisualContextDefault
            {...rest}
            ref={ref}
            skipButton
            className={classnames(
              `dsa-video-curtain`,
              textPosition && `dsa-video-curtain--content-${textPosition}`,
              highlightText && `dsa-video-curtain--highlight-text`,
              colorNeutral && `dsa-video-curtain--color-neutral`,
              className
            )}
            height="fullScreen"
            inbox
            box={{
              background: "transparent",
              enabled: true,
              vertical:
                textPosition === "bottom" || textPosition === "corner"
                  ? "bottom"
                  : "center",
              horizontal:
                textPosition === "left" || textPosition === "corner"
                  ? "left"
                  : textPosition === "right"
                  ? "right"
                  : "center",
              link: {
                // @ts-expect-error
                buttons,
                colorNeutral,
                enabled: buttons.length > 0,
                arrangement:
                  textPosition === "left" || textPosition === "corner"
                    ? "left"
                    : "center",
              },
              headline: {
                text: headline,
                level: "h1",
                sub: sub,
                style: highlightText ? "h1" : undefined,
                align: textPosition === "center" ? "center" : "left",
              },
              text: text,
            }}
            overlay={overlay}
            media={{
              mode: "video",
              video: {
                srcMobile: video.srcMobile,
                srcTablet: video.srcTablet,
                srcDesktop: video.srcDesktop,
              },
            }}
          />
        </Container>
      </ButtonContext.Provider>
    );
  }
);

export const VideoCurtainContext = createContext(VideoCurtainContextDefault);
export const VideoCurtain = forwardRef<
  HTMLDivElement,
  VideoCurtainProps & HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const Component = useContext(VideoCurtainContext);
  return <Component {...deepMergeDefaults(defaults, props)} ref={ref} />;
});
VideoCurtain.displayName = "VideoCurtain";
