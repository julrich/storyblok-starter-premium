import SaveIcon from "@mui/icons-material/Save";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { usePreset } from "../../presets/PresetContext";
import { useToken } from "../../token/TokenContext";

export const Save = () => {
  const { presetName, isSystemPreset } = usePreset();
  const { savePreset } = useToken();

  const disabled = !presetName || isSystemPreset;
  const title = isSystemPreset
    ? "System theme — use Save As to create a copy"
    : "Save";

  return (
    <Tooltip title={title}>
      <span>
        <IconButton
          aria-label="save"
          onClick={() => savePreset()}
          disabled={disabled}
        >
          <SaveIcon />
        </IconButton>
      </span>
    </Tooltip>
  );
};
