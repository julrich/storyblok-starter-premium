import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { Contact } from "./ContactComponent";
import schema from "./contact.schema.dereffed.json";
import customProperties from "./contact-tokens.json";

const meta: Meta = {
  title: "Components/Contact",
  component: Contact,
  parameters: {
    jsonschema: { schema },
    cssprops: { customProperties },
  },
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof Contact>;

export const WideImage: Story = {
  parameters: {
    viewport: {
      width: 770,
      height: 276,
    },
  },
  args: pack({
    title: "Isabella Smith",
    subtitle: "Sr. Brand Manager",
    image: {
      src: "img/placeholder/avatar-wide.svg",
      aspectRatio: "wide",
    },
    links: [
      {
        icon: "xing",
        url: "#",
        label: "Isa_Smith",
        ariaLabel: "Isabella Smith on Xing",
      },
      {
        url: "#",
        icon: "linkedin",
        label: "Isabella.Smith",
        ariaLabel: "Isabella Smith on LinkedIn",
      },
    ],
  }),
};

export const CircularAvatar: Story = {
  parameters: {
    viewport: {
      width: 770,
      height: 332,
    },
  },
  args: pack({
    title: "Isabella Smith",
    subtitle: "Sr. Brand Manager",
    image: {
      src: "img/placeholder/avatar-round.svg",
    },
    copy: "Strong brand leader with a vision for innovative, customer-centric approach",
    links: [
      {
        icon: "xing",
        url: "#",
        label: "Isa_Smith",
        ariaLabel: "Isabella Smith on Xing",
      },
      {
        url: "#",
        icon: "linkedin",
        label: "Isabella.Smith",
        ariaLabel: "Isabella Smith on LinkedIn",
      },
    ],
  }),
};

export const VerticalImageWithParagraph: Story = {
  parameters: {
    viewport: {
      width: 770,
      height: 376,
    },
  },
  args: pack({
    title: "Randolph M. Wagner",
    subtitle: "Sales Representative",
    image: {
      src: "img/placeholder/avatar-portrait.svg",
      aspectRatio: "vertical",
    },
    copy: "Building long-term growth by putting client success at the heart of every deal. Dedicated to turning high-value transactions into lasting strategic partnerships",
    links: [
      {
        icon: "xing",
        url: "#",
        label: "R.M.Wagner",
        ariaLabel: "Randolph Wagner on Xing",
      },
      {
        url: "#",
        icon: "linkedin",
        label: "Randolph.Wagner",
        ariaLabel: "Randolph Wagner on LinkedIn",
      },
    ],
  }),
};

export const FullImageWidth: Story = {
  parameters: {
    viewport: {
      width: 770,
      height: 360,
    },
  },
  args: pack({
    title: "James Johnsson",
    subtitle: "Product Design Lead",
    image: {
      src: "img/placeholder/avatar-square.svg",
      aspectRatio: "wide",
      fullWidth: true,
    },
    copy: "Transforming complex problems into intuitive experiences that drive both user delight and measurable growth.",
    links: [
      {
        url: "mailto:mail@example.com",
        icon: "email",
        label: "james.johnsson@mail.com",
        newTab: false,
        ariaLabel: "Write an email to James Johnsson",
      },
    ],
  }),
};
