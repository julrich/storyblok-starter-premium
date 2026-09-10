/**
 * Content audit engine.
 *
 * Walks all published stories in a Storyblok space and applies quality rules
 * across five categories: images, content quality, SEO, freshness, and
 * composition.
 *
 * Produces a structured audit result with findings, summary statistics,
 * health score, orphaned assets, and top offenders — identical output shape
 * to the n8n content-audit-rules code node.
 *
 * Used by: MCP server (`content_audit` tool), n8n community nodes.
 */

import type StoryblokClient from "storyblok-js-client";
import {
  checkCompositionalQuality,
  type ValidationRules,
  type ValidationWarning,
} from "./validate.js";

// ── Types ──────────────────────────────────────────────────────────

export interface AuditConfig {
  /** Months after which content is considered stale (default: 6) */
  staleMonths: number;
  /** Minimum acceptable text length per component (default: 50) */
  minTextLength: number;
  /** Maximum meta title length (default: 60) */
  maxMetaTitleLength: number;
  /** Maximum meta description length (default: 160) */
  maxMetaDescriptionLength: number;
  /** Minimum meta title length (default: 10) */
  minMetaTitleLength: number;
  /** Minimum meta description length (default: 50) */
  minMetaDescriptionLength: number;
}

export type FindingSeverity = "high" | "medium" | "low" | "info";
export type FindingCategory =
  | "images"
  | "content"
  | "seo"
  | "freshness"
  | "composition";

export interface AuditFinding {
  rule: string;
  severity: FindingSeverity;
  category: FindingCategory;
  story: string;
  storyName: string;
  path: string;
  component: string;
  message: string;
  detail?: string;
}

export interface CategorySummary {
  high: number;
  medium: number;
  low: number;
  info: number;
  total: number;
}

export interface AuditSummary {
  totalStories: number;
  totalFindings: number;
  byCategory: Record<string, CategorySummary>;
  bySeverity: Record<FindingSeverity, number>;
  byRule: Record<string, number>;
  healthScore: number;
}

export interface AuditResults {
  generatedAt: string;
  config: AuditConfig;
  summary: AuditSummary;
  findings: AuditFinding[];
  topOffenders: Array<{
    slug: string;
    name: string;
    high: number;
    medium: number;
    low: number;
    total: number;
  }>;
}

export interface RunAuditOptions {
  /** Filter stories by slug prefix (e.g. "en/") */
  startsWith?: string;
  /** Custom audit configuration overrides */
  config?: Partial<AuditConfig>;
  /** Progress callback: (step, total, message) */
  onProgress?: (step: number, total: number, message: string) => void;
  /**
   * Validation rules per content type.
   *
   * When provided, the audit runs `checkCompositionalQuality()` on every
   * section-based story, producing findings in the `"composition"` category.
   *
   * Map keys are content type names (e.g. `"page"`, `"blog-post"`).
   * Callers typically build this from a `SchemaRegistry`:
   * ```ts
   * const rulesMap = new Map([
   *   ["page", registry.page.rules],
   *   ["blog-post", registry.get("blog-post").rules],
   * ]);
   * ```
   */
  validationRulesMap?: Map<string, ValidationRules>;
}

// ── Default Configuration ──────────────────────────────────────────

const DEFAULT_CONFIG: AuditConfig = {
  staleMonths: 6,
  minTextLength: 50,
  maxMetaTitleLength: 60,
  maxMetaDescriptionLength: 160,
  minMetaTitleLength: 10,
  minMetaDescriptionLength: 50,
};

const EXTERNAL_URL_PATTERNS = [
  "placehold.co",
  "picsum.photos",
  "unsplash.com",
  "placeholder.com",
  "via.placeholder.com",
  "dummyimage.com",
  "lorempixel.com",
];

// ── Helpers ────────────────────────────────────────────────────────

function getAssetFilename(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && (value as any).filename)
    return (value as any).filename;
  return null;
}

function isStoryblokAsset(url: string): boolean {
  if (!url) return false;
  return url.includes("storyblok.com") || url.startsWith("//a.storyblok.com");
}

