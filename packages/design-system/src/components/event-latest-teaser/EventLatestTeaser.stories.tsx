import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { EventLatestTeaser } from "./EventLatestTeaserComponent";
import schema from "./event-latest-teaser.schema.dereffed.json";
import customProperties from "./event-latest-teaser-tokens.json";

const meta: Meta<typeof EventLatestTeaser> = {
  title: "Event/ Event Latest Teaser",
  component: EventLatestTeaser,
  parameters: {
    jsonschema: { schema },
    cssprops: { customProperties },
  },
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof EventLatestTeaser>;

export const Default: Story = {
  parameters: {
    viewport: {
      width: 790,
      height: 248,
    },
  },
  args: pack({
    date: "09/18/2025",
    title: "Title of an Event",
    location: "Example City",
    url: "#",
    cta: "Go to event",
    calendar: {
      day: "18",
      month: "Sep",
    },
    ariaLabel: "Demo Event One on September 18, 2025 in Example City",
  }),
};
