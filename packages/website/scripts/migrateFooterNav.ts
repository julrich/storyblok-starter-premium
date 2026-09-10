#!/usr/bin/env node
/**
 * migrateFooterNav.ts
 *
 * One-off content migration for the footer navigation.
 *
 * The pre-monorepo footer took a flat `navItems` list - one entry per menu
 * link - and rendered it as a single horizontal row. The monorepo footer
 * replaced that with `navGroups`: columns that each carry a heading and a list
 * of links underneath it. `migrateContentFields.ts` deliberately left this one
 * alone (see its MANUAL_REVIEW list) because a group had no way to carry a
 * link of its own, so the old entries had nowhere to go.
 *
 * They do now. The design system's footer schema grew an optional
 * `headingUrl`, so a column that sets only `heading` + `headingUrl` and no
 * links renders as a single flat entry. One column per old nav item
 * reproduces the old one-dimensional footer menu.
 *
 * Usage:
 *   npm run migrate-footer-nav              # dry run, writes nothing
 *   npm run migrate-footer-nav -- --apply   # actually rewrite content
 *
 * Push the component schemas first (`npm run update-storyblok-config`), or the
 * migrated `headingUrl` values will land in content that Storyblok has no
 * field for and editors will not see them.
 *
 * Environment variables (via .env.local):
 *   NEXT_STORYBLOK_OAUTH_TOKEN - Management API OAuth token (required)
 *   NEXT_STORYBLOK_SPACE_ID    - Storyblok space ID (required)
 *
 * Stories that were published are re-published after the update; drafts stay
 * drafts. Run the dry run first and read the report.
 */

import { randomUUID } from "node:crypto";
import StoryblokClient from "storyblok-js-client";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Report {
  /** Headings created, in order, per story slug. */
  groups: string[];
  /**
   * Second-level links found under an old nav item. The old footer only ever
   * drew the top level, so these never rendered on the site and are dropped
   * rather than carried into the new `items` list.
   */
  nestedDropped: string[];
  /** Footer bloks skipped because they already carry navGroups. */
  skipped: number;
}

/**
 * Rewrites every `footer` blok in `node` in place. Returns true if anything
 * changed.
 */
function migrateFooterNav(node: unknown, report: Report): boolean {
  if (Array.isArray(node)) {
    let changed = false;
    for (const child of node) {
      if (migrateFooterNav(child, report)) changed = true;
    }
    return changed;
  }

  if (!node || typeof node !== "object") return false;
  const blok = node as Record<string, any>;
  let changed = false;

  if (blok.component === "footer" && Array.isArray(blok.navItems)) {
    const existing = Array.isArray(blok.navGroups) ? blok.navGroups : [];

    if (existing.length > 0) {
      // Never overwrite groups an editor already built by hand.
      report.skipped += 1;
    } else if (blok.navItems.length > 0) {
      blok.navGroups = blok.navItems.map((item: Record<string, any>) => {
        const label = typeof item.label === "string" ? item.label : "";
        report.groups.push(label || "(no label)");

        for (const nested of Array.isArray(item.items) ? item.items : []) {
          report.nestedDropped.push(`${label} > ${nested?.label ?? "(no label)"}`);
        }

        return {
          _uid: randomUUID(),
          component: "navGroups",
          heading: label,
          // Left as the raw multilink object: story processing resolves it to
          // an href the same way it did on the old nav item.
          ...(item.url ? { headingUrl: item.url } : {}),
          items: [],
        };
      });

      // The field is gone from the component schema, so leaving it behind
      // would only keep dead content around - and its data now lives in
      // navGroups. Recoverable from the space backup if this turns out wrong.
      delete blok.navItems;
      changed = true;
    }
  }

  for (const value of Object.values(blok)) {
    if (value && typeof value === "object") {
      if (migrateFooterNav(value, report)) changed = true;
    }
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
  console.log(
    apply
      ? "▶ APPLY — content will be rewritten\n"
      : "▶ DRY RUN — nothing will be written (pass --apply to commit)\n",
  );

  const client = new StoryblokClient({ oauthToken });

  const ids: number[] = [];
  for (let page = 1; ; page++) {
    const res = await client.get(`spaces/${spaceId}/stories`, { page, per_page: 100 });
    const batch = res.data.stories as Array<{ id: number; is_folder: boolean }>;
    ids.push(...batch.filter((s) => !s.is_folder).map((s) => s.id));
    if (batch.length < 100) break;
    await sleep(200);
  }
  console.log(`found ${ids.length} stories\n`);

  const reports = new Map<string, Report>();
  let skippedTotal = 0;

  for (const id of ids) {
    const { data } = await client.get(`spaces/${spaceId}/stories/${id}`);
    const story = data.story;

    const report: Report = { groups: [], nestedDropped: [], skipped: 0 };
    const changed = migrateFooterNav(story.content, report);
    skippedTotal += report.skipped;

    if (!changed) {
      await sleep(150);
      continue;
    }

    reports.set(story.full_slug, report);

    if (apply) {
      const wasPublished = story.published === true;
      await client.put(`spaces/${spaceId}/stories/${id}`, {
        story: { content: story.content },
        ...(wasPublished ? { publish: 1 } : {}),
      });
    }
    await sleep(250);
  }

  console.log(`stories ${apply ? "updated" : "that would change"}: ${reports.size}`);
  if (reports.size === 0) {
    console.log("  none — footer navigation already migrated");
  }

  for (const [slug, report] of reports) {
    console.log(`\n  ${slug}`);
    console.log(`    ${report.groups.length} nav groups created:`);
    for (const heading of report.groups) console.log(`      ${heading}`);

    if (report.nestedDropped.length > 0) {
      console.log(
        `    ${report.nestedDropped.length} second-level links dropped (never rendered by the old footer):`,
      );
      for (const entry of report.nestedDropped) console.log(`      ${entry}`);
    }
  }

  if (skippedTotal > 0) {
    console.log(
      `\n${skippedTotal} footer blok(s) left alone — they already carry navGroups`,
    );
  }

  if (!apply && reports.size > 0) {
    console.log("\nre-run with --apply to write these changes");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
