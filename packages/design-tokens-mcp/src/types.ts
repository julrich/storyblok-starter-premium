import type { Tool } from "@modelcontextprotocol/sdk/types.js";

// ── Token file configuration ────────────────────────────────────────────────

export interface TokenFileConfig {
  file: string;
  description: string;
  category: string;
  isJson?: boolean;
}

export type TokenFilesMap = Record<string, TokenFileConfig>;

// ── Component configuration ─────────────────────────────────────────────────

export interface ComponentTokenFileConfig {
  file: string;
  category: string;
  description: string;
}

export type ComponentTokenFilesMap = Record<string, ComponentTokenFileConfig>;

export type ComponentCategoriesMap = Record<string, string[]>;

// ── Parsed token data ───────────────────────────────────────────────────────

export interface TokenData {
  value: string;
  file: string;
  category: string;
  section?: string;
  comment?: string;
}

export interface TokenEntry extends TokenData {
  name: string;
  source?: string;
  component?: string;
}

export interface ComponentToken {
  name: string;
  value: string;
  file: string;
  category: string;
  section?: string;
  comment?: string;
  component: string;
  element: string | null;
  variant: string | null;
  state: string | null;
  cssProperty: string;
}

export interface ParsedComponentTokenName {
  component: string;
  element: string | null;
  variant: string | null;
  state: string | null;
  cssProperty: string;
}

// ── Token classification ────────────────────────────────────────────────────

export type TokenValueType =
  | "literal"
  | "global-ref"
  | "component-ref"
  | "calculated";

// ── Stats ───────────────────────────────────────────────────────────────────

export interface TokenStats {
  totalTokens: number;
  byFile: Record<string, number>;
  byCategory: Record<string, number>;
  byPrefix: Record<string, number>;
  componentTokens?: ComponentTokenStats;
}

export interface ComponentTokenStats {
  totalComponentTokens: number;
  components: number;
  byCategory: Record<string, number>;
  byComponent: Record<string, number>;
}

// ── Branding JSON ───────────────────────────────────────────────────────────

export interface FlatConfigEntry {
  path: string;
  value: string | number | boolean;
  type: string;
}

// ── Governance / design rules ───────────────────────────────────────────────

export interface DesignRule {
  id: string;
  category: string;
  severity: "critical" | "warning" | "info";
  [key: string]: unknown;
}

export interface TokenUsage {
  token?: string;
  cssProperty: string;
  element?: string;
  value?: string;
}

export interface Violation {
  severity: "critical" | "warning" | "info";
  rule: string;
  token?: string;
  element?: string;
  cssProperty?: string;
  message: string;
  suggestion?: string;
}

export interface AuditResult {
  component: string;
  file: string;
  totalTokens: number;
  violations: Violation[];
  summary: {
    total: number;
    critical: number;
    warning: number;
    info: number;
  };
}

export interface ValidationResult {
  context: string;
  designContext: string | null;
  totalUsages: number;
  violations: Violation[];
  summary: {
    total: number;
    critical: number;
    warning: number;
    info: number;
  };
}

// ── CSS fetching ────────────────────────────────────────────────────────────

export interface CSSFetchResult {
  inlineStyles: string[];
  linkedStylesheets: { href: string; css: string | null }[];
  summary: {
    inlineStyleBlocks: number;
    linkedStylesheets: number;
    totalCharacters: number;
    uniqueColors: string[];
    uniqueFonts: string[];
  };
}

export interface FetchedImage {
  base64: string;
  mimeType: string;
}

// ── Tool type re-export ─────────────────────────────────────────────────────

export type { Tool };
