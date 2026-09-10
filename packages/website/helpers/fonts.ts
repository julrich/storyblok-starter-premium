import localFont from "next/font/local";

// next/font requires every option to be a statically analysable literal, so the
// src arrays and fallback stacks are repeated rather than shared via constants.
//
// Fonts are loaded from the Design System package (the same mechanism the
// monorepo uses for Montserrat), not from the website's own token/fonts.
//
// There is deliberately no copy font: drhubert's copy face is the system
// Helvetica stack, so --ks-brand-font-family-copy must fall through to the
// value compiled from the Design System's branding tokens.

const displayFont = localFont({
  src: [
    {
      path: "../../design-system/dist/static/fonts/TitilliumWeb-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../design-system/dist/static/fonts/TitilliumWeb-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../design-system/dist/static/fonts/TitilliumWeb-SemiBold.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../design-system/dist/static/fonts/TitilliumWeb-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../design-system/dist/static/fonts/TitilliumWeb-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  preload: true,
  display: "swap",
  variable: "--ks-brand-font-family-display",
  fallback: [
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "'Segoe UI'",
    "'Helvetica Neue'",
    "Helvetica",
    "Arial",
    "sans-serif",
  ],
  adjustFontFallback: false,
});

const interfaceFont = localFont({
  src: [
    {
      path: "../../design-system/dist/static/fonts/TitilliumWeb-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../design-system/dist/static/fonts/TitilliumWeb-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../design-system/dist/static/fonts/TitilliumWeb-SemiBold.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../design-system/dist/static/fonts/TitilliumWeb-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../design-system/dist/static/fonts/TitilliumWeb-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  preload: true,
  display: "swap",
  variable: "--ks-brand-font-family-interface",
  fallback: [
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "'Segoe UI'",
    "'Helvetica Neue'",
    "Helvetica",
    "Arial",
    "sans-serif",
  ],
  adjustFontFallback: false,
});

const displayFontPreview = localFont({
  src: [
    {
      path: "../../design-system/dist/static/fonts/TitilliumWeb-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../design-system/dist/static/fonts/TitilliumWeb-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../design-system/dist/static/fonts/TitilliumWeb-SemiBold.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../design-system/dist/static/fonts/TitilliumWeb-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../design-system/dist/static/fonts/TitilliumWeb-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  preload: false,
  display: "auto",
  variable: "--ks-brand-font-family-display",
  fallback: [
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "'Segoe UI'",
    "'Helvetica Neue'",
    "Helvetica",
    "Arial",
    "sans-serif",
  ],
  adjustFontFallback: false,
});

const interfaceFontPreview = localFont({
  src: [
    {
      path: "../../design-system/dist/static/fonts/TitilliumWeb-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../design-system/dist/static/fonts/TitilliumWeb-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../design-system/dist/static/fonts/TitilliumWeb-SemiBold.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../design-system/dist/static/fonts/TitilliumWeb-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../design-system/dist/static/fonts/TitilliumWeb-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  preload: false,
  display: "auto",
  variable: "--ks-brand-font-family-interface",
  fallback: [
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "'Segoe UI'",
    "'Helvetica Neue'",
    "Helvetica",
    "Arial",
    "sans-serif",
  ],
  adjustFontFallback: false,
});

export const fontClassNames = `${displayFont.variable} ${interfaceFont.variable}`;
export const fontClassNamesPreview = `${displayFontPreview.variable} ${interfaceFontPreview.variable}`;

// Internal font-family strings as resolved by next/font (e.g. "__displayFont_0ac8ec").
// Used to rewrite matching theme CSS values so the browser uses next/font's
// already-declared @font-face instead of looking up the human-readable name.
export const nextFontFamilies = {
  display: displayFont.style.fontFamily,
  copy: "",
  interface: interfaceFont.style.fontFamily,
};

// The human-readable name stored in Storyblok theme tokens for the locally
// loaded font, used to detect which themes reference it.
export const localFontFamilyName = "TitilliumWeb";
