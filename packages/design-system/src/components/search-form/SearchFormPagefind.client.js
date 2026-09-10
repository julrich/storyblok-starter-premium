import { define } from "@kickstartds/core/lib/component";
import SearchForm from "./SearchForm.client";

const staticPageFindPath = "/pagefind/pagefind.js";

const pagefindResult2searchResult = ({ sub_results, ...result }) => {
  const hasRootSubResult =
    sub_results?.[0]?.url === (result.meta.url || result.url);
  const subResults = hasRootSubResult
    ? sub_results.slice(1)
    : sub_results || [];

  return {
    title: result.meta.title,
    url: result.meta.url || result.url,
    excerpt: result.excerpt,
    image: result.meta.image,
    subResults: subResults.map((subResult) => ({
      title: subResult.title,
      url: subResult.url,
      excerpt: subResult.excerpt,
      locations: subResult.locations,
    })),
  };
};

export default class SearchFormPagefind extends SearchForm {
  static identifier = "dsa.search-form.pagefind";

  async loadEngine() {
    const pagefind = await import(/* @vite-ignore */ staticPageFindPath);
    await pagefind.init();
    return async function search(term) {
      const search = await pagefind.search(term);
      if (search) {
        return search.results.map(
          (result) => () => result.data().then(pagefindResult2searchResult)
        );
      }
    };
  }
}

define(SearchFormPagefind.identifier, SearchFormPagefind);
