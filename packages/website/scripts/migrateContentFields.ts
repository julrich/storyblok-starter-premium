#!/usr/bin/env node
/**
 * migrateContentFields.ts
 *
 * One-off content migration for projects moving from the standalone
 * storyblok-starter-premium layout to the monorepo baseline.
 *
 * Upstream renamed a number of component fields (most visibly `href` -> `url`
 * on every nav/link component, and `target` -> `url` on buttons). Pushing the
 * new component schemas updates the *definitions* in Storyblok, but existing
 * *content* keeps the old keys — so every affected blok renders with an
 * undefined link until the stored content is migrated too.
 *
 * Usage:
 *   npm run migrate-content-fields              # dry run, writes nothing
 *   npm run migrate-content-fields -- --apply   # actually rewrite content
 *
 * Environment variables (via .env.local):
 *   NEXT_STORYBLOK_OAUTH_TOKEN — Management API OAuth token (required)
 *   NEXT_STORYBLOK_SPACE_ID    — Storyblok space ID (required)
 *
 * Stories that were published are re-published after the update; drafts stay
 * drafts. Run the dry run first and read the report.
 */

import StoryblokClient from "storyblok-js-client";

/**
 * Pure renames only: same field type, same option values, same semantics.
 * Verified by diffing the old and new generated cms/components.*.json.
 */
const RENAMES: Record<string, Record<string, string>> = {
  // href -> url
  navItems: { href: "url" },
  items: { href: "url" },
  links: { href: "url" },
  socialSharing: { href: "url" },
  // target -> url
  buttons: { target: "url" },
  "teaser-card": { target: "url" },
  tile: { button_target: "button_url" },
  feature: { cta_target: "cta_url" },
  // renamed, identical option values / type
  "blog-teaser": { link_label: "link_text" },
  cta: { contentAlign: "align" },
  slider: { typeProp: "variant" },
  footer: { byline: "copyright" },
};

/**
 * Fields upstream removed outright. Carrying them forward only leaves dead keys
 * in the content, so they are deleted rather than counted.
 *
 * Only ever applied inside a blok (an object with a `component` key). Richtext
 * documents are plain nested objects in which *every* node carries a `type`
 * ("doc", "paragraph", "text", ...), so an unscoped delete would shred every
 * rich text field in the space.
 */
const DROPS: string[] = ["type"];

/**
 * Changes this script deliberately does NOT make, because they are not
 * mechanical renames. Counted, never modified, so the manual effort left
 * over is a number rather than a guess.
 *
 * `component: "*"` matches any component carrying the field.
 */
const MANUAL_REVIEW: Array<{ component: string; field: string; note: string }> = [
  {
    component: "buttons",
    field: "icon",
    note: "removed upstream with no replacement — these icons are lost unless the field is re-added to the design system's button schema",
  },
  {
    component: "cta",
    field: "fullWidth",
    note: "closest new field is `padding`, but the boolean is likely inverted — decide the mapping, then migrate",
  },
  {
    component: "footer",
    field: "navItems",
    note: "became `navGroups` ({ heading, items }); handled separately by migrateFooterNav.ts, now that a group can carry its own link",
  },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface ManualStat {
  /** bloks carrying the field at all */
  present: number;
  /** bloks where it actually holds a value worth migrating */
  withValue: number;
  /** for `bloks`/array fields: total nested entries */
  children: number;
  stories: Set<string>;
}

interface Stats {
  renames: Record<string, number>;
  drops: Record<string, number>;
  manual: Map<string, ManualStat>;
}

/** Empty string, false, empty array/object and null all mean "nothing to migrate". */
function hasValue(value: unknown): boolean {
  if (value === undefined || value === null || value === "" || value === false) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as object).length > 0;
  return true;
}

function countManual(component: string, obj: Record<string, unknown>, stats: Stats, slug: string): void {
  for (const entry of MANUAL_REVIEW) {
    if (entry.component !== "*" && entry.component !== component) continue;
    if (!(entry.field in obj)) continue;

    const key = `${entry.component === "*" ? "*" : component}.${entry.field}`;
    let stat = stats.manual.get(key);
    if (!stat) {
      stat = { present: 0, withValue: 0, children: 0, stories: new Set() };
      stats.manual.set(key, stat);
    }

    const value = obj[entry.field];
    stat.present += 1;
    if (hasValue(value)) stat.withValue += 1;
    if (Array.isArray(value)) stat.children += value.length;
    stat.stories.add(slug);
  }
}

