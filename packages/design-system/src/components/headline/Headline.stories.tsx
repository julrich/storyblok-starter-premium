import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { Headline } from "./HeadlineComponent";
import schema from "./headline.schema.dereffed.json";
import customProperties from "./headline-tokens.json";

const meta: Meta = {
  title: "Components/Headline",
  component: Headline,
  parameters: {
    jsonschema: { schema },
    cssprops: { customProperties },
  },
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof Headline>;

export const H1: Story = {
  parameters: {
    viewport: {
      width: 800,
      height: 240,
    },
  },
  args: pack({
    level: "h1",
    style: "h1",
    text: "Key headline for this sectionPage or section headline",
  }),
};

export const H2: Story = {
  parameters: {
    viewport: {
      width: 800,
      height: 200,
    },
  },
  args: pack({
    level: "h2",
    style: "h2",
    text: "Headline text placeholder",
  }),
};

export const H3: Story = {
  parameters: {
    viewport: {
      width: 800,
      height: 190,
    },
  },
  args: pack({
    level: "h3",
    style: "h3",
    text: "Another section headline",
  }),
};

export const H4: Story = {
  parameters: {
    viewport: {
      width: 800,
      height: 184,
    },
  },
  args: pack({
    level: "h4",
    style: "h4",
    text: "Message headline",
  }),
};

export const WithSubheadline: Story = {
  parameters: {
    viewport: {
      width: 800,
      height: 228,
    },
  },
  args: pack({
    text: "Key headline for this section",
    sub: "Subheading for additional context",
  }),
};

export const OrderSwapped: Story = {
  parameters: {
    viewport: {
      width: 800,
      height: 228,
    },
  },
  args: pack({
    text: "Key headline for this section",
    sub: "Eyebrow heading to frame the context",
    switchOrder: true,
  }),
};

export const WithMarkdown: Story = {
  parameters: {
    viewport: {
      width: 800,
      height: 228,
    },
  },
  args: pack({
    text: "**Key headline** for this section",
    sub: "Subheading for _additional_ context",
  }),
};
