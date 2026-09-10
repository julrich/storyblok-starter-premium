---
"@kickstartds/design-system": minor
---

Upstream design-system component fixes (upstream Batch D). Ports 37 brand-neutral
component sources — `*.tsx`, `*.scss`, `*.schema.json`, prop types and client
behaviour — across blog-head, business-card, button, content-nav,
event-registration, feature, gallery, header, headline, hero, html, lightbox,
logos, search-filter, section, split-even, split-weighted and teaser-card, plus a
new `SeoComponent.tsx` and a new `Gallery.client.js`. New component tokens are
introduced for the gallery slider, lightbox stroke/thumb and teaser-card image,
and the `component-token-catalog.json` and `SectionProps.d.ts` artifacts are
regenerated deterministically (Button added to the section content union).

Brand-laden Storybook stories and the story-coupled Footer redesign were excluded
(see ADR-008); LFS visual snapshots/screenshots are regenerated in the canonical
CI environment rather than committed from a locally drifted run (see ADR-009).
