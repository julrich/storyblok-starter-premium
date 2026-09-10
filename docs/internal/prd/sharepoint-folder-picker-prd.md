# PRD: Storyblok SharePoint Folder Picker Field Plugin

**Status:** Draft
**Created:** 2026-03-19
**Package:** `packages/storyblok-sharepoint-folder-picker-field-plugin/`

---

## 1. Problem Statement

Content editors need to associate Storyblok pages/stories with Microsoft SharePoint folders so that the Next.js website can pull supplementary content (documents, images, files) from SharePoint at render time. Today there is no way to reference a SharePoint folder from within the Storyblok CMS — editors would need to manually copy-paste folder IDs or URLs, which is error-prone and provides no browsing or validation.

## 2. Goal

Build a **Storyblok field plugin** that lets editors browse a SharePoint site's folder hierarchy, drill into nested folders, and select a target folder. The plugin persists a stable identifier for the selected folder so the Next.js website can fetch folder contents via the Microsoft Graph API at build/render time.

## 3. Scope

### In Scope

- Interactive folder tree browser inside the Storyblok field editor
- Drill-in navigation (click a folder to see its children)
- Breadcrumb trail for current path with clickable ancestors
- Search/filter within the current folder listing
- Selection confirmation with folder name + path display
- Clear/deselect action
- Persisting a serialized JSON value (see §6) to the Storyblok field
- Loading, empty, and error states
- Configurable SharePoint site and document library via plugin options
- Authentication via Microsoft Graph delegated token (see §7)

### Out of Scope

- Rendering SharePoint folder contents on the Next.js website (separate implementation)
- File-level selection (this plugin selects **folders** only)
- Creating, renaming, or deleting SharePoint folders
- Multi-folder selection (single folder per field instance)
- Offline/cached browsing

## 4. Reference Implementation

This plugin mirrors the architecture and conventions of `packages/storyblok-theme-select-field-plugin/`:

| Aspect        | Theme Select (reference)                    | SharePoint Folder Picker (this plugin)              |
| ------------- | ------------------------------------------- | --------------------------------------------------- |
| Framework     | React 19 + Vite + TypeScript                | Same                                                |
| Plugin API    | `@storyblok/field-plugin`                   | Same                                                |
| Entry point   | `src/main.tsx` → `App.tsx` → main component | Same                                                |
| Styling       | Inline `React.CSSProperties` object         | Same                                                |
| CSS bundling  | `vite-plugin-css-injected-by-js`            | Same                                                |
| Build output  | CommonJS via Vite (`dist/index.js`)         | Same                                                |
| Deployment    | `@storyblok/field-plugin-cli deploy`        | Same                                                |
| Dev server    | Vite on port 8080                           | Same (different port to avoid conflicts, e.g. 8082) |
| Value storage | `plugin.actions.setContent()`               | Same                                                |
| Data fetching | Client-side `fetch()`                       | Same (Microsoft Graph API)                          |

## 5. User Experience

### 5.1 Initial State (No Folder Selected)

```
┌─────────────────────────────────────────┐
│  SELECTED FOLDER                        │
│  ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐ │
│  │  No folder selected               │ │
│  └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘ │
│                                         │
│  BROWSE FOLDERS                         │
│  📁 Documents                           │
│  📁 Marketing                           │
│  📁 Products                            │
│  📁 Resources                           │
└─────────────────────────────────────────┘
```

### 5.2 Browsing (Drilled Into a Folder)

