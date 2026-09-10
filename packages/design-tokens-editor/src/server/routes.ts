/**
 * Express API routes for the Design Tokens Editor.
 *
 * Provides CRUD operations for token presets via Storyblok Management API.
 * Maintains the same /api/tokens/ interface that the frontend expects.
 */

import { Router, json } from "express";
import type { Request, Response } from "express";
import {
  listThemes,
  getTheme,
  createTheme,
  updateTheme,
  deleteTheme,
  isSystemTheme,
  type StoryblokConfig,
} from "./storyblok.js";

export function createRoutes(config: StoryblokConfig): Router {
  const router = Router();
  router.use(json({ limit: "2mb" }));

  // ── GET /api/tokens/ — List all theme names ──────────────────────────

  router.get("/api/tokens/", async (_req: Request, res: Response) => {
    try {
      const names = await listThemes(config);
      res.json(names);
    } catch (err) {
      console.error("Error listing themes:", err);
      res
        .status(500)
        .json(err instanceof Error ? err.message : "Internal Server Error");
    }
  });

  // ── GET /api/tokens/:name — Get a single theme ──────────────────────

  router.get("/api/tokens/:name", async (req: Request, res: Response) => {
    try {
      const data = await getTheme(config, req.params.name);
      if (data === null) {
        res.status(404).json("Not Found");
        return;
      }
      // Return both branding tokens and componentTokens as a combined object
      const result: Record<string, unknown> = {};

      // Parse branding tokens
      if (data.tokens) {
        try {
          Object.assign(result, { tokens: JSON.parse(data.tokens) });
        } catch {
          result.tokens = data.tokens;
        }
      }

      // Parse component tokens if present
      if (data.componentTokens) {
        try {
          result.componentTokens = JSON.parse(data.componentTokens);
        } catch {
          result.componentTokens = data.componentTokens;
        }
      }

      res.json(result);
    } catch (err) {
      console.error("Error fetching theme:", err);
      res
        .status(500)
        .json(err instanceof Error ? err.message : "Internal Server Error");
    }
  });

  // ── POST /api/tokens/:name — Create a new theme ─────────────────────

  router.post("/api/tokens/:name", async (req: Request, res: Response) => {
    try {
      const body = req.body;
      if (!body || typeof body !== "object") {
        res.status(422).json("Missing or Invalid Data");
        return;
      }

      // Support both flat (legacy) and structured body
      const brandingTokens = body.tokens || body;
      const componentTokens = body.componentTokens || undefined;
      const tokensJson = JSON.stringify(brandingTokens);

      // Compute branding CSS
      let css = "";
      try {
        const { tokensToCss } =
          await import("@kickstartds/design-system/tokens/tokensToCss.mjs");
        css = tokensToCss(brandingTokens);
      } catch (e) {
        console.warn("Could not compute CSS from tokens:", e);
      }

      // Compute component CSS if overrides are present
      let componentTokensJson: string | undefined;
      let componentCss: string | undefined;
      if (
        componentTokens &&
        typeof componentTokens === "object" &&
        Object.keys(componentTokens).length > 0
      ) {
        componentTokensJson = JSON.stringify(componentTokens);
        try {
          const { componentTokensToCss } =
            await import("@kickstartds/design-system/tokens/componentTokensToCss.mjs");
          const catalog = (
            await import(
              "@kickstartds/design-system/tokens/component-token-catalog.json",
              { with: { type: "json" } }
            )
          ).default;
          componentCss = componentTokensToCss(componentTokens, catalog);
        } catch (e) {
          console.warn("Could not compute component CSS:", e);
        }
      }

      const created = await createTheme(
        config,
        req.params.name,
        tokensJson,
        css,
        componentTokensJson,
        componentCss,
      );
      if (!created) {
        res.status(409).json("Token name already exists");
        return;
      }

      res.status(201).json(body);
    } catch (err) {
      console.error("Error creating theme:", err);
      res
        .status(500)
        .json(err instanceof Error ? err.message : "Internal Server Error");
    }
  });

  // ── PUT /api/tokens/:name — Update an existing theme ─────────────────

  router.put("/api/tokens/:name", async (req: Request, res: Response) => {
    try {
      // Guard: reject updates to system-managed themes
      if (await isSystemTheme(config, req.params.name)) {
        res
          .status(403)
          .json(
            "System-managed theme cannot be modified. Use 'Save As' to create a copy.",
          );
        return;
      }

      const body = req.body;
      if (!body || typeof body !== "object") {
        res.status(422).json("Missing or Invalid Data");
        return;
      }

      // Support both flat (legacy) and structured body
      const brandingTokens = body.tokens || body;
      const componentTokens = body.componentTokens || undefined;
      const tokensJson = JSON.stringify(brandingTokens);

      // Compute branding CSS
      let css = "";
      try {
        const { tokensToCss } =
          await import("@kickstartds/design-system/tokens/tokensToCss.mjs");
        css = tokensToCss(brandingTokens);
      } catch (e) {
        console.warn("Could not compute CSS from tokens:", e);
      }

      // Compute component CSS if overrides are present
      let componentTokensJson: string | undefined;
      let componentCss: string | undefined;
      if (componentTokens && typeof componentTokens === "object") {
        componentTokensJson =
          Object.keys(componentTokens).length > 0
            ? JSON.stringify(componentTokens)
            : "";
        try {
          const { componentTokensToCss } =
            await import("@kickstartds/design-system/tokens/componentTokensToCss.mjs");
          const catalog = (
            await import(
              "@kickstartds/design-system/tokens/component-token-catalog.json",
              { with: { type: "json" } }
            )
          ).default;
          componentCss = componentTokensToCss(componentTokens, catalog);
        } catch (e) {
          console.warn("Could not compute component CSS:", e);
        }
      }

      const updated = await updateTheme(
        config,
        req.params.name,
        tokensJson,
        css,
        componentTokensJson,
        componentCss,
      );
      if (!updated) {
        // If the theme doesn't exist yet, create it (PUT is idempotent)
        await createTheme(
          config,
          req.params.name,
          tokensJson,
          css,
          componentTokensJson,
          componentCss,
        );
      }

      res.status(200).json(body);
    } catch (err) {
      console.error("Error updating theme:", err);
      res
        .status(500)
        .json(err instanceof Error ? err.message : "Internal Server Error");
    }
  });

  // ── DELETE /api/tokens/:name — Delete a theme ────────────────────────

  router.delete("/api/tokens/:name", async (req: Request, res: Response) => {
    try {
      // Guard: reject deletion of system-managed themes
      if (await isSystemTheme(config, req.params.name)) {
        res.status(403).json("System-managed theme cannot be deleted.");
        return;
      }

      await deleteTheme(config, req.params.name);
      res.status(200).json("OK");
    } catch (err) {
      console.error("Error deleting theme:", err);
      res
        .status(500)
        .json(err instanceof Error ? err.message : "Internal Server Error");
    }
  });

  // ── GET /api/health — Health check ───────────────────────────────────

  router.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  return router;
}
