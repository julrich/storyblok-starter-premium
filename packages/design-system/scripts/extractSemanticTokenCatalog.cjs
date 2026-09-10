/**
 * extractSemanticTokenCatalog.cjs
 *
 * Parses the compiled `tokens.css` to extract all usable semantic tokens (--ks-*)
 * that don't end in `-base` (the base variants are implementation details).
 * Groups tokens by category with their default values and value type hints.
 *
 * Output: semantic-token-catalog.json
 */

const fs = require("fs");
const path = require("path");

const tokensPath = path.join(__dirname, "../src/token/tokens.css");
const outPath = path.join(
  __dirname,
  "../src/token/semantic-token-catalog.json",
);

const css = fs.readFileSync(tokensPath, "utf8");

// Parse all custom property declarations from :root blocks
const propRe = /--ks-([a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g;
const tokens = {};
let match;

while ((match = propRe.exec(css)) !== null) {
  const fullName = `--ks-${match[1]}`;
  const value = match[2].trim();

  // Skip -base variants — they're internal implementation
  if (fullName.endsWith("-base")) continue;
  // Skip branding tokens (--ks-brand-*) — those are in branding editor
  if (fullName.startsWith("--ks-brand-")) continue;

  tokens[fullName] = value;
}

// Categorize tokens by their prefix
function categorize(name) {
  if (name.startsWith("--ks-background-color")) return "Background Color";
  if (name.startsWith("--ks-text-color")) return "Text Color";
  if (name.startsWith("--ks-border-color")) return "Border Color";
  if (name.startsWith("--ks-border-radius")) return "Border Radius";
  if (name.startsWith("--ks-border-width")) return "Border Width";
  if (name.startsWith("--ks-border")) return "Border";
  if (name.startsWith("--ks-box-shadow")) return "Shadow";
  if (name.startsWith("--ks-color")) return "Color";
  if (name.startsWith("--ks-font-size")) return "Font Size";
  if (name.startsWith("--ks-font-family")) return "Font Family";
  if (name.startsWith("--ks-font-weight")) return "Font Weight";
  if (name.startsWith("--ks-font")) return "Font";
  if (name.startsWith("--ks-spacing")) return "Spacing";
  if (name.startsWith("--ks-transition")) return "Transition";
  if (name.startsWith("--ks-duration")) return "Duration";
  if (name.startsWith("--ks-depth")) return "Depth";
  return "Other";
}

function guessValueType(value) {
  if (value.startsWith("var(")) return "reference";
  if (/^#[0-9a-f]{3,8}$/i.test(value)) return "color";
  if (/^rgba?\(/.test(value)) return "color";
  if (/^hsla?\(/.test(value)) return "color";
  if (/^oklch\(/.test(value)) return "color";
  if (/^[0-9.]+px$/.test(value)) return "dimension";
  if (/^[0-9.]+rem$/.test(value)) return "dimension";
  if (/^[0-9.]+em$/.test(value)) return "dimension";
  if (/^[0-9.]+%$/.test(value)) return "percentage";
  if (/^[0-9.]+$/.test(value)) return "number";
  if (/^[0-9.]+s$/.test(value)) return "duration";
  return "string";
}

// Build the catalog grouped by category
const catalog = {};

for (const [name, value] of Object.entries(tokens)) {
  const category = categorize(name);
  if (!catalog[category]) catalog[category] = {};

  catalog[category][name] = {
    value,
    valueType: guessValueType(value),
  };
}

// Sort categories and tokens within
const sorted = {};
for (const cat of Object.keys(catalog).sort()) {
  sorted[cat] = {};
  for (const name of Object.keys(catalog[cat]).sort()) {
    sorted[cat][name] = catalog[cat][name];
  }
}

fs.writeFileSync(outPath, JSON.stringify(sorted, null, 2) + "\n");

const totalTokens = Object.values(sorted).reduce(
  (sum, cat) => sum + Object.keys(cat).length,
  0,
);
console.log(
  `Extracted ${totalTokens} semantic tokens in ${Object.keys(sorted).length} categories → ${path.relative(process.cwd(), outPath)}`,
);
