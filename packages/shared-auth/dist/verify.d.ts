import type { IncomingMessage } from "node:http";
import type { AuthUser } from "./types.js";
/**
 * Verify a JWT token string and return the decoded user, or null if invalid.
 *
 * Returns null (auth disabled) when MCP_JWT_SECRET is not set — this preserves
 * backward compatibility for local/stdio usage.
 */
export declare function verifyToken(token: string): AuthUser | null;
/**
 * Extract a Bearer token from the Authorization header.
 */
export declare function extractBearerToken(req: IncomingMessage): string | null;
/**
 * Check whether JWT auth is enabled (MCP_JWT_SECRET is set).
 */
export declare function isAuthEnabled(): boolean;
