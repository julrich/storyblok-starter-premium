import jwt from "jsonwebtoken";
import type { IncomingMessage } from "node:http";
import { isRevoked } from "./revocation.js";
import type { AuthUser } from "./types.js";

/**
 * Verify a JWT token string and return the decoded user, or null if invalid.
 *
 * Returns null (auth disabled) when MCP_JWT_SECRET is not set — this preserves
 * backward compatibility for local/stdio usage.
 */
export function verifyToken(token: string): AuthUser | null {
  const secret = process.env.MCP_JWT_SECRET;
  if (!secret) return null;

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
    }) as AuthUser;

    if (isRevoked(decoded)) return null;

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Extract a Bearer token from the Authorization header.
 */
export function extractBearerToken(req: IncomingMessage): string | null {
  const header = req.headers["authorization"];
  if (!header || !header.startsWith("Bearer ")) return null;
  return header.slice(7);
}

/**
 * Check whether JWT auth is enabled (MCP_JWT_SECRET is set).
 */
export function isAuthEnabled(): boolean {
  return !!process.env.MCP_JWT_SECRET;
}
