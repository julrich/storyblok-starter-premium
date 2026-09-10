import { createContext, forwardRef, useContext } from "react";
import { EventHeaderProps } from "./EventHeaderProps";
import { Headline } from "../headline/HeadlineComponent";
import { Text } from "../text/TextComponent";
import { TagLabel } from "@kickstartds/base/lib/tag-label";
import "./event-header.scss";
import { deepMergeDefaults } from "../helpers";
import defaults from "./EventHeaderDefaults";

export type { EventHeaderProps };

export const EventHeaderContextDefault = forwardRef<
  HTMLDivElement,
  EventHeaderProps
>(({ title, categories, intro }, ref) => (
  <div className="dsa-event-header" ref={ref}>
    {categories && categories.length > 0 && (
      <div className="dsa-event-header__categories">
        {categories.map((category, index) => (
          <TagLabel
            className="dsa-event__category"
            label={category?.label}
            key={index}
          />
        ))}
      </div>
    )}
    <Headline text={title} level={"h1"} />
    {intro && <Text highlightText text={intro} />}
  </div>
));

export const EventHeaderContext = createContext(EventHeaderContextDefault);
export const EventHeader = forwardRef<HTMLDivElement, EventHeaderProps>(
  (props, ref) => {
    const Component = useContext(EventHeaderContext);
    return <Component {...deepMergeDefaults(defaults, props)} ref={ref} />;
  }
);
EventHeader.displayName = "EventHeader";
