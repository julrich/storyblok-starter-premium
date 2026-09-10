export type BackgroundColorTokenGroups = Record<string, string[]>;

export function getBackgroundColorTokenGroups(
  tokenValues: Record<string, any>
): BackgroundColorTokenGroups {
  const tokensByCategory: BackgroundColorTokenGroups = {};

  Object.keys(tokenValues).forEach((token) => {
    if (/--ks-background-color-[^-]+-inverted/.test(token)) return;
    if (token.endsWith("-base")) return; // Exclude base tokens

    // Match main category: --ks-background-color-main
    const match = token.match(/^--ks-background-color-([^-]+)/);
    if (match) {
      const main = match[1];

      if (!tokensByCategory[main]) tokensByCategory[main] = [];
      if (!tokensByCategory[main].includes(token)) {
        tokensByCategory[main].push(token);
      }
    }
  });

  return tokensByCategory;
}
