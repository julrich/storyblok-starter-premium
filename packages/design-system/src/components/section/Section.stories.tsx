import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";
import sectionStories from "@kickstartds/base/lib/section/section.stories";

import { TeaserCard } from "../teaser-card/TeaserCardComponent";
import { Section } from "./SectionComponent";
import schema from "./section.schema.dereffed.json";
import customProperties from "./section-tokens.json";

const meta: Meta = {
  ...sectionStories,
  title: "Layout/Section",
  component: Section,
  parameters: {
    jsonschema: { schema },
    cssprops: { customProperties },
  },
  ...getArgsShared(schema as JSONSchema7),
  render: (args) => (
    <Section {...args}>
      <TeaserCard
        layout="row"
        headline="Explore This Topic"
        text="This teaser introduces a topic or piece of content and provides a short summary to encourage further exploration."
        image="img/placeholder/avatar-wide.svg"
        url="#"
        button={{
          label: "Go to Page",
          hidden: true,
        }}
      />
      <TeaserCard
        layout="row"
        headline="Explore This Topic"
        text="This teaser introduces a topic or piece of content and provides a short summary to encourage further exploration."
        image="img/placeholder/avatar-wide.svg"
        url="#"
        button={{
          label: "Go to Page",
          hidden: true,
        }}
      />
      <TeaserCard
        layout="row"
        headline="Explore This Topic"
        text="This teaser introduces a topic or piece of content and provides a short summary to encourage further exploration."
        image="img/placeholder/avatar-wide.svg"
        url="#"
        button={{
          label: "Go to Page",
          hidden: true,
        }}
      />
    </Section>
  ),
};

export default meta;

type Story = StoryObj<typeof Section>;

export const DynamicLayout: Story = {
  parameters: {
    viewport: {
      width: 1440,
      height: 846,
    },
  },
  args: pack({
    content: {
      mode: "flex",
    },
    headline: {
      text: "Key headline for this section",
      sub: "Short explanatory subheadline",
      align: "center",
    },
    buttons: [],
  }),
  render: (args) => (
    <Section {...args}>
      <TeaserCard
        layout="row"
        headline="Explore This Topic"
        text="This teaser introduces a topic or piece of content and provides a short summary to encourage further exploration."
        image="img/placeholder/avatar-wide.svg"
        url="#"
        button={{
          label: "Go to Page",
          hidden: true,
        }}
      />
      <TeaserCard
        layout="row"
        headline="Explore This Topic"
        text="This teaser introduces a topic or piece of content and provides a short summary to encourage further exploration."
        image="img/placeholder/avatar-wide.svg"
        url="#"
        button={{
          label: "Go to Page",
          hidden: true,
        }}
      />
    </Section>
  ),
};

export const TileLayout: Story = {
  parameters: {
    viewport: {
      width: 1440,
      height: 744,
    },
  },
  args: pack({
    width: "default",
    content: {
      mode: "tile",
    },
    headline: {
      text: "Key headline for this section",
      sub: "Short explanatory subheadline",
      align: "center",
    },
    buttons: [],
  }),
  render: (args) => (
    <Section {...args}>
      <TeaserCard
        layout="row"
        headline="Explore This Topic"
        text="This teaser introduces a topic or piece of content and provides a short summary to encourage further exploration."
        image="img/placeholder/avatar-wide.svg"
        url="#"
        button={{
          label: "Go to Page",
          hidden: true,
        }}
      />
      <TeaserCard
        layout="row"
        headline="Explore This Topic"
        text="This teaser introduces a topic or piece of content and provides a short summary to encourage further exploration."
        image="img/placeholder/avatar-wide.svg"
        url="#"
        button={{
          label: "Go to Page",
          hidden: true,
        }}
      />
      <TeaserCard
        layout="row"
        headline="Explore This Topic"
        text="This teaser introduces a topic or piece of content and provides a short summary to encourage further exploration."
        image="img/placeholder/avatar-wide.svg"
        url="#"
        button={{
          label: "Go to Page",
          hidden: true,
        }}
      />
    </Section>
  ),
};

export const ListLayout: Story = {
  parameters: {
    viewport: {
      width: 1440,
      height: 1416,
    },
  },
  args: pack({
    content: {
      mode: "list",
    },
    headline: {
      text: "Key headline for this section",
      sub: "Short explanatory subheadline",
      align: "center",
    },
    buttons: [],
  }),
};

