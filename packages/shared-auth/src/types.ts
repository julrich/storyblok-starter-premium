import type { IncomingMessage } from "node:http";

export interface AuthUser {
  /** User identifier (name, email, or client ID) */
  sub: string;
  /** Role — "admin" or "reader" (informational in v1, no enforcement) */
  role: string;
  /** Unique token ID for revocation */
  jti: string;
  /** Issued-at timestamp */
  iat: number;
  /** Expiration timestamp */
  exp: number;
}

export interface AuthenticatedRequest extends IncomingMessage {
  user?: AuthUser;
}
