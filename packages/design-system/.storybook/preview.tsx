import React, { useEffect } from "react";
import { actions } from "storybook/actions";
import { useGlobals } from "storybook/preview-api";
import {
  DocsContainer,
  DocsContainerProps,
} from "@storybook/addon-docs/blocks";
import "lazysizes/plugins/attrchange/ls.attrchange";
import { Preview } from "@storybook/react-vite";
import { unpackDecorator } from "@kickstartds/core/lib/storybook";
import { CssPropsParameter } from "@kickstartds/storybook-addon-component-tokens";
import { light } from "./themes";

import { PageWrapper } from "../src/components/page-wrapper/PageWrapperComponent";
import { providerDecorator } from "../src/components/Providers";
import { LinkProvider } from "../src/docs/LinkProvider";

import "./preview.css";

const STATIC_THEME_FILES: Record<string, string> = {
  blizzard: "/tokens/branding-tokens-blizzard.css",
  burgundy: "/tokens/branding-tokens-burgundy.css",
  coffee: "/tokens/branding-tokens-coffee.css",
  ember: "/tokens/branding-tokens-ember.css",
  granit: "/tokens/branding-tokens-granit.css",
  mint: "/tokens/branding-tokens-mint.css",
  neon: "/tokens/branding-tokens-neon.css",
  water: "/tokens/branding-tokens-water.css",
};

const THEME_LINK_ID = "storybook-theme-override-link";
const THEME_STYLE_ID = "storybook-theme-override-style";
const THEME_FONT_LINK_ID = "storybook-theme-font-link";
const GENERIC_FONT_RE =
  /^(system-ui|ui-monospace|ui-serif|ui-sans-serif|ui-rounded|monospace|sans-serif|serif|cursive|fantasy)$/i;

/** Extract first font-family name per role from CSS text, load from Google Fonts. */
function loadFontsFromCss(css: string) {
  document.getElementById(THEME_FONT_LINK_ID)?.remove();
  const families = new Set<string>();
  for (const role of ["display", "copy", "interface", "mono"]) {
    const match = css.match(
      new RegExp(`--ks-brand-font-family-${role}:\\s*([^;]+)`),
    );
    if (!match) continue;
    // First family: strip quotes, ignore fallbacks after comma
    const first = match[1].split(",")[0].trim().replace(/^["']|["']$/g, "");
    if (first && !GENERIC_FONT_RE.test(first)) {
      families.add(first);
    }
  }
  if (families.size === 0) return;
  const params = [...families]
    .map((f) => `family=${encodeURIComponent(f)}:wght@300;400;500;600;700`)
    .join("&");
  const link = document.createElement("link");
  link.id = THEME_FONT_LINK_ID;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?${params}&display=swap`;
  document.head.appendChild(link);
}

function clearThemeOverrides() {
  document.getElementById(THEME_LINK_ID)?.remove();
  document.getElementById(THEME_STYLE_ID)?.remove();
  document.getElementById(THEME_FONT_LINK_ID)?.remove();
}

function injectThemeLink(href: string) {
  clearThemeOverrides();
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.id = THEME_LINK_ID;
  link.href = href;
  document.head.appendChild(link);
  // Fetch the CSS to extract font families and load from Google Fonts
  fetch(href)
    .then((r) => r.text())
    .then((css) => loadFontsFromCss(css))
    .catch(() => {});
}

function injectThemeStyle(css: string) {
  clearThemeOverrides();
  const style = document.createElement("style");
  style.id = THEME_STYLE_ID;
  style.textContent = css;
  document.head.appendChild(style);
  loadFontsFromCss(css);
}

// Pre-fetch CMS themes so the preview can apply them by ID
const cmsThemeCssCache: Record<string, string> = {};
(function fetchCmsThemes() {
  const token =
    typeof STORYBLOK_API_TOKEN !== "undefined" ? STORYBLOK_API_TOKEN : "";
  if (!token) return;
  fetch(
    `https://api.storyblok.com/v2/cdn/stories?starts_with=settings/themes/&content_type=token-theme&token=${encodeURIComponent(token)}`,
  )
    .then((r) => r.json())
    .then((data) => {
      if (!data.stories) return;
      for (const s of data.stories) {
        if (s.content?.system) continue;
        if (s.content?.css) cmsThemeCssCache[s.slug] = s.content.css;
      }
    })
    .catch(() => {});
})();

const myActions = actions("radio");
window._ks.radio.on("*", myActions.radio);

const cssPropsNameRe =
  "^--(?:[a-z]+-?[a-z]+)+(?:_+(?<variant>[a-z]+[-_]?[a-z]+))?(--(?<property>([a-z]+-?[a-z]+)+))?(?:_(?<state>[a-z]+-?[a-z]+))?$";

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    options: {
      storySort: {
        order: [
          "Docs",
          ["Welcome", "Integration"],
          "Components",
          "Form",
          "Layout",
          "Blog",
          "Page Archetypes",
          ["Landingpage", "Showcase", "Overview", "Blog Post", "Blog Overview"],
          "Design Tokens",
        ],
        method: "alphabetical",
      },
    },
    a11y: {
      test: "off",
    },
    designToken: {
      disable: true,
    },
    docs: {
      theme: light,
      container: (props: DocsContainerProps) => (
        <LinkProvider>
          <PageWrapper>
            <DocsContainer {...props} />
          </PageWrapper>
        </LinkProvider>
      ),
    },
    html: {
      decorators: [unpackDecorator, providerDecorator],
    },
    jsonschema: {
      packArgs: true,
    },
    cssprops: {
      group: {
        label: `{{name}}{{#if media}} @ {{media}}{{/if}}`,
        category: `{{#regex name="${cssPropsNameRe}"}}{{variant}}{{/regex}}`,
        subcategory: `{{#regex name="${cssPropsNameRe}"}}{{#if variant}}{{property}}{{/if}}{{/regex}}`,
      },
    } satisfies CssPropsParameter,
    viewport: {
      width: 1280,
      height: 720,
    },
  },
  decorators: [
    unpackDecorator,
    (Story) => {
      const [globals] = useGlobals();
      const theme = (globals.theme as string) || "default";
      const inverted = globals.inverted === true;

      useEffect(() => {
        if (theme === "default") {
          clearThemeOverrides();
        } else if (theme.startsWith("cms:")) {
          const slug = theme.slice(4);
          const css = cmsThemeCssCache[slug];
          if (css) {
            injectThemeStyle(css);
          }
        } else if (STATIC_THEME_FILES[theme]) {
          injectThemeLink(STATIC_THEME_FILES[theme]);
        }
        return () => clearThemeOverrides();
      }, [theme]);

      useEffect(() => {
        const root = document.getElementById("storybook-root");
        if (!root) return;
        if (inverted) {
          root.setAttribute("ks-inverted", "true");
          root.style.backgroundColor = "var(--ks-background-color-default)";
        } else {
          root.removeAttribute("ks-inverted");
          root.style.backgroundColor = "";
        }
        return () => {
          root.removeAttribute("ks-inverted");
          root.style.backgroundColor = "";
        };
      }, [inverted]);

      return (
        <PageWrapper>
          <Story />
        </PageWrapper>
      );
    },
  ],
  initialGlobals: {
    theme: "default",
    inverted: false,
  },
};

export default preview;
