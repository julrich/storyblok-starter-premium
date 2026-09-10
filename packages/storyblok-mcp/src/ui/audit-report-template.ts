/**
 * Audit report HTML template for ext-apps UI.
 *
 * Renders a rich, interactive content audit dashboard inside the
 * conversation via an MCP Apps iframe. Mirrors the Slack Block Kit
 * report format from the n8n workflow (health score badge, category
 * breakdown, findings by severity, top offenders) but with full HTML
 * styling and interactive drill-down.
 *
 * Display mode: `inline` (default) or `fullscreen`
 *
 * @see n8n workflow: content-audit-report-slack.js
 */

import { THEME_BRIDGE_CSS, PREVIEW_CHROME_CSS } from "./theme-bridge.js";
import { KDS_GLOBAL_CSS } from "./tokens.generated.js";
import { KDS_COMPONENT_CSS } from "./components-css.generated.js";

const SHARED_HEAD = `
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      ${KDS_GLOBAL_CSS}
      ${KDS_COMPONENT_CSS}
      ${THEME_BRIDGE_CSS}
      ${PREVIEW_CHROME_CSS}
    </style>
`;

const EXT_APPS_SDK_SCRIPT = `https://unpkg.com/@modelcontextprotocol/ext-apps@1/dist/src/app-with-deps.js`;

