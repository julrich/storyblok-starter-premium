import ColorDemo from "./ColorDemoComponent";
import FontDemo from "./FontDemoComponent";
import SpacingDemo from "./SpacingDemoComponent";
import ShadowDemo from "./ShadowDemoComponent";
import TransitionDemo from "./TransitionDemoComponent";
import BorderDemo from "./BorderDemoComponent";

export default {
  title: "Token / Playground",
  parameters: {
    layout: "fullscreen",
  },
  tags: ["!manifest"],
};

export const Color = {
  render: () => <ColorDemo />,
};
export const Font = {
  render: () => <FontDemo />,
};
export const Spacing = {
  render: () => <SpacingDemo />,
};
export const Shadow = {
  render: () => <ShadowDemo />,
};
export const Transition = {
  render: () => <TransitionDemo />,
};
export const Border = {
  render: () => <BorderDemo />,
};
