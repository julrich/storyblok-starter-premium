import { NextApiRequest, NextApiResponse } from "next";
import TurndownService from "turndown";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

// Remove script, style, and nav elements
turndown.remove(["script", "style", "nav"] as any);

// Remove SVG elements
turndown.addRule("removeSvg", {
  filter: (node) => node.tagName?.toLowerCase() === "svg",
  replacement: () => "",
});

// Ignore header and footer for cleaner content
turndown.addRule("removeHeaderFooter", {
  filter: (node) => {
    const tagName = node.tagName?.toLowerCase();
    return tagName === "header" || tagName === "footer";
  },
  replacement: () => "",
});

// Better image handling — preserve alt text
turndown.addRule("images", {
  filter: "img",
  replacement: (_content, node) => {
    const el = node as HTMLElement;
    const alt = el.getAttribute("alt") || "";
    const src = el.getAttribute("src") || el.getAttribute("data-src") || "";
    if (!src) return "";
    return `![${alt}](${src})`;
  },
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const slugParts = req.query.slug;
  if (!slugParts || !Array.isArray(slugParts)) {
    return res.status(400).json({ error: "Missing slug" });
  }

  const slug = slugParts.join("/");

  try {
    // Fetch the rendered HTML page from our own Next.js server
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/${slug}`,
      {
        headers: {
          Accept: "text/html",
          // Pass through cookies for preview mode support
          Cookie: req.headers.cookie || "",
        },
      }
    );

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: `Page not found: /${slug}` });
    }

    const html = await response.text();

    // Extract the main content area (skip chrome like header/footer)
    // The <main> tag or the #__next container holds page content
    const mainMatch =
      html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
      html.match(/<div id="__next"[^>]*>([\s\S]*?)<\/div>\s*<script/i);

    const contentHtml = mainMatch ? mainMatch[1] : html;

    const markdown = turndown.turndown(contentHtml);

    // Clean up excessive blank lines
    const cleaned = markdown.replace(/\n{3,}/g, "\n\n").trim();

    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${slugParts[slugParts.length - 1] || "index"}.md"`
    );
    res.status(200).send(cleaned);
  } catch (error) {
    console.error("Markdown conversion error:", error);
    res.status(500).json({ error: "Failed to convert page to markdown" });
  }
}
