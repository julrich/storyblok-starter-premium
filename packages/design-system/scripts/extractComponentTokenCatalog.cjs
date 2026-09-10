/**
 * extractComponentTokenCatalog.cjs
 *
 * Parses all *-tokens.scss source files and produces a structured JSON catalog
 * of component tokens with responsive breakpoint metadata.
 *
 * gonzales-pe cannot parse `@include ... { }` block syntax, so this uses
 * regex-based extraction with brace-depth tracking instead.
 *
 * Usage: node scripts/extractComponentTokenCatalog.cjs
 * Output: src/token/component-token-catalog.json (copied to dist/tokens/ by Rollup)
 */

const fs = require("fs-extra");
const fg = require("fast-glob");
const path = require("path");

/** Resolve a container.size mixin call to a CSS @container query string */
function resolveContainerMixin(includeText) {
  // @include container.size("≥", 640px, "hero")
  const match = includeText.match(
    /container\.size\(\s*["']([^"']+)["']\s*,\s*([^,]+?)\s*,\s*["']([^"']+)["']\s*\)/,
  );
  if (!match) return null;

  const [, operator, breakpoint, containerName] = match;
  const bp = breakpoint.trim();

  let cssOp;
  switch (operator) {
    case "≥":
      cssOp = "min-width";
      break;
    case "≤":
      cssOp = "max-width";
      break;
    case ">":
      cssOp = "min-width";
      break;
    case "<":
      cssOp = "max-width";
      break;
    default:
      cssOp = "min-width";
  }

  return `@container ${containerName} (${cssOp}: ${bp})`;
}

