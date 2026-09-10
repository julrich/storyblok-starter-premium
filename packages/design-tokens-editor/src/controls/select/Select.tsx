import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import MuiSelect from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import { FC, ReactNode, useId } from "react";

export const Select: FC<{
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: ReactNode;
  label?: string;
}> = ({ value, onChange, options, label }) => {
  const id = useId();
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mr: 2 }}>
      {label && (
        <Typography
          component="label"
          htmlFor={id}
          variant="body2"
          sx={{ whiteSpace: "nowrap", color: "text.secondary" }}
        >
          {label}
        </Typography>
      )}
      <FormControl size="small">
        <MuiSelect
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          sx={{ minWidth: 80, '& .MuiSelect-select': { py: '4px' } }}
        >
          {options.map(({ value, label }) => (
            <MenuItem value={value} key={value}>
              {label}
            </MenuItem>
          ))}
        </MuiSelect>
      </FormControl>
    </Stack>
  );
};