function isExternalPlaceholder(url: string): boolean {
  if (!url) return false;
  return EXTERNAL_URL_PATTERNS.some((p) => url.includes(p));
}

function isEmptyAsset(value: unknown): boolean {
  if (!value) return true;
  if (typeof value === "string") return value.trim() === "";
  if (typeof value === "object") {
    if ((value as any).fieldtype === "asset") {
      return !(value as any).filename || (value as any).filename.trim() === "";
    }
  }
  return false;
}

function getAltText(
  node: Record<string, unknown>,
  imageKey: string
): string | undefined {
  // Pattern 1: separate _alt field
  const altKey = imageKey
    .replace(/_?src$/, "_alt")
    .replace(/^image$/, "image_alt");
  if (altKey !== imageKey && node[altKey] !== undefined) {
    return node[altKey] as string;
  }
  // Pattern 1b: responsive variants share image_alt
  if (
    /^image_src(Mobile|Tablet|Desktop)$/.test(imageKey) &&
    node.image_alt !== undefined
  ) {
    return node.image_alt as string;
  }
  // Pattern 2: alt text inside asset object
  if (
    typeof node[imageKey] === "object" &&
    (node[imageKey] as any)?.alt !== undefined
  ) {
    return (node[imageKey] as any).alt;
  }
  // Pattern 3: standalone "alt" field
  if (node.alt !== undefined && (imageKey === "image" || imageKey === "src")) {
    return node.alt as string;
  }
  // Pattern 4: camelCase alt field
  if (imageKey === "image" && node.imageAlt !== undefined) {
    return node.imageAlt as string;
  }
  return undefined;
}

function monthsBetween(d1: Date, d2: Date): number {
  return (
    (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth())
  );
}

function countTextContent(node: unknown): number {
  let total = 0;
  if (!node || typeof node !== "object") return total;
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key === "text" && typeof value === "string") {
      total += value.replace(/[#*_~`>\-\[\]()]/g, "").trim().length;
    } else if (Array.isArray(value)) {
      value.forEach((v) => {
        total += countTextContent(v);
      });
    } else if (typeof value === "object" && value !== null) {
      total += countTextContent(value);
    }
  }
  return total;
}

// ── Content Tree Walker ────────────────────────────────────────────