/** Classify the value type of a CSS custom property value */
function classifyValue(value) {
  const trimmed = value.trim();

  // Check for var() references
  const varMatch = trimmed.match(/^var\(\s*(--[\w-]+)/);
  if (varMatch) {
    const ref = varMatch[1];
    if (ref.startsWith("--ks-")) {
      return { valueType: "semantic-ref", referencedToken: ref };
    }
    if (ref.startsWith("--dsa-")) {
      return { valueType: "component-ref", referencedToken: ref };
    }
    return { valueType: "semantic-ref", referencedToken: ref };
  }

  return { valueType: "literal", referencedToken: null };
}

/** Strip SCSS single-line and multi-line comments */
function stripComments(scss) {
  // Remove multi-line comments
  let result = scss.replace(/\/\*[\s\S]*?\*\//g, "");
  // Remove single-line comments (but not URLs with //)
  result = result.replace(/(^|[^:])\/\/.*$/gm, "$1");
  return result;
}

/**
 * Find the matching closing brace for an opening brace at `start`.
 * Returns the index of the closing brace.
 */
function findMatchingBrace(text, start) {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Extract CSS custom property declarations from a block of text (no nested blocks).
 * Returns array of { name, value }.
 */
function extractDeclarations(block) {
  const declarations = [];
  const re = /(--[\w-]+)\s*:\s*([^;]+);/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    declarations.push({
      name: m[1],
      value: m[2].trim(),
    });
  }
  return declarations;
}

/**
 * Parse a block of SCSS content inside a root selector.
 * Extracts base declarations and responsive blocks (@include container.size, @media).
 * Handles one level of nesting (@media containing @include).
 */
function parseRuleContent(content) {
  const tokens = {};
  const responsiveTokens = {};

  // Process the content in passes:
  // 1. Find all @include and @media blocks, extract their positions
  // 2. Declarations outside those blocks are base tokens

  const blocks = []; // { start, end, queryString, content }

  // Find @include container.size(...) { ... } blocks
  const includeRe = /@include\s+container\.size\([^)]+\)\s*\{/g;
  let match;
  while ((match = includeRe.exec(content)) !== null) {
    const openBrace = match.index + match[0].length - 1;
    const closeBrace = findMatchingBrace(content, openBrace);
    if (closeBrace === -1) continue;

    const queryString = resolveContainerMixin(match[0]);
    if (!queryString) continue;

    const blockContent = content.slice(openBrace + 1, closeBrace);
    blocks.push({
      start: match.index,
      end: closeBrace + 1,
      queryString,
      content: blockContent,
    });
  }

  // Find @media (...) { ... } blocks
  const mediaRe = /@media\s*\([^)]+\)\s*\{/g;
  while ((match = mediaRe.exec(content)) !== null) {
    // Skip if this position is inside an already-found block
    if (blocks.some((b) => match.index >= b.start && match.index < b.end))
      continue;

    const openBrace = match.index + match[0].length - 1;
    const closeBrace = findMatchingBrace(content, openBrace);
    if (closeBrace === -1) continue;

    const queryMatch = match[0].match(/@media\s*(\([^)]+\))/);
    const queryString = queryMatch ? `@media ${queryMatch[1]}` : null;
    if (!queryString) continue;

    const blockContent = content.slice(openBrace + 1, closeBrace);
    blocks.push({
      start: match.index,
      end: closeBrace + 1,
      queryString,
      content: blockContent,
    });
  }

  // Sort blocks by position
  blocks.sort((a, b) => a.start - b.start);

  // Extract base declarations: content outside any block
  let baseContent = "";
  let lastEnd = 0;
  for (const block of blocks) {
    baseContent += content.slice(lastEnd, block.start);
    lastEnd = block.end;
  }
  baseContent += content.slice(lastEnd);

  // Parse base declarations
  for (const decl of extractDeclarations(baseContent)) {
    const { valueType, referencedToken } = classifyValue(decl.value);
    tokens[decl.name] = {
      defaultValue: decl.value,
      valueType,
      referencedToken,
    };
  }

  // Parse responsive blocks
  for (const block of blocks) {
    // Check for nested @include inside @media
    const nestedIncludes = [];
    const nestedRe = /@include\s+container\.size\([^)]+\)\s*\{/g;
    let nestedMatch;
    while ((nestedMatch = nestedRe.exec(block.content)) !== null) {
      const nestedOpen = nestedMatch.index + nestedMatch[0].length - 1;
      const nestedClose = findMatchingBrace(block.content, nestedOpen);
      if (nestedClose === -1) continue;

      const nestedQuery = resolveContainerMixin(nestedMatch[0]);
      if (!nestedQuery) continue;

      const nestedContent = block.content.slice(nestedOpen + 1, nestedClose);
      nestedIncludes.push({
        start: nestedMatch.index,
        end: nestedClose + 1,
        queryString: `${block.queryString} and ${nestedQuery}`,
        content: nestedContent,
      });
    }

    // Declarations directly in this block (not inside nested blocks)
    let directContent = block.content;
    // Remove nested blocks from content to get direct declarations
    const nestedSorted = [...nestedIncludes].sort((a, b) => b.start - a.start);
    for (const nested of nestedSorted) {
      directContent =
        directContent.slice(0, nested.start) + directContent.slice(nested.end);
    }

    const directDecls = extractDeclarations(directContent);
    if (directDecls.length > 0) {
      if (!responsiveTokens[block.queryString]) {
        responsiveTokens[block.queryString] = {};
      }
      for (const decl of directDecls) {
        const { valueType, referencedToken } = classifyValue(decl.value);
        responsiveTokens[block.queryString][decl.name] = {
          defaultValue: decl.value,
          valueType,
          referencedToken,
        };
      }
    }

    // Process nested blocks
    for (const nested of nestedIncludes) {
      const nestedDecls = extractDeclarations(nested.content);
      if (nestedDecls.length > 0) {
        if (!responsiveTokens[nested.queryString]) {
          responsiveTokens[nested.queryString] = {};
        }
        for (const decl of nestedDecls) {
          const { valueType, referencedToken } = classifyValue(decl.value);
          responsiveTokens[nested.queryString][decl.name] = {
            defaultValue: decl.value,
            valueType,
            referencedToken,
          };
        }
      }
    }
  }

  return { tokens, responsiveTokens };
}

/** Derive a display name from a component slug (e.g., "teaser-card" -> "Teaser Card") */
function toDisplayName(slug) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Derive component slug from filename (e.g., "_hero-tokens.scss" -> "hero") */
function slugFromFile(filePath) {
  const base = path.basename(filePath, ".scss").replace(/^_/, "");
  return base.replace(/-tokens$/, "");
}

/**
 * Detect the root selector from SCSS content.
 * Handles: .dsa-{name}, .dsa-{name}.other, #{$selectors}, .l-{name}, :root
 */
function detectSelector(scss, componentSlug) {
  // 1. .dsa-{name} (possibly compound like .dsa-image-story.c-storytelling)
  const dsaRe = /(\.(dsa-[\w-]+)[^\s{]*)\s*\{/;
  const dsaMatch = dsaRe.exec(scss);
  if (dsaMatch) {
    return { selector: dsaMatch[1].trim(), index: dsaMatch.index };
  }

  // 2. #{$selectors} { ... } — dynamic SCSS selector, resolve to .dsa-{slug}
  const dynRe = /#\{\$selectors\}\s*\{/;
  const dynMatch = dynRe.exec(scss);
  if (dynMatch) {
    // Return the index of the opening brace of the block, not the interpolation brace
    return {
      selector: `.dsa-${componentSlug}`,
      index: dynMatch.index,
      openBraceOffset: dynMatch[0].length - 1,
    };
  }

  // 3. .l-{name} { ... } — layout components
  const layoutRe = /(\.(l-[\w-]+))\s*\{/;
  const layoutMatch = layoutRe.exec(scss);
  if (layoutMatch) {
    return { selector: layoutMatch[1], index: layoutMatch.index };
  }

  // 4. :root { ... }
  const rootRe = /:root\s*\{/;
  const rootMatch = rootRe.exec(scss);
  if (rootMatch) {
    return { selector: ":root", index: rootMatch.index };
  }

  return null;
}

/**
 * Parse a single SCSS token file and return the component entry.
 */
function parseTokenFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const scss = stripComments(raw);
  const componentSlug = slugFromFile(filePath);

  const detected = detectSelector(scss, componentSlug);
  if (!detected) {
    // Truly empty or no selector — skip silently (e.g., logo-tokens.scss)
    if (scss.trim().length === 0) return null;
    console.warn(`No recognized selector in ${filePath}, skipping`);
    return null;
  }

  // Find the matching closing brace for the root selector
  const openBrace =
    detected.openBraceOffset != null
      ? detected.index + detected.openBraceOffset
      : scss.indexOf("{", detected.index);
  const closeBrace = findMatchingBrace(scss, openBrace);
  if (closeBrace === -1) {
    console.warn(`Unmatched brace in ${filePath}, skipping`);
    return null;
  }

  const ruleContent = scss.slice(openBrace + 1, closeBrace);
  const { tokens, responsiveTokens } = parseRuleContent(ruleContent);

  return {
    slug: componentSlug,
    entry: {
      displayName: toDisplayName(componentSlug),
      selector: detected.selector,
      tokens,
      ...(Object.keys(responsiveTokens).length > 0 ? { responsiveTokens } : {}),
    },
  };
}

(async () => {
  try {
    const scssFiles = await fg("src/components/**/*-tokens.scss");
    scssFiles.sort();

    const catalog = {};
    let totalTokens = 0;
    let totalResponsive = 0;

    for (const filePath of scssFiles) {
      const result = parseTokenFile(filePath);
      if (!result) continue;

      catalog[result.slug] = result.entry;

      const baseCount = Object.keys(result.entry.tokens).length;
      const respCount = result.entry.responsiveTokens
        ? Object.values(result.entry.responsiveTokens).reduce(
            (sum, group) => sum + Object.keys(group).length,
            0,
          )
        : 0;

      totalTokens += baseCount + respCount;
      totalResponsive += respCount;
    }

    const outputPath = path.join(
      "src",
      "token",
      "component-token-catalog.json",
    );
    await fs.outputJson(outputPath, catalog, { spaces: 2 });

    console.log(
      `Component token catalog: ${Object.keys(catalog).length} components, ${totalTokens} tokens (${totalResponsive} responsive)`,
    );
    console.log(`Written to ${outputPath}`);
  } catch (e) {
    console.error("Failed to extract component token catalog:", e);
    process.exit(1);
  }
})();
