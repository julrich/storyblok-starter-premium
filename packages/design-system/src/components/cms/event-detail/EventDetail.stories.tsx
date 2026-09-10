import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { EventDetail as EventDetailComponent } from "./EventDetailComponent";
import schema from "../event-detail.schema.dereffed.json";

const meta: Meta<typeof EventDetailComponent> = {
  component: EventDetailComponent,
  title: "Page Archetypes/Event Detail",
  parameters: {
    jsonschema: { schema },
    layout: "fullscreen",
  },
  tags: ["!manifest"],
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof EventDetailComponent>;

export const EventDetail: Story = {
  parameters: {
    viewport: {
      width: 1440,
      height: 850,
    },
  },
  args: pack({
    title: "Systemics Design Conference 2025",
    categories: [{ label: "Conference" }, { label: "Design Systems" }],
    intro:
      "A full-day event for design system professionals and enthusiasts. Join us to learn, share, and connect with like-minded individuals.",
    locations: [
      {
        displayMode: "compact",
        locationName: `Köln Messe`,
        address: `Messeplatz 1<br />
      50679 Köln`,
        links: [
          {
            url: "https://maps.google.com/?q=Berlin+Congress+Center",
            label: "Open in Google Maps",
          },
        ],
        dates: [
          {
            date: "2025-09-18",
            time: "09:00 – 17:00",
            label: "Register",
            url: "#",
            ariaLabel:
              "Register for the event on 18th September 2025 from 09:00 to 17:00",
          },
          {
            date: "2025-09-18",
            time: "09:00 – 17:00",
            label: "Register",
            url: "#",
            ariaLabel:
              "Register for the event on 18th September 2025 from 09:00 to 17:00",
          },
          {
            date: "2025-09-18",
            time: "09:00 – 17:00",
            label: "Register",
            url: "#",
            ariaLabel:
              "Register for the event on 18th September 2025 from 09:00 to 17:00",
          },
        ],
      },
      {
        displayMode: "compact",
        locationName: `Berlin Congress Center (BCC) Redaktion & Event GmbH & Co. KG`,
        address: `Alexanderplatz 1<br />
      10178 Berlin`,
        dates: [
          {
            date: "2025-09-18",
            time: "09:00 – 17:00",
            label: "Register",
            url: "#",
            ariaLabel:
              "Register for the event on 18th September 2025 from 09:00 to 17:00",
          },
          {
            date: "2025-09-18",
            time: "09:00 – 17:00",
            label: "Register",
            url: "#",
            ariaLabel:
              "Register for the event on 18th September 2025 from 09:00 to 17:00",
          },
        ],
        links: [
          {
            url: "https://maps.google.com/?q=Berlin+Congress+Center",
            label: "Open in Google Maps",
          },
          {
            url: "https://www.berlincongresscenter.com",
            label: "Location Website",
          },
        ],
      },
    ],
    description: `
Join us for a day of inspiring talks, hands-on workshops, and networking with design system experts from around the world.

**Highlights:**
- Keynotes from industry leaders
- Practical sessions on design tokens, accessibility, and scaling systems
- Evening networking event with food & drinks
  `,
    images: [
      {
        alt: "Alt text Image 1",
        caption: "Caption Image 1",
        src: "img/close-up-young-business-team-working.png",
      },
      {
        alt: "Alt text Image 2",
        caption: "Caption Image 2",
        src: "img/low-angle-tall-building-with-many-windows_23-2148230392.png",
      },
      {
        src: "img/full-shot-different-people-working-together.png",
        caption: "Caption Image 3",
        alt: "Alt text Image 3",
      },
      {
        src: "img/top-view-desk-with-keyboard-drawing-pad.png",
        caption: "Caption Image 4",
        alt: "Alt text Image 4",
      },
    ],
    download: [
      {
        name: "Product Brochure",
        format: "PDF",
        size: "2.5 MB",
        previewImage: "img/offset-image.png",
        url: "img/offset-image.png",
      },
      {
        name: "Company Brochure",
        previewImage: "img/kickstartDS/CMS-Starter producthunt-slide-01.svg",
        format: "PDF",
        size: "3.2 MB",
        url: "img/kickstartDS/CMS-Starter producthunt-slide-01.svg",
      },
      {
        name: "User Guide",
        format: "DOC",
        size: "20 KB",
        url: "assets/user-guide.doc",
      },
      {
        name: "Technical Specifications",
        format: "TXT",
        size: "12 KB",
        url: "assets/technical-specifications.txt",
      },
    ],
    button: {
      label: "See all Events",
      url: "/#",
    },
  }),
};
