import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { SearchBar } from "./SearchBarComponent";
import schema from "./search-bar.schema.dereffed.json";

const meta: Meta<typeof SearchBar> = {
  title: "Corporate / Search Bar",
  component: SearchBar,
  parameters: {
    jsonschema: { schema },
  },
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof SearchBar>;

export const Default: Story = {
  parameters: {
    viewport: {
      width: 770,
      height: 253,
    },
  },
  args: pack({}),
};
