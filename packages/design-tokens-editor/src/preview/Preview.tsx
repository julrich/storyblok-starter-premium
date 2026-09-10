import { Checkbox, FormControlLabel } from "@mui/material";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import { useEffect, useMemo, useState } from "react";
import "./Preview.scss";
import { Select } from "../controls/select/Select";
import { useSearchParams } from "../utils/router";
import { Code } from "../editor/toolbar/Code";
import { Css } from "../editor/toolbar/Css";
import { Load } from "../editor/toolbar/Load";
import { Restore } from "../editor/toolbar/Restore";
import { Save } from "../editor/toolbar/Save";
import { SaveAs } from "../editor/toolbar/SaveAs";

type ViewMode = "branding" | "components";

const widths = ["100%", "400px", "800px"];
const pages = [
  { value: "demo", label: "Demo" },
  { value: "landingpage", label: "Landingpage" },
  { value: "jobs", label: "Jobs" },
  { value: "jobs-detail", label: "Job Detail" },
  { value: "overview", label: "Overview" },
];

const useIframeSrc = () => {
  const searchParams = useSearchParams();

  const pageParam = searchParams.get("page");
  const categoryParam = searchParams.get("cat");
  const invertedParam = searchParams.get("inverted");

  const hash = useMemo(() => {
    if (pageParam) {
      if (pageParam.startsWith("component/")) {
        return pageParam;
      }
      switch (pageParam) {
        case "demo":
          switch (categoryParam) {
            case "5":
              return "transition-demo";
            case "4":
              return "shadow-demo";
            case "3":
              return "border-demo";
            case "2":
              return "spacing-demo";
            case "1":
              return "font-demo";
            case "0":
            default:
              return "color-demo";
          }
        default:
          return pageParam;
      }
    }
    return "color-demo";
  }, [pageParam, categoryParam]);

  return `./preview.html#!${hash}${invertedParam ? "?inverted=1" : ""}`;
};

interface PreviewProps {
  viewMode?: ViewMode;
}

export const Preview = ({ viewMode = "branding" }: PreviewProps) => {
  const searchParams = useSearchParams();
  const isComponentMode = viewMode === "components";

  const [width, setWidth] = useState(widths[0]);
  const [page, setPage] = useState(searchParams.get("page") || pages[0].value);
  const [inverted, setInverted] = useState(false);
  const iframeSrc = useIframeSrc();

  useEffect(() => {
    searchParams.set("page", page);
  }, [page]);

  useEffect(() => {
    if (inverted) {
      searchParams.set("inverted", "1");
    } else {
      searchParams.delete("inverted");
    }
  }, [inverted]);

  return (
    <div className="preview">
      <AppBar position="static" elevation={0} className="preview__toolbar">
        <Toolbar variant="dense">
          {!isComponentMode && (
            <Select
              options={pages}
              value={page}
              onChange={setPage}
              label="preview:"
            />
          )}
          <Select
            options={widths.map((w) => ({ value: w, label: w }))}
            value={width}
            onChange={setWidth}
            label="viewport:"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={inverted}
                onChange={(e) => setInverted(e.target.checked)}
                size="small"
                sx={{ color: "text.secondary" }}
              />
            }
            label="Inverted?"
            sx={{
              "& .MuiFormControlLabel-label": {
                fontSize: "0.875rem",
                color: "text.secondary",
              },
            }}
          />
          <Box sx={{ flexGrow: 1 }} />
          <Restore />
          <Save />
          <SaveAs />
          <Load />
          <Code />
          <Css />
        </Toolbar>
      </AppBar>
      <Box className="preview__content">
        <Box
          className="preview__iframe-container"
          sx={{ backgroundColor: "grey.200" }}
        >
          <iframe
            className="preview__iframe"
            src={iframeSrc}
            title="Preview"
            style={{ width }}
          />
        </Box>
      </Box>
    </div>
  );
};
