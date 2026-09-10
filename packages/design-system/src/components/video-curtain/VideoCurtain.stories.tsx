import { Meta, StoryObj } from "@storybook/react-vite";
import { JSONSchema7 } from "json-schema";
import { pack, getArgsShared } from "@kickstartds/core/lib/storybook";

import { VideoCurtain } from "./VideoCurtainComponent";
import schema from "./video-curtain.schema.dereffed.json";
import customProperties from "./video-curtain-tokens.json";

const meta: Meta = {
  title: "Components/Video Curtain",
  component: VideoCurtain,
  parameters: {
    jsonschema: { schema },
    cssprops: { customProperties },
  },
  ...getArgsShared(schema as JSONSchema7),
};

export default meta;

type Story = StoryObj<typeof VideoCurtain>;

export const AtmosphericVideoWithOverlay: Story = {
  parameters: {
    viewport: {
      width: 1280,
      height: 800,
    },
  },
  args: pack({
    headline: "This is the main headline",
    sub: "Subheading for additional context",
    text: "This is placeholder text used to demonstrate layout, spacing, and typography within the component.",
    overlay: true,
    textPosition: "center",
    buttons: [
      {
        label: "Start here",
      },
    ],
    video: {
      srcMobile: "img/videos/video-720.mp4",
      srcTablet: "img/videos/video-720.mp4",
      srcDesktop: "img/videos/video-720.mp4",
    },
  }),
};

export const ColorNeutralText: Story = {
  parameters: {
    viewport: {
      width: 1280,
      height: 800,
    },
  },
  args: pack({
    headline: "This is the main headline",
    sub: "Subheading for additional context",
    text: "This is placeholder text used to demonstrate layout, spacing, and typography within the component.",
    textPosition: "corner",
    colorNeutral: true,
    highlightText: true,
    overlay: true,
    buttons: [
      {
        label: "Start here",
      },
    ],
    video: {
      srcMobile: "img/videos/video-agency.mp4",
      srcTablet: "img/videos/video-agency.mp4",
      srcDesktop: "img/videos/video-agency.mp4",
    },
  }),
};

export const ColorNeutralVideo: Story = {
  parameters: {
    viewport: {
      width: 1280,
      height: 800,
    },
  },
  args: pack({
    headline: "This is the main headline",
    sub: "Subheading for additional context",
    text: "This is placeholder text used to demonstrate layout, spacing, and typography within the component.",
    textPosition: "center",
    highlightText: true,
    overlay: true,
    buttons: [
      {
        label: "Start here",
      },
    ],
    video: {
      srcMobile: "img/videos/handshake-bw.mp4",
      srcTablet: "img/videos/handshake-bw.mp4",
      srcDesktop: "img/videos/handshake-bw.mp4",
    },
  }),
};
