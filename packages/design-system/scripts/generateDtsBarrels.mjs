/**
 * Post-build script: generates index.d.ts barrel files in dist/ that match
 * Rollup's entry point naming (dist/components/{name}/index.js).
 *
 * tsc --emitDeclarationOnly preserves the source file structure
 * (e.g. dist/components/section/SectionComponent.d.ts), but the package.json
 * exports map expects dist/components/{name}/index.d.ts. This script bridges
 * that gap by creating re-exporting barrel files.
 */
import fg from "fast-glob";
import path from "node:path";
import fs from "node:fs";
import { paramCase } from "change-case";

const root = path.resolve(import.meta.dirname, "..");

// Discover the same component files that Rollup uses as entry points
const componentFiles = fg.sync(
  [
    "src/components/**/*Component.tsx",
    "src/components/**/*Component.jsx",
    "src/components/Providers.tsx",
    "src/components/Providers.jsx",
  ],
  { cwd: root }
);

for (const srcFile of componentFiles) {
  const baseName = path.basename(srcFile, path.extname(srcFile));
  const folderName = paramCase(baseName.replace("Component", ""));
  const indexDts = path.join(
    root,
    "dist",
    "components",
    folderName,
    "index.d.ts"
  );

  // Determine the actual .d.ts file name tsc emitted
  const srcDir = path.dirname(srcFile); // e.g. src/components/section
  const dtsName = baseName + ".d.ts"; // e.g. SectionComponent.d.ts
  const relSrcDir = path.relative("src", srcDir); // e.g. components/section
  const actualDts = path.join(root, "dist", relSrcDir, dtsName);

  if (!fs.existsSync(actualDts)) {
    continue;
  }

  // Calculate relative import path from index.d.ts to the actual .d.ts
  const indexDir = path.dirname(indexDts);
  let relImport = path.relative(indexDir, actualDts).replace(/\.d\.ts$/, "");
  if (!relImport.startsWith(".")) {
    relImport = "./" + relImport;
  }

  // Don't overwrite if index.d.ts already exists (shouldn't happen with tsc output)
  if (fs.existsSync(indexDts)) {
    continue;
  }

  fs.mkdirSync(indexDir, { recursive: true });

  // Check if the source .d.ts has a default export
  const dtsContent = fs.readFileSync(actualDts, "utf8");
  const hasDefault = /^export default /m.test(dtsContent);

  let barrel = `export * from "${relImport}";\n`;
  if (hasDefault) {
    barrel += `export { default } from "${relImport}";\n`;
  }
  fs.writeFileSync(indexDts, barrel);
}
