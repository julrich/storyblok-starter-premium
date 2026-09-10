import type { AuthUser } from "./types.js";

/**
 * Check whether a token has been revoked via the MCP_REVOKED_TOKENS env var.
 *
 * Format: comma-separated entries of "jti:<id>" or "sub:<user>"
 * Example: "jti:abc123,sub:old-client,jti:def456"
 */
export function isRevoked(user: AuthUser): boolean {
  const raw = process.env.MCP_REVOKED_TOKENS || "";
  if (!raw) return false;

  const entries = raw
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  for (const entry of entries) {
    const colonIdx = entry.indexOf(":");
    if (colonIdx === -1) continue;
    const key = entry.slice(0, colonIdx);
    const value = entry.slice(colonIdx + 1);
    if (key === "jti" && value === user.jti) return true;
    if (key === "sub" && value === user.sub) return true;
  }
  return false;
}
