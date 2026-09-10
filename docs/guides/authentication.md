# Authentication Guide

All hosted services — 3 MCP servers and the Design Tokens Editor — support **JWT-based authentication** using a shared HMAC-SHA256 secret. Auth is optional: when the secret is not configured, all endpoints are open (suitable for local development).

## Overview

| Service               | Auth method           | Required header / UX                        |
| --------------------- | --------------------- | ------------------------------------------- |
| Storyblok MCP         | Bearer token or OAuth | `Authorization: Bearer <jwt>` or OAuth flow |
| Design Tokens MCP     | Bearer token or OAuth | `Authorization: Bearer <jwt>` or OAuth flow |
| Component Builder MCP | Bearer token or OAuth | `Authorization: Bearer <jwt>` or OAuth flow |
| Design Tokens Editor  | Token-paste login     | Paste JWT into login form                   |

All services share the same `MCP_JWT_SECRET`, so a single JWT works everywhere.

---

## Initial Setup

### 1. Generate a signing secret

```bash
node scripts/issue-token.mjs --generate-secret
```

This outputs a random 256-bit hex string:

```
Generated MCP_JWT_SECRET:

  export MCP_JWT_SECRET="a1b2c3d4..."

Add this to your .env file and Kamal secrets.
```

Store this secret securely — anyone with the secret can forge tokens.

### 2. Configure services

Add `MCP_JWT_SECRET` to each service's environment:

**Local development** — add to `.env` in the repo root (or each package's `.env`):

```env
MCP_JWT_SECRET="your-secret-here"
```

**Production (Kamal)** — push the secret to all deployed services:

```bash
# Add MCP_JWT_SECRET to .kamal/secrets, then:
kamal env push -d storyblok-mcp
kamal env push -d design-tokens-mcp
kamal env push -d component-builder-mcp
kamal env push -d design-tokens-editor
```

All four Kamal deploy configs already declare `MCP_JWT_SECRET` in their `env.secret` block.

### 3. Verify auth is active

When a service starts with `MCP_JWT_SECRET` set, it logs nothing special. When the secret is **missing** in HTTP mode, you'll see:

```
⚠️  WARNING: MCP_JWT_SECRET is not set — HTTP endpoints are unauthenticated
```

---

## Issuing Tokens

Use the CLI script to issue tokens for users or automated clients:

```bash
# Basic: admin user with 90-day expiry (default)
MCP_JWT_SECRET="your-secret" node scripts/issue-token.mjs --user alice --role admin

# Custom expiry
node scripts/issue-token.mjs --user "ci-bot" --role admin --expires 1y

# Reader role (future use — currently no role-based restrictions)
node scripts/issue-token.mjs --user reviewer --role reader --expires 30d

# Non-expiring token (use with caution)
node scripts/issue-token.mjs --user service-account --expires none
```

The script reads `MCP_JWT_SECRET` from the environment or a `.env` file at the repo root.

### CLI Options

| Flag                | Description                                      | Default  |
| ------------------- | ------------------------------------------------ | -------- |
| `--user <name>`     | User identifier (embedded as JWT `sub` claim)    | Required |
| `--role <role>`     | User role: `admin` or `reader`                   | `admin`  |
| `--expires <dur>`   | Token lifetime: `90d`, `30d`, `7d`, `1y`, `none` | `90d`    |
| `--generate-secret` | Generate a new `MCP_JWT_SECRET` and exit         | —        |

### Output

The script prints the token, its metadata, and a ready-to-paste MCP client config snippet:

```
╔══════════════════════════════════════════════════╗
║  JWT Token Issued                                ║
╠══════════════════════════════════════════════════╣
║  User:     alice                                 ║
║  Role:     admin                                 ║
║  Token ID: 3f8a1b2c                              ║
║  Expires:  2026-06-13 (90 days)                  ║
╚══════════════════════════════════════════════════╝

Token:
eyJhbGciOiJIUzI1NiIs...

MCP Client Config (add to Claude Desktop, VS Code, etc.):
{
  "headers": {
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIs..."
  }
}
```

Save the **Token ID** (`jti`) — you'll need it if you ever want to revoke this specific token.

---

## Configuring Clients

### MCP clients (Claude Desktop, VS Code, Cursor, etc.)

Add the `Authorization` header to your MCP client configuration. Example for Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "storyblok": {
      "url": "https://mcp.your-domain.com/mcp",
      "requestInit": {
        "headers": {
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIs..."
        }
      }
    }
  }
}
```

For VS Code (`.vscode/mcp.json`):

```json
{
  "servers": {
    "storyblok-mcp": {
      "type": "http",
      "url": "https://mcp.your-domain.com/mcp",
      "headers": {
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIs..."
      }
    }
  }
}
```

### Design Tokens Editor

The editor uses a **token-paste login flow** — no client config needed:

1. Open the editor in a browser
2. Paste the JWT into the login form
3. The server verifies the token and sets an `httpOnly` session cookie
4. Cookie persists until the JWT expires or the user logs out

### curl / HTTP API

```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  https://mcp.your-domain.com/mcp \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

### OAuth clients (claude.ai)

Clients that require **OAuth 2.1** (e.g. claude.ai) are supported automatically. Every MCP server exposes a thin OAuth authorization layer alongside the `/mcp` endpoint — no external OAuth provider needed.

#### How it works

