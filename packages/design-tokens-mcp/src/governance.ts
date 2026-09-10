import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { COMPONENT_TOKEN_FILES } from "./constants.js";
import {
  classifyTokenValue,
  parseAllTokens,
  parseAllComponentTokens,
  parseComponentTokenName,
} from "./parser.js";
import type {
  DesignRule,
  TokenUsage,
  Violation,
  AuditResult,
  ValidationResult,
} from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RULES_DIR = path.join(__dirname, "..", "rules");

/** Cached design rules — loaded once from rules/*.json */
let _cachedRules: DesignRule[] | null = null;

// ── Rule loading ────────────────────────────────────────────────────────────

/**
 * Load all design rules from rules/*.json files. Caches in memory after first load.
 */
export async function loadDesignRules(): Promise<DesignRule[]> {
  if (_cachedRules) return _cachedRules;

  const rules: DesignRule[] = [];
  try {
    await fs.access(RULES_DIR);
    const files = await fs.readdir(RULES_DIR);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    for (const file of jsonFiles) {
      try {
        const content = await fs.readFile(path.join(RULES_DIR, file), "utf-8");
        const rule = JSON.parse(content) as DesignRule;
        (rule as DesignRule & { _sourceFile: string })._sourceFile = file;
        rules.push(rule);
      } catch (e) {
        console.error(
          `Warning: failed to parse rule file ${file}: ${(e as Error).message}`
        );
      }
    }
  } catch {
    console.error(
      "Warning: rules/ directory not found, governance layer disabled"
    );
  }

  _cachedRules = rules;
  return rules;
}

// ── Token existence check ───────────────────────────────────────────────────

/**
 * Check if a token name exists in the system (global + component tokens).
 */
export async function validateTokenExistence(
  tokenName: string
): Promise<boolean> {
  const normalized = tokenName.startsWith("--") ? tokenName : `--${tokenName}`;

  const globalTokens = await parseAllTokens();
  if (globalTokens.has(normalized)) return true;

  const componentTokens = await parseAllComponentTokens();
  for (const ct of componentTokens) {
    if (ct.name === normalized) return true;
  }

  return false;
}

// ── Helper classifiers ──────────────────────────────────────────────────────

/**
 * Extract the typography category from a token name.
 */
export function extractTypographyCategory(tokenName: string): string | null {
  if (tokenName.includes("-display")) return "display";
  if (tokenName.includes("-copy")) return "copy";
  if (tokenName.includes("-interface")) return "interface";
  if (tokenName.includes("-mono")) return "mono";
  return null;
}

/**
 * Check if a token is a primitive color token (should use semantic layer instead).
 */
export function isPrimitiveColorToken(tokenName: string): boolean {
  const primitivePatterns = [
    /^--ks-color-primary-alpha-/,
    /^--ks-color-primary-to-/,
    /^--ks-color-primary-inverted-alpha-/,
    /^--ks-color-primary-inverted-to-/,
    /^--ks-color-fg-alpha-/,
    /^--ks-color-fg-to-/,
    /^--ks-color-fg-inverted-/,
    /^--ks-color-bg-inverted/,
    /^--ks-color-link-to-/,
    /^--ks-color-link-inverted-to-/,
    /^--ks-color-positive-alpha-/,
    /^--ks-color-positive-to-/,
    /^--ks-color-negative-alpha-/,
    /^--ks-color-negative-to-/,
    /^--ks-color-notice-alpha-/,
    /^--ks-color-notice-to-/,
    /^--ks-color-informative-alpha-/,
    /^--ks-color-informative-to-/,
  ];
  return primitivePatterns.some((p) => p.test(tokenName));
}

// ── Hardcoded value detection ───────────────────────────────────────────────

/**
 * Detect hardcoded values that should use tokens instead.
 */
