import type { FetchedImage, CSSFetchResult } from "./types.js";

/**
 * Fetch an image from a URL and return it as a base64 string.
 */
export async function fetchImageAsBase64(url: string): Promise<FetchedImage> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "image/png";
    const mimeType = contentType.split(";")[0].trim();

    const supportedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
    ];
    if (!supportedTypes.some((t) => mimeType.startsWith(t))) {
      throw new Error(
        `Unsupported image type: ${mimeType}. Supported: ${supportedTypes.join(
          ", "
        )}`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    return { base64, mimeType };
  } catch (error) {
    throw new Error(
      `Failed to fetch image from URL: ${(error as Error).message}`
    );
  }
}

/**
 * Fetch all CSS used by a website (inline styles and linked stylesheets).
 */
export async function fetchWebsiteCSS(
  url: string,
  options: { maxStylesheets?: number; timeoutMs?: number } = {}
): Promise<CSSFetchResult> {
  const { maxStylesheets = 20, timeoutMs = 10000 } = options;

  // Fetch the HTML page
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let html: string;
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    html = await response.text();
  } catch (error) {
    clearTimeout(timeout);
    throw new Error(`Failed to fetch page: ${(error as Error).message}`);
  }

  // Extract inline <style> blocks
  const inlineStyles: string[] = [];
  const styleTagRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let styleMatch: RegExpExecArray | null;
  while ((styleMatch = styleTagRegex.exec(html)) !== null) {
    const css = styleMatch[1].trim();
    if (css.length > 0) {
      inlineStyles.push(css);
    }
  }

  // Extract <link rel="stylesheet"> hrefs
  const linkHrefs: string[] = [];
  const linkRegex =
    /<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  const linkRegexAlt =
    /<link[^>]+href=["']([^"']+)["'][^>]*rel=["']stylesheet["'][^>]*>/gi;
  let linkMatch: RegExpExecArray | null;

  while ((linkMatch = linkRegex.exec(html)) !== null) {
    linkHrefs.push(linkMatch[1]);
  }
  while ((linkMatch = linkRegexAlt.exec(html)) !== null) {
    if (!linkHrefs.includes(linkMatch[1])) {
      linkHrefs.push(linkMatch[1]);
    }
  }

  // Resolve relative URLs
  const baseUrl = new URL(url);
  const resolvedHrefs = linkHrefs
    .slice(0, maxStylesheets)
    .map((href) => {
      try {
        return new URL(href, baseUrl).toString();
      } catch {
        return null;
      }
    })
    .filter((h): h is string => h !== null);

  // Fetch external stylesheets in parallel
  const linkedStylesheets = await Promise.all(
    resolvedHrefs.map(async (href) => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const resp = await fetch(href, { signal: ctrl.signal });
        clearTimeout(t);
        if (!resp.ok) {
          return { href, css: null as string | null };
        }
        const css = await resp.text();
        return { href, css };
      } catch {
        clearTimeout(t);
        return { href, css: null as string | null };
      }
    })
  );

  // Build a summary of what was found
  const successfulSheets = linkedStylesheets.filter((s) => s.css !== null);

  const allCSS = [...inlineStyles, ...successfulSheets.map((s) => s.css!)].join(
    "\n"
  );

  // Extract some quick stats
  const colorMatches = allCSS.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
  const rgbMatches = allCSS.match(/rgba?\([^)]+\)/g) || [];
  const hslMatches = allCSS.match(/hsla?\([^)]+\)/g) || [];
  const fontFamilyMatches = allCSS.match(/font-family\s*:[^;}{]+/gi) || [];
  const fontSizeMatches = allCSS.match(/font-size\s*:[^;}{]+/gi) || [];
  const customPropertyMatches =
    allCSS.match(/--[a-zA-Z0-9-]+\s*:[^;}{]+/g) || [];

  const uniqueHexColors = [
    ...new Set(colorMatches.map((c) => c.toLowerCase())),
  ];
  const uniqueRgbColors = [...new Set(rgbMatches)];
  const uniqueHslColors = [...new Set(hslMatches)];
  const uniqueFontFamilies = [
    ...new Set(
      fontFamilyMatches.map((f) => f.replace(/font-family\s*:\s*/i, "").trim())
    ),
  ];

  const summary = {
    inlineStyleBlocks: inlineStyles.length,
    linkedStylesheets: successfulSheets.length,
    failedStylesheets: linkedStylesheets.length - successfulSheets.length,
    totalCSSLength: allCSS.length,
    uniqueHexColors: uniqueHexColors.slice(0, 50),
    uniqueRgbColors: uniqueRgbColors.slice(0, 30),
    uniqueHslColors: uniqueHslColors.slice(0, 30),
    uniqueFontFamilies: uniqueFontFamilies.slice(0, 20),
    fontSizeDeclarations: fontSizeMatches.length,
    cssCustomProperties: customPropertyMatches.length,
    // Flatten to satisfy the CSSFetchResult type
    uniqueColors: [
      ...uniqueHexColors.slice(0, 30),
      ...uniqueRgbColors.slice(0, 10),
    ],
    uniqueFonts: uniqueFontFamilies.slice(0, 20),
    totalCharacters: allCSS.length,
  };

  return { inlineStyles, linkedStylesheets, summary };
}
