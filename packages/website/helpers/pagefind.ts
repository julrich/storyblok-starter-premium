/**
 * Attributes that place a page into the Pagefind index.
 *
 * Pagefind derives a result's URL from the file it crawled. For a Next.js build
 * that is a path inside `.next`, not a route anybody can visit, which is why
 * `SearchFormPagefind` prefers an explicit `url` meta over the crawled one.
 * Without it every search result points at something like
 * `/server/pages/produkte/a1110-05-e.html` and 404s.
 *
 * Passing no URL leaves the page out of the index altogether. That is what the
 * 404 and 500 pages want - they render regular page content and would otherwise
 * show up as results.
 */
export function pagefindAttributes(url?: string) {
  if (!url) return {};

  return {
    "data-pagefind-body": true,
    "data-pagefind-meta": `url:${url}`,
  };
}
