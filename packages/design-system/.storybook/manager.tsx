import { addons, types } from "storybook/manager-api";
import { light } from "./themes";
import { ThemeTool, InvertedTool } from "./ThemeTool";

import "./manager.css";

const ADDON_ID = "kickstartds/theme-switcher";
const TOOL_ID = `${ADDON_ID}/tool`;

addons.setConfig({ theme: light });

const INVERTED_TOOL_ID = `${ADDON_ID}/inverted-tool`;

addons.register(ADDON_ID, () => {
  addons.add(TOOL_ID, {
    type: types.TOOL,
    title: "Theme",
    match: ({ tabId, viewMode }) => !tabId && viewMode === "story",
    render: ThemeTool,
  });
  addons.add(INVERTED_TOOL_ID, {
    type: types.TOOL,
    title: "Inverted",
    match: ({ tabId, viewMode }) => !tabId && viewMode === "story",
    render: InvertedTool,
  });
});
