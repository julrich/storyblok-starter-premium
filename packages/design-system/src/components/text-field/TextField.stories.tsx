import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { TextFieldComponent } from "./TextFieldComponent";
import schema from "./text-field.schema.dereffed.json";
import customProperties from "./text-field-tokens.json";

const meta: Meta = {
  title: "Form/ Text Field",
  component: TextFieldComponent,
  parameters: {
    jsonschema: { schema },
    cssprops: { customProperties },
    playroom: { disable: true },
  },
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof TextFieldComponent>;

export const Default: Story = {
  parameters: {
    viewport: {
      width: 770,
      height: 219,
    },
  },
  args: pack({}),
};
