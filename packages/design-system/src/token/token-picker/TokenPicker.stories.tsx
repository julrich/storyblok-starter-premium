import React from "react";
import { TokenPicker } from "./TokenPicker";
import "../preview/preview-pages.scss";

const Page = () => (
  <div className="preview-page" style={{ maxWidth: "960px", margin: "0 auto" }}>
    <TokenPicker />
  </div>
);

export default {
  title: "Token / Token Picker",
  render: Page,
  parameters: {
    layout: "fullscreen",
  },
};

export const Picker = {};
