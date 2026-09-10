---
"@kickstartds/design-system": minor
---

Redesign the Footer component with grouped navigation columns, social links, and a legal bottom bar.

The footer now renders multi-column link groups (`navGroups`), an icon-driven social-links row (`socialLinks`, using icon identifiers from the icon sprite such as `facebook`, `twitter`, `linkedin`, `xing`), a `copyright` notice, and a `legalLink` in the bottom bar.

BREAKING CHANGE: the `byline` and `navItems` props were removed. Migrate `navItems` to `navGroups` (an array of `{ heading, items: [{ label, url, newTab }] }`), move any byline text into `copyright`, and configure social media links via `socialLinks` (`{ icon, url, ariaLabel }`).
