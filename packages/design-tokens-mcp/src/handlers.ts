import * as path from "node:path";
import * as fs from "node:fs/promises";

import {
  TOKEN_FILES,
  TOKENS_DIR,
  COMPONENT_TOKENS_DIR,
  COMPONENT_TOKEN_FILES,
  COMPONENT_CATEGORIES,
} from "./constants.js";

import {
  parseAllTokens,
  parseAllComponentTokens,
  parseTokenFile,
  parseComponentTokenName,
  searchTokens,
  getTokensBySemanticType,
  getTokenStats,
  getComponentTokenStats,
  updateTokenInFile,
} from "./parser.js";

import {
  readBrandingTokensW3C,
  flattenW3CTokens,
  validateW3CTokens,
  getBrandingSchemaDescription,
  getFactorDescription,
} from "./branding.js";

import { fetchImageAsBase64, fetchWebsiteCSS } from "./fetcher.js";

import {
  loadDesignRules,
  validateTokenUsages,
  recommendTokenForContext,
  getTokenHierarchy,
  auditComponentTokens,
  auditAllComponents,
} from "./governance.js";

/** Helper to wrap a JSON object in an MCP text content block */
function text(data: unknown): {
  content: Array<{ type: "text"; text: string }>;
} {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

type McpResult = {
  content: Array<
    | { type: "text"; text: string }
    | { type: "image"; data: string; mimeType: string }
  >;
  isError?: boolean;
};

/**
 * Dispatch a tool call by name, returning the MCP result content.
 */
export async function dispatch(
  name: string,
  args: Record<string, unknown>,
): Promise<McpResult> {
  try {
    switch (name) {
      // ── Token Read / Query ────────────────────────────────────────────

      case "get_token": {
        if (!args.name) {
          throw new Error("Token name is required");
        }

        const tokens = await parseAllTokens();
        const normalizedName = (args.name as string).startsWith("--")
          ? (args.name as string)
          : `--${args.name}`;

        const tokenData = tokens.get(normalizedName);

        if (!tokenData) {
          const suggestions: string[] = [];
          const searchTerm = normalizedName.toLowerCase();
          for (const [tokenName] of tokens.entries()) {
            if (tokenName.toLowerCase().includes(searchTerm.slice(2, 15))) {
              suggestions.push(tokenName);
              if (suggestions.length >= 5) break;
            }
          }

          return text({
            error: "Token not found",
            requestedToken: normalizedName,
            suggestions: suggestions.length > 0 ? suggestions : undefined,
            hint: "Use 'list_tokens' or 'search_tokens' to find available tokens",
          });
        }

        return text({
          token: normalizedName,
          value: tokenData.value,
          file: tokenData.file,
          category: tokenData.category,
          ...(tokenData.section && { section: tokenData.section }),
          ...(tokenData.comment && { comment: tokenData.comment }),
        });
      }

      case "list_tokens": {
        const tokens = await parseAllTokens(args.file as string | undefined);
        let filteredTokens = Array.from(tokens.entries()).map(
          ([name, data]) => ({ name, ...data }),
        );

        // Merge component tokens if requested
        if (args.includeComponentTokens) {
          const componentTokens = await parseAllComponentTokens();
          for (const ct of componentTokens) {
            filteredTokens.push({
              name: ct.name,
              value: ct.value,
              file: ct.file,
              category: ct.category,
              ...(ct.section && { section: ct.section }),
              ...(ct.comment && { comment: ct.comment }),
              source: "component",
              component: ct.component,
            } as Record<string, unknown> as (typeof filteredTokens)[number]);
          }
        }

        // Apply category filter
        if (args.category) {
          const categoryPattern = (args.category as string).toLowerCase();
          filteredTokens = filteredTokens.filter((token) =>
            token.name.toLowerCase().includes(categoryPattern),
          );
        }

        // Apply prefix filter
        if (args.prefix) {
          const prefixPattern = (args.prefix as string).toLowerCase();
          const normalizedPrefix = prefixPattern.startsWith("--")
            ? prefixPattern
            : `--${prefixPattern}`;
          filteredTokens = filteredTokens.filter((token) =>
            token.name.toLowerCase().startsWith(normalizedPrefix),
          );
        }

        filteredTokens.sort((a, b) => a.name.localeCompare(b.name));

        const limit = (args.limit as number) || 50;
        const offset = (args.offset as number) || 0;
        const total = filteredTokens.length;
        const paginatedTokens = filteredTokens.slice(offset, offset + limit);

        return text({
          totalMatching: total,
          returned: paginatedTokens.length,
          offset,
          limit,
          hasMore: offset + limit < total,
          filters: {
            file: (args.file as string) || "all",
            category: (args.category as string) || null,
            prefix: (args.prefix as string) || null,
          },
          tokens: paginatedTokens,
        });
      }

      case "list_files": {
        const fileStats: Record<string, unknown>[] = [];
        for (const [key, config] of Object.entries(TOKEN_FILES)) {
          const filePath = path.join(TOKENS_DIR, config.file);
          try {
            await fs.access(filePath);
            const tokens = await parseTokenFile(filePath, config.category);
            fileStats.push({
              key,
              file: config.file,
              description: config.description,
              category: config.category,
              type: "global",
              tokenCount: tokens.size,
            });
          } catch {
            fileStats.push({
              key,
              file: config.file,
              description: config.description,
              category: config.category,
              type: "global",
              tokenCount: 0,
              status: "not found",
            });
          }
        }

        const includeComponents = args.includeComponentFiles !== false;
        const componentFileStats: Record<string, unknown>[] = [];
        if (includeComponents) {
          for (const [slug, config] of Object.entries(COMPONENT_TOKEN_FILES)) {
            const filePath = path.join(COMPONENT_TOKENS_DIR, config.file);
            try {
              await fs.access(filePath);
              const tokens = await parseTokenFile(filePath, config.category);
              componentFileStats.push({
                key: slug,
                file: `componentToken/${config.file}`,
                description: config.description,
                category: config.category,
                type: "component",
                component: slug,
                tokenCount: tokens.size,
              });
            } catch {
              componentFileStats.push({
                key: slug,
                file: `componentToken/${config.file}`,
                description: config.description,
                category: config.category,
                type: "component",
                component: slug,
                tokenCount: 0,
                status: "not found",
              });
            }
          }
        }

        const allFiles = [...fileStats, ...componentFileStats];

        return text({
          totalFiles: allFiles.length,
          globalFiles: fileStats.length,
          componentFiles: componentFileStats.length,
          files: allFiles,
        });
      }

      case "get_token_stats": {
        const stats: Record<string, unknown> = { ...(await getTokenStats()) };
        stats.componentTokens = await getComponentTokenStats();
        return text(stats);
      }

      case "search_tokens": {
        if (!args.pattern) {
          throw new Error("Search pattern is required");
        }

        const tokens = await parseAllTokens(args.file as string | undefined);
        let results: Record<string, unknown>[] = searchTokens(
          tokens,
          args.pattern as string,
          (args.searchIn as string) || "both",
        ).map((r) => ({ ...r, source: "global" }));

        // Merge component tokens if requested
        if (args.includeComponentTokens) {
          const lowerPattern = (args.pattern as string).toLowerCase();
          const searchIn = (args.searchIn as string) || "both";
          const componentTokens = await parseAllComponentTokens();
          for (const ct of componentTokens) {
            const matchName =
              (searchIn === "both" || searchIn === "name") &&
              ct.name.toLowerCase().includes(lowerPattern);
            const matchValue =
              (searchIn === "both" || searchIn === "value") &&
              ct.value.toLowerCase().includes(lowerPattern);
            const matchComment =
              searchIn === "both" &&
              ct.comment &&
              ct.comment.toLowerCase().includes(lowerPattern);
            if (matchName || matchValue || matchComment) {
              results.push({
                name: ct.name,
                value: ct.value,
                file: ct.file,
                category: ct.category,
                source: "component",
                component: ct.component,
                ...(ct.section && { section: ct.section }),
                ...(ct.comment && { comment: ct.comment }),
              });
            }
          }
        }

        results.sort((a, b) =>
          (a.name as string).localeCompare(b.name as string),
        );

        const limit = (args.limit as number) || 50;
        const limitedResults = results.slice(0, limit);

        return text({
          pattern: args.pattern,
          searchIn: (args.searchIn as string) || "both",
          file: (args.file as string) || "all",
          includeComponentTokens: args.includeComponentTokens || false,
          totalMatches: results.length,
          returned: limitedResults.length,
          results: limitedResults,
        });
      }

      case "get_tokens_by_type": {
        if (!args.type) {
          throw new Error("Semantic type is required");
        }

        const tokens = await parseAllTokens(args.file as string | undefined);
        const results = getTokensBySemanticType(tokens, args.type as string);
        results.sort((a, b) => a.name.localeCompare(b.name));

        const limit = (args.limit as number) || 50;
        const limitedResults = results.slice(0, limit);

        return text({
          type: args.type,
          file: (args.file as string) || "all",
          totalMatches: results.length,
          returned: limitedResults.length,
          results: limitedResults,
        });
      }

      // ── Specialized queries ─────────────────────────────────────────

      case "get_color_palette": {
        const colorFiles = [
          "branding",
          "color",
          "background-color",
          "text-color",
          "border-color",
        ];
        const allColors: Record<string, unknown>[] = [];

        for (const fileKey of colorFiles) {
          const tokens = await parseAllTokens(fileKey);
          for (const [tokenName, data] of tokens.entries()) {
            if (args.colorType) {
              if (
                !tokenName
                  .toLowerCase()
                  .includes((args.colorType as string).toLowerCase())
              ) {
                continue;
              }
            }

            if (!args.includeScales) {
              if (/(alpha-\d|to-bg-\d|to-fg-\d)/.test(tokenName)) {
                continue;
              }
            }

            allColors.push({
              name: tokenName,
              value: data.value,
              file: data.file,
              category: data.category,
              ...(data.section && { section: data.section }),
              ...(data.comment && { comment: data.comment }),
            });
          }
        }

        allColors.sort((a, b) =>
          (a.name as string).localeCompare(b.name as string),
        );

        return text({
          colorType: (args.colorType as string) || "all",
          includeScales: args.includeScales || false,
          totalColors: allColors.length,
          colors: allColors.slice(0, 100),
        });
      }

      case "get_typography_tokens": {
        const tokens = await parseAllTokens();
        const typographyTokens: Record<string, unknown>[] = [];

        for (const [tokenName, data] of tokens.entries()) {
          const isTypography =
            tokenName.includes("font") ||
            tokenName.includes("line-height") ||
            tokenName.includes("letter-spacing");

          if (!isTypography) continue;

          if (args.fontType) {
            if (
              !tokenName
                .toLowerCase()
                .includes((args.fontType as string).toLowerCase())
            ) {
              continue;
            }
          }

          if (args.property) {
            const propertyPatterns: Record<string, RegExp> = {
              family: /font-family/,
              weight: /font-weight/,
              size: /font-size/,
              "line-height": /line-height/,
            };
            if (!propertyPatterns[args.property as string]?.test(tokenName)) {
              continue;
            }
          }

          typographyTokens.push({
            name: tokenName,
            value: data.value,
            file: data.file,
            category: data.category,
            ...(data.section && { section: data.section }),
            ...(data.comment && { comment: data.comment }),
          });
        }

        typographyTokens.sort((a, b) =>
          (a.name as string).localeCompare(b.name as string),
        );

        return text({
          fontType: (args.fontType as string) || "all",
          property: (args.property as string) || "all",
          totalTokens: typographyTokens.length,
          tokens: typographyTokens.slice(0, 100),
        });
      }

      case "get_spacing_tokens": {
        const tokens = await parseAllTokens("spacing");
        const brandingTokens = await parseAllTokens("branding");

        for (const [name, data] of brandingTokens.entries()) {
          if (name.includes("spacing")) {
            tokens.set(name, data);
          }
        }

        const spacingTokens: Record<string, unknown>[] = [];

        for (const [tokenName, data] of tokens.entries()) {
          if (args.size) {
            const sizePattern = new RegExp(`-${args.size as string}(-|$)`, "i");
            if (!sizePattern.test(tokenName)) {
              continue;
            }
          }

          if (args.type) {
            if ((args.type as string) === "base") {
              if (!tokenName.includes("-base")) continue;
            } else {
              if (!tokenName.includes(args.type as string)) continue;
            }
          }

          spacingTokens.push({
            name: tokenName,
            value: data.value,
            file: data.file,
            category: data.category,
            ...(data.section && { section: data.section }),
            ...(data.comment && { comment: data.comment }),
          });
        }

        spacingTokens.sort((a, b) =>
          (a.name as string).localeCompare(b.name as string),
        );

        return text({
          size: (args.size as string) || "all",
          type: (args.type as string) || "all",
          totalTokens: spacingTokens.length,
          tokens: spacingTokens,
        });
      }

      // ── Token Write ─────────────────────────────────────────────────

      case "update_token": {
        if (!args.name) {
          throw new Error("Token name is required");
        }
        if (args.value === undefined || args.value === null) {
          throw new Error("Token value is required");
        }

        const result = await updateTokenInFile(
          args.name as string,
          args.value as string,
        );

        return text({
          message: "Token updated successfully",
          ...result,
          success: true,
        });
      }

      // ── Theme Config ────────────────────────────────────────────────

      case "get_branding_tokens": {
        const tokens = await parseAllTokens("branding");
        const brandingTokens: Record<string, unknown>[] = [];

        const typeFilters: Record<string, RegExp> = {
          colors: /color/i,
          fonts: /font/i,
          spacing: /spacing/i,
          borders: /border/i,
          shadows: /shadow/i,
        };

        for (const [tokenName, data] of tokens.entries()) {
          if (args.type && args.type !== "all") {
            const filter = typeFilters[args.type as string];
            if (filter && !filter.test(tokenName)) {
              continue;
            }
          }

          brandingTokens.push({
            name: tokenName,
            value: data.value,
            file: data.file,
            category: data.category,
            isEditable: !data.value.includes("var("),
            ...(data.section && { section: data.section }),
            ...(data.comment && { comment: data.comment }),
          });
        }

        brandingTokens.sort((a, b) =>
          (a.name as string).localeCompare(b.name as string),
        );

        return text({
          type: (args.type as string) || "all",
          totalTokens: brandingTokens.length,
          note: "Tokens with isEditable=true can be modified directly",
          tokens: brandingTokens,
        });
      }

      case "get_theme_schema": {
        const schemaDescription = getBrandingSchemaDescription();
        const tokens = await readBrandingTokensW3C();

        // Load component token catalog summary
        let componentTokenSummary: Record<string, unknown> | undefined;
        try {
          const catalogPath = require("path").resolve(
            __dirname,
            "..",
            "tokens",
            "component-token-catalog.json",
          );
          const catalogData = JSON.parse(
            require("fs").readFileSync(catalogPath, "utf8"),
          );
          componentTokenSummary = {};
          for (const [id, entry] of Object.entries(
            catalogData as Record<
              string,
              {
                displayName: string;
                tokens: Record<string, unknown>;
                responsiveTokens: Record<string, Record<string, unknown>>;
              }
            >,
          )) {
            const baseCount = Object.keys(entry.tokens).length;
            const responsiveCount = Object.values(
              entry.responsiveTokens || {},
            ).reduce((sum, q) => sum + Object.keys(q).length, 0);
            (componentTokenSummary as Record<string, unknown>)[id] = {
              displayName: entry.displayName,
              baseTokenCount: baseCount,
              responsiveTokenCount: responsiveCount,
            };
          }
        } catch {
          // catalog not synced yet — omit from response
        }

        let result: Record<string, unknown>;
        if (args.section && args.section !== "all") {
          const sectionData = (tokens as Record<string, unknown>)[
            args.section as string
          ];
          if (sectionData === undefined) {
            throw new Error(
              `Unknown section: ${
                args.section
              }. Available sections: ${Object.keys(tokens).join(", ")}`,
            );
          }
          result = {
            section: args.section,
            data: sectionData,
            schemaDescription: Object.fromEntries(
              Object.entries(schemaDescription).filter(([key]) =>
                key.startsWith(args.section as string),
              ),
            ),
            availableSections: Object.keys(tokens),
          };
        } else {
          result = {
            sections: Object.keys(tokens),
            schemaDescription,
            referenceTokens: tokens,
            ...(componentTokenSummary
              ? {
                  componentTokens: {
                    note: "Component tokens can be overridden per-theme via the Storyblok MCP create_theme/update_theme tools using the componentTokens parameter. Format: { [componentId]: { [tokenName]: value } }",
                    components: componentTokenSummary,
                  },
                }
              : {}),
            note: "Use the 'section' parameter to get specific sections like 'color', 'font', 'spacing', etc. Token values follow W3C DTCG format. To create or update themes, use the Storyblok MCP create_theme/update_theme tools.",
          };
        }

        return text(result);
      }

      case "validate_theme": {
        if (!args.tokens || typeof args.tokens !== "object") {
          throw new Error(
            "A 'tokens' object (W3C DTCG format) is required for validation",
          );
        }

        const validationResult = await validateW3CTokens(
          args.tokens as Record<string, unknown>,
        );

        // Validate component token overrides if provided
        let componentValidation:
          | { valid: boolean; errors: string[] }
          | undefined;
        if (args.componentTokens && typeof args.componentTokens === "object") {
          const errors: string[] = [];
          try {
            const catalogPath = require("path").resolve(
              __dirname,
              "..",
              "tokens",
              "component-token-catalog.json",
            );
            const catalogData = JSON.parse(
              require("fs").readFileSync(catalogPath, "utf8"),
            ) as Record<
              string,
              {
                tokens: Record<string, unknown>;
                responsiveTokens: Record<string, Record<string, unknown>>;
              }
            >;

            for (const [compId, overrides] of Object.entries(
              args.componentTokens as Record<string, Record<string, unknown>>,
            )) {
              const catalogEntry = catalogData[compId];
              if (!catalogEntry) {
                errors.push(`Unknown component: "${compId}"`);
                continue;
              }
              for (const [key, val] of Object.entries(overrides)) {
                if (typeof val === "string") {
                  // Base token override
                  if (!catalogEntry.tokens[key]) {
                    errors.push(
                      `Unknown token "${key}" on component "${compId}"`,
                    );
                  }
                } else if (typeof val === "object" && val !== null) {
                  // Responsive query override
                  if (!catalogEntry.responsiveTokens[key]) {
                    errors.push(
                      `Unknown responsive query "${key}" on component "${compId}"`,
                    );
                  } else {
                    for (const tokenName of Object.keys(
                      val as Record<string, string>,
                    )) {
                      if (!catalogEntry.responsiveTokens[key][tokenName]) {
                        errors.push(
                          `Unknown responsive token "${tokenName}" in query "${key}" on component "${compId}"`,
                        );
                      }
                    }
                  }
                }
              }
            }
          } catch {
            errors.push(
              "Component token catalog not available — component validation skipped",
            );
          }
          componentValidation = {
            valid: errors.length === 0,
            errors,
          };
        }

        return text({
          ...validationResult,
          ...(componentValidation
            ? { componentTokenValidation: componentValidation }
            : {}),
          note: validationResult.valid
            ? "Tokens are valid. Use Storyblok MCP create_theme/update_theme to persist."
            : "Fix the errors above and re-validate before creating/updating a theme.",
        });
      }

      case "list_theme_values": {
        const tokens =
          args.tokens && typeof args.tokens === "object"
            ? (args.tokens as Record<string, unknown>)
            : await readBrandingTokensW3C();
        const flatValues = flattenW3CTokens(tokens);

        let filtered = flatValues;
        if (args.filter) {
          const filterLower = (args.filter as string).toLowerCase();
          filtered = flatValues.filter(
            (item) =>
              item.path.toLowerCase().includes(filterLower) ||
              String(item.value).toLowerCase().includes(filterLower),
          );
        }

        return text({
          filter: (args.filter as string) || "none",
          totalValues: filtered.length,
          values: filtered,
          note: "Values are in W3C DTCG format. Use Storyblok MCP create_theme/update_theme to persist changes.",
        });
      }

      case "get_factor_tokens": {
        const tokens = await parseAllTokens("branding");
        const factorTokens: Record<string, unknown>[] = [];

        const factorPatterns = [/factor/i, /ratio/i, /scale/i, /multiplier/i];

        for (const [tokenName, data] of tokens.entries()) {
          const isFactorToken = factorPatterns.some((pattern) =>
            pattern.test(tokenName),
          );

          if (!isFactorToken) continue;

          if (args.type) {
            if (
              !tokenName
                .toLowerCase()
                .includes((args.type as string).toLowerCase())
            ) {
              continue;
            }
          }

          factorTokens.push({
            name: tokenName,
            value: data.value,
            file: data.file,
            category: data.category,
            description: getFactorDescription(tokenName),
            ...(data.section && { section: data.section }),
            ...(data.comment && { comment: data.comment }),
          });
        }

        factorTokens.sort((a, b) =>
          (a.name as string).localeCompare(b.name as string),
        );

        return text({
          type: (args.type as string) || "all",
          totalTokens: factorTokens.length,
          note: "Factor tokens are multipliers that affect other token calculations",
          tokens: factorTokens,
        });
      }

      case "get_breakpoint_tokens": {
        const tokens = await parseAllTokens("branding");
        const breakpointTokens: Record<string, unknown>[] = [];

        for (const [tokenName, data] of tokens.entries()) {
          const isBreakpoint =
            tokenName.includes("breakpoint") ||
            tokenName.includes("bp-") ||
            tokenName.includes("-bp");

          if (!isBreakpoint) continue;

          breakpointTokens.push({
            name: tokenName,
            value: data.value,
            file: data.file,
            category: data.category,
            ...(data.section && { section: data.section }),
            ...(data.comment && { comment: data.comment }),
          });
        }

        // Also get breakpoints from W3C branding tokens
        const w3cTokens = await readBrandingTokensW3C();
        if ((w3cTokens as Record<string, unknown>).breakpoints) {
          const bpFlat = flattenW3CTokens({
            breakpoints: (w3cTokens as Record<string, unknown>).breakpoints,
          } as Record<string, unknown>);
          for (const entry of bpFlat) {
            breakpointTokens.push({
              name: entry.path,
              value: entry.value,
              file: "branding-tokens.json",
              category: "w3c-branding",
              source: "w3c",
            });
          }
        }

        breakpointTokens.sort((a, b) =>
          (a.name as string).localeCompare(b.name as string),
        );

        return text({
          totalTokens: breakpointTokens.length,
          note: "Breakpoints define responsive design boundaries",
          tokens: breakpointTokens,
        });
      }

      case "get_duration_tokens": {
        const tokens = await parseAllTokens("branding");
        const durationTokens: Record<string, unknown>[] = [];

        for (const [tokenName, data] of tokens.entries()) {
          const isDuration =
            tokenName.includes("duration") ||
            tokenName.includes("timing") ||
            tokenName.includes("transition") ||
            tokenName.includes("animation");

          if (!isDuration) continue;

          durationTokens.push({
            name: tokenName,
            value: data.value,
            file: data.file,
            category: data.category,
            ...(data.section && { section: data.section }),
            ...(data.comment && { comment: data.comment }),
          });
        }

        durationTokens.sort((a, b) =>
          (a.name as string).localeCompare(b.name as string),
        );

        return text({
          totalTokens: durationTokens.length,
          note: "Duration tokens control animation and transition timing",
          tokens: durationTokens,
        });
      }

      // ── Theme Generation ────────────────────────────────────────────

      case "generate_theme_from_image": {
        if (!args.imageBase64 && !args.imageUrl) {
          throw new Error(
            "Either 'imageBase64' or 'imageUrl' must be provided",
          );
        }
        if (args.imageBase64 && args.imageUrl) {
          throw new Error(
            "Provide either 'imageBase64' or 'imageUrl', not both",
          );
        }

        let base64Data: string;
        let mimeType: string;

        if (args.imageUrl) {
          const fetched = await fetchImageAsBase64(args.imageUrl as string);
          base64Data = fetched.base64;
          mimeType = fetched.mimeType;
        } else {
          base64Data = args.imageBase64 as string;
          mimeType = (args.mimeType as string) || "image/png";
        }

        const w3cConfig = await readBrandingTokensW3C();
        const imageSchemaDescription = getBrandingSchemaDescription();

        return {
          content: [
            {
              type: "image" as const,
              data: base64Data,
              mimeType,
            },
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  instruction:
                    "Analyze this image and generate a branding theme based on what you see. " +
                    "Look at the colors, typography style, spacing density, and visual personality of the design. " +
                    "Build a complete W3C DTCG branding token object matching the schema below, " +
                    "then use the Storyblok MCP 'create_theme' tool to persist it. " +
                    "Optionally call 'validate_theme' first to check validity.",
                  referenceTokens: w3cConfig,
                  schemaDescription: imageSchemaDescription,
                  availablePaths: Object.keys(imageSchemaDescription),
                  tips: [
                    "Extract the dominant brand color for 'color.primary.$root' — use W3C DTCG color format: { $type: 'color', $value: { colorSpace: 'srgb', components: [r, g, b] } } where r/g/b are 0-1 floats",
                    "Identify if headings use a serif or sans-serif typeface for 'font.family.display'",
                    "Estimate spacing density: tight (base ~8-10), normal (12-14), generous (16-20)",
                    "Observe corner rounding: sharp (0-2px), slightly rounded (4-6px), rounded (8-12px), pill (16px+)",
                    "Derive inverted/dark-mode colors as lighter or more saturated variants of the base colors",
                    "For font families, provide a full CSS font stack with appropriate fallbacks",
                    "After building the token object, call 'validate_theme' to check, then 'create_theme' on the Storyblok MCP to save",
                  ],
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "extract_theme_from_css": {
        if (!args.url) {
          throw new Error("URL is required");
        }

        const cssResult = await fetchWebsiteCSS(args.url as string, {
          maxStylesheets: (args.maxStylesheets as number) || 20,
        });

        const cssW3CConfig = await readBrandingTokensW3C();
        const cssSchemaDescription = getBrandingSchemaDescription();

        // Collect all CSS
        const allCSS = [
          ...cssResult.inlineStyles,
          ...cssResult.linkedStylesheets
            .filter((s) => s.css !== null)
            .map((s) => s.css),
        ].join("\n");

        // Extract custom properties
        const customPropsRegex = /--([a-zA-Z0-9-]+)\s*:\s*([^;}{]+)/g;
        const customProperties: Array<{ name: string; value: string }> = [];
        let cpMatch;
        while ((cpMatch = customPropsRegex.exec(allCSS)) !== null) {
          customProperties.push({
            name: `--${cpMatch[1]}`,
            value: cpMatch[2].trim(),
          });
        }

        // Deduplicate
        const seenProps = new Set<string>();
        const uniqueCustomProperties = customProperties.filter((prop) => {
          if (seenProps.has(prop.name)) return false;
          seenProps.add(prop.name);
          return true;
        });

        // Extract :root / html custom properties
        const rootBlockRegex = /(?::root|html)\s*\{([^}]+)\}/gi;
        const rootProperties: Array<{ name: string; value: string }> = [];
        let rootMatch;
        while ((rootMatch = rootBlockRegex.exec(allCSS)) !== null) {
          const block = rootMatch[1];
          const propRegex = /--([a-zA-Z0-9-]+)\s*:\s*([^;]+)/g;
          let propMatch;
          while ((propMatch = propRegex.exec(block)) !== null) {
            rootProperties.push({
              name: `--${propMatch[1]}`,
              value: propMatch[2].trim(),
            });
          }
        }

        // Build response
        const responseContent: McpResult["content"] = [];

        responseContent.push({
          type: "text",
          text: JSON.stringify(
            {
              instruction:
                "Analyze the CSS extracted from this website and generate a branding theme. " +
                "The CSS contains exact color values, font families, font sizes, spacing, and other design properties. " +
                "Build a complete W3C DTCG branding token object matching the schema below, " +
                "then use the Storyblok MCP 'create_theme' tool to persist it. " +
                "Optionally call 'validate_theme' first to check validity.",
              sourceUrl: args.url,
              summary: cssResult.summary,
              rootCustomProperties:
                rootProperties.length > 0
                  ? rootProperties
                  : "No :root custom properties found",
              allCustomProperties: uniqueCustomProperties.slice(0, 200),
              referenceTokens: cssW3CConfig,
              schemaDescription: cssSchemaDescription,
              availablePaths: Object.keys(cssSchemaDescription),
              tips: [
                "CSS custom properties (especially in :root) are the most reliable source for theme colors",
                "Look for properties named with 'primary', 'brand', 'accent' for the primary color",
                "The most commonly declared font-family is likely the body font",
                "Check for design system naming patterns (e.g., --color-primary, --font-base-size)",
                "border-radius values indicate the design's corner rounding preference",
                "If the site uses a CSS framework, its custom properties often define the complete palette",
                "Build the W3C DTCG token object using color format: { $type: 'color', $value: { colorSpace: 'srgb', components: [r, g, b] } }",
                "After building the token object, call 'validate_theme' to check, then 'create_theme' on the Storyblok MCP to save",
              ],
            },
            null,
            2,
          ),
        });

        // Optionally include raw CSS
        if (args.includeRawCSS) {
          const maxCSSLength = 200_000;
          const truncatedCSS =
            allCSS.length > maxCSSLength
              ? allCSS.slice(0, maxCSSLength) +
                `\n\n/* ... truncated (${
                  allCSS.length - maxCSSLength
                } chars omitted) */`
              : allCSS;

          responseContent.push({
            type: "text",
            text: `--- RAW CSS (${cssResult.summary.linkedStylesheets} stylesheets + ${cssResult.summary.inlineStyleBlocks} inline blocks) ---\n\n${truncatedCSS}`,
          });
        }

        return { content: responseContent };
      }

      // ── Component Tokens ────────────────────────────────────────────

      case "list_components": {
        const categoryFilter =
          args.category && args.category !== "all"
            ? (args.category as string)
            : null;
        const includeEmpty = (args.includeEmpty as boolean) || false;
        const componentEntries: Record<string, unknown>[] = [];

        for (const [slug, config] of Object.entries(COMPONENT_TOKEN_FILES)) {
          if (categoryFilter && config.category !== categoryFilter) continue;

          const filePath = path.join(COMPONENT_TOKENS_DIR, config.file);
          let tokenCount = 0;
          let propertyTypes: string[] = [];
          let hasResponsiveOverrides = false;

          try {
            await fs.access(filePath);
            const content = await fs.readFile(filePath, "utf-8");
            const tokens = await parseTokenFile(filePath, config.category);
            tokenCount = tokens.size;

            hasResponsiveOverrides = /@container|@media/.test(content);

            const propSet = new Set<string>();
            for (const [name] of tokens.entries()) {
              const parsed = parseComponentTokenName(name, slug);
              propSet.add(parsed.cssProperty);
            }
            propertyTypes = Array.from(propSet).sort();
          } catch {
            // File doesn't exist
          }

          if (!includeEmpty && tokenCount === 0) continue;

          componentEntries.push({
            name: slug
              .replace(/-/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase()),
            slug,
            category: config.category,
            file: config.file,
            tokenCount,
            description: config.description,
            hasResponsiveOverrides,
            tokenPropertyTypes: propertyTypes,
          });
        }

        componentEntries.sort((a, b) =>
          (a.slug as string).localeCompare(b.slug as string),
        );

        return text({
          totalComponents: componentEntries.length,
          category: categoryFilter || "all",
          components: componentEntries,
        });
      }

      case "get_component_tokens": {
        if (!args.component) {
          throw new Error(
            "Component name is required. Use list_components to discover valid names.",
          );
        }

        const slug = (args.component as string).toLowerCase();
        const config =
          COMPONENT_TOKEN_FILES[slug as keyof typeof COMPONENT_TOKEN_FILES];

        if (!config) {
          const available = Object.keys(COMPONENT_TOKEN_FILES);
          const suggestions = available
            .filter(
              (s) =>
                s.includes(slug) ||
                slug.includes(s) ||
                s.split("-").some((part) => slug.includes(part)),
            )
            .slice(0, 5);

          return text({
            error: `Component '${slug}' not found`,
            suggestions: suggestions.length > 0 ? suggestions : undefined,
            hint: "Use 'list_components' to discover available component names",
            availableCategories: Object.keys(COMPONENT_CATEGORIES),
          });
        }

        let tokens = await parseAllComponentTokens(slug);

        // Apply element filter
        if (args.element) {
          const el = (args.element as string).toLowerCase();
          tokens = tokens.filter(
            (t) => t.element && t.element.toLowerCase().includes(el),
          );
        }

        // Apply property filter
        if (args.property) {
          const prop = (args.property as string).toLowerCase();
          tokens = tokens.filter((t) =>
            t.cssProperty.toLowerCase().includes(prop),
          );
        }

        // Apply statesOnly filter
        if (args.statesOnly) {
          tokens = tokens.filter((t) => t.state !== null);
        }

        // Build summary
        const variants = [
          ...new Set(tokens.filter((t) => t.variant).map((t) => t.variant)),
        ];
        const elements = [
          ...new Set(tokens.filter((t) => t.element).map((t) => t.element)),
        ];
        const states = [
          ...new Set(tokens.filter((t) => t.state).map((t) => t.state)),
        ];
        const propTypes = [...new Set(tokens.map((t) => t.cssProperty))];

        tokens.sort((a, b) => a.name.localeCompare(b.name));

        return text({
          component: slug,
          file: config.file,
          category: config.category,
          description: config.description,
          totalTokens: tokens.length,
          filters: {
            element: (args.element as string) || null,
            property: (args.property as string) || null,
            statesOnly: args.statesOnly || false,
          },
          tokens,
          summary: {
            variants,
            elements,
            states,
            propertyTypes: propTypes,
          },
        });
      }

      case "search_component_tokens": {
        if (!args.pattern) {
          throw new Error("Search pattern is required");
        }

        const lowerPattern = (args.pattern as string).toLowerCase();
        const searchIn = (args.searchIn as string) || "both";

        let allTokens = await parseAllComponentTokens(
          (args.component as string) || null,
        );

        // Apply category filter
        if (args.category) {
          allTokens = allTokens.filter((t) => t.category === args.category);
        }

        // Apply search pattern
        const results: typeof allTokens = [];
        for (const token of allTokens) {
          const matchName =
            (searchIn === "both" || searchIn === "name") &&
            token.name.toLowerCase().includes(lowerPattern);
          const matchValue =
            (searchIn === "both" || searchIn === "value") &&
            token.value.toLowerCase().includes(lowerPattern);
          const matchComment =
            searchIn === "both" &&
            token.comment &&
            token.comment.toLowerCase().includes(lowerPattern);
          const matchComponent =
            searchIn === "both" &&
            token.component.toLowerCase().includes(lowerPattern);

          if (matchName || matchValue || matchComment || matchComponent) {
            results.push(token);
          }
        }

        results.sort((a, b) => {
          const compCmp = a.component.localeCompare(b.component);
          return compCmp !== 0 ? compCmp : a.name.localeCompare(b.name);
        });

        const limit = (args.limit as number) || 50;
        const limitedResults = results.slice(0, limit);

        return text({
          pattern: args.pattern,
          searchIn,
          component: (args.component as string) || "all",
          category: (args.category as string) || "all",
          totalMatches: results.length,
          returned: limitedResults.length,
          results: limitedResults,
        });
      }

      // ── Design Governance ───────────────────────────────────────────

      case "get_design_rules": {
        const rules = await loadDesignRules();
        let result = [...rules];

        if (args.ruleId) {
          const rule = rules.find((r) => r.id === args.ruleId);
          if (!rule) {
            throw new Error(
              `Rule '${args.ruleId}' not found. Available rules: ${rules
                .map((r) => r.id)
                .join(", ")}`,
            );
          }
          result = [rule];
        }

        if (args.category) {
          result = result.filter((r) => r.category === args.category);
        }

        if (args.severity) {
          result = result.filter((r) => r.severity === args.severity);
        }

        return text({
          totalRules: result.length,
          filters: {
            ruleId: (args.ruleId as string) || null,
            category: (args.category as string) || null,
            severity: (args.severity as string) || null,
          },
          rules: result,
        });
      }

      case "get_token_hierarchy": {
        const hierarchy = await getTokenHierarchy(args.category as string);
        return text(hierarchy);
      }

      case "validate_token_usage": {
        const validationResult = await validateTokenUsages(
          args.context as string,
          (args.designContext as string) || null,
          args.tokenUsages as Array<{
            token?: string;
            cssProperty: string;
            element?: string;
            value?: string;
          }>,
        );
        return text(validationResult);
      }

      case "get_token_for_context": {
        const recommendation = await recommendTokenForContext(
          args.cssProperty as string,
          args.element as string,
          (args.designContext as string) || null,
          {
            interactive: (args.interactive as boolean) || false,
            inverted: (args.inverted as boolean) || false,
          },
        );
        return text(recommendation);
      }

      case "validate_component_tokens": {
        const auditResult = await auditComponentTokens(
          args.component as string,
        );

        // If it's an error result, return as-is
        if ("error" in auditResult) {
          return text(auditResult);
        }

        // Apply severity filter
        if (args.severity && args.severity !== "all") {
          const severityOrder: Record<string, number> = {
            critical: 0,
            warning: 1,
            info: 2,
          };
          const minLevel = severityOrder[args.severity as string] ?? 2;
          auditResult.violations = auditResult.violations.filter(
            (v) => (severityOrder[v.severity] ?? 2) <= minLevel,
          );
          auditResult.summary = {
            ...auditResult.summary,
            total: auditResult.violations.length,
            critical: auditResult.violations.filter(
              (v) => v.severity === "critical",
            ).length,
            warning: auditResult.violations.filter(
              (v) => v.severity === "warning",
            ).length,
            info: auditResult.violations.filter((v) => v.severity === "info")
              .length,
          };
        }

        return text(auditResult);
      }

      case "audit_all_components": {
        const fullAudit = await auditAllComponents(
          (args.category as string) || "all",
          (args.minSeverity as string) || "info",
        );
        return text(fullAudit);
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: (error as Error).message,
              tool: name,
              timestamp: new Date().toISOString(),
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }
}
