import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { ImageText } from "./ImageTextComponent";
import schema from "./image-text.schema.dereffed.json";
import customProperties from "./image-text-tokens.json";

const meta: Meta = {
  title: "Components/Image Text",
  component: ImageText,
  parameters: {
    jsonschema: { schema },
    cssprops: { customProperties },
  },
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof ImageText>;

export const BesideRightLayout: Story = {
  parameters: {
    viewport: {
      width: 1240,
      height: 515,
    },
  },
  args: pack({
    text: `This is a simple text paragraph that demonstrates standard body copy. It can be used to explain a topic, provide background information, or introduce related content in a neutral and readable way.

This paragraph highlights **information** and includes a text link for further reference. Additional details can be found by visiting **[this example link](#)** to explore related content or documentation.

*This paragraph is intended to demonstrate italic text formatting.*`,
    image: {
      src: "img/placeholder/image-gallery-02.svg",
      alt: "Placeholder Image",
    },
    layout: "beside-right",
  }),
};

export const AboveLayout: Story = {
  parameters: {
    viewport: {
      width: 760,
      height: 788,
    },
  },
  args: pack({
    text: `This is a simple text paragraph that demonstrates standard body copy. It can be used to explain a topic, provide background information, or introduce related content in a neutral and readable way.

This paragraph highlights **information** and includes a text link for further reference. Additional details can be found by visiting **[this example link](#)** to explore related content or documentation.

*This paragraph is intended to demonstrate italic text formatting.*`,
    image: {
      src: "img/placeholder/image-gallery-02.svg",
      alt: "Placeholder Image",
    },
    layout: "above",
  }),
};
