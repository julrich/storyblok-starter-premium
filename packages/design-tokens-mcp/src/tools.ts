import { TOKEN_FILES } from "./constants.js";
import type { Tool } from "./types.js";

/**
 * All 28 MCP tool definitions for the Design Tokens server.
 */
export function getToolDefinitions(): Tool[] {
  const tokenFileKeys = Object.keys(TOKEN_FILES);

  return [
    // ── Token Read / Query ────────────────────────────────────────────────
    {
      name: "get_token",
      description:
        "Retrieve the value of a specific design token by name. Returns the token value along with its source file and category.",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description:
              "The token name (e.g., 'ks-brand-color-primary' or '--ks-brand-color-primary')",
          },
        },
        required: ["name"],
      },
    },
    {
      name: "list_tokens",
      description:
        "List design tokens with optional filtering. Can filter by file, category, or name prefix. Returns paginated results for large token sets.",
      inputSchema: {
        type: "object",
        properties: {
          file: {
            type: "string",
            enum: tokenFileKeys,
            description:
              "Filter by source file (e.g., 'branding', 'color', 'spacing')",
          },
          category: {
            type: "string",
            description:
              "Filter by category pattern in token name (e.g., 'color', 'font', 'spacing')",
          },
          prefix: {
            type: "string",
            description:
              "Filter by token name prefix (e.g., 'ks-brand', 'ks-color-primary')",
          },
          limit: {
            type: "number",
            description: "Maximum number of tokens to return (default: 50)",
            default: 50,
          },
          offset: {
            type: "number",
            description: "Number of tokens to skip for pagination (default: 0)",
            default: 0,
          },
          includeComponentTokens: {
            type: "boolean",
            description:
              "Include component-level design tokens (--dsa-*) alongside global tokens (default: false)",
            default: false,
          },
        },
      },
    },
    {
      name: "list_files",
      description:
        "List all available token files with their descriptions and token counts. Includes both global token files and optionally component token files.",
      inputSchema: {
        type: "object",
        properties: {
          includeComponentFiles: {
            type: "boolean",
            description:
              "Include component token files from tokens/componentToken/ (default: true)",
            default: true,
          },
        },
      },
    },
    {
      name: "get_token_stats",
      description:
        "Get statistics about the token system including counts by file, category, and prefix.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "search_tokens",
      description:
        "Search for design tokens by pattern in names or values. Supports filtering by file and semantic type.",
      inputSchema: {
        type: "object",
        properties: {
          pattern: {
            type: "string",
            description: "Search pattern (case-insensitive)",
          },
          searchIn: {
            type: "string",
            enum: ["name", "value", "both"],
            description: "Where to search (default: 'both')",
            default: "both",
          },
          file: {
            type: "string",
            enum: tokenFileKeys,
            description: "Limit search to specific file",
          },
          limit: {
            type: "number",
            description: "Maximum results to return (default: 50)",
            default: 50,
          },
          includeComponentTokens: {
            type: "boolean",
            description:
              "Include component-level design tokens (--dsa-*) in search results (default: false)",
            default: false,
          },
        },
        required: ["pattern"],
      },
    },
    {
      name: "get_tokens_by_type",
      description:
        "Get tokens by semantic type (interactive states, scales, responsive values, etc.)",
      inputSchema: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: [
              "interactive",
              "inverted",
              "scale",
              "base",
              "responsive",
              "sizing",
            ],
            description:
              "Semantic type: 'interactive' (hover/active/selected), 'inverted' (dark mode), 'scale' (alpha/mixing scales), 'base' (base tokens), 'responsive' (breakpoint), 'sizing' (xxs-xxl)",
          },
          file: {
            type: "string",
            enum: tokenFileKeys,
            description: "Limit to specific file",
          },
          limit: {
            type: "number",
            description: "Maximum results (default: 50)",
            default: 50,
          },
        },
        required: ["type"],
      },
    },

    // ── Specialized queries ───────────────────────────────────────────────
    {
      name: "get_color_palette",
      description:
        "Get all color-related tokens organized by color type (primary, positive, negative, etc.). Useful for understanding the full color system.",
      inputSchema: {
        type: "object",
        properties: {
          colorType: {
            type: "string",
            enum: [
              "primary",
              "positive",
              "negative",
              "informative",
              "notice",
              "fg",
              "bg",
              "link",
            ],
            description: "Filter by specific color type",
          },
          includeScales: {
            type: "boolean",
            description: "Include alpha/mixing scale variants (default: false)",
            default: false,
          },
        },
      },
    },
    {
      name: "get_typography_tokens",
      description:
        "Get typography-related tokens (font families, weights, sizes, line heights).",
      inputSchema: {
        type: "object",
        properties: {
          fontType: {
            type: "string",
            enum: ["display", "copy", "interface", "mono"],
            description: "Filter by font type",
          },
          property: {
            type: "string",
            enum: ["family", "weight", "size", "line-height"],
            description: "Filter by property type",
          },
        },
      },
    },
    {
      name: "get_spacing_tokens",
      description:
        "Get spacing tokens (margins, padding, gaps) with their scale values.",
      inputSchema: {
        type: "object",
        properties: {
          size: {
            type: "string",
            enum: ["xxs", "xs", "s", "m", "l", "xl", "xxl"],
            description: "Filter by specific size",
          },
          type: {
            type: "string",
            enum: ["stack", "inline", "inset", "base"],
            description: "Filter by spacing type",
          },
        },
      },
    },

    // ── Token Write ───────────────────────────────────────────────────────
    {
      name: "update_token",
      description:
        "Update a design token value and save it to its source file. Only works for tokens with direct values (not calculated/derived tokens).",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Token name to update",
          },
          value: {
            type: "string",
            description: "New value for the token",
          },
        },
        required: ["name", "value"],
      },
    },

    // ── Theme Config ──────────────────────────────────────────────────────
    {
      name: "get_branding_tokens",
      description:
        "Get the core branding tokens that control the overall design system (brand colors, font bases, spacing base). These are the primary tokens to modify for theming.",
      inputSchema: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: [
              "colors",
              "fonts",
              "spacing",
              "borders",
              "shadows",
              "factors",
              "all",
            ],
            description: "Filter by branding token type (default: 'all')",
            default: "all",
          },
        },
      },
    },
    {
      name: "get_theme_schema",
      description:
        "Get the W3C DTCG branding token schema with field descriptions and reference values. " +
        "Returns the schema mapping (field path → human-readable description) and the current default " +
        "branding tokens as a reference. Also includes component token catalog summary for use with " +
        "the Storyblok MCP create_theme/update_theme `componentTokens` parameter. " +
        "Use this to understand the token structure before building " +
        "a theme object for validate_theme or the Storyblok MCP create_theme/update_theme tools.",
      inputSchema: {
        type: "object",
        properties: {
          section: {
            type: "string",
            enum: [
              "color",
              "font",
              "spacing",
              "border",
              "box-shadow",
              "breakpoints",
              "all",
            ],
            description:
              "Get a specific section of the schema (default: 'all')",
            default: "all",
          },
        },
      },
    },
    {
      name: "validate_theme",
      description:
        "Validate a W3C DTCG branding token object against the branding-tokens schema. " +
        "Optionally validates component token overrides against the component token catalog. " +
        "Returns pass/fail with field-level errors. Call this before using the Storyblok MCP " +
        "create_theme/update_theme tools to catch structural issues early.",
      inputSchema: {
        type: "object",
        properties: {
          tokens: {
            type: "object",
            description:
              "The W3C DTCG branding token object to validate (same structure as branding-tokens.json)",
          },
          componentTokens: {
            type: "object",
            description:
              "Optional sparse component token overrides to validate against the component catalog. " +
              "Format: { [componentId]: { [tokenName]: value, [query]: { [tokenName]: value } } }",
          },
        },
        required: ["tokens"],
      },
    },
    {
      name: "list_theme_values",
      description:
        "Flatten a W3C DTCG branding token object into a list of dot-notation paths and values. " +
        "If no 'tokens' object is provided, flattens the default branding tokens (synced from the Design System). " +
        "Useful for comparing themes or seeing all configurable values at a glance.",
      inputSchema: {
        type: "object",
        properties: {
          tokens: {
            type: "object",
            description:
              "Optional: a W3C DTCG token object to flatten. If omitted, uses the default branding tokens.",
          },
          filter: {
            type: "string",
            description:
              "Filter paths containing this string (e.g., 'color', 'font', 'spacing')",
          },
        },
      },
    },
    {
      name: "get_factor_tokens",
      description:
        "Get factor-based tokens that control scaling (duration, border-radius, box-shadow, spacing factors). These are multipliers that affect the intensity of design elements.",
      inputSchema: {
        type: "object",
        properties: {
          factorType: {
            type: "string",
            enum: [
              "duration",
              "border-radius",
              "box-shadow",
              "spacing",
              "font-size",
              "all",
            ],
            description: "Filter by factor type (default: 'all')",
            default: "all",
          },
        },
      },
    },
    {
      name: "get_breakpoint_tokens",
      description:
        "Get breakpoint-related tokens including breakpoint values and responsive scaling factors (bp-factor).",
      inputSchema: {
        type: "object",
        properties: {
          includeFactors: {
            type: "boolean",
            description:
              "Include bp-factor tokens for responsive scaling (default: true)",
            default: true,
          },
        },
      },
    },
    {
      name: "get_duration_tokens",
      description:
        "Get animation/transition duration and timing function tokens.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },

    // ── Theme Generation ──────────────────────────────────────────────────
    {
      name: "generate_theme_from_image",
      description:
        "Analyze a website screenshot or design image to generate a branding theme. Accepts either a base64-encoded image or an image URL. Returns the image for visual analysis alongside the W3C DTCG token schema with field descriptions. Use your vision capabilities to examine the image, extract colors, typography cues, and spacing characteristics, then build a W3C DTCG token object. Call validate_theme to check it, then use the Storyblok MCP create_theme tool to persist it.",
      inputSchema: {
        type: "object",
        properties: {
          imageBase64: {
            type: "string",
            description:
              "Base64-encoded image data (PNG, JPEG, or WebP). Provide this OR imageUrl, not both.",
          },
          imageUrl: {
            type: "string",
            description:
              "URL to a website screenshot or design image. The server will fetch and convert it. Provide this OR imageBase64, not both.",
          },
          mimeType: {
            type: "string",
            enum: ["image/png", "image/jpeg", "image/webp"],
            description:
              "MIME type of the image when providing imageBase64 (default: 'image/png'). Ignored when using imageUrl (auto-detected).",
            default: "image/png",
          },
        },
      },
    },
    {
      name: "extract_theme_from_css",
      description:
        "Fetch all CSS from a website (inline <style> blocks and linked stylesheets) and return it for analysis. " +
        "Extracts exact color values, font families, font sizes, spacing, border-radius, and CSS custom properties. " +
        "Returns the raw CSS along with a pre-parsed summary of unique colors, fonts, and custom properties found. " +
        "Use this data together with the W3C DTCG theme schema to build a branding token object, then call validate_theme and Storyblok MCP create_theme to persist.",
      inputSchema: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description:
              "The website URL to extract CSS from (e.g., 'https://example.com')",
          },
          includeRawCSS: {
            type: "boolean",
            description:
              "Whether to include the full raw CSS text in the response (default: false). " +
              "The raw CSS can be very large. When false, only the summary and CSS custom properties are returned.",
            default: false,
          },
          maxStylesheets: {
            type: "number",
            description:
              "Maximum number of external stylesheets to fetch (default: 20)",
            default: 20,
          },
        },
        required: ["url"],
      },
    },

    // ── Component Tokens ──────────────────────────────────────────────────
    {
      name: "list_components",
      description:
        "List all Design System components that have customizable design tokens. Returns component name, category, token count, and description for each. Use this as the starting point to discover which components can be customized, then use get_component_tokens to drill into a specific component.",
      inputSchema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: [
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
            description: "Filter by component category (default: 'all')",
            default: "all",
          },
          includeEmpty: {
            type: "boolean",
            description: "Include components with 0 tokens (default: false)",
            default: false,
          },
        },
      },
    },
    {
      name: "get_component_tokens",
      description:
        "Get all design tokens for a specific Design System component. Returns every CSS custom property defined for that component, organized with element/variant/state metadata and references to global tokens. Use 'list_components' first to discover available component names.",
      inputSchema: {
        type: "object",
        properties: {
          component: {
            type: "string",
            description:
              "Component name/slug (e.g., 'button', 'hero', 'teaser-card', 'section'). Use list_components to discover valid names.",
          },
          element: {
            type: "string",
            description:
              "Filter to a specific sub-element (e.g., 'label', 'icon', 'copy', 'image')",
          },
          property: {
            type: "string",
            description:
              "Filter by CSS property type (e.g., 'color', 'font', 'gap', 'border', 'padding')",
          },
          statesOnly: {
            type: "boolean",
            description:
              "Only return tokens that have interactive states (hover, active, focus, checked). Default: false",
            default: false,
          },
        },
        required: ["component"],
      },
    },
    {
      name: "search_component_tokens",
      description:
        "Search across all component-level design tokens by pattern. Searches token names, values, component names, and comments. Useful for finding all tokens related to a CSS property (e.g., 'border-radius'), a global token (e.g., 'ks-color-primary'), or a concept (e.g., 'hover').",
      inputSchema: {
        type: "object",
        properties: {
          pattern: {
            type: "string",
            description:
              "Search pattern (case-insensitive). Matches against token names, values, and comments.",
          },
          searchIn: {
            type: "string",
            enum: ["name", "value", "both"],
            description: "Where to search (default: 'both')",
            default: "both",
          },
          component: {
            type: "string",
            description: "Limit search to a specific component",
          },
          category: {
            type: "string",
            enum: [
              "navigation",
              "content",
              "blog",
              "cards",
              "heroes",
              "forms",
              "layout",
              "data-display",
              "utility",
            ],
            description: "Limit search to a component category",
          },
          limit: {
            type: "number",
            description: "Maximum results to return (default: 50)",
            default: 50,
          },
        },
        required: ["pattern"],
      },
    },

    // ── Design Governance ─────────────────────────────────────────────────
    {
      name: "get_design_rules",
      description:
        "List all design intent rules encoded in the system, or get details for a specific rule. Each rule describes what's valid, what violates the intent even when syntax is correct, and the rationale behind the design decision. Use this to understand the 'why' behind token choices.",
      inputSchema: {
        type: "object",
        properties: {
          ruleId: {
            type: "string",
            description:
              "Get details for a specific rule by ID (e.g., 'text-color-hierarchy', 'elevation-hierarchy'). Omit to list all rules.",
          },
          category: {
            type: "string",
            enum: [
              "semantic-hierarchy",
              "hierarchy",
              "pairing",
              "existence",
              "completeness",
            ],
            description: "Filter rules by category",
          },
          severity: {
            type: "string",
            enum: ["critical", "warning", "info"],
            description: "Filter rules by severity level",
          },
        },
      },
    },
    {
      name: "get_token_hierarchy",
      description:
        "Get the semantic hierarchy and relationships for a token category. Shows which tokens are designed for which level of the visual hierarchy, their intended ordering, and pairing rules. Use this to understand the design system's intent before choosing tokens.",
      inputSchema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: [
              "text-color",
              "background-color",
              "elevation",
              "font-family",
              "font-size",
              "spacing",
              "border-radius",
              "line-height",
              "transition",
            ],
            description: "The token category to get the hierarchy for",
          },
        },
        required: ["category"],
      },
    },
    {
      name: "validate_token_usage",
      description:
        "Validate a set of design token usages against the design system's intent rules. Checks not just whether tokens exist, but whether they are semantically correct for their context. Returns violations classified by severity (critical/warning/info) with suggestions for correct alternatives. Use this after generating CSS or when reviewing component styling.",
      inputSchema: {
        type: "object",
        properties: {
          context: {
            type: "string",
            description:
              "What is being validated (e.g., 'hero component', 'contact form', 'card body text')",
          },
          designContext: {
            type: "string",
            enum: [
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
            description: "The broad design context to validate against",
          },
          tokenUsages: {
            type: "array",
            items: {
              type: "object",
              properties: {
                token: {
                  type: "string",
                  description: "Token name (e.g., '--ks-text-color-display')",
                },
                cssProperty: {
                  type: "string",
                  description:
                    "CSS property being set (e.g., 'color', 'background-color')",
                },
                element: {
                  type: "string",
                  description:
                    "Element within the component (e.g., 'headline', 'body', 'label')",
                },
                value: {
                  type: "string",
                  description:
                    "Raw CSS value if not using a token (for hardcoded value detection)",
                },
              },
              required: ["cssProperty"],
            },
            description: "List of token usages to validate",
          },
        },
        required: ["context", "tokenUsages"],
      },
    },
    {
      name: "get_token_for_context",
      description:
        "Get the recommended design token for a specific design context and CSS property. Instead of browsing all tokens, describe what you're styling and get a ranked recommendation with rationale. This encodes the design system's intent — which token is *right*, not just which tokens *exist*.",
      inputSchema: {
        type: "object",
        properties: {
          cssProperty: {
            type: "string",
            description:
              "The CSS property you're setting (e.g., 'color', 'background-color', 'font-family', 'box-shadow', 'padding', 'border-radius', 'transition')",
          },
          element: {
            type: "string",
            description:
              "What you're styling (e.g., 'hero headline', 'card body text', 'form input', 'navigation link', 'section background', 'modal overlay')",
          },
          designContext: {
            type: "string",
            enum: [
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
            description: "The broad design context",
          },
          interactive: {
            type: "boolean",
            description:
              "Whether the element has interactive states (hover, active, focus). If true, all required state tokens are returned.",
            default: false,
          },
          inverted: {
            type: "boolean",
            description:
              "Whether the element is in an inverted (dark-on-light / light-on-dark) context.",
            default: false,
          },
        },
        required: ["cssProperty", "element"],
      },
    },
    {
      name: "validate_component_tokens",
      description:
        "Run a full design intent audit on a component's token file. Scans all token definitions for the named component and validates them against every applicable design rule. Returns a structured report with violations by severity. Use list_components first to discover available component names.",
      inputSchema: {
        type: "object",
        properties: {
          component: {
            type: "string",
            description:
              "Component slug to audit (e.g., 'button', 'hero', 'teaser-card'). Use list_components to discover valid names.",
          },
          severity: {
            type: "string",
            enum: ["all", "critical", "warning", "info"],
            description: "Minimum severity to report (default: 'all')",
            default: "all",
          },
        },
        required: ["component"],
      },
    },
    {
      name: "audit_all_components",
      description:
        "Run a design intent audit across all component token files. Returns a summary table with violation counts per component and severity. Use this to get a health overview of the entire design system's token governance.",
      inputSchema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: [
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
            description: "Filter to a component category (default: 'all')",
            default: "all",
          },
          minSeverity: {
            type: "string",
            enum: ["critical", "warning", "info"],
            description: "Minimum severity to include (default: 'info')",
            default: "info",
          },
        },
      },
    },
  ];
}
