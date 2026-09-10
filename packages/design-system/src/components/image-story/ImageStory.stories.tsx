import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { ImageStory } from "./ImageStoryComponent";
import schema from "./image-story.schema.dereffed.json";
import customProperties from "./image-story-tokens.json";

const meta: Meta = {
  title: "Components/Image Story",
  component: ImageStory,
  parameters: {
    jsonschema: { schema },
    cssprops: { customProperties },
  },
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof ImageStory>;

export const StickyImageNextToScrollingText: Story = {
  parameters: {
    viewport: {
      width: 1440,
      height: 1144,
    },
  },
  args: pack({
    headline: "Key headline for this section",
    sub: "Brief supporting description",
    text: `
This section is intended to provide additional context and supporting information, while the accompanying image keeps sticky beside on larger screens.

### Clear Structure
This section provides space for structured content that can be used to explain topics in more detail. Headings help break down information into manageable parts and guide readers through the content in a clear and logical way.

### Flexible Usage
The text area can be used in different contexts and on various pages. Content can be short or extended, depending on the communication goal and the needs of the audience.

### Easy to Maintain
All content can be updated or replaced without affecting other parts of the page. This makes it easier to keep information current and ensures long-term usability.

### Consistent Presentation
Using a standardized text section helps maintain a consistent look and feel across the platform. This supports readability and creates a coherent user experience.

Ready to make your journey exceptional?
    `,
    largeHeadline: true,
    image: {
      src: "img/placeholder/image-gallery-05.svg",
      aspectRatio: "unset",
      vAlign: "top",
    },
    buttons: [
      {
        label: "Follow up",
        url: "#",
        icon: "arrow-right",
      },
    ],
  }),
};
