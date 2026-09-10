/**
 * n8n Code Node: Markdown Audit Report Generator
 *
 * Input:  A single item from the Audit Rules Code Node with `json.auditResults`.
 * Output: A single item with `json.report` (Markdown string) and `json.reportTitle`.
 *
 * The resulting markdown is ready to be:
 *   - Posted to Slack via a Slack node
 *   - Saved to a file
 *   - Emailed
 *   - Displayed in n8n's UI
 */

const { auditResults } = $input.first().json;
const { summary, findings, orphanedAssets, generatedAt, config } = auditResults;

// ── Emoji helpers ─────────────────────────────────────────────────────
const severityEmoji = { high: "🔴", medium: "🟡", low: "🔵", info: "ℹ️" };
const categoryEmoji = {
  images: "🖼️",
  content: "📝",
  seo: "🔎",
  freshness: "📅",
  composition: "🧩",
};
const severityLabel = {
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Info",
};
const categoryLabel = {
  images: "Images",
  content: "Content Quality",
  seo: "SEO",
  freshness: "Freshness",
  composition: "Composition",
};

// ── Health score badge ────────────────────────────────────────────────
function healthBadge(score) {
  if (score >= 80) return `🟢 ${score}/100 — Healthy`;
  if (score >= 60) return `🟡 ${score}/100 — Needs Attention`;
  if (score >= 40) return `🟠 ${score}/100 — Significant Issues`;
  return `🔴 ${score}/100 — Critical`;
}

