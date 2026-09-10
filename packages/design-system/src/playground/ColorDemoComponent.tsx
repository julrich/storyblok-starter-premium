import { Features } from "../components/features/FeaturesComponent";
import { Section } from "../components/section/SectionComponent";
import { Stats } from "../components/stats/StatsComponent";
import { TeaserCard } from "../components/teaser-card/TeaserCardComponent";
import { SelectField } from "@kickstartds/form/lib/select-field";
import { TextArea } from "@kickstartds/form/lib/text-area";
import { CheckboxGroup } from "@kickstartds/form/lib/checkbox-group";
import { RadioGroup } from "@kickstartds/form/lib/radio-group";
import { Button } from "../components/button/ButtonComponent";
import { SearchResult } from "../components/search-result/SearchResultComponent";
import { Breadcrumb } from "../components/breadcrumb/BreadcrumbComponent";
import { Downloads } from "../components/downloads/DownloadsComponent";
import { Pagination } from "../components/pagination/PaginationComponent";
import { TextField } from "@kickstartds/form/lib/text-field";
import { EventLatestTeaser } from "../components/event-latest-teaser/EventLatestTeaserComponent";
import { EventLocation } from "../components/event-location/EventLocationComponent";
import { EventListTeaser } from "../components/event-list-teaser/EventListTeaserComponent";
import { BlogAside } from "../components/blog-aside/BlogAsideComponent";

