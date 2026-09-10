import RestoreIcon from "@mui/icons-material/Restore";
import IconButton from "@mui/material/IconButton";
import { useToken } from "../../token/TokenContext";

export const Restore = () => {
  const { resetTokens } = useToken();
  return (
    <IconButton aria-label="restore" onClick={resetTokens}>
      <RestoreIcon />
    </IconButton>
  );
};
