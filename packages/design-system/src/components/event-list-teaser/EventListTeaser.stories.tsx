import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { EventListTeaser } from "./EventListTeaserComponent";
import schema from "./event-list-teaser.schema.dereffed.json";
import customProperties from "./event-list-teaser-tokens.json";

const meta: Meta<typeof EventListTeaser> = {
  title: "Event/ Event List Teaser",
  component: EventListTeaser,
  parameters: {
    jsonschema: { schema },
    cssprops: { customProperties },
  },
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof EventListTeaser>;

export const Default: Story = {
  parameters: {
    viewport: {
      width: 1024,
      height: 524,
    },
  },
  args: pack({
    text: "This paragraph represents generic body text. It can be used to describe products, services, or relevant information.The Future of AI is here and now - Join us to explore the latest advancements in artificial intelligence.",
    date: "30.12.2025",
    location: {
      name: "Tech Conference Center",
      address: `Alexanderplatz 1<br />
10178 Berlin`,
    },
    title: "Title of an Event",
    category: "Category",
    image: {
      src: "img/placeholder/avatar-square.svg",
      alt: "A placeholder Image",
    },
    url: "#",
    ctaText: "Go to event",
  }),
};
