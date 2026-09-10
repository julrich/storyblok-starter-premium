/**
 * URL scraping utilities.
 *
 * Fetches a web page and converts it to clean Markdown with structured
 * image extraction. Uses Mozilla's Readability for article extraction
 * and Turndown for HTML → Markdown conversion.
 *
 * No Storyblok or OpenAI dependencies — pure utility module.
 */
import TurndownService from "turndown";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

// ─── Types ────────────────────────────────────────────────────────────

/** Describes an image discovered during scraping. */
export interface ScrapedImage {
  src: string;
  alt: string;
  /** Where the image was found: 'content', 'background', 'meta', 'picture-source'. */
  context: string;
}

/** Options for the scrapeUrl function. */
export interface ScrapeUrlOptions {
  /** The URL to fetch and convert to Markdown. */
  url: string;
  /** Optional CSS selector to extract a specific part of the page. */
  selector?: string;
}

/** Result of scraping a URL. */
export interface ScrapeUrlResult {
  /** The original URL. */
  url: string;
  /** Clean Markdown content. */
  markdown: string;
  /** Page title. */
  title: string;
  /** Structured array of discovered images. */
  images: ScrapedImage[];
}

// ─── Main Function ────────────────────────────────────────────────────

/**
 * Fetch a URL and convert its HTML content to Markdown.
 *
 * The function:
 * 1. Fetches the page HTML with a browser-like User-Agent
 * 2. Parses it into a full DOM with JSDOM
 * 3. Runs @mozilla/readability to extract the main article content
 *    (falls back to a CSS-selector or <main>/<body> if Readability returns nothing)
 * 4. Converts the readable HTML to clean Markdown using Turndown
 * 5. Extracts images from <img>, <picture>/<source>, CSS background-image,
 *    lazy-loading data attributes, and Open Graph / meta tags
 * 6. Returns the title, Markdown, and a structured images array
 */
