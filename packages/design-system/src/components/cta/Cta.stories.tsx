import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { Cta } from "./CtaComponent";
import customProperties from "./cta-tokens.json";
import schema from "./cta.schema.dereffed.json";

const meta: Meta = {
  title: "Components/Cta",
  component: Cta,
  parameters: {
    jsonschema: { schema },
    cssprops: { customProperties },
  },
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof Cta>;

export const Banner: Story = {
  parameters: {
    viewport: {
      width: 1000,
      height: 328,
    },
  },
  args: pack({
    headline: "Key headline for this section",
    sub: "Subheading for additional context",
    text: "This is placeholder text used to demonstrate layout, spacing, and typography within the component.",
    textAlign: "center",
    buttons: [
      {
        label: "Explore",
        url: "#",
        icon: "chevron-right",
      },
      {
        label: "Learn More",
        url: "#",
        icon: "",
      },
    ],
  }),
};

export const Highlighted: Story = {
  parameters: {
    viewport: {
      width: 1000,
      height: 390,
    },
  },
  args: pack({
    headline: "Key headline for this section",
    sub: "Subheading for additional context",
    highlightText: true,
    textAlign: "center",
    text: "This text serves as a placeholder for descriptive content. It can be replaced with real copy to explain features, concepts, or key messages in more detail.",
    buttons: [
      {
        label: "Discover more",
        url: "#",
        icon: "chevron-right",
      },
    ],
  }),
};

export const LeftAligned: Story = {
  parameters: {
    viewport: {
      width: 1000,
      height: 354,
    },
  },
  args: pack({
    headline: "Key headline for this section",
    sub: "Subheading for additional context",
    text: "This text serves as a placeholder for descriptive content. It can be replaced with real copy to explain features, concepts, or key messages in more detail.",
    buttons: [
      {
        label: "Learn More",
        url: "#",
        icon: "chevron-right",
      },
    ],
  }),
};

export const ProductAdvertisement: Story = {
  parameters: {
    viewport: {
      width: 1400,
      height: 690,
    },
  },
  args: pack({
    headline: "Key headline for this section",
    sub: "Subheading for additional context",
    text: "This is placeholder text used to demonstrate layout, spacing, and typography within the component.",
    backgroundImage: "img/bg_dot-carpet-blue.svg",
    highlightText: true,
    padding: true,
    order: {
      desktopImageLast: false,
    },
    image: {
      padding: false,
      src: "img/placeholder/cta-product-shot.svg",
      alt: "Over-Ear Headphones",
    },
    buttons: [
      {
        label: "Details",
        url: "/shop",
        icon: "chevron-right",
      },
    ],
  }),
};

export const ContactBanner: Story = {
  parameters: {
    viewport: {
      width: 1600,
      height: 628,
    },
  },
  args: pack({
    headline: "Key headline for this section",
    sub: "Subheading for additional context",
    text: "This text serves as a placeholder for descriptive content. It can be replaced with real copy to explain features, concepts, or key messages in more detail.",
    padding: true,
    image: {
      src: "img/placeholder/cta-contact-banner.svg",
      padding: false,
    },
    order: {
      desktopImageLast: false,
    },
    buttons: [
      {
        label: "Contact us",
        icon: "person",
        url: "#",
      },
      {
        label: "Book a meeting",
        icon: "date",
        url: "#",
      },
    ],
  }),
};

export const SplitBanner: Story = {
  parameters: {
    viewport: {
      width: 1680,
      height: 788,
    },
  },
  args: pack({
    headline: "Key headline for this section",
    sub: "Subheading for additional context",
    text: "Use this area to add a short description. It provides additional context and helps structure content within the component",
    colorNeutral: true,
    backgroundColor: "#d9e4ff",
    padding: true,
    order: {
      desktopImageLast: false,
    },
    image: {
      src: "img/placeholder/cta-split-banner.svg",
      padding: false,
    },
    buttons: [
      {
        label: "Learn more",
        icon: "",
        url: "#",
      },
    ],
  }),
};

export const AngledImage: Story = {
  parameters: {
    viewport: {
      width: 1670,
      height: 788,
    },
  },
  args: pack({
    headline: "Key **headline** for this section",
    text: `This text serves as a placeholder for descriptive content. It can be replaced with real copy to explain features, concepts, or key messages in more detail.`,
    sub: "Subheading for additional context",
    padding: true,
    image: {
      src: "img/placeholder/cta-angled-image.svg",
      padding: false,
    },
    order: {
      desktopImageLast: true,
    },
    buttons: [
      {
        label: "Learn more",
        icon: "",
        url: "#",
      },
    ],
  }),
};

export const ColoredBanner: Story = {
  parameters: {
    viewport: {
      width: 1350,
      height: 484,
    },
  },
  args: pack({
    headline: "Key headline for this section",
    text: "Use this area to add a short description. It provides additional context and helps structure content within the component.",
    sub: "Subheading for additional context",
    highlightText: true,
    colorNeutral: true,
    backgroundColor: "#a1d5d6ff",
    padding: true,
    buttons: [
      {
        label: "Learn More",
        url: "#",
      },
      {
        label: "More Information",
        url: "#",
      },
    ],
  }),
};

export const AlignBottom: Story = {
  parameters: {
    viewport: {
      width: 1680,
      height: 905,
    },
  },
  args: pack({
    headline: "Key headline for this section",
    text: `This text serves as a placeholder for descriptive content. It can be replaced with real copy to explain features, concepts, or key messages in more detail.`,
    sub: "Subheading for additional context",
    backgroundImage: "img/grid-bg-light.svg",
    align: "bottom",
    image: {
      src: "img/placeholder/cta-align-bottom.svg",
    },
    order: {
      desktopImageLast: false,
    },
    buttons: [
      {
        label: "Learn More",
        url: "#",
      },
    ],
  }),
};