```
┌─────────────────────────────────────────┐
│  SELECTED FOLDER                        │
│  ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐ │
│  │  No folder selected                │ │
│  └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘ │
│                                         │
│  BROWSE FOLDERS                         │
│  Root > Documents > Products            │
│  ┌─────────────────────────────────┐    │
│  │ 🔍 Search folders...            │    │
│  ├─────────────────────────────────┤    │
│  │ 📁 Projectors         [Select] │    │
│  │ 📁 Displays           [Select] │    │
│  │ 📁 Accessories        [Select] │    │
│  │ 📁 Archived           [Select] │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

Each folder row is dual-action:

- **Click the folder name/icon** → drill into that folder (load children)
- **Click [Select]** → select that folder as the value

### 5.3 Folder Selected

```
┌─────────────────────────────────────────┐
│  SELECTED FOLDER                        │
│  ┌─────────────────────────────────────┐│
│  │ 📁 Projectors                 ↗  ✕ ││
│  │ Documents > Products > Projectors  ││
│  └─────────────────────────────────────┘│
│                                         │
│  BROWSE FOLDERS                         │
│  Root > Documents > Products            │
│  ...                                    │
└─────────────────────────────────────────┘
```

The selected folder card shows:

- Folder name (bold)
- Full path from root
- "Open in SharePoint" link (↗) — opens the folder's `webUrl` in a new tab
- Clear button (✕) to deselect

### 5.4 Interaction Flow

1. Plugin loads → authenticates with Microsoft Graph (see §7)
2. Root-level folders of the configured document library are displayed
3. Editor clicks a folder name → children load, breadcrumb updates
4. Editor clicks a breadcrumb segment → navigates back to that level
5. Editor clicks [Select] on a folder → value is persisted, selected card updates
6. Editor can continue browsing and re-select a different folder
7. Editor clicks ✕ → selection is cleared

## 6. Stored Value

The plugin persists a **JSON string** via `plugin.actions.setContent()`:

```json
{
  "driveId": "b!abc123...",
  "folderId": "01ABCDEF...",
  "folderName": "Projectors",
  "folderPath": "/Documents/Products/Projectors",
  "siteId": "contoso.sharepoint.com,guid1,guid2",
  "webUrl": "https://contoso.sharepoint.com/sites/MySite/Shared Documents/Products/Projectors"
}
```

| Field        | Type   | Purpose                                                                    |
| ------------ | ------ | -------------------------------------------------------------------------- |
| `driveId`    | string | Microsoft Graph drive ID (stable across renames)                           |
| `folderId`   | string | Microsoft Graph driveItem ID for the folder (stable across renames/moves)  |
| `folderName` | string | Human-readable folder name (for display, may go stale on rename)           |
| `folderPath` | string | Path within the document library at time of selection (for display)        |
| `siteId`     | string | SharePoint site ID (composite: `hostname,siteCollectionId,siteId`)         |
| `webUrl`     | string | Full SharePoint web URL (for editor reference / "Open in SharePoint" link) |

**Why `driveId` + `folderId`?** These are Microsoft Graph's stable identifiers. Folder renames or moves within the same drive preserve the `folderId`. The Next.js website will use `GET /drives/{driveId}/items/{folderId}/children` to enumerate folder contents.

## 7. Authentication

### 7.1 Strategy: Delegated Token via Server Proxy

The plugin cannot perform OAuth flows directly (it runs inside Storyblok's iframe sandbox). Instead:

1. A **server-side proxy** endpoint on the Next.js website (`/api/sharepoint/token`) handles the Microsoft token acquisition
2. The proxy uses a **Microsoft Entra ID app registration** (formerly Azure AD) with a client secret and the `Sites.Selected` application permission
3. The plugin calls the proxy to get a short-lived access token for Microsoft Graph
4. All Graph API calls are made client-side with that token

### 7.2 Proxy Endpoint

```
GET /api/sharepoint/token
```

- **Auth**: Secured by checking the Storyblok preview token (the plugin passes `plugin.data.token` as a query parameter or header, and the proxy validates it against `NEXT_STORYBLOK_API_TOKEN`)
- **Response**: `{ "accessToken": "eyJ...", "expiresIn": 3600 }`
- **Token source**: Microsoft Entra ID client credentials flow (`POST https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token`)

### 7.3 Required Environment Variables

| Variable                   | Description                                       |
| -------------------------- | ------------------------------------------------- |
| `AZURE_TENANT_ID`          | Microsoft Entra ID (Azure AD) tenant ID           |
| `AZURE_CLIENT_ID`          | Entra ID app registration client (application) ID |
| `AZURE_CLIENT_SECRET`      | Entra ID app registration client secret           |
| `SHAREPOINT_SITE_HOSTNAME` | e.g. `contoso.sharepoint.com`                     |

### 7.4 Microsoft Entra ID App Registration

> **Note:** "Azure AD" was rebranded to **Microsoft Entra ID** in July 2023. All references to "Azure AD" in older documentation, Azure portal labels, and CLI commands refer to the same service.

**Where:** [Microsoft Entra admin center](https://entra.microsoft.com) → Identity → Applications → App registrations

**Step-by-step setup:**

1. **Create the app registration**
   - Go to [entra.microsoft.com](https://entra.microsoft.com) → **Identity → Applications → App registrations → New registration**
   - Name: e.g. `Storyblok SharePoint Folder Picker`
   - Supported account types: "Accounts in this organizational directory only"
   - Redirect URI: leave blank (not needed for client credentials flow)
   - Note the **Application (client) ID** → this is `AZURE_CLIENT_ID`
   - Note the **Directory (tenant) ID** → this is `AZURE_TENANT_ID`

2. **Create a client secret**
   - Go to **Certificates & secrets → Client secrets → New client secret**
   - Set an appropriate expiry (e.g. 24 months)
   - Copy the **Value** immediately → this is `AZURE_CLIENT_SECRET`

3. **Add API permissions (bootstrapping)**

   > **Bootstrapping note:** `Sites.Selected` alone cannot read sites or grant itself access. You need temporarily elevated permissions for the one-time setup, then remove them.
   - Go to **API permissions → Add a permission → Microsoft Graph → Application permissions**
   - Add all three:
     - `Sites.Selected` (the runtime permission — keeps this one permanently)
     - `Sites.Read.All` (temporary — needed to look up the site ID)
     - `Sites.FullControl.All` (temporary — needed to grant site-level permission)
   - Click **Grant admin consent for [tenant]** (requires Global/Cloud Application Administrator)

4. **Grant access to the specific SharePoint site**
   - `Sites.Selected` does not grant blanket access — you must explicitly authorize the app for each site
   - First, acquire a token and look up the site ID:

   ```bash
   # Acquire a token (includes the temporary elevated scopes)
   TOKEN=$(curl -s -X POST "https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=client_credentials&client_id=${AZURE_CLIENT_ID}&client_secret=${AZURE_CLIENT_SECRET}&scope=https://graph.microsoft.com/.default" \
     | jq -r '.access_token')

   # Look up the site ID (format: hostname,guid1,guid2)
   # Requires Sites.Read.All
   curl -s -H "Authorization: Bearer ${TOKEN}" \
     "https://graph.microsoft.com/v1.0/sites/${SHAREPOINT_SITE_HOSTNAME}:/sites/${SITE_PATH}" \
     | jq '.id'
   ```

   - Then grant the app read access to that site:

   ```bash
   # Requires Sites.FullControl.All
   curl -X POST "https://graph.microsoft.com/v1.0/sites/${SITE_ID}/permissions" \
     -H "Authorization: Bearer ${TOKEN}" \
     -H "Content-Type: application/json" \
     -d '{
       "roles": ["read"],
       "grantedToIdentities": [{
         "application": {
           "id": "'"${AZURE_CLIENT_ID}"'",
           "displayName": "Storyblok SharePoint Folder Picker"
         }
       }]
     }'
   ```

5. **Remove temporary permissions**
   - After the permission grant succeeds, go back to **API permissions**
   - Remove `Sites.Read.All` and `Sites.FullControl.All`
   - The app now operates with only `Sites.Selected`, scoped to the granted site(s)

## 8. Microsoft Graph API Usage

### 8.1 Resolve Site & Drive

On plugin initialization, resolve the configured SharePoint site to get the default document library drive:

```
GET https://graph.microsoft.com/v1.0/sites/{siteHostname}:/sites/{sitePath}
→ { id: "contoso.sharepoint.com,guid1,guid2", ... }

