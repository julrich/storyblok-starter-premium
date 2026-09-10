# PRD: Design Intent & Governance Layer for the Design Token MCP

**Version:** 1.0  
**Date:** 2026-02-22  
**Status:** Draft  
**Inspired by:** [Encoding Governance on Agentic Design Systems](https://www.designsystemscollective.com/encoding-governance-on-agentic-design-systems-1a8c70420fec) by Cristian Morales Achiardi (Design Systems Collective, Feb 2026)

---

## 1. Context & Motivation

### 1.1 Where we are today

The Design Token MCP server (v4.0.0) already provides a solid **existence layer**: AI agents can discover, query, search, and update ~530 component tokens and ~1,400+ global tokens across 62 files. Tools like `get_component_tokens`, `search_tokens`, `get_color_palette`, and `get_typography_tokens` let an agent answer "what tokens exist?" and "what value does this token have?"

This is equivalent to what the article calls the **v1 auditor** — it checks existence. It can tell an agent which tokens are available. But it cannot tell an agent:

- **Which token is the _right_ one** for a given design context
- **Why** a particular token exists and when it should (or shouldn't) be used
- Whether a combination of tokens **violates the design intent** even when each token is individually valid
- What the **semantic hierarchy** is across token categories (e.g., which text-color tokens are for headings vs. body vs. placeholders)

### 1.2 The gap the article identifies

The article's core insight: the gap between _syntactically valid_ and _semantically right_ is where design decisions dissolve. An AI agent can pick `--ks-text-color-interface` for body copy and it will compile, render, and pass any automated check — but it's the wrong token for that purpose. That's an **intent violation**, not a syntax error.

Today our MCP has no way to encode or communicate this distinction. An agent using our tools gets a flat list of tokens with values and categories, but no understanding of _which token belongs where_ or _what relationships tokens should maintain_.

### 1.3 What this PRD proposes

Extend the Design Token MCP with an **intent and governance layer** that:

1. Encodes **design rules** as structured, queryable metadata alongside the tokens themselves
2. Provides new MCP tools that let agents **validate token usage against intent** (not just existence)
3. Surfaces **semantic hierarchies** — the relationships between tokens that constitute "correct" usage
4. Offers **severity-classified feedback** when token usage violates design decisions

---

## 2. Goals

| #   | Goal                                                                                                 | Success Metric                                                                                                          |
| --- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| G1  | **Encode intent** — design rules expressed as structured data the MCP can serve                      | ≥15 rules covering color hierarchy, typography pairing, spacing scale, elevation coherence, and background layer intent |
| G2  | **Validate usage** — a new tool that accepts a set of token references and returns intent violations | Agent can submit a component's token usage and receive classified violations (critical / warning / info)                |
| G3  | **Guide selection** — a new tool that recommends the right token for a design context                | Agent can ask "which token for body text color?" and get a ranked answer with rationale                                 |
| G4  | **Surface hierarchy** — expose the semantic relationships between tokens                             | Agent can query the foreground-color hierarchy, the typography scale ordering, the elevation levels, etc.               |
| G5  | **Severity classification** — violations are categorized by impact                                   | Three tiers: Critical (must fix), Warning (should fix), Info (note for awareness), matching the article's model         |
| G6  | **Composability** — rules are modular and extensible                                                 | New rules can be added without modifying MCP tool code; rules live in a data layer                                      |

---

## 3. Non-Goals

- **Automated fixing** — the MCP will flag violations and suggest alternatives, but will not auto-rewrite token values. Fixing is the agent's (or human's) responsibility.
- **Visual rendering** — the MCP will not render components to verify visual correctness.
- **CI/CD integration** — this PRD scopes the MCP tool surface. A future iteration could expose a batch-audit endpoint for pipeline integration.
- **Component-level metadata schema** — structured metadata per component (like Enara's `.metadata.ts` files) is a separate concern; this PRD focuses on the token-level governance layer.

---

## 4. Design Rules Taxonomy

Based on the article's severity definitions and intent violation categories, adapted to the kickstartDS token system:

### 4.1 Severity Definitions

| Level        | Categories                                                                                                                                                                                          | Impact                                                               | Action                           |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------- |
| **Critical** | Phantom tokens (referenced but don't exist), Hardcoded colors bypassing the token system                                                                                                            | Breaks theming, silently fails at runtime                            | Must fix                         |
| **Warning**  | Typography hierarchy misuse, Foreground/text-color role misuse, Raw primitive color reference bypassing semantic layer, Hardcoded spacing/radius/shadow values where tokens exist, Off-scale values | Inconsistent with design decisions, breaks rhythm or semantic intent | Should fix                       |
| **Info**     | Elevation-size coherence notes, Background layer intent observations, Transition/motion inconsistencies, Undecided area notes                                                                       | Minor design intent mismatch or area needing future design work      | Nice to fix / Note for awareness |

### 4.2 Rule Categories

#### A. Token Existence (already partially covered by v1)

| Rule            | Check                                                         | Current Coverage                                                     |
| --------------- | ------------------------------------------------------------- | -------------------------------------------------------------------- |
| Phantom token   | `var(--ks-*)` reference doesn't match any token in the system | ❌ Not covered — agent can search but has no "does this exist?" tool |
| Hardcoded value | Literal CSS color / spacing / shadow where a token exists     | ❌ Not covered                                                       |

#### B. Semantic Hierarchy Rules (new — intent layer)

| Rule ID                               | Rule                                                               | Severity | What to Flag                                                                                                                                                                                                |
| ------------------------------------- | ------------------------------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `text-color-hierarchy`                | Text-color tokens have distinct semantic roles                     | Warning  | Using `--ks-text-color-interface` for body copy (it's for UI chrome), using `--ks-text-color-display` for form labels (it's for headings), using `--ks-text-color-copy` for navigation (it's for body text) |
| `text-color-state-pairing`            | Interactive text-color states must be used together                | Warning  | Using `--ks-text-color-*-interactive-hover` without the corresponding base interactive token                                                                                                                |
| `background-color-layer`              | Background tokens encode visual layer intent                       | Info     | Using `--ks-background-color-card` for a page section (it's for elevated card surfaces), using `--ks-background-color-default` for a floating overlay (it's for page-level backgrounds)                     |
| `background-color-state-completeness` | Interactive backgrounds need all states                            | Warning  | Defining a hover state without the corresponding active and base states                                                                                                                                     |
| `color-semantic-vs-primitive`         | Use semantic color tokens, not raw palette references              | Warning  | Direct `--ks-color-primary-alpha-5` reference in a component token — should use `--ks-background-color-*` or `--ks-text-color-*` semantic layer instead                                                     |
| `spacing-scale-adherence`             | Spacing values should use tokens from the spacing scale            | Warning  | Hardcoded `8px` or `1.5rem` where `--ks-spacing-s` or `--ks-spacing-m` exists                                                                                                                               |
| `elevation-coherence`                 | Box-shadow levels should match component importance/size           | Info     | A small tooltip using `--ks-box-shadow-surface` (highest elevation) or a modal dialog using `--ks-box-shadow-control` (lowest elevation)                                                                    |
| `border-radius-consistency`           | Border radius should use scale tokens not arbitrary values         | Warning  | Hardcoded `4px` border-radius where `--ks-border-radius-*` exists                                                                                                                                           |
| `font-family-role`                    | Font families have designated roles                                | Warning  | Using `--ks-font-family-display` for form field labels (should be `--ks-font-family-interface`), using `--ks-font-family-copy` for hero headings (should be `--ks-font-family-display`)                     |
| `font-weight-range`                   | Font weights should stay within the defined scale                  | Warning  | Hardcoded `font-weight: 600` where `--ks-font-weight-semi-bold` exists                                                                                                                                      |
| `line-height-pairing`                 | Line heights should match their font-family category               | Warning  | Using `--ks-line-height-display-m` with `--ks-font-family-copy` (display line-height is tighter, meant for display type)                                                                                    |
| `inverted-context-consistency`        | Inverted tokens should only appear inside inverted contexts        | Info     | Using `--ks-text-color-default-inverted` outside of an `[ks-inverted]` context                                                                                                                              |
| `transition-consistency`              | Transitions should use duration/easing tokens not arbitrary values | Info     | Hardcoded `transition: 0.3s ease` where `--ks-transition-*` tokens exist                                                                                                                                    |

#### C. Component Token Intent Rules (new — cross-cutting)

| Rule ID                               | Rule                                                                         | Severity | What to Flag                                                                         |
| ------------------------------------- | ---------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------ |
| `component-token-reference-validity`  | Component tokens should reference existing global tokens                     | Critical | `--dsa-button_primary--color: var(--ks-nonexistent-token)`                           |
| `component-variant-completeness`      | Interactive variants should define all expected states                       | Warning  | A button variant defining `--color` and `--color_hover` but missing `--color_active` |
| `component-cross-reference-coherence` | Cross-component references (`--dsa-*`) should point to real component tokens | Critical | `--dsa-hero__headline--color: var(--dsa-nonexistent--color)`                         |

---

## 5. Proposed Data Model

### 5.1 Design Rule Schema

Rules are stored as structured JSON, loadable from a `rules/` directory:

```jsonc
// rules/text-color-hierarchy.json
{
  "id": "text-color-hierarchy",
  "name": "Text-Color Semantic Hierarchy",
  "description": "Text-color tokens have distinct semantic roles. Each token family is designed for a specific type of content.",
  "severity": "warning",
  "category": "semantic-hierarchy",
  "tokens": {
    "--ks-text-color-display": {
      "role": "Display headings and hero text",
      "validContexts": [
        "h1",
        "h2",
        "hero-headline",
        "cta-headline",
        "display-text",
      ],
      "invalidContexts": [
        "body-copy",
        "form-labels",
        "navigation-labels",
        "captions",
      ],
      "rationale": "Display text-color has no alpha blending — full contrast, meant for high-impact type set in --ks-font-family-display",
    },
    "--ks-text-color-default": {
      "role": "Default UI text, headings below hero level, interface labels",
      "validContexts": [
        "h3",
        "h4",
        "nav-labels",
        "card-titles",
        "section-headings",
        "ui-labels",
      ],
      "invalidContexts": ["body-copy-paragraphs", "hero-headlines"],
      "rationale": "Default uses fg-alpha-3 — slightly subdued from pure foreground, appropriate for mid-hierarchy text",
    },
    "--ks-text-color-copy": {
      "role": "Body copy, paragraph text, descriptions, long-form content",
      "validContexts": [
        "p",
        "body-text",
        "descriptions",
        "captions",
        "card-copy",
        "list-items",
      ],
      "invalidContexts": ["headings", "navigation", "buttons"],
      "rationale": "Copy text-color is optimized for reading comfort at body sizes with --ks-font-family-copy",
    },
    "--ks-text-color-interface": {
      "role": "Form inputs, controls, interactive UI chrome",
      "validContexts": [
        "input-text",
        "select-text",
        "button-labels",
        "tab-labels",
        "form-labels",
      ],
      "invalidContexts": ["body-copy", "headings", "hero-text"],
      "rationale": "Interface color uses fg-alpha-2 — designed for UI controls at --ks-font-family-interface sizes",
    },
  },
  "pairingRules": [
    {
      "token": "--ks-text-color-display",
      "expectedFontFamily": "--ks-font-family-display",
      "expectedLineHeight": "--ks-line-height-display-*",
    },
    {
      "token": "--ks-text-color-copy",
      "expectedFontFamily": "--ks-font-family-copy",
      "expectedLineHeight": "--ks-line-height-copy-*",
    },
    {
      "token": "--ks-text-color-interface",
      "expectedFontFamily": "--ks-font-family-interface",
      "expectedLineHeight": "--ks-line-height-interface-*",
    },
  ],
}
```

### 5.2 Token Hierarchy Schema

For tokens that form an ordered scale or hierarchy:

```jsonc
// rules/elevation-hierarchy.json
{
  "id": "elevation-hierarchy",
  "name": "Elevation Scale",
  "description": "Box-shadow tokens form an elevation hierarchy from subtle to prominent.",
  "severity": "info",
  "category": "hierarchy",
  "scale": [
    {
      "token": "--ks-box-shadow-control",
      "level": 1,
      "label": "Control",
      "purpose": "Form inputs, small interactive elements",
      "expectedComponentSize": "small",
    },
    {
      "token": "--ks-box-shadow-card",
      "level": 2,
      "label": "Card",
      "purpose": "Cards, teasers, elevated content blocks",
      "expectedComponentSize": "medium",
    },
    {
      "token": "--ks-box-shadow-surface",
      "level": 3,
      "label": "Surface",
      "purpose": "Modals, flyouts, overlays, prominent floating elements",
      "expectedComponentSize": "large",
    },
  ],
}
```

### 5.3 Validation Request / Response Model

```typescript
// What an agent sends to validate_token_usage
interface TokenUsageValidationRequest {
  /** Identifier for what's being validated (e.g. component name, file path) */
  context: string;
  /** The design context (e.g. "hero-section", "form-input", "card-body") */
  designContext?: string;
  /** List of token references being used */
  tokenUsages: Array<{
    token: string; // "--ks-text-color-display"
    cssProperty: string; // "color"
    element?: string; // "headline", "body", "label"
    value?: string; // raw value if not a token reference (for hardcoded detection)
  }>;
}

// What the MCP returns
interface TokenUsageValidationResponse {
  context: string;
  totalUsages: number;
  violations: Array<{
    severity: "critical" | "warning" | "info";
    ruleId: string;
    ruleName: string;
    token: string;
    message: string;
    suggestion?: string; // recommended alternative
    rationale?: string; // why this matters
  }>;
  summary: {
    critical: number;
    warning: number;
    info: number;
    clean: number; // usages with no violations
  };
}
```

---

## 6. Proposed MCP Tools

### 6.1 New tool: `validate_token_usage`

**Purpose:** Accept a set of token usages (as an agent would encounter when generating or reviewing CSS) and return intent violations.

```jsonc
{
  "name": "validate_token_usage",
  "description": "Validate a set of design token usages against the design system's intent rules. Checks not just whether tokens exist, but whether they are semantically correct for their context. Returns violations classified by severity (critical/warning/info) with suggestions for correct alternatives. Use this after generating CSS or when reviewing component styling.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "context": {
        "type": "string",
        "description": "What is being validated (e.g., 'hero component', 'contact form', 'card body text')",
      },
      "designContext": {
        "type": "string",
        "enum": [
          "hero",
          "card",
          "form",
          "navigation",
          "section",
          "modal",
          "footer",
          "body-content",
          "data-display",
        ],
        "description": "The broad design context to validate against",
      },
      "tokenUsages": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "token": {
              "type": "string",
              "description": "Token name (e.g., '--ks-text-color-display')",
            },
            "cssProperty": {
              "type": "string",
              "description": "CSS property being set (e.g., 'color', 'background-color')",
            },
            "element": {
              "type": "string",
              "description": "Element within the component (e.g., 'headline', 'body', 'label')",
            },
            "value": {
              "type": "string",
              "description": "Raw CSS value if not using a token (for hardcoded value detection)",
            },
          },
          "required": ["cssProperty"],
        },
        "description": "List of token usages to validate",
      },
    },
    "required": ["context", "tokenUsages"],
  },
}
```

### 6.2 New tool: `get_token_for_context`

**Purpose:** Given a design context and CSS property, recommend the correct token(s) with rationale.

```jsonc
{
  "name": "get_token_for_context",
  "description": "Get the recommended design token for a specific design context and CSS property. Instead of browsing all tokens, describe what you're styling and get a ranked recommendation with rationale. This encodes the design system's intent — which token is *right*, not just which tokens *exist*.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "cssProperty": {
        "type": "string",
        "description": "The CSS property you're setting (e.g., 'color', 'background-color', 'font-family', 'box-shadow', 'padding', 'border-radius')",
      },
      "element": {
        "type": "string",
        "description": "What you're styling (e.g., 'hero headline', 'card body text', 'form input', 'navigation link', 'section background', 'modal overlay')",
      },
      "designContext": {
        "type": "string",
        "enum": [
          "hero",
          "card",
          "form",
          "navigation",
          "section",
          "modal",
          "footer",
          "body-content",
          "data-display",
        ],
        "description": "The broad design context",
      },
      "interactive": {
        "type": "boolean",
        "description": "Whether the element has interactive states (hover, active, focus). If true, all required state tokens are returned.",
      },
      "inverted": {
        "type": "boolean",
        "description": "Whether the element is in an inverted (dark-on-light / light-on-dark) context.",
      },
    },
    "required": ["cssProperty", "element"],
  },
}
```

**Example response:**

```jsonc
{
  "cssProperty": "color",
  "element": "hero headline",
  "recommendations": [
    {
      "rank": 1,
      "token": "--ks-text-color-display",
      "value": "var(--ks-color-fg)",
      "confidence": "high",
      "rationale": "Display text-color is designed for high-impact headings. Hero headlines are the primary use case. Pair with --ks-font-family-display and --ks-line-height-display-* for correct typography.",
      "pairWith": [
        { "cssProperty": "font-family", "token": "--ks-font-family-display" },
        { "cssProperty": "line-height", "token": "--ks-line-height-display-l" },
      ],
    },
    {
      "rank": 2,
      "token": "--ks-text-color-on-primary",
      "value": "var(--ks-color-on-primary)",
      "confidence": "conditional",
      "rationale": "Use this only if the hero has a primary-color background. Ensures contrast compliance.",
      "condition": "background uses --ks-background-color-primary-*",
    },
  ],
  "avoid": [
    {
      "token": "--ks-text-color-copy",
      "reason": "Copy text-color is for body paragraphs, not display-level headings. It uses fg-alpha-3 which reduces contrast — wrong for hero impact.",
    },
    {
      "token": "--ks-text-color-interface",
      "reason": "Interface text-color is for form controls and UI chrome, not content headings.",
    },
  ],
}
```

### 6.3 New tool: `get_token_hierarchy`

**Purpose:** Return the semantic hierarchy for a token category, showing the intended ordering and relationships.

```jsonc
{
  "name": "get_token_hierarchy",
  "description": "Get the semantic hierarchy and relationships for a token category. Shows which tokens are designed for which level of the visual hierarchy, their intended ordering, and pairing rules. Use this to understand the design system's intent before choosing tokens.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "category": {
        "type": "string",
        "enum": [
          "text-color",
          "background-color",
          "elevation",
          "font-family",
          "font-size",
          "spacing",
          "border-radius",
          "line-height",
        ],
        "description": "The token category to get the hierarchy for",
      },
    },
    "required": ["category"],
  },
}
```

### 6.4 New tool: `get_design_rules`

**Purpose:** List all encoded design rules, or get details for a specific rule.

```jsonc
{
  "name": "get_design_rules",
  "description": "List all design intent rules encoded in the system, or get details for a specific rule. Each rule describes what's valid, what violates the intent even when syntax is correct, and the rationale behind the design decision. Use this to understand the 'why' behind token choices.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "ruleId": {
        "type": "string",
        "description": "Get details for a specific rule by ID. Omit to list all rules.",
      },
      "category": {
        "type": "string",
        "enum": [
          "semantic-hierarchy",
          "hierarchy",
          "pairing",
          "existence",
          "completeness",
        ],
        "description": "Filter rules by category",
      },
      "severity": {
        "type": "string",
        "enum": ["critical", "warning", "info"],
        "description": "Filter rules by severity level",
      },
    },
  },
}
```

### 6.5 Extended tool: `validate_component_tokens`

**Purpose:** Run the full intent audit on an existing component's token file (like the article's token-auditor skill).

```jsonc
{
  "name": "validate_component_tokens",
  "description": "Run a full design intent audit on a component's token file. Scans all token definitions for the named component and validates them against every applicable design rule. Returns a structured report with violations by severity, similar to the article's Token Audit Report v2.0.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "component": {
        "type": "string",
        "description": "Component slug to audit (e.g., 'button', 'hero', 'teaser-card'). Use list_components to discover valid names.",
      },
      "severity": {
        "type": "string",
        "enum": ["all", "critical", "warning", "info"],
        "description": "Minimum severity to report (default: 'all')",
      },
    },
    "required": ["component"],
  },
}
```

### 6.6 Extended tool: `audit_all_components`

**Purpose:** Batch audit across all components, producing a summary report like the article's Token Audit Report v2.0.

```jsonc
{
  "name": "audit_all_components",
  "description": "Run a design intent audit across all component token files. Returns a summary table with violation counts per component and severity, plus a v1↔v2 style comparison showing what the intent layer catches beyond basic existence checks.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "category": {
        "type": "string",
        "enum": [
          "navigation",
          "content",
          "blog",
          "cards",
          "heroes",
          "forms",
          "layout",
          "data-display",
          "utility",
          "all",
        ],
        "description": "Filter to a component category (default: 'all')",
      },
      "minSeverity": {
        "type": "string",
        "enum": ["critical", "warning", "info"],
        "description": "Minimum severity to include (default: 'info')",
      },
    },
  },
}
```

---

## 7. Implementation Architecture

### 7.1 New file structure

```
design-tokens-mcp/
├── index.js                       # Main MCP server (extended)
├── rules/                         # Design intent rules (new)
│   ├── text-color-hierarchy.json
│   ├── background-color-layers.json
│   ├── elevation-hierarchy.json
│   ├── font-family-roles.json
│   ├── typography-pairing.json
│   ├── spacing-scale.json
│   ├── border-radius-scale.json
│   ├── color-semantic-layer.json
│   ├── transition-consistency.json
│   ├── inverted-context.json
│   ├── interactive-state-completeness.json
│   ├── token-existence.json
│   └── component-reference-validity.json
├── tokens/                        # Existing token files (unchanged)
│   ├── *.scss
│   └── componentToken/*.scss
└── docs/
    └── PRD-intent-governance.md   # This document
```

### 7.2 New functions in `index.js`

| Function                                                                  | Purpose                                                                          |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `loadDesignRules()`                                                       | Read and parse all JSON rule files from `rules/` directory                       |
| `validateTokenExistence(tokenName)`                                       | Check if a `--ks-*` or `--dsa-*` token actually exists in the parsed token files |
| `validateTokenForContext(tokenName, cssProperty, element, designContext)` | Check a single token usage against all applicable rules, return violations       |
| `recommendTokenForContext(cssProperty, element, designContext, options)`  | Given a design context, return ranked token recommendations                      |
| `getTokenHierarchy(category)`                                             | Return the ordered hierarchy for a token category                                |
| `auditComponentTokens(componentSlug)`                                     | Run all rules against a component's token file                                   |
| `classifyViolationSeverity(ruleId, violation)`                            | Map a violation to its severity level                                            |

### 7.3 Rule evaluation engine

The rule engine is intentionally simple — pattern-matching against structured JSON rules, not a full expression language:

1. **Load rules** from `rules/*.json` at server startup (cached in memory)
2. **Match applicable rules** — given a token name and context, find rules whose token patterns match
3. **Evaluate conditions** — check `validContexts`, `invalidContexts`, `pairingRules`, etc.
4. **Emit violations** — with severity, message, suggestion, and rationale

This keeps the governance logic in **data** (JSON rules) rather than **code**, making it easy for designers to add and modify rules without touching the MCP server implementation.

---

## 8. Typical Workflows

### Workflow A — "I'm styling a hero headline, which color token should I use?"

1. `get_token_for_context({ cssProperty: "color", element: "hero headline", designContext: "hero" })`
2. → Returns `--ks-text-color-display` (rank 1) with pairing suggestions for font-family and line-height

### Workflow B — "Is my component using tokens correctly?"

1. `validate_component_tokens({ component: "hero" })`
2. → Returns audit report: 0 critical, 2 warnings (typography pairing mismatch in textbox subtitle), 1 info (elevation note)

### Workflow C — "I just generated CSS for a new card component, is it correct?"

1. Agent calls `validate_token_usage` with the token references from the generated CSS
2. → Returns: "Warning: `--ks-text-color-display` used for card body copy — should be `--ks-text-color-copy`. Display text-color is for hero/section headings."

### Workflow D — "Show me the text-color hierarchy so I understand which to pick"

1. `get_token_hierarchy({ category: "text-color" })`
2. → Returns ordered hierarchy: display (headings) → default (UI text) → copy (body) → interface (controls), with roles and pairing rules

### Workflow E — "How healthy is the whole design system?"

1. `audit_all_components({ category: "all" })`
2. → Returns summary table per component with violation counts, similar to the Token Audit Report v2.0 from the article

### Workflow F — "What design rules exist that I should know about?"

1. `get_design_rules()`
2. → Lists all rules with IDs, descriptions, severities
3. `get_design_rules({ ruleId: "text-color-hierarchy" })`
4. → Full rule detail with token roles, valid/invalid contexts, pairing rules

---

## 9. Mapping to the Article's Concepts

| Article Concept                                 | Our Equivalent                                                  | Status      |
| ----------------------------------------------- | --------------------------------------------------------------- | ----------- |
| Token existence check (v1 auditor)              | `search_tokens`, `get_token`, `get_component_tokens`            | ✅ Done     |
| Token intent check (v2 auditor)                 | `validate_token_usage`, `validate_component_tokens`             | 🆕 This PRD |
| Severity classification (Critical/Warning/Info) | Violation severity in validation responses                      | 🆕 This PRD |
| Encoded typography rules                        | `rules/typography-pairing.json`, `rules/font-family-roles.json` | 🆕 This PRD |
| Foreground hierarchy                            | `rules/text-color-hierarchy.json`                               | 🆕 This PRD |
| Background layer intent                         | `rules/background-color-layers.json`                            | 🆕 This PRD |
| Elevation coherence                             | `rules/elevation-hierarchy.json`                                | 🆕 This PRD |
| Phantom token detection                         | `validateTokenExistence()` in `validate_token_usage`            | 🆕 This PRD |
| "Make violations the harder path"               | `get_token_for_context` — agents get the right answer first     | 🆕 This PRD |
| Scaffold-component skill                        | Out of scope (component scaffolding, not token governance)      | —           |
| Codebase index / .ai relationships              | Out of scope (broader agentic infrastructure)                   | —           |
| Self-healing infrastructure                     | `audit_all_components` + `get_token_for_context` close the loop | 🆕 This PRD |

---

## 10. Phased Delivery

### Phase 1: Intent Data Layer (Foundation)

- Define and populate `rules/*.json` for all rule categories
- Implement `loadDesignRules()` and rule matching engine
- Implement `validateTokenExistence()` using existing parsed token data

### Phase 2: Validation Tools

- `validate_token_usage` tool
- `validate_component_tokens` tool
- `audit_all_components` tool

### Phase 3: Guidance Tools

- `get_token_for_context` tool
- `get_token_hierarchy` tool
- `get_design_rules` tool

### Phase 4: Quality & Polish

- Test all rules against existing 50 component token files
- Tune severity levels based on real audit results
- Add edge case handling for composite values, calc expressions, and fallback chains
- Document all rules with examples in tool descriptions

---

## 11. Risks & Mitigations

| Risk                                                                       | Mitigation                                                                                                        |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Rules encode subjective design opinions that vary per project              | Rules are in external JSON files — different design systems can ship different rule sets                          |
| Over-flagging (too many info/warning violations creates noise)             | Severity filtering in all tools; start conservative, tighten over time                                            |
| Context classification is imprecise ("hero" vs "card" is a human judgment) | Use optional `designContext` — validation still works without it, just with less specificity                      |
| Rule maintenance burden as token system evolves                            | Rules reference token name patterns, not absolute lists — `--ks-text-color-*` catches new additions automatically |
| Performance with 15+ rule files × 50 component files                       | Rules loaded once at startup and cached; component files parsed on demand (existing pattern)                      |

---

## 12. Future Considerations

- **Rule authoring UI** — a companion tool or prompt template that helps designers encode new rules by asking structured questions
- **Confidence scoring** — validation responses include a confidence level based on how much context the agent provided
- **Cross-component coherence** — rules that check consistency across multiple components (e.g., "all cards should use the same elevation level")
- **Design decision changelog** — track when rules are added/modified, so the team knows when intent shifted
- **MCP resource exposure** — expose rules as MCP Resources (not just tools) so agents can proactively read them before generating code
- **Integration with `update_token`** — after validation, offer a one-call fix path that updates the token value and re-validates
