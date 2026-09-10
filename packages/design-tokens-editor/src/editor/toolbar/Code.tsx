import { validate } from "@kickstartds/design-system/tokens/branding-tokens.schema.validate.mjs";
import DataObjectIcon from "@mui/icons-material/DataObject";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import { FormEvent, useId, useState } from "react";
import { useToken } from "../../token/TokenContext";

export const Code = () => {
  const formId = useId();
  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const { tokens, setTokens } = useToken();
  const [error, setError] = useState<string>();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const code = formData.get("code");
    if (typeof code === "string") {
      try {
        const parsed = JSON.parse(code);
        if (!validate(parsed)) {
          if (validate.errors) {
            const [firstError] = validate.errors;
            setError(`${firstError.instancePath} ${firstError.message}`);
          }
        } else {
          setTokens(parsed);
          handleClose();
        }
      } catch (e) {
        setError("Invalid JSON");
      }
    }
  };

  return (
    <>
      <IconButton aria-label="import / export" onClick={handleOpen}>
        <DataObjectIcon />
      </IconButton>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Import / Export</DialogTitle>
        <DialogContent sx={{ minWidth: "30em" }}>
          <form onSubmit={onSubmit} id={formId}>
            <TextField
              autoFocus
              required
              name="code"
              label="JSON"
              fullWidth
              slotProps={{ input: { sx: { fontFamily: "Monospace" } } }}
              defaultValue={JSON.stringify(tokens, null, 2) || ""}
              multiline
              sx={{ marginTop: 1 }}
              onInput={() => setError(undefined)}
              error={!!error}
              helperText={error}
              rows={24}
            />
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" form={formId}>
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