const ColorDemo = () => (
  <div className="playground-preview-page">
    <Section
      className="dsa-section--component-preview"
      content={{
        gutter: "large",
        mode: "tile",
      }}
      width="wide"
      spaceBefore="small"
      spaceAfter="small"
    >
      <TeaserCard
        imageRatio="landscape"
        headline="Empower Your Business"
        text="Leverage our expertise in creating scalable and robust applications using modern technologies."
        url={""}
        button={{
          label: "Get Started",
          chevron: true,
        }}
      />
      <Features
        ctas={{
          style: "link",
          toggle: true,
        }}
        feature={[
          {
            cta: {
              icon: "arrow-right",
              label: "Learn more",
              url: "#",
            },
            icon: "home",
            text: "Our design system allows for a scalable architecture, enabling you to build applications that can grow with your needs.",
            title: "Scalable Architecture",
          },
        ]}
        layout="smallTiles"
        style="stack"
      />

      <Stats
        stat={[
          {
            icon: "person",
            number: "150",
            title: "Users",
            description:
              "Active users on the platform taking advantage of the design system.",
          },
        ]}
      />
      <SearchResult
        imageColSize="none"
        initialMatch="Embracing a **sustainable** lifestyle."
        matches={[
          {
            snippet:
              "Learn how leading companies are integrating **sustainability**.",
            title: "Embracing Sustainability",
            url: "#",
          },
        ]}
        showLink
        title="GreenTech Summit"
        url="https://www.example.com/greentech-summit-2023"
      />
    </Section>
    <Section
      className="dsa-section--component-preview"
      width="wide"
      content={{
        gutter: "large",
        mode: "tile",
      }}
      spaceAfter="small"
      spaceBefore="none"
    >
      <EventListTeaser
        category="Buyers"
        ctaText="Show event"
        date="30.12.2025"
        location={{
          address: "Alexanderplatz 1<br />\n10178 Berlin",
          name: "Tech Conference Center",
        }}
        tags={["AI"]}
        text="The Future of AI is here and now - Join us to explore the latest advancements in artificial intelligence."
        time="10:00"
        title="The Future of AI"
        url="#"
      />
      <div
        style={{
          display: "flex",
          gap: "var(--ks-spacing-stack-m)",
          flexDirection: "column",
        }}
      >
        <EventLocation
          address="Alexanderplatz 1<br />
  10178 Berlin"
          dates={[
            {
              ariaLabel:
                "Register for the event on 18th September 2025 from 09:00 to 17:00",
              date: "18.09.2025",
              label: "Register",
              newTab: true,
              time: "09:00 – 17:00",
              url: "#",
            },
          ]}
          displayMode="spacious"
          links={[
            {
              label: "Open in Google Maps",
              newTab: true,
              url: "https://maps.google.com/?q=Berlin+Congress+Center",
            },
          ]}
          locationName="Berlin Congress Center"
        />
        <EventLatestTeaser
          ariaLabel="Event teaser for "
          calendar={{
            day: "30",
            month: "Dec",
          }}
          cta="Show event"
          date="12/30/2025"
          location="Berlin, Germany"
          title="The Future of AI"
          url="https://example.com"
        />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--ks-spacing-stack-m)",
        }}
      >
        <SelectField
          icon="chevron-down"
          label="Est dolore a debitis"
          options={[
            {
              label: "Option 1",
            },
            {
              label: "Option 2",
            },
            {
              label: "Option 3",
            },
          ]}
        />
        <TextField label="Your name" />
        <CheckboxGroup
          label={"Lorem Ipsum"}
          options={[
            {
              //@ts-expect-error
              checked: true,
              label: "Lorem Ipsum",
            },
            {
              label: "Ipsum Dolor",
            },
            {
              label: "Dolor Sit Amet",
              disabled: true,
            },
          ]}
        />
        <TextArea label="Your message" />
        <RadioGroup
          label={"Lorem Ipsum"}
          options={[
            {
              label: "Lorem Ipsum",
            },
            {
              //@ts-expect-error
              checked: true,
              label: "Ipsum Dolor",
            },
            {
              label: "Dolor Sit Amet",
              disabled: true,
            },
          ]}
        />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          justifyContent: "space-between",
        }}
      >
        <Button icon="arrow-right" variant="primary" label={"Learn more"} />
        <Button icon="date" variant="secondary" label={"Book appointment"} />
        <Button icon="upload" variant="tertiary" label={"Upload File"} />
        <BlogAside
          author={{
            byline: "CEO at Company",

            links: [
              {
                ariaLabel: "Link to Isabella Doe's social media profile",
                icon: "twitter",
                label: "jane_smith",
                newTab: false,
                url: "tel:+4922868896620",
              },
              {
                ariaLabel: "Link to Isabella Doe's social media profile",
                icon: "email",
                label: "jane.smith@example.com",
                newTab: false,
                url: "mailto:mail@example.com",
              },
            ],
            name: "Jane Smith",
          }}
          date="12/30/2022"
          readingTime="5 min read"
          socialSharing={[
            {
              icon: "twitter",
              title: "Share on Twitter",
              url: "https://twitter.com/share?text=Check%20this%20out!&url=https://example.com",
            },
            {
              icon: "linkedin",
              title: "Share on LinkedIn",
              url: "https://twitter.com/share?text=Check%20this%20out!&url=https://example.com",
            },
          ]}
        />
      </div>
    </Section>
    <Section
      className="dsa-section--component-preview"
      spaceAfter="small"
      spaceBefore="none"
      width="wide"
    >
      <div
        style={{
          display: "flex",
          gap: "var(--ks-spacing-inline-m)",
          width: "100%",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ flexGrow: "1" }}>
          <Breadcrumb
            pages={[
              {
                label: "Page 1",
                url: "https://example.com/page1",
              },
              {
                label: "Page 2",
                url: "https://example.com/page2",
              },
              {
                label: "Page 3",
                url: "https://example.com/page3",
              },
            ]}
          />
        </div>
        <div style={{ flexGrow: "3" }}>
          <Downloads
            download={[
              {
                format: "PDF",
                name: "Product Brochure",
                previewImage: "img/offset-image.png",
                size: "2.5 MB",
                url: "#",
              },
            ]}
          />
        </div>
        <div style={{ flexGrow: "3" }}>
          <Pagination
            ariaLabels={{
              goToPage: "Go to page",
              nextPage: "Go to next page",
              previousPage: "Go to previous page",
              skipToFirstPage: "Skip to first page",
              skipToLastPage: "Skip to last page",
            }}
            pages={[
              {
                active: false,
                url: "https://example.com/page1",
              },
              {
                active: true,
                url: "https://example.com/page2",
              },
              {
                active: false,
                url: "https://example.com/page3",
              },
              {
                active: false,
                url: "https://example.com/page4",
              },
            ]}
          />
        </div>
      </div>
    </Section>
  </div>
);

export default ColorDemo;
