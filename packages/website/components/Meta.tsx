import Head from "next/head";
import { SeoStoryblok } from "@/types/components-schema";

import bundleHash from "@/components/bundle-hash";
import { languageOf, pathOf } from "@/helpers/i18n";

export default function Meta({
  pageSeo,
  globalSeo,
  fallbackName,
  currentSlug,
  currentLang,
  alternates,
}: {
  pageSeo?: SeoStoryblok;
  globalSeo?: SeoStoryblok;
  fallbackName?: string;
  currentSlug?: string;
  currentLang?: string;
  alternates?: Array<{ id?: number; full_slug?: string }>;
}) {
  const titleSegments: string[] = [];
  if (pageSeo?.title) {
    titleSegments.push(pageSeo.title);
  } else if (fallbackName) {
    titleSegments.push(fallbackName);
  }
  if (globalSeo?.title) {
    titleSegments.push(globalSeo.title);
  }
  const title = titleSegments.join(" - ");
  const description = pageSeo?.description || globalSeo?.description;
  const socialImageUrl = pageSeo?.image?.filename || globalSeo?.image?.filename;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

  // Determine the English version for x-default
  // `startsWith("en/")` used to miss the English home page, whose full_slug is
  // just "en/", and the German slugs carry no prefix at all to match on.
  const enSlug =
    currentLang === "en"
      ? currentSlug
      : alternates?.find((a) => a.full_slug && languageOf(a.full_slug) === "en")
          ?.full_slug;

  return (
    <Head>
      <title>{title}</title>
      <link rel="shortcut icon" href="/favicon/favicon.ico" />
      <meta name="description" content={description} />
      <meta
        name="keywords"
        content={pageSeo?.keywords || globalSeo?.keywords}
      />

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {socialImageUrl && (
        <meta name="image" property="og:image" content={socialImageUrl} />
      )}

      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {socialImageUrl && <meta name="twitter:image" content={socialImageUrl} />}

      {siteUrl && currentSlug && currentLang && (
        <link
          rel="alternate"
          hrefLang={currentLang}
          href={`${siteUrl}${pathOf(currentSlug)}`}
        />
      )}
      {siteUrl &&
        alternates?.map((alt) => {
          // The first path segment is only a language code for the prefixed
          // languages; for German alternates it is the page slug, which used to
          // be emitted as hrefLang="kontakt".
          if (!alt.full_slug) return null;
          return (
            <link
              key={alt.id ?? alt.full_slug}
              rel="alternate"
              hrefLang={languageOf(alt.full_slug)}
              href={`${siteUrl}${pathOf(alt.full_slug)}`}
            />
          );
        })}
      {siteUrl && enSlug && (
        <link
          rel="alternate"
          hrefLang="x-default"
          href={`${siteUrl}${pathOf(enSlug)}`}
        />
      )}

      <style>{`body { display: block !important }`}</style>
      <script
        defer
        src={`https://${process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN}/script.js`}
        data-website-id={process.env.NEXT_PUBLIC_ANALYTICS_SITE_ID}
        data-do-not-track="true"
      ></script>
      <script
        defer
        type="module"
        src={`/_/client.js?cacheBuster=${bundleHash}`}
      ></script>
    </Head>
  );
}
