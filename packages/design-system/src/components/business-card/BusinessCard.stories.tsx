import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { BusinessCard } from "./BusinessCardComponent";
import schema from "./business-card.schema.dereffed.json";

const meta: Meta<typeof BusinessCard> = {
  title: "Corporate / Business Card",
  component: BusinessCard,
  parameters: {
    jsonschema: { schema },
  },
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof BusinessCard>;

export const Default: Story = {
  parameters: {
    viewport: {
      width: 650,
      height: 838,
    },
  },
  args: pack({
    centered: false,
    image: {
      src: "img/placeholder/avatar-square.svg",
      alt: "A placeholder image",
    },
    logo: {
      src: "logo.svg",
      alt: "Business Logo",
      url: "#",
    },
    topic: "Industry Intelligence",
    address: `1234 Business Lane<br />Suite 567 <br />Business City, BC 12345`,
    avatar: {
      src: "img/placeholder/avatar-business-card-round.svg",
      alt: "Emily Johnson",
    },
    contactLinks: [
      { icon: "phone", label: "+1 234 567 890", url: "tel:+1234567890" },
      {
        icon: "email",
        label: "emily@example.com",
        url: "mailto:emily@example.com",
      },
      {
        icon: "linkedin",
        label: "Emily Johnson",
        url: "#",
      },
    ],
    buttons: [{ label: "Contact me", url: "#" }],
  }),
};

export const Centered: Story = {
  parameters: {
    viewport: {
      width: 650,
      height: 838,
    },
  },
  args: pack({
    centered: true,
    image: {
      src: "img/placeholder/avatar-square.svg",
      alt: "A placeholder image",
    },
    logo: {
      src: "logo.svg",
      alt: "Business Logo",
      url: "#",
    },
    topic: "Industry Intelligence",
    address: `1234 Business Lane<br />Suite 567 <br />Business City, BC 12345`,
    avatar: {
      src: "img/placeholder/avatar-business-card-round.svg",
      alt: "Emily Johnson",
    },
    contactLinks: [
      { icon: "phone", label: "+1 234 567 890", url: "tel:+1234567890" },
      {
        icon: "email",
        label: "emily@example.com",
        url: "mailto:emily@example.com",
      },
      {
        icon: "linkedin",
        label: "Emily Johnson",
        url: "#",
      },
    ],
    buttons: [{ label: "Contact me", url: "#" }],
  }),
};

export const WithoutImage: Story = {
  parameters: {
    viewport: {
      width: 740,
      height: 438,
    },
  },
  args: pack({
    centered: false,
    logo: {
      src: "logo.svg",
      alt: "Business Logo",
      url: "#",
    },
    topic: "Industry Intelligence",
    address: `1234 Business Lane<br />Suite 567 <br />Business City, BC 12345`,
    avatar: {
      src: "img/placeholder/avatar-business-card-round.svg",
      alt: "Emily Johnson",
    },
    contactLinks: [
      { icon: "phone", label: "+1 234 567 890", url: "tel:+1234567890" },
      {
        icon: "email",
        label: "emily@example.com",
        url: "mailto:emily@example.com",
      },
      {
        icon: "linkedin",
        label: "Emily Johnson",
        url: "#",
      },
    ],
    buttons: [{ label: "Contact me", url: "#" }],
  }),
};
