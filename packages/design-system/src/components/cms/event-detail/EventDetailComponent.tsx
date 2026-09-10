import { FC, PropsWithChildren } from "react";
import { EventDetailProps } from "../EventDetailProps";
import { RichText } from "@kickstartds/base/lib/rich-text";
import { EventLocation } from "../../event-location/EventLocationComponent";
import { Section } from "../../section/SectionComponent";
import { EventHeader } from "../../event-header/EventHeaderComponent";
import { Gallery } from "../../gallery/GalleryComponent";
import { Downloads } from "../../downloads/DownloadsComponent";
import { Headline } from "../../headline/HeadlineComponent";

export type { EventDetailProps };

export const EventDetail: FC<PropsWithChildren<EventDetailProps>> = ({
  title,
  categories,
  locations,
  description,
  intro,
  images,
  download,
}) => (
  <>
    <Section width="narrow" spaceAfter="none">
      <EventHeader title={title} categories={categories} intro={intro} />
    </Section>
    {locations && locations.length > 0 && (
      <Section width="default" content={{ mode: "list", gutter: "none" }}>
        <Headline
          text="Locations"
          level="h3"
          style="h3"
          className="dsa-event__locations-headline"
        />
        {locations.map((appointment, index) => (
          <EventLocation key={index} {...appointment} />
        ))}
      </Section>
    )}
    {description && (
      <Section width="narrow" spaceBefore="none">
        <RichText className="dsa-event__description" text={description} />
      </Section>
    )}
    <Section spaceBefore="none">
      <Gallery
        images={images}
        aspectRatio="wide"
        layout="smallTiles"
        lightbox
      />
    </Section>
    {download && download.length > 0 && (
      <Section
        width="narrow"
        spaceBefore="none"
        content={{
          mode: "list",
          gutter: "none",
        }}
        spaceAfter="none"
      >
        <Headline text="Downloads" level="h3" style="h3" />
        <Downloads download={download} />
      </Section>
    )}
    {
      <Section
        width="narrow"
        buttons={[
          {
            label: "See all Events",
            url: "/#",
          },
        ]}
      ></Section>
    }
  </>
);
EventDetail.displayName = "EventDetail";
