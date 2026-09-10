import { forwardRef, createContext, useContext, HTMLAttributes } from "react";
import { EventLatestProps } from "./EventLatestProps";
import "./event-latest.scss";
import { EventLatestTeaser } from "../event-latest-teaser/EventLatestTeaserComponent";
import { deepMergeDefaults } from "../helpers";
import defaults from "./EventLatestDefaults";

export type { EventLatestProps };

export const EventLatestContextDefault = forwardRef<
  HTMLDivElement,
  EventLatestProps & HTMLAttributes<HTMLDivElement>
>(({ events }, ref) => {
  return (
    <div className="dsa-event-latest" ref={ref}>
      {events.map((event, index) => (
        <EventLatestTeaser key={index} {...event} />
      ))}
    </div>
  );
});

export const EventLatestContext = createContext(EventLatestContextDefault);
export const EventLatest = forwardRef<
  HTMLDivElement,
  EventLatestProps & HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const Component = useContext(EventLatestContext);
  return <Component {...deepMergeDefaults(defaults, props)} ref={ref} />;
});
EventLatest.displayName = "EventLatest";
