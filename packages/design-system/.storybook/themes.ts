import { create } from "storybook/theming";
import brandingTokens from "../src/token/branding-tokens.json";

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
const fgInverted = brandingTokens.color.fg.inverted.$value.components;
const scale = brandingTokens.color.scale;

// Font families (quote names that contain spaces)
const toFontStack = (families: string[]) =>
  families.map((f) => (f.includes(" ") ? `"${f}"` : f)).join(", ");
const fontInterface = toFontStack(brandingTokens.font.family.interface.$value);
const fontMono = toFontStack(brandingTokens.font.family.mono.$value);

export const light = create({
  base: "light",

  colorPrimary: componentsToHex(primary),
  colorSecondary: componentsToHex(primary),

  // UI
  appBg: mixToHex(primary, bg, scale["9"].$value), // primary tinted towards bg (5 % primary)
  appContentBg: componentsToHex(bg),
  appBorderColor: componentsToRgba(fg, scale["8"].$value), // fg at 15 % alpha
  appBorderRadius: 8,

  // Typography
  fontBase: fontInterface,
  fontCode: fontMono,

  // Text colors
  textColor: componentsToHex(fg),
  textInverseColor: componentsToHex(fgInverted),

  // Toolbar default and active colors
  barTextColor: componentsToRgba(fg, scale["3"].$value), // fg at 73 % alpha
  barSelectedColor: componentsToHex(primary),
  barBg: componentsToHex(bg),

  // Form colors
  inputBg: componentsToRgba(fg, 0.13),
  inputBorder: mixToHex(fg, bg, scale["7"].$value), // fg mixed towards bg (27 % fg)
  inputTextColor: componentsToHex(fg),
  inputBorderRadius: 8,

  brandTitle: "Your kickstartDS Storybook",
  brandUrl: "https://www.kickstartDS.com",
  brandImage: "/logo.svg",
});
