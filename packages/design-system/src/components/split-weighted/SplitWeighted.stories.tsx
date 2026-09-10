import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { SplitWeighted } from "./SplitWeightedComponent";
import { Text } from "../text/TextComponent";
import schema from "./split-weighted.schema.dereffed.json";
import customProperties from "./split-weighted-tokens.json";
import { Headline } from "../headline/HeadlineComponent";
import { Contact } from "../contact/ContactComponent";
import { TeaserCard } from "../teaser-card/TeaserCardComponent";
import { Cta } from "../cta/CtaComponent";
import { ImageText } from "../image-text/ImageTextComponent";

const meta: Meta = {
  title: "Layout/Split Weighted",
  component: SplitWeighted,
  parameters: {
    jsonschema: { schema },
    cssprops: { customProperties },
  },
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof SplitWeighted>;

export const TextWithContact: Story = {
  parameters: {
    viewport: {
      width: 1630,
      height: 376,
    },
  },
  args: pack({
    verticalGutter: "large",
    asideLayout: {
      minWidth: "wide",
    },
    main: (
      <>
        <Cta
          headline="Discover our solutions for Industry 4.0"
          text={`We help companies make their production processes more efficient and future-proof through digitalization, automation, and smart technologies. Rely on our many years of experience in the industrial sector.

Revolutionize your manufacturing with our tailored solutions designed to meet the specific needs of your industry.`}
          buttons={[{ label: "Learn more" }]}
        />
      </>
    ),
    aside: (
      <>
        <Contact
          title={"Isabella Doe"}
          subtitle={"Creative Director"}
          image={{
            src: "img/people/contact-isabella.png",
            aspectRatio: "wide",
          }}
          links={[
            {
              icon: "twitter",
              url: "#",
              label: "@Isabella_Doe",
              ariaLabel: "Isabella Doe on Twitter",
            },
            {
              url: "mailto:mail@example.com",
              icon: "linkedin",
              label: "Isabella.Doe",
              ariaLabel: "Isabella Doe on LinkedIn",
            },
          ]}
        />
      </>
    ),
  }),
};

export const TextWithTeaser: Story = {
  parameters: {
    viewport: {
      width: 1200,
      height: 600,
    },
  },
  args: pack({
    mainLayout: {
      gutter: "small",
      minWidth: "narrow",
    },
    asideLayout: {
      minWidth: "wide",
    },
    main: (
      <>
        <Headline
          text={"Innovative solutions for Industry 4.0"}
          level={"h2"}
          spaceAfter="minimum"
        />
        <Text
          highlightText
          text={`We help companies make their production processes more efficient and future-proof through digitalization, automation, and smart technologies. Rely on our many years of experience in the industrial sector.

Revolutionize your manufacturing with our tailored solutions designed to meet the specific needs of your industry.`}
        />
      </>
    ),
    aside: (
      <TeaserCard
        layout="row"
        button={{
          chevron: false,
          hidden: false,
          label: "Read more",
        }}
        imageRatio="landscape"
        headline="Transforming Industry"
        text="with Smart Solutions"
        image="img/logos/castaway.svg"
        url="#"
      />
    ),
  }),
};

export const TextWithTeaserTiles: Story = {
  parameters: {
    viewport: {
      width: 1200,
      height: 600,
    },
  },
  args: pack({
    horizontalGutter: "small",
    order: {
      desktop: "asideFirst",
      mobile: "asideFirst",
    },
    mainLayout: {
      gutter: "small",
      minWidth: "narrow",
      layout: "smallTiles",
      stretchVertically: true,
    },
    asideLayout: {
      stretchVertically: true,
      minWidth: "wide",
      gutter: "small",
    },
    aside: (
      <>
        <ImageText
          text={`This paragraph highlights **information** and includes a text link for further reference. Additional details can be found by visiting **[this example link](#)** to explore related content or documentation.

*This paragraph is intended to demonstrate italic text formatting.*"`}
          image={{
            src: "img/placeholder/avatar-wide.svg",
            alt: "",
          }}
          layout={"above"}
        />
      </>
    ),
    main: (
      <>
        <TeaserCard
          url={""}
          headline="Lorem Ipsum"
          image="img/placeholder/avatar-wide.svg"
          imageRatio="square"
          layout="compact"
        />
        <TeaserCard
          url={""}
          headline="Dolor Sit Amet"
          image="img/placeholder/avatar-wide.svg"
          imageRatio="square"
          layout="compact"
        />
        <TeaserCard
          url={""}
          headline="Consectetur Adipiscing"
          image="img/placeholder/avatar-wide.svg"
          imageRatio="square"
          layout="compact"
        />
        <TeaserCard
          url={""}
          headline="Eiusmod Tempor"
          image="img/placeholder/avatar-wide.svg"
          imageRatio="square"
          layout="compact"
        />
        <TeaserCard
          url={""}
          headline="Incididunt Ut Labore"
          image="img/placeholder/avatar-wide.svg"
          imageRatio="square"
          layout="compact"
        />
        <TeaserCard
          url={""}
          headline="Et Dolore Magna"
          image="img/placeholder/avatar-wide.svg"
          imageRatio="square"
          layout="compact"
        />
      </>
    ),
  }),
};
