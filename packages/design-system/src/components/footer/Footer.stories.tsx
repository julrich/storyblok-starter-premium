import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, unpack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { Footer as FooterComponent } from "./FooterComponent";
import schema from "./footer.schema.dereffed.json";
import customProperties from "./footer-tokens.json";

const { args, argTypes } = getArgsShared(schema as JSONSchema7);
export const footerProps = {
  ...unpack(args),
  logo: {
    src: "/logo.svg",
    srcInverted: "/logo-inverted.svg",
    inverted: false,
    homepageHref: "#",
    alt: "Systemics Logo",
    width: 176,
    height: 40,
  },
  navGroups: [
    {
      heading: "Product",
      items: [
        { label: "Features", url: "#" },
        { label: "Pricing", url: "#" },
        { label: "Integrations", url: "#" },
        { label: "Changelog", url: "#" },
      ],
    },
    {
      heading: "Company",
      items: [
        { label: "About", url: "#" },
        { label: "Careers", url: "#" },
        { label: "Blog", url: "#" },
        { label: "Contact", url: "#" },
      ],
    },
    {
      heading: "Resources",
      items: [
        { label: "Documentation", url: "#" },
        { label: "Support", url: "#" },
        { label: "Community", url: "#" },
        { label: "Status", url: "https://example.com", newTab: true },
      ],
    },
  ],
  socialLinks: [
    { icon: "facebook", url: "https://example.com", ariaLabel: "Facebook" },
    { icon: "twitter", url: "https://example.com", ariaLabel: "Twitter" },
    { icon: "linkedin", url: "https://example.com", ariaLabel: "LinkedIn" },
    { icon: "xing", url: "https://example.com", ariaLabel: "Xing" },
  ],
  copyright: "© 2026 Systemics Inc. All rights reserved.",
  legalLink: {
    label: "Legal",
    url: "#",
  },
};

const meta: Meta = {
  title: "Layout/Footer",
  args: pack(footerProps),
  argTypes,
  component: FooterComponent,
  parameters: {
    jsonschema: { schema },
    cssprops: { customProperties },
  },
  excludeStories: ["footerProps"],
};

export default meta;

type Story = StoryObj<typeof FooterComponent>;

export const Footer: Story = {
  parameters: {
    viewport: {
      width: 1280,
      height: 330,
    },
  },
};
