---
"@kickstartds/design-system": minor
---

Add component/semantic design-token catalog tooling: `extractComponentTokenCatalog`,
`extractSemanticTokenCatalog`, and `componentTokensToCss` helpers, wired into the build and copied
to `dist/tokens`. Also fixes `fontFamily` quoting in `tokensToCss`. Upstreamed from the optoma
project (generic, brand-neutral parts only).
