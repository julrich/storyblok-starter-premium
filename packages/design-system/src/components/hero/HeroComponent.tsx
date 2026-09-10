import { forwardRef, createContext, useContext, HTMLAttributes } from "react";
import { VisualContextDefault } from "@kickstartds/content/lib/visual";
import { HeroProps } from "./HeroProps";
import classnames from "classnames";
import "./hero.scss";
import { Container } from "@kickstartds/core/lib/container";
import { ButtonContext } from "@kickstartds/base/lib/button";
import { useButtonGroup } from "../button-group/ButtonGroupComponent";
import { deepMergeDefaults } from "../helpers";
import defaults from "./HeroDefaults";

export type { HeroProps };

export const HeroContextDefault = forwardRef<
  HTMLDivElement,
  HeroProps & HTMLAttributes<HTMLDivElement>
>(
  (
    {
      headline,
      sub,
      height,
      text,
      highlightText,
      textPosition = "center",
      colorNeutral,
      image,
      overlay,
      textbox,
      mobileTextBelow = true,
      invertText = false,
      className,
      buttons = [],
      skipButton = false,
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
        <Container name="hero">
          <Container name="visual">
            <VisualContextDefault
              {...rest}
              ref={ref}
              className={classnames(
                `dsa-hero dsa-hero--content-${textPosition}`,
                highlightText && `dsa-hero--highlight-text`,
                colorNeutral && `dsa-hero--color-neutral`,
                overlay && `dsa-hero--overlay`,
                !mobileTextBelow && `dsa-hero--mobile-text-overlay`,
                className
              )}
              ks-inverted={invertText ? "true" : undefined}
              height={height}
              overlay={overlay}
              skipButton={skipButton}
              inbox={!mobileTextBelow ? true : false}
              box={{
                background:
                  textPosition === "below"
                    ? "transparent"
                    : textbox === true
                    ? "solid"
                    : "transparent",
                enabled: headline ? true : false,
                vertical:
                  textPosition === "below" ||
                  textPosition === "offset" ||
                  textPosition === "corner" ||
                  textPosition === "bottom"
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
                    textPosition === "below" ||
                    textPosition === "offset" ||
                    textPosition === "center" ||
                    textPosition === "bottom"
                      ? "center"
                      : "left",
                },
                headline: {
                  align:
                    textPosition === "below" || textPosition === "center"
                      ? "center"
                      : "left",
                  text: headline,
                  sub: sub,
                  level: "h3",
                  style: highlightText ? "h1" : undefined,
                },
                text: text,
              }}
              media={{
                mode: "image",
                image: {
                  alt: image.alt,
                  srcMobile: image.srcMobile,
                  srcTablet: image.srcTablet,
                  srcDesktop: image.srcDesktop,
                  src: image.src,
                },
              }}
            />
          </Container>
        </Container>
      </ButtonContext.Provider>
    );
  }
);

export const HeroContext = createContext(HeroContextDefault);
export const Hero = forwardRef<
  HTMLDivElement,
  HeroProps & HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const Component = useContext(HeroContext);
  return <Component {...deepMergeDefaults(defaults, props)} ref={ref} />;
});
Hero.displayName = "Hero";
