import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, unpack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { Header as HeaderComponent } from "./HeaderComponent";
import schema from "./header.schema.dereffed.json";
import customProperties from "./header-tokens.json";
import { dsa } from "../../themes";

const { args, argTypes } = getArgsShared(schema as JSONSchema7);
export const headerProps = {
  ...unpack(args),
  logo: dsa.logo,
};
const meta: Meta = {
  title: "Layout/Header",
  args: pack(headerProps),
  argTypes,
  component: HeaderComponent,
  parameters: {
    jsonschema: { schema },
    cssprops: { customProperties },
  },
  excludeStories: ["headerProps"],
};

export default meta;

type Story = StoryObj<typeof HeaderComponent>;

export const Header: Story = {
  parameters: {
    viewport: {
      width: 1280,
      height: 226,
    },
  },
};
