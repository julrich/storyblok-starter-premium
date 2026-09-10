/**
 * Express dev server for the Schema Layer Editor.
 *
 * In production/CLI mode: serves the built SPA from dist/app/ and handles API routes.
 * In dev mode: only handles API routes (Vite dev server serves the SPA and proxies /api/*).
 */

import express from "express";
import cors from "cors";
import { resolve, dirname } from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { createRoutes, type ServerConfig } from "./routes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function startServer(config: ServerConfig, port: number): void {
  const app = express();

  // Enable CORS for dev mode (Vite on different port)
  app.use(cors());

  // Mount API routes
  const routes = createRoutes(config);
  app.use(routes);

  // Serve built SPA in production mode
  const distAppDir = resolve(__dirname, "../app");
  if (existsSync(distAppDir)) {
    app.use(express.static(distAppDir));

    // SPA fallback: serve index.html for all non-API routes
    app.get("*", (_req, res) => {
      res.sendFile(resolve(distAppDir, "index.html"));
    });
  }

  app.listen(port, () => {
    console.log(
      `\n  Schema Layer Editor API server running on http://localhost:${port}`
    );
    console.log(`  Schemas: ${config.schemasDir}`);
    if (config.layerDir) {
      console.log(`  Layer: ${config.layerDir}`);
    }
    console.log(`  Namespace: ${config.namespace}`);
    console.log(`  Output: ${config.outputDir}`);
    console.log();
  });
}
