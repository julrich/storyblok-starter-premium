type TokenGroups = Record<
  string, // main category
  Record<string, string[]> // subcategory -> tokens
>;

export function getColorTokenGroups(
  tokenValues: Record<string, any>
): TokenGroups {
  const tokenGroups: TokenGroups = {};

  Object.keys(tokenValues).forEach((token) => {
    if (/--ks-color-[^-]+-inverted/.test(token)) return;
    if (token.endsWith("-base")) return; // Exclude base tokens

    // Remove prefix
    const tokenName = token.replace(/^--ks-color-/, "");
    // Split by '-'
    const parts = tokenName.split("-");
    const main = parts[0];
    // Subcategory: everything after main, except trailing numbers
    let sub = parts
      .slice(1)
      .filter((p) => isNaN(Number(p)))
      .join("-");
    // If no subcategory, use empty string
    if (!sub) sub = "";

    if (!tokenGroups[main]) tokenGroups[main] = {};
    if (!tokenGroups[main][sub]) tokenGroups[main][sub] = [];
    tokenGroups[main][sub].push(token);
  });

  return tokenGroups;
}
