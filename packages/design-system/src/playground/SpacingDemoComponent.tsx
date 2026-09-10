import { Features } from "../components/features/FeaturesComponent";
import { Section } from "../components/section/SectionComponent";
import { Stats } from "../components/stats/StatsComponent";
import { TeaserCard } from "../components/teaser-card/TeaserCardComponent";
import { SearchResult } from "../components/search-result/SearchResultComponent";
import { Breadcrumb } from "../components/breadcrumb/BreadcrumbComponent";
import { Downloads } from "../components/downloads/DownloadsComponent";
import { EventLatestTeaser } from "../components/event-latest-teaser/EventLatestTeaserComponent";
import { EventLocation } from "../components/event-location/EventLocationComponent";
import { EventListTeaser } from "../components/event-list-teaser/EventListTeaserComponent";
import { BlogAside } from "../components/blog-aside/BlogAsideComponent";
import { EventFilter } from "../components/event-filter/EventFilterComponent";
import { BusinessCard } from "../components/business-card/BusinessCardComponent";
import { ContentNav } from "../components/content-nav/ContentNavComponent";

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
      spaceAfter="none"
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
    </Section>
    <Section
      className="dsa-section--component-preview"
      width="wide"
      content={{
        mode: "default",
      }}
      spaceAfter="none"
      spaceBefore="small"
    >
      <div
        style={{
          height: "fit-content",
        }}
      >
        <EventFilter
          applyButton={{
            label: "Filter Appointments",
          }}
          categories={{
            categoryCheckboxes: ["All", "Buyers", "Sellers", "Partners"],
            title: "Categories",
            toggle: true,
          }}
          datePicker={{
            dateFromInput: {
              label: "From",
              placeholder: "Select a date",
            },
            dateToInput: {
              label: "To",
              placeholder: "Select a date",
            },
            title: "Find Appointment",
            toggle: true,
          }}
          resetButton={{
            label: "Reset Filters",
          }}
        />
      </div>

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
          gap: "var(--ks-spacing-stack-s)",
        }}
      >
        <ContentNav
          initiallyShown={3}
          links={[
            {
              label: "Market Insights",
              url: "#",
            },
            {
              label: "Industry Trends",
              url: "#",
            },
            {
              label: "Competitor Analysis",
              url: "#",
            },
            {
              label: "Customer Feedback",
              url: "#",
            },
            {
              label: "Sales Data",
              url: "#",
            },
            {
              label: "Product Development",
              url: "#",
            },
            {
              label: "Supply Chain Management",
              url: "#",
            },
            {
              label: "Financial Performance",
              url: "#",
            },
            {
              label: "Regulatory Compliance",
              url: "#",
            },
          ]}
          topic="Industry Intelligence"
        />
        <BusinessCard
          address="1234 Business Lane<br />Suite 567"
          avatar={{
            alt: "Emily Johnson",
            src: "img/people/contact-person.png",
          }}
          buttons={[
            {
              label: "Market Insights",
              url: "#",
            },
          ]}
          contact={[
            {
              icon: "phone",
              label: "+1 234 567 890",
              url: "tel:+1234567890",
            },
            {
              icon: "email",
              label: "emily@example.com",
              url: "mailto:emily@example.com",
            },
            {
              icon: "linkedin",
              label: "Emily Johnson",
              url: "#",
            },
          ]}
          logo={{
            alt: "Business Logo",
            src: "logo.svg",
            url: "#",
          }}
          topic="Industry Intelligence"
        />
      </div>
    </Section>
    <Section content={{ mode: "default" }} spaceBefore="small" width="wide">
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
          flexDirection: "column",
          gap: "var(--ks-spacing-stack-l)",
        }}
      >
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
    </Section>
  </div>
);

export default ColorDemo;
