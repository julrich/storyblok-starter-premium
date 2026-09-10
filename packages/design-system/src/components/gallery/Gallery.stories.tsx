import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { Gallery } from "./GalleryComponent";
import schema from "./gallery.schema.dereffed.json";
import customProperties from "./gallery-tokens.json";

const meta: Meta<typeof Gallery> = {
  title: "Components/Gallery",
  component: Gallery,
  parameters: {
    jsonschema: { schema },
    cssprops: { customProperties },
  },
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof Gallery>;

export const SmallSquaresWithLightbox: Story = {
  parameters: {
    viewport: {
      width: 1100,
      height: 702,
    },
  },
  args: pack({
    aspectRatio: "square",
    layout: "smallTiles",
    lightbox: true,
    images: [
      {
        src: "img/placeholder/image-gallery-01.svg",
        caption: "Caption Image 1",
        alt: "Alt text Image 1",
      },
      {
        src: "img/placeholder/image-gallery-02.svg",
        caption: "Caption Image 2",
        alt: "Alt text Image 2",
      },
      {
        src: "img/placeholder/image-gallery-03.svg",
        caption: "Caption Image 3",
        alt: "Alt text Image 3",
      },
      {
        src: "img/placeholder/image-gallery-04.svg",
        caption: "Caption Image 4",
        alt: "Alt text Image 4",
      },
      {
        src: "img/placeholder/image-gallery-05.svg",
        caption: "Caption Image 5",
        alt: "Alt text Image 5",
      },
      {
        src: "img/placeholder/image-gallery-06.svg",
        caption: "Caption Image 6",
        alt: "Alt text Image 6",
      },
      {
        src: "img/placeholder/image-gallery-01.svg",
        caption: "Caption Image 7",
        alt: "Alt text Image 7",
      },
    ],
  }),
};

export const LargeLandscapeTiles: Story = {
  parameters: {
    viewport: {
      width: 1440,
      height: 724,
    },
  },
  args: pack({
    layout: "largeTiles",
    aspectRatio: "landscape",
    images: [
      {
        src: "img/placeholder/image-gallery-02.svg",
        caption: "Caption Image 1",
        alt: "Alt text Image 1",
      },
      {
        src: "img/placeholder/image-gallery-04.svg",
        caption: "Caption Image 2",
        alt: "Alt text Image 2",
      },
      {
        src: "img/placeholder/image-gallery-04.svg",
        caption: "Caption Image 3",
        alt: "Alt text Image 3",
      },
      {
        src: "img/placeholder/image-gallery-02.svg",
        caption: "Caption Image 4",
        alt: "Alt text Image 4",
      },
      {
        src: "img/placeholder/image-gallery-02.svg",
        caption: "Caption Image 5",
        alt: "Alt text Image 5",
      },
      {
        src: "img/placeholder/image-gallery-04.svg",
        caption: "Caption Image 6",
        alt: "Alt text Image 6",
      },
    ],
  }),
};

export const FreeAspectRatio: Story = {
  parameters: {
    viewport: {
      width: 1040,
      height: 818,
    },
  },
  args: pack({
    layout: "smallTiles",
    lightbox: true,
    images: [
      {
        src: "img/placeholder/image-gallery-01.svg",
        caption: "Caption Image 1",
        alt: "Alt text Image 1",
      },
      {
        src: "img/placeholder/image-gallery-02.svg",
        caption: "Caption Image 2",
        alt: "Alt text Image 2",
      },
      {
        src: "img/placeholder/image-gallery-03.svg",
        caption: "Caption Image 3",
        alt: "Alt text Image 3",
      },
      {
        src: "img/placeholder/image-gallery-04.svg",
        caption: "Caption Image 4",
        alt: "Alt text Image 4",
      },
      {
        src: "img/placeholder/image-gallery-05.svg",
        caption: "Caption Image 5",
        alt: "Alt text Image 5",
      },
      {
        src: "img/placeholder/image-gallery-06.svg",
        caption: "Caption Image 6",
        alt: "Alt text Image 6",
      },
      {
        src: "img/placeholder/image-gallery-01.svg",
        caption: "Caption Image 7",
        alt: "Alt text Image 7",
      },
    ],
  }),
};

export const StackLandscape: Story = {
  parameters: {
    viewport: {
      width: 846,
      height: 1512,
    },
  },
  args: pack({
    aspectRatio: "landscape",
    images: [
      {
        src: "img/placeholder/image-gallery-02.svg",
        caption: "Caption Image 1",
        alt: "Alt text Image 1",
      },
      {
        src: "img/placeholder/image-gallery-04.svg",
        caption: "Caption Image 2",
        alt: "Alt text Image 2",
      },
      {
        src: "img/placeholder/image-gallery-02.svg",
        caption: "Caption Image 3",
        alt: "Alt text Image 3",
      },
    ],
    layout: "stack",
  }),
};

export const SliderGallery: Story = {
  parameters: {
    viewport: {
      width: 1200,
      height: 600,
    },
  },
  args: pack({
    layout: "slider",
    lightbox: true,
    images: [
      {
        src: "img/placeholder/image-gallery-01.svg",
        caption: "Caption Image 1",
        alt: "Alt text Image 1",
      },
      {
        src: "img/placeholder/image-gallery-02.svg",
        caption: "Caption Image 2",
        alt: "Alt text Image 2",
      },
      {
        src: "img/placeholder/image-gallery-03.svg",
        caption: "Caption Image 3",
        alt: "Alt text Image 3",
      },
      {
        src: "img/placeholder/image-gallery-04.svg",
        caption: "Caption Image 4",
        alt: "Alt text Image 4",
      },
      {
        src: "img/placeholder/image-gallery-05.svg",
        caption: "Caption Image 5",
        alt: "Alt text Image 5",
      },
      {
        src: "img/placeholder/image-gallery-06.svg",
        caption: "Caption Image 6",
        alt: "Alt text Image 6",
      },
      {
        src: "img/placeholder/image-gallery-01.svg",
        caption: "Caption Image 7",
        alt: "Alt text Image 7",
      },
    ],
  }),
};
