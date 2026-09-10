import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { TeaserCard } from "./TeaserCardComponent";
import schema from "./teaser-card.schema.dereffed.json";
import customProperties from "./teaser-card-tokens.json";

const meta: Meta<typeof TeaserCard> = {
  title: "Components/Teaser Card",
  component: TeaserCard,
  parameters: {
    jsonschema: { schema },
    cssprops: { customProperties },
  },
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof TeaserCard>;

export const ProductTiles: Story = {
  parameters: {
    viewport: {
      width: 650,
      height: 678,
    },
  },
  args: pack({
    headline: "Explore This Topic",
    text: "This teaser introduces a topic or piece of content and provides a short summary to encourage further exploration.",
    image: "img/placeholder/avatar-wide.svg",
    url: "#",
    button: {
      label: "Learn more",
      hidden: true,
    },
  }),
};

export const Compact: Story = {
  parameters: {
    viewport: {
      width: 650,
      height: 678,
    },
  },
  args: pack({
    layout: "compact",
    headline: "Explore This Topic",
    text: "This teaser introduces a topic or piece of content and provides a short summary to encourage further exploration.",
    image: "img/people-brainstorming-work-meeting.png",
    url: "#",
    button: {
      label: "Learn more",
    },
  }),
};

export const PageNavigation: Story = {
  parameters: {
    viewport: {
      width: 650,
      height: 640,
    },
  },
  args: pack({
    headline: "Explore This Topic",
    text: "This teaser introduces a topic or piece of content and provides a short summary to encourage further exploration.",
    image: "img/placeholder/avatar-wide.svg",
    imageRatio: "landscape",
    url: "#",
    button: {
      label: "Learn more",
    },
  }),
};

export const ShowcasePreview: Story = {
  parameters: {
    viewport: {
      width: 650,
      height: 738,
    },
  },
  args: pack({
    label: "Category Label",
    layout: "row",
    imageRatio: "wide",
    headline: "Explore This Topic",
    text: "This teaser introduces a topic or piece of content and provides a short summary to encourage further exploration.",
    image: "img/placeholder/avatar-wide.svg",
    url: "#",
    button: {
      label: "Learn more",
    },
  }),
};
