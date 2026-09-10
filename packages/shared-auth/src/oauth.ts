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

import crypto from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { verifyToken, isAuthEnabled } from "./verify.js";

// ── Types ─────────────────────────────────────────────────────────────────

export interface OAuthMiddlewareConfig {
  /** Display name shown on the authorization page (e.g. "Storyblok MCP") */
  serviceName?: string;
}

interface StoredAuthCode {
  jwt: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  redirectUri: string;
  clientId: string;
  expiresAt: number;
}

interface StoredClient {
  clientId: string;
  redirectUris: string[];
  clientName?: string;
}

// ── In-memory stores ──────────────────────────────────────────────────────

const authCodes = new Map<string, StoredAuthCode>();
const clients = new Map<string, StoredClient>();

const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Purge expired codes every 60 s
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [code, stored] of authCodes) {
    if (stored.expiresAt < now) authCodes.delete(code);
  }
}, 60_000);
cleanup.unref();

// ── Helpers ───────────────────────────────────────────────────────────────

function getBaseUrl(req: IncomingMessage): string {
  const proto =
    (req.headers["x-forwarded-proto"] as string | undefined) || "http";
  const host =
    (req.headers["x-forwarded-host"] as string | undefined) ||
    req.headers.host ||
    "localhost";
  return `${proto}://${host}`;
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
  extraHeaders?: Record<string, string>,
): void {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    ...extraHeaders,
  });
  res.end(JSON.stringify(body));
}

