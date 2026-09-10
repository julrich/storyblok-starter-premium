import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { EventRegistration } from "./EventRegistrationComponent";
import schema from "./event-registration.schema.dereffed.json";

const meta: Meta<typeof EventRegistration> = {
  title: "Event/ Event Registration",
  component: EventRegistration,
  parameters: {
    jsonschema: { schema },
  },
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof EventRegistration>;

export const Default: Story = {
  parameters: {
    viewport: {
      width: 770,
      height: 618,
    },
  },
  args: pack({
    label: "Registration Request",
    location: {
      name: "Tech Conference Center",
      address: `Alexanderplatz 1<br/>10178 Berlin`,
    },
    date: "18.09.2026",
    time: "09:00 – 17:00",
    confirmationCheckboxLabel: `I read and agree to the terms and conditions*`,
    cta: {
      label: "Send Request",
      url: "#",
      ariaLabel:
        "Register for the event on 18th September 2026 from 09:00 to 17:00",
    },
  }),
};
