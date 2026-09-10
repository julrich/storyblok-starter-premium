import { Section } from "../components/section/SectionComponent";
import { TeaserCard } from "../components/teaser-card/TeaserCardComponent";
import { SelectField } from "@kickstartds/form/lib/select-field";
import { TextArea } from "@kickstartds/form/lib/text-area";
import { CheckboxGroup } from "@kickstartds/form/lib/checkbox-group";
import { RadioGroup } from "@kickstartds/form/lib/radio-group";
import { Button } from "../components/button/ButtonComponent";
import { TextField } from "@kickstartds/form/lib/text-field";
import { EventLatestTeaser } from "../components/event-latest-teaser/EventLatestTeaserComponent";
import { EventLocation } from "../components/event-location/EventLocationComponent";
import { EventListTeaser } from "../components/event-list-teaser/EventListTeaserComponent";

import { NavDropdown } from "../components/nav-dropdown/NavDropdownComponent";

import { Faq } from "../components/faq/FaqComponent";
import { SearchFilter } from "../components/search-filter/SearchFilterComponent";
import { CookieConsentDialog } from "../components/cookie-consent/CookieConsentDialogPartial";
import { SearchResult } from "../components/search-result/SearchResultComponent";
import { Divider } from "../components/divider/DividerComponent";

const BorderDemo = () => (
  <div className="playground-preview-page">
    <Section
      width="wide"
      content={{
        mode: "default",
      }}
      spaceAfter="none"
      spaceBefore="none"
    >
      <CookieConsentDialog
        open
        dialog={{
          alwaysActiveLabel: "Always Active",
          buttons: {
            acceptLabel: "Accept All",
            rejectLabel: "Reject All",
            savePreferencesLabel: "Save Preferences",
          },
          description: "Manage your cookie preferences below.",
          options: [
            {
              description:
                "These cookies help us understand how our visitors interact with the website.",
              key: "measurement",
              name: "Analytics Cookies",
            },
          ],
          required: [
            {
              description:
                "These cookies are necessary for the website to function.",
              key: "necessary",
              name: "Essential Cookies",
            },
          ],
          title: "Cookie Preferences",
          toggleLabels: {
            accept: "Accept",
            reject: "Reject",
          },
        }}
      />
      <EventListTeaser
        category="Buyers"
        ctaText="Show event"
        date="30.12.2025"
        location={{
          address: "Alexanderplatz 1<br />\n10178 Berlin",
          name: "Tech Conference Center",
        }}
        tags={["AI"]}
        text="The Future of AI is here and now - Join us to explore the latest advancements in artificial intelligence. Discover how AI is transforming industries and shaping our world. Engage with experts, innovators, and thought leaders as we delve into the opportunities and challenges of AI technology."
        time="10:00"
        title="The Future of AI"
        url="#"
      />
    </Section>
    <Section spaceBefore="small" spaceAfter="small" width="wide">
      <Divider />
    </Section>
    <Section
      className="dsa-section--component-preview"
      content={{
        mode: "default",
        gutter: "large",
      }}
      width="wide"
      spaceBefore="none"
      spaceAfter="none"
    >
      <TeaserCard
        label="Label"
        button={{
          chevron: false,
          hidden: true,
          label: "Learn more",
        }}
        headline="Explore This Topic"
        image="img/placeholder/avatar-wide.svg"
        imageRatio="wide"
        layout="stack"
        text="This teaser introduces a topic or piece of content and provides a short summary to encourage further exploration."
        url="#"
      />
      <SearchResult
        imageColSize="none"
        initialMatch="Embracing a **sustainable** lifestyle can significantly reduce your environmental impact. "
        matches={[
          {
            snippet:
              "Learn how leading companies are integrating **sustainability** into their core strategies.",
            title: "Keynote: Embracing Sustainability",
            url: "#",
          },
          {
            snippet:
              "Business models that prioritize **sustainability** are shared by industry experts in this session.",
            title: "Panel: Sustainability in Practice",
            url: "#",
          },
          {
            snippet:
              "Discover innovative solutions that drive **sustainability** in various sectors.",
            title: "Workshop: Innovative Sustainability Solutions",
            url: "#",
          },
        ]}
        previewImage="img/full-shot-different-people-working-together.png"
        showLink
        title="GreenTech Summit 2023"
        url="https://www.example.com/greentech-summit-2023"
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--ks-spacing-stack-m)",
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
        <Faq
          questions={[
            {
              answer:
                "Yes. All content within this component can be fully customized. Text length, wording, and structure can be adapted to match different audiences, communication styles, or content strategies. The component supports both short, concise answers and more detailed explanations, depending on editorial needs.",
              question: "Can the content be customized?",
            },
            {
              answer:
                "This component can be used across different pages and contexts, such as product pages, service descriptions, or informational sections.",
              question: "What is this component used for?",
            },
          ]}
        />
      </div>
    </Section>
    <Section spaceBefore="small" spaceAfter="small" width="wide">
      <Divider />
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
      <TeaserCard
        label="Label"
        button={{
          chevron: false,
          hidden: true,
          label: "Learn more",
        }}
        headline="Explore This Topic"
        image="img/people-brainstorming-work-meeting.png"
        imageRatio="wide"
        layout="compact"
        text="This teaser introduces a topic or piece of content and provides a short summary to encourage further exploration."
        url="#"
      />
      <div
        style={{
          display: "flex",
          gap: "var(--ks-spacing-stack-m)",
          flexDirection: "column",
        }}
      >
        <SearchFilter
          categories={[
            {
              amount: "10",
              title: "Pages",
              url: "#",
            },
            {
              amount: "5",
              title: "News",
              url: "#",
            },
            {
              amount: "8",
              title: "Blog Posts",
              url: "#",
            },
          ]}
          title="Search by category"
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
          gap: "var(--ks-spacing-stack-m)",
        }}
      >
        <Button icon="arrow-right" variant="primary" label={"Learn more"} />
        <Button icon="date" variant="secondary" label={"Book appointment"} />
        <Button icon="upload" variant="tertiary" label={"Upload File"} />
        <NavDropdown
          style={{
            position: "relative",
            height: "fit-content",
            top: "0",
            margin: "0",
          }}
          items={[
            {
              label: "Consulting",
              url: "#",
            },
            {
              label: "Implementation",
              url: "#",
            },
            {
              label: "Support",
              url: "#",
            },
            {
              label: "Training",
              url: "#",
            },
            {
              label: "Custom Solutions",
              url: "#",
            },
          ]}
        />
      </div>
    </Section>
  </div>
);

export default BorderDemo;
