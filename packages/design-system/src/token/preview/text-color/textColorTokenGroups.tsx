export type TextColorTokenGroups = Record<string, string[]>;

export function getTextColorTokenGroups(
  tokenValues: Record<string, any>
): TextColorTokenGroups {
  const tokensByCategory: TextColorTokenGroups = {};

  Object.keys(tokenValues).forEach((token) => {
    // Skip tokens that explicitly contain '-inverted' after the category
    if (/--ks-text-color-[^-]+-inverted/.test(token)) return;
    if (token.endsWith("-base")) return; // Exclude base tokens

    const match = token.match(/^--ks-text-color-([^-]+)/);
    if (match) {
      const category = match[1];
      if (!tokensByCategory[category]) tokensByCategory[category] = [];
      if (!tokensByCategory[category].includes(token)) {
        tokensByCategory[category].push(token);
      }
    }
  });

  return tokensByCategory;
}
