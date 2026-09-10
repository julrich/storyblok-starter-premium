import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import SearchIcon from "@mui/icons-material/Search";
import Alert from "@mui/material/Alert";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import InputLabel from "@mui/material/InputLabel";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { FC, useEffect, useMemo, useState } from "react";
import { getComponentStories } from "../preview-page/ComponentPreviewPage";
import { useSearchParams } from "../utils/router";
import { useComponentTokens } from "./ComponentTokenContext";
import { ComponentTokenEditor } from "./ComponentTokenEditor";

/** Category assignments for component grouping. */
const CATEGORIES: Record<string, string[]> = {
  Heroes: ["hero", "video-curtain"],
  Content: [
    "blog-aside",
    "blog-head",
    "blog-teaser",
    "cta",
    "faq",
    "features",
    "headline",
    "html",
    "image-story",
    "image-text",
    "rich-text",
    "stats",
    "text",
  ],
  Cards: [
    "business-card",
    "contact",
    "event-latest-teaser",
    "event-latest",
    "event-list-teaser",
    "teaser-card",
    "testimonials",
  ],
  Media: ["gallery", "lightbox", "logos", "mosaic", "slider"],
  Layout: ["divider", "section", "split-even", "split-weighted"],
  Navigation: [
    "breadcrumb",
    "content-nav",
    "footer",
    "header",
    "nav-flyout",
    "nav-toggle",
    "nav-topbar",
    "pagination",
  ],
  Forms: [
    "button",
    "checkbox",
    "checkbox-group",
    "radio",
    "radio-group",
    "select-field",
    "text-area",
    "text-field",
  ],
  Utility: ["cookie-consent", "downloads"],
};

/** Build a reverse lookup: componentId → category. */
function buildComponentCategory(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [category, ids] of Object.entries(CATEGORIES)) {
    for (const id of ids) map[id] = category;
  }
  return map;
}

const componentCategory = buildComponentCategory();

export const ComponentEditor: FC = () => {
  const {
    catalog,
    componentIds,
    overrideCounts,
    orphanedTokens,
    stripOrphans,
  } = useComponentTokens();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [storyId, setStoryId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Available story variants for the currently selected component
  const stories = useMemo(
    () => (selected ? getComponentStories(selected) : []),
    [selected],
  );

  // Reset story variant when component changes; default to first story
  useEffect(() => {
    setStoryId(stories.length > 0 ? stories[0].id : null);
  }, [stories]);

  // Drive the preview iframe to show the selected component + story variant
  useEffect(() => {
    if (selected) {
      const page = storyId
        ? `component/${selected}/${storyId}`
        : `component/${selected}`;
      searchParams.set("page", page);
    }
  }, [selected, storyId, searchParams]);

  const grouped = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    const groups: Record<string, string[]> = {};

    for (const id of componentIds) {
      const entry = catalog[id];
      if (!entry) continue;
      if (
        lowerSearch &&
        !entry.displayName.toLowerCase().includes(lowerSearch) &&
        !id.includes(lowerSearch)
      )
        continue;

      const category = componentCategory[id] || "Other";
      if (!groups[category]) groups[category] = [];
      groups[category].push(id);
    }
    return groups;
  }, [componentIds, catalog, search]);

  const categoryOrder = [
    ...Object.keys(CATEGORIES),
    ...(grouped["Other"] ? ["Other"] : []),
  ];

  return (
    <Box sx={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Sidebar */}
      <Box
        sx={{
          width: 200,
          minWidth: 200,
          borderRight: 1,
          borderColor: "divider",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Box sx={{ p: 1 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Search components…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>
        <List
          dense
          sx={{
            overflow: "auto",
            flex: 1,
          }}
        >
          {categoryOrder.map((category, catIndex) => {
            const ids = grouped[category];
            if (!ids || ids.length === 0) return null;
            return (
              <li key={category}>
                {catIndex > 0 && <Divider sx={{ my: 0.5 }} />}
                <ListSubheader
                  sx={{
                    lineHeight: "32px",
                    fontWeight: 700,
                    fontSize: "0.65rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "text.secondary",
                    bgcolor: "action.hover",
                    borderBottom: 1,
                    borderColor: "divider",
                  }}
                >
                  {category}
                </ListSubheader>
                {ids.map((id) => {
                  const count = overrideCounts[id] || 0;
                  return (
                    <ListItemButton
                      key={id}
                      selected={selected === id}
                      onClick={() => setSelected(id)}
                      sx={{ py: 0.25, pl: 2 }}
                    >
                      <ListItemText
                        primary={catalog[id].displayName}
                        primaryTypographyProps={{ fontSize: "0.8rem" }}
                      />
                      {count > 0 && (
                        <Badge
                          badgeContent={count}
                          color="primary"
                          sx={{ mr: 1 }}
                        />
                      )}
                    </ListItemButton>
                  );
                })}
              </li>
            );
          })}
        </List>
      </Box>

      {/* Main area */}
      <Box sx={{ flex: 1, overflow: "auto" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            px: 1,
            pt: 0.5,
          }}
        >
          <Tooltip title="How token cascade works">
            <IconButton size="small" onClick={() => setShowHelp((p) => !p)}>
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Collapse in={showHelp}>
          <Alert severity="info" sx={{ mx: 1, mb: 1, fontSize: "0.8rem" }}>
            <strong>Token Cascade Order</strong>
            <br />
            1. <strong>Branding CSS</strong> — global tokens set in the Branding
            tab
            <br />
            2. <strong>Component CSS</strong> — per-component overrides set here
            <br />
            3. <strong>Manual overrides</strong> — inline token values on
            individual pages
            <br />
            <br />
            Component overrides take precedence over branding tokens but are
            overridden by any manual inline values. Use the{" "}
            <strong>link icon</strong> on any token input to pick a semantic
            token reference (e.g. <code>var(--ks-spacing-l)</code>).
          </Alert>
        </Collapse>
        {orphanedTokens.length > 0 && (
          <Alert
            severity="warning"
            sx={{ mx: 1, mb: 1, fontSize: "0.8rem" }}
            action={
              <IconButton
                size="small"
                onClick={stripOrphans}
                title="Remove orphaned overrides"
              >
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  Clean
                </Typography>
              </IconButton>
            }
          >
            {orphanedTokens.length} orphaned override
            {orphanedTokens.length !== 1 ? "s" : ""} found (tokens removed or
            renamed in the design system).
          </Alert>
        )}
        {selected ? (
          <>
            {stories.length > 1 && (
              <FormControl size="small" sx={{ mx: 1, mb: 1, minWidth: 200 }}>
                <InputLabel id="story-variant-label">
                  Preview variant
                </InputLabel>
                <Select
                  labelId="story-variant-label"
                  value={storyId ?? ""}
                  label="Preview variant"
                  onChange={(e) => setStoryId(e.target.value)}
                >
                  {stories.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <ComponentTokenEditor componentId={selected} />
          </>
        ) : (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "text.secondary",
            }}
          >
            <Typography>Select a component to edit its tokens</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};
