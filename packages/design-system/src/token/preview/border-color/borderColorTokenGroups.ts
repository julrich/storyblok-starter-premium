export type BorderColorTokenGroups = Record<string, string[]>;

export function getBorderColorTokenGroups(
  tokenValues: Record<string, any>
): BorderColorTokenGroups {
  const tokensByCategory: BorderColorTokenGroups = {};

  Object.keys(tokenValues).forEach((token) => {
    if (/--ks-border-color-[^-]+-inverted/.test(token)) return;
    if (token.endsWith("-base")) return; // Exclude base tokens

    const match = token.match(/^--ks-border-color-([^-]+)/);
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
