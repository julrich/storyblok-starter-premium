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
import { CookieConsent } from "../components/cookie-consent/CookieConsentComponent";
import { Hero } from "../components/hero/HeroComponent";
import { NavDropdown } from "../components/nav-dropdown/NavDropdownComponent";
import { SplitWeighted } from "../components/split-weighted/SplitWeightedComponent";

const ShadowDemo = () => (
  <div className="playground-preview-page">
    <Section
      className="dsa-section--component-preview"
      content={{
        mode: "default",
        gutter: "large",
      }}
      width="wide"
      spaceBefore="small"
      spaceAfter="small"
    >
      <SplitWeighted
        asideLayout={{
          stretchVertically: true,
        }}
        mainLayout={{ minWidth: "narrow" }}
        main={
          <Hero
            buttons={[
              {
                icon: "",
                label: "Learn more",
                url: "#",
              },
              {
                icon: "",
                label: "All our Services",
                url: "#",
              },
            ]}
            headline="Main message headline"
            height="small"
            image={{
              indent: "none",
              src: "https://picsum.photos/seed/kdsvisual/640/270",
              srcDesktop: "img/placeholder/image-gallery-02.svg",
              srcMobile: "img/placeholder/image-gallery-02.svg",
              srcTablet: "img/placeholder/image-gallery-02.svg",
            }}
            mobileTextBelow={false}
            skipButton
            text="Use this area to add a short description. It provides additional context and helps structure content within the component."
            textPosition="left"
            textbox
          />
        }
        aside={
          <TeaserCard
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
        }
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

    <Section>
      <CookieConsent
        notice={{
          displayMode: "card",
          title: "We use cookies",
          acceptButton: {
            label: "Accept All",
          },
          rejectButton: {
            label: "Reject All",
          },
          customizeButton: {
            label: "Customize",
            variant: "tertiary",
          },
          decisionButtonVariant: "primary",
          description:
            "We use cookies to enhance your experience on our website. You can choose which cookies to accept.",
        }}
        revisitButton={{
          label: "Manage Cookies",
        }}
        dialog={{
          title: "Cookie Preferences",
          description: "Manage your cookie preferences below.",
          required: [
            {
              key: "necessary",
              name: "Essential Cookies",
              description:
                "These cookies are necessary for the website to function.",
            },
          ],
          buttons: {
            acceptLabel: "Accept All",
            rejectLabel: "Reject All",
            savePreferencesLabel: "Save Preferences",
          },
          options: [
            {
              key: "measurement",
              name: "Analytics Cookies",
              description:
                "These cookies help us understand how our visitors interact with the website.",
            },
            {
              key: "marketing",
              name: "Marketing Cookies",
              description:
                "These cookies are used to deliver advertisements that are relevant to you.",
            },
            {
              key: "functionality",
              name: "Functional Cookies",
              description:
                "These cookies allow the website to remember choices you make and provide enhanced, more personal features.",
            },
            {
              key: "experience",
              name: "Performance Cookies",
              description:
                "These cookies collect information about how visitors use the website, such as which pages are visited most often and if they get error messages from web pages.",
            },
          ],
          toggleLabels: {
            accept: "Accept",
            reject: "Reject",
          },
          alwaysActiveLabel: "Always Active",
        }}
      />
    </Section>
  </div>
);

export default ShadowDemo;
