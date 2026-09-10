import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { Search as SearchComponent } from "./SearchComponent";
import schema from "../event-list.schema.dereffed.json";

const meta: Meta<typeof SearchComponent> = {
  component: SearchComponent,
  title: "Page Archetypes/Search",
  parameters: {
    jsonschema: { schema },
    layout: "fullscreen",
  },
  tags: ["!manifest"],
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof SearchComponent>;

export const Search: Story = {
  parameters: {
    viewport: {
      width: 1440,
      height: 850,
    },
  },
  args: pack({
    headline: {
      text: "Search",
      level: "h1",
      style: "h1",
    },
    searchFilter: {
      title: "Search Filters",
      categories: [
        {
          title: "Pages",
          url: "#",
          amount: 10,
        },
        {
          title: "News",
          url: "#",
          amount: 5,
        },
        {
          title: "Blog Posts",
          url: "#",
          amount: 2,
        },
      ],
    },
    searchResults: [
      {
        title: "Sustainable Living: Everyday Tips",
        previewImage: "img/people-brainstorming-work-meeting.png",
        initialMatch:
          "Embracing a **sustainable** lifestyle can significantly reduce your environmental impact. From using energy-efficient appliances to adopting renewable energy sources, every small step counts towards a greener future.",
        matches: [
          {
            title: "Home",
            snippet:
              "Simple changes can make your home more **sustainable** and energy-efficient.",
            url: "#",
          },
          {
            title: "Lifestyle",
            snippet:
              "Adopting a **sustainable** lifestyle benefits both you and the planet.",
            url: "#",
          },
        ],
        url: "www.example.com/lifestyle/sustainable-living",
      },
      {
        title: "Sustainable Architecture Trends",
        previewImage: "img/full-shot-different-people-working-together.png",
        initialMatch:
          "Discover how **sustainable** design is shaping the future of urban development, from green buildings to eco-friendly materials. Research shows that **sustainable** architecture not only benefits the environment but also enhances the well-being of its occupants.",
        url: "www.example.com/architecture/sustainable-trends",
      },
      {
        title: "How to Build a Sustainable Business",
        matches: [
          {
            title: "Getting Started",
            snippet:
              "A **sustainable** business model focuses on long-term growth and environmental responsibility.",
            url: "#",
          },
          {
            title: "Case Studies",
            snippet:
              "Explore examples of companies that have adopted **sustainable** practices successfully.",
            url: "#",
          },
          {
            title: "Materials",
            snippet:
              "Using **sustainable** materials can significantly reduce a building’s carbon footprint.",
            url: "#",
          },
        ],
        url: "www.example.com/business/sustainable-model",
      },
      {
        title: "Sustainable Living: Everyday Tips",
        previewImage: "img/full-shot-different-people-working-together.png",
        initialMatch:
          "Embracing a **sustainable** lifestyle can significantly reduce your environmental impact. From using energy-efficient appliances to adopting renewable energy sources, every small step counts towards a greener future.",
        matches: [
          {
            title: "Getting Started",
            snippet:
              "A **sustainable** business model focuses on long-term growth and environmental responsibility.",
            url: "#",
          },
          {
            title: "Case Studies",
            snippet:
              "Explore examples of companies that have adopted **sustainable** practices successfully.",
            url: "#",
          },
          {
            title: "Materials",
            snippet:
              "Using **sustainable** materials can significantly reduce a building’s carbon footprint.",
            url: "#",
          },
        ],
        url: "www.example.com/business/sustainable-model",
      },
    ],
  }),
};
