import { ComponentProps } from "react";
import { SbBlokData, storyblokEditable } from "@storyblok/react";
import { Section } from "@kickstartds/design-system/components/section/index.js";
import { EventHeader } from "@kickstartds/design-system/components/event-header/index.js";
import { EventLocation } from "@kickstartds/design-system/components/event-location/index.js";
import { EventDetail as DsaEventDetail } from "@kickstartds/design-system/components/event-detail/index.js";
import { Headline } from "@kickstartds/design-system/components/headline/index.js";
import { Gallery } from "@kickstartds/design-system/components/gallery/index.js";
import { RichText } from "@kickstartds/base/lib/rich-text";
import { Downloads } from "@kickstartds/design-system/components/downloads/index.js";
import { pagefindAttributes } from "@/helpers/pagefind";

type PageProps = {
  blok: ComponentProps<typeof DsaEventDetail> & SbBlokData;
  pagefindUrl?: string;
};

const EventDetail: React.FC<PageProps> = ({ blok, pagefindUrl }) => {
  if (blok) {
    const {
      title,
      categories,
      locations,
      description,
      intro,
      images,
      download,
    } = blok;

    return (
      <main {...storyblokEditable(blok)} {...pagefindAttributes(pagefindUrl)}>
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
        {images && images.length > 0 && (
          <Section spaceBefore="none">
            <Gallery
              images={images}
              aspectRatio="wide"
              layout="smallTiles"
              lightbox
            />
          </Section>
        )}
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
      </main>
    );
  }
  return null;
};

export default EventDetail;