// ── Escape pipe characters for markdown tables ────────────────────────
function esc(str) {
  if (!str) return "—";
  return String(str).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

// ── Truncate long strings ────────────────────────────────────────────
function trunc(str, len = 60) {
  if (!str) return "";
  if (str.length <= len) return str;
  return str.substring(0, len) + "…";
}

// ── Build the report ─────────────────────────────────────────────────
const lines = [];
const date = new Date(generatedAt).toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

// Title
lines.push(`# 📋 Content Audit Report`);
lines.push(
  `> Generated on **${date}** · ${summary.totalStories} stories · ${summary.totalAssets} assets`
);
lines.push("");

// ── Health Score ──────────────────────────────────────────────────────
lines.push(`## ${healthBadge(summary.healthScore)}`);
lines.push("");

// ── Summary Table ────────────────────────────────────────────────────
lines.push(`### Summary`);
lines.push("");
lines.push(
  `| Category | ${severityEmoji.high} High | ${severityEmoji.medium} Medium | ${severityEmoji.low} Low | ${severityEmoji.info} Info | Total |`
);
lines.push("|----------|:-----:|:-------:|:---:|:----:|------:|");

const categoryOrder = ["images", "seo", "content", "freshness", "composition"];
let totalHigh = 0,
  totalMedium = 0,
  totalLow = 0,
  totalInfo = 0,
  totalAll = 0;

for (const cat of categoryOrder) {
  const data = summary.byCategory[cat];
  if (!data) continue;
  const emoji = categoryEmoji[cat] || "";
  const label = categoryLabel[cat] || cat;
  lines.push(
    `| ${emoji} ${label} | ${data.high || "—"} | ${data.medium || "—"} | ${
      data.low || "—"
    } | ${data.info || "—"} | **${data.total}** |`
  );
  totalHigh += data.high || 0;
  totalMedium += data.medium || 0;
  totalLow += data.low || 0;
  totalInfo += data.info || 0;
  totalAll += data.total || 0;
}

lines.push(
  `| **Total** | **${totalHigh}** | **${totalMedium}** | **${totalLow}** | **${totalInfo}** | **${totalAll}** |`
);
lines.push("");

// ── Rule breakdown ───────────────────────────────────────────────────
lines.push(`### Findings by Rule`);
lines.push("");
lines.push(`| Rule | Count |`);
lines.push(`|------|------:|`);

const sortedRules = Object.entries(summary.byRule).sort((a, b) => b[1] - a[1]);
for (const [rule, count] of sortedRules) {
  lines.push(`| \`${rule}\` | ${count} |`);
}
lines.push("");

// ── Detailed Findings by Severity ─────────────────────────────────────
const severityOrder = ["high", "medium", "low", "info"];

for (const sev of severityOrder) {
  const sevFindings = findings.filter((f) => f.severity === sev);
  if (sevFindings.length === 0) continue;

  lines.push(`---`);
  lines.push(
    `## ${severityEmoji[sev]} ${severityLabel[sev]} (${sevFindings.length})`
  );
  lines.push("");

  // Group by category within severity
  for (const cat of categoryOrder) {
    const catFindings = sevFindings.filter((f) => f.category === cat);
    if (catFindings.length === 0) continue;

    lines.push(`### ${categoryEmoji[cat]} ${categoryLabel[cat]}`);
    lines.push("");

    // Group by rule within category
    const ruleGroups = {};
    for (const f of catFindings) {
      ruleGroups[f.rule] = ruleGroups[f.rule] || [];
      ruleGroups[f.rule].push(f);
    }

    for (const [rule, items] of Object.entries(ruleGroups)) {
      lines.push(`**\`${rule}\`** (${items.length})`);
      lines.push("");
      lines.push(`| Story | Component | Message | Detail |`);
      lines.push(`|-------|-----------|---------|--------|`);

      for (const item of items) {
        lines.push(
          `| ${esc(item.storyName)} | \`${esc(item.component)}\` | ${esc(
            item.message
          )} | ${esc(trunc(item.detail, 50))} |`
        );
      }
      lines.push("");
    }
  }
}

// ── Orphaned Assets Section ──────────────────────────────────────────
if (orphanedAssets && orphanedAssets.length > 0) {
  lines.push(`---`);
  lines.push(`## 🗑️ Orphaned Assets (${orphanedAssets.length})`);
  lines.push("");
  lines.push(
    `These assets exist in the Storyblok library but are not referenced by any story.`
  );
  lines.push("");
  lines.push(`| Filename | Uploaded |`);
  lines.push(`|----------|----------|`);

  for (const asset of orphanedAssets) {
    const uploaded = asset.uploadedAt
      ? new Date(asset.uploadedAt).toLocaleDateString("en-US")
      : "—";
    lines.push(`| ${esc(asset.filename)} | ${uploaded} |`);
  }
  lines.push("");
}

// ── Top Offenders ─────────────────────────────────────────────────────
lines.push(`---`);
lines.push(`## 🏆 Top Offenders`);
lines.push("");

const storyCounts = {};
for (const f of findings) {
  if (f.severity === "info") continue;
  storyCounts[f.story] = storyCounts[f.story] || {
    name: f.storyName,
    high: 0,
    medium: 0,
    low: 0,
    total: 0,
  };
  storyCounts[f.story][f.severity]++;
  storyCounts[f.story].total++;
}

const topOffenders = Object.entries(storyCounts)
  .sort((a, b) => b[1].total - a[1].total)
  .slice(0, 10);

if (topOffenders.length > 0) {
  lines.push(`Stories with the most issues (excluding info):`);
  lines.push("");
  lines.push(`| # | Story | High | Medium | Low | Total |`);
  lines.push(`|---|-------|:----:|:------:|:---:|------:|`);

  topOffenders.forEach(([slug, data], i) => {
    lines.push(
      `| ${i + 1} | **${esc(data.name)}** (\`${esc(slug)}\`) | ${data.high} | ${
        data.medium
      } | ${data.low} | **${data.total}** |`
    );
  });
  lines.push("");
}

// ── Configuration Reference ──────────────────────────────────────────
lines.push(`---`);
lines.push(`<details><summary>⚙️ Audit Configuration</summary>`);
lines.push("");
lines.push(`| Parameter | Value |`);
lines.push(`|-----------|-------|`);
lines.push(`| Stale threshold | ${config.staleMonths} months |`);
lines.push(`| Min text length | ${config.minTextLength} chars |`);
lines.push(`| Max meta title | ${config.maxMetaTitleLength} chars |`);
lines.push(
  `| Max meta description | ${config.maxMetaDescriptionLength} chars |`
);
lines.push("");
lines.push(`</details>`);
lines.push("");

// ── Footer ───────────────────────────────────────────────────────────
lines.push(`---`);
lines.push(
  `*Automated audit by kickstartDS Content-Ops pipeline · [Docs](https://www.kickstartDS.com)*`
);

const report = lines.join("\n");

return [
  {
    json: {
      reportTitle: `Content Audit — ${date}`,
      report,
      healthScore: summary.healthScore,
      totalFindings: summary.totalFindings,
      criticalCount: summary.bySeverity.high,
    },
  },
];
