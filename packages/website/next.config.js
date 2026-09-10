const path = require("path");

const cspHeader = `
    default-src 'self';
    connect-src 'self' https://api.storyblok.com https://*.${process.env.NEXT_PUBLIC_PRIMARY_PUBLIC_SITE_DOMAIN} https://journeyengine.production.wlp.cloud https://${process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN} https://helpdesk.drhubert.de;
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://app.storyblok.com https://*.${process.env.NEXT_PUBLIC_PRIMARY_PUBLIC_SITE_DOMAIN} https://journeyengine.production.wlp.cloud https://${process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN} https://code.jquery.com https://helpdesk.drhubert.de;
    style-src-elem 'self' 'unsafe-inline' https://helpdesk.drhubert.de;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://journeyengine.production.wlp.cloud;
    frame-src 'self' https://youtube.com https://www.youtube.com https://player.vimeo.com *.google.com;
    img-src 'self' blob: data: https://a.storyblok.com https://placehold.co https://journeyengine.production.wlp.cloud;
    media-src 'self' blob: data: https://a.storyblok.com https://placehold.co;
    font-src 'self' https://fonts.gstatic.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors https://app.storyblok.com;
    block-all-mixed-content;
    upgrade-insecure-requests;
`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@kickstartds/base",
    "@kickstartds/blog",
    "@kickstartds/content",
    "@kickstartds/core",
    "@kickstartds/form",
    "@kickstartds/design-system",
  ],
  output: "standalone",
  // Point to monorepo root so Next.js can trace dependencies hoisted by pnpm.
  // On Next.js 13 this option only exists under `experimental` (it was
  // promoted to a top-level, stable option in later Next.js major versions).
  experimental: {
    outputFileTracingRoot: path.join(__dirname, "../../"),
  },
  webpack: (config, { isServer }) => {
    // @glidejs/glide@3.7+ has a restrictive exports map that only exposes
    // "./dist/*", but @kickstartds/content imports from "./src/*".
    // Alias the subpath to the actual filesystem location to bypass exports.
    const glideDir = path.dirname(
      require.resolve("@glidejs/glide/dist/glide.esm.js")
    );
    config.resolve.alias["@glidejs/glide/src"] = path.join(glideDir, "../src");

    if (isServer) {
      // jsdom (used by storyblok-services/scrape) and its transitive deps
      // (undici@7, whatwg-url@16, html-encoding-sniffer@6, etc.) use
      // ESM-only sub-packages and modern syntax (private class fields)
      // that webpack in Next.js 13 cannot bundle or parse.
      // Externalize them so Node.js resolves them at runtime instead.
      const serverOnlyPackages = ["jsdom", "@mozilla/readability", "turndown"];
      config.externals.push(({ request }, callback) => {
        if (
          serverOnlyPackages.some(
            (pkg) => request === pkg || request.startsWith(pkg + "/")
          )
        ) {
          return callback(null, `commonjs ${request}`);
        }
        callback();
      });
    }

    return config;
  },
};

module.exports = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader.replace(/\n/g, ""),
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "header",
            key: "host",
            value: process.env.NEXT_PUBLIC_SECONDARY_PUBLIC_SITE_DOMAIN,
          },
        ],
        destination: `https://${process.env.NEXT_PUBLIC_PRIMARY_PUBLIC_SITE_DOMAIN}/:path*`,
        permanent: true,
      },
      // Legacy URLs from the pre-relaunch site. These were Netlify `[[redirects]]`
      // rules before hosting moved to Kamal, where netlify.toml is no longer read.
      {
        source: "/start.html",
        destination: "/",
        permanent: true,
      },
      {
        source: "/downloads.html",
        destination: "/kontakt",
        permanent: true,
      },
      {
        source: "/downloads-en.html",
        destination: "/en/contact",
        permanent: true,
      },
      {
        source: "/praezisions-leistungsverstaerker.html",
        destination: "/produkte",
        permanent: true,
      },
    ];
  },
  images: {
    domains: ["a.storyblok.com", "placehold.co"].filter(Boolean),
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // async rewrites() {
  //   return [
  //     {
  //       source: "/api/c15t/:path*",
  //       destination: `${process.env.NEXT_PUBLIC_C15T_URL}/:path*`,
  //     },
  //   ];
  // },
  ...nextConfig,
};
