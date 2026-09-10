import ClearIcon from "@mui/icons-material/Clear";
import LinkIcon from "@mui/icons-material/Link";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import { FC, useMemo, useState } from "react";
import {
  TokenReferencePicker,
  inferTokenCategories,
} from "./TokenReferencePicker";

interface TokenValueInputProps {
  /** The CSS custom property name. */
  tokenName: string;
  /** The default value from the catalog. */
  defaultValue: string;
  /** The current override value, or undefined if not overridden. */
  value: string | undefined;
  /** Called when the user changes the override value. */
  onChange: (value: string) => void;
  /** Called when the user resets the override. */
  onReset: () => void;
  /** The referenced semantic or component token, if any. */
  referencedToken?: string | null;
}

/**
 * Input for editing a single component token value.
 * Two modes: raw text input and reference picker (autocomplete of semantic tokens).
 * Smart defaults: reference mode if default is var(), raw mode if literal.
 */
export const TokenValueInput: FC<TokenValueInputProps> = ({
  tokenName,
  defaultValue,
  value,
  onChange,
  onReset,
  referencedToken,
}) => {
  const isOverridden = value !== undefined && value !== "";
  const currentVal = value ?? "";
  const [showPicker, setShowPicker] = useState(false);

  const suggestedCategories = useMemo(
    () => inferTokenCategories(tokenName, referencedToken ?? null),
    [tokenName, referencedToken],
  );

  if (showPicker) {
    return (
      <TokenReferencePicker
        value={currentVal}
        onChange={onChange}
        onClose={() => setShowPicker(false)}
        suggestedCategories={suggestedCategories}
      />
    );
  }

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <TextField
        size="small"
        variant="outlined"
        placeholder={defaultValue}
        value={currentVal}
        onChange={(e) => onChange(e.target.value)}
        fullWidth
        slotProps={{
          input: {
            sx: {
              fontFamily: "monospace",
              fontSize: "0.8rem",
            },
            endAdornment: isOverridden ? (
              <InputAdornment position="end">
                <Tooltip title="Reset to default">
                  <IconButton size="small" onClick={onReset} edge="end">
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ) : undefined,
          },
        }}
      />
      <Tooltip title="Pick semantic token reference">
        <IconButton size="small" onClick={() => setShowPicker(true)}>
          <LinkIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
};
