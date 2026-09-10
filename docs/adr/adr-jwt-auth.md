# ADR: JWT Authentication for Hosted Services

**Date:** 2026-03-14
**Status:** Accepted
**Deciders:** Jonas Ulrich
**Related:** [jwt-auth-prd.md](../internal/prd/jwt-auth-prd.md), [jwt-auth-checklist.md](../internal/checklists/jwt-auth-checklist.md)

---

## Context

Four hosted services (Storyblok MCP, Design Tokens MCP, Component Builder MCP, Design Tokens Editor) are deployed via Kamal + Traefik with auto-TLS but have no HTTP-level authentication. Users include internal team members and external clients without GitHub accounts.

## Decision 1: Signed JWTs over alternative auth approaches

**Options considered:**

1. **Single shared Bearer token** — one static token per service, passed via `Authorization` header
2. **Signed JWTs with admin issuance** — per-user tokens signed with HMAC-SHA256
3. **GitHub PAT validation** — validate GitHub personal access tokens against GitHub API
4. **OAuth2 Proxy / Cloudflare Access** — deploy an identity-aware reverse proxy
5. **MCP OAuth 2.1 spec** — implement the MCP spec's native OAuth 2.1 authorization framework

**Chosen: Option 2 — Signed JWTs**

**Rationale:**

- Per-user identity without requiring external accounts (rules out option 3 for external users)
- No additional infrastructure to deploy (rules out option 4)
- MCP OAuth 2.1 client support is still immature (rules out option 5 for now)
- Single shared token provides no per-user identity or selective revocation (rules out option 1)
- JWTs are stateless to verify, carry expiration, and include user identity — the right balance of simplicity and capability

**Trade-offs accepted:**

- Admin must manually issue tokens (no self-service in v1)
- Revocation requires env var update + redeploy (acceptable for current team size)
- JWTs can't be invalidated instantly without a blocklist check

## Decision 2: Shared secret across all services

**Options considered:**

1. **Per-service `MCP_JWT_SECRET`** — each service has its own signing secret, tokens are service-scoped
2. **Shared `MCP_JWT_SECRET`** — one secret used by all 4 services, tokens work everywhere

**Chosen: Option 2 — Shared secret**

**Rationale:**

- Users typically need access to multiple services (MCP + Editor), so one token working everywhere reduces friction
- The services share the same Kamal deployment host, and Storyblok credentials already overlap
- Operational simplicity: one secret to rotate, one token to issue per user

**Trade-offs accepted:**

- Broader blast radius if the secret leaks — all services are compromised at once
- No service-level scoping of tokens (a token for "read-only MCP" also works on the Editor)

## Decision 3: Graceful degradation when secret is unset

**Decision:** When `MCP_JWT_SECRET` environment variable is not set, authentication is disabled entirely. Requests pass through unauthenticated. A console warning is emitted on startup.

**Rationale:**

- Local development via stdio transport never needs auth
- Developers can run services in HTTP mode locally without configuring secrets
- Backward-compatible — existing deployments continue working until auth is explicitly enabled
- Forces a conscious opt-in: admins must set the secret to activate auth

## Decision 4: Env-based revocation blocklist

**Options considered:**

1. **Redis/SQLite blocklist** — persistent store checked per request
2. **Environment variable blocklist** — `MCP_REVOKED_TOKENS` comma-separated list
3. **Short-lived tokens + refresh** — tokens expire quickly, reducing revocation need

**Chosen: Option 2 — Env-based blocklist**

**Rationale:**

- No additional infrastructure (no Redis/SQLite to deploy and maintain)
- Kamal supports `kamal env push` to update env vars without full redeploy
- Current team size (< 10 users) makes blocklist size manageable
- Token expiry (default 90 days) naturally limits the revocation window

**Trade-offs accepted:**

- Revocation is not instant — requires env var push and potentially container restart
- Blocklist is ephemeral — not persisted across secret rotations (acceptable: old tokens become invalid on rotation anyway)

## Decision 5: Token-paste login for Editor (no username/password)

**Options considered:**

1. **Username/password login** — admin maintains a user database (hashed passwords in env var), login form issues a JWT cookie
2. **Token-paste login** — user pastes the JWT they received from admin, server validates and sets a cookie
3. **OAuth2 Proxy (GitHub/Google SSO)** — external reverse proxy handles authentication

**Chosen: Option 2 — Token-paste login**

**Rationale:**

- No user database to maintain
- Same token that works for MCP clients also works for the browser Editor — one credential per user
- Simplest implementation: verify JWT → set httpOnly cookie → done
- External users (no GitHub) can use the same flow

**Trade-offs accepted:**

- Unusual UX (users paste a long JWT string instead of typing username/password)
- Token is visible in plaintext during paste (acceptable: it's already shared out-of-band)
- No "forgot password" flow (admin re-issues token)

## Decision 6: Component Builder MCP requires auth

**Decision:** Despite being read-only with no external API dependencies, the Component Builder MCP requires authentication when `MCP_JWT_SECRET` is set.

**Rationale:**

- Consistent security posture across all services — no exceptions to reason about
- Prevents uncontrolled scraping of proprietary component-building templates
- Trivial to implement since the auth guard is shared code
- The graceful degradation (no auth when secret is unset) means no friction for public/open scenarios

## Decision 7: Shared auth as a workspace package

**Options considered:**

1. **Copy-paste the verification code** into each service
2. **Shared npm package** (`packages/shared-auth/`) in the pnpm workspace
3. **Traefik middleware only** — handle auth at the reverse proxy level

**Chosen: Option 2 — Shared workspace package**

**Rationale:**

- DRY — one implementation of verification, revocation, and token extraction
- Type-safe — shared `AuthUser` interface across all services
- Testable — unit tests in one place cover all services
- Workspace package is natural for this monorepo (same pattern as `storyblok-services`)

**Trade-offs accepted:**

- Dockerfile changes required — each Docker build must include `packages/shared-auth/` sources
- Build dependency — services depend on building `shared-auth` first (minor, handled by pnpm workspace topology)

## Decision 8: httpOnly secure cookies for Editor sessions

**Decision:** The Design Tokens Editor uses httpOnly + Secure + SameSite=Strict cookies to store the JWT after the token-paste login.

**Rationale:**

- httpOnly prevents JavaScript access — mitigates XSS attacks
- Secure flag ensures cookies are only sent over HTTPS
- SameSite=Strict prevents CSRF — cookie is never sent on cross-origin requests
- Cookie expiry matches the JWT expiry — no separate session management needed

## Consequences

- All services gain per-user identity logging capability
- Token issuance is a manual admin task (acceptable for current scale)
- Deploying auth requires setting `MCP_JWT_SECRET` in Kamal secrets for all 4 services
- Future RBAC can be layered on top of the `role` claim without changing the auth mechanism
- Migration to MCP OAuth 2.1 can be done incrementally per-service without disrupting the JWT approach