1. The client discovers OAuth metadata via `/.well-known/oauth-protected-resource` → `/.well-known/oauth-authorization-server-metadata`
2. If needed, the client registers dynamically via `POST /register` (RFC 7591)
3. The client redirects the user to `/authorize` with PKCE (`code_challenge`, `S256`)
4. The user sees a **token-paste form** — paste the same pre-issued JWT used for other clients
5. The server verifies the JWT, issues an authorization code, and redirects back
6. The client exchanges the code at `POST /token` for an access token (which _is_ the JWT)
7. The client sends `Authorization: Bearer <jwt>` on all subsequent MCP requests

No additional configuration is required — the OAuth endpoints are served automatically when the MCP server runs in HTTP mode.

#### Endpoints

| Endpoint                                           | Method | Purpose                                                           |
| -------------------------------------------------- | ------ | ----------------------------------------------------------------- |
| `/.well-known/oauth-protected-resource`            | GET    | Resource metadata (RFC 9728) — points to the authorization server |
| `/.well-known/oauth-authorization-server-metadata` | GET    | Authorization server metadata (RFC 8414)                          |
| `/authorize`                                       | GET    | Shows the token-paste authorization form                          |
| `/authorize`                                       | POST   | Validates the JWT, issues a code, redirects                       |
| `/token`                                           | POST   | Exchanges authorization code + PKCE verifier for access token     |
| `/register`                                        | POST   | Dynamic client registration (RFC 7591)                            |

#### No-auth mode

When `MCP_JWT_SECRET` is not set (local development), the OAuth flow still works but auto-approves without showing the form — claude.ai can connect to dev servers without tokens.

---

## Revoking Tokens

Tokens can be revoked immediately without changing the signing secret, using the `MCP_REVOKED_TOKENS` environment variable.

### Revoke by Token ID (recommended)

Add the token's `jti` to the blocklist:

```env
MCP_REVOKED_TOKENS="jti:3f8a1b2c"
```

### Revoke by user

Block all tokens for a specific user (by `sub` claim):

```env
MCP_REVOKED_TOKENS="sub:alice"
```

### Revoke multiple tokens

Comma-separate entries:

```env
MCP_REVOKED_TOKENS="jti:3f8a1b2c,sub:old-client,jti:deadbeef"
```

### Applying revocations

After updating `MCP_REVOKED_TOKENS`, redeploy the affected services:

```bash
kamal env push -d storyblok-mcp && kamal deploy -d storyblok-mcp
# ... repeat for other services
```

Or for a rolling restart without rebuild:

```bash
kamal app boot -d storyblok-mcp
```

### Emergency: rotate the secret

If the signing secret is compromised, generate a new one and push it to all services. This instantly invalidates **all** existing tokens:

```bash
node scripts/issue-token.mjs --generate-secret
# Update MCP_JWT_SECRET everywhere, then:
kamal env push -d storyblok-mcp
kamal env push -d design-tokens-mcp
kamal env push -d component-builder-mcp
kamal env push -d design-tokens-editor
kamal deploy -d storyblok-mcp
kamal deploy -d design-tokens-mcp
kamal deploy -d component-builder-mcp
kamal deploy -d design-tokens-editor
```

Then re-issue tokens for all legitimate users.

---

## JWT Claims

Each issued token contains these claims:

| Claim  | Description                        | Example                 |
| ------ | ---------------------------------- | ----------------------- |
| `sub`  | User identifier                    | `"alice"`               |
| `role` | User role                          | `"admin"` or `"reader"` |
| `jti`  | Unique token ID (for revocation)   | `"3f8a1b2c"`            |
| `iat`  | Issued-at timestamp (Unix seconds) | `1710504000`            |
| `exp`  | Expiry timestamp (Unix seconds)    | `1718280000`            |

Tokens are signed with **HS256** (HMAC-SHA256). There is no asymmetric key distribution — all services share the same symmetric secret.

---

## Graceful Degradation

When `MCP_JWT_SECRET` is **not** set:

- All MCP server endpoints are **open** (no authentication)
- The Design Tokens Editor shows the app without a login gate
- The `/api/auth/me` endpoint returns `{ user: "anonymous", role: "admin" }`

This makes local development frictionless — no tokens needed for `stdio` transport or local HTTP testing.

---

## Troubleshooting

| Symptom                                      | Cause                                         | Fix                                                 |
| -------------------------------------------- | --------------------------------------------- | --------------------------------------------------- |
| `401 Unauthorized` / JSON-RPC error `-32001` | Token expired, revoked, or wrong secret       | Issue a new token with the correct `MCP_JWT_SECRET` |
| Auth not enforced in production              | `MCP_JWT_SECRET` not set in service env       | Run `kamal env push` with the secret configured     |
| Login page not showing in editor             | `MCP_JWT_SECRET` not set                      | Set it in the editor's environment                  |
| "Token expired or revoked" on editor login   | JWT has expired or is in `MCP_REVOKED_TOKENS` | Issue a fresh token                                 |
| Token works on one service but not another   | Different `MCP_JWT_SECRET` values             | Ensure all services share the same secret           |

---

## Related Documents

- [JWT Auth PRD](../internal/prd/jwt-auth-prd.md) — Full product requirements
- [JWT Auth ADR](../adr/adr-jwt-auth.md) — Architectural decisions
- [JWT Auth Checklist](../internal/checklists/jwt-auth-checklist.md) — Implementation status
