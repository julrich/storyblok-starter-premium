# PRD: JWT Authentication for Hosted Services

**Status:** Accepted
**Author:** Generated
**Date:** 2026-03-14
**Services in scope:** Storyblok MCP, Design Tokens MCP, Component Builder MCP, Design Tokens Editor

---

## Problem Statement

All four hosted services are deployed via Kamal + Traefik with auto-TLS but have **no HTTP-level authentication**. Endpoints are publicly accessible once deployed. This exposes:

- **Storyblok MCP:** Write access to the CMS (Management API), OpenAI API credit consumption
- **Design Tokens Editor:** CRUD operations on theme stories via the Storyblok Management API
- **Design Tokens MCP:** Token write operations (`update_branding_token`)
- **Component Builder MCP:** Read-only templates — lowest risk, but still uncontrolled access

Users include internal team members (GitHub accounts) and **external clients/collaborators without GitHub accounts**, ruling out GitHub-only identity solutions.

## Goals

1. Authenticate all HTTP requests to the 4 hosted services with per-user identity
2. Support internal and external users without requiring a third-party account
3. Minimal infrastructure overhead — no new services to deploy
4. Revocable, expiring tokens with auditable identity
5. Consistent auth mechanism across all 4 services (shared library)

## Non-Goals

- Full OAuth 2.1 / OIDC implementation (future consideration for MCP spec compliance)
- Role-based access control (RBAC) — all authenticated users get full access in v1
- Self-service token provisioning — tokens are admin-issued in v1
- Session management or refresh tokens for the Editor (cookie expiry handles this)

---

## Solution: Signed JWTs with Admin-Issued Tokens

### Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                  Admin (CLI)                         │
│  scripts/issue-token.mjs                             │
│  → Signs JWT with MCP_JWT_SECRET                     │
│  → Outputs token string for user                     │
└──────────┬───────────────────────────────────────────┘
           │ distributes token
           ▼
┌──────────────────────┐     ┌──────────────────────────┐
│  MCP Client          │     │  Browser                 │
│  (Claude, Cursor,    │     │  (Design Tokens Editor)  │
│   VS Code, n8n)      │     │                          │
│                      │     │  POST /api/auth/login    │
│  Authorization:      │     │  { token: "eyJ..." }     │
│  Bearer eyJ...       │     │  → httpOnly cookie       │
└──────────┬───────────┘     └───────────┬──────────────┘
           │                             │
           ▼                             ▼
┌──────────────────────────────────────────────────────┐
│              Shared Auth Middleware                   │
│  packages/shared-auth/                               │
│  verifyJwt(req) → { sub, role, iat, exp }            │
│  MCP servers: reads Authorization header             │
│  Editor: reads httpOnly cookie OR Authorization      │
└──────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│  Service (Storyblok MCP / DT MCP / CB MCP / Editor)  │
│  → Authenticated request proceeds                    │
│  → User identity available for logging               │
└──────────────────────────────────────────────────────┘
```

### JWT Token Structure

```json
{
  "sub": "jonas",
  "role": "admin",
  "jti": "a1b2c3d4",
  "iat": 1710000000,
  "exp": 1717776000
}
```

| Claim  | Type   | Description                                                      |
| ------ | ------ | ---------------------------------------------------------------- |
| `sub`  | string | User identifier (name, email, or client ID)                      |
| `role` | string | `"admin"` or `"reader"` (v1: informational only, no enforcement) |
| `jti`  | string | Unique token ID (8-char random hex, for revocation)              |
| `iat`  | number | Issued-at timestamp                                              |
| `exp`  | number | Expiration timestamp                                             |

**Signing:** HMAC-SHA256 (`HS256`) with a shared secret (`MCP_JWT_SECRET`). All services use the same secret so one token works everywhere.

**Default expiry:** 90 days (configurable at issuance via `--expires` flag).

---

## Detailed Design

### 1. Shared Auth Package

Create a lightweight internal package that all 4 services import:

```
packages/shared-auth/
  package.json          — name: "@kickstartds/shared-auth", deps: jsonwebtoken
  src/
    index.ts            — exports verify, middleware, types
    verify.ts           — JWT verification logic
    revocation.ts       — Blocklist check (env-based)
    types.ts            — AuthUser interface, AuthenticatedRequest type
