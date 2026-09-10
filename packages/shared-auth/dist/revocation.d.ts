import type { AuthUser } from "./types.js";
/**
 * Check whether a token has been revoked via the MCP_REVOKED_TOKENS env var.
 *
 * Format: comma-separated entries of "jti:<id>" or "sub:<user>"
 * Example: "jti:abc123,sub:old-client,jti:def456"
 */
export declare function isRevoked(user: AuthUser): boolean;
