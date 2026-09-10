import classnames from "classnames";
import { forwardRef, createContext, useContext, HTMLAttributes } from "react";
import { EventLatestTeaserProps } from "./EventLatestTeaserProps";
import "./event-latest-teaser.scss";
import { Icon } from "@kickstartds/base/lib/icon";
import { Container } from "@kickstartds/core/lib/container";
import { deepMergeDefaults } from "../helpers";
import defaults from "./EventLatestTeaserDefaults";

export type { EventLatestTeaserProps };

export const EventLatestTeaserContextDefault = forwardRef<
  HTMLAnchorElement,
  EventLatestTeaserProps & HTMLAttributes<HTMLAnchorElement>
>(
  (
    {
      date,
      title,
      cta,
      calendar,
      url,
      location,
      ariaLabel,
      className,
      ...rest
    },
    ref
  ) => {
    return (
      <Container name="event-latest-teaser">
        <a
          className={classnames(className, "dsa-event-latest-teaser")}
          {...rest}
          href={url}
          ref={ref}
          aria-label={ariaLabel}
        >
          <span className="dsa-event-latest-teaser__content">
            <span className="dsa-event-latest-teaser-calendar">
              <span className="dsa-event-latest-teaser-calendar__day">
                {calendar.day}
              </span>
              <span className="dsa-event-latest-teaser-calendar__month">
                {calendar.month}
              </span>
            </span>
            <span className="dsa-event-latest-teaser__text">
              <span className="dsa-event-latest-teaser__title">{title}</span>
              <span className="dsa-event-latest-teaser__infos">
                <span className="dsa-event-latest-teaser__info">
                  <Icon aria-hidden icon={"date"} />
                  {date}
                </span>

                <span className="dsa-event-latest-teaser__info">
                  <Icon aria-hidden icon={"map-pin"} />
                  {location}
                </span>
              </span>
            </span>
          </span>
          <span className="dsa-event-latest-teaser__cta">
            <span>{cta}</span>
            <Icon aria-hidden icon={"chevron-right"} />
          </span>
        </a>
      </Container>
    );
  }
);

export const EventLatestTeaserContext = createContext(
  EventLatestTeaserContextDefault
);
export const EventLatestTeaser = forwardRef<
  HTMLAnchorElement,
  EventLatestTeaserProps & HTMLAttributes<HTMLAnchorElement>
>((props, ref) => {
  const Component = useContext(EventLatestTeaserContext);
  return <Component {...deepMergeDefaults(defaults, props)} ref={ref} />;
});
EventLatestTeaser.displayName = "EventLatestTeaser";