```

#### `verify.ts` — Core Verification

```ts
import jwt from "jsonwebtoken";
import { isRevoked } from "./revocation.js";

export interface AuthUser {
  sub: string;
  role: string;
  jti: string;
  iat: number;
  exp: number;
}

export function verifyToken(token: string): AuthUser | null {
  const secret = process.env.MCP_JWT_SECRET;
  if (!secret) return null; // Auth disabled if no secret configured

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
```

#### `revocation.ts` — Blocklist

```ts
import type { AuthUser } from "./verify.js";

/**
 * Check a comma-separated blocklist in MCP_REVOKED_TOKENS.
 * Format: "jti:abc123,sub:old-client,jti:def456"
 */
export function isRevoked(user: AuthUser): boolean {
  const raw = process.env.MCP_REVOKED_TOKENS || "";
  if (!raw) return false;

  const entries = raw.split(",").map((e) => e.trim());
  for (const entry of entries) {
    const [key, value] = entry.split(":");
    if (key === "jti" && value === user.jti) return true;
    if (key === "sub" && value === user.sub) return true;
  }
  return false;
}
```

#### Graceful Degradation

When `MCP_JWT_SECRET` is **not set**, auth is disabled — requests pass through unauthenticated. This preserves backward compatibility for local/stdio usage and development environments. A console warning is emitted on startup:

```
⚠ MCP_JWT_SECRET not set — authentication disabled. All requests are unauthenticated.
```

---

### 2. MCP Server Integration (All 3 Servers)

All three MCP servers share the identical HTTP server pattern (`createServer` → parse request → create MCP transport). Auth is injected as an early guard before the MCP transport is created.

#### Insertion Point

In each server's `index.ts`, immediately after the health check and CORS handling, before body parsing:

```ts
import { verifyToken, extractBearerToken } from "@kickstartds/shared-auth";

// ... existing health check, CORS, OPTIONS handling ...

// ── Auth guard ──────────────────────────────────────
const JWT_SECRET = process.env.MCP_JWT_SECRET;
if (JWT_SECRET) {
  const token = extractBearerToken(req);
  const user = token ? verifyToken(token) : null;
  if (!user) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32001, message: "Unauthorized" },
        id: null,
      }),
    );
    return;
  }
  console.error(`Authenticated: ${user.sub} (role: ${user.role})`);
}
// ── End auth guard ──────────────────────────────────

// ... existing body parsing, MCP server creation ...
```

#### Helper: Extract Bearer Token

```ts
export function extractBearerToken(req: IncomingMessage): string | null {
  const header = req.headers["authorization"];
  if (!header || !header.startsWith("Bearer ")) return null;
  return header.slice(7);
}
```

#### CORS Update

Add `Authorization` to the `Access-Control-Allow-Headers` list (currently missing from all 3 servers):

```ts
res.setHeader(
  "Access-Control-Allow-Headers",
  "Content-Type, Authorization, mcp-session-id, Last-Event-ID, mcp-protocol-version",
);
```

#### Health Endpoint

The `/health` endpoint remains **unauthenticated** — it must be accessible to Kamal/Traefik health probes without a token.

---

### 3. Design Tokens Editor Integration

The editor is a browser SPA — users cannot pass Bearer tokens via the browser's address bar. The editor uses a **login page + httpOnly cookie** flow.

#### 3a. Login Flow

```
User visits editor → sees login page → enters JWT token → POST /api/auth/login
  → server verifies JWT → sets httpOnly cookie "auth_token" → redirects to editor
```

The user pastes the JWT token they received from the admin. There is no username/password — the JWT itself is the credential.

#### 3b. New Express Routes

```ts
// POST /api/auth/login — Exchange JWT for a session cookie
router.post("/api/auth/login", (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: "Token required" });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  // Set httpOnly cookie with same expiry as the JWT
  const maxAge = (user.exp - Math.floor(Date.now() / 1000)) * 1000;
  res.cookie("auth_token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: Math.max(0, maxAge),
  });

  res.json({ user: user.sub, role: user.role });
});

// POST /api/auth/logout — Clear session cookie
router.post("/api/auth/logout", (_req, res) => {
  res.clearCookie("auth_token");
  res.json({ ok: true });
});

