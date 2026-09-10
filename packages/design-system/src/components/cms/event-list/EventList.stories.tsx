import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { EventList as EventListComponent } from "./EventListComponent";
import schema from "../event-list.schema.dereffed.json";

const meta: Meta<typeof EventListComponent> = {
  component: EventListComponent,
  title: "Page Archetypes/Event List",
  parameters: {
    jsonschema: { schema },
    layout: "fullscreen",
  },
  tags: ["!manifest"],
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof EventListComponent>;

export const EventList: Story = {
  parameters: {
    viewport: {
      width: 1440,
      height: 850,
    },
  },
  args: pack({
    filter: {
      categories: {
        categoryCheckboxes: [
          "All",
          "Buyers",
          "Sellers",
          "Renters",
          "Landlords",
          "Tenants",
        ],
      },
    },
    events: [
      {
        category: "Real Estate",
        tags: ["Buyers", "Sellers", "Renters"],
        title: "Real Estate Expo 2025",
        date: "FRI, JAN 16",
        text: "Join us for the Real Estate Expo 2025, where industry leaders will discuss the future of real estate.",
        time: "10:00 AM",
        location: {
          name: "Berlin Convention Center",
          address: `123 Main St<br/>
10115  Berlin`,
        },
        image: {
          alt: "A futuristic AI concept image",
          src: "img/close-up-young-business-team-working.png",
        },
        cta: "Show appointment",
        url: "https://example.com",
      },
      {
        category: "Technology",
        tags: ["AI"],
        title: "The Future of AI",
        date: "14.01.2025",
        text: "The Future of AI is here and now - Join us to explore the latest advancements in artificial intelligence. AI is transforming industries and shaping the future. Don't miss out on this opportunity to learn from experts and network with peers.",
        time: "15:30 - 17:00",
        location: {
          name: "Cologne Exhibition Center",
          address: `123 Main St<br/>
50677  Cologne`,
        },
        image: {
          alt: "A futuristic AI concept image",
          src: "img/close-up-young-business-team-working.png",
        },
        cta: "Show appointment",
        url: "https://example.com",
      },
      {
        category: "Sustainability",
        tags: ["Sustainability", "Technology"],
        title:
          "Global Innovations Summit 2025: Advancing Sustainable Technologies",
        date: "20/30/2025",
        text: "Welcome to the Global Innovations Summit 2025, where we will explore the latest advancements in sustainable technologies. Join us for a day of insightful discussions and networking opportunities with industry leaders.",
        time: "from 17:00",
        location: {
          name: "Cologne Exhibition Center",
          address: `123 Main St<br/>
50677  Cologne`,
        },
        image: {
          alt: "A futuristic AI concept image",
          src: "img/close-up-young-business-team-working.png",
        },
        cta: "Show appointment",
        url: "https://example.com",
      },
    ],
  }),
};
