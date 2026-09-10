# @kickstartds/shared-auth

Shared JWT authentication library for all hosted kickstartDS services (3 MCP servers + Design Tokens Editor).

Provides HS256 (HMAC-SHA256) token verification, Bearer header extraction, and environment-based token revocation.

## Usage

```ts
import {
  verifyToken,
  extractBearerToken,
  isAuthEnabled,
} from "@kickstartds/shared-auth";

// Check if auth is enabled (MCP_JWT_SECRET is set)
if (isAuthEnabled()) {
  const token = extractBearerToken(req);
  const user = token ? verifyToken(token) : null;
  // user is { sub, role, jti, iat, exp } or null
}
```

## Environment Variables

| Variable             | Description                                         |
| -------------------- | --------------------------------------------------- |
| `MCP_JWT_SECRET`     | HMAC-SHA256 signing secret (disables auth if unset) |
| `MCP_REVOKED_TOKENS` | Comma-separated blocklist: `jti:<id>,sub:<user>`    |

## Issuing & Revoking Tokens

See [docs/guides/authentication.md](../../docs/guides/authentication.md) for the full operator guide — generating secrets, issuing tokens, configuring clients, and revoking access.

## License

MIT OR Apache-2.0