// GET /api/auth/me — Check current session
router.get("/api/auth/me", (req, res) => {
  const token = req.cookies?.auth_token;
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const user = verifyToken(token);
  if (!user) {
    res.clearCookie("auth_token");
    return res.status(401).json({ error: "Token expired or revoked" });
  }
  res.json({ user: user.sub, role: user.role });
});
```

#### 3c. Auth Middleware for API Routes

```ts
import cookieParser from "cookie-parser";

app.use(cookieParser());

function requireAuth(req, res, next) {
  const JWT_SECRET = process.env.MCP_JWT_SECRET;
  if (!JWT_SECRET) return next(); // Auth disabled

  // Accept cookie or Authorization header
  const token = req.cookies?.auth_token || extractBearerToken(req);
  const user = token ? verifyToken(token) : null;

  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  req.user = user;
  next();
}

// Apply to all /api/tokens/* routes
router.use("/api/tokens", requireAuth);
```

#### 3d. Frontend Login Page

A minimal login page rendered by the SPA when `/api/auth/me` returns 401. The page contains:

- A text input for pasting the JWT token
- A "Login" button
- Error/success feedback
- No username/password field — the JWT is the sole credential

When authenticated, the SPA proceeds to load normally. The existing Vite SPA fallback (`app.get("*", ...)`) continues to serve the app for all routes.

---

### 4. Token Issuance CLI Script

```
scripts/issue-token.mjs
```

A standalone script that generates a signed JWT. Run by an admin, outputs the token to stdout.

#### Usage

```bash
# Issue a 90-day admin token
node scripts/issue-token.mjs --user jonas --role admin

# Issue a 30-day read-only token for an external client
node scripts/issue-token.mjs --user "client-acme" --role reader --expires 30d

# Issue a token that never expires (not recommended)
node scripts/issue-token.mjs --user bot --role admin --expires none
```

#### Output

```
╔══════════════════════════════════════════════╗
║  JWT Token Issued                            ║
╠══════════════════════════════════════════════╣
║  User:    jonas                              ║
║  Role:    admin                              ║
║  Token ID: a1b2c3d4                          ║
║  Expires:  2026-06-12 (90 days)              ║
╚══════════════════════════════════════════════╝

Token:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

MCP Client Config:
{
  "headers": {
    "Authorization": "Bearer eyJhbG..."
  }
}
```

#### Environment

The script reads `MCP_JWT_SECRET` from the environment or from a `.env` file in the monorepo root. If the secret doesn't exist, the script offers to generate one:

```
MCP_JWT_SECRET not found. Generate one? [Y/n]
Generated: export MCP_JWT_SECRET="<random 64-char hex>"
Add this to your .env and Kamal secrets.
```

---

### 5. Token Revocation

#### Mechanism

Environment variable `MCP_REVOKED_TOKENS` contains a comma-separated list of revocation entries:

```
MCP_REVOKED_TOKENS=jti:a1b2c3d4,sub:old-client
```

- `jti:<id>` — revoke a specific token by its unique ID
- `sub:<user>` — revoke all tokens for a user

#### Operational Flow

1. Admin identifies the token to revoke (from issuance records or logs)
2. Add entry to `MCP_REVOKED_TOKENS` in Kamal secrets
3. Re-deploy affected services (`kamal env push` or `kamal deploy`)
4. Token is rejected on next request

#### Limitations

- Requires a re-deploy (or `kamal env push`) to take effect
- No persistent store — blocklist lives in env vars
- For v2, consider a Redis/SQLite blocklist for instant revocation without redeploy

---

### 6. Environment Variables

#### New Variables (All Services)

| Variable             | Required | Description                                                              |
| -------------------- | -------- | ------------------------------------------------------------------------ |
| `MCP_JWT_SECRET`     | No\*     | HMAC-SHA256 signing secret (min 32 chars). When unset, auth is disabled. |
| `MCP_REVOKED_TOKENS` | No       | Comma-separated revocation list (`jti:xxx,sub:yyy`)                      |

\*Required in production for auth to be active. Unset = unauthenticated access (backward-compatible).

#### Kamal Secret Updates

Add to each deploy config's `secret:` list:

```yaml
# All 4 services
env:
  secret:
    - MCP_JWT_SECRET
    - MCP_REVOKED_TOKENS
    # ... existing secrets
