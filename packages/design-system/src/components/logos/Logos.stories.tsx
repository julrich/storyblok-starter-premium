import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { Logos } from "./LogosComponent";
import schema from "./logos.schema.dereffed.json";
import customProperties from "./logos-tokens.json";

const meta: Meta<typeof Logos> = {
  title: "Components/Logos",
  component: Logos,
  parameters: {
    jsonschema: { schema },
    cssprops: { customProperties },
  },
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof Logos>;

export const CenteredWithButton: Story = {
  parameters: {
    viewport: {
      width: 1000,
      height: 492,
    },
  },
  args: pack({
    logo: [
      {
        src: "img/logos/logoipsum-344.svg",
        alt: "Logo 1",
      },
      {
        src: "img/logos/logoipsum-347.svg",
        alt: "Logo 2",
      },
      {
        src: "img/logos/logoipsum-352.svg",
        alt: "Logo 3",
      },
      {
        src: "img/logos/logoipsum-356.svg",
        alt: "Logo 4",
      },
      {
        src: "img/logos/logoipsum-358.svg",
        alt: "Logo 5",
      },
      {
        src: "img/logos/logoipsum-369.svg",
        alt: "Logo 6",
      },
    ],
    cta: {
      toggle: true,
      style: "button",
    },
  }),
};

export const LeftAlignedWithTextLink: Story = {
  parameters: {
    viewport: {
      width: 1000,
      height: 420,
    },
  },
  args: pack({
    logo: [
      {
        src: "img/logos/logoipsum-344.svg",
        alt: "Logo 1",
      },
      {
        src: "img/logos/logoipsum-347.svg",
        alt: "Logo 2",
      },
      {
        src: "img/logos/logoipsum-352.svg",
        alt: "Logo 3",
      },
      {
        src: "img/logos/logoipsum-356.svg",
        alt: "Logo 4",
      },
      {
        src: "img/logos/logoipsum-358.svg",
        alt: "Logo 5",
      },
      {
        src: "img/logos/logoipsum-369.svg",
        alt: "Logo 6",
      },
    ],
    cta: {
      toggle: true,
    },
    align: "left",
  }),
};

export const LogoWall: Story = {
  parameters: {
    viewport: {
      width: 1080,
      height: 546,
    },
  },
  args: pack({
    logosPerRow: 4,
    logo: [
      {
        src: "img/logos/logoipsum-344.svg",
        alt: "Logo 1",
      },
      {
        src: "img/logos/logoipsum-347.svg",
        alt: "Logo 2",
      },
      {
        src: "img/logos/logoipsum-352.svg",
        alt: "Logo 3",
      },
      {
        src: "img/logos/logoipsum-356.svg",
        alt: "Logo 4",
      },
      {
        src: "img/logos/logoipsum-358.svg",
        alt: "Logo 5",
      },
      {
        src: "img/logos/logoipsum-369.svg",
        alt: "Logo 6",
      },
      {
        src: "img/logos/logoipsum-356.svg",
        alt: "Logo 4",
      },
      {
        src: "img/logos/logoipsum-358.svg",
        alt: "Logo 5",
      },
      {
        src: "img/logos/logoipsum-369.svg",
        alt: "Logo 6",
      },
      {
        src: "img/logos/logoipsum-356.svg",
        alt: "Logo 4",
      },
      {
        src: "img/logos/logoipsum-358.svg",
        alt: "Logo 5",
      },
      {
        src: "img/logos/logoipsum-369.svg",
        alt: "Logo 6",
      },
    ],

    cta: {
      toggle: false,
    },
  }),
};

export const LogoRow: Story = {
  parameters: {
    viewport: {
      width: 1000,
      height: 248,
    },
  },
  args: pack({
    logosPerRow: 6,
    logo: [
      {
        src: "img/logos/logoipsum-344.svg",
        alt: "Logo 1",
      },
      {
        src: "img/logos/logoipsum-347.svg",
        alt: "Logo 2",
      },
      {
        src: "img/logos/logoipsum-352.svg",
        alt: "Logo 3",
      },
      {
        src: "img/logos/logoipsum-356.svg",
        alt: "Logo 4",
      },
      {
        src: "img/logos/logoipsum-358.svg",
        alt: "Logo 5",
      },
      {
        src: "img/logos/logoipsum-369.svg",
        alt: "Logo 6",
      },
    ],

    cta: {
      toggle: false,
    },
  }),
};