function setCorsHeaders(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function verifyPkce(
  codeVerifier: string,
  codeChallenge: string,
  method: string,
): boolean {
  if (method !== "S256") return false;
  const hash = crypto.createHash("sha256").update(codeVerifier).digest();
  return hash.toString("base64url") === codeChallenge;
}

/**
 * Returns the `WWW-Authenticate` header value that tells MCP clients where
 * to find the OAuth resource metadata.  Use this in 401 responses.
 */
export function wwwAuthenticateHeader(req: IncomingMessage): string {
  const base = getBaseUrl(req);
  return `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource"`;
}

// ── HTML template for the authorize page ──────────────────────────────────

function renderAuthorizePage(
  serviceName: string,
  params: Record<string, string>,
  error?: string,
): string {
  const e = (key: string) => escapeHtml(params[key] || "");
  const clientLabel = e("client_name") || e("client_id") || "An application";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authorize — ${escapeHtml(serviceName)}</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
      background:#f5f5f5;display:flex;justify-content:center;align-items:center;
      min-height:100vh;padding:1rem}
    .card{background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.1);
      max-width:480px;width:100%;padding:2rem}
    h1{font-size:1.25rem;margin-bottom:.5rem;color:#111}
    .desc{color:#666;font-size:.9rem;margin-bottom:1.5rem;line-height:1.5}
    .client{background:#f8fafc;padding:.75rem;border-radius:8px;font-size:.85rem;
      color:#475569;margin-bottom:1rem;word-break:break-all}
    label{display:block;font-size:.85rem;font-weight:600;margin-bottom:.5rem;color:#333}
    textarea{width:100%;height:100px;padding:.75rem;border:1px solid #ddd;
      border-radius:8px;font-family:monospace;font-size:.8rem;resize:vertical}
    textarea:focus{outline:none;border-color:#0066cc;box-shadow:0 0 0 3px rgba(0,102,204,.1)}
    .btn{display:block;width:100%;padding:.75rem;background:#0066cc;color:#fff;
      border:none;border-radius:8px;font-size:1rem;font-weight:600;cursor:pointer;
      margin-top:1rem}
    .btn:hover{background:#0052a3}
    .error{background:#fef2f2;color:#dc2626;padding:.75rem;border-radius:8px;
      font-size:.85rem;margin-bottom:1rem;border:1px solid #fecaca}
  </style>
</head>
<body>
  <div class="card">
    <h1>Authorize Access</h1>
    <p class="desc">
      <strong>${clientLabel}</strong> wants to connect to
      <strong>${escapeHtml(serviceName)}</strong>.
      Paste your access token below to authorize.
    </p>
    <div class="client">Client ID: ${e("client_id")}</div>
    ${error ? `<div class="error">${escapeHtml(error)}</div>` : ""}
    <form method="POST" action="/authorize">
      <label for="token">Access Token (JWT)</label>
      <textarea id="token" name="token" placeholder="eyJhbGciOiJIUzI1NiIs…" required></textarea>
      <input type="hidden" name="state" value="${e("state")}">
      <input type="hidden" name="redirect_uri" value="${e("redirect_uri")}">
      <input type="hidden" name="client_id" value="${e("client_id")}">
      <input type="hidden" name="code_challenge" value="${e("code_challenge")}">
      <input type="hidden" name="code_challenge_method" value="${e("code_challenge_method")}">
      <input type="hidden" name="scope" value="${e("scope")}">
      <button type="submit" class="btn">Authorize</button>
    </form>
  </div>
</body>
</html>`;
}

// ── OAuth middleware factory ──────────────────────────────────────────────

const OAUTH_PATHS = new Set([
  "/.well-known/oauth-protected-resource",
  "/.well-known/oauth-authorization-server-metadata",
  "/authorize",
  "/token",
  "/register",
]);

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
export function createOAuthMiddleware(config: OAuthMiddlewareConfig = {}) {
  const serviceName = config.serviceName || "MCP Server";

  return async function handleOAuth(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<boolean> {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    if (!OAUTH_PATHS.has(url.pathname)) return false;

    setCorsHeaders(res);

    if (req.method === "OPTIONS") {
      res.writeHead(204).end();
      return true;
    }

    const base = getBaseUrl(req);

    // ── Resource metadata (RFC 9728) ──────────────────────
    if (
      url.pathname === "/.well-known/oauth-protected-resource" &&
      req.method === "GET"
    ) {
      sendJson(res, 200, {
        resource: `${base}/mcp`,
        authorization_servers: [base],
        bearer_methods_supported: ["header"],
      });
      return true;
    }

    // ── Authorization server metadata (RFC 8414) ──────────
    if (
      url.pathname === "/.well-known/oauth-authorization-server-metadata" &&
      req.method === "GET"
    ) {
      sendJson(res, 200, {
        issuer: base,
        authorization_endpoint: `${base}/authorize`,
        token_endpoint: `${base}/token`,
        registration_endpoint: `${base}/register`,
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code"],
        code_challenge_methods_supported: ["S256"],
        token_endpoint_auth_methods_supported: ["none"],
        scopes_supported: ["mcp"],
      });
      return true;
    }

    // ── Dynamic client registration (RFC 7591) ────────────
    if (url.pathname === "/register" && req.method === "POST") {
      const body = await readBody(req);
      let registration: Record<string, unknown>;
      try {
        registration = JSON.parse(body);
      } catch {
        sendJson(res, 400, { error: "invalid_request" });
        return true;
      }

      const clientId = crypto.randomUUID();
      const redirectUris = Array.isArray(registration.redirect_uris)
        ? (registration.redirect_uris as string[])
        : [];

      clients.set(clientId, {
        clientId,
        redirectUris,
        clientName: (registration.client_name as string) || undefined,
      });

      sendJson(res, 201, {
        client_id: clientId,
        client_name: registration.client_name || undefined,
        redirect_uris: redirectUris,
        grant_types: ["authorization_code"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      });
      return true;
    }

    // ── Authorization endpoint ────────────────────────────
    if (url.pathname === "/authorize") {
      if (req.method === "GET") {
        const params: Record<string, string> = {};
        for (const [k, v] of url.searchParams) params[k] = v;

        // Validate required OAuth params
        if (
          !params.redirect_uri ||
          !params.client_id ||
          !params.code_challenge ||
          !params.response_type
        ) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end(
            "Missing required parameters: redirect_uri, client_id, code_challenge, response_type",
          );
          return true;
        }
        if (params.response_type !== "code") {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Unsupported response_type (must be 'code')");
          return true;
        }

        // Look up client name from registration (if available)
        const client = clients.get(params.client_id);
        if (client?.clientName) params.client_name = client.clientName;

        // When auth is disabled, auto-approve without showing the form
        if (!isAuthEnabled()) {
          const code = crypto.randomBytes(32).toString("hex");
          authCodes.set(code, {
            jwt: "__noauth__",
            codeChallenge: params.code_challenge,
            codeChallengeMethod: params.code_challenge_method || "S256",
            redirectUri: params.redirect_uri,
            clientId: params.client_id,
            expiresAt: Date.now() + CODE_TTL_MS,
          });
          const redirect = new URL(params.redirect_uri);
          redirect.searchParams.set("code", code);
          if (params.state) redirect.searchParams.set("state", params.state);
          res.writeHead(302, { Location: redirect.toString() });
          res.end();
          return true;
        }

        // Show the token-paste form
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(renderAuthorizePage(serviceName, params));
        return true;
      }

      if (req.method === "POST") {
        const body = await readBody(req);
        const form = new URLSearchParams(body);

        const jwt = form.get("token") || "";
        const state = form.get("state") || "";
        const redirectUri = form.get("redirect_uri") || "";
        const clientId = form.get("client_id") || "";
        const codeChallenge = form.get("code_challenge") || "";
        const codeChallengeMethod = form.get("code_challenge_method") || "S256";
        const scope = form.get("scope") || "";

        if (!redirectUri || !clientId || !codeChallenge) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Missing required form fields");
          return true;
        }

        // Verify the JWT
        const user = verifyToken(jwt);
        if (!user) {
          // Re-render the form with an error
          const params: Record<string, string> = {
            state,
            redirect_uri: redirectUri,
            client_id: clientId,
            code_challenge: codeChallenge,
            code_challenge_method: codeChallengeMethod,
            scope,
          };
          const client = clients.get(clientId);
          if (client?.clientName) params.client_name = client.clientName;
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(
            renderAuthorizePage(
              serviceName,
              params,
              "Invalid or expired token. Please paste a valid JWT.",
            ),
          );
          return true;
        }

        // Issue an authorization code
        const code = crypto.randomBytes(32).toString("hex");
        authCodes.set(code, {
          jwt,
          codeChallenge,
          codeChallengeMethod,
          redirectUri,
          clientId,
          expiresAt: Date.now() + CODE_TTL_MS,
        });

        // Redirect back to the client with the code
        const redirect = new URL(redirectUri);
        redirect.searchParams.set("code", code);
        if (state) redirect.searchParams.set("state", state);
        res.writeHead(302, { Location: redirect.toString() });
        res.end();
        return true;
      }
    }

    // ── Token endpoint ────────────────────────────────────
    if (url.pathname === "/token" && req.method === "POST") {
      const body = await readBody(req);
      const form = new URLSearchParams(body);

      const grantType = form.get("grant_type");
      const code = form.get("code");
      const codeVerifier = form.get("code_verifier");
      const redirectUri = form.get("redirect_uri");

      if (grantType !== "authorization_code") {
        sendJson(res, 400, {
          error: "unsupported_grant_type",
          error_description: "Only authorization_code is supported",
        });
        return true;
      }

      if (!code || !codeVerifier) {
        sendJson(res, 400, {
          error: "invalid_request",
          error_description: "Missing code or code_verifier",
        });
        return true;
      }

      const stored = authCodes.get(code);
      if (!stored || stored.expiresAt < Date.now()) {
        authCodes.delete(code || "");
        sendJson(res, 400, {
          error: "invalid_grant",
          error_description: "Authorization code is invalid or expired",
        });
        return true;
      }

      // One-time use
      authCodes.delete(code);

      // Validate redirect_uri matches
      if (redirectUri && redirectUri !== stored.redirectUri) {
        sendJson(res, 400, {
          error: "invalid_grant",
          error_description: "redirect_uri mismatch",
        });
        return true;
      }

      // Verify PKCE
      if (
        !verifyPkce(
          codeVerifier,
          stored.codeChallenge,
          stored.codeChallengeMethod,
        )
      ) {
        sendJson(res, 400, {
          error: "invalid_grant",
          error_description: "PKCE verification failed",
        });
        return true;
      }

      // Build the token response — the access_token IS the original JWT
      const accessToken =
        stored.jwt === "__noauth__" ? "__noauth__" : stored.jwt;

      // Compute expires_in from the JWT's exp claim
      let expiresIn = 86400; // default 24h
      if (stored.jwt !== "__noauth__") {
        const decoded = verifyToken(stored.jwt);
        if (decoded?.exp) {
          expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
          if (expiresIn < 0) expiresIn = 0;
        }
      }

      sendJson(res, 200, {
        access_token: accessToken,
        token_type: "bearer",
        expires_in: expiresIn,
      });
      return true;
    }

    return false;
  };
}