```

---

## Implementation Plan

### Phase 1: Shared Auth Package + MCP Servers

| Step | Task                                                                  | Effort |
| ---- | --------------------------------------------------------------------- | ------ |
| 1.1  | Create `packages/shared-auth/` package with verify, revocation, types | S      |
| 1.2  | Add `scripts/issue-token.mjs` CLI script                              | S      |
| 1.3  | Integrate auth guard into Storyblok MCP `index.ts`                    | S      |
| 1.4  | Integrate auth guard into Design Tokens MCP `index.ts`                | S      |
| 1.5  | Integrate auth guard into Component Builder MCP `index.ts`            | S      |
| 1.6  | Add `Authorization` to CORS `Access-Control-Allow-Headers` (all 3)    | XS     |
| 1.7  | Update Kamal deploy configs with `MCP_JWT_SECRET` secret              | XS     |
| 1.8  | Update Dockerfiles to include `shared-auth` workspace dependency      | S      |
| 1.9  | Test: issue token, verify accepted/rejected on each MCP server        | M      |

### Phase 2: Design Tokens Editor

| Step | Task                                                                        | Effort |
| ---- | --------------------------------------------------------------------------- | ------ |
| 2.1  | Add `cookie-parser` dependency to editor                                    | XS     |
| 2.2  | Add `/api/auth/login`, `/api/auth/logout`, `/api/auth/me` routes            | S      |
| 2.3  | Add auth middleware to `/api/tokens/*` routes                               | S      |
| 2.4  | Create minimal login page component in the SPA                              | M      |
| 2.5  | Add auth state management (check `/api/auth/me` on load, redirect to login) | S      |
| 2.6  | Update Kamal deploy config with `MCP_JWT_SECRET` secret                     | XS     |
| 2.7  | Test: login flow, cookie expiry, API rejection without cookie               | M      |

### Phase 3: Documentation & Ops

| Step | Task                                                            | Effort |
| ---- | --------------------------------------------------------------- | ------ |
| 3.1  | Document token issuance workflow in README                      | S      |
| 3.2  | Document revocation procedure                                   | XS     |
| 3.3  | Add startup warning when `MCP_JWT_SECRET` is unset in HTTP mode | XS     |
| 3.4  | Update `copilot-instructions.md` with auth section              | XS     |

**Total estimated effort:** ~2–3 days of implementation.

---

## Security Considerations

| Concern                  | Mitigation                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| Secret leakage           | `MCP_JWT_SECRET` stored as Kamal secret (not in repo), never logged                         |
| Token theft              | Tokens expire (default 90d), revocable via `MCP_REVOKED_TOKENS`                             |
| Token in browser         | httpOnly + Secure + SameSite=Strict cookie — not accessible to JS                           |
| Brute-force signing      | HS256 with 64-char hex secret (256 bits of entropy)                                         |
| Replay attacks           | Stateless by design; revocation list handles compromised tokens                             |
| CORS                     | `Authorization` header added to allowed headers; origin remains `*` (MCP clients need this) |
| Health endpoint exposure | Deliberately unauthenticated — no sensitive data returned                                   |
| Local/stdio mode         | Auth disabled when `MCP_JWT_SECRET` unset — no impact on local dev                          |

---

## Future Considerations (v2+)

- **RBAC enforcement:** Use `role` claim to restrict write operations (e.g., `reader` can only use read tools)
- **MCP OAuth 2.1 spec compliance:** Add `/.well-known/oauth-authorization-server` metadata endpoint when MCP clients mature
- **Instant revocation:** Redis or SQLite blocklist, checked without redeployment
- **Audit logging:** Log `sub`, `jti`, tool name, and timestamp for every authenticated request
- **Token refresh:** Short-lived access tokens + long-lived refresh tokens (reduces exposure window)
- **Editor SSO upgrade:** Replace token-paste login with OAuth2 Proxy (GitHub/Google) for better UX when the team grows

---

## Decisions (Resolved)

1. **Shared `MCP_JWT_SECRET` across all services.** One token works everywhere — simpler for users. Accepted trade-off: broader blast radius if the secret leaks.

2. **Component Builder MCP requires auth.** Even though it's read-only, auth prevents abuse/scraping and keeps the security posture consistent across all services.

3. **No token registry in v1.** Tokens are fire-and-forget — admin copies the output and distributes manually. A registry may be added in v2 for revocation audits.

4. **Token paste login for the Editor.** Users paste the JWT they received from the admin. No username/password layer. Simpler implementation, acceptable UX for the current user base.
