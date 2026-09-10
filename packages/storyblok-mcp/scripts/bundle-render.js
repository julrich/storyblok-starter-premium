#!/usr/bin/env node
/**
 * Bundle `src/ui/render.tsx` into a single ESM file with esbuild.
 *
 * The kickstartDS component packages (`@kickstartds/design-system`,
 * `@kickstartds/core`, etc.) use CJS-style directory imports internally
 * (e.g. `@kickstartds/core/lib/react`). Node.js ESM forbids directory
 * imports at runtime, causing `ERR_UNSUPPORTED_DIR_IMPORT`.
 *
 * Since `tsconfig.json` uses `"moduleResolution": "bundler"`, TypeScript
 * can type-check these imports fine, but the tsc output still contains
 * unresolved directory specifiers that Node rejects.
 *
 * This script uses esbuild to bundle `render.tsx` into a single file,
 * resolving ALL imports (including transitive directory imports inside
 * kickstartDS packages) at build time. The output overwrites the tsc
 * output at `dist/ui/render.js`.
 *
 * Component CSS (e.g. `import "./section.css"` inside each kickstartDS
 * component) is collected by esbuild into a companion CSS bundle, then
 * written to `src/ui/components-css.generated.ts` as an exported string
 * constant. This complements the global tokens CSS extracted by
 * `extract-tokens.js` — together they provide full styling for SSR
 * preview output.
 *
 * Run via: `node scripts/bundle-render.js`
 * Run order: After `tsc` so that all other dist/ files are in place.
 *
 * @see PRD Section 6.3 — Server-Side Rendering with renderToStaticMarkup
 */

import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

/**
 * esbuild plugin: stub out browser-only packages that have broken export maps.
 *
 * `@glidejs/glide` is a carousel library used by `@kickstartds/content`
 * for client-side slider behavior. Its `exports` map doesn't expose the
 * `./src/*` subpaths that kickstartDS imports, causing esbuild to error.
 * These modules are pure browser-side behavior — not needed for SSR.
 *
 * This plugin intercepts any `@glidejs/glide*` import and replaces it
 * with an empty module, so the bundle builds cleanly and the render
 * functions work without carousel dependencies.
 */
const stubBrowserOnlyPackages = {
  name: "stub-browser-only",
  setup(build) {
    // Match any import from @glidejs/glide (including subpaths)
    build.onResolve({ filter: /^@glidejs\/glide/ }, (args) => ({
      path: args.path,
      namespace: "stub-browser-only",
    }));

    // Return an empty module for all stubbed imports.
    // Export no-op functions for all known named imports to satisfy
    // the `import { define } from "..."` and `import { throttle } from "..."`
    // patterns used by @kickstartds/content's glide wrappers.
    build.onLoad({ filter: /.*/, namespace: "stub-browser-only" }, () => ({
      contents: `
          const noop = () => {};
          export default noop;
          export const define = noop;
          export const throttle = noop;
        `,
      loader: "js",
    }));
  },
};

try {
  await build({
    entryPoints: [resolve(projectRoot, "src/ui/render.tsx")],
    outfile: resolve(projectRoot, "dist/ui/render.js"),
    bundle: true,
    format: "esm",
    platform: "node",
    target: "es2022",
    jsx: "automatic",

    plugins: [stubBrowserOnlyPackages],

    // Mark react/react-dom as external — they're proper ESM-compatible
    // packages already installed, no directory import issues.
    external: ["react", "react-dom", "react/jsx-runtime"],

    // Source map for debugging SSR render issues
    sourcemap: true,

    // Tree-shake unused exports from large kickstartDS bundles
    treeShaking: true,

    // Log level for build output
    logLevel: "info",
  });

  // ── Collect bundled component CSS ──────────────────────────────
  //
  // esbuild outputs a companion CSS file at `dist/ui/render.css`
  // containing all `import "./component.css"` references from the
  // kickstartDS component tree. We read it and write it as a TS
  // string constant so the preview templates can inline it.
  //
  const cssOutputPath = resolve(projectRoot, "dist/ui/render.css");
  const generatedTsPath = resolve(
    projectRoot,
    "src/ui/components-css.generated.ts"
  );

  let componentCss;
  try {
    componentCss = readFileSync(cssOutputPath, "utf-8");
  } catch {
    console.warn(
      "⚠ No companion CSS output at dist/ui/render.css — components may have no CSS imports"
    );
    componentCss = "";
  }

  // Escape backticks and template literal markers for embedding in a TS template string
  const escapedCss = componentCss
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");

  const tsOutput = `/**
 * AUTO-GENERATED — Do not edit manually.
 *
 * kickstartDS component-level CSS collected by esbuild at build time.
 * These are the individual component stylesheets (hero.css, section.css,
 * faq.css, etc.) that are imported via \`import "./component.css"\` inside
 * each kickstartDS React component module.
 *
 * Generated by: scripts/bundle-render.js
 * Size: ${(componentCss.length / 1024).toFixed(1)} KB
 *
 * This complements KDS_GLOBAL_CSS (normalize + design tokens) from
 * tokens.generated.ts — together they provide full styling for the
 * SSR preview output in ext-apps iframes.
 */

/** Component-level CSS (hero, section, faq, features, etc.) */
export const KDS_COMPONENT_CSS = \`${escapedCss}\`;
`;

  writeFileSync(generatedTsPath, tsOutput, "utf-8");

  console.log("✓ Bundled render.tsx → dist/ui/render.js");
  console.log(
    `✓ Extracted ${(componentCss.length / 1024).toFixed(
      1
    )} KB of component CSS → src/ui/components-css.generated.ts`
  );
} catch (err) {
  console.error("✗ Failed to bundle render.tsx:", err);
  process.exit(1);
}
