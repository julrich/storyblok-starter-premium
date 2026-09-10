# ADR: SharePoint Folder Picker Field Plugin

**Status:** Accepted
**Date:** 2026-03-19
**Context:** Need to let Storyblok editors associate stories with SharePoint folders for content retrieval at render time.

## Decision

### 1. Authentication: Server-Side Token Proxy

**Decision:** Use a Next.js API route (`/api/sharepoint/token`) as a proxy for Microsoft Entra ID (formerly Azure AD) client credentials flow rather than embedding OAuth in the field plugin.

**Rationale:**

- Storyblok field plugins run inside an iframe sandbox — no ability to perform browser-based OAuth redirects
- Entra ID client secrets must never reach the browser
- The proxy can validate the caller via the Storyblok preview token (`plugin.data.token`), ensuring only authenticated Storyblok editors can obtain Graph tokens
- Matches the existing pattern of server-side API routes in the website package (e.g., `/api/prompter/*`)

**Alternatives considered:**

- _MSAL.js in the browser:_ Would require interactive login per editor session and complex token caching. Storyblok's iframe CSP may block popups.
- _Pre-shared static token:_ Insecure and expires; not viable for production.

### 2. Stored Value: `driveId` + `folderId` (JSON)

**Decision:** Persist a JSON string containing `driveId`, `folderId`, `folderName`, `folderPath`, `siteId`, and `webUrl`.

**Rationale:**

- `folderId` (Microsoft Graph `driveItem` ID) is the only identifier that survives folder renames and moves within the same drive
- `driveId` is needed to scope API calls to the correct document library
- `folderName` and `folderPath` are stored for display purposes but treated as potentially stale
- `webUrl` enables the "Open in SharePoint" feature without an extra API call
- `siteId` maintains context for multi-site future flexibility

**Alternatives considered:**

- _SharePoint URL only:_ Breaks on folder rename, requires URL parsing to extract Graph-compatible IDs.
- _Folder path only (e.g. `/Documents/Products/Projectors`):_ Breaks on rename; path-based resolution is slower than ID-based.
- _`folderId` only:_ Requires additional metadata calls to reconstruct the display path every time the field is opened.

### 3. Permission Scoping: `Sites.Selected`

**Decision:** Use `Sites.Selected` application permission instead of `Sites.Read.All`.

**Rationale:**

- The SharePoint site is static per deployment (fixed via plugin options) — there is no need for tenant-wide read access
- `Sites.Selected` is the tightest available scope; admin explicitly grants the app access to the specific site
- Reduces blast radius if the app registration is compromised
- Requires one-time admin setup via PowerShell or Graph API to grant access to the target site

**Trade-off:** Slightly more complex initial setup (admin must run a PowerShell command), but significantly better security posture.

### 4. Folder Validation on Load

**Decision:** Validate the stored `folderId` each time the field plugin opens by making a `GET /drives/{driveId}/items/{folderId}` call.

**Rationale:**

- Folders can be deleted or moved to a different drive between editor sessions
- A stale reference would cause silent failures at render time
- The validation call is lightweight (single item metadata, not a folder listing)
- On 404, show a clear warning; don't auto-clear the value (editor may want to investigate)

**Trade-off:** One extra Graph API call per field-open. Acceptable given Graph's low latency and the importance of data integrity.

### 5. Search Scope: Current Level Only

**Decision:** Search/filter operates on the currently-displayed folder list only (client-side filtering of already-fetched results).

**Rationale:**

- Keeps the UX simple and predictable — search filters what you can see
- Avoids the complexity of recursive server-side search, which returns both files and folders and requires additional filtering
- Graph's `/search` endpoint has different permission requirements and rate limits
- Consistent with the theme select plugin's client-side filtering pattern

### 6. Architecture: Mirror Theme Select Plugin

**Decision:** Follow the exact same package structure, build pipeline, and deployment process as `storyblok-theme-select-field-plugin`.

**Rationale:**

- Proven pattern that works with Storyblok's field plugin infrastructure
- Shared tooling reduces maintenance overhead (same Vite config, same deploy command)
- Team familiarity — anyone who understands one plugin can work on the other
- Inline styles (no external CSS) ensures the plugin renders correctly in Storyblok's iframe sandbox

### 7. Dev Server Port: 8082

**Decision:** Use port 8082 for the dev server (vs 8080 for theme-select, 8081 for icon-sprite-picker).

**Rationale:** Avoid port conflicts when running multiple field plugins locally during development.

## Consequences

- Microsoft Entra ID (formerly Azure AD) app registration with `Sites.Selected` is a prerequisite before the plugin is functional
- The Next.js website requires four new environment variables (`AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `SHAREPOINT_SITE_HOSTNAME`)
- The token proxy adds one new API route to the website package
- Folder renames in SharePoint will cause `folderName`/`folderPath` display to go stale, but functional access via `folderId` is preserved
- If the entire drive is deleted or the site is reconfigured, stored values become invalid (detected by validation on load)
