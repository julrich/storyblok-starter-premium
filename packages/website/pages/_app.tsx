import path from "path";
import { useEffect } from "react";
import type { NextPage } from "next";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { JsonLd } from "react-schemaorg";
import { BreadcrumbList } from "schema-dts";

import DsaProviders from "@kickstartds/design-system/providers";
import { Header } from "@kickstartds/design-system/header";
import { Footer } from "@kickstartds/design-system/footer";
import { Breadcrumb } from "@kickstartds/design-system/breadcrumb";
import {
  initStoryblok,
  storyProcessing,
  resolvableRelations,
} from "@/helpers/storyblok";
import { unflatten } from "@/helpers/unflatten";
import Meta from "@/components/Meta";
import "lazysizes/plugins/attrchange/ls.attrchange";

import ComponentProviders from "@/components/ComponentProviders";
import ImageSizeProviders from "@/components/ImageSizeProviders";
import ImageRatioProviders from "@/components/ImageRatioProviders";

import palette from "@kickstartds/design-system/global.client.js";
import "@kickstartds/design-system/global.css";
import "@/index.scss";
import "@/components/prompter/prompter.scss";
import { BlurHashProvider } from "@/components/BlurHashContext";
import { nextFontFamilies, localFontFamilyName } from "@/helpers/fonts";
import {
  LanguageProvider,
  AlternatesProvider,
} from "@/components/LanguageContext";
import {
  DEFAULT_LANGUAGE,
  homePath,
  languageOf,
  languagePrefix,
} from "@/helpers/i18n";
import { BookADemo } from "@/components/book-a-demo/BookADemoComponent";
import HeaderButtonContext from "@/components/HeaderButtonContext";
import { SettingsContext } from "@/components/SettingsContext";
import { Section } from "@kickstartds/design-system/components/section/index.js";
import { StoryblokComponent, useStoryblokState } from "@storyblok/react";

initStoryblok(process.env.NEXT_STORYBLOK_API_TOKEN);
if (typeof window !== "undefined") {
  console.log(palette);
}

const handleRouteChange = (url: string) => {
  // close mobile nav
  window._ks.radio.emit("location.change", url);
  // https://github.com/vercel/next.js/issues/33060
  document.activeElement instanceof HTMLElement &&
    document.activeElement.blur();
};

const setActiveNavItem = (navItems: any[] = [], currentRoute: string) => {
  const route = currentRoute.replace(/^\/|\/$/g, "");
  for (const navItem of navItems) {
    const href = navItem.url.replace(/^\/|\/$/g, "");
    navItem.active = href === route;

    if (navItem.items && Array.isArray(navItem.items)) {
      for (const item of navItem.items) {
        const itemHref = item.url.replace(/^\/|\/$/g, "");
        item.active = itemHref === route;
        navItem.active ||= item.active;
      }
    }
  }
};