GET https://graph.microsoft.com/v1.0/sites/{siteId}/drives
→ { value: [{ id: "b!abc...", name: "Documents", driveType: "documentLibrary" }, ...] }
```

### 8.2 List Folders in a Location

**Root level:**

```
GET https://graph.microsoft.com/v1.0/drives/{driveId}/root/children?$filter=folder ne null&$select=id,name,folder,parentReference,webUrl&$orderby=name
```

**Subfolder:**

```
GET https://graph.microsoft.com/v1.0/drives/{driveId}/items/{folderId}/children?$filter=folder ne null&$select=id,name,folder,parentReference,webUrl&$orderby=name
```

The `$filter=folder ne null` ensures only folders are returned (no files).

### 8.3 Pagination

Graph API returns `@odata.nextLink` for large result sets. The plugin should follow pagination links to load all folders at a given level, or implement "Load more" UX if folders are numerous.

## 9. Plugin Options (field-plugin.config.json)

Configurable per-field via the Storyblok field plugin options UI:

```json
{
  "options": [
    {
      "name": "proxyUrl",
      "value": ""
    },
    {
      "name": "siteHostname",
      "value": ""
    },
    {
      "name": "sitePath",
      "value": ""
    },
    {
      "name": "driveId",
      "value": ""
    }
  ]
}
```

| Option         | Default                 | Description                                                                    |
| -------------- | ----------------------- | ------------------------------------------------------------------------------ |
| `proxyUrl`     | `/api/sharepoint/token` | URL of the token proxy endpoint                                                |
| `siteHostname` | (from env)              | SharePoint site hostname, e.g. `contoso.sharepoint.com`                        |
| `sitePath`     | (from env)              | SharePoint site relative path, e.g. `sites/MySite`                             |
| `driveId`      | (auto-detected)         | Specific drive ID to browse; if empty, use the site's default document library |

Options are read via `plugin.data.options` in the field plugin API.

## 10. File Structure

```
packages/storyblok-sharepoint-folder-picker-field-plugin/
├── src/
│   ├── main.tsx                    — React root + Storyblok workaround error
│   ├── App.tsx                     — useFieldPlugin() wrapper, loading/error states
│   ├── SharePointFolderPicker.tsx  — Main component (browse, select, display)
│   └── types.ts                    — TypeScript interfaces (Folder, StoredValue, GraphResponse)
├── index.html                      — Dev HTML template
├── field-plugin.config.json        — Plugin options schema
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### 10.1 Component Breakdown

