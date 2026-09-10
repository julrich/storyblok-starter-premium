import { FC, PropsWithChildren } from "react";
import { EventListProps } from "../EventListProps";

import { Section } from "../../section/SectionComponent";
import { SplitWeighted } from "../../split-weighted/SplitWeightedComponent";
import { EventFilter } from "../../event-filter/EventFilterComponent";
import { EventListTeaser } from "../../event-list-teaser/EventListTeaserComponent";
import { RichText } from "@kickstartds/base/lib/rich-text";
import { Pagination } from "../../pagination/PaginationComponent";

export type { EventListProps };

export const EventList: FC<PropsWithChildren<EventListProps>> = ({
  filter,
  events,
}) => (
  <>
    <Section width="wide">
      <SplitWeighted
        verticalAlign="sticky"
        mainLayout={{
          minWidth: "narrow",
        }}
        asideLayout={{
          gutter: "small",
        }}
        order={{
          desktop: "asideFirst",
          mobile: "asideFirst",
        }}
        aside={
          <>
            <EventFilter {...filter} />
            <RichText text={"425 Veranstaltungen"} />
          </>
        }
        main={
          <>
            {events.map((event, index) => (
              <EventListTeaser key={index} {...event} />
            ))}
            <Pagination
              pages={[
                {
                  url: "https://example.com/page1",
                },
                {
                  url: "https://example.com/page2",
                },
                {
                  url: "https://example.com/page3",
                },
                {
                  url: "https://example.com/page4",
                },
                {
                  url: "https://example.com/page5",
                },
                {
                  url: "https://example.com/page6",
                  active: true,
                },
                {
                  url: "https://example.com/page7",
                },
                {
                  url: "https://example.com/page8",
                },
                {
                  url: "https://example.com/page9",
                },
                {
                  url: "https://example.com/page10",
                },
                {
                  url: "https://example.com/page11",
                },
                {
                  url: "https://example.com/page12",
                },
              ]}
            />
          </>
        }
      />
    </Section>
  </>
);
EventList.displayName = "EventList";
