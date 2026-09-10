import { Meta, StoryObj } from "@storybook/react";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { RadioGroupComponent } from "./RadioGroupComponent";
import schema from "./radio-group.schema.dereffed.json";
import customProperties from "./radio-group-tokens.json";

const meta: Meta = {
  title: "Form / Radio Group",
  component: RadioGroupComponent,
  parameters: {
    jsonschema: { schema },
    cssprops: { customProperties },
    playroom: { disable: true },
  },
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof RadioGroupComponent>;

export const Default: Story = {
  parameters: {
    viewport: {
      width: 770,
      height: 172,
    },
  },
  args: pack({}),
};
