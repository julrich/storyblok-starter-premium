/**
 * Express server for the Design Tokens Editor.
 *
 * In production: serves the built SPA from dist/app/ and handles API routes.
 * In dev mode: only handles API routes (Vite dev server proxies /api/*).
 */

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { resolve, dirname } from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { createRoutes } from "./routes.js";
import { createAuthRoutes, requireAuth } from "./auth.js";
import { isAuthEnabled } from "@kickstartds/shared-auth";
import type { StoryblokConfig } from "./storyblok.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function startServer(config: StoryblokConfig, port: number): void {
  const app = express();

  // Enable CORS for dev mode (Vite on different port)
  app.use(cors());
  app.use(cookieParser());

  // Mount auth routes (login, logout, me) — unauthenticated
  app.use(createAuthRoutes());

  // Protect /api/tokens/* routes with auth middleware
  app.use("/api/tokens", requireAuth);

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
      `\n  Design Tokens Editor API server running on http://localhost:${port}`,
    );
    console.log(`  Storyblok Space: ${config.spaceId}`);
    console.log(
      `  OAuth Token: ${config.oauthToken ? config.oauthToken.slice(0, 8) + "..." : "(missing)"}`,
    );
    console.log(`  API Base: ${config.apiBase}`);
    if (!isAuthEnabled()) {
      console.log(
        "  \u26a0 MCP_JWT_SECRET not set \u2014 authentication disabled. All requests are unauthenticated.",
      );
    }
    console.log();
  });
}
