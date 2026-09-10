import { Section } from "../components/section/SectionComponent";
import { SelectField } from "@kickstartds/form/lib/select-field";
import { TextArea } from "@kickstartds/form/lib/text-area";
import { CheckboxGroup } from "@kickstartds/form/lib/checkbox-group";
import { Button } from "../components/button/ButtonComponent";
import { TeaserCard } from "../components/teaser-card/TeaserCardComponent";
import { RadioGroup } from "@kickstartds/form/lib/radio-group";
import { TextField } from "@kickstartds/form/lib/text-field";
import { Headline } from "../components/headline/HeadlineComponent";
import { Downloads } from "../components/downloads/DownloadsComponent";
import { Breadcrumb } from "../components/breadcrumb/BreadcrumbComponent";
import { SearchResult } from "../components/search-result/SearchResultComponent";
import { Features } from "../components/features/FeaturesComponent";
import { Stats } from "../components/stats/StatsComponent";
import { Cta } from "../components/cta/CtaComponent";

const FontDemo = () => (
  <div className="playground-preview-page">
    <Section
      content={{
        mode: "default",
        gutter: "large",
      }}
      spaceAfter="small"
      width="wide"
    >
      <Cta
        highlightText
        headline="Empowering Digital Transformation at Scale"
        sub="Unlocking Synergies for Next-Gen Business Impact"
        text="Our mission is clear: **drive innovation** through seamless integration and agile methodologies. Harness future-ready solutions for *cross-functional alignment* and operational excellence. We champion collaborative ecosystems that accelerate value creation."
      />

      <div>
        <Cta
          headline="Accelerate Outcomes with Strategic Vision"
          sub="Elevate Experiences with Purposeful Design"
          text="We deliver:
- Data-driven, measurable results
- *Holistic* stakeholder engagement

`// Example: driveValue(innovation)`

> Empowering tomorrow, today.
"
        />
      </div>
    </Section>
    <Section
      content={{
        mode: "default",
      }}
      width="wide"
      spaceBefore="none"
      spaceAfter="small"
    >
      <TeaserCard
        headline="Experience Seamless Digital Enablement"
        text="Discover how modular, open-source solutions unlock scalable opportunities for every enterprise."
        url={"https://basic.design-system.agency/"}
        button={{
          label: "Browse basic Demo",
        }}
      />
      <Stats
        stat={[
          {
            icon: "person",
            number: "150",
            title: "Active Innovators",
            description:
              "Visionaries leveraging our platform to maximize digital potential.",
          },
        ]}
      />
      <SearchResult
        imageColSize="none"
        initialMatch="Driving **transformational** change."
        matches={[
          {
            snippet:
              "Explore how industry leaders champion **innovation** at scale.",
            title: "Innovation Leadership Forum",
            url: "#",
          },
        ]}
        showLink
        title="Future Conference"
        url="https://www.example.com/futurevision-2025"
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
            text: "Empower your business with adaptive frameworks, ensuring future-proof scalability and robust performance.",
            title: "Adaptive Frameworks",
          },
        ]}
        layout="smallTiles"
        style="stack"
      />
    </Section>
    <Section
      content={{
        tileWidth: "medium",
        gutter: "large",
        mode: "default",
      }}
      width="wide"
      spaceBefore="small"
      spaceAfter="small"
    >
      <TeaserCard
        headline="Basic Agency Website Demo"
        text="Compare what the free version, using Open Source components only, can already offer you and your team."
        url={"https://basic.design-system.agency/"}
        button={{
          label: "Browse basic Demo",
        }}
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
    </Section>
    <Section
      width="wide"
      spaceBefore="small"
      spaceAfter="small"
      content={{
        gutter: "large",
        mode: "default",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--ks-spacing-stack-m)",
        }}
      >
        <Headline
          text="Unlock Value with Strategic Partnerships"
          sub="Collaborate for exponential growth"
          spaceAfter="minimum"
          level="h3"
          style="h3"
        />
        <TextArea label="Your message" />
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
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--ks-spacing-stack-m)",
        }}
      >
        <Headline
          text="Optimize Processes for Maximum Impact"
          level="h4"
          style="h4"
          spaceAfter="minimum"
        />
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
        <Breadcrumb
          pages={[
            {
              label: "Home",
              url: "https://example.com/home",
            },
            {
              label: "Solutions",
              url: "https://example.com/solutions",
            },
            {
              label: "Insights",
              url: "https://example.com/insights",
            },
          ]}
        />
        <Downloads
          download={[
            {
              format: "PDF",
              name: "Visionary Solutions Overview",
              previewImage: "img/offset-image.png",
              size: "2.5 MB",
              url: "#",
            },
          ]}
        />
        <Button
          style={{ width: "fit-content" }}
          label="Engage Now"
          size="large"
        />
        <Button
          style={{ width: "fit-content" }}
          label="Discover More"
          size="medium"
        />
        <Button
          style={{ width: "fit-content" }}
          label="Get Started"
          size="small"
        />
      </div>
    </Section>
  </div>
);

export default FontDemo;

export const Font = {};
