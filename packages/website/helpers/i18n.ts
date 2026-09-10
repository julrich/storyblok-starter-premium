/**
 * The site's language / URL model, in one place.
 *
 * German is the default language and is served unprefixed from the root
 * (`/`, `/kontakt`, `/produkte`). English lives in an `en` folder in Storyblok
 * and is served from `/en`, `/en/contact`, `/en/products`. Those URLs predate
 * the monorepo migration and have to stay exactly as they are.
 *
 * The starter assumes instead that *every* language carries a prefix, which is
 * why several places used to build `/de/kontakt` and `/en/home` - neither of
 * which exists here. Everything that needs to reason about languages or build
 * a cross-language URL should go through this module rather than re-deriving
 * the rules.
 */

/** Languages the site publishes, in the order the language switcher shows them. */
export const LANGUAGES = ["de", "en"] as const;

export type Language = (typeof LANGUAGES)[number];

/** The default language is served from the root, without a URL prefix. */
export const DEFAULT_LANGUAGE: Language = "de";

/**
 * Storyblok slug of the default language's home story. Storyblok serves it from
 * the space root, so it maps to `/` rather than to `/home`.
 */
export const INDEX_SLUG = "home";

/** URL prefix for a language: empty for the default language, the code otherwise. */
export function languagePrefix(language: Language): string {
  return language === DEFAULT_LANGUAGE ? "" : language;
}

/**
 * Language a Storyblok `full_slug` or a site path belongs to.
 *
 * `home` / `kontakt` / `/produkte` -> `de`
 * `en` / `en/` / `en/contact` / `/en/contact` -> `en`
 */
export function languageOf(slugOrPath: string = ""): Language {
  const [first] = slugOrPath.replace(/^\/+/, "").split("/");
  return (
    LANGUAGES.find(
      (language) => language !== DEFAULT_LANGUAGE && language === first,
    ) ?? DEFAULT_LANGUAGE
  );
}

/** Home page of a language: `/` for German, `/en` for English. */
export function homePath(language: Language): string {
  const prefix = languagePrefix(language);
  return prefix ? `/${prefix}` : "/";
}

/**
 * Site path for a Storyblok `full_slug`. Covers both shapes Storyblok uses for
 * a landing page: the space root story (`home`) and folder start pages, whose
 * `full_slug` carries a trailing slash (`en/`, `produkte/`).
 */
export function pathOf(fullSlug: string): string {
  if (fullSlug === INDEX_SLUG) return "/";
  const trimmed = fullSlug.replace(/^\/+|\/+$/g, "");
  return trimmed ? `/${trimmed}` : "/";
}
