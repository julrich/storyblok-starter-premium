import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { SearchResult } from "./SearchResultComponent";
import schema from "./search-result.schema.dereffed.json";

const meta: Meta<typeof SearchResult> = {
  title: "Corporate / Search Result",
  component: SearchResult,
  parameters: {
    jsonschema: { schema },
  },
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof SearchResult>;

export const Default: Story = {
  parameters: {
    viewport: {
      width: 780,
      height: 636,
    },
  },
  args: pack({
    title: "GreenTech Summit 2023",
    previewImage: "img/full-shot-different-people-working-together.png",
    initialMatch:
      "Embracing a **sustainable** lifestyle can significantly reduce your environmental impact. From using energy-efficient appliances to adopting renewable energy sources, every small step counts towards a greener future.",
    matches: [
      {
        title: "Keynote: Embracing Sustainability",
        snippet:
          "Learn how leading companies are integrating **sustainability** into their core strategies.",
        url: "#",
      },
      {
        title: "Panel: Sustainability in Practice",
        snippet:
          "Business models that prioritize **sustainability** are shared by industry experts in this session.",
        url: "#",
      },
      {
        title: "Workshop: Measuring Sustainability",
        snippet:
          "In your organization, **sustainability** can be assessed using new tools and techniques.",
        url: "#",
      },
    ],
    url: "https://www.example.com/greentech-summit-2023",
  }),
};
