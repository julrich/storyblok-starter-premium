import React, { memo, useCallback, useEffect, useState } from "react";
import { useGlobals } from "storybook/manager-api";
import {
  IconButton,
  WithTooltip,
  TooltipLinkList,
} from "storybook/internal/components";
import { PaintBrushIcon, ContrastIcon } from "@storybook/icons";

const ADDON_ID = "kickstartds/theme-switcher";
const TOOL_ID = `${ADDON_ID}/tool`;

interface ThemeColors {
  primary: string;
  fg: string;
  bg: string;
  bgInverted: string;
}

interface CmsTheme {
  slug: string;
  name: string;
  css: string;
  colors: ThemeColors;
}

const DEFAULT_COLORS: ThemeColors = {
  primary: "#3065c0",
  fg: "#06081f",
  bg: "#ffffff",
  bgInverted: "#0f203e",
};

const STATIC_THEMES: Array<{
  value: string;
  label: string;
  colors: ThemeColors;
}> = [
  {
    value: "blizzard",
    label: "Blizzard",
    colors: {
      primary: "#007aa3",
      fg: "#001036",
      bg: "#ffffff",
      bgInverted: "#006080",
    },
  },
  {
    value: "burgundy",
    label: "Burgundy",
    colors: {
      primary: "#b70e87",
      fg: "#06081f",
      bg: "#fff2fb",
      bgInverted: "#460433",
    },
  },
  {
    value: "coffee",
    label: "Coffee",
    colors: {
      primary: "#ffa959",
      fg: "#ffa959",
      bg: "#261b25",
      bgInverted: "#ffcea0",
    },
  },
  {
    value: "ember",
    label: "Ember",
    colors: {
      primary: "#ffa959",
      fg: "#ffa959",
      bg: "#261b25",
      bgInverted: "#ffcea0",
    },
  },
  {
    value: "granit",
    label: "Granit",
    colors: {
      primary: "#581c87",
      fg: "#06081f",
      bg: "#fafafa",
      bgInverted: "#131820",
    },
  },
  {
    value: "mint",
    label: "Mint",
    colors: {
      primary: "#02816e",
      fg: "#03312a",
      bg: "#f8fdef",
      bgInverted: "#022b25",
    },
  },
  {
    value: "neon",
    label: "Neon",
    colors: {
      primary: "#e21879",
      fg: "#ffffff",
      bg: "#06081f",
      bgInverted: "#f1f1f3",
    },
  },
  {
    value: "water",
    label: "Water",
    colors: {
      primary: "#5d88ec",
      fg: "#e4e9f9",
      bg: "#001036",
      bgInverted: "#d4e4ff",
    },
  },
];

