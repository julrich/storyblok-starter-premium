import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { EventLatest } from "./EventLatestComponent";
import schema from "./event-latest.schema.dereffed.json";
import customProperties from "./event-latest-tokens.json";

const meta: Meta<typeof EventLatest> = {
  title: "Event/ Event Latest",
  component: EventLatest,
  parameters: {
    jsonschema: { schema },
    cssprops: { customProperties },
  },
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof EventLatest>;

export const Default: Story = {
  parameters: {
    viewport: {
      width: 790,
      height: 580,
    },
  },
  args: pack({
    events: [
      {
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
      },
      {
        date: "10/05/2025",
        title: "Sample Event Title",
        location: "Example City",
        url: "https://uxsummit.de/koeln-2025",
        cta: "Go to event",
        calendar: {
          day: "05",
          month: "Oct",
        },
        ariaLabel: "UX Leadership Summit on October 5, 2025 in Example City",
      },
      {
        date: "11/12/2025",
        title: "Demo Event",
        location: "Example Cityg",
        url: "#",
        cta: "Go to event",
        calendar: {
          day: "12",
          month: "Nov",
        },
        ariaLabel: "Demo Event One on November 12, 2025 in Example City",
      },
      {
        date: "12/01/2025",
        title: "Sample Event Title",
        location: "Online",
        url: "#5",
        cta: "Go to event",
        calendar: {
          day: "01",
          month: "Dec",
        },
        ariaLabel: "Sample Event Title on December 1, 2025 remote and online",
      },
    ],
  }),
};
