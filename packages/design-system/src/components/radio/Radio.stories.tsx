import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { RadioComponent } from "./RadioComponent";
import schema from "./radio.schema.dereffed.json";
import customProperties from "./radio-tokens.json";

const meta: Meta = {
  title: "Form / Radio",
  component: RadioComponent,
  parameters: {
    jsonschema: { schema },
    cssprops: { customProperties },
    playroom: { disable: true },
  },
  ...getArgsShared(schema as JSONSchema7),
};
type Story = StoryObj<typeof RadioComponent>;

export default meta;

export const Default: Story = {
  parameters: {
    viewport: {
      width: 770,
      height: 172,
    },
  },
  args: pack({}),
};