/** Convert W3C DTCG [0-1] float color components to hex. */
function componentsToHex(components: number[] | undefined): string | null {
  if (!components || components.length < 3) return null;
  const hex = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${hex(components[0])}${hex(components[1])}${hex(components[2])}`;
}

/** Extract theme colors from W3C Design Token JSON. */
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

/**
 * 4-dot theme swatch: fg + primary on light bg (left), primary + fg on dark bg (right).
 */
function ThemeSwatch({
  colors,
  size = 20,
}: {
  colors: ThemeColors;
  size?: number;
}) {
  const dotSize = size * 0.28;
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
      <span
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: dotSize * 0.3,
          backgroundColor: colors.bg,
        }}
      >
        <span
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: "50%",
            backgroundColor: colors.fg,
          }}
        />
        <span
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: "50%",
            backgroundColor: colors.primary,
          }}
        />
      </span>
      <span
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: dotSize * 0.3,
          backgroundColor: colors.bgInverted,
        }}
      >
        <span
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: "50%",
            backgroundColor: colors.primary,
          }}
        />
        <span
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: "50%",
            backgroundColor: colors.fg,
          }}
        />
      </span>
    </span>
  );
}

export const InvertedTool = memo(function InvertedTool() {
  const [globals, updateGlobals] = useGlobals();
  const inverted = globals.inverted === true;

  const toggle = useCallback(() => {
    updateGlobals({ inverted: !inverted });
  }, [inverted, updateGlobals]);

  return (
    <IconButton
      key="kickstartds/inverted-tool"
      title={inverted ? "Inverted mode (on)" : "Inverted mode (off)"}
      active={inverted}
      onClick={toggle}
    >
      <ContrastIcon />
    </IconButton>
  );
});

export const ThemeTool = memo(function ThemeTool() {
  const [globals, updateGlobals] = useGlobals();
  const [cmsThemes, setCmsThemes] = useState<CmsTheme[]>([]);

  const selectedTheme = (globals.theme as string) || "default";

  // Fetch CMS themes from Storyblok CDN API on mount
  useEffect(() => {
    const token =
      (window as unknown as Record<string, string>).__STORYBLOK_TOKEN__ || "";
    if (!token) return;

    fetch(
      `https://api.storyblok.com/v2/cdn/stories?starts_with=settings/themes/&content_type=token-theme&token=${encodeURIComponent(token)}`,
    )
      .then((r) => r.json())
      .then((data) => {
        if (!data.stories) return;
        const themes: CmsTheme[] = data.stories
          .filter((s: { content: { system?: boolean } }) => !s.content?.system)
          .map(
            (s: {
              slug: string;
              name: string;
              content: { name?: string; css?: string; tokens?: string };
            }) => ({
              slug: s.slug,
              name: s.content?.name || s.name,
              css: s.content?.css || "",
              colors: extractThemeColors(s.content?.tokens),
            }),
          );
        setCmsThemes(themes);
      })
      .catch(() => {
        // Silently fail — CMS themes just won't appear
      });
  }, []);

  const selectTheme = useCallback(
    (themeId: string) => {
      updateGlobals({ theme: themeId });
    },
    [updateGlobals],
  );

  // Build grouped links for TooltipLinkList
  type LinkItem = {
    id: string;
    title: string;
    right?: React.ReactNode;
    active: boolean;
    onClick: () => void;
    disabled?: boolean;
    style?: React.CSSProperties;
  };
  const groups: Array<Array<LinkItem>> = [];

  // Group 1: Default + CMS themes
  const themeGroup: LinkItem[] = [
    {
      id: "default",
      title: "Default",
      right: <ThemeSwatch colors={DEFAULT_COLORS} />,
      active: selectedTheme === "default",
      onClick: () => selectTheme("default"),
    },
    ...cmsThemes.map((t) => ({
      id: `cms:${t.slug}`,
      title: t.name,
      right: <ThemeSwatch colors={t.colors} />,
      active: selectedTheme === `cms:${t.slug}`,
      onClick: () => selectTheme(`cms:${t.slug}`),
    })),
  ];
  groups.push(themeGroup);

  // Group 2: Built-in static themes
  groups.push(
    STATIC_THEMES.map((t) => ({
      id: t.value,
      title: t.label,
      right: <ThemeSwatch colors={t.colors} />,
      active: selectedTheme === t.value,
      onClick: () => selectTheme(t.value),
    })),
  );

  // Derive display title
  let displayTitle = "Default";
  if (selectedTheme.startsWith("cms:")) {
    const slug = selectedTheme.slice(4);
    displayTitle = cmsThemes.find((t) => t.slug === slug)?.name || slug;
  } else if (selectedTheme !== "default") {
    displayTitle =
      STATIC_THEMES.find((t) => t.value === selectedTheme)?.label ||
      selectedTheme;
  }

  return (
    <WithTooltip
      placement="top"
      trigger="click"
      closeOnOutsideClick
      tooltip={<TooltipLinkList links={groups} />}
    >
      <IconButton
        key={TOOL_ID}
        title={`Theme: ${displayTitle}`}
        active={selectedTheme !== "default"}
      >
        <PaintBrushIcon />
      </IconButton>
    </WithTooltip>
  );
});
