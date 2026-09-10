/**
 * Shared helpers for /api/prompter/* routes.
 *
 * Centralizes CORS middleware, environment validation, client creation,
 * and schema registry initialization so individual routes stay small.
 */
import { NextApiRequest, NextApiResponse } from "next";
import Cors from "cors";
import { resolve } from "path";
import { existsSync } from "fs";
import {
  createOpenAiClient,
  createStoryblokClient,
  createContentClient,
  createRegistryFromSchemaDir,
  ServiceError,
  type SchemaRegistry,
} from "@kickstartds/storyblok-services";

// ─── CORS ─────────────────────────────────────────────────────────────

const corsGet = Cors({ methods: ["GET"], origin: "*" });
const corsPost = Cors({ methods: ["POST"], origin: "*" });

export function runMiddleware(
  req: NextApiRequest,
  res: NextApiResponse,
  fn: Function
): Promise<void> {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

export function corsGET(req: NextApiRequest, res: NextApiResponse) {
  return runMiddleware(req, res, corsGet);
}

export function corsPOST(req: NextApiRequest, res: NextApiResponse) {
  return runMiddleware(req, res, corsPost);
}

// ─── Environment helpers ──────────────────────────────────────────────

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new EnvMissingError(name);
  return value;
}

/**
 * Custom error for missing environment variables.
 * Allows handleError to return a more specific 503 status.
 */
export class EnvMissingError extends Error {
  public readonly envVar: string;
  constructor(name: string) {
    super(`Missing environment variable ${name}`);
    this.name = "EnvMissingError";
    this.envVar = name;
  }
}

/**
 * Check whether a specific env var is set (non-throwing).
 * Useful for pre-flight checks before calling OpenAI.
 */
export function hasEnv(name: string): boolean {
  return !!process.env[name];
}

// ─── Client factories ─────────────────────────────────────────────────

export function getOpenAiClient() {
  const apiKey = requireEnv("NEXT_OPENAI_API_KEY");
  return createOpenAiClient({ apiKey });
}

export function getStoryblokManagementClient() {
  const spaceId = requireEnv("NEXT_STORYBLOK_SPACE_ID");
  const oauthToken = requireEnv("NEXT_STORYBLOK_OAUTH_TOKEN");
  return {
    client: createStoryblokClient({ spaceId, apiToken: "", oauthToken }),
    spaceId,
  };
}

export function getStoryblokContentClient() {
  const apiToken = requireEnv("NEXT_STORYBLOK_API_TOKEN");
  const spaceId = requireEnv("NEXT_STORYBLOK_SPACE_ID");
  return {
    client: createContentClient({ spaceId, apiToken }),
    spaceId,
  };
}

// ─── Schema Registry (lazy singleton) ─────────────────────────────────

let _registry: SchemaRegistry | null = null;

/**
 * Get or create the schema registry from the MCP server's schemas directory.
 *
 * Uses `createRegistryFromSchemaDir` which loads flat
 * `{name}.schema.dereffed.json` files from the MCP server's schemas dir.
 * This avoids webpack path resolution issues with the DS package.
 * Cached as a module-level singleton.
 */
export function getRegistry(): SchemaRegistry {
  if (!_registry) {
    // Dev: process.cwd() = packages/website/ → ../storyblok-mcp/schemas resolves correctly.
    // Docker: process.cwd() = /app (WORKDIR) → need packages/storyblok-mcp/schemas instead.
    const fromParent = resolve(process.cwd(), "..", "storyblok-mcp", "schemas");
    const fromRoot = resolve(process.cwd(), "packages", "storyblok-mcp", "schemas");
    const schemasDir = existsSync(fromParent) ? fromParent : fromRoot;
    _registry = createRegistryFromSchemaDir(schemasDir);
  }
  return _registry;
}

// ─── Error handling ───────────────────────────────────────────────────

export function handleError(res: NextApiResponse, err: unknown) {
  if (err instanceof EnvMissingError) {
    const friendly = err.envVar.includes("OPENAI")
      ? "OpenAI API key is not configured. Please set the NEXT_OPENAI_API_KEY environment variable."
      : err.envVar.includes("STORYBLOK")
      ? "Storyblok credentials are not configured. Please check your environment variables."
      : err.message;
    console.error(`EnvMissingError: ${err.message}`);
    return res.status(503).json({ error: friendly, code: "ENV_MISSING" });
  }
  if (err instanceof ServiceError) {
    console.error(`ServiceError [${err.code}]: ${err.message}`);
    return res.status(500).json({ error: err.message, code: err.code });
  }
  if (err instanceof Error) {
    // Detect OpenAI rate limit / quota errors
    if (
      err.message.includes("429") ||
      err.message.toLowerCase().includes("rate limit")
    ) {
      console.error("Rate limit error:", err.message);
      return res.status(429).json({
        error: "Rate limit exceeded. Please wait a moment and try again.",
        code: "RATE_LIMITED",
      });
    }
    // Detect OpenAI auth errors
    if (
      err.message.includes("401") ||
      err.message.toLowerCase().includes("invalid api key")
    ) {
      console.error("Auth error:", err.message);
      return res.status(503).json({
        error: "OpenAI API key is invalid. Please check your configuration.",
        code: "AUTH_ERROR",
      });
    }
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
}
