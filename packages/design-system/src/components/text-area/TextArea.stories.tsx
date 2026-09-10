import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { TextAreaComponent } from "./TextAreaComponent";
import schema from "./text-area.schema.dereffed.json";
import customProperties from "./text-area-tokens.json";

const meta: Meta = {
  title: "Form/ Text Area",
  component: TextAreaComponent,
  parameters: {
    jsonschema: { schema },
    cssprops: { customProperties },
    playroom: { disable: true },
  },
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof TextAreaComponent>;

export const Default: Story = {
  parameters: {
    viewport: {
      width: 770,
      height: 246,
    },
  },
  args: pack({}),
};
