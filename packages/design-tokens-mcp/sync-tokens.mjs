#!/usr/bin/env node

/**
 * sync-tokens.mjs — Build-time token synchronization
 *
 * Copies design token files from the canonical source in
 * @kickstartds/design-system into this package's tokens/ directory.
 *
 * Run via:  pnpm run sync-tokens
 * Called automatically before "build" and "dev".
 *
 * Mapping:
 *   design-system/src/token/{global files}    → tokens/{global files}
 *   design-system/src/components/{name}/*-tokens.scss → tokens/componentToken/{name}-tokens.scss
 */

import { cp, mkdir, readdir, access } from "node:fs/promises";
import { resolve, dirname, basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = __dirname;

// ── Source paths (design-system) ────────────────────────────────────────────

const DS_ROOT = resolve(PACKAGE_ROOT, "..", "design-system");
const DS_TOKEN_DIR = join(DS_ROOT, "src", "token");
const DS_COMPONENTS_DIR = join(DS_ROOT, "src", "components");

// ── Target paths (this package) ─────────────────────────────────────────────

const TARGET_TOKENS_DIR = join(PACKAGE_ROOT, "tokens");
const TARGET_COMPONENT_DIR = join(TARGET_TOKENS_DIR, "componentToken");

// ── Global token files to sync ──────────────────────────────────────────────

const GLOBAL_TOKEN_FILES = [
  "background-color-token.scss",
  "border-color-token.scss",
  "border-token.scss",
  "box-shadow-token.scss",
  "branding-tokens.json",
  "branding-tokens.schema.json",
  "branding-tokens.css",
  "color-token.scss",
  "font-size-token.scss",
  "font-token.scss",
  "scaling-token.scss",
  "spacing-token.scss",
  "text-color-token.scss",
  "transition-token.scss",
  "component-token-catalog.json",
  "semantic-token-catalog.json",
];

// ── Main ────────────────────────────────────────────────────────────────────

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  // Verify design-system package exists
  if (!(await exists(DS_TOKEN_DIR))) {
    console.error(`❌  Design system token dir not found: ${DS_TOKEN_DIR}`);
    console.error(
      "    Make sure @kickstartds/design-system is present in the workspace.",
    );
    process.exit(1);
  }

  // Ensure target directories exist
  await mkdir(TARGET_TOKENS_DIR, { recursive: true });
  await mkdir(TARGET_COMPONENT_DIR, { recursive: true });

  let globalCount = 0;
  let componentCount = 0;

  // ── Sync global tokens ──────────────────────────────────────────────────

  for (const file of GLOBAL_TOKEN_FILES) {
    const src = join(DS_TOKEN_DIR, file);
    const dest = join(TARGET_TOKENS_DIR, file);

    if (!(await exists(src))) {
      console.warn(`  ⚠  Skipping missing global token: ${file}`);
      continue;
    }

    await cp(src, dest);
    globalCount++;
  }

  // ── Sync component tokens ──────────────────────────────────────────────

  // Walk design-system/src/components/*/  looking for *-tokens.scss
  const componentDirs = await readdir(DS_COMPONENTS_DIR, {
    withFileTypes: true,
  });

  for (const entry of componentDirs) {
    if (!entry.isDirectory()) continue;

    const componentDir = join(DS_COMPONENTS_DIR, entry.name);
    const files = await readdir(componentDir);

    for (const file of files) {
      // Match files like _button-tokens.scss or button-tokens.scss
      if (!file.endsWith("-tokens.scss")) continue;

      const src = join(componentDir, file);
      // Strip leading underscore for the target filename
      const targetName = file.startsWith("_") ? file.slice(1) : file;
      const dest = join(TARGET_COMPONENT_DIR, targetName);

      await cp(src, dest);
      componentCount++;
    }
  }

  console.log(
    `✔  Synced ${globalCount} global + ${componentCount} component token files from @kickstartds/design-system`,
  );
}

main().catch((err) => {
  console.error("sync-tokens failed:", err.message);
  process.exit(1);
});
