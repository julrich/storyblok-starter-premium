import { Meta, StoryObj } from "@storybook/react-vite";
import { getArgsShared, pack } from "@kickstartds/core/lib/storybook";
import { JSONSchema7 } from "json-schema";
import { Button } from "../button/ButtonComponent";
import { SearchModal } from "./SearchModalComponent";
import schema from "./search-modal.schema.dereffed.json";
import "../search-form/SearchFormPagefind.client";
import "./RadioEmit.client";

const meta: Meta<typeof SearchModal> = {
  title: "Corporate / Search Modal",
  component: SearchModal,
  parameters: {
    viewport: {
      width: 770,
      height: 216,
    },
    jsonschema: { schema },
  },
  ...getArgsShared(schema as JSONSchema7),
  render(args) {
    return (
      <>
        <Button
          size="small"
          label="Open"
          ks-component="dsa.radio-emit"
          data-topic="dsa.search-modal.open"
        />
        <hr />
        <SearchModal {...args} />
      </>
    );
  },
};

export default meta;

type Story = StoryObj<typeof SearchModal>;

export const Pagefind: Story = {
  args: pack({
    form: {
      component: "dsa.search-form.pagefind",
      action: "iframe.html?id=corporate-search-form--pagefind&viewMode=story",
      target: "_self",
    },
  }),
};
