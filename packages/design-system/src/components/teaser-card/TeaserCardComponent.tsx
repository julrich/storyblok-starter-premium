import {
  HTMLAttributes,
  FC,
  PropsWithChildren,
  forwardRef,
  createContext,
  useContext,
} from "react";
import classnames from "classnames";
import "@github/relative-time-element";
import {
  TeaserBoxContextDefault,
  TeaserBoxContext,
} from "@kickstartds/base/lib/teaser-box";
import { TeaserCardProps } from "./TeaserCardProps";
import "./teaser-card.scss";
import { Container } from "@kickstartds/core/lib/container";
import { compiler } from "markdown-to-jsx";
import { deepMergeDefaults } from "../helpers";
import defaults from "./TeaserCardDefaults";

export type { TeaserCardProps };

export const TeaserCardContextDefault = forwardRef<
  HTMLDivElement,
  TeaserCardProps & HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  // `newTab` is resolved at story-processing time from Storyblok's multilink
  // target-blank toggle and isn't part of the generated schema type. The
  // base Teaser's client-side "js-linked" whole-card click behavior reads
  // the rendered anchor's `target` attribute, so forwarding `newTab` to the
  // Button here makes both the visible link and the card-wide click respect it.
  const { newTab, ...typedProps } = props as TeaserCardProps &
    HTMLAttributes<HTMLDivElement> & { newTab?: boolean };
  const {
    headline,
    text,
    button,
    url,
    image,
    imageRatio = "wide",
    imageAlt,
    imageHoverEffect = true,
    label,
    date,
    layout = "stack",
    centered = false,
    newTag,
    ...rest
  } = typedProps;

  const hasLink = Boolean(url?.trim()) && url !== "#";

  return (
    <Container name="teaser-card">
      <div
        ks-inverted={layout === "compact" && "true"}
        className={classnames(
          `dsa-teaser-card`,
          `dsa-teaser-card--${layout}`,
          `dsa-teaser-card--${imageRatio}`,
          label && `dsa-teaser-card--with-label`,
          centered && `dsa-teaser-card--centered`,
          !image && "dsa-teaser-card--no-image",
          !imageHoverEffect && "dsa-teaser-card--no-image-hover",
          !hasLink && "dsa-teaser-card--no-link",
          newTag && "dsa-teaser-card--new",
        )}
      >
        {newTag && <span className="dsa-teaser-card__tag">Neu</span>}
        <TeaserBoxContextDefault
          {...rest}
          topic={headline}
          text={text}
          // @ts-expect-error
          renderTopic={() => (
            <>
              {/* drhubert renders `label` inside the topic, as a
                  sub-headline above the main headline, for every layout - the
                  starter only did that for `compact` and floated it as a pill
                  in the top-right corner otherwise, where it collided with the
                  `newTag` pill. */}
              {label && (
                <span className="dsa-teaser-card__label">{label}</span>
              )}
              {compiler(headline)}
              {date && (
                <span className="dsa-teaser-card__date">
                  <relative-time
                    datetime={date}
                    format="relative"
                    threshold="P60D"
                    prefix=""
                  ></relative-time>
                </span>
              )}
            </>
          )}
          link={{
            hidden: button?.hidden || !hasLink,
            label: button.label,
            variant: "primary",
            url: url,
            icon: button?.chevron ? "chevron-right" : undefined,
            // `newTab` isn't part of the base package's generated `link` type
            // resolved here, but the underlying Button primitive supports it.
            ...({ newTab } as any),
          }}
          image={image}
          alt={imageAlt}
          ref={ref}
        />
      </div>
    </Container>
  );
});

export const TeaserCardContext = createContext(TeaserCardContextDefault);
export const TeaserCard = forwardRef<
  HTMLDivElement,
  TeaserCardProps & HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const Component = useContext(TeaserCardContext);
  return <Component {...deepMergeDefaults(defaults, props)} ref={ref} />;
});
TeaserCard.displayName = "TeaserCard";

export const TeaserBoxProvider: FC<PropsWithChildren> = (props) => (
  <TeaserBoxContext.Provider {...props} value={TeaserCard} />
);
