/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
  changefreq: "daily",
  priority: 0.7,
  generateRobotsTxt: true,
  // Search result pages have no content of their own - keep them out of the
  // index, the modal and the header link are how people are meant to reach them.
  exclude: ["/server-sitemap.xml", "/suche", "/en/search"],
  robotsTxtOptions: {
    additionalSitemaps: [
      `${process.env.NEXT_PUBLIC_SITE_URL}/server-sitemap.xml`,
    ],
  },
};
