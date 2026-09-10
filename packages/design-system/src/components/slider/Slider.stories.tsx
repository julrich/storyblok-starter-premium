import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { Slider } from "./SliderComponent";
import { TeaserCard } from "../teaser-card/TeaserCardComponent";
import schema from "./slider.schema.dereffed.json";
import customProperties from "./slider-tokens.json";

const meta: Meta = {
  title: "Layout/Slider",
  component: Slider,
  parameters: {
    jsonschema: { schema },
    cssprops: { customProperties },
  },
  ...getArgsShared(schema as JSONSchema7),
  render: (args) => (
    <Slider {...args}>
      <TeaserCard
        layout="row"
        headline="Explore This Topic"
        text="This teaser introduces a topic or piece of content and provides a short summary to encourage further exploration."
        image="img/placeholder/avatar-wide.svg"
        url="#"
        button={{
          label: "Go to Page",
          hidden: true,
        }}
      />
      <TeaserCard
        layout="row"
        headline="Explore This Topic"
        text="This teaser introduces a topic or piece of content and provides a short summary to encourage further exploration."
        image="img/placeholder/avatar-wide.svg"
        url="#"
        button={{
          label: "Go to Page",
          hidden: true,
        }}
      />
      <TeaserCard
        layout="row"
        headline="Explore This Topic"
        text="This teaser introduces a topic or piece of content and provides a short summary to encourage further exploration."
        image="img/placeholder/avatar-wide.svg"
        url="#"
        button={{
          label: "Go to Page",
          hidden: true,
        }}
      />
    </Slider>
  ),
};

export default meta;

type Story = StoryObj<typeof Slider>;

export const WithArrows: Story = {
  parameters: {
    viewport: {
      width: 1024,
      height: 530,
    },
  },
  args: pack({
    gap: 15,
    arrows: true,
  }),
};

export const WithTeasedNeighbours: Story = {
  parameters: {
    viewport: {
      width: 1024,
      height: 760,
    },
  },
  args: pack({
    gap: 15,
    teaseNeighbours: true,
    arrows: true,
    nav: true,
  }),
};

export const WithNav: Story = {
  parameters: {
    viewport: {
      width: 1024,
      height: 530,
    },
  },
  args: pack({
    gap: 15,
    arrows: true,
    nav: true,
  }),
};

export const WithAutoplay: Story = {
  parameters: {
    viewport: {
      width: 1024,
      height: 530,
    },
  },
  args: pack({
    gap: 15,
    nav: true,
    arrows: true,
    autoplay: true,
  }),
};
