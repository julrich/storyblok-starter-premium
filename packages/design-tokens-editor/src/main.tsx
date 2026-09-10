import "./init";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { LoginPage } from "./LoginPage";
import "@kickstartds/design-system/tokens/fonts.css";
import brandingTokens from "@kickstartds/design-system/tokens/branding-tokens.json";

// Convert W3C DTCG color components [R, G, B] (0–1 range) to hex
function componentsToHex(components: number[]): string {
  const hex = (n: number) =>
    Math.round(n * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${hex(components[0])}${hex(components[1])}${hex(components[2])}`;
}

// Convert components to rgba with a given alpha
function componentsToRgba(components: number[], alpha: number): string {
  return `rgba(${Math.round(components[0] * 255)}, ${Math.round(components[1] * 255)}, ${Math.round(components[2] * 255)}, ${alpha})`;
}

// Mix two component arrays: source * amount + target * (1 - amount)
function mixToHex(source: number[], target: number[], amount: number): string {
  return componentsToHex(
    source.map((v, i) => v * amount + target[i] * (1 - amount)),
  );
}

// Primitive values from W3C DTCG branding tokens (single source of truth)
const primary = brandingTokens.color.primary.$root.$value.components;
const fg = brandingTokens.color.fg.$root.$value.components;
const bg = brandingTokens.color.bg.$root.$value.components;
const scale = brandingTokens.color.scale;

// Font families (quote names that contain spaces)
const toFontStack = (families: string[]) =>
  families.map((f) => (f.includes(" ") ? `"${f}"` : f)).join(", ");
const fontInterface = toFontStack(brandingTokens.font.family.interface.$value);

export const theme = createTheme({
  palette: {
    primary: { main: componentsToHex(primary) },
    background: {
      default: mixToHex(primary, bg, scale["9"].$value),
      paper: componentsToHex(bg),
    },
    text: {
      primary: componentsToHex(fg),
      secondary: componentsToRgba(fg, scale["3"].$value),
    },
    divider: mixToHex(fg, bg, scale["7"].$value),
  },
  typography: {
    fontFamily: fontInterface,
    fontSize: 14,
    button: {
      textTransform: "none" as const,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiGrid: {
      styleOverrides: {
        root: {
          "--Grid-columnSpacing": "0.5em",
          "--Grid-rowSpacing": "0.5em",
        },
      },
    },
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          position: "sticky",
          top: 0,
          zIndex: 2,
          backgroundImage: "none",
          backgroundColor: componentsToHex(bg),
          color: componentsToHex(fg),
          borderBottom: `1px solid ${mixToHex(fg, bg, scale["7"].$value)}`,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none" as const,
          fontWeight: 500,
          fontSize: "0.875rem",
          minHeight: 44,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: "3px 3px 0 0",
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        dense: {
          minHeight: 44,
        },
      },
    },
  },
});

type AuthState = "loading" | "authenticated" | "unauthenticated";

function Root() {
  const [auth, setAuth] = useState<AuthState>("loading");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => setAuth(res.ok ? "authenticated" : "unauthenticated"))
      .catch(() => setAuth("unauthenticated"));
  }, []);

  if (auth === "loading") return null;
  if (auth === "unauthenticated")
    return <LoginPage onLogin={() => setAuth("authenticated")} />;
  return <App />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <Root />
    </ThemeProvider>
  </React.StrictMode>,
);
