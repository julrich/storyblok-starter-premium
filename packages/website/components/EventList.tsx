import { ComponentProps } from "react";
import { SbBlokData, storyblokEditable } from "@storyblok/react";
import { Section } from "@kickstartds/design-system/components/section/index.js";
import { EventList as DsaEventList } from "@kickstartds/design-system/components/event-list/index.js";
import { SplitWeightedContextDefault as SplitWeighted } from "@kickstartds/design-system/components/split-weighted/index.js";
import { RichText } from "@kickstartds/base/lib/rich-text";
import { Pagination } from "@kickstartds/design-system/components/pagination/index.js";
import { EventFilter } from "@kickstartds/design-system/components/event-filter/index.js";
import { EventListTeaser } from "@kickstartds/design-system/components/event-list-teaser/index.js";
import { unflatten } from "@/helpers/unflatten";

type PageProps = {
  blok: ComponentProps<typeof DsaEventList> & SbBlokData;
};

const EventList: React.FC<PageProps> = ({ blok }) => {
  if (blok) {
    const { filter, events } = blok;

    return (
      <main {...storyblokEditable(blok)}>
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
                {events &&
                  events.length > 0 &&
                  events.map((event, index) => (
                    // @ts-expect-error
                    <EventListTeaser key={index} {...unflatten(event)} />
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
      </main>
    );
  }
  return null;
};

export default EventList;
