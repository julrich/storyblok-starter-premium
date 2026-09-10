import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { Faq } from "./FaqComponent";
import schema from "./faq.schema.dereffed.json";
import customProperties from "./faq-tokens.json";

const meta: Meta = {
  title: "Components/Faq",
  component: Faq,
  parameters: {
    jsonschema: { schema },
    cssprops: { customProperties },
  },
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof Faq>;

export const DropdownList: Story = {
  parameters: {
    viewport: {
      width: 820,
      height: 348,
    },
  },
  args: pack({
    questions: [
      {
        question: "Can the content be customized?",
        answer:
          "Yes. All content within this component can be fully customized. Text length, wording, and structure can be adapted to match different audiences, communication styles, or content strategies. The component supports both short, concise answers and more detailed explanations, depending on editorial needs.",
      },
      {
        question: "What is this component used for?",
        answer:
          "This component can be used across different pages and contexts, such as product pages, service descriptions, or informational sections.",
      },
      {
        question: "How many items are supported?",
        answer:
          "The number of questions and answers can be configured based on the component settings.",
      },
    ],
  }),
};

export const SingleDropdown: Story = {
  parameters: {
    viewport: {
      width: 820,
      height: 216,
    },
  },
  args: pack({
    questions: [
      {
        question: "Can the content be customized?",
        answer:
          "Yes. All content within this component can be fully customized. Text length, wording, and structure can be adapted to match different audiences, communication styles, or content strategies. The component supports both short, concise answers and more detailed explanations, depending on editorial needs.",
      },
    ],
  }),
};
