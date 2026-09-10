import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { Text } from "./TextComponent";
import schema from "./text.schema.dereffed.json";
import customProperties from "./text-tokens.json";

const meta: Meta<typeof Text> = {
  title: "Components/Text",
  component: Text,
  parameters: {
    jsonschema: { schema },
    cssprops: { customProperties },
  },
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof Text>;

export const SingleColumn: Story = {
  parameters: {
    viewport: {
      width: 1000,
      height: 316,
    },
  },
  args: pack({
    layout: "singleColumn",
    text: `This is a simple text paragraph that demonstrates standard body copy. It can be used to explain a topic, provide background information, or introduce related content in a neutral and readable way.

This paragraph highlights **information** and includes a text link for further reference. Additional details can be found by visiting **[this example link](#)** to explore related content or documentation.

*This paragraph is intended to demonstrate italic text formatting.*`,
  }),
};

export const Centered: Story = {
  parameters: {
    viewport: {
      width: 1000,
      height: 314,
    },
  },
  args: pack({
    align: "center",
    text: `This is a simple text paragraph that demonstrates standard body copy. It can be used to explain a topic, provide background information, or introduce related content in a neutral and readable way.

This paragraph highlights **information** and includes a text link for further reference. Additional details can be found by visiting **[this example link](#)** to explore related content or documentation.

*This paragraph is intended to demonstrate italic text formatting.*`,
  }),
};

export const MultiColumn: Story = {
  parameters: {
    viewport: {
      width: 1000,
      height: 298,
    },
  },
  args: pack({
    layout: "multiColumn",
    text: `This is a simple text paragraph that demonstrates standard body copy. It can be used to explain a topic, provide background information, or introduce related content in a neutral and readable way.

This paragraph highlights **information** and includes a text link for further reference. Additional details can be found by visiting **[this example link](#)** to explore related content or documentation.

*This paragraph is intended to demonstrate italic text formatting.*`,
  }),
};

export const Highlight: Story = {
  parameters: {
    viewport: {
      width: 1000,
      height: 380,
    },
  },
  args: pack({
    highlightText: true,
    text: `This is a simple text paragraph that demonstrates standard body copy. It can be used to explain a topic, provide background information, or introduce related content in a neutral and readable way.

This paragraph highlights **information** and includes a text link for further reference. Additional details can be found by visiting **[this example link](#)** to explore related content or documentation.

*This paragraph is intended to demonstrate italic text formatting.*`,
  }),
};
