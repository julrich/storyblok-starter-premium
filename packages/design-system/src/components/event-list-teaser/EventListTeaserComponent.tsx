import classnames from "classnames";
import { forwardRef, createContext, useContext, HTMLAttributes } from "react";
import { EventListTeaserProps } from "./EventListTeaserProps";
import "./event-list-teaser.scss";
import { Icon } from "@kickstartds/base/lib/icon";
import { Container } from "@kickstartds/core/lib/container";
import { Picture } from "@kickstartds/base/lib/picture";
import Markdown from "markdown-to-jsx";
import { TagLabel } from "@kickstartds/base/lib/tag-label";
import { deepMergeDefaults } from "../helpers";
import defaults from "./EventListTeaserDefaults";

export type { EventListTeaserProps };

export const EventListTeaserContextDefault = forwardRef<
  HTMLAnchorElement,
  EventListTeaserProps & HTMLAttributes<HTMLAnchorElement>
>(
  (
    {
      category,
      title,
      text,
      date,
      time,
      tags,
      location,
      image,
      ctaText,
      url,
      ariaLabel,
      className,
      ...rest
    },
    ref
  ) => {
    return (
      <Container name="event-list-teaser">
        <a
          className={classnames(className, "dsa-event-list-teaser")}
          {...rest}
          href={url}
          ref={ref}
          aria-label={ariaLabel}
        >
          <div className="dsa-event-list-teaser__content">
            <div className="dsa-event-list-teaser__header">
              {category && (
                <span className="dsa-event-list-teaser__category">
                  {category}
                </span>
              )}
              <span className="dsa-event-list-teaser__title">{title}</span>
            </div>
            {tags && tags.length > 0 && (
              <div className="dsa-event-list-teaser__tags">
                {tags.map((category) => (
                  <TagLabel key={category} label={category} size="s" />
                ))}
              </div>
            )}
            <div className="dsa-event-list-teaser__infos">
              <div className="dsa-event-list-teaser__details">
                <div className="dsa-event-list-teaser__date">
                  <span className="dsa-event-list-teaser__info">
                    <Icon aria-hidden icon={"date"} />
                    {date}
                  </span>
                  <span className="dsa-event-list-teaser__info">
                    <Icon aria-hidden icon={"time"} />
                    {time}
                  </span>
                </div>

                <div className="dsa-event-list-teaser__location dsa-event-list-teaser__info">
                  <Icon aria-hidden icon={"map-pin"} />
                  <address>
                    {location?.name && (
                      <span className="dsa-event-list-teaser__location-name">
                        {location.name}
                      </span>
                    )}
                    <Markdown className="dsa-event-list-teaser__location-address">
                      {location?.address}
                    </Markdown>
                  </address>
                </div>
              </div>
            </div>
            {text && (
              <p className="dsa-event-list-teaser__teaser-text">{text}</p>
            )}

            <div className="dsa-event-list-teaser__cta">
              <span>{ctaText}</span>
              <Icon aria-hidden icon={"chevron-right"} />
            </div>
          </div>
          {image && image.src && (
            <div className="dsa-event-list-teaser__image">
              <Picture src={image?.src} alt={image?.alt} />
            </div>
          )}
        </a>
      </Container>
    );
  }
);

export const EventListTeaserContext = createContext(
  EventListTeaserContextDefault
);
export const EventListTeaser = forwardRef<
  HTMLAnchorElement,
  EventListTeaserProps & HTMLAttributes<HTMLAnchorElement>
>((props, ref) => {
  const Component = useContext(EventListTeaserContext);
  return <Component {...deepMergeDefaults(defaults, props)} ref={ref} />;
});
EventListTeaser.displayName = "EventListTeaser";