function migrateContent(node: unknown, stats: Stats, slug: string): boolean {
  let changed = false;

  if (Array.isArray(node)) {
    for (const child of node) if (migrateContent(child, stats, slug)) changed = true;
    return changed;
  }

  if (node === null || typeof node !== "object") return false;

  const obj = node as Record<string, unknown>;
  const component = typeof obj.component === "string" ? obj.component : undefined;

  if (component) {
    countManual(component, obj, stats, slug);

    for (const field of DROPS) {
      if (field in obj) {
        delete obj[field];
        const key = `${component}.${field}`;
        stats.drops[key] = (stats.drops[key] || 0) + 1;
        changed = true;
      }
    }
  }

  const renames = component ? RENAMES[component] : undefined;
  if (renames) {
    for (const [from, to] of Object.entries(renames)) {
      // Only move it if the old key is present and the new one is not already set,
      // so re-running the migration is a no-op rather than a data-loss event.
      if (from in obj && !(to in obj && obj[to] !== null && obj[to] !== "")) {
        obj[to] = obj[from];
        delete obj[from];
        const key = `${component}.${from} -> ${to}`;
        stats.renames[key] = (stats.renames[key] || 0) + 1;
        changed = true;
      }
    }
  }

  for (const value of Object.values(obj)) {
    if (value && typeof value === "object" && migrateContent(value, stats, slug)) changed = true;
  }

  return changed;
}

async function main(): Promise<void> {
  const oauthToken = process.env.NEXT_STORYBLOK_OAUTH_TOKEN;
  const spaceId = process.env.NEXT_STORYBLOK_SPACE_ID;

  if (!oauthToken || !spaceId) {
    console.error("✖ missing NEXT_STORYBLOK_OAUTH_TOKEN or NEXT_STORYBLOK_SPACE_ID");
    process.exit(1);
  }

  const apply = process.argv.includes("--apply");
  console.log(apply ? "▶ APPLY — content will be rewritten\n" : "▶ DRY RUN — nothing will be written (pass --apply to commit)\n");

  const client = new StoryblokClient({ oauthToken });

  // ── Collect every story in the space ──────────────────────────
  const ids: number[] = [];
  for (let page = 1; ; page++) {
    const res = await client.get(`spaces/${spaceId}/stories`, { page, per_page: 100 });
    const batch = res.data.stories as Array<{ id: number; is_folder: boolean }>;
    ids.push(...batch.filter((s) => !s.is_folder).map((s) => s.id));
    if (batch.length < 100) break;
    await sleep(200);
  }
  console.log(`found ${ids.length} stories\n`);

  const stats: Stats = { renames: {}, drops: {}, manual: new Map() };
  const touched: string[] = [];

  for (const id of ids) {
    const { data } = await client.get(`spaces/${spaceId}/stories/${id}`);
    const story = data.story;

    // Always walks the whole story, so the manual-review tally is complete
    // even for stories that need no renames.
    if (!migrateContent(story.content, stats, story.full_slug)) {
      await sleep(150);
      continue;
    }
    touched.push(story.full_slug);

    if (apply) {
      const wasPublished = story.published === true;
      await client.put(`spaces/${spaceId}/stories/${id}`, {
        story: { content: story.content },
        ...(wasPublished ? { publish: 1 } : {}),
      });
    }
    await sleep(250);
  }

  // ── Report ────────────────────────────────────────────────────
  console.log(`stories ${apply ? "updated" : "that would change"}: ${touched.length}`);
  for (const slug of touched) console.log(`  ${slug}`);

  console.log("\nfield migrations:");
  const renameEntries = Object.entries(stats.renames).sort((a, b) => b[1] - a[1]);
  if (renameEntries.length === 0) console.log("  none — content already migrated");
  for (const [key, n] of renameEntries) console.log(`  ${String(n).padStart(5)} × ${key}`);

  const dropEntries = Object.entries(stats.drops).sort((a, b) => b[1] - a[1]);
  if (dropEntries.length > 0) {
    const total = dropEntries.reduce((sum, [, n]) => sum + n, 0);
    console.log(`\nfields dropped (${total} total):`);
    for (const [key, n] of dropEntries) console.log(`  ${String(n).padStart(5)} × ${key}`);
  }

  console.log("\nNOT migrated — manual review, with the scale of the problem:");
  for (const entry of MANUAL_REVIEW) {
    const key = `${entry.component}.${entry.field}`;
    const stat = stats.manual.get(key);

    if (!stat || stat.present === 0) {
      console.log(`\n  ${key}: not present in any story — nothing to do`);
      continue;
    }

    const detail = [
      `${stat.withValue} with a value`,
      `${stat.present} total`,
      `${stat.stories.size} ${stat.stories.size === 1 ? "story" : "stories"}`,
    ];
    if (stat.children > 0) detail.push(`${stat.children} nested entries`);

    console.log(`\n  ${key}: ${detail.join(", ")}`);
    console.log(`      ${entry.note}`);
    if (stat.withValue > 0) {
      const slugs = [...stat.stories].sort();
      console.log(`      affected: ${slugs.slice(0, 10).join(", ")}${slugs.length > 10 ? `, +${slugs.length - 10} more` : ""}`);
    }
  }

  if (!apply && touched.length > 0) console.log("\nRe-run with --apply to commit these changes.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
