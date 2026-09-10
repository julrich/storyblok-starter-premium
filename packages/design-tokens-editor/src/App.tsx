import BrushIcon from "@mui/icons-material/Brush";
import ExtensionIcon from "@mui/icons-material/Extension";
import HubIcon from "@mui/icons-material/Hub";
import DoubleArrowLeftIcon from "@mui/icons-material/KeyboardDoubleArrowLeft";
import DoubleArrowRightIcon from "@mui/icons-material/KeyboardDoubleArrowRight";
import Box from "@mui/material/Box";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import classNames from "classnames";
import { lazy, Suspense, useState } from "react";
import { ComponentEditor } from "./component-editor/ComponentEditor";
import { ComponentTokenContextProvider } from "./component-editor/ComponentTokenContext";
import { Editor } from "./editor/Editor";
import { EditorToolbar } from "./editor/Toolbar";
import { PresetContextProvider } from "./presets/PresetContext";
import { Preview } from "./preview/Preview";
import { TokenContextProvider } from "./token/TokenContext";
import { SearchParamsProvider } from "./utils/router";
import { useMatchMediaQuery } from "./utils/useMatchMediaQuery";
import "./App.scss";

const LazyGraphView = lazy(() =>
  import("./graph/GraphView").then((m) => ({ default: m.GraphView })),
);

type ViewMode = "branding" | "components" | "graph";

export const App = () => {
  const isLargeScreen = useMatchMediaQuery("(min-width: 35em)");
  const [showEditor, setShowEditor] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("branding");

  const viewToggle = (
    <Box
      sx={{
        display: "flex",
        justifyContent: "flex-start",
        px: 1,
        py: 0.5,
        borderBottom: 1,
        borderColor: "divider",
        flexShrink: 0,
      }}
    >
      <ToggleButtonGroup
        value={viewMode}
        exclusive
        onChange={(_, val) => val && setViewMode(val)}
        size="small"
      >
        <ToggleButton value="branding">
          <BrushIcon sx={{ mr: 0.5, fontSize: 18 }} />
          Branding
        </ToggleButton>
        <ToggleButton value="components">
          <ExtensionIcon sx={{ mr: 0.5, fontSize: 18 }} />
          Components
        </ToggleButton>
        <ToggleButton value="graph">
          <HubIcon sx={{ mr: 0.5, fontSize: 18 }} />
          Graph
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );

  if (viewMode === "graph") {
    return (
      <main className="content">
        <SearchParamsProvider>
          <PresetContextProvider>
            <TokenContextProvider>
              <ComponentTokenContextProvider>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    width: "100%",
                    height: "100%",
                  }}
                >
                  <EditorToolbar />
                  {viewToggle}
                  <Box sx={{ flex: 1, position: "relative" }}>
                    <Suspense
                      fallback={
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            height: "100%",
                          }}
                        >
                          Loading graph…
                        </Box>
                      }
                    >
                      <LazyGraphView />
                    </Suspense>
                  </Box>
                </Box>
              </ComponentTokenContextProvider>
            </TokenContextProvider>
          </PresetContextProvider>
        </SearchParamsProvider>
      </main>
    );
  }

  return (
    <main className="content">
      <SearchParamsProvider>
        <PresetContextProvider>
          <TokenContextProvider>
            <ComponentTokenContextProvider>
              <Box
                className={classNames(
                  "content__pane content__editor-pane",
                  !showEditor && "content__editor-pane--hidden",
                  viewMode === "components" && "content__editor-pane--wide",
                )}
                sx={{
                  borderRight: 1,
                  borderColor: "divider",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <EditorToolbar />
                {viewToggle}
                <Box sx={{ flex: 1, overflow: "auto" }}>
                  {viewMode === "branding" ? <Editor /> : <ComponentEditor />}
                </Box>
              </Box>
              <div
                className={classNames(
                  "content__pane content__preview-pane",
                  !isLargeScreen &&
                    showEditor &&
                    "content__preview-pane--shrunk",
                )}
              >
                <ToggleButtonGroup className="content__editor-toggle">
                  <ToggleButton
                    value="show"
                    onClick={() => setShowEditor((prev) => !prev)}
                    aria-label={(showEditor ? "hide" : "show") + " editor"}
                    title={(showEditor ? "hide" : "show") + " editor"}
                  >
                    {showEditor ? (
                      <DoubleArrowLeftIcon />
                    ) : (
                      <DoubleArrowRightIcon />
                    )}
                  </ToggleButton>
                </ToggleButtonGroup>
                <Preview viewMode={viewMode} />
              </div>
            </ComponentTokenContextProvider>
          </TokenContextProvider>
        </PresetContextProvider>
      </SearchParamsProvider>
    </main>
  );
};
