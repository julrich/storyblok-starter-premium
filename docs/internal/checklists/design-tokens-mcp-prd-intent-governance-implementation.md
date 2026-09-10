# Task List: Design Intent & Governance Layer

**PRD:** [PRD-intent-governance.md](../prd/design-tokens-mcp-prd-intent-governance.md)
**Date:** 2026-02-22
**Status:** ✅ Phase 1–2 Complete, Phase 3 Partial

---

## Phase 1 — Intent Data Layer (Foundation)

### 1.1 Design Rule JSON Files

Create the `rules/` directory and populate it with structured JSON rule files.

- [x] `rules/text-color-hierarchy.json` — Text-color semantic roles (display, default, copy, interface, on-primary) with valid/invalid contexts and pairing rules
- [x] `rules/background-color-layers.json` — Background-color layer intent (default, card, interface, accent, bold, clear, overlay, primary) with purpose and valid component contexts
- [x] `rules/elevation-hierarchy.json` — Box-shadow scale (control → card → surface) with expected component sizes
- [x] `rules/font-family-roles.json` — Font-family role assignments (display, copy, interface, mono) with valid/invalid element contexts
- [x] `rules/typography-pairing.json` — Cross-category pairing rules: text-color ↔ font-family ↔ line-height must match by category (display/copy/interface)
- [x] `rules/spacing-scale.json` — Spacing scale hierarchy (xxs → xxl) with intended usage patterns per size
- [x] `rules/border-radius-scale.json` — Border-radius scale tokens with role mapping (pill, card, control, none)
- [x] `rules/color-semantic-layer.json` — Rule: use semantic color tokens (`--ks-text-color-*`, `--ks-background-color-*`) instead of raw primitive `--ks-color-*` references
- [x] `rules/transition-consistency.json` — Transition tokens with intended usage (hover, expand, slide, fade)
- [x] `rules/inverted-context.json` — Inverted token variants should match inverted context usage
- [x] `rules/interactive-state-completeness.json` — Interactive tokens (hover, active, focus, selected) must be defined as complete sets
- [x] `rules/token-existence.json` — Phantom token detection: any `var(--ks-*)` or `var(--dsa-*)` reference must resolve to a real token
- [x] `rules/component-reference-validity.json` — Cross-component `--dsa-*` references must point to existing component tokens

### 1.2 Rule Engine (in `index.js`)

- [x] Add `RULES_DIR` constant pointing to `rules/`
- [x] Implement `loadDesignRules()` — read and parse all `rules/*.json` files, cache in memory
- [x] Implement `validateTokenExistence(tokenName)` — check if a `--ks-*` or `--dsa-*` token exists in parsed global + component token files
- [x] Implement helper: `extractTypographyCategory(tokenName)`, `isPrimitiveColorToken(tokenName)`, `detectHardcodedValue(value, cssProperty)`
- [x] Implement `validateSingleTokenUsage(tokenName, cssProperty, element, designContext, rawValue, rules)` — check one token against all applicable rules, return violations
- [x] Implement `validateTokenUsages(context, designContext, tokenUsages)` — orchestrate: validate existence + run all rules for each usage, aggregate violations
- [x] Implement `recommendTokenForContext(cssProperty, element, designContext, options)` — search rules for matching valid contexts, return ranked recommendations
- [x] Implement `getTokenHierarchy(category)` — return hierarchy/scale from applicable rules
- [x] Implement `auditComponentTokens(componentSlug)` — parse a component's tokens, validate each against all rules
- [x] Implement `auditAllComponents(category, minSeverity)` — batch audit across all components, return summary table

---

## Phase 2 — MCP Tool Definitions & Handlers

### 2.1 `get_design_rules` Tool

- [x] Add tool definition to `ListToolsRequestSchema` handler with name, description, inputSchema (`ruleId`, `category`, `severity` filters)
- [x] Implement handler in `CallToolRequestSchema` switch: load rules, apply filters, return rule list or rule detail

### 2.2 `get_token_hierarchy` Tool

- [x] Add tool definition with `category` parameter (enum: text-color, background-color, elevation, font-family, font-size, spacing, border-radius, line-height)
- [x] Implement handler: find hierarchy/scale rules for the category, return ordered hierarchy with levels, purposes, and pairing info

### 2.3 `validate_token_usage` Tool

- [x] Add tool definition with `context`, `designContext`, `tokenUsages` array parameters
- [x] Implement handler: call `validateTokenUsages()`, return violations grouped by severity with suggestions and rationale
- [x] Include summary counts (critical/warning/info/clean) in response

### 2.4 `get_token_for_context` Tool

- [x] Add tool definition with `cssProperty`, `element`, `designContext`, `interactive`, `inverted` parameters
- [x] Implement handler: call `recommendTokenForContext()`, return ranked recommendations with rationale, pairWith suggestions, and avoid list

### 2.5 `validate_component_tokens` Tool

- [x] Add tool definition with `component` (required) and `severity` filter parameters
- [x] Implement handler: call `auditComponentTokens()`, return structured audit report per token with violations

### 2.6 `audit_all_components` Tool

- [x] Add tool definition with `category` and `minSeverity` parameters
- [x] Implement handler: call `auditAllComponents()`, return summary table (component × severity counts) and top violations

---

## Phase 3 — Quality & Polish

### 3.1 Testing

- [x] Start the MCP server successfully with all new tools registered (28 total tools)
- [x] Verify `get_design_rules()` returns all 13 rules
- [x] Verify `get_token_hierarchy({ category: "text-color" })` returns meaningful hierarchy (11 levels)
- [x] Verify `validate_component_tokens({ component: "button" })` produces an audit report (3 critical violations found)
- [x] Verify `audit_all_components()` produces a summary table across all 50 components (728 tokens, 148 critical violations across 39 components)
- [x] Verify `validate_token_usage` catches phantom tokens and hardcoded values
- [x] Verify `validate_token_usage` catches hierarchy violations (copy token for headline → warning)
- [x] Verify `get_token_for_context({ cssProperty: "color", element: "hero headline" })` returns `--ks-text-color-display` as rank 1

### 3.2 Edge Cases

- [ ] Handle empty component token files gracefully (0 violations, not errors)
- [ ] Handle `calc()` expressions containing multiple `var()` references
- [ ] Handle `var()` with fallback values: `var(--ks-token, fallback)`
- [ ] Handle composite shorthand values (e.g., `0.75em 1.5em` for padding)
- [ ] Handle unknown/unrecognized token prefixes gracefully
