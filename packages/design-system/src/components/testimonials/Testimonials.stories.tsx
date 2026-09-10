import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { Testimonials } from "./TestimonialsComponent";
import schema from "./testimonials.schema.dereffed.json";
import customProperties from "./testimonials-tokens.json";

const meta: Meta<typeof Testimonials> = {
  title: "Components/Testimonials",
  component: Testimonials,
  parameters: {
    jsonschema: { schema },
    cssprops: { customProperties },
  },
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof Testimonials>;

export const Simple: Story = {
  parameters: {
    viewport: {
      width: 770,
      height: 409,
    },
  },
  args: pack({
    testimonial: [
      {
        quote: `This is an example testimonial used to demonstrate layout and typography.`,
        image: {
          src: "img/placeholder/avatar-round.svg",
          alt: "Alt Text Testimonial Image",
        },
        name: "Taylor Reed",
        title: "Digital Platforms & Ecosystems",
      },
    ],
  }),
};

export const WithTitle: Story = {
  parameters: {
    viewport: {
      width: 770,
      height: 409,
    },
  },
  args: pack({
    testimonial: [
      {
        quote: `Sample feedback text showing how a testimonial could appear in this component.`,
        image: {
          src: "img/placeholder/avatar-round.svg",
          alt: "Alt Text Testimonial Image",
        },
        name: "Emily Johnson",
        title: "Chief Marketing Officer",
      },
    ],
  }),
};

export const ListLayout: Story = {
  parameters: {
    viewport: {
      width: 770,
      height: 996,
    },
  },
  args: pack({
    layout: "list",
    testimonial: [
      {
        quote: `This is an example testimonial used to demonstrate layout and typography.`,
        image: {
          src: "img/placeholder/avatar-round.svg",
          alt: "Alt Text Testimonial Image",
        },
        name: "Emily Johnson",
        title: "Chief Marketing Officer",
        rating: 5,
      },
      {
        quote: `Sample feedback text showing how a testimonial could appear in this component.`,
        image: {
          src: "img/placeholder/avatar-round.svg",
          alt: "Alt Text Testimonial Image",
        },
        name: "John Smith",
        title: "Director of Digital Strategy",
        rating: 4,
      },
      {
        quote: `Placeholder quote intended to be replaced with real user feedback.`,
        image: {
          src: "img/placeholder/avatar-round.svg",
          alt: "Alt Text Testimonial Image",
        },
        name: "Alex Chen",
        title: "CEO",
        rating: 5,
      },
    ],
  }),
};

export const SliderLayout: Story = {
  parameters: {
    viewport: {
      width: 770,
      height: 450,
    },
  },
  args: pack({
    testimonial: [
      {
        quote: `This is an example testimonial used to demonstrate layout and typography.`,
        image: {
          src: "img/placeholder/avatar-round.svg",
          alt: "Alt Text Testimonial Image",
        },
        name: "Emily Johnson",
        title: "Chief Marketing Officer",
      },
      {
        quote: `Sample feedback text showing how a testimonial could appear in this component.`,
        image: {
          src: "img/placeholder/avatar-round.svg",
          alt: "Alt Text Testimonial Image",
        },
        name: "John Smith",
        title: "Director of Digital Strategy",
      },
      {
        quote: `Placeholder quote intended to be replaced with real user feedback.`,
        image: {
          src: "img/placeholder/avatar-round.svg",
          alt: "Alt Text Testimonial Image",
        },
        name: "Alex Chen",
        title: "CEO",
      },
    ],
  }),
};

export const WithRating: Story = {
  parameters: {
    viewport: {
      width: 770,
      height: 450,
    },
  },
  args: pack({
    testimonial: [
      {
        quote: `This is an example testimonial used to demonstrate layout and typography.`,
        image: {
          src: "img/placeholder/avatar-round.svg",
          alt: "Alt Text Testimonial Image",
        },
        name: "Emily Johnson",
        title: "Chief Marketing Officer",
        rating: 5,
      },
      {
        quote: `Sample feedback text showing how a testimonial could appear in this component.`,
        image: {
          src: "img/placeholder/avatar-round.svg",
          alt: "Alt Text Testimonial Image",
        },
        name: "John Smith",
        title: "Director of Digital Strategy",
        rating: 4,
      },
      {
        quote: `Placeholder quote intended to be replaced with real user feedback.`,
        image: {
          src: "img/placeholder/avatar-round.svg",
          alt: "Alt Text Testimonial Image",
        },
        name: "Alex Chen",
        title: "CEO",
        rating: 5,
      },
    ],
  }),
};

export const AlternatingLayout: Story = {
  parameters: {
    viewport: {
      width: 770,
      height: 996,
    },
  },
  args: pack({
    layout: "alternating",
    testimonial: [
      {
        quote: `This is an example testimonial used to demonstrate layout and typography.`,
        image: {
          src: "img/placeholder/avatar-round.svg",
          alt: "Alt Text Testimonial Image",
        },
        name: "Emily Johnson",
        title: "Chief Marketing Officer",
      },
      {
        quote: `Sample feedback text showing how a testimonial could appear in this component.`,
        image: {
          src: "img/placeholder/avatar-round.svg",
          alt: "Alt Text Testimonial Image",
        },
        name: "John Smith",
        title: "Director of Digital Strategy",
      },
      {
        quote: `Placeholder quote intended to be replaced with real user feedback.`,
        image: {
          src: "img/placeholder/avatar-round.svg",
          alt: "Alt Text Testimonial Image",
        },
        name: "Alex Chen",
        title: "CEO",
      },
    ],
  }),
};
