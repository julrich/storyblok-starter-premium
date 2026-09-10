import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";

export const EditorToolbar = () => {
  return (
    <AppBar position="static" elevation={0}>
      <Toolbar variant="dense">
        <Box
          component="img"
          src="/logo.svg"
          alt="kickstartDS"
          sx={{ height: 24, mr: 1.5 }}
        />
        <Typography
          variant="body1"
          sx={{ fontWeight: 500, whiteSpace: "nowrap" }}
        >
          Design Tokens Editor
        </Typography>
      </Toolbar>
    </AppBar>
  );
};
