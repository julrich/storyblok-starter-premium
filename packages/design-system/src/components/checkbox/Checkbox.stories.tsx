import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { CheckboxComponent } from "./CheckboxComponent";
import schema from "./checkbox.schema.dereffed.json";
import customProperties from "./checkbox-tokens.json";

const meta: Meta = {
  title: "Form / Checkbox",
  component: CheckboxComponent,
  parameters: {
    jsonschema: { schema },
    cssprops: { customProperties },
    playroom: { disable: true },
  },
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof CheckboxComponent>;

export const Default: Story = {
  parameters: {
    viewport: {
      width: 770,
      height: 172,
    },
  },
  args: pack({}),
};
