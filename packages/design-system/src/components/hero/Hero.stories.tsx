import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { Hero } from "./HeroComponent";
import schema from "./hero.schema.dereffed.json";
import customProperties from "./hero-tokens.json";

const meta: Meta = {
  title: "Components/Hero",
  component: Hero,
  parameters: {
    jsonschema: { schema },
    cssprops: { customProperties },
  },
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof Hero>;

export const TextBelowImage: Story = {
  parameters: {
    viewport: {
      width: 1024,
      height: 884,
    },
  },
  args: pack({
    headline: "Main message headline",
    sub: "This is the supporting subheadline",
    text: "Use this area to add a short description. It provides additional context and helps structure content within the component.",
    highlightText: true,
    textbox: false,
    overlay: true,
    textPosition: "below",
    image: {
      srcMobile: "img/placeholder/image-gallery-02.svg",
      srcTablet: "img/placeholder/image-gallery-02.svg",
      srcDesktop: "img/placeholder/image-gallery-02.svg",
    },
    buttons: [
      {
        label: "Learn more",
        icon: "arrow-down",
        url: "#",
      },
    ],
  }),
};

export const TextOnImageWithOverlay: Story = {
  parameters: {
    viewport: {
      width: 1024,
      height: 738,
    },
  },
  args: pack({
    headline: "Main message headline",
    text: "Use this area to add a short description. It provides additional context and helps structure content within the component.",
    textbox: false,
    colorNeutral: true,
    height: "fullImage",
    overlay: true,
    textPosition: "bottom",
    image: {
      srcMobile: "img/placeholder/image-gallery-02.svg",
      srcTablet: "img/placeholder/image-gallery-02.svg",
      srcDesktop: "img/placeholder/image-gallery-02.svg",
    },
    buttons: [
      {
        label: "Products & Services",
        icon: "arrow-right",
        url: "#",
      },
    ],
  }),
};

export const TextBoxOnFullScreen: Story = {
  parameters: {
    viewport: {
      width: 1440,
      height: 900,
    },
  },
  args: pack({
    headline: "Main message headline",
    sub: "This is the supporting subheadline",
    text: "Use this area to add a short description. It provides additional context and helps structure content within the component.",
    textbox: true,
    height: "fullScreen",
    highlightText: false,
    skipButton: true,
    textPosition: "left",
    image: {
      srcMobile: "img/placeholder/image-gallery-02.svg",
      srcTablet: "img/placeholder/image-gallery-02.svg",
      srcDesktop: "img/placeholder/image-gallery-02.svg",
    },
    buttons: [
      {
        label: "Learn more",
        icon: "",
        url: "#",
      },
      {
        label: "All our Services",
        icon: "",
        url: "#",
      },
    ],
  }),
};
