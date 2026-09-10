import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { Stats } from "./StatsComponent";
import schema from "./stats.schema.json";
import customProperties from "./stats-tokens.json";

const meta: Meta = {
  title: "Components/Stats",
  component: Stats,
  parameters: {
    jsonschema: { schema },
    cssprops: { customProperties },
  },
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof Stats>;

export const CountUpWithIcons: Story = {
  parameters: {
    viewport: {
      width: 790,
      height: 318,
    },
  },
  args: pack({
    stat: [
      { number: "150K", title: "Count", icon: "person" },
      { number: "99%", title: "Rate", icon: "star" },
      { number: "50h", title: "Duration", icon: "time" },
    ],
  }),
};

export const CountUpWithDescription: Story = {
  parameters: {
    viewport: {
      width: 700,
      height: 278,
    },
  },
  args: pack({
    align: "left",
    stat: [
      {
        number: "1500",
        title: "Users",
        description:
          "An example count used to visualize quantity-based information.",
      },
      {
        number: "99.9%",
        title: "Success Rate",
        description:
          "A sample percentage value displayed for demonstration purposes.",
      },
    ],
  }),
};
