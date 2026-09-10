import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "@kickstartds/design-system/tokens/fonts.css";
import "@kickstartds/design-system/tokens/branding-tokens.css";
import "./styles/editor.css";

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
