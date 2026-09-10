/**
 * componentTokensToCss.mjs
 *
 * Compiles a sparse component token overrides object into scoped CSS.
 * Consumed by the Design Tokens Editor backend to compile theme componentCss,
 * and by the editor frontend for live preview.
 *
 * Input format (componentTokens):
 * {
 *   "button": {
 *     "--dsa-button--padding": "1em 2em",
 *     "--dsa-button_primary--background-color": "var(--ks-background-color-bold)"
 *   },
 *   "hero": {
 *     "--dsa-hero--min-height": "20rem",
 *     "@container hero (min-width: 640px)": {
 *       "--dsa-hero--min-height": "28rem"
 *     }
 *   }
 * }
 *
 * Output: scoped CSS string
 */

/**
 * @param {Record<string, Record<string, string | Record<string, string>>>} componentTokens
 * @param {Record<string, { selector: string }>} catalog - component token catalog for selector lookup
 * @returns {string}
 */
export const componentTokensToCss = (componentTokens, catalog) => {
  if (!componentTokens || typeof componentTokens !== "object") return "";

  const lines = [];

  for (const [componentSlug, overrides] of Object.entries(componentTokens)) {
    if (!overrides || typeof overrides !== "object") continue;

    const componentInfo = catalog?.[componentSlug];
    const selector = componentInfo?.selector || `.dsa-${componentSlug}`;

    // Separate base tokens from responsive blocks
    const baseTokens = {};
    const responsiveBlocks = {};

    for (const [key, value] of Object.entries(overrides)) {
      if (key.startsWith("@")) {
        // Responsive block: @container or @media query
        if (typeof value === "object" && value !== null) {
          responsiveBlocks[key] = value;
        }
      } else if (typeof value === "string") {
        baseTokens[key] = value;
      }
    }

    // Emit base tokens
    const baseEntries = Object.entries(baseTokens);
    if (baseEntries.length > 0) {
      lines.push(`${selector} {`);
      for (const [token, value] of baseEntries) {
        lines.push(`  ${token}: ${value};`);
      }
      lines.push(`}`);
    }

    // Emit responsive blocks
    for (const [query, tokens] of Object.entries(responsiveBlocks)) {
      const entries = Object.entries(tokens);
      if (entries.length === 0) continue;

      lines.push(`${query} {`);
      lines.push(`  ${selector} {`);
      for (const [token, value] of entries) {
        lines.push(`    ${token}: ${value};`);
      }
      lines.push(`  }`);
      lines.push(`}`);
    }
  }

  return lines.join("\n") + (lines.length > 0 ? "\n" : "");
};
