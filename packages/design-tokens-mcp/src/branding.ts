import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import type { FlatConfigEntry } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKENS_DIR = path.join(__dirname, "..", "tokens");

/**
 * Build schema descriptions for W3C DTCG branding token fields to guide theme generation.
 * Maps W3C token paths to human-readable descriptions.
 */
export function getBrandingSchemaDescription(): Record<string, string> {
  return {
    "color.primary.$root":
      "Main brand color (W3C DTCG color). Extract the dominant brand/accent color.",
    "color.primary.inverted":
      "Primary color for dark/inverted backgrounds (W3C DTCG color). Often a lighter tint of primary.",
    "color.onPrimary.$root":
      "Text color on primary backgrounds (W3C DTCG color). Usually white.",
    "color.onPrimary.inverted":
      "Text color on primary backgrounds in dark mode (W3C DTCG color).",
    "color.bg.$root":
      "Main background color (W3C DTCG color). Usually white or a very light neutral.",
    "color.bg.inverted":
      "Dark/inverted background color (W3C DTCG color). Usually a very dark shade.",
    "color.fg.$root":
      "Main text/foreground color (W3C DTCG color). Usually very dark, near-black.",
    "color.fg.inverted":
      "Text color on dark backgrounds (W3C DTCG color). Usually white or near-white.",
    "color.link.$root":
      "Link color (W3C DTCG color). Often matches or is close to the primary color.",
    "color.link.inverted":
      "Link color on dark backgrounds (W3C DTCG color). A lighter/brighter variant.",
    "color.positive.$root":
      "Success/positive semantic color (W3C DTCG color, typically green).",
    "color.positive.inverted": "Success color for dark backgrounds.",
    "color.negative.$root":
      "Error/negative semantic color (W3C DTCG color, typically red).",
    "color.negative.inverted": "Error color for dark backgrounds.",
    "color.informative.$root":
      "Informational semantic color (W3C DTCG color, typically blue/cyan).",
    "color.informative.inverted": "Informational color for dark backgrounds.",
    "color.notice.$root":
      "Warning/notice semantic color (W3C DTCG color, typically orange/yellow).",
    "color.notice.inverted": "Warning color for dark backgrounds.",
    "font.family.display":
      "Display/heading font family CSS stack (fontFamily token). Identify the heading typeface style.",
    "font.family.copy":
      "Body/copy font family CSS stack (fontFamily token). Identify the body text typeface style.",
    "font.family.interface":
      "UI/interface font family CSS stack (fontFamily token). Often same as copy.",
    "font.family.mono": "Monospace font family CSS stack (fontFamily token).",
    "font.weight.light": "Light font weight (fontWeight token, typically 300).",
    "font.weight.regular":
      "Regular font weight (fontWeight token, typically 400).",
    "font.weight.semiBold":
      "Semi-bold font weight (fontWeight token, typically 500-600).",
    "font.weight.bold": "Bold font weight (fontWeight token, typically 700).",
    "font.lineHeight.display":
      "Line height for display text (number token, typically 1.1-1.3).",
    "font.lineHeight.copy":
      "Line height for body text (number token, typically 1.4-1.6).",
    "font.lineHeight.interface":
      "Line height for UI text (number token, typically 1.2-1.4).",
    "spacing.base":
      "Base spacing unit (dimension token, typically 8-16px). Determines overall density.",
    "spacing.scaleRatio":
      "Spacing scale ratio (number token, typically 1.25-1.5). Controls spacing progression.",
    "border.radius":
      "Default border radius (dimension token). Rounded vs sharp corners.",
    "box-shadow.blur": "Box shadow blur radius (dimension token).",
  };
}

/**
 * Read the W3C DTCG branding tokens JSON file (synced from the design system).
 */
export async function readBrandingTokensW3C(): Promise<
  Record<string, unknown>
> {
  const tokensFile = path.join(TOKENS_DIR, "branding-tokens.json");
  try {
    const content = await fs.readFile(tokensFile, "utf-8");
    return JSON.parse(content) as Record<string, unknown>;
  } catch (error) {
    throw new Error(
      `Failed to read W3C branding tokens: ${(error as Error).message}`,
    );
  }
}

/**
 * Read the branding tokens JSON Schema (synced from the design system).
 * Used for validation and schema description.
 */