**`App.tsx`** — Mirrors theme select's App.tsx:

- Calls `useFieldPlugin()`
- Parses `plugin.data.content` as JSON (or empty object)
- Passes parsed value + onChange + token + options to `SharePointFolderPicker`

**`SharePointFolderPicker.tsx`** — Main component, ~400-500 lines:

- **State**: `folders` (current level), `breadcrumb` (path stack), `selectedFolder`, `loading`, `error`, `search`, `graphToken`
- **Token acquisition**: On mount, call proxy endpoint to get Graph access token
- **Folder fetching**: `fetchFolders(folderId?)` → Graph API → update `folders` state
- **Navigation**: Click folder name → push to breadcrumb, fetch children. Click breadcrumb → pop stack, fetch that level.
- **Selection**: Click [Select] → serialize to JSON → `onChange(JSON.stringify(value))`
- **UI sections**: Selected folder card (top), breadcrumb bar, search input (>5 items), scrollable folder list

**`types.ts`** — Shared interfaces:

```typescript
interface SharePointFolder {
  id: string;
  name: string;
  webUrl: string;
  parentPath: string;
  childCount: number;
}

interface StoredFolderValue {
  driveId: string;
  folderId: string;
  folderName: string;
  folderPath: string;
  siteId: string;
  webUrl: string;
}

interface PluginOptions {
  proxyUrl: string;
  siteHostname: string;
  sitePath: string;
  driveId: string;
}
```

## 11. Next.js Integration (Consumer Side)

The Next.js website reads the stored JSON value and uses it to fetch folder contents at build time or via ISR. This is **out of scope** for the plugin itself, but documented here for context.

### 11.1 Reading the Value

```typescript
// In a page component or data-fetching helper
const folderData: StoredFolderValue = JSON.parse(
  story.content.sharepoint_folder,
);
const { driveId, folderId } = folderData;
```

### 11.2 Fetching Folder Contents

```typescript
// Server-side only (getStaticProps / getServerSideProps / API route)
const response = await graphClient
  .api(`/drives/${driveId}/items/${folderId}/children`)
  .select("id,name,file,folder,webUrl,@microsoft.graph.downloadUrl")
  .get();
```

### 11.3 Required API Route

A server-side helper or API route that acquires a Graph token using the same Azure AD app registration (client credentials flow) and makes Graph API calls. This keeps the client secret server-side.

## 12. Security Considerations

