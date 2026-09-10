# SharePoint Folder Picker — Implementation Checklist

**PRD:** [sharepoint-folder-picker-prd.md](../prd/sharepoint-folder-picker-prd.md)
**ADR:** [adr-sharepoint-folder-picker.md](../../adr/adr-sharepoint-folder-picker.md)

---

## Phase 1: Scaffold

- [x] Create package directory `packages/storyblok-sharepoint-folder-picker-field-plugin/`
- [x] Create `package.json` (matches theme-select deps)
- [x] Create `tsconfig.json`
- [x] Create `vite.config.ts`
- [x] Create `index.html` (dev template)
- [x] Create `field-plugin.config.json`
- [x] Create `src/types.ts`
- [x] Create `src/main.tsx`
- [x] Create `src/App.tsx`
- [x] Verify package is discovered by pnpm workspace

## Phase 2: Token Proxy

- [x] Create `packages/website/pages/api/sharepoint/token.ts`
- [x] Implement Azure AD client credentials flow
- [x] Validate Storyblok preview token before issuing Graph token
- [x] Return `{ accessToken, expiresIn }`

## Phase 3: Folder Browser

- [x] Implement Graph token acquisition in `SharePointFolderPicker`
- [x] Implement site & drive resolution
- [x] Implement `fetchFolders()` (root + subfolder)
- [x] Render folder list with 📁 icons
- [x] Implement drill-in navigation (click folder name)
- [x] Implement breadcrumb trail with clickable segments
- [x] Handle empty folder state

## Phase 4: Selection

- [x] Implement [Select] button per folder row
- [x] Persist JSON value via `onChange(JSON.stringify(...))`
- [x] Display selected folder card (name + path + ↗ + ✕)
- [x] Implement clear/deselect
- [x] Implement "Open in SharePoint" external link

## Phase 5: Polish

- [x] Client-side search/filter for current folder level
- [x] Folder validation on load (verify stored folderId still exists)
- [x] Stale folder warning UI
- [x] Error states (proxy unreachable, 401/403, 404, timeout)
- [x] Retry button on network errors
- [x] Read plugin options from `plugin.data.options`
- [x] Token refresh handling (re-acquire on expiry)

## Phase 6: Deploy

- [ ] Build and verify (`pnpm build`)
- [ ] Deploy to Storyblok (`pnpm deploy`)
- [ ] Create README.md with setup instructions
- [ ] Document Azure AD app registration steps
- [ ] Add env vars to deployment configs
