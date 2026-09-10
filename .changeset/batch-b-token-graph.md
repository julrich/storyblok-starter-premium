---
"@kickstartds/design-system": minor
---

Add the Cosmos Token Graph feature (upstream Batch B). Introduces the new
`@kickstartds/token-graph` workspace package (interactive design-token graph built on
sigma.js / graphology) and wires its extraction into the design-system build: the `token-graph`
step generates `src/token/token-graph.json` and rollup ships it to `dist/tokens/`. This also
completes the token-graph build wiring deferred from Batch A (build step, `@kickstartds/token-graph`
workspace dependency, and rollup copy entry).
