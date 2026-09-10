/**
 * CLI entry point for the Schema Layer Editor.
 *
 * Parses command-line arguments and starts the Express server.
 *
 * Usage:
 *   pnpm --filter schema-layer-editor start \
 *     --schemas ../website/node_modules/@kickstartds/design-system/dist/components \
 *     --namespace visibility \
 *     --layer ../website/cms/visibility \
 *     --output ../website/cms/visibility
 */

import { Command } from "commander";
import { resolve } from "path";
import { startServer } from "./server/index.js";
import type { ServerConfig } from "./server/routes.js";

const program = new Command();

program
  .name("schema-layer-editor")
  .description("Visual editor for creating and editing JSON Schema layer files")
  .requiredOption(
    "--schemas <path>",
    "Path to directory containing *.schema.dereffed.json files"
  )
  .requiredOption(
    "--namespace <name>",
    'Layer namespace for $id URLs (e.g. "visibility", "language")'
  )
  .option("--layer <path>", "Path to existing layer directory to load")
  .option(
    "--schemas-extra <paths...>",
    "Additional directories with *.schema.dereffed.json files (shadow base schemas by name)"
  )
  .option(
    "--base-url <url>",
    "Custom base URL for $id generation (default: http://<namespace>.mydesignsystem.com)"
  )
  .option(
    "--output <path>",
    "Output directory for generated layer files (default: same as --layer, or ./output/<namespace>)"
  )
  .option("--port <number>", "Server port", "4201")
  .parse(process.argv);

const opts = program.opts<{
  schemas: string;
  schemasExtra?: string[];
  namespace: string;
  layer?: string;
  baseUrl?: string;
  output?: string;
  port: string;
}>();

const schemasDir = resolve(opts.schemas);
const schemasExtraDirs = (opts.schemasExtra || []).map((p) => resolve(p));
const layerDir = opts.layer ? resolve(opts.layer) : undefined;
const namespace = opts.namespace;
const baseUrl = opts.baseUrl || `http://${namespace}.mydesignsystem.com`;
const outputDir = opts.output
  ? resolve(opts.output)
  : layerDir
  ? layerDir
  : resolve(`./output/${namespace}`);
const port = parseInt(opts.port, 10);

const config: ServerConfig = {
  schemasDir,
  schemasExtraDirs,
  layerDir,
  namespace,
  baseUrl,
  outputDir,
};

startServer(config, port);
