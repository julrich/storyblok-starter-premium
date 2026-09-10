import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { SelectFieldComponent } from "./SelectFieldComponent";
import schema from "./select-field.schema.dereffed.json";
import customProperties from "./select-field-tokens.json";

const meta: Meta = {
  title: "Form/ Select Field",
  component: SelectFieldComponent,
  parameters: {
    jsonschema: { schema },
    cssprops: { customProperties },
    playroom: { disable: true },
  },
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof SelectFieldComponent>;

export const Default: Story = {
  parameters: {
    viewport: {
      width: 770,
      height: 219,
    },
  },
  args: pack({}),
};
