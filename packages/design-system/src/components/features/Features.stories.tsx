import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { Features } from "./FeaturesComponent";
import schema from "./features.schema.dereffed.json";
import customProperties from "./features-tokens.json";

const meta: Meta<typeof Features> = {
  title: "Components/Features",
  component: Features,
  parameters: {
    jsonschema: { schema },
    cssprops: { customProperties },
  },
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof Features>;

export const IconCentered: Story = {
  parameters: {
    viewport: {
      width: 1440,
      height: 636,
    },
  },
  args: pack({
    style: "centered",
    layout: "largeTiles",
    feature: [
      {
        icon: "star",
        title: "Consistent Experience",
        text: "Ensures a consistent and recognizable experience across different pages and touchpoints. This helps users navigate content more easily and builds trust through visual continuity.",
        cta: {
          url: "#",
          label: "Learn more",
        },
      },
      {
        icon: "time",
        title: "Flexible Configuration",
        text: "The component can be adapted to different requirements and contexts. Content, structure, and presentation can be adjusted without changing the underlying setup.",
        cta: {
          url: "#",
          label: "View options",
        },
      },
      {
        icon: "upload",
        title: "Ready for Integration",
        text: "Designed to work seamlessly within existing systems and workflows. It supports integration into various environments and can evolve alongside your platform.",
        cta: {
          url: "#",
          label: "See details",
        },
      },
      {
        icon: "login",
        title: "Built with Care",
        text: "Developed with stability, reliability, and best practices in mind. The component supports long-term use and helps maintain a robust and dependable setup.",
        cta: {
          url: "#",
          label: "Read more",
        },
      },
      {
        icon: "person",
        title: "Easy to Maintain",
        text: "Structured in a way that simplifies updates and ongoing maintenance. Changes can be applied efficiently without affecting unrelated parts of the system.",
        cta: {
          url: "#",
          label: "Learn how",
        },
      },
      {
        icon: "map",
        title: "Reusable by Design",
        text: "Created to be reused across multiple pages and scenarios. This helps reduce duplication and supports a more efficient content and component workflow.",
        cta: {
          url: "#",
          label: "Explore usage",
        },
      },
    ],
  }),
};

export const StackWithButton: Story = {
  parameters: {
    viewport: {
      width: 1230,
      height: 463,
    },
  },
  args: pack({
    style: "stack",
    layout: "smallTiles",
    ctas: {
      style: "button",
    },
    feature: [
      {
        icon: "star",
        title: "Consistent Experience",
        text: "Ensures a consistent and recognizable experience across different pages and touchpoints. This helps users navigate content more easily and builds trust through visual continuity.",
        cta: {
          url: "#",
          label: "Learn more",
        },
      },
      {
        icon: "time",
        title: "Flexible Configuration",
        text: "The component can be adapted to different requirements and contexts. Content, structure, and presentation can be adjusted without changing the underlying setup.",
        cta: {
          url: "#",
          label: "View options",
        },
      },
      {
        icon: "upload",
        title: "Ready for Integration",
        text: "Designed to work seamlessly within existing systems and workflows. It supports integration into various environments and can evolve alongside your platform.",
        cta: {
          url: "#",
          label: "See details",
        },
      },
      {
        icon: "login",
        title: "Built with Care",
        text: "Developed with stability, reliability, and best practices in mind. The component supports long-term use and helps maintain a robust and dependable setup.",
        cta: {
          url: "#",
          label: "Read more",
        },
      },
    ],
  }),
};

export const ListView: Story = {
  parameters: {
    viewport: {
      width: 770,
      height: 844,
    },
  },
  args: pack({
    style: "besideLarge",
    layout: "list",
    ctas: {
      style: "intext",
      toggle: false,
    },
    feature: [
      {
        icon: "star",
        title: "Consistent Experience",
        text: "Ensures a consistent and recognizable experience across different pages and touchpoints. This helps users navigate content more easily and builds trust through visual continuity.",
        cta: {
          url: "#",
          label: "Learn more",
        },
      },
      {
        icon: "time",
        title: "Flexible Configuration",
        text: "The component can be adapted to different requirements and contexts. Content, structure, and presentation can be adjusted without changing the underlying setup.",
        cta: {
          url: "#",
          label: "View options",
        },
      },
      {
        icon: "upload",
        title: "Ready for Integration",
        text: "Designed to work seamlessly within existing systems and workflows. It supports integration into various environments and can evolve alongside your platform.",
        cta: {
          url: "#",
          label: "See details",
        },
      },
      {
        icon: "login",
        title: "Built with Care",
        text: "Developed with stability, reliability, and best practices in mind. The component supports long-term use and helps maintain a robust and dependable setup.",
        cta: {
          url: "#",
          label: "Read more",
        },
      },
      {
        icon: "person",
        title: "Easy to Maintain",
        text: "Structured in a way that simplifies updates and ongoing maintenance. Changes can be applied efficiently without affecting unrelated parts of the system.",
        cta: {
          url: "#",
          label: "Learn how",
        },
      },
      {
        icon: "map",
        title: "Reusable by Design",
        text: "Created to be reused across multiple pages and scenarios. This helps reduce duplication and supports a more efficient content and component workflow.",
        cta: {
          url: "#",
          label: "Explore usage",
        },
      },
    ],
  }),
};

export const IconBesideWithLinkInText: Story = {
  parameters: {
    viewport: {
      width: 1000,
      height: 476,
    },
  },
  args: pack({
    style: "intext",
    layout: "smallTiles",
    ctas: {
      style: "intext",
    },
    feature: [
      {
        icon: "star",
        title: "Consistent Experience",
        text: "Ensures a consistent and recognizable experience across different pages and touchpoints. This helps users navigate content more easily and builds trust through visual continuity.",
        cta: {
          url: "#",
          label: "Learn more",
        },
      },
      {
        icon: "time",
        title: "Flexible Configuration",
        text: "The component can be adapted to different requirements and contexts. Content, structure, and presentation can be adjusted without changing the underlying setup.",
        cta: {
          url: "#",
          label: "View options",
        },
      },
      {
        icon: "upload",
        title: "Ready for Integration",
        text: "Designed to work seamlessly within existing systems and workflows. It supports integration into various environments and can evolve alongside your platform.",
        cta: {
          url: "#",
          label: "See details",
        },
      },
      {
        icon: "login",
        title: "Built with Care",
        text: "Developed with stability, reliability, and best practices in mind. The component supports long-term use and helps maintain a robust and dependable setup.",
        cta: {
          url: "#",
          label: "Read more",
        },
      },
      {
        icon: "person",
        title: "Easy to Maintain",
        text: "Structured in a way that simplifies updates and ongoing maintenance. Changes can be applied efficiently without affecting unrelated parts of the system.",
        cta: {
          url: "#",
          label: "Learn how",
        },
      },
      {
        icon: "map",
        title: "Reusable by Design",
        text: "Created to be reused across multiple pages and scenarios. This helps reduce duplication and supports a more efficient content and component workflow.",
        cta: {
          url: "#",
          label: "Explore usage",
        },
      },
    ],
  }),
};

export const IconIntextWithLink: Story = {
  parameters: {
    viewport: {
      width: 1232,
      height: 524,
    },
  },
  args: pack({
    style: "intext",
    ctas: {
      style: "link",
    },
    feature: [
      {
        icon: "star",
        title: "Consistent Experience",
        text: "Ensures a consistent and recognizable experience across different pages and touchpoints. This helps users navigate content more easily and builds trust through visual continuity.",
        cta: {
          url: "#",
          label: "Learn more",
        },
      },
      {
        icon: "time",
        title: "Flexible Configuration",
        text: "The component can be adapted to different requirements and contexts. Content, structure, and presentation can be adjusted without changing the underlying setup.",
        cta: {
          url: "#",
          label: "View options",
        },
      },
      {
        icon: "upload",
        title: "Ready for Integration",
        text: "Designed to work seamlessly within existing systems and workflows. It supports integration into various environments and can evolve alongside your platform.",
        cta: {
          url: "#",
          label: "See details",
        },
      },
      {
        icon: "login",
        title: "Built with Care",
        text: "Developed with stability, reliability, and best practices in mind. The component supports long-term use and helps maintain a robust and dependable setup.",
        cta: {
          url: "#",
          label: "Read more",
        },
      },
      {
        icon: "person",
        title: "Easy to Maintain",
        text: "Structured in a way that simplifies updates and ongoing maintenance. Changes can be applied efficiently without affecting unrelated parts of the system.",
        cta: {
          url: "#",
          label: "Learn how",
        },
      },
      {
        icon: "map",
        title: "Reusable by Design",
        text: "Created to be reused across multiple pages and scenarios. This helps reduce duplication and supports a more efficient content and component workflow.",
        cta: {
          url: "#",
          label: "Explore usage",
        },
      },
    ],
  }),
};
