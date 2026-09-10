/**
 * Thin OAuth 2.1 authorization layer for MCP servers.
 *
 * Adds the endpoints claude.ai (and other OAuth-based MCP clients) need:
 *   - GET  /.well-known/oauth-protected-resource
 *   - GET  /.well-known/oauth-authorization-server-metadata
 *   - GET  /authorize   (shows token-paste form)
 *   - POST /authorize   (validates JWT, issues authorization code, redirects)
 *   - POST /token        (exchanges code + PKCE verifier for access token)
 *   - POST /register     (dynamic client registration — RFC 7591)
 *
 * The access token returned by /token IS the pre-issued JWT that the existing
 * auth guard already verifies — no changes needed downstream.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
export interface OAuthMiddlewareConfig {
    /** Display name shown on the authorization page (e.g. "Storyblok MCP") */
    serviceName?: string;
}
/**
 * Returns the `WWW-Authenticate` header value that tells MCP clients where
 * to find the OAuth resource metadata.  Use this in 401 responses.
 */
export declare function wwwAuthenticateHeader(req: IncomingMessage): string;
/**
 * Create an OAuth middleware that handles discovery, authorization, token
 * exchange, and dynamic client registration.
 *
 * Usage inside an HTTP server handler:
 * ```ts
 * const handleOAuth = createOAuthMiddleware({ serviceName: "Storyblok MCP" });
 * // … inside createServer callback:
 * if (await handleOAuth(req, res)) return;  // OAuth route handled
 * // … rest of MCP handling
 * ```
 */
export declare function createOAuthMiddleware(config?: OAuthMiddlewareConfig): (req: IncomingMessage, res: ServerResponse) => Promise<boolean>;
