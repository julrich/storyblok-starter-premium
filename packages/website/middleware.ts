import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip API routes and static assets
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const accept = request.headers.get("accept") || "";
  const isMarkdownUrl = pathname.endsWith(".md");
  const isMarkdownAccept = accept.includes("text/markdown");

  if (isMarkdownUrl || isMarkdownAccept) {
    // Strip the .md extension to get the real page slug
    const cleanPath = isMarkdownUrl ? pathname.replace(/\.md$/, "") : pathname;
    const slug = cleanPath.replace(/^\//, "") || "home";

    const url = request.nextUrl.clone();
    url.pathname = `/api/markdown/${slug}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on page routes and .md URLs, skip static assets and API
  matcher: [
    "/((?!_next/static|_next/image|favicon|pagefind|robots|sitemap).*)",
  ],
};
