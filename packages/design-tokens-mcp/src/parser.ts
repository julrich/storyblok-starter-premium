import fs from "fs/promises";
import path from "path";
import {
  TOKEN_FILES,
  TOKENS_DIR,
  COMPONENT_TOKENS_DIR,
  COMPONENT_TOKEN_FILES,
} from "./constants.js";
import type {
  TokenData,
  TokenValueType,
  ParsedComponentTokenName,
  ComponentToken,
  TokenStats,
  ComponentTokenStats,
  TokenEntry,
} from "./types.js";

// ── Token value classification ──────────────────────────────────────────────

/**
 * Classify a token value as literal, global-reference, component-reference, or calculated.
 */
export function classifyTokenValue(value: string): {
  valueType: TokenValueType;
  referencedToken: string | null;
} {
  const trimmed = value.trim();

  // Calculated values: calc() containing var()
  if (/calc\s*\(/.test(trimmed) && /var\s*\(/.test(trimmed)) {
    const varMatch = trimmed.match(/var\(\s*(--[a-zA-Z0-9-]+)/);
    return {
      valueType: "calculated",
      referencedToken: varMatch ? varMatch[1] : null,
    };
  }

  // var() references
  const varMatch = trimmed.match(/^var\(\s*(--[a-zA-Z0-9-]+)/);
  if (varMatch) {
    const refToken = varMatch[1];
    if (refToken.startsWith("--dsa-") || refToken.startsWith("--l-")) {
      return { valueType: "component-ref", referencedToken: refToken };
    }
    return { valueType: "global-ref", referencedToken: refToken };
  }

  // Values that contain var() but aren't pure var()
  if (/var\s*\(/.test(trimmed)) {
    const firstVar = trimmed.match(/var\(\s*(--[a-zA-Z0-9-]+)/);
    const refToken = firstVar ? firstVar[1] : null;
    if (
      refToken &&
      (refToken.startsWith("--dsa-") || refToken.startsWith("--l-"))
    ) {
      return { valueType: "component-ref", referencedToken: refToken };
    }
    if (refToken) {
      return { valueType: "global-ref", referencedToken: refToken };
    }
  }

  return { valueType: "literal", referencedToken: null };
}

// ── Component token name parser ─────────────────────────────────────────────

/**
 * Parse a component token name into structured parts.
 *
 * Token naming convention:
 *   --dsa-{component}[__{element}][_{variant}]--{property}[_{state}]
 */
export function parseComponentTokenName(
  name: string,
  knownComponent: string
): ParsedComponentTokenName {
  const STATES = [
    "hover",
    "active",
    "focus",
    "checked",
    "selected",
    "disabled",
    "open",
  ];

  let remainder = name;
  const prefixes = [
    `--dsa-${knownComponent}`,
    `--l-${knownComponent}`,
    `--dsa-${knownComponent.replace(/-/g, "_")}`,
  ];

  let matched = false;
  for (const prefix of prefixes) {
    if (remainder.startsWith(prefix)) {
      remainder = remainder.slice(prefix.length);
      matched = true;
      break;
    }
  }

  if (!matched) {
    const fallback = remainder.match(/^--(?:dsa|l)-[a-z]+(?:-[a-z]+)*/);
    if (fallback) {
      remainder = remainder.slice(fallback[0].length);
    }
  }

  let element: string | null = null;
  let variant: string | null = null;
  let cssProperty = "";
  let state: string | null = null;

  const lastDoubleDash = remainder.lastIndexOf("--");
  let beforeProperty = "";
  let propertyPart = "";

  if (lastDoubleDash > 0) {
    beforeProperty = remainder.slice(0, lastDoubleDash);
    propertyPart = remainder.slice(lastDoubleDash + 2);
  } else if (lastDoubleDash === 0) {
    propertyPart = remainder.slice(2);
  } else {
    propertyPart = remainder;
  }

  // Extract state from the property part
  for (const s of STATES) {
    const suffix = `_${s}`;
    if (propertyPart.endsWith(suffix)) {
      state = s;
      propertyPart = propertyPart.slice(0, -suffix.length);
      break;
    }
  }

  cssProperty = propertyPart || "unknown";

  // Parse element and variant from beforeProperty
  if (beforeProperty) {
    const elementMatch = beforeProperty.match(
      /__([a-zA-Z0-9-]+(?:__[a-zA-Z0-9-]+)*)/
    );
    if (elementMatch) {
      element = elementMatch[1].replace(/__/g, ".");
    }

    const variantMatch = beforeProperty.match(
      /(?:^|[^_])_([a-zA-Z][a-zA-Z0-9-]*)/
    );
    if (variantMatch) {
      variant = variantMatch[1];
    }
  }

  return { component: knownComponent, element, variant, cssProperty, state };
}

// ── Core CSS/SCSS parser ────────────────────────────────────────────────────

/**
 * Parse a single CSS/SCSS file and extract all CSS Custom Properties with comments.
 */
export async function parseTokenFile(
  filePath: string,
  category: string
): Promise<Map<string, TokenData>> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const tokens = new Map<string, TokenData>();
    const fileName = path.basename(filePath);
    const lines = content.split("\n");

    let currentSection: string | null = null;
    let pendingComments: string[] = [];
    let inBlockComment = false;
    let blockCommentLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Handle block comment start
      if (trimmedLine.startsWith("/*") && !trimmedLine.includes("*/")) {
        inBlockComment = true;
        const commentStart = trimmedLine.replace(/^\/\*\s*/, "").trim();
        if (commentStart) {
          blockCommentLines.push(commentStart);
        }
        continue;
      }

      // Handle block comment continuation
      if (inBlockComment) {
        if (trimmedLine.includes("*/")) {
          inBlockComment = false;
          const commentEnd = trimmedLine
            .replace(/\*\/.*$/, "")
            .replace(/^\*\s*/, "")
            .trim();
          if (commentEnd) {
            blockCommentLines.push(commentEnd);
          }
          if (blockCommentLines.length > 0) {
            pendingComments.push(blockCommentLines.join(" "));
          }
          blockCommentLines = [];
          continue;
        } else {
          const commentMiddle = trimmedLine.replace(/^\*\s*/, "").trim();
          if (commentMiddle) {
            blockCommentLines.push(commentMiddle);
          }
          continue;
        }
      }

      // Handle single-line block comments /* ... */
      const singleLineBlockMatch = trimmedLine.match(/^\/\*\s*(.+?)\s*\*\/$/);
      if (singleLineBlockMatch) {
        pendingComments.push(singleLineBlockMatch[1]);
        continue;
      }

      // Check for section headers (///)
      if (trimmedLine.startsWith("///")) {
        currentSection = trimmedLine.replace(/^\/\/\/\s*/, "").trim();
        pendingComments = [];
        continue;
      }

      // Check for regular comments
      if (trimmedLine.startsWith("//") && !trimmedLine.startsWith("///")) {
        const commentText = trimmedLine.replace(/^\/\/\s*/, "").trim();
        if (commentText) {
          pendingComments.push(commentText);
        }
        continue;
      }

      // Check for CSS custom property definition
      const tokenMatch = line.match(/--([a-zA-Z0-9_-]+)\s*:\s*([^;]+);/);
      if (tokenMatch) {
        const tokenName = `--${tokenMatch[1]}`;
        const tokenValue = tokenMatch[2].trim().replace(/\s+/g, " ");

        // Check for inline comment after the value
        const inlineSlashComment = line.match(/;\s*\/\/\s*(.+)$/);
        const inlineBlockComment = line.match(/;\s*\/\*\s*(.+?)\s*\*\/\s*$/);
        const inlineComment = inlineSlashComment
          ? inlineSlashComment[1].trim()
          : inlineBlockComment
          ? inlineBlockComment[1].trim()
          : null;

        const tokenData: TokenData = {
          value: tokenValue,
          file: fileName,
          category: category,
        };

        if (currentSection) {
          tokenData.section = currentSection;
        }

        const allComments = [...pendingComments];
        if (inlineComment) {
          allComments.push(inlineComment);
        }

        if (allComments.length > 0) {
          tokenData.comment = allComments.join(" | ");
        }

        tokens.set(tokenName, tokenData);
        pendingComments = [];
      }

      // Reset pending comments if we hit a non-comment, non-token line
      if (
        !trimmedLine.startsWith("//") &&
        !trimmedLine.startsWith("/*") &&
        !trimmedLine.includes("--") &&
        trimmedLine.length > 0 &&
        !trimmedLine.startsWith("{") &&
        !trimmedLine.startsWith("}")
      ) {
        if (trimmedLine.includes(":root") || trimmedLine.includes("[ks-")) {
          pendingComments = [];
        }
      }
    }

    return tokens;
  } catch (error) {
    console.error(`Failed to parse ${filePath}: ${(error as Error).message}`);
    return new Map();
  }
}

// ── Global token operations ─────────────────────────────────────────────────

/**
 * Parse all token files and return combined tokens.
 */
export async function parseAllTokens(
  fileFilter: string | null = null
): Promise<Map<string, TokenData>> {
  const allTokens = new Map<string, TokenData>();

  const filesToParse = fileFilter
    ? { [fileFilter]: TOKEN_FILES[fileFilter] }
    : TOKEN_FILES;

  for (const [_key, config] of Object.entries(filesToParse)) {
    if (!config) continue;
    const filePath = path.join(TOKENS_DIR, config.file);
    try {
      await fs.access(filePath);
      const tokens = await parseTokenFile(filePath, config.category);
      for (const [name, data] of tokens.entries()) {
        allTokens.set(name, data);
      }
    } catch {
      // File doesn't exist, skip
    }
  }

  return allTokens;
}

/**
 * Parse all component token files and return enriched records.
 */
export async function parseAllComponentTokens(
  componentFilter: string | null = null
): Promise<ComponentToken[]> {
  const results: ComponentToken[] = [];

  const filesToParse = componentFilter
    ? COMPONENT_TOKEN_FILES[componentFilter]
      ? { [componentFilter]: COMPONENT_TOKEN_FILES[componentFilter] }
      : {}
    : COMPONENT_TOKEN_FILES;

  for (const [slug, config] of Object.entries(filesToParse)) {
    const filePath = path.join(COMPONENT_TOKENS_DIR, config.file);
    try {
      await fs.access(filePath);
      const tokens = await parseTokenFile(filePath, config.category);

      for (const [name, data] of tokens.entries()) {
        const { valueType, referencedToken } = classifyTokenValue(data.value);
        const parsed = parseComponentTokenName(name, slug);

        results.push({
          name,
          value: data.value,
          component: slug,
          element: parsed.element,
          variant: parsed.variant,
          cssProperty: parsed.cssProperty,
          state: parsed.state,
          file: config.file,
          category: config.category,
          ...(data.section && { section: data.section }),
          ...(data.comment && { comment: data.comment }),
          // extra runtime fields (not in interface but kept for handler compat)
          ...({ valueType, referencedToken } as Record<string, unknown>),
        } as ComponentToken);
      }
    } catch {
      // File doesn't exist or is empty, skip
    }
  }

  return results;
}

/**
 * Get token statistics.
 */
export async function getTokenStats(): Promise<TokenStats> {
  const allTokens = await parseAllTokens();
  const stats: TokenStats = {
    totalTokens: allTokens.size,
    byFile: {},
    byCategory: {},
    byPrefix: {},
  };

  for (const [name, data] of allTokens.entries()) {
    stats.byFile[data.file] = (stats.byFile[data.file] || 0) + 1;
    stats.byCategory[data.category] =
      (stats.byCategory[data.category] || 0) + 1;

    const prefixMatch = name.match(/^--([a-z]+-[a-z]+)/);
    if (prefixMatch) {
      const prefix = prefixMatch[1];
      stats.byPrefix[prefix] = (stats.byPrefix[prefix] || 0) + 1;
    }
  }

  return stats;
}

/**
 * Get component token statistics.
 */
export async function getComponentTokenStats(): Promise<ComponentTokenStats> {
  const allTokens = await parseAllComponentTokens();

  const byComponent: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const byPropertyType: Record<string, number> = {};
  const byValueType: Record<string, number> = {
    literal: 0,
    "global-reference": 0,
    "component-reference": 0,
    calculated: 0,
  };
  const topReferencedGlobalTokens: Record<string, number> = {};

  for (const token of allTokens) {
    byComponent[token.component] = (byComponent[token.component] || 0) + 1;
    byCategory[token.category] = (byCategory[token.category] || 0) + 1;
    byPropertyType[token.cssProperty] =
      (byPropertyType[token.cssProperty] || 0) + 1;

    const { valueType, referencedToken } = classifyTokenValue(token.value);
    byValueType[valueType] = (byValueType[valueType] || 0) + 1;

    if (referencedToken && valueType === "global-ref") {
      topReferencedGlobalTokens[referencedToken] =
        (topReferencedGlobalTokens[referencedToken] || 0) + 1;
    }
  }

  // Sort topReferencedGlobalTokens by count, keep top 20
  const sortedRefs = Object.entries(topReferencedGlobalTokens)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20);

  return {
    totalComponentTokens: allTokens.length,
    components: Object.keys(byComponent).length,
    byCategory,
    byComponent,
  };
}

/**
 * Update a token value in its source file.
 */
export async function updateTokenInFile(
  tokenName: string,
  newValue: string
): Promise<{
  success: boolean;
  tokenName: string;
  oldValue: string;
  newValue: string;
  file: string;
  category: string;
}> {
  const normalizedName = tokenName.startsWith("--")
    ? tokenName
    : `--${tokenName}`;

  const allTokens = await parseAllTokens();
  const tokenData = allTokens.get(normalizedName);

  if (!tokenData) {
    throw new Error(`Token '${normalizedName}' not found in any file`);
  }

  const filePath = path.join(TOKENS_DIR, tokenData.file);
  const content = await fs.readFile(filePath, "utf-8");

  const escapedName = normalizedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tokenRegex = new RegExp(`(${escapedName}\\s*:\\s*)([^;]+)(;)`, "g");

  if (!tokenRegex.test(content)) {
    throw new Error(`Token '${normalizedName}' not found in ${tokenData.file}`);
  }

  const oldValue = tokenData.value;

  const updatedContent = content.replace(
    new RegExp(`(${escapedName}\\s*:\\s*)([^;]+)(;)`, "g"),
    `$1${newValue}$3`
  );

  await fs.writeFile(filePath, updatedContent, "utf-8");

  return {
    success: true,
    tokenName: normalizedName,
    oldValue,
    newValue: newValue.trim(),
    file: tokenData.file,
    category: tokenData.category,
  };
}

/**
 * Search tokens by pattern.
 */
export function searchTokens(
  tokens: Map<string, TokenData>,
  pattern: string,
  searchIn: string = "both"
): TokenEntry[] {
  const results: TokenEntry[] = [];
  const lowerPattern = pattern.toLowerCase();

  for (const [name, data] of tokens.entries()) {
    const matchName = searchIn === "both" || searchIn === "name";
    const matchValue = searchIn === "both" || searchIn === "value";
    const matchComment = searchIn === "both" && !!data.comment;

    const nameMatches = matchName && name.toLowerCase().includes(lowerPattern);
    const valueMatches =
      matchValue && data.value.toLowerCase().includes(lowerPattern);
    const commentMatches =
      matchComment && data.comment!.toLowerCase().includes(lowerPattern);

    if (nameMatches || valueMatches || commentMatches) {
      results.push({
        name,
        value: data.value,
        file: data.file,
        category: data.category,
        ...(data.section && { section: data.section }),
        ...(data.comment && { comment: data.comment }),
      });
    }
  }

  return results;
}

/**
 * Get tokens by semantic type.
 */
export function getTokensBySemanticType(
  tokens: Map<string, TokenData>,
  semanticType: string
): TokenEntry[] {
  const typePatterns: Record<string, RegExp> = {
    interactive: /(hover|active|selected|disabled|focus)/i,
    inverted: /inverted/i,
    scale: /(alpha-\d|to-bg-\d|to-fg-\d|scale-\d)/i,
    base: /-base$/,
    responsive: /(phone|tablet|laptop|desktop|bp-factor)/i,
    sizing: /(xxs|xs|s|m|l|xl|xxl)$/,
  };

  const pattern = typePatterns[semanticType];
  if (!pattern) return [];

  const results: TokenEntry[] = [];
  for (const [name, data] of tokens.entries()) {
    if (pattern.test(name)) {
      results.push({
        name,
        value: data.value,
        file: data.file,
        category: data.category,
        ...(data.section && { section: data.section }),
        ...(data.comment && { comment: data.comment }),
      });
    }
  }

  return results;
}
