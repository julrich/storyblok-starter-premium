import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { ContentNav } from "./ContentNavComponent";
import schema from "./content-nav.schema.dereffed.json";

const meta: Meta<typeof ContentNav> = {
  title: "Corporate / Content Nav",
  component: ContentNav,
  parameters: {
    jsonschema: { schema },
  },
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof ContentNav>;

export const Default: Story = {
  parameters: {
    viewport: {
      width: 640,
      height: 652,
    },
  },
  args: pack({
    image: {
      src: "img/placeholder/avatar-wide.svg",
      alt: "A placeholder Image",
    },
    topic: "Descriptive Topic",
    links: [
      { label: "Market Insights", url: "#" },
      { label: "Industry Trends", url: "#" },
      { label: "Competitor Analysis", url: "#" },
      { label: "Customer Feedback", url: "#" },
      { label: "Sales Data", url: "#" },
      { label: "Product Development", url: "#" },
      { label: "Supply Chain Management", url: "#" },
      { label: "Financial Performance", url: "#" },
      { label: "Regulatory Compliance", url: "#" },
    ],
    initiallyShown: 4,
  }),
};