export async function readBrandingTokensSchema(): Promise<
  Record<string, unknown>
> {
  const schemaFile = path.join(TOKENS_DIR, "branding-tokens.schema.json");
  try {
    const content = await fs.readFile(schemaFile, "utf-8");
    return JSON.parse(content) as Record<string, unknown>;
  } catch (error) {
    throw new Error(
      `Failed to read branding tokens schema: ${(error as Error).message}`,
    );
  }
}

/**
 * Validate a W3C DTCG branding token object against the schema.
 * Returns validation results with field-level errors.
 */
export async function validateW3CTokens(
  tokens: Record<string, unknown>,
): Promise<{
  valid: boolean;
  errors: Array<{ path: string; message: string }>;
}> {
  const schema = await readBrandingTokensSchema();
  const errors: Array<{ path: string; message: string }> = [];

  // Check required top-level sections
  const required = (schema as any).required as string[] | undefined;
  if (required) {
    for (const key of required) {
      if (!(key in tokens)) {
        errors.push({
          path: key,
          message: `Missing required section: "${key}"`,
        });
      }
    }
  }

  // Check that provided top-level keys are valid
  const schemaProps = (schema as any).properties || {};
  for (const key of Object.keys(tokens)) {
    if (key.startsWith("_")) continue; // Skip private fields like _fontHref
    if (!(key in schemaProps)) {
      errors.push({
        path: key,
        message: `Unknown section: "${key}". Valid sections: ${Object.keys(schemaProps).join(", ")}`,
      });
    }
  }

  // Validate color entries have the expected W3C DTCG structure
  if (tokens.color && typeof tokens.color === "object") {
    validateColorSection(
      tokens.color as Record<string, unknown>,
      "color",
      errors,
    );
  }

  return { valid: errors.length === 0, errors };
}

function validateColorSection(
  obj: Record<string, unknown>,
  prefix: string,
  errors: Array<{ path: string; message: string }>,
): void {
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === "object") {
      const val = value as Record<string, unknown>;
      if ("$type" in val && "$value" in val) {
        // This is a DTCG token leaf
        if (val.$type === "color") {
          const v = val.$value as Record<string, unknown> | undefined;
          if (!v || !v.colorSpace || !Array.isArray(v.components)) {
            errors.push({
              path: `${prefix}.${key}`,
              message: `Invalid color value: expected { colorSpace, components: [r, g, b] }`,
            });
          }
        }
      } else {
        validateColorSection(val, `${prefix}.${key}`, errors);
      }
    }
  }
}

/**
 * Flatten a W3C DTCG token tree to dot notation paths with values.
 * Useful for listing all token values at a glance.
 */
export function flattenW3CTokens(
  obj: Record<string, unknown>,
  prefix: string = "",
): FlatConfigEntry[] {
  const results: FlatConfigEntry[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const val = value as Record<string, unknown>;
      if ("$type" in val && "$value" in val) {
        // DTCG token leaf — flatten the $value
        results.push({
          path,
          value: JSON.stringify(val.$value),
          type: val.$type as string,
        });
      } else {
        results.push(...flattenW3CTokens(val, path));
      }
    } else {
      results.push({
        path,
        value: value as string | number | boolean,
        type: typeof value,
      });
    }
  }
  return results;
}

/**
 * Get a human-readable description for factor tokens.
 */
export function getFactorDescription(tokenName: string): string {
  const descriptions: Record<string, string> = {
    "duration-factor": "Multiplier for animation/transition durations",
    "border-radius-factor": "Multiplier for border radius values",
    "box-shadow-blur-factor": "Multiplier for box shadow blur radius",
    "box-shadow-opacity-factor": "Multiplier for box shadow opacity",
    "box-shadow-spread-factor": "Multiplier for box shadow spread radius",
    "spacing-factor": "Multiplier for spacing values",
    "scale-ratio": "Base ratio for typographic/spacing scales",
    "bp-factor": "Breakpoint factor for responsive scaling",
    "bp-ratio": "Breakpoint ratio for responsive calculations",
  };

  for (const [key, desc] of Object.entries(descriptions)) {
    if (tokenName.toLowerCase().includes(key.toLowerCase())) {
      return desc;
    }
  }
  return "Factor/ratio token for calculations";
}