export const AUDIT_REPORT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    ${SHARED_HEAD}
    <title>Content Audit Report</title>
    <style>
        /* ─── Audit Report Styles ───────────────────────────────────── */
        .audit-report {
            max-width: 900px;
            margin: 0 auto;
            padding: 24px;
            font-family: var(--ks-font-copy-family, system-ui, sans-serif);
            color: var(--ks-foreground-color-default, #171717);
        }

        .audit-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
            flex-wrap: wrap;
            gap: 12px;
        }

        .audit-header h1 {
            font-size: 20px;
            font-weight: 700;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .audit-meta {
            display: flex;
            gap: 16px;
            font-size: 13px;
            color: var(--ks-foreground-color-muted, #6b7280);
            flex-wrap: wrap;
        }

        .audit-meta span {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        /* ─── Health Score ───────────────────────────────────────────── */
        .health-score {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 16px 20px;
            border-radius: 12px;
            margin: 16px 0 24px;
        }

        .health-score--healthy {
            background: linear-gradient(135deg, #ecfdf5, #d1fae5);
            border: 1px solid #a7f3d0;
        }
        .health-score--attention {
            background: linear-gradient(135deg, #fefce8, #fef9c3);
            border: 1px solid #fde68a;
        }
        .health-score--issues {
            background: linear-gradient(135deg, #fff7ed, #ffedd5);
            border: 1px solid #fed7aa;
        }
        .health-score--critical {
            background: linear-gradient(135deg, #fef2f2, #fee2e2);
            border: 1px solid #fecaca;
        }

        .health-score__number {
            font-size: 42px;
            font-weight: 800;
            line-height: 1;
            font-variant-numeric: tabular-nums;
        }
        .health-score--healthy .health-score__number { color: #059669; }
        .health-score--attention .health-score__number { color: #ca8a04; }
        .health-score--issues .health-score__number { color: #ea580c; }
        .health-score--critical .health-score__number { color: #dc2626; }

        .health-score__details {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .health-score__label {
            font-size: 15px;
            font-weight: 600;
            color: var(--ks-foreground-color-default, #171717);
        }

        .health-score__sublabel {
            font-size: 13px;
            color: var(--ks-foreground-color-muted, #6b7280);
        }

        /* ─── Category Summary Cards ────────────────────────────────── */
        .category-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 12px;
            margin-bottom: 24px;
        }

        .category-card {
            padding: 14px 16px;
            border-radius: 10px;
            border: 1px solid var(--ks-border-color-default, #e5e7eb);
            background: var(--ks-background-color-default, #ffffff);
        }

        .category-card__header {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 10px;
            color: var(--ks-foreground-color-default, #171717);
        }

        .category-card__counts {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .severity-badge {
            display: inline-flex;
            align-items: center;
            gap: 3px;
            padding: 2px 8px;
            border-radius: 99px;
            font-size: 12px;
            font-weight: 600;
            font-variant-numeric: tabular-nums;
        }

        .severity-badge--high {
            background: #fef2f2;
            color: #dc2626;
        }
        .severity-badge--medium {
            background: #fefce8;
            color: #ca8a04;
        }
        .severity-badge--low {
            background: #eff6ff;
            color: #2563eb;
        }
        .severity-badge--info {
            background: #f5f5f5;
            color: #6b7280;
        }

        .category-card__total {
            font-size: 12px;
            color: var(--ks-foreground-color-muted, #6b7280);
            margin-top: 8px;
            font-weight: 600;
        }

        /* ─── Section Headers ───────────────────────────────────────── */
        .audit-section {
            margin-bottom: 24px;
        }

        .audit-section__header {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 15px;
            font-weight: 700;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid var(--ks-border-color-default, #e5e7eb);
            color: var(--ks-foreground-color-default, #171717);
        }

        /* ─── Rule Breakdown ────────────────────────────────────────── */
        .rule-list {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-bottom: 24px;
        }

        .rule-chip {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 12px;
            border: 1px solid var(--ks-border-color-default, #e5e7eb);
            background: var(--ks-background-color-default, #ffffff);
            cursor: pointer;
            transition: background 0.15s, border-color 0.15s;
        }

        .rule-chip:hover {
            background: var(--ks-background-color-bold, #f5f5f5);
            border-color: var(--ks-border-color-bold, #d1d5db);
        }

        .rule-chip.active {
            background: var(--ks-background-color-accent, #4e63e0);
            color: var(--ks-foreground-color-inverted, #fff);
            border-color: transparent;
        }

        .rule-chip__name {
            font-family: var(--ks-font-mono-family, monospace);
            font-weight: 600;
        }

        .rule-chip__count {
            font-variant-numeric: tabular-nums;
            opacity: 0.7;
        }

        /* ─── Findings Table ────────────────────────────────────────── */
        .findings-group {
            margin-bottom: 16px;
        }

        .findings-group__header {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 8px;
            cursor: pointer;
            user-select: none;
        }

        .findings-group__header:hover {
            color: var(--ks-link-color, #4e63e0);
        }

        .findings-group__toggle {
            font-size: 10px;
            transition: transform 0.2s;
        }

        .findings-group.collapsed .findings-group__toggle {
            transform: rotate(-90deg);
        }

        .findings-group.collapsed .findings-group__body {
            display: none;
        }

        .finding-row {
            display: grid;
            grid-template-columns: minmax(100px, 1fr) 100px 1fr auto;
            gap: 8px;
            align-items: baseline;
            padding: 6px 8px;
            font-size: 13px;
            border-radius: 6px;
        }

        .finding-row:nth-child(odd) {
            background: rgba(0,0,0,0.02);
        }

        .finding-row__story {
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .finding-row__component {
            font-family: var(--ks-font-mono-family, monospace);
            font-size: 11px;
            color: var(--ks-foreground-color-muted, #6b7280);
        }

        .finding-row__message {
            color: var(--ks-foreground-color-default, #171717);
        }

        .finding-row__detail {
            font-size: 11px;
            color: var(--ks-foreground-color-muted, #6b7280);
            font-style: italic;
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        /* ─── Top Offenders ─────────────────────────────────────────── */
        .offenders-list {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .offender-row {
            display: grid;
            grid-template-columns: 28px 1fr auto auto auto auto;
            gap: 8px;
            align-items: center;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 13px;
        }

        .offender-row:nth-child(odd) {
            background: rgba(0,0,0,0.02);
        }

        .offender-row__rank {
            font-weight: 700;
            color: var(--ks-foreground-color-muted, #6b7280);
            text-align: center;
            font-variant-numeric: tabular-nums;
        }

        .offender-row__name {
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .offender-row__slug {
            font-family: var(--ks-font-mono-family, monospace);
            font-size: 11px;
            color: var(--ks-foreground-color-muted, #6b7280);
        }

        /* ─── Config Footer ─────────────────────────────────────────── */
        .audit-config {
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid var(--ks-border-color-default, #e5e7eb);
        }

        .audit-config summary {
            font-size: 13px;
            color: var(--ks-foreground-color-muted, #6b7280);
            cursor: pointer;
            user-select: none;
        }

        .audit-config__grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 8px;
            margin-top: 8px;
            font-size: 12px;
            color: var(--ks-foreground-color-muted, #6b7280);
        }

        .audit-config__item {
            display: flex;
            justify-content: space-between;
            padding: 4px 8px;
            border-radius: 4px;
            background: rgba(0,0,0,0.02);
        }

        .audit-config__label { font-weight: 600; }
        .audit-config__value { font-variant-numeric: tabular-nums; }

        .audit-footer {
            text-align: center;
            font-size: 12px;
            color: var(--ks-foreground-color-muted, #6b7280);
            margin-top: 16px;
            padding-top: 12px;
            border-top: 1px solid var(--ks-border-color-default, #e5e7eb);
        }

        /* ─── Severity totals bar ───────────────────────────────────── */
        .severity-totals {
            display: flex;
            gap: 12px;
            align-items: center;
            padding: 8px 0;
            font-size: 13px;
        }

        .severity-totals__item {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .severity-totals__dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
        }
        .severity-totals__dot--high { background: #dc2626; }
        .severity-totals__dot--medium { background: #ca8a04; }
        .severity-totals__dot--low { background: #2563eb; }
        .severity-totals__dot--info { background: #6b7280; }

        /* ─── Empty state ───────────────────────────────────────────── */
        .audit-empty {
            text-align: center;
            padding: 48px 24px;
        }

        .audit-empty__icon {
            font-size: 48px;
            margin-bottom: 12px;
        }

        .audit-empty__title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 4px;
        }

        .audit-empty__detail {
            font-size: 14px;
            color: var(--ks-foreground-color-muted, #6b7280);
        }
    </style>
</head>
<body>
    <div id="preview-container" class="kds-preview kds-preview--loading">
        Running content audit…
    </div>

    <script type="module">
        import { App, applyDocumentTheme, applyHostStyleVariables, applyHostFonts } from "${EXT_APPS_SDK_SCRIPT}";

        const app = new App(
            { name: "kds-audit-report", version: "1.0.0" },
            { availableDisplayModes: ["inline", "fullscreen"] }
        );

        let currentDisplayMode = "inline";

        // ── Host styling ─────────────────────────────────────────────
        function applyHostStyles(ctx) {
            if (ctx.theme) applyDocumentTheme(ctx.theme);
            if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
            if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
        }

        function applyContainerDimensions(ctx) {
            if (!ctx?.containerDimensions) return;
            const dims = ctx.containerDimensions;
            const html = document.documentElement;
            if ('width' in dims) {
                html.style.width = '100vw';
                document.body.style.minWidth = '0';
            } else if ('maxWidth' in dims && dims.maxWidth) {
                html.style.maxWidth = dims.maxWidth + 'px';
            }
            if ('height' in dims) {
                html.style.height = '100vh';
            } else if ('maxHeight' in dims && dims.maxHeight) {
                html.style.maxHeight = dims.maxHeight + 'px';
            }
        }

        // ── Helpers ──────────────────────────────────────────────────
        const SEV_EMOJI = { high: "🔴", medium: "🟡", low: "🔵", info: "ℹ️" };
        const SEV_LABEL = { high: "High", medium: "Medium", low: "Low", info: "Info" };
        const CAT_EMOJI = { images: "🖼️", content: "📝", seo: "🔎", freshness: "📅", composition: "🧩" };
        const CAT_LABEL = { images: "Images", content: "Content Quality", seo: "SEO", freshness: "Freshness", composition: "Composition" };
        const CAT_ORDER = ["images", "seo", "content", "composition", "freshness"];
        const SEV_ORDER = ["high", "medium", "low", "info"];

        function esc(s) { return s ? String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;") : "—"; }
        function trunc(s, n=50) { return s && s.length > n ? s.substring(0,n) + "…" : (s || ""); }

        function healthClass(score) {
            if (score >= 80) return "healthy";
            if (score >= 60) return "attention";
            if (score >= 40) return "issues";
            return "critical";
        }
        function healthLabel(score) {
            if (score >= 80) return "Healthy";
            if (score >= 60) return "Needs Attention";
            if (score >= 40) return "Significant Issues";
            return "Critical";
        }
        function healthEmoji(score) {
            if (score >= 80) return "🟢";
            if (score >= 60) return "🟡";
            if (score >= 40) return "🟠";
            return "🔴";
        }

        function formatDate(iso) {
            return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
        }

        // ── Render the full report ───────────────────────────────────
        function renderReport(data) {
            const { summary, findings, topOffenders, generatedAt, config } = data;
            const hc = healthClass(summary.healthScore);
            let html = '';

            // ── Header ───────────────────────────────────────────────
            html += '<div class="audit-report">';
            html += '<div class="audit-header">';
            html += '<h1>📋 Content Audit Report</h1>';
            html += '<div class="audit-meta">';
            html += '<span>📅 ' + formatDate(generatedAt) + '</span>';
            html += '<span>📄 ' + summary.totalStories + ' stories</span>';
            html += '</div>';
            html += '</div>';

            // ── Health Score ─────────────────────────────────────────
            html += '<div class="health-score health-score--' + hc + '">';
            html += '<div class="health-score__number">' + summary.healthScore + '</div>';
            html += '<div class="health-score__details">';
            html += '<div class="health-score__label">' + healthEmoji(summary.healthScore) + ' ' + healthLabel(summary.healthScore) + '</div>';
            html += '<div class="health-score__sublabel">' + summary.totalFindings + ' findings across ' + summary.totalStories + ' stories</div>';
            html += '</div>';
            html += '</div>';

            // ── Severity totals ──────────────────────────────────────
            html += '<div class="severity-totals">';
            for (const sev of SEV_ORDER) {
                const count = summary.bySeverity[sev] || 0;
                html += '<div class="severity-totals__item">';
                html += '<span class="severity-totals__dot severity-totals__dot--' + sev + '"></span>';
                html += '<strong>' + count + '</strong> ' + SEV_LABEL[sev];
                html += '</div>';
            }
            html += '</div>';

            // ── Category Cards ───────────────────────────────────────
            html += '<div class="category-grid">';
            for (const cat of CAT_ORDER) {
                const d = summary.byCategory[cat];
                if (!d) continue;
                html += '<div class="category-card">';
                html += '<div class="category-card__header">' + (CAT_EMOJI[cat]||"") + ' ' + (CAT_LABEL[cat]||cat) + '</div>';
                html += '<div class="category-card__counts">';
                if (d.high) html += '<span class="severity-badge severity-badge--high">' + SEV_EMOJI.high + ' ' + d.high + '</span>';
                if (d.medium) html += '<span class="severity-badge severity-badge--medium">' + SEV_EMOJI.medium + ' ' + d.medium + '</span>';
                if (d.low) html += '<span class="severity-badge severity-badge--low">' + SEV_EMOJI.low + ' ' + d.low + '</span>';
                if (d.info) html += '<span class="severity-badge severity-badge--info">' + SEV_EMOJI.info + ' ' + d.info + '</span>';
                html += '</div>';
                html += '<div class="category-card__total">' + d.total + ' total</div>';
                html += '</div>';
            }
            html += '</div>';

            // ── Findings by Rule ─────────────────────────────────────
            const sortedRules = Object.entries(summary.byRule).sort((a,b) => b[1] - a[1]);
            if (sortedRules.length > 0) {
                html += '<div class="audit-section">';
                html += '<div class="audit-section__header">📊 Findings by Rule</div>';
                html += '<div class="rule-list" id="rule-filters">';
                for (const [rule, count] of sortedRules) {
                    html += '<span class="rule-chip" data-rule="' + esc(rule) + '">';
                    html += '<span class="rule-chip__name">' + esc(rule) + '</span>';
                    html += '<span class="rule-chip__count">×' + count + '</span>';
                    html += '</span>';
                }
                html += '</div>';
                html += '</div>';
            }

            // ── Detailed Findings by Severity ────────────────────────
            for (const sev of SEV_ORDER) {
                const sevFindings = findings.filter(f => f.severity === sev);
                if (sevFindings.length === 0) continue;

                html += '<div class="audit-section">';
                html += '<div class="audit-section__header">' + SEV_EMOJI[sev] + ' ' + SEV_LABEL[sev] + ' (' + sevFindings.length + ')</div>';

                for (const cat of CAT_ORDER) {
                    const catFindings = sevFindings.filter(f => f.category === cat);
                    if (catFindings.length === 0) continue;

                    // Group by rule
                    const ruleGroups = {};
                    for (const f of catFindings) {
                        ruleGroups[f.rule] = ruleGroups[f.rule] || [];
                        ruleGroups[f.rule].push(f);
                    }

                    for (const [rule, items] of Object.entries(ruleGroups)) {
                        html += '<div class="findings-group" data-rule="' + esc(rule) + '">';
                        html += '<div class="findings-group__header" onclick="this.parentElement.classList.toggle(&apos;collapsed&apos;)">';
                        html += '<span class="findings-group__toggle">▼</span>';
                        html += (CAT_EMOJI[cat]||"") + ' ';
                        html += '<code>' + esc(rule) + '</code>';
                        html += ' <span class="severity-badge severity-badge--' + sev + '">(' + items.length + ')</span>';
                        html += '</div>';
                        html += '<div class="findings-group__body">';
                        for (const item of items) {
                            html += '<div class="finding-row" data-rule="' + esc(rule) + '">';
                            html += '<span class="finding-row__story" title="' + esc(item.story) + '">' + esc(item.storyName) + '</span>';
                            html += '<span class="finding-row__component">' + esc(item.component) + '</span>';
                            html += '<span class="finding-row__message">' + esc(item.message) + '</span>';
                            html += '<span class="finding-row__detail" title="' + esc(item.detail||"") + '">' + esc(trunc(item.detail, 40)) + '</span>';
                            html += '</div>';
                        }
                        html += '</div>';
                        html += '</div>';
                    }
                }

                html += '</div>';
            }

            // ── Top Offenders ────────────────────────────────────────
            if (topOffenders && topOffenders.length > 0) {
                html += '<div class="audit-section">';
                html += '<div class="audit-section__header">🏆 Top Offenders</div>';
                html += '<div class="offenders-list">';
                topOffenders.forEach((o, i) => {
                    html += '<div class="offender-row">';
                    html += '<span class="offender-row__rank">' + (i+1) + '</span>';
                    html += '<span class="offender-row__name">' + esc(o.name) + ' <span class="offender-row__slug">' + esc(o.slug) + '</span></span>';
                    html += '<span class="severity-badge severity-badge--high">' + SEV_EMOJI.high + ' ' + o.high + '</span>';
                    html += '<span class="severity-badge severity-badge--medium">' + SEV_EMOJI.medium + ' ' + o.medium + '</span>';
                    html += '<span class="severity-badge severity-badge--low">' + SEV_EMOJI.low + ' ' + o.low + '</span>';
                    html += '<strong>' + o.total + '</strong>';
                    html += '</div>';
                });
                html += '</div>';
                html += '</div>';
            }

            // ── Config Footer ────────────────────────────────────────
            html += '<details class="audit-config">';
            html += '<summary>⚙️ Audit Configuration</summary>';
            html += '<div class="audit-config__grid">';
            html += '<div class="audit-config__item"><span class="audit-config__label">Stale threshold</span><span class="audit-config__value">' + config.staleMonths + ' months</span></div>';
            html += '<div class="audit-config__item"><span class="audit-config__label">Min text length</span><span class="audit-config__value">' + config.minTextLength + ' chars</span></div>';
            html += '<div class="audit-config__item"><span class="audit-config__label">Max title length</span><span class="audit-config__value">' + config.maxMetaTitleLength + ' chars</span></div>';
            html += '<div class="audit-config__item"><span class="audit-config__label">Max desc length</span><span class="audit-config__value">' + config.maxMetaDescriptionLength + ' chars</span></div>';
            html += '</div>';
            html += '</details>';

            // ── Footer ──────────────────────────────────────────────
            html += '<div class="audit-footer">Automated audit by kickstartDS Content-Ops pipeline</div>';

            html += '</div>'; // .audit-report

            return html;
        }

        // ── Rule chip filter interaction ─────────────────────────────
        function setupRuleFilters() {
            const chips = document.querySelectorAll(".rule-chip");
            let activeRule = null;

            chips.forEach(chip => {
                chip.addEventListener("click", () => {
                    const rule = chip.getAttribute("data-rule");

                    if (activeRule === rule) {
                        // Deactivate: show all
                        activeRule = null;
                        chips.forEach(c => c.classList.remove("active"));
                        document.querySelectorAll(".findings-group").forEach(g => g.style.display = "");
                    } else {
                        // Activate: filter to this rule
                        activeRule = rule;
                        chips.forEach(c => c.classList.toggle("active", c.getAttribute("data-rule") === rule));
                        document.querySelectorAll(".findings-group").forEach(g => {
                            g.style.display = g.getAttribute("data-rule") === rule ? "" : "none";
                        });
                    }
                });
            });
        }

        // ── Tool lifecycle ───────────────────────────────────────────
        app.ontoolinput = (params) => {
            const container = document.getElementById("preview-container");
            container.className = "kds-preview kds-preview--loading";
            container.textContent = "Running content audit…";
        };

        app.ontoolresult = (result) => {
            const sc = result?.structuredContent || result;
            const container = document.getElementById("preview-container");

            if (sc && sc.summary) {
                container.className = "kds-preview";
                container.innerHTML = renderReport(sc);
                setupRuleFilters();
            } else {
                container.className = "kds-preview";
                container.innerHTML = '<div class="audit-empty">'
                    + '<div class="audit-empty__icon">📋</div>'
                    + '<div class="audit-empty__title">No audit data received</div>'
                    + '<div class="audit-empty__detail">The content audit did not return any results.</div>'
                    + '</div>';
            }
        };

        app.ontoolcancelled = (params) => {
            const container = document.getElementById("preview-container");
            container.className = "kds-preview";
            container.innerHTML = '<div class="audit-empty">'
                + '<div class="audit-empty__icon">🚫</div>'
                + '<div class="audit-empty__title">Audit cancelled</div>'
                + '<div class="audit-empty__detail">' + (params?.reason || "The audit was cancelled.") + '</div>'
                + '</div>';
        };

        app.onhostcontextchanged = (ctx) => {
            applyHostStyles(ctx);
            applyContainerDimensions(ctx);
            if (ctx.displayMode) {
                currentDisplayMode = ctx.displayMode;
                document.body.classList.toggle("fullscreen", ctx.displayMode === "fullscreen");
            }
        };

        // ── Connect ──────────────────────────────────────────────────
        try {
            const connectTimeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Connection timed out")), 10000)
            );
            await Promise.race([app.connect(), connectTimeout]);
            const hostCtx = app.getHostContext();
            if (hostCtx) {
                applyHostStyles(hostCtx);
                applyContainerDimensions(hostCtx);
            }
        } catch (err) {
            const container = document.getElementById("preview-container");
            container.className = "kds-preview";
            container.innerHTML = '<div class="kds-connection-error">'
                + '<div class="kds-connection-error__icon">⚠️</div>'
                + '<div class="kds-connection-error__title">Could not connect to host</div>'
                + '<div class="kds-connection-error__detail">' + (err.message || "Unknown error") + '</div>'
                + '</div>';
        }
    </script>
</body>
</html>`;
