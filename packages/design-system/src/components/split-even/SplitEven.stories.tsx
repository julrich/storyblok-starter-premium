import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { SplitEven } from "./SplitEvenComponent";
import schema from "./split-even.schema.dereffed.json";
import customProperties from "./split-even-tokens.json";
import { Logos } from "../logos/LogosComponent";
import { Headline } from "../headline/HeadlineComponent";
import { Faq } from "../faq/FaqComponent";
import { TextArea } from "@kickstartds/form/lib/text-area";
import { Button } from "../button/ButtonComponent";
import { Cta } from "../cta/CtaComponent";
import { TeaserCard } from "../teaser-card/TeaserCardComponent";

const meta: Meta = {
  title: "Layout/Split Even",
  component: SplitEven,
  parameters: {
    jsonschema: { schema },
    cssprops: { customProperties },
  },
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof SplitEven>;

export const TextWithLogos: Story = {
  parameters: {
    viewport: {
      width: 1690,
      height: 530,
    },
  },
  args: pack({
    contentGutter: "small",
    verticalAlign: "center",
    contentMinWidth: "wide",
    firstComponents: (
      <>
        <Cta
          highlightText
          headline="Discover our solutions for Industry 4.0"
          text={`We help companies make their production processes more efficient and future-proof through digitalization, automation, and smart technologies. Rely on our many years of experience in the industrial sector.

Revolutionize your manufacturing with our tailored solutions designed to meet the specific needs of your industry.`}
          buttons={[{ label: "Learn more" }]}
        />
      </>
    ),
    secondComponents: (
      <>
        <Logos
          logosPerRow={3}
          logo={[
            {
              src: "img/logos/logoipsum-344.svg",
              alt: "Logo 1",
            },
            {
              src: "img/logos/logoipsum-347.svg",
              alt: "Logo 2",
            },
            {
              src: "img/logos/logoipsum-352.svg",
              alt: "Logo 3",
            },
            {
              src: "img/logos/logoipsum-356.svg",
              alt: "Logo 4",
            },
            {
              src: "img/logos/logoipsum-358.svg",
              alt: "Logo 5",
            },
            {
              src: "img/logos/logoipsum-369.svg",
              alt: "Logo 6",
            },
          ]}
        />
      </>
    ),
  }),
};

export const FAQWithForm: Story = {
  parameters: {
    viewport: {
      width: 1440,
      height: 464,
    },
  },
  args: pack({
    contentGutter: "small",
    verticalAlign: "top",
    sectionMinWidth: "medium",
    horizontalGutter: "large",
    verticalGutter: "large",
    firstComponents: (
      <>
        <Headline text={"Frequently Asked Questions"} level={"h2"} />
        <Faq
          questions={[
            {
              answer:
                "Experience the speed & scalability unlike anything seen before with our Headless CMS powered websites, web apps & composable architecture.",
              question:
                "What are the benefits of investing in a Design System?",
            },
            {
              answer:
                "Experience the speed & scalability unlike anything seen before with our Headless CMS powered websites, web apps & composable architecture.",
              question: "What is a Design System?",
            },
            {
              answer:
                "A Headless CMS plays a crucial role in a Design System by providing a content-first approach. It separates the back-end content from the front-end presentation layer, allowing for seamless integration with any design system. This results in a flexible, scalable, and platform-agnostic system that ensures content consistency across all platforms and devices.",
              question:
                "What is the role of a Headless CMS in a Design System?",
            },
          ]}
        />
      </>
    ),
    secondComponents: (
      <>
        <Headline
          text="Still have questions?"
          level="h3"
          style="h3"
          spaceAfter="minimum"
        />
        <TextArea label="Ask us directly!" />
        <Button label={"Submit"} />
      </>
    ),
  }),
};

export const MainTeaserWithGrid: Story = {
  parameters: {
    viewport: {
      width: 1440,
      height: 464,
    },
  },
  args: pack({
    contentGutter: "medium",
    verticalAlign: "stretch",
    sectionMinWidth: "narrow",
    horizontalGutter: "small",
    verticalGutter: "small",
    secondLayout: {
      layout: "smallTiles",
      stretchVertically: true,
      gutter: "small",
    },
    firstLayout: {
      stretchVertically: true,
      gutter: "small",
    },
    firstComponents: (
      <>
        <TeaserCard
          layout="compact"
          url={""}
          headline="Lorem Ipsum"
          image="img/placeholder/avatar-wide.svg"
          text="Lorem Ispum dolor sit amet, consectetur adipiscing elit."
          imageRatio="landscape"
          button={{
            label: "Mehr erfahren",
            chevron: true,
          }}
        />
      </>
    ),
    secondComponents: (
      <>
        <TeaserCard
          layout="compact"
          url={""}
          headline="Dolor Sit Amet"
          image="img/placeholder/avatar-wide.svg"
        />
        <TeaserCard
          layout="compact"
          url={""}
          headline="Consectetur Adipiscing"
          image="img/placeholder/avatar-wide.svg"
        />
        <TeaserCard
          layout="compact"
          url={""}
          headline="Eiusmod Tempor"
          image="img/placeholder/avatar-wide.svg"
        />
        <TeaserCard
          layout="compact"
          url={""}
          headline="Incididunt Ut Labore"
          image="img/placeholder/avatar-wide.svg"
        />
        <TeaserCard
          layout="compact"
          url={""}
          headline="Et Dolore Magna"
          image="img/placeholder/avatar-wide.svg"
        />
        <TeaserCard
          layout="compact"
          url={""}
          headline="Ut Enim Ad Minim"
          image="img/placeholder/avatar-wide.svg"
        />
      </>
    ),
  }),
};
