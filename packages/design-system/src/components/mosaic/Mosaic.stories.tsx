import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { Mosaic } from "./MosaicComponent";
import schema from "./mosaic.schema.dereffed.json";
import customProperties from "./mosaic-tokens.json";

const meta: Meta = {
  title: "Components/Mosaic",
  component: Mosaic,
  parameters: {
    jsonschema: { schema },
    cssprops: { customProperties },
  },
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof Mosaic>;

export const ColorfulTiles: Story = {
  parameters: {
    viewport: {
      width: 1010,
      height: 1480,
    },
  },
  args: pack({
    layout: "alternate",
    tile: [
      {
        backgroundColor: "#ffd4f1",
        headline: "Collaborative Environment",
        text: "Our team thrives in a collaborative environment, fostering creativity and innovation.",
        image: {
          src: "img/placeholder/avatar-square.svg",
        },
      },
      {
        backgroundColor: "#d8e8f",
        headline: "Modern Infrastructure",
        text: "Our state-of-the-art office facilities inspire productivity and efficiency.",
        image: {
          src: "img/placeholder/avatar-square.svg",
        },
      },
      {
        backgroundColor: "#ddfffe",
        headline: "Teamwork",
        text: "We believe in the power of teamwork. Together, we can achieve great things.",
        image: {
          src: "img/placeholder/avatar-square.svg",
        },
      },
    ],
  }),
};

export const ColorfulTextWithImagesBeside: Story = {
  parameters: {
    viewport: {
      width: 1010,
      height: 1480,
    },
  },
  args: pack({
    layout: "textLeft",
    tile: [
      {
        textColor: "#086d10ff",
        button: {
          toggle: false,
        },
        headline: "First Example",
        text: "A representative example showing how individual items can be displayed and described.",
        image: {
          src: "img/placeholder/product-shot-sqaure-spacing.svg",
        },
      },
      {
        textColor: "#5717b0ff",
        button: {
          toggle: false,
        },
        headline: "Second Example",
        text: "This example highlights consistency across items and supports visual comparison.",
        image: {
          src: "img/placeholder/product-shot-sqaure-spacing.svg",
        },
      },
      {
        textColor: "#007387ff",
        button: {
          toggle: false,
        },
        headline: "Third Example",
        text: "A simple placeholder item intended to be adapted to real-world content.",
        image: {
          src: "img/placeholder/product-shot-sqaure-spacing.svg",
        },
      },
    ],
  }),
};
