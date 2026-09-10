import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { Downloads } from "./DownloadsComponent";
import customProperties from "./downloads-tokens.json";
import schema from "./downloads.schema.dereffed.json";

const meta: Meta = {
  title: "Corporate/Downloads",
  component: Downloads,
  parameters: {
    jsonschema: { schema },
    cssprops: { customProperties },
  },
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof Downloads>;

export const TechnicalDetailsOnly: Story = {
  parameters: {
    viewport: {
      width: 770,
      height: 416,
    },
  },
  args: pack({
    download: [
      {
        name: "Product Brochure",
        format: "PDF",
        size: "2.5 MB",
        previewImage: "img/offset-image.png",
        url: "#",
      },
      {
        name: "Company Brochure",
        previewImage: "img/kickstartDS/CMS-Starter producthunt-slide-01.svg",
        format: "PDF",
        size: "3.2 MB",
        url: "#",
      },
      {
        name: "User Guide",
        format: "DOC",
        size: "20 KB",
        url: "#",
      },
      {
        name: "Technical Specifications",
        format: "TXT",
        size: "12 KB",
        url: "#",
      },
    ],
  }),
};

export const DescriptionOnly: Story = {
  parameters: {
    viewport: {
      width: 770,
      height: 460,
    },
  },
  args: pack({
    download: [
      {
        name: "Product Brochure",
        description:
          "Detailed product information and specifications. Recommended for all users.",
        previewImage: "img/offset-image.png",
      },
      {
        name: "Technical Specifications",
        description:
          "In-depth technical details and requirements. Recommended for technical users.",
        previewImage: "img/kickstartDS/CMS-Starter producthunt-slide-01.svg",
      },
      {
        name: "User Guide",
        description: "Comprehensive guide to using our product.",
        previewImage: "img/about/cta.png",
      },
      {
        name: "Company Brochure",
        description: "Overview of our company and services.",
        previewImage: "img/view-modern-office.jpg",
      },
    ],
  }),
};

export const Complete: Story = {
  parameters: {
    viewport: {
      width: 770,
      height: 516,
    },
  },
  args: pack({
    download: [
      {
        name: "Product Brochure",
        format: "PDF",
        size: "2.5 MB",
        description:
          "Detailed product information and specifications. Recommended for all users.",
        previewImage: "img/offset-image.png",
      },
      {
        name: "Company Brochure",
        description: "Overview of our company and services.",
        previewImage: "img/kickstartDS/CMS-Starter producthunt-slide-01.svg",
        format: "PDF",
        size: "3.2 MB",
      },
      {
        name: "User Guide",
        description: "Comprehensive guide to using our product.",
        format: "DOC",
        size: "20 KB",
      },
      {
        name: "Technical Specifications",
        description:
          "In-depth technical details and requirements. Recommended for technical users.",
        format: "TXT",
        size: "12 KB",
      },
    ],
  }),
};

export const Mixed: Story = {
  parameters: {
    viewport: {
      width: 770,
      height: 460,
    },
  },
  args: pack({
    download: [
      {
        name: "Product Brochure",
        format: "PDF",
        size: "2.5 MB",
        description:
          "Detailed product information and specifications. Recommended for all users.",
        previewImage: "img/offset-image.png",
      },
      {
        name: "User Guide",
        format: "PDF",
        size: "1.2 MB",
        previewImage: "img/about/cta.png",
      },
      {
        name: "Company Brochure",
        previewImage: "img/kickstartDS/CMS-Starter producthunt-slide-01.svg",
      },
      {
        name: "Technical Specifications",
        description: "In-depth technical details and requirements.",
      },
    ],
  }),
};
