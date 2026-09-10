#!/usr/bin/env node
/**
 * Sync dereferenced root content type schemas into the n8n node's
 * local `schemas/` directory.
 *
 * Resolution order (per content type):
 *   1. Website components layer: `packages/website/components/{name}/{name}.schema.dereffed.json`
 *      (includes CMS schema customizations)
 *   2. Design system dist:       `@kickstartds/design-system/dist/components/{name}/{name}.schema.dereffed.json`
 *      (upstream default)
 *
 * If neither exists for a content type, a warning is printed and
 * the content type is skipped.
 *
 * Run via: `node scripts/sync-schemas.js`
 * Or:      `pnpm run sync-schemas`
 */

const { cpSync, existsSync, mkdirSync } = require("node:fs");
const { join, dirname } = require("node:path");

const schemasDir = join(
  __dirname,
  "..",
  "nodes",
  "StoryblokKickstartDs",
  "schemas",
);

// Must match ROOT_CONTENT_TYPES in storyblok-services/src/registry.ts
const ROOT_CONTENT_TYPES = [
  "page",
  "blog-post",
  "blog-overview",
  "event-detail",
  "event-list",
];

// Resolve the website components directory (sibling workspace package)
const websiteComponentsDir = join(
  __dirname,
  "..",
  "..",
  "website",
  "components",
);

// Resolve the design system dist via require.resolve
let designSystemComponentsDir;
try {
  const dsEntryPoint = require.resolve("@kickstartds/design-system");
  designSystemComponentsDir = join(dirname(dsEntryPoint), "components");
} catch {
  // Fallback to relative path if resolution fails
  designSystemComponentsDir = join(
    __dirname,
    "..",
    "..",
    "design-system",
    "dist",
    "components",
  );
}

mkdirSync(schemasDir, { recursive: true });

let synced = 0;
let skipped = 0;

for (const name of ROOT_CONTENT_TYPES) {
  const destPath = join(schemasDir, `${name}.schema.dereffed.json`);

  // 1. Try website components (CMS-layered schema)
  const websitePath = join(
    websiteComponentsDir,
    name,
    `${name}.schema.dereffed.json`,
  );
  if (existsSync(websitePath)) {
    cpSync(websitePath, destPath);
    console.log(`  ✓ ${name} (from website components)`);
    synced++;
    continue;
  }

  // 2. Fall back to design system dist
  const dsPath = join(
    designSystemComponentsDir,
    name,
    `${name}.schema.dereffed.json`,
  );
  if (existsSync(dsPath)) {
    cpSync(dsPath, destPath);
    console.log(`  ✓ ${name} (from design system)`);
    synced++;
    continue;
  }

  // 3. Neither source exists
  console.warn(
    `  ⚠ ${name}: no dereffed schema found (checked website + design system)`,
  );
  skipped++;
}

console.log(
  `\nSync complete: ${synced} synced, ${skipped} skipped out of ${ROOT_CONTENT_TYPES.length}`,
);

if (skipped > 0) {
  console.warn(
    "Run `pnpm --filter website dereference-schemas` or build the design system first.",
  );
}