function walkContent(
  node: Record<string, unknown>,
  path: string,
  storySlug: string,
  storyName: string,
  config: AuditConfig,
  findings: AuditFinding[]
): void {
  if (!node || typeof node !== "object") return;

  const component = node.component as string | undefined;

  // ── IMAGE RULES ─────────────────────────────────────────────────
  const imageFields = [
    "image_src",
    "image_srcMobile",
    "image_srcTablet",
    "image_srcDesktop",
    "image",
    "backgroundImage",
    "logo_src",
    "avatar_src",
    "cardImage",
    "src",
  ];

  for (const field of imageFields) {
    if (node[field] !== undefined) {
      const filename = getAssetFilename(node[field]);

      // Rule: Empty image source
      if (
        isEmptyAsset(node[field]) &&
        ["image_src", "image", "image_srcMobile"].includes(field)
      ) {
        if (
          component &&
          [
            "hero",
            "image-text",
            "image-story",
            "gallery",
            "teaser-card",
          ].includes(component)
        ) {
          findings.push({
            rule: "empty-image",
            severity: "medium",
            category: "images",
            story: storySlug,
            storyName,
            path: `${path}.${field}`,
            component,
            message: `Empty image source on ${component}.${field}`,
          });
        }
      }

      // Rule: Missing alt text
      if (
        filename &&
        !isEmptyAsset(node[field]) &&
        !(
          component === "seo" &&
          (field === "image" || field === "cardImage")
        ) &&
        field !== "backgroundImage"
      ) {
        const alt = getAltText(node, field);
        if (
          alt === undefined ||
          alt === null ||
          (typeof alt === "string" && alt.trim() === "")
        ) {
          findings.push({
            rule: "missing-alt-text",
            severity: "high",
            category: "images",
            story: storySlug,
            storyName,
            path: `${path}.${field}`,
            component: component || "unknown",
            message: `Missing alt text for ${component || "unknown"}.${field}`,
            detail: filename?.substring(0, 80),
          });
        }
      }

      // Rule: External/placeholder image
      if (filename && isExternalPlaceholder(filename)) {
        findings.push({
          rule: "placeholder-image",
          severity: "high",
          category: "images",
          story: storySlug,
          storyName,
          path: `${path}.${field}`,
          component: component || "unknown",
          message: `Placeholder/external image on ${
            component || "unknown"
          }.${field}`,
          detail: filename.substring(0, 80),
        });
      }

      // Rule: External non-Storyblok image
      if (
        filename &&
        !isStoryblokAsset(filename) &&
        !isExternalPlaceholder(filename) &&
        filename.startsWith("http")
      ) {
        findings.push({
          rule: "external-image",
          severity: "medium",
          category: "images",
          story: storySlug,
          storyName,
          path: `${path}.${field}`,
          component: component || "unknown",
          message: `Non-Storyblok image on ${
            component || "unknown"
          }.${field} — should be uploaded as asset`,
          detail: filename.substring(0, 80),
        });
      }
    }
  }

  // ── CONTENT QUALITY RULES ──────────────────────────────────────
  if (component && node.text && typeof node.text === "string") {
    const cleanText = (node.text as string)
      .replace(/[#*_~`>\-\[\]()\\n<>]/g, "")
      .trim();
    if (cleanText.length > 0 && cleanText.length < config.minTextLength) {
      findings.push({
        rule: "short-text",
        severity: "low",
        category: "content",
        story: storySlug,
        storyName,
        path: `${path}.text`,
        component,
        message: `Short text (${cleanText.length} chars) on ${component}`,
        detail: cleanText.substring(0, 60) + (cleanText.length > 60 ? "…" : ""),
      });
    }
  }

  // Rule: Empty section
  if (
    component === "section" &&
    Array.isArray(node.components) &&
    (node.components as unknown[]).length === 0
  ) {
    findings.push({
      rule: "empty-section",
      severity: "high",
      category: "content",
      story: storySlug,
      storyName,
      path,
      component: "section",
      message: "Section has no components",
    });
  }

  // Rule: Hero without headline
  if (
    component === "hero" &&
    (!node.headline || (node.headline as string).trim() === "")
  ) {
    findings.push({
      rule: "hero-no-headline",
      severity: "medium",
      category: "content",
      story: storySlug,
      storyName,
      path,
      component: "hero",
      message: "Hero component has no headline",
    });
  }

  // Rule: CTA without buttons
  if (component === "cta") {
    const hasButtons =
      Array.isArray(node.buttons) && (node.buttons as unknown[]).length > 0;
    if (!hasButtons) {
      findings.push({
        rule: "cta-no-buttons",
        severity: "medium",
        category: "content",
        story: storySlug,
        storyName,
        path,
        component: "cta",
        message: "CTA component has no buttons",
      });
    }
  }

  // Rule: Teaser card without link
  if (component === "teaser-card") {
    const url = (node.url || node.target) as any;
    const hasUrl =
      url &&
      (typeof url === "string"
        ? url.trim() !== "" && url !== "#"
        : url.cached_url || url.url);
    const buttonHidden = node.button_hidden === true;
    if (!hasUrl && !buttonHidden) {
      findings.push({
        rule: "teaser-no-link",
        severity: "low",
        category: "content",
        story: storySlug,
        storyName,
        path,
        component: "teaser-card",
        message: "Teaser card has no link target",
      });
    }
  }

  // ── Recurse ─────────────────────────────────────────────────────
  for (const [key, value] of Object.entries(node)) {
    if (Array.isArray(value)) {
      (value as unknown[]).forEach((item, i) => {
        if (typeof item === "object" && item !== null) {
          walkContent(
            item as Record<string, unknown>,
            `${path}.${key}[${i}]`,
            storySlug,
            storyName,
            config,
            findings
          );
        }
      });
    } else if (typeof value === "object" && value !== null && key !== "_uid") {
      walkContent(
        value as Record<string, unknown>,
        `${path}.${key}`,
        storySlug,
        storyName,
        config,
        findings
      );
    }
  }
}

// ── Compositional Warning → Audit Finding Helpers ──────────────────

/**
 * Map a `ValidationWarning.level` to an `AuditFinding.severity`.
 *
 * - `"warning"` → `"medium"` (design-system layout concern)
 * - `"suggestion"` → `"low"` (field-level composition hint)
 * - `"info"` → `"info"` (contextual observation)
 */
function warningLevelToSeverity(
  level: ValidationWarning["level"]
): FindingSeverity {
  switch (level) {
    case "warning":
      return "medium";
    case "suggestion":
      return "low";
    case "info":
      return "info";
    default:
      return "info";
  }
}

/**
 * Derive a stable, kebab-case rule name from a `ValidationWarning`.
 *
 * Uses pattern matching on the warning message to produce descriptive
 * rule identifiers. Prefixed with `"composition-"` to distinguish from
 * the audit's own inline structural checks.
 */
function warningToRuleName(w: ValidationWarning): string {
  const msg = w.message.toLowerCase();
  if (msg.includes("multiple hero")) return "composition-duplicate-heroes";
  if (msg.includes("adjacent sections both use"))
    return "composition-adjacent-same-type";
  if (msg.includes("minimum recommended"))
    return "composition-sparse-sub-items";
  if (msg.includes("blog-teaser") && msg.includes("no link"))
    return "composition-blog-teaser-no-link";
  if (msg.includes("no cta section")) return "composition-missing-cta";
  if (msg.includes("headline_text") && msg.includes("own headline"))
    return "composition-redundant-headline";
  if (msg.includes("buttons") && msg.includes("two cta"))
    return "composition-competing-ctas";
  if (msg.includes("spacebefore")) return "composition-first-section-spacing";
  return "composition-other";
}

// ── Main Audit Function ────────────────────────────────────────────

/**
 * Run a comprehensive content audit across all stories in a Storyblok space.
 *
 * Fetches all stories and assets, applies quality rules, and returns
 * structured audit results with findings, summary statistics, health score,
 * orphaned assets, and top offenders.
 */
export async function runContentAudit(
  client: StoryblokClient,
  options: RunAuditOptions = {}
): Promise<AuditResults> {
  const config: AuditConfig = { ...DEFAULT_CONFIG, ...options.config };
  const now = new Date();
  const findings: AuditFinding[] = [];
  const onProgress = options.onProgress || (() => {});

  // Step 1: Fetch all stories
  onProgress(1, 3, "Fetching stories…");
  const stories: any[] = [];
  let page = 1;
  const perPage = 25;
  while (true) {
    const params: Record<string, any> = {
      version: "draft",
      per_page: perPage,
      page,
    };
    if (options.startsWith) {
      params.starts_with = options.startsWith;
    }
    const res = await client.get("cdn/stories", params);
    const batch = res.data?.stories || [];
    stories.push(...batch);
    if (batch.length < perPage) break;
    page++;
  }

  // Step 2: Apply rules to each story
  onProgress(2, 3, `Auditing ${stories.length} stories…`);

  for (const story of stories) {
    const slug = story.full_slug || story.slug;
    const name = story.name;
    const content = story.content;
    if (!content) continue;
    if (slug.includes("import")) continue;

    const contentType = content.component || "unknown";

    // ── SEO RULES ───────────────────────────────────────────────
    const seoArr = content.seo;
    const hasSeo = Array.isArray(seoArr) && seoArr.length > 0;
    const seo = hasSeo ? seoArr[0] : null;

    if (!hasSeo) {
      findings.push({
        rule: "missing-seo",
        severity: "high",
        category: "seo",
        story: slug,
        storyName: name,
        path: "content.seo",
        component: contentType,
        message: "No SEO metadata configured",
      });
    } else {
      if (!seo.title || seo.title.trim() === "") {
        findings.push({
          rule: "missing-meta-title",
          severity: "high",
          category: "seo",
          story: slug,
          storyName: name,
          path: "content.seo[0].title",
          component: "seo",
          message: "Missing meta title",
        });
      } else {
        if (seo.title.length > config.maxMetaTitleLength) {
          findings.push({
            rule: "meta-title-too-long",
            severity: "medium",
            category: "seo",
            story: slug,
            storyName: name,
            path: "content.seo[0].title",
            component: "seo",
            message: `Meta title too long (${seo.title.length}/${config.maxMetaTitleLength} chars)`,
            detail: seo.title,
          });
        }
        if (seo.title.length < config.minMetaTitleLength) {
          findings.push({
            rule: "meta-title-too-short",
            severity: "low",
            category: "seo",
            story: slug,
            storyName: name,
            path: "content.seo[0].title",
            component: "seo",
            message: `Meta title too short (${seo.title.length}/${config.minMetaTitleLength} chars)`,
            detail: seo.title,
          });
        }
      }

      if (!seo.description || seo.description.trim() === "") {
        findings.push({
          rule: "missing-meta-description",
          severity: "high",
          category: "seo",
          story: slug,
          storyName: name,
          path: "content.seo[0].description",
          component: "seo",
          message: "Missing meta description",
        });
      } else {
        if (seo.description.length > config.maxMetaDescriptionLength) {
          findings.push({
            rule: "meta-description-too-long",
            severity: "medium",
            category: "seo",
            story: slug,
            storyName: name,
            path: "content.seo[0].description",
            component: "seo",
            message: `Meta description too long (${seo.description.length}/${config.maxMetaDescriptionLength} chars)`,
            detail: seo.description.substring(0, 80) + "…",
          });
        }
        if (seo.description.length < config.minMetaDescriptionLength) {
          findings.push({
            rule: "meta-description-too-short",
            severity: "low",
            category: "seo",
            story: slug,
            storyName: name,
            path: "content.seo[0].description",
            component: "seo",
            message: `Meta description too short (${seo.description.length}/${config.minMetaDescriptionLength} chars)`,
            detail: seo.description,
          });
        }
      }

      const ogImage = seo.image;
      if (isEmptyAsset(ogImage)) {
        findings.push({
          rule: "missing-og-image",
          severity: "medium",
          category: "seo",
          story: slug,
          storyName: name,
          path: "content.seo[0].image",
          component: "seo",
          message: "Missing Open Graph image",
        });
      }
    }

    // ── FRESHNESS RULES ─────────────────────────────────────────
    if (story.updated_at) {
      const updatedAt = new Date(story.updated_at);
      const months = monthsBetween(updatedAt, now);
      if (months >= config.staleMonths) {
        findings.push({
          rule: "stale-content",
          severity: "medium",
          category: "freshness",
          story: slug,
          storyName: name,
          path: "",
          component: contentType,
          message: `Content not updated in ${months} months (since ${
            updatedAt.toISOString().split("T")[0]
          })`,
        });
      }
    }

    if (!story.published_at) {
      findings.push({
        rule: "never-published",
        severity: "info",
        category: "freshness",
        story: slug,
        storyName: name,
        path: "",
        component: contentType,
        message: "Story has never been published",
      });
    }

    if (
      story.published_at &&
      story.updated_at &&
      story.updated_at > story.published_at
    ) {
      const pubDate = new Date(story.published_at);
      const updDate = new Date(story.updated_at);
      if (updDate.getTime() - pubDate.getTime() > 60000) {
        findings.push({
          rule: "unpublished-changes",
          severity: "info",
          category: "freshness",
          story: slug,
          storyName: name,
          path: "",
          component: contentType,
          message: `Has unpublished changes (last update: ${
            updDate.toISOString().split("T")[0]
          }, last publish: ${pubDate.toISOString().split("T")[0]})`,
        });
      }
    }

    // ── STRUCTURAL RULES ────────────────────────────────────────
    if (contentType === "page" && Array.isArray(content.section)) {
      let heroCount = 0;
      for (const section of content.section) {
        if (Array.isArray(section.components)) {
          for (const comp of section.components) {
            if (comp.component === "hero") heroCount++;
          }
        }
      }
      if (heroCount > 1) {
        findings.push({
          rule: "duplicate-heroes",
          severity: "medium",
          category: "content",
          story: slug,
          storyName: name,
          path: "content.section",
          component: "page",
          message: `Page has ${heroCount} hero components (usually should be 1)`,
        });
      }
    }

    if (
      contentType === "page" &&
      Array.isArray(content.section) &&
      content.section.length < 2
    ) {
      findings.push({
        rule: "sparse-page",
        severity: "low",
        category: "content",
        story: slug,
        storyName: name,
        path: "content.section",
        component: "page",
        message: `Page has only ${content.section.length} section(s) — may be incomplete`,
      });
    }

    if (contentType === "page") {
      const totalText = countTextContent(content);
      if (totalText < 200 && totalText > 0) {
        findings.push({
          rule: "thin-content",
          severity: "medium",
          category: "content",
          story: slug,
          storyName: name,
          path: "",
          component: "page",
          message: `Page has very little text content (${totalText} chars total)`,
        });
      }
    }

    // Walk the full content tree
    walkContent(content, "content", slug, name, config, findings);

    // ── COMPOSITIONAL QUALITY RULES ─────────────────────────────
    // Run checkCompositionalQuality() when validation rules are available.
    // This detects structural anti-patterns like duplicate heroes, sparse
    // sub-items, adjacent same-type sections, missing CTAs, redundant
    // headlines, competing buttons, and first-section spacing issues.
    if (options.validationRulesMap) {
      const rules = options.validationRulesMap.get(contentType);
      if (rules) {
        // Find the section array — varies by content type
        const sectionField = rules.rootArrayFields[0];
        const sections = sectionField ? content[sectionField] : null;
        if (Array.isArray(sections) && sections.length > 0) {
          try {
            const warnings = checkCompositionalQuality(sections, rules, {
              format: "storyblok",
            });
            for (const w of warnings) {
              findings.push({
                rule: warningToRuleName(w),
                severity: warningLevelToSeverity(w.level),
                category: "composition",
                story: slug,
                storyName: name,
                path: w.path || `content.${sectionField}`,
                component: contentType,
                message: w.message,
                detail: w.suggestion,
              });
            }
          } catch {
            // Non-fatal — skip compositional checks for this story
          }
        }
      }
    }
  }

  // Step 3: Build summary
  onProgress(3, 3, "Building report…");
  const summary: AuditSummary = {
    totalStories: stories.length,
    totalFindings: findings.length,
    byCategory: {},
    bySeverity: { high: 0, medium: 0, low: 0, info: 0 },
    byRule: {},
    healthScore: 0,
  };

  for (const f of findings) {
    if (!summary.byCategory[f.category]) {
      summary.byCategory[f.category] = {
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
        total: 0,
      };
    }
    summary.byCategory[f.category][f.severity]++;
    summary.byCategory[f.category].total++;
    summary.bySeverity[f.severity]++;
    summary.byRule[f.rule] = (summary.byRule[f.rule] || 0) + 1;
  }

  summary.healthScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        100 -
          summary.bySeverity.high * 3 -
          summary.bySeverity.medium * 1.5 -
          summary.bySeverity.low * 0.5
      )
    )
  );

  // Build top offenders
  const storyCounts: Record<
    string,
    { name: string; high: number; medium: number; low: number; total: number }
  > = {};
  for (const f of findings) {
    if (f.severity === "info") continue;
    if (!storyCounts[f.story]) {
      storyCounts[f.story] = {
        name: f.storyName,
        high: 0,
        medium: 0,
        low: 0,
        total: 0,
      };
    }
    storyCounts[f.story][f.severity as "high" | "medium" | "low"]++;
    storyCounts[f.story].total++;
  }

  const topOffenders = Object.entries(storyCounts)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)
    .map(([slug, data]) => ({ slug, ...data }));

  return {
    generatedAt: now.toISOString(),
    config,
    summary,
    findings,
    topOffenders,
  };
}