1. **No client secrets in the browser** — Azure AD credentials stay server-side in the token proxy
2. **Token proxy authentication** — The proxy validates the Storyblok preview token before issuing a Graph access token, preventing unauthorized use
3. **Short-lived tokens** — Graph access tokens expire after ~1 hour; the plugin should handle token refresh (re-call the proxy)
4. **Minimal permissions** — Use `Sites.Selected` scoped to the specific site (not tenant-wide `Sites.Read.All`); the site is static per deployment
5. **Read-only access** — The plugin only reads folder structure; no write permissions are requested
6. **CORS** — The token proxy runs on the same domain as the Next.js app; the Graph API supports CORS for client-side calls with a valid token
7. **Input validation** — The proxy should validate `siteHostname` and `sitePath` parameters against an allowlist to prevent SSRF via arbitrary Graph API calls

## 13. Error Handling

| Scenario                       | Behavior                                                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Token proxy unreachable        | Show error message: "Unable to connect to SharePoint. Check proxy configuration."                                         |
| Graph API returns 401/403      | Show error: "SharePoint access denied. Contact your administrator."                                                       |
| Graph API returns 404          | Show error: "SharePoint site or drive not found. Check plugin options."                                                   |
| Network timeout                | Show error with retry button                                                                                              |
| Empty folder (no subfolders)   | Show message: "This folder has no subfolders." with [Select] button to select the current folder                          |
| Stored folder no longer exists | Show warning on the selected card: "⚠ This folder may have been moved or deleted" (attempt to resolve `folderId` on load) |

## 14. Dependencies

```json
{
  "dependencies": {
    "@storyblok/field-plugin": "^1.0.0",
    "react": "^19.2.1",
    "react-dom": "^19.2.1"
  },
  "devDependencies": {
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.2",
    "typescript": "^5.9.3",
    "vite": "^7.2.7",
    "vite-plugin-css-injected-by-js": "^4.0.1"
  }
}
```

No additional runtime dependencies beyond what the theme select plugin uses. Microsoft Graph calls are made via native `fetch()`.

## 15. Design Decisions (Resolved)

1. **Multi-drive support** — No. The default document library is sufficient for now. The `driveId` plugin option exists as an escape hatch but auto-detection of the default library is the expected path.
2. **Folder search scope** — Search/filter is limited to the current folder level only (client-side filtering of already-fetched results). No recursive server-side search.
3. **Permission scoping** — Use `Sites.Selected` (not `Sites.Read.All`). The SharePoint site is static per deployment, so the tighter permission scope is appropriate. Admin must grant the app access to the specific site via PowerShell or Graph API.
4. **Folder validation on load** — Yes. When the field opens with a previously-stored value, the plugin makes a `GET /drives/{driveId}/items/{folderId}` call to verify the folder still exists. If it returns 404, the selected card shows a "⚠ This folder may have been moved or deleted" warning.
5. **Site selector** — No. The SharePoint site is fixed per plugin instance via plugin options (`siteHostname` + `sitePath`). Editors cannot switch sites within the picker.
6. **"Open in SharePoint" link** — Yes. The selected folder card includes an external link icon (↗) that opens the folder's `webUrl` in a new browser tab.

## 16. Success Criteria

- Editors can browse and select a SharePoint folder without leaving the Storyblok Visual Editor
- The selected folder identifier is stable across folder renames
- The Next.js website can consume the stored value to fetch folder contents from Microsoft Graph
- No Azure AD secrets are exposed to the client
- Plugin follows the same architecture, build pipeline, and deployment process as `storyblok-theme-select-field-plugin`

## 17. Milestones

| Phase                 | Deliverable                                                                     |
| --------------------- | ------------------------------------------------------------------------------- |
| **1. Scaffold**       | Package setup, Vite config, Storyblok field plugin shell (loading/error states) |
| **2. Token Proxy**    | Next.js API route `/api/sharepoint/token` with Azure AD client credentials flow |
| **3. Folder Browser** | Fetch + display root folders, drill-in navigation, breadcrumbs                  |
| **4. Selection**      | Select/deselect folder, persist JSON value, display selected folder card        |
| **5. Polish**         | Search/filter, error handling, stale folder detection, plugin options           |
| **6. Deploy**         | Storyblok field plugin deployment, documentation                                |
