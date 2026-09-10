---
"@kickstartds/storyblok-services": minor
"@kickstartds/storyblok-mcp-server": minor
---

Add per-component design token overrides to theme create/update.

Themes (`token-theme` stories under `settings/themes/`) can now carry sparse
per-component token overrides alongside their W3C DTCG branding tokens. The
shared `createTheme`/`updateTheme` service functions accept an optional
`componentTokens` object plus injected `componentTokensToCss` compiler and
`component-token-catalog`, compile it to scoped CSS, and persist both
`componentTokens` and `componentCss` on the story. `ThemeDetail` now exposes
these fields, and the `create_theme`/`update_theme` MCP tools accept the new
`componentTokens` parameter.
