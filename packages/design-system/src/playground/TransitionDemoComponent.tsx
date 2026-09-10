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
import { NavDropdown } from "../components/nav-dropdown/NavDropdownComponent";
import { ContentNav } from "../components/content-nav/ContentNavComponent";
import { BlogTeaser } from "../components/blog-teaser/BlogTeaserComponent";
import { SplitWeighted } from "../components/split-weighted/SplitWeightedComponent";
import { Downloads } from "../components/downloads/DownloadsComponent";
import { Faq } from "../components/faq/FaqComponent";

const TransitionDemo = () => (
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
      <TeaserCard
        button={{
          chevron: true,
          label: "Learn more",
        }}
        image="img/placeholder/avatar-wide.svg"
        imageRatio="landscape"
        text="Use this area to add a short description. It provides additional context and helps structure content within the component."
        headline="Teaser card headline"
        url="#"
      />
      <TeaserCard
        button={{
          chevron: true,
          label: "Learn more",
        }}
        layout="compact"
        image="img/people-brainstorming-work-meeting.png"
        imageRatio="landscape"
        text="Use this area to add a short description. It provides additional context and helps structure content within the component."
        headline="Teaser card headline"
        url="#"
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--ks-spacing-stack-s)",
        }}
      >
        <Downloads
          download={[
            {
              format: "PDF",
              name: "Product Brochure",
              previewImage: "img/offset-image.png",
              size: "2.5 MB",
              url: "#",
            },
            {
              format: "PDF",
              name: "Company Brochure",
              previewImage:
                "img/kickstartDS/CMS-Starter producthunt-slide-01.svg",
              size: "3.2 MB",
              url: "#",
            },
            {
              format: "DOC",
              name: "User Guide",
              size: "20 KB",
              url: "#",
            },
            {
              format: "PPT",
              name: "Presentation",
              size: "5 MB",
              url: "#",
            },
          ]}
        />
        <Faq
          questions={[
            {
              question: "Is this component mobile-friendly?",
              answer:
                "Yes, this component is fully responsive and adapts to different screen sizes for optimal viewing on all devices.",
            },
            {
              question: "What is this component used for?",
              answer:
                "A FAQ component is used to display frequently asked questions and their answers in a structured format.",
            },
          ]}
        />
      </div>
    </Section>
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
        order={{
          desktop: "asideFirst",
        }}
        main={
          <BlogTeaser
            alt="Image of a business team working"
            author={{
              image: "img/people/author-emily.png",
              name: "Jane Smith",
              title: "Senior AI Researcher",
            }}
            date="12/30/2022"
            headline="The Future of AI"
            image="img/close-up-young-business-team-working.png"
            link={{
              text: "Read article",
              url: "https://example.com",
            }}
            readingTime="5 min read"
            tags={[
              {
                entry: "Technology",
              },
              {
                entry: "AI",
              },
            ]}
            teaserText="Dive into the future of AI in this detailed blog post. Discover how technology is rapidly evolving, the impact of AI on various industries, and what to expect in the coming years. Learn about the latest advancements, challenges, and the potential solutions that AI brings to the table."
          />
        }
        aside={
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
        <ContentNav
          initiallyShown={4}
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
          ]}
          topic="Descriptive Topic"
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
          name="Checkboxes"
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
          name="Radio Buttons"
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
            {
              label: "Integration Services",
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

export default TransitionDemo;
