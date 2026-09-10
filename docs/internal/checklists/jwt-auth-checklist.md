# JWT Auth Implementation Checklist

Tracks progress for implementing JWT authentication across all hosted services.
See [jwt-auth-prd.md](../prd/jwt-auth-prd.md) for the full PRD and [adr-jwt-auth.md](../../adr/adr-jwt-auth.md) for architectural decisions.

---

## Phase 1: Shared Auth Package + MCP Servers

- [x] 1.1 Create `packages/shared-auth/` package (package.json, tsconfig, src/)
- [x] 1.2 Implement `verify.ts` — JWT verification with HS256
- [x] 1.3 Implement `revocation.ts` — env-based blocklist check
- [x] 1.4 Implement `types.ts` — AuthUser interface, helpers
- [x] 1.5 Implement `index.ts` — barrel exports
- [x] 1.6 Create `scripts/issue-token.mjs` CLI script
- [x] 1.7 Add `@kickstartds/shared-auth` dependency to Storyblok MCP
- [x] 1.8 Integrate auth guard into Storyblok MCP `index.ts`
- [x] 1.9 Add `@kickstartds/shared-auth` dependency to Design Tokens MCP
- [x] 1.10 Integrate auth guard into Design Tokens MCP `index.ts`
- [x] 1.11 Add `@kickstartds/shared-auth` dependency to Component Builder MCP
- [x] 1.12 Integrate auth guard into Component Builder MCP `index.ts`
- [x] 1.13 Add `Authorization` to CORS `Access-Control-Allow-Headers` (all 3 MCP servers)
- [x] 1.14 Add startup warning when `MCP_JWT_SECRET` is unset in HTTP mode (all 3)
- [x] 1.15 Update Storyblok MCP Dockerfile to include `shared-auth`
- [x] 1.16 Update Design Tokens MCP Dockerfile to include `shared-auth`
- [x] 1.17 Update Component Builder MCP Dockerfile to include `shared-auth`
- [x] 1.18 Update Kamal deploy configs with `MCP_JWT_SECRET` secret (all 4 services)

## Phase 2: Design Tokens Editor

- [x] 2.1 Add `@kickstartds/shared-auth` and `cookie-parser` dependencies to editor
- [x] 2.2 Add auth routes (`/api/auth/login`, `/api/auth/logout`, `/api/auth/me`)
- [x] 2.3 Add auth middleware to `/api/tokens/*` routes
- [x] 2.4 Update editor Express server to use `cookie-parser`
- [x] 2.5 Update editor Dockerfile to include `shared-auth`
- [x] 2.6 Create login page component in the SPA
- [x] 2.7 Add auth state management to `main.tsx` (check `/api/auth/me`, gate app)

## Phase 3: Documentation & Ops

- [x] 3.1 Update `copilot-instructions.md` with auth section