export default function App({
  Component,
  pageProps,
}: AppProps & {
  Component: NextPage;
}) {
  const router = useRouter();
  const isPreview = router.pathname.startsWith("/_preview");

  // In preview mode, get live story updates from the Storyblok Visual Editor bridge.
  // This ensures hero extraction below always operates on the latest data,
  // preventing a stale hero from appearing above the breadcrumb while
  // the page component renders the updated hero again below it.
  const liveStory = useStoryblokState(pageProps.story ?? null, {
    resolveRelations: resolvableRelations.join(","),
  });
  const story = liveStory || pageProps.story;

  if (isPreview && story?.content) {
    storyProcessing(story.content, true);
  }

  const { settings, blurHashes, language } = pageProps;
  const headerProps = settings?.header ? unflatten(settings?.header) : {};
  const footerProps = settings?.footer ? unflatten(settings?.footer) : {};
  const storyProps = story?.content ? unflatten(story?.content) : {};

  // Theme CSS: page-level theme overrides global theme
  const themeCss = storyProps?.themeCss || settings?.themeCss || "";
  // Component-level token overrides (scoped CSS from Design Tokens Editor)
  const componentCss = storyProps?.componentCss || settings?.componentCss || "";
  // Manual token overrides layer on top of the selected theme
  const tokenOverrides = storyProps?.token || settings?.token || "";
  // Combined token string: theme CSS + component overrides + manual overrides.
  // Rewrite --ks-brand-font-family-* values in theme CSS: if the stored value starts
  // with the same font that next/font manages locally, replace it with next/font's
  // internal synthetic name (e.g. "__displayFont_0ac8ec"). This ensures the browser
  // uses next/font's optimised @font-face rather than looking up a name with no
  // declaration. Themes using a different font (e.g. a Google Font) are unaffected.
  const resolveNextFontFamilies = (css: string) => {
    // Match property + value up to the semicolon so we replace the whole value
    return css
      .replace(/(--ks-brand-font-family-display\s*:)[^;]+/g, (match, prop) => {
        const val = match.slice(prop.length).trim();
        const firstFont = val.split(",")[0].replace(/["']/g, "").trim();
        return firstFont === localFontFamilyName
          ? `${prop} ${nextFontFamilies.display}`
          : match;
      })
      .replace(/(--ks-brand-font-family-copy\s*:)[^;]+/g, (match, prop) => {
        const val = match.slice(prop.length).trim();
        const firstFont = val.split(",")[0].replace(/["']/g, "").trim();
        return firstFont === localFontFamilyName
          ? `${prop} ${nextFontFamilies.copy}`
          : match;
      })
      .replace(
        /(--ks-brand-font-family-interface\s*:)[^;]+/g,
        (match, prop) => {
          const val = match.slice(prop.length).trim();
          const firstFont = val.split(",")[0].replace(/["']/g, "").trim();
          return firstFont === localFontFamilyName
            ? `${prop} ${nextFontFamilies.interface}`
            : match;
        },
      );
  };
  const token = [themeCss, componentCss, tokenOverrides]
    .filter(Boolean)
    .map(resolveNextFontFamilies)
    .join("\n");

  const invertHeader = storyProps?.header?.inverted
    ? !headerProps?.inverted
    : headerProps?.inverted;
  const floatHeader = storyProps?.header?.floating
    ? !headerProps?.floating
    : headerProps?.floating;
  const invertFooter = storyProps?.footer?.inverted
    ? !footerProps?.inverted
    : footerProps?.inverted;
  const hideBreadcrumbs =
    settings?.hideBreadcrumbs || storyProps?.hidePageBreadcrumbs || false;
  const hideBookDemoButton = storyProps?.hideBookDemoButton || false;

  setActiveNavItem(headerProps?.navItems, router.asPath);

  useEffect(() => {
    router.events.on("routeChangeStart", handleRouteChange);
    return () => router.events.off("routeChangeStart", handleRouteChange);
  }, [router.events]);

  const url = new URL(router.asPath, "http://dummy-base");
  let pathSegments = url.pathname.split("/").filter(Boolean);
  // Strip _preview prefix (internal preview route)
  if (pathSegments[0] === "_preview") pathSegments = pathSegments.slice(1);
  // Detect language prefix so breadcrumbs don't expose it. German is the
  // default language and carries no prefix, so there is nothing to strip there.
  const pathLanguage = languageOf(pathSegments.join("/"));
  const langPrefix = languagePrefix(pathLanguage) || null;
  const contentSegments = langPrefix ? pathSegments.slice(1) : pathSegments;
  const breadcrumbItems = contentSegments.map((segment, index) => ({
    label: segment.charAt(0).toUpperCase() + segment.slice(1),
    url: path.join(
      "/",
      ...(langPrefix ? [langPrefix] : []),
      ...contentSegments.slice(0, index + 1),
    ),
  }));
  if (breadcrumbItems[0]?.label.toLowerCase() !== "home") {
    breadcrumbItems.unshift({
      label: "Home",
      url: homePath(pathLanguage),
    });
  }

  let heroSection;
  let newPageProps =
    story !== pageProps.story ? { ...pageProps, story } : pageProps;
  const heroSectionFirst =
    story?.content?.section?.[0]?.components?.[0]?.component === "hero";
  if (heroSectionFirst) {
    const [firstSection, ...restSections] = story?.content?.section;

    heroSection = firstSection;

    newPageProps = {
      ...pageProps,
      story: {
        ...story,
        content: {
          ...story?.content,
          section: restSections,
        },
      },
    };
  }

  const logoUrl: string | undefined =
    storyProps?.header?.logo || (headerProps as any)?.logo?.src || undefined;

  return (
    <SettingsContext.Provider value={{ logoUrl }}>
      <LanguageProvider language={language ?? DEFAULT_LANGUAGE}>
        <AlternatesProvider alternates={story?.alternates ?? []}>
          <BlurHashProvider blurHashes={blurHashes}>
            <DsaProviders>
              <HeaderButtonContext.Provider
                value={{
                  enabled: settings?.headerButton_enabled,
                  label: settings?.headerButton_label,
                  url: settings?.headerButton_url,
                }}
              >
                <ComponentProviders>
                  <ImageSizeProviders>
                    <ImageRatioProviders>
                      <Meta
                        globalSeo={settings?.seo}
                        pageSeo={story?.content.seo}
                        fallbackName={story?.name}
                        currentSlug={story?.full_slug}
                        currentLang={language}
                        alternates={story?.alternates}
                      />
                      {token && (
                        <style
                          data-tokens
                          dangerouslySetInnerHTML={{ __html: token }}
                        ></style>
                      )}
                      {headerProps && (
                        <Header
                          {...headerProps}
                          inverted={invertHeader}
                          floating={floatHeader}
                          logo={{
                            ...headerProps?.logo,
                            src:
                              storyProps?.header?.logo ||
                              headerProps?.logo?.src,
                            homepageHref: headerProps?.logo?.homepageHref
                              ? `/${headerProps.logo.homepageHref}`
                              : homePath(languageOf(language)),
                          }}
                        />
                      )}
                      {heroSection && <StoryblokComponent blok={heroSection} />}
                      {!hideBreadcrumbs &&
                        breadcrumbItems &&
                        breadcrumbItems.length > 1 && (
                          <Section
                            width="wide"
                            spaceAfter="none"
                            spaceBefore="none"
                          >
                            <Breadcrumb pages={breadcrumbItems} />
                            <JsonLd<BreadcrumbList>
                              item={{
                                "@context": "https://schema.org",
                                "@type": "BreadcrumbList",
                                name: "Breadcrumbs",
                                itemListElement: breadcrumbItems.map(
                                  (item, index) => ({
                                    "@type": "ListItem",
                                    position: index + 1,
                                    name: item.label,
                                    item: `${process.env.NEXT_PUBLIC_SITE_URL || ""}${
                                      item.url
                                    }`,
                                  }),
                                ),
                              }}
                            />
                          </Section>
                        )}
                      <Component {...newPageProps} />
                      {footerProps && (
                        <Footer
                          {...footerProps}
                          inverted={invertFooter || false}
                          logo={{
                            ...footerProps?.logo,
                            src:
                              storyProps?.footer?.logo ||
                              footerProps?.logo?.src,
                          }}
                        />
                      )}
                      <BookADemo
                        enabled={
                          settings?.bookDemoButton_enabled &&
                          !hideBookDemoButton
                        }
                        label={settings?.bookDemoButton_label}
                        url={settings?.bookDemoButton_url}
                        variant={settings?.bookDemoButton_variant}
                      />
                    </ImageRatioProviders>
                  </ImageSizeProviders>
                </ComponentProviders>
              </HeaderButtonContext.Provider>
            </DsaProviders>
          </BlurHashProvider>
        </AlternatesProvider>
      </LanguageProvider>
    </SettingsContext.Provider>
  );
}
