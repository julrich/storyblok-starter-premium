/**
 * n8n Code Node: Slack Audit Report Generator (Block Kit)
 *
 * Input:  A single item from the Audit Rules Code Node with `json.auditResults`.
 * Output: A single item with:
 *   - `json.slackText`    — Plain-text fallback for notifications
 *   - `json.slackBlocks`  — Slack Block Kit blocks (JSON string)
 *   - `json.reportTitle`  — Title string for the message
 *   - `json.healthScore`  — Numeric health score
 *   - `json.totalFindings` — Total finding count
 *   - `json.criticalCount` — High-severity finding count
 *   - `json.truncated`    — Boolean, true if blocks exceeded Slack's 50-block limit
 *
 * The output is designed for the Slack node configured with:
 *   - "Send message" action using Block Kit
 *   - Set "Blocks" to `{{ $json.slackBlocks }}`
 *   - Set "Text" (fallback) to `{{ $json.slackText }}`
 *
 * Slack mrkdwn differences from Markdown:
 *   - Bold: *text*  (single asterisk)
 *   - Italic: _text_
 *   - Code: `text`
 *   - Links: <url|label>
 *   - No tables, no headings, no horizontal rules
 *   - Use Block Kit for structured layout
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
};

// ── Health score badge ────────────────────────────────────────────────
function healthBadge(score) {
  if (score >= 80) return `🟢 *${score}/100* — Healthy`;
  if (score >= 60) return `🟡 *${score}/100* — Needs Attention`;
  if (score >= 40) return `🟠 *${score}/100* — Significant Issues`;
  return `🔴 *${score}/100* — Critical`;
}

// ── Truncate long strings ────────────────────────────────────────────
function trunc(str, len = 50) {
  if (!str) return "";
  if (str.length <= len) return str;
  return str.substring(0, len) + "…";
}

// ── Slack-safe text (escape special mrkdwn chars in dynamic content) ─
function esc(str) {
  if (!str) return "—";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Block Kit helpers ─────────────────────────────────────────────────
function headerBlock(text) {
  return { type: "header", text: { type: "plain_text", text, emoji: true } };
}

function sectionBlock(mrkdwn) {
  return { type: "section", text: { type: "mrkdwn", text: mrkdwn } };
}

function contextBlock(...texts) {
  return {
    type: "context",
    elements: texts.map((t) => ({ type: "mrkdwn", text: t })),
  };
}

function dividerBlock() {
  return { type: "divider" };
}

// ── Chunked section blocks ───────────────────────────────────────────
// Slack section text max is 3000 chars — split long content into
// multiple section blocks to avoid truncation.
const CHUNK_SIZE = 2800;

function pushChunkedSections(blocks, textLines) {
  let chunk = "";
  for (const line of textLines) {
    if (chunk && (chunk + "\n" + line).length > CHUNK_SIZE) {
      blocks.push(sectionBlock(chunk));
      chunk = line;
    } else {
      chunk += (chunk ? "\n" : "") + line;
    }
  }
  if (chunk) blocks.push(sectionBlock(chunk));
}

// ── Date formatting ──────────────────────────────────────────────────
const date = new Date(generatedAt).toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

// ── Build Block Kit blocks ───────────────────────────────────────────
const blocks = [];

// ── Title & Context ──────────────────────────────────────────────────
blocks.push(headerBlock("📋 Content Audit Report"));
blocks.push(
  contextBlock(
    `📅 ${date}`,
    `📄 ${summary.totalStories} stories`,
    `🖼️ ${summary.totalAssets} assets`
  )
);

// ── Health Score ──────────────────────────────────────────────────────
blocks.push(dividerBlock());
blocks.push(sectionBlock(healthBadge(summary.healthScore)));

// ── Summary by Category ──────────────────────────────────────────────
blocks.push(dividerBlock());
blocks.push(headerBlock("Summary"));

const categoryOrder = ["images", "seo", "content", "freshness"];
const summaryLines = [];
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
  const h = data.high || 0;
  const m = data.medium || 0;
  const l = data.low || 0;
  const inf = data.info || 0;
  totalHigh += h;
  totalMedium += m;
  totalLow += l;
  totalInfo += inf;
  totalAll += data.total || 0;

  summaryLines.push(
    `${emoji} *${label}*  ·  ${severityEmoji.high} ${h}  ${severityEmoji.medium} ${m}  ${severityEmoji.low} ${l}  ${severityEmoji.info} ${inf}  →  *${data.total}* total`
  );
}

// Totals row
summaryLines.push("");
summaryLines.push(
  `*Total*  ·  ${severityEmoji.high} *${totalHigh}*  ${severityEmoji.medium} *${totalMedium}*  ${severityEmoji.low} *${totalLow}*  ${severityEmoji.info} *${totalInfo}*  →  *${totalAll} findings*`
);

blocks.push(sectionBlock(summaryLines.join("\n")));

// ── Findings by Rule ─────────────────────────────────────────────────
blocks.push(dividerBlock());
blocks.push(headerBlock("Findings by Rule"));

const sortedRules = Object.entries(summary.byRule).sort((a, b) => b[1] - a[1]);
const ruleLines = sortedRules.map(
  ([rule, count]) => `\`${rule}\`  ×${count}`
);

pushChunkedSections(blocks, ruleLines);

// ── Detailed Findings by Severity ─────────────────────────────────────
const severityOrder = ["high", "medium", "low", "info"];

for (const sev of severityOrder) {
  const sevFindings = findings.filter((f) => f.severity === sev);
  if (sevFindings.length === 0) continue;

  blocks.push(dividerBlock());
  blocks.push(
    headerBlock(
      `${severityEmoji[sev]} ${severityLabel[sev]} (${sevFindings.length})`
    )
  );

  // Group by category → rule
  for (const cat of categoryOrder) {
    const catFindings = sevFindings.filter((f) => f.category === cat);
    if (catFindings.length === 0) continue;

    const ruleGroups = {};
    for (const f of catFindings) {
      ruleGroups[f.rule] = ruleGroups[f.rule] || [];
      ruleGroups[f.rule].push(f);
    }

    const groupLines = [];
    groupLines.push(
      `${categoryEmoji[cat]} *${categoryLabel[cat]}*`
    );

    for (const [rule, items] of Object.entries(ruleGroups)) {
      groupLines.push("");
      groupLines.push(`*\`${rule}\`* (${items.length}):`);

      for (const item of items) {
        const detail = item.detail ? `  — _${esc(trunc(item.detail, 50))}_` : "";
        groupLines.push(
          `  • *${esc(item.storyName)}*  ·  \`${esc(item.component)}\`  ·  ${esc(item.message)}${detail}`
        );
      }
    }

    pushChunkedSections(blocks, groupLines);
  }
}

// ── Orphaned Assets Section ──────────────────────────────────────────
if (orphanedAssets && orphanedAssets.length > 0) {
  blocks.push(dividerBlock());
  blocks.push(headerBlock(`🗑️ Orphaned Assets (${orphanedAssets.length})`));

  const assetLines = [
    "_These assets exist in the Storyblok library but are not referenced by any story._",
    "",
  ];

  for (const asset of orphanedAssets) {
    const uploaded = asset.uploadedAt
      ? new Date(asset.uploadedAt).toLocaleDateString("en-US")
      : "—";
    assetLines.push(`  • \`${esc(asset.filename)}\`  ·  uploaded ${uploaded}`);
  }

  pushChunkedSections(blocks, assetLines);
}

// ── Top Offenders ────────────────────────────────────────────────────
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
  blocks.push(dividerBlock());
  blocks.push(headerBlock("🏆 Top Offenders"));

  const offenderLines = [
    "_Stories with the most issues (excluding info):_",
    "",
  ];
  topOffenders.forEach(([slug, data], i) => {
    offenderLines.push(
      `${i + 1}. *${esc(data.name)}*  (\`${esc(slug)}\`)  —  ${severityEmoji.high} ${data.high}  ${severityEmoji.medium} ${data.medium}  ${severityEmoji.low} ${data.low}  →  *${data.total}*`
    );
  });

  blocks.push(sectionBlock(offenderLines.join("\n")));
}

// ── Configuration Reference ──────────────────────────────────────────
blocks.push(dividerBlock());
blocks.push(
  contextBlock(
    `⚙️ *Audit Configuration*`,
    `Stale: ${config.staleMonths}mo`,
    `Min text: ${config.minTextLength} chars`,
    `Title: ≤${config.maxMetaTitleLength}`,
    `Desc: ≤${config.maxMetaDescriptionLength}`
  )
);

// ── Footer ───────────────────────────────────────────────────────────
blocks.push(dividerBlock());
blocks.push(
  contextBlock(
    `_Automated audit by <https://www.kickstartDS.com|kickstartDS> Content-Ops pipeline_`
  )
);

// ── Plain-text fallback (for notifications & non-Block-Kit clients) ──
const slackText = [
  `📋 Content Audit Report — ${date}`,
  healthBadge(summary.healthScore),
  `${summary.totalFindings} findings across ${summary.totalStories} stories`,
  summary.bySeverity.high > 0
    ? `🔴 ${summary.bySeverity.high} critical issues require attention`
    : "✅ No critical issues",
].join("\n");

// ── Slack Block Kit has a max of 50 blocks per message ───────────────
// If we exceed, truncate detail blocks and add a note
const MAX_BLOCKS = 50;
let truncatedNote = false;
if (blocks.length > MAX_BLOCKS) {
  blocks.length = MAX_BLOCKS - 2;
  truncatedNote = true;
  blocks.push(dividerBlock());
  blocks.push(
    contextBlock(
      `⚠️ _Report truncated (${blocks.length + 2} blocks needed, Slack max is ${MAX_BLOCKS}). ${summary.totalFindings} total findings — view the full markdown report for complete details._`
    )
  );
}

return [
  {
    json: {
      reportTitle: `Content Audit — ${date}`,
      slackText,
      slackBlocks: JSON.stringify(blocks),
      healthScore: summary.healthScore,
      totalFindings: summary.totalFindings,
      criticalCount: summary.bySeverity.high,
      truncated: truncatedNote,
    },
  },
];