export async function scrapeUrl(
  options: ScrapeUrlOptions
): Promise<ScrapeUrlResult> {
  // ── 1. Fetch ──────────────────────────────────────────────────────────
  const response = await fetch(options.url, {
    headers: {
      Accept: "text/html",
      "User-Agent":
        "Mozilla/5.0 (compatible; kickstartDS-MCP/1.0; +https://www.kickstartds.com)",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch URL: ${response.status} ${response.statusText}`
    );
  }

  const html = await response.text();

  // ── 2. Parse into DOM ─────────────────────────────────────────────────
  const dom = new JSDOM(html, { url: options.url });
  const document = dom.window.document;

  const title = document.querySelector("title")?.textContent?.trim() ?? "";

  // ── 3. Collect images BEFORE Readability mutates the DOM ──────────────
  const images: ScrapedImage[] = [];
  const seenSrcs = new Set<string>();

  const resolveUrl = (raw: string): string => {
    try {
      return new URL(raw, options.url).href;
    } catch {
      return raw;
    }
  };

  const addImage = (src: string, alt: string, context: string) => {
    if (!src || src.startsWith("data:")) return;
    const resolved = resolveUrl(src);
    if (seenSrcs.has(resolved)) return;
    seenSrcs.add(resolved);
    images.push({ src: resolved, alt, context });
  };

  // (a) Open Graph & meta images
  for (const meta of document.querySelectorAll(
    'meta[property="og:image"], meta[name="twitter:image"], meta[name="twitter:image:src"]'
  )) {
    const content = meta.getAttribute("content");
    if (content) addImage(content, title, "meta");
  }

  // Helper: extract images from a DOM subtree
  const collectImagesFromElement = (root: Element | Document) => {
    // (b) <img> tags — including lazy-load data attributes
    for (const img of root.querySelectorAll("img")) {
      const alt = img.getAttribute("alt") || "";
      const src =
        img.getAttribute("src") ||
        img.getAttribute("data-src") ||
        img.getAttribute("data-lazy") ||
        img.getAttribute("data-original") ||
        img.getAttribute("data-lazy-src") ||
        "";
      addImage(src, alt, "content");

      const srcset =
        img.getAttribute("srcset") || img.getAttribute("data-srcset") || "";
      const best = pickBestFromSrcset(srcset);
      if (best) addImage(best, alt, "content");
    }

    // (c) <picture> / <source> elements
    for (const source of root.querySelectorAll("picture source")) {
      const srcset = source.getAttribute("srcset") || "";
      const best = pickBestFromSrcset(srcset);
      if (best) {
        const picture = source.closest("picture");
        const alt = picture?.querySelector("img")?.getAttribute("alt") || "";
        addImage(best, alt, "picture-source");
      }
    }

    // (d) CSS background-image in inline styles
    for (const el of root.querySelectorAll("[style]")) {
      const style = el.getAttribute("style") || "";
      const bgMatches = style.matchAll(
        /background(?:-image)?\s*:[^;]*url\(\s*["']?([^"')]+)["']?\s*\)/gi
      );
      for (const m of bgMatches) {
        addImage(m[1], "", "background");
      }
    }
  };

  // Collect from the full document first
  collectImagesFromElement(document);

  // ── 4. Extract readable content ───────────────────────────────────────
  let contentHtml: string;
  let droppedLinks: { text: string; href: string }[] = [];

  if (options.selector) {
    const selected = document.querySelector(options.selector);
    contentHtml = selected
      ? selected.innerHTML
      : document.body?.innerHTML ?? html;
  } else {
    const clone = new JSDOM(html, { url: options.url });
    const reader = new Readability(clone.window.document);
    const article = reader.parse();

    if (article && article.content) {
      contentHtml = article.content;

      // Recover links that Readability dropped (CTA buttons, card links, etc.)
      const main = document.querySelector("main");
      if (main) {
        const readabilityDom = new JSDOM(contentHtml, { url: options.url });
        const readabilityHrefs = new Set<string>();
        for (const a of readabilityDom.window.document.querySelectorAll("a")) {
          const href = a.getAttribute("href");
          if (href) readabilityHrefs.add(resolveUrl(href));
        }

        for (const a of main.querySelectorAll("a")) {
          const href = a.getAttribute("href");
          const text = a.textContent?.trim();
          if (
            href &&
            text &&
            !href.startsWith("#") &&
            !readabilityHrefs.has(resolveUrl(href))
          ) {
            droppedLinks.push({ text, href: resolveUrl(href) });
          }
        }
      }
    } else {
      const main = document.querySelector("main");
      contentHtml = main ? main.innerHTML : document.body?.innerHTML ?? html;
    }
  }

  // Also collect images from extracted content (deduplicates via seenSrcs)
  const contentDom = new JSDOM(contentHtml, { url: options.url });
  collectImagesFromElement(contentDom.window.document);

  // ── 5. Convert to Markdown ────────────────────────────────────────────
  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });

  // Remove noisy elements
  turndown.remove(["script", "style", "nav"] as any);

  // Remove SVG elements
  turndown.addRule("removeSvg", {
    filter: (node) => node.tagName?.toLowerCase() === "svg",
    replacement: () => "",
  });

  // Remove page-level <header> and <footer>
  turndown.addRule("removePageHeaderFooter", {
    filter: (node) => {
      const tagName = node.tagName?.toLowerCase();
      if (tagName !== "header" && tagName !== "footer") return false;
      const parentTag = node.parentNode?.nodeName?.toLowerCase();
      return parentTag === "body" || parentTag === "#document";
    },
    replacement: () => "",
  });

  // Image handling
  turndown.addRule("images", {
    filter: "img",
    replacement: (_content, node) => {
      const el = node as HTMLElement;
      const alt = el.getAttribute("alt") || "";
      const src =
        el.getAttribute("src") ||
        el.getAttribute("data-src") ||
        el.getAttribute("data-lazy") ||
        el.getAttribute("data-original") ||
        el.getAttribute("data-lazy-src") ||
        "";
      if (!src) return "";
      return `![${alt}](${resolveUrl(src)})`;
    },
  });

  // <picture> handling
  turndown.addRule("picture", {
    filter: (node) => {
      return (
        node.tagName?.toLowerCase() === "picture" &&
        node.querySelectorAll("source").length > 0
      );
    },
    replacement: (_content, node) => {
      const el = node as HTMLElement;
      const img = el.querySelector("img");
      const alt = img?.getAttribute("alt") || "";

      for (const source of el.querySelectorAll("source")) {
        const srcset = source.getAttribute("srcset") || "";
        const best = pickBestFromSrcset(srcset);
        if (best) return `![${alt}](${resolveUrl(best)})`;
      }

      const src =
        img?.getAttribute("src") || img?.getAttribute("data-src") || "";
      if (src) return `![${alt}](${resolveUrl(src)})`;
      return "";
    },
  });

  // Background images
  turndown.addRule("backgroundImages", {
    filter: (node) => {
      const style = node.getAttribute?.("style") || "";
      return /background(?:-image)?\s*:[^;]*url\(/i.test(style);
    },
    replacement: (content, node) => {
      const style = (node as HTMLElement).getAttribute("style") || "";
      const match = style.match(
        /background(?:-image)?\s*:[^;]*url\(\s*["']?([^"')]+)["']?\s*\)/i
      );
      const bgImage = match ? `\n\n![](${resolveUrl(match[1])})\n\n` : "";
      return bgImage + content;
    },
  });

  const markdown = turndown.turndown(contentHtml);

  // Append dropped links
  let linksSection = "";
  if (droppedLinks.length > 0) {
    const seen = new Set<string>();
    const unique = droppedLinks.filter((l) => {
      if (seen.has(l.href)) return false;
      seen.add(l.href);
      return true;
    });
    linksSection =
      "\n\n---\n\n**Additional links:**\n\n" +
      unique.map((l) => `- [${l.text}](${l.href})`).join("\n");
  }

  // Clean up excessive blank lines
  const cleaned = (markdown + linksSection).replace(/\n{3,}/g, "\n\n").trim();

  return {
    url: options.url,
    title,
    markdown: cleaned,
    images,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Pick the highest-resolution image URL from a `srcset` attribute value.
 * Handles both width descriptors (`480w`) and pixel-density descriptors (`2x`).
 */
export function pickBestFromSrcset(srcset: string): string | undefined {
  if (!srcset.trim()) return undefined;

  let bestUrl: string | undefined;
  let bestValue = 0;

  for (const candidate of srcset.split(",")) {
    const parts = candidate.trim().split(/\s+/);
    if (parts.length < 1) continue;
    const url = parts[0];
    const descriptor = parts[1] || "1x";

    let value: number;
    if (descriptor.endsWith("w")) {
      value = parseInt(descriptor, 10) || 0;
    } else if (descriptor.endsWith("x")) {
      value = parseFloat(descriptor) || 1;
    } else {
      value = 0;
    }

    if (value > bestValue || !bestUrl) {
      bestValue = value;
      bestUrl = url;
    }
  }

  return bestUrl;
}
