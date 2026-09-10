import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { EventLocation } from "./EventLocationComponent";
import schema from "./event-location.schema.dereffed.json";

const meta: Meta<typeof EventLocation> = {
  title: "Event/ Event Location",
  component: EventLocation,
  parameters: {
    jsonschema: { schema },
  },
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof EventLocation>;

export const Default: Story = {
  parameters: {
    viewport: {
      width: 770,
      height: 382,
    },
  },
  args: pack({
    locationName: "Berlin Congress Center",
    address: `Alexanderplatz 1<br />
  10178 Berlin`,
    dates: [
      {
        date: "18.09.2025",
        time: "09:00 – 17:00",
        label: "Register",
        url: "#",
        ariaLabel:
          "Register for the event on 18th September 2025 from 09:00 to 17:00",
      },
      {
        date: "18.09.2025",
        time: "09:00 – 17:00",
        label: "Register",
        url: "#",
        ariaLabel:
          "Register for the event on 18th September 2025 from 09:00 to 17:00",
      },
    ],
    links: [
      {
        url: "https://maps.google.com/?q=Berlin+Congress+Center",
        label: "Open in Google Maps",
      },
      {
        url: "https://maps.google.com/?q=Berlin+Congress+Center",
        label: "Location Website",
      },
    ],
  }),
};