export const Slider: Story = {
  parameters: {
    viewport: {
      width: 1440,
      height: 816,
    },
  },
  args: pack({
    content: {
      mode: "slider",
    },
    headline: {
      text: "Key headline for this section",
      sub: "Short explanatory subheadline",
      align: "left",
    },
    buttons: [],
  }),
  render: (args) => (
    <Section {...args}>
      <TeaserCard
        layout="row"
        headline="Explore This Topic"
        text="This teaser introduces a topic or piece of content and provides a short summary to encourage further exploration."
        image="img/placeholder/avatar-wide.svg"
        url="#"
        button={{
          label: "Go to Page",
          hidden: true,
        }}
      />
      <TeaserCard
        layout="row"
        headline="Explore This Topic"
        text="This teaser introduces a topic or piece of content and provides a short summary to encourage further exploration."
        image="img/placeholder/avatar-wide.svg"
        url="#"
        button={{
          label: "Go to Page",
          hidden: true,
        }}
      />
      <TeaserCard
        layout="row"
        headline="Explore This Topic"
        text="This teaser introduces a topic or piece of content and provides a short summary to encourage further exploration."
        image="img/placeholder/avatar-wide.svg"
        url="#"
        button={{
          label: "Go to Page",
          hidden: true,
        }}
      />
      <TeaserCard
        layout="row"
        headline="Explore This Topic"
        text="This teaser introduces a topic or piece of content and provides a short summary to encourage further exploration."
        image="img/placeholder/avatar-wide.svg"
        url="#"
        button={{
          label: "Go to Page",
          hidden: true,
        }}
      />
      <TeaserCard
        layout="row"
        headline="Explore This Topic"
        text="This teaser introduces a topic or piece of content and provides a short summary to encourage further exploration."
        image="img/placeholder/avatar-wide.svg"
        url="#"
        button={{
          label: "Go to Page",
          hidden: true,
        }}
      />
      <TeaserCard
        layout="row"
        headline="Explore This Topic"
        text="This teaser introduces a topic or piece of content and provides a short summary to encourage further exploration."
        image="img/placeholder/avatar-wide.svg"
        url="#"
        button={{
          label: "Go to Page",
          hidden: true,
        }}
      />
      <TeaserCard
        layout="row"
        headline="Explore This Topic"
        text="This teaser introduces a topic or piece of content and provides a short summary to encourage further exploration."
        image="img/placeholder/avatar-wide.svg"
        url="#"
        button={{
          label: "Go to Page",
          hidden: true,
        }}
      />
      <TeaserCard
        layout="row"
        headline="Explore This Topic"
        text="This teaser introduces a topic or piece of content and provides a short summary to encourage further exploration."
        image="img/placeholder/avatar-wide.svg"
        url="#"
        button={{
          label: "Go to Page",
          hidden: true,
        }}
      />
      <TeaserCard
        layout="row"
        headline="Explore This Topic"
        text="This teaser introduces a topic or piece of content and provides a short summary to encourage further exploration."
        image="img/placeholder/avatar-wide.svg"
        url="#"
        button={{
          label: "Go to Page",
          hidden: true,
        }}
      />
      <TeaserCard
        layout="row"
        headline="Explore This Topic"
        text="This teaser introduces a topic or piece of content and provides a short summary to encourage further exploration."
        image="img/placeholder/avatar-wide.svg"
        url="#"
        button={{
          label: "Go to Page",
          hidden: true,
        }}
      />
      <TeaserCard
        layout="row"
        headline="Explore This Topic"
        text="This teaser introduces a topic or piece of content and provides a short summary to encourage further exploration."
        image="img/placeholder/avatar-wide.svg"
        url="#"
        button={{
          label: "Go to Page",
          hidden: true,
        }}
      />
    </Section>
  ),
};

export const Inverted: Story = {
  parameters: {
    viewport: {
      width: 1440,
      height: 744,
    },
  },
  args: pack({
    inverted: true,
    content: { mode: "default" },
    headline: {
      text: "Key headline for this section",
      sub: "Short explanatory subheadline",
    },
    buttons: [],
  }),
};

export const AccentBackground: Story = {
  parameters: {
    viewport: {
      width: 1440,
      height: 744,
    },
  },
  args: pack({
    backgroundColor: "accent",
    headline: {
      text: "Key headline for this section",
      sub: "Short explanatory subheadline",
      align: "center",
    },
    buttons: [],
  }),
};

export const BoldBackground: Story = {
  parameters: {
    viewport: {
      width: 1440,
      height: 744,
    },
  },
  args: pack({
    backgroundColor: "bold",
    headline: {
      text: "Key headline for this section",
      sub: "Short explanatory subheadline",
      align: "center",
    },
    buttons: [],
  }),
};

export const Framed: Story = {
  parameters: {
    viewport: {
      width: 1440,
      height: 888,
    },
  },
  args: pack({
    width: "wide",
    headline: {
      text: "Key headline for this section",
      sub: "Short explanatory subheadline",
      align: "center",
    },
    style: "framed",
    buttons: [],
  }),
};

export const BackgroundImage: Story = {
  parameters: {
    viewport: {
      width: 1440,
      height: 744,
    },
  },
  args: pack({
    backgroundImage: "/img/bg_dot-carpet-blue.svg",
    headline: {
      text: "Key headline for this section",
      sub: "Short explanatory subheadline",
    },
    content: {
      mode: "default",
    },
    buttons: [],
  }),
};

export const WithButtons: Story = {
  parameters: {
    viewport: {
      width: 1440,
      height: 818,
    },
  },
  args: pack({
    headline: {
      text: "Key headline for this section",
      sub: "Short explanatory subheadline",
      align: "center",
    },
    buttons: [
      {
        disabled: false,
        icon: "arrow-right",
        label: "Premium Topics",
        size: "medium",
        variant: "secondary",
      },
      {
        disabled: false,
        icon: "",
        label: "Topics Overview",
        size: "medium",
        variant: "secondary",
      },
    ],
  }),
};