export function detectHardcodedValue(
  value: string,
  cssProperty: string
): {
  isHardcoded: boolean;
  suggestion: string | null;
  category: string | null;
} {
  if (!value || value.includes("var("))
    return { isHardcoded: false, suggestion: null, category: null };

  const trimmed = value.trim();

  if (
    cssProperty === "color" ||
    cssProperty === "background-color" ||
    cssProperty === "border-color"
  ) {
    if (
      /^#[0-9a-fA-F]{3,8}$/.test(trimmed) ||
      /^rgba?\(/.test(trimmed) ||
      /^hsla?\(/.test(trimmed)
    ) {
      return {
        isHardcoded: true,
        suggestion:
          "Use a --ks-text-color-*, --ks-background-color-*, or --ks-border-color-* token",
        category: "hardcoded-color",
      };
    }
  }

  if (
    [
      "padding",
      "margin",
      "gap",
      "padding-top",
      "padding-bottom",
      "padding-left",
      "padding-right",
      "margin-top",
      "margin-bottom",
      "margin-left",
      "margin-right",
    ].includes(cssProperty)
  ) {
    if (/^\d+(\.\d+)?(px|rem|em)$/.test(trimmed)) {
      return {
        isHardcoded: true,
        suggestion: "Use a --ks-spacing-* token",
        category: "hardcoded-spacing",
      };
    }
  }

  if (cssProperty === "border-radius") {
    if (/^\d+(\.\d+)?(px|rem|em|%)$/.test(trimmed)) {
      return {
        isHardcoded: true,
        suggestion: "Use a --ks-border-radius-* token",
        category: "hardcoded-border-radius",
      };
    }
  }

  if (cssProperty === "font-weight") {
    if (/^\d{3}$/.test(trimmed)) {
      return {
        isHardcoded: true,
        suggestion: "Use a --ks-font-weight-* token",
        category: "hardcoded-font-weight",
      };
    }
  }

  if (cssProperty === "box-shadow") {
    if (!trimmed.includes("var(") && trimmed !== "none") {
      return {
        isHardcoded: true,
        suggestion: "Use a --ks-box-shadow-* token",
        category: "hardcoded-box-shadow",
      };
    }
  }

  return { isHardcoded: false, suggestion: null, category: null };
}

// ── Single token validation ─────────────────────────────────────────────────

/**
 * Validate a single token usage against all applicable design rules.
 */
export async function validateSingleTokenUsage(
  tokenName: string | null,
  cssProperty: string,
  element: string | null,
  designContext: string | null,
  rawValue: string | null,
  rules: DesignRule[]
): Promise<Violation[]> {
  const violations: Violation[] = [];

  // 1. Hardcoded value detection
  if (rawValue && !tokenName) {
    const { isHardcoded, suggestion, category } = detectHardcodedValue(
      rawValue,
      cssProperty
    );
    if (isHardcoded) {
      violations.push({
        severity: "critical",
        rule: "hardcoded-value",
        token: rawValue,
        message: `Hardcoded ${category} value "${rawValue}" for ${cssProperty}. This bypasses the token system and breaks theming.`,
        suggestion: suggestion || undefined,
      });
    }
    return violations;
  }

  if (!tokenName) return violations;

  // 2. Token existence check
  const exists = await validateTokenExistence(tokenName);
  if (!exists) {
    violations.push({
      severity: "critical",
      rule: "token-existence",
      token: tokenName,
      message: `Phantom token: "${tokenName}" does not exist in the design system. It will silently fail at runtime.`,
      suggestion:
        "Search for similar tokens using search_tokens or get_color_palette",
    });
    return violations;
  }

  // 3. Semantic layer check — primitive color tokens used directly
  if (isPrimitiveColorToken(tokenName)) {
    const semanticRule = rules.find((r) => r.id === "color-semantic-layer") as
      | (DesignRule & { semanticAlternatives?: Record<string, string> })
      | undefined;
    violations.push({
      severity: "warning",
      rule: "color-semantic-layer",
      token: tokenName,
      message: `Primitive color token "${tokenName}" used directly. Prefer semantic tokens (--ks-text-color-*, --ks-background-color-*, --ks-border-color-*).`,
      suggestion:
        semanticRule?.semanticAlternatives?.[cssProperty] ||
        "Use the appropriate semantic color token layer",
    });
  }

  // 4. Text-color hierarchy check
  const textColorRule = rules.find((r) => r.id === "text-color-hierarchy") as
    | (DesignRule & {
        tokens?: Record<
          string,
          {
            role: string;
            validContexts?: string[];
            invalidContexts?: string[];
            rationale?: string;
          }
        >;
      })
    | undefined;
  if (textColorRule && tokenName.startsWith("--ks-text-color-")) {
    const baseTokenName = tokenName
      .replace(/-inverted/, "")
      .replace(/-(interactive|hover|active|selected|base).*/, "");
    const tokenConfig = textColorRule.tokens?.[baseTokenName];
    if (tokenConfig && element) {
      const elementLower = element.toLowerCase();
      const contextLower = (designContext || "").toLowerCase();
      const allContext = `${elementLower} ${contextLower}`.trim();

      const stem = (s: string) =>
        s.replace(/s$/, "").replace(/ing$/, "").replace(/line$/, "line");

      const isInvalid = tokenConfig.invalidContexts?.some((ctx: string) => {
        const ctxNorm = ctx.toLowerCase().replace(/-/g, " ");
        return (
          allContext.includes(ctxNorm) ||
          ctxNorm.split(" ").some((w) => allContext.includes(stem(w)))
        );
      });

      if (isInvalid) {
        const validTokens = Object.entries(textColorRule.tokens!)
          .filter(([, cfg]) =>
            cfg.validContexts?.some((ctx: string) => {
              const ctxNorm = ctx.toLowerCase().replace(/-/g, " ");
              return (
                allContext.includes(ctxNorm) ||
                ctxNorm.split(" ").some((w) => allContext.includes(stem(w)))
              );
            })
          )
          .map(([name]) => name);

        violations.push({
          severity: "warning",
          rule: "text-color-hierarchy",
          token: tokenName,
          element,
          cssProperty,
          message: `"${tokenName}" used for "${element}"${
            designContext ? ` in ${designContext} context` : ""
          } — this token is for ${tokenConfig.role}.`,
          suggestion:
            validTokens.length > 0
              ? `Consider using ${validTokens.join(" or ")} instead`
              : `Check the text-color hierarchy for the appropriate token`,
        });
      }
    }
  }

  // 5. Background-color layer check
  const bgRule = rules.find((r) => r.id === "background-color-layers") as
    | (DesignRule & {
        tokens?: Record<
          string,
          { role: string; invalidContexts?: string[]; rationale?: string }
        >;
      })
    | undefined;
  if (bgRule && tokenName.startsWith("--ks-background-color-")) {
    const baseTokenName = tokenName
      .replace(/-inverted/, "")
      .replace(
        /-(interactive|hover|active|selected|disabled|base|translucent).*/,
        ""
      );
    const tokenConfig = bgRule.tokens?.[baseTokenName];
    if (tokenConfig && element) {
      const allContext = `${element.toLowerCase()} ${(
        designContext || ""
      ).toLowerCase()}`.trim();
      const isInvalid = tokenConfig.invalidContexts?.some((ctx: string) =>
        allContext.includes(ctx.toLowerCase().replace(/-/g, " "))
      );
      if (isInvalid) {
        violations.push({
          severity: "info",
          rule: "background-color-layers",
          token: tokenName,
          element,
          cssProperty,
          message: `"${tokenName}" used for "${element}"${
            designContext ? ` in ${designContext} context` : ""
          } — this token is for ${tokenConfig.role}.`,
          suggestion: `Check background-color layer hierarchy for the appropriate token`,
        });
      }
    }
  }

  // 6. Font-family role check
  const fontFamilyRule = rules.find((r) => r.id === "font-family-roles") as
    | (DesignRule & {
        tokens?: Record<
          string,
          { role: string; invalidContexts?: string[]; rationale?: string }
        >;
      })
    | undefined;
  if (fontFamilyRule && tokenName.startsWith("--ks-font-family-")) {
    const tokenConfig = fontFamilyRule.tokens?.[tokenName];
    if (tokenConfig && element) {
      const allContext = `${element.toLowerCase()} ${(
        designContext || ""
      ).toLowerCase()}`;
      const isInvalid = tokenConfig.invalidContexts?.some((ctx: string) =>
        allContext.includes(ctx.toLowerCase().replace(/-/g, " "))
      );
      if (isInvalid) {
        violations.push({
          severity: "warning",
          rule: "font-family-roles",
          token: tokenName,
          element,
          cssProperty,
          message: `"${tokenName}" used for "${element}" — this font family is for ${tokenConfig.role}.`,
          suggestion: `Check font-family role assignments for the appropriate token`,
        });
      }
    }
  }

  return violations;
}

// ── Batch validation ────────────────────────────────────────────────────────

/**
 * Validate a set of token usages and return all violations.
 */
export async function validateTokenUsages(
  context: string,
  designContext: string | null,
  tokenUsages: TokenUsage[]
): Promise<ValidationResult> {
  const rules = await loadDesignRules();
  const violations: Violation[] = [];
  let cleanCount = 0;

  for (const usage of tokenUsages) {
    const tokenViolations = await validateSingleTokenUsage(
      usage.token || null,
      usage.cssProperty,
      usage.element || null,
      designContext || null,
      usage.value || null,
      rules
    );

    if (tokenViolations.length === 0) {
      cleanCount++;
    } else {
      violations.push(...tokenViolations);
    }
  }

  // Cross-usage checks: typography pairing
  const typoPairingRule = rules.find((r) => r.id === "typography-pairing");
  if (typoPairingRule) {
    const typoCategories: Record<
      string,
      Record<string, { token: string; category: string }>
    > = {};
    for (const usage of tokenUsages) {
      if (usage.token) {
        const cat = extractTypographyCategory(usage.token);
        if (cat) {
          const el = usage.element || "_root";
          if (!typoCategories[el]) {
            typoCategories[el] = {};
          }
          const prop = usage.cssProperty;
          if (prop.includes("font-size") || prop === "font-size") {
            typoCategories[el].fontSize = { token: usage.token, category: cat };
          } else if (prop.includes("line-height") || prop === "line-height") {
            typoCategories[el].lineHeight = {
              token: usage.token,
              category: cat,
            };
          } else if (prop.includes("font-family") || prop === "font-family") {
            typoCategories[el].fontFamily = {
              token: usage.token,
              category: cat,
            };
          }
        }
      }
    }

    for (const [element, cats] of Object.entries(typoCategories)) {
      const categories = new Set(Object.values(cats).map((c) => c.category));
      if (categories.size > 1) {
        const details = Object.entries(cats)
          .map(([prop, c]) => `${prop}: ${c.token} (${c.category})`)
          .join(", ");
        violations.push({
          severity: "warning",
          rule: "typography-pairing",
          token: Object.values(cats)
            .map((c) => c.token)
            .join(", "),
          element,
          message: `Typography category mismatch in "${element}": ${details}. Font-size and line-height should come from the same category.`,
          suggestion: `Align all typography tokens to the same category (display, copy, interface, or mono)`,
        });
      }
    }
  }

  return {
    context,
    designContext: designContext || null,
    totalUsages: tokenUsages.length,
    violations,
    summary: {
      total: violations.length,
      critical: violations.filter((v) => v.severity === "critical").length,
      warning: violations.filter((v) => v.severity === "warning").length,
      info: violations.filter((v) => v.severity === "info").length,
    },
  };
}

// ── Token recommendations ───────────────────────────────────────────────────

/**
 * Recommend tokens for a given design context and CSS property.
 */
export async function recommendTokenForContext(
  cssProperty: string,
  element: string,
  designContext: string | null,
  options: { interactive?: boolean; inverted?: boolean } = {}
): Promise<Record<string, unknown>> {
  const rules = await loadDesignRules();
  const recommendations: Record<string, unknown>[] = [];
  const avoid: Record<string, unknown>[] = [];
  const elementLower = element.toLowerCase();
  const contextLower = (designContext || "").toLowerCase();
  const allContext = `${elementLower} ${contextLower}`;

  // Find applicable rules based on CSS property
  const applicableRules: DesignRule[] = [];

  const ruleMap: Record<string, string> = {
    color: "text-color-hierarchy",
    "background-color": "background-color-layers",
    "font-family": "font-family-roles",
    "box-shadow": "elevation-hierarchy",
    "border-radius": "border-radius-scale",
    padding: "spacing-scale",
    margin: "spacing-scale",
    gap: "spacing-scale",
    transition: "transition-consistency",
  };

  const ruleId = ruleMap[cssProperty];
  if (ruleId) {
    const rule = rules.find((r) => r.id === ruleId);
    if (rule) applicableRules.push(rule);
  }

  for (const rule of applicableRules) {
    // Handle scale-based rules
    const scale = (rule as Record<string, unknown>).scale as
      | Array<Record<string, unknown>>
      | undefined;
    if (scale) {
      for (const level of scale) {
        const validContexts = level.validContexts as string[] | undefined;
        const invalidContexts = level.invalidContexts as string[] | undefined;

        const matchesValid = validContexts?.some((ctx: string) =>
          allContext.includes(ctx.toLowerCase().replace(/-/g, " "))
        );
        const matchesInvalid = invalidContexts?.some((ctx: string) =>
          allContext.includes(ctx.toLowerCase().replace(/-/g, " "))
        );

        if (matchesValid && !matchesInvalid) {
          const rec: Record<string, unknown> = {
            rank: recommendations.length + 1,
            token: level.token,
            confidence: "high",
            rationale: `${level.label}: ${level.purpose}`,
          };
          if (
            (level as Record<string, unknown>).hoverToken &&
            options.interactive
          ) {
            rec.interactiveStates = {
              hover: (level as Record<string, unknown>).hoverToken,
            };
          }
          recommendations.push(rec);
        } else if (matchesInvalid) {
          avoid.push({
            token: level.token,
            reason: `${level.label} elevation is for ${level.purpose} — not appropriate for ${element}`,
          });
        }
      }
    }

    // Handle token-map rules
    const tokens = (rule as Record<string, unknown>).tokens as
      | Record<string, Record<string, unknown>>
      | undefined;
    if (tokens) {
      const pairingRules = (rule as Record<string, unknown>).pairingRules as
        | Array<Record<string, unknown>>
        | undefined;

      for (const [tokenName, config] of Object.entries(tokens)) {
        const validContexts = config.validContexts as string[] | undefined;
        const invalidContexts = config.invalidContexts as string[] | undefined;

        const matchesValid = validContexts?.some((ctx: string) =>
          allContext.includes(ctx.toLowerCase().replace(/-/g, " "))
        );
        const matchesInvalid = invalidContexts?.some((ctx: string) =>
          allContext.includes(ctx.toLowerCase().replace(/-/g, " "))
        );

        const resolvedToken =
          options.inverted && !tokenName.includes("-inverted")
            ? tokenName.replace(/(--ks-[a-z-]+)/, "$1-inverted")
            : tokenName;

        if (matchesValid && !matchesInvalid) {
          const rec: Record<string, unknown> = {
            rank: recommendations.length + 1,
            token: resolvedToken,
            confidence: "high",
            rationale: config.role,
          };

          const pairing = pairingRules?.find(
            (p) => p.token === tokenName || p.fontFamily === tokenName
          );
          if (pairing) {
            const pairWith: Record<string, unknown>[] = [];
            if (pairing.expectedFontFamily) {
              pairWith.push({
                cssProperty: "font-family",
                token: pairing.expectedFontFamily,
              });
            }
            if (pairing.expectedLineHeight) {
              pairWith.push({
                cssProperty: "line-height",
                pattern: pairing.expectedLineHeight,
              });
            }
            if (pairing.expectedFontSize) {
              pairWith.push({
                cssProperty: "font-size",
                pattern: pairing.expectedFontSize,
              });
            }
            if (pairing.expectedTextColor) {
              pairWith.push({
                cssProperty: "color",
                token: pairing.expectedTextColor,
              });
            }
            if (pairWith.length > 0) rec.pairWith = pairWith;
          }

          if (options.interactive) {
            const interactiveBase = `${resolvedToken}-interactive`;
            rec.interactiveStates = {
              base: interactiveBase,
              hover: `${interactiveBase}-hover`,
              active: `${interactiveBase}-active`,
            };
          }

          recommendations.push(rec);
        } else if (matchesInvalid) {
          avoid.push({
            token: tokenName,
            reason: `${config.role} — not appropriate for ${element}. ${
              config.rationale || ""
            }`,
          });
        }
      }
    }
  }

  // If no specific match, return full hierarchy for the property
  if (recommendations.length === 0 && applicableRules.length > 0) {
    const rule = applicableRules[0];
    const tokens = (rule as Record<string, unknown>).tokens as
      | Record<string, Record<string, unknown>>
      | undefined;
    const scale = (rule as Record<string, unknown>).scale as
      | Array<Record<string, unknown>>
      | undefined;

    if (tokens) {
      for (const [tokenName, config] of Object.entries(tokens)) {
        recommendations.push({
          rank: recommendations.length + 1,
          token: tokenName,
          confidence: "low",
          rationale: `${config.role} — review if this matches your "${element}" context`,
        });
      }
    }
    if (scale) {
      for (const level of scale) {
        recommendations.push({
          rank: recommendations.length + 1,
          token: level.token,
          confidence: "low",
          rationale: `${level.label}: ${level.purpose} — review if this matches your "${element}" context`,
        });
      }
    }
  }

  return {
    cssProperty,
    element,
    designContext: designContext || "unspecified",
    recommendations,
    avoid,
  };
}

// ── Token hierarchy ─────────────────────────────────────────────────────────

/**
 * Get the semantic hierarchy for a token category.
 */
export async function getTokenHierarchy(
  category: string
): Promise<Record<string, unknown>> {
  const rules = await loadDesignRules();

  const categoryRuleMap: Record<string, string> = {
    "text-color": "text-color-hierarchy",
    "background-color": "background-color-layers",
    elevation: "elevation-hierarchy",
    "font-family": "font-family-roles",
    "font-size": "typography-pairing",
    spacing: "spacing-scale",
    "border-radius": "border-radius-scale",
    "line-height": "typography-pairing",
    transition: "transition-consistency",
  };

  const ruleId = categoryRuleMap[category];
  if (!ruleId) {
    return {
      error: `Unknown category: ${category}. Available: ${Object.keys(
        categoryRuleMap
      ).join(", ")}`,
    };
  }

  const rule = rules.find((r) => r.id === ruleId);
  if (!rule) {
    return { error: `Rule "${ruleId}" not found in rules/ directory` };
  }

  const result: Record<string, unknown> = {
    category,
    ruleId: rule.id,
    name: (rule as Record<string, unknown>).name,
    description: (rule as Record<string, unknown>).description,
    severity: rule.severity,
  };

  const scale = (rule as Record<string, unknown>).scale as
    | Array<Record<string, unknown>>
    | undefined;
  const tokens = (rule as Record<string, unknown>).tokens as
    | Record<string, Record<string, unknown>>
    | undefined;

  if (scale) {
    result.hierarchy = scale;
  }
  if (tokens) {
    result.hierarchy = Object.entries(tokens).map(([name, config], i) => ({
      level: i + 1,
      token: name,
      role: config.role,
      validContexts: config.validContexts,
      invalidContexts: config.invalidContexts,
      rationale: config.rationale,
    }));
  }

  const pairingRules = (rule as Record<string, unknown>).pairingRules;
  if (pairingRules) result.pairingRules = pairingRules;

  const categories = (rule as Record<string, unknown>).categories;
  if (categories) result.typographyCategories = categories;

  const spacingTypes = (rule as Record<string, unknown>).spacingTypes;
  if (spacingTypes) result.spacingTypes = spacingTypes;

  return result;
}

// ── Component audit ─────────────────────────────────────────────────────────

/**
 * Audit all tokens for a single component against design rules.
 */
export async function auditComponentTokens(
  componentSlug: string
): Promise<AuditResult | { error: string }> {
  const config = COMPONENT_TOKEN_FILES[componentSlug];
  if (!config) {
    return {
      error: `Component "${componentSlug}" not found. Use list_components to see available components.`,
    };
  }

  const tokens = await parseAllComponentTokens(componentSlug);
  const rules = await loadDesignRules();
  const violations: Violation[] = [];

  // Track state tokens for completeness checks
  const stateMap: Record<string, { states: Set<string>; tokens: string[] }> =
    {};

  for (const token of tokens) {
    const { valueType, referencedToken } = classifyTokenValue(token.value);

    // Check referenced token existence
    if (referencedToken) {
      const exists = await validateTokenExistence(referencedToken);
      if (!exists) {
        violations.push({
          severity: "critical",
          rule: referencedToken.startsWith("--dsa-")
            ? "component-reference-validity"
            : "token-existence",
          token: token.name,
          message: `Token "${token.name}" references "${referencedToken}" which does not exist in the design system.`,
          suggestion: "Search for the correct token name using search_tokens",
        });
      }

      if (isPrimitiveColorToken(referencedToken)) {
        violations.push({
          severity: "warning",
          rule: "color-semantic-layer",
          token: token.name,
          message: `Token "${token.name}" references primitive color "${referencedToken}". Prefer semantic color tokens.`,
          suggestion:
            "Use --ks-text-color-*, --ks-background-color-*, or --ks-border-color-* instead",
        });
      }
    }

    // Check hardcoded values
    if (valueType === "literal" && token.value) {
      const { isHardcoded, suggestion, category } = detectHardcodedValue(
        token.value,
        token.cssProperty
      );
      if (isHardcoded) {
        violations.push({
          severity: "critical",
          rule: "hardcoded-value",
          token: token.name,
          message: `Hardcoded ${category} value "${token.value}" in ${token.cssProperty}. Use a design token instead.`,
          suggestion: suggestion || undefined,
        });
      }
    }

    // Track states for completeness check
    if (token.state) {
      const key = `${token.variant || "_base"}::${token.cssProperty}`;
      if (!stateMap[key]) stateMap[key] = { states: new Set(), tokens: [] };
      stateMap[key].states.add(token.state);
      stateMap[key].tokens.push(token.name);
    }
  }

  // Interactive state completeness check
  const stateRule = rules.find(
    (r) => r.id === "interactive-state-completeness"
  ) as
    | (DesignRule & {
        stateGroups?: Record<string, { requiredStates?: string[] }>;
      })
    | undefined;
  if (stateRule) {
    for (const [key, data] of Object.entries(stateMap)) {
      const colorProps = ["color", "background-color", "border-color"];
      const [, prop] = key.split("::");
      if (colorProps.includes(prop)) {
        const required = stateRule.stateGroups?.["color-states"]
          ?.requiredStates || ["hover", "active"];
        const missing = required.filter((s) => !data.states.has(s));
        if (missing.length > 0) {
          violations.push({
            severity: "warning",
            rule: "interactive-state-completeness",
            token: data.tokens.join(", "),
            message: `Incomplete interactive states for ${key}: has [${[
              ...data.states,
            ].join(", ")}] but missing [${missing.join(", ")}].`,
            suggestion: `Add ${missing
              .map((s) => `_${s}`)
              .join(", ")} state token(s) for complete interaction feedback`,
          });
        }
      }
    }
  }

  // Sort violations by severity
  const severityOrder: Record<string, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  violations.sort(
    (a, b) =>
      (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2)
  );

  return {
    component: componentSlug,
    file: config.file,
    totalTokens: tokens.length,
    violations,
    summary: {
      total: violations.length,
      critical: violations.filter((v) => v.severity === "critical").length,
      warning: violations.filter((v) => v.severity === "warning").length,
      info: violations.filter((v) => v.severity === "info").length,
    },
  };
}

/**
 * Batch audit across all components, returning a summary table.
 */
export async function auditAllComponents(
  category: string = "all",
  minSeverity: string = "info"
): Promise<Record<string, unknown>> {
  const severityOrder: Record<string, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  const minSev = severityOrder[minSeverity] ?? 2;

  const components = Object.entries(COMPONENT_TOKEN_FILES)
    .filter(([_slug, config]) => {
      if (category === "all") return true;
      return config.category === category;
    })
    .map(([slug]) => slug)
    .sort();

  const results: Record<string, unknown>[] = [];
  let totalCritical = 0;
  let totalWarning = 0;
  let totalInfo = 0;
  let totalTokens = 0;

  for (const slug of components) {
    const audit = await auditComponentTokens(slug);
    if ("error" in audit) continue;

    const filteredViolations = audit.violations.filter(
      (v) => (severityOrder[v.severity] ?? 2) <= minSev
    );

    const crit = filteredViolations.filter(
      (v) => v.severity === "critical"
    ).length;
    const warn = filteredViolations.filter(
      (v) => v.severity === "warning"
    ).length;
    const info = filteredViolations.filter((v) => v.severity === "info").length;

    totalCritical += crit;
    totalWarning += warn;
    totalInfo += info;
    totalTokens += audit.totalTokens;

    results.push({
      component: slug,
      category: COMPONENT_TOKEN_FILES[slug].category,
      tokens: audit.totalTokens,
      critical: crit,
      warning: warn,
      info,
      total: crit + warn + info,
    });
  }

  return {
    scope: category === "all" ? "All components" : `Category: ${category}`,
    componentsScanned: results.length,
    totalTokens,
    summary: results,
    totals: {
      critical: totalCritical,
      warning: totalWarning,
      info: totalInfo,
      total: totalCritical + totalWarning + totalInfo,
    },
  };
}
