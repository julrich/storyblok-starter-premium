import { useEffect } from "react";

export const useTheme = (themeCss?: string) => {
  useEffect(() => {
    const id = "branding-token-link";
    const existing = document.getElementById(id) as HTMLLinkElement | null;

    if (!themeCss) {
      existing?.remove();
      return;
    }

    let link = existing;
    if (!link) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.id = id;
      document.head.appendChild(link);
    }
    link.href = themeCss;
  }, [themeCss]);
};
