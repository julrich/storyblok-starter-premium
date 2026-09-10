---
"@kickstartds/design-tokens-mcp": minor
---

Add the Component Token Editor (upstream Batch C). The Design Tokens Editor gains a
component-level token editing surface (`component-editor/**`), a token graph view
(`graph/GraphView.tsx`) built on the new `@kickstartds/token-graph` package, and a
full component preview page (`preview-page/ComponentPreviewPage.tsx`) that renders
live design-system components against edited tokens. The Design Tokens MCP is
extended to support **component token overrides**: `get_theme_schema` now surfaces a
component token catalog summary, and `validate_theme` accepts an optional
`componentTokens` map validated against the component token catalog — enabling
sparse per-component token overrides for the Storyblok MCP `create_theme` /
`update_theme` tools. MCP token sync now includes the component and semantic token
catalogs. Brand-specific token values and sample content were excluded and
regenerated/neutralised for the template.
