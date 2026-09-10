---
"@kickstartds/design-system": patch
---

Upstream dependency patch updates (upstream Batch E). Adds two pnpm
`patchedDependencies` and extends a third, all brand-neutral upstream bugfixes:

- **`unpic@3.22.0`** — hardens the Storyblok image-URL filter parser
  (`splitFilters`) to use a regex instead of naive `:`/`(` splitting, so filter
  values containing those characters parse correctly.
- **`kickstartds@3.5.0--canary.62.324.0`** — makes the `storyblok-task` CLI
  actually consume the rc config returned by `taskInit` (`schemaPaths`,
  `layerOrder`, `configurationPath`, `templates`, `globals`, `components`).
- **`@kickstartds/jsonschema-utils@3.9.0`** — extends the existing patch so
  `reduceSchemaAllOfs` preserves `title`, `description`, and `required` when
  collapsing `allOf` subschemas.

Note: pnpm patches apply only within this monorepo's install and are not shipped
with published artifacts; this patch bump records the toolchain change for
release tracking. Design-system `build` green (presets 137).
