import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { CSSProperties, FormEvent, useEffect, useId, useState } from "react";
import { usePreset } from "../../presets/PresetContext";

interface ThemeColors {
  primary: string;
  fg: string;
  bg: string;
  bgInverted: string;
}

const DEFAULT_COLORS: ThemeColors = {
  primary: "#3065c0",
  fg: "#06081f",
  bg: "#ffffff",
  bgInverted: "#0f203e",
};

function componentsToHex(components: number[] | undefined): string | null {
  if (!components || components.length < 3) return null;
  const hex = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${hex(components[0])}${hex(components[1])}${hex(components[2])}`;
}

function extractThemeColors(tokensJson: string | undefined): ThemeColors {
  if (!tokensJson) return DEFAULT_COLORS;
  try {
    const tokens = JSON.parse(tokensJson);
    const color = tokens?.color;
    if (!color) return DEFAULT_COLORS;
    return {
      primary:
        componentsToHex(color.primary?.$root?.$value?.components) ||
        DEFAULT_COLORS.primary,
      fg:
        componentsToHex(color.fg?.$root?.$value?.components) ||
        DEFAULT_COLORS.fg,
      bg:
        componentsToHex(color.bg?.$root?.$value?.components) ||
        DEFAULT_COLORS.bg,
      bgInverted:
        componentsToHex(color.bg?.inverted?.$value?.components) ||
        DEFAULT_COLORS.bgInverted,
    };
  } catch {
    return DEFAULT_COLORS;
  }
}

function ThemeSwatch({
  colors,
  size = 20,
}: {
  colors: ThemeColors;
  size?: number;
}) {
  const dotSize = size * 0.28;
  const halfStyle: CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: dotSize * 0.3,
  };
  const dot = (bg: string): CSSProperties => ({
    width: dotSize,
    height: dotSize,
    borderRadius: "50%",
    backgroundColor: bg,
  });

  return (
    <span
      style={{
        display: "inline-flex",
        width: size,
        height: size,
        borderRadius: 3,
        overflow: "hidden",
        flexShrink: 0,
        boxShadow:
          "rgba(0,0,0,0.1) 0px 1px 3px 0px, rgba(0,0,0,0.06) 0px 1px 2px 0px",
      }}
    >
      <span style={{ ...halfStyle, backgroundColor: colors.bg }}>
        <span style={dot(colors.fg)} />
        <span style={dot(colors.primary)} />
      </span>
      <span style={{ ...halfStyle, backgroundColor: colors.bgInverted }}>
        <span style={dot(colors.primary)} />
        <span style={dot(colors.fg)} />
      </span>
    </span>
  );
}

export const Load = () => {
  const formId = useId();
  const selectId = useId();
  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const { presetName, presetNames, getPresetList, selectPreset } = usePreset();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get("name");
    if (typeof name === "string") {
      selectPreset(name);
      handleClose();
    }
  };

  useEffect(() => {
    if (open) {
      getPresetList();
    }
  }, [open]);

  return (
    <>
      <IconButton aria-label="load" onClick={handleOpen}>
        <CloudDownloadIcon />
      </IconButton>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Load</DialogTitle>
        <DialogContent sx={{ minWidth: "26em" }}>
          <form onSubmit={onSubmit} id={formId}>
            <FormControl
              fullWidth
              sx={{ marginTop: 1 }}
              disabled={!presetNames}
            >
              <InputLabel id={selectId}>Preset</InputLabel>
              <Select
                labelId="demo-simple-select-label"
                id={selectId}
                label="Preset"
                name="name"
                defaultValue={presetName || ""}
                renderValue={(value) => {
                  const entry = presetNames?.find((e) => e.name === value);
                  return entry
                    ? `${entry.displayName}${entry.system ? " 🔒" : ""}`
                    : value;
                }}
              >
                {presetNames?.map((entry) => (
                  <MenuItem key={entry.name} value={entry.name}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <ThemeSwatch
                        colors={extractThemeColors(entry.tokens)}
                        size={22}
                      />
                    </ListItemIcon>
                    <ListItemText>
                      {entry.displayName}
                      {entry.system ? " 🔒" : ""}
                    </ListItemText>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" form={formId}>
            Load
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
