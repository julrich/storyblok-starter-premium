import { Component, define } from "@kickstartds/core/lib/component";
import { events as lazyEvents, inBrowser } from "@kickstartds/core/lib/core";
import { debounce } from "@kickstartds/core/lib/utils";

const parser = inBrowser && new DOMParser();

const renderPagination = (
  $pagination,
  $linkTemplate,
  totalPages,
  currentPageIndex,
  hrefPrefix
) => {
  if (totalPages < 2) {
    $pagination.setAttribute("hidden", "hidden");
    return;
  }

  const [$first, $prev, $pages, $next, $last] = $pagination.children;
  $pages.textContent = "";

  for (let i = 0; i < totalPages; i++) {
    const $link = $linkTemplate.cloneNode(true);
    $link.textContent = i + 1;
    $link.href = hrefPrefix + (i + 1);
    $link.setAttribute(
      "aria-current",
      i === currentPageIndex ? "page" : "false"
    );
    $pages.appendChild($link);
  }
  $first.href = hrefPrefix + 1;
  $prev.href = hrefPrefix + (currentPageIndex + 1 - 1);
  $next.href = hrefPrefix + (currentPageIndex + 1 + 1);
  $last.href = hrefPrefix + totalPages;

  if (currentPageIndex === 0) {
    $first.setAttribute("hidden", "");
    $prev.setAttribute("hidden", "");
  } else {
    $first.removeAttribute("hidden", "");
    $prev.removeAttribute("hidden", "");
  }
  if (currentPageIndex === totalPages - 1) {
    $next.setAttribute("hidden", "");
    $last.setAttribute("hidden", "");
  } else {
    $next.removeAttribute("hidden", "");
    $last.removeAttribute("hidden", "");
  }

  $pagination.removeAttribute("hidden");
};

const renderMoreButton = ($button, totalResults, totalPages) => {
  if (totalPages < 2) {
    $button.setAttribute("hidden", "hidden");
    return;
  }

  $button.removeAttribute("hidden");
  const $count = $button.children[0].children[0];
  $count.textContent = totalResults;
};

const renderResult = (result, element) => {
  const $ = element.querySelector.bind(element),
    $$ = element.querySelectorAll.bind(element);
  if (result.title) {
    const title = $("[data-result-title]");
    if (title) title.textContent = result.title;
  }
  if (result.excerpt) {
    const doc = parser.parseFromString(result.excerpt, "text/html");
    const excerpt = $("[data-result-excerpt]");
    if (excerpt) excerpt.replaceChildren(...doc.body.childNodes);
  }
  if (result.url) {
    const url = $("[data-result-url]");
    if (url) url.textContent = result.url;

    const links = $$("[data-result-link]");
    for (const link of links) {
      link.setAttribute("href", result.url);
    }
  }
  if (result.image) {
    const image = $("[data-result-image]");
    if (image) image.src = result.image;
  }
};

const limitSubResults = (subResults, limit) => {
  if (subResults.length <= limit) return subResults;
  const topUrls = [...subResults]
    .sort((a, b) => b.locations.length - a.locations.length)
    .slice(0, limit)
    .map((r) => r.url);

  return subResults.filter((r) => topUrls.includes(r.url));
};

const parseNumber = (value, fallback) => {
  const number = Number(value);
  return isNaN(number) ? fallback : number;
};

const debouncedSearch = debounce(
  (term) => window._ks.radio.emit("dsa.search.search", { term }),
  300
);

export default class SearchForm extends Component {
  static identifier = "dsa.search-form";

  lazyResults = new WeakMap();
  state = {
    term: undefined,
    page: undefined,
    results: undefined,
  };

  async loadEngine() {
    throw new Error("please connect a search engine");
  }

  constructor(element) {
    super(element);

    this.$searchInput = this.$(".dsa-search-bar__input");
    this.$resultTemplate = this.$("[data-template=result]");
    this.$subresultTemplate = this.$("[data-template=subresult]");
    this.$paginationLinkTemplate = this.$("[data-template=pagination-link]");
    this.$pagination = this.$(".dsa-pagination");
    this.$results = this.$(".dsa-search-form__results");
    this.$moreButton = this.$(".c-button");

    const subResultsLimit = parseNumber(element.dataset.maxSubresults, 3);
    this.resultsPerPage = parseNumber(element.dataset.resultsPerPage, 10);

    this.on(this.$searchInput, "input", () => {
      const term = this.$searchInput.value.trim();
      if (term.length) {
        debouncedSearch(term);
      } else {
        window._ks.radio.emit("dsa.search.reset");
      }
    });
    this.on(element, "submit", (event) => {
      event.preventDefault();
      const url = new URL(
        element.getAttribute("action") || "",
        window.location
      );
      const formData = new FormData(element);
      url.hash = new URLSearchParams(formData);
      window.location.href = url;
    });
    this.on(element, "reset", (event) => {
      window._ks.radio.emit("dsa.search.reset");
    });

    this.on(window, "hashchange", () => {
      this.updateFromHash();
    });

    this.onRadio(lazyEvents.beforeunveil, async (_, el) => {
      if (this.lazyResults.has(el)) {
        const lazyResult = this.lazyResults.get(el);
        const result = await lazyResult();
        renderResult(result, el);
        const $subResults = this.$("[data-result-subresults]", el);
        const subResults = limitSubResults(result.subResults, subResultsLimit);
        for (const subResult of subResults) {
          const $subResultClone = this.$subresultTemplate.cloneNode(true);
          $subResultClone.setAttribute("href", subResult.url);
          renderResult(subResult, $subResultClone);
          $subResults.appendChild($subResultClone);
        }
      }
    });

    // init

    this.loadEngine().then((search) => {
      this.updateFromHash();

      this.onRadio("dsa.search.reset", () => {
        this.$results.textContent = "";
        this.$pagination.setAttribute("hidden", "");
        this.state = {};
      });
      this.onRadio("dsa.search.search", async (_, { term, page = 0 }) => {
        window._ks.radio.emit("dsa.search.loading");
        this.state.term = term;
        this.state.page = page;
        try {
          this.state.results = await search(term);
          window._ks.radio.emit("dsa.search.loaded");
        } catch (e) {
          console.error(e);
          window._ks.radio.emit("dsa.search.reset");
        }
      });
      this.onRadio("dsa.search.loaded", () => {
        if (this.state.results.length) {
          const totalPages = Math.ceil(
            this.state.results.length / this.resultsPerPage
          );
          const startIndex = this.state.page * this.resultsPerPage;
          const endIndex = startIndex + this.resultsPerPage;
          const results = this.state.results.slice(startIndex, endIndex);
          this.renderResults(results);

          if (this.element.hasAttribute("action")) {
            renderMoreButton(
              this.$moreButton,
              this.state.results.length,
              totalPages
            );
          } else {
            renderPagination(
              this.$pagination,
              this.$paginationLinkTemplate,
              totalPages,
              this.state.page,
              `#q=${this.state.term}&page=`
            );
          }
        } else {
          // TODO: no results message
        }
      });
      this.onRadio("dsa.search.goToPage", (_, page) => {
        this.state.page = page;
        window._ks.radio.emit("dsa.search.loaded");
      });
    });
  }

  updateFromHash() {
    const params = new URLSearchParams(window.location.hash.slice(1));
    if (params.has("q")) {
      const term = params.get("q");
      const page = params.has("page") ? Number(params.get("page")) - 1 : 0;

      this.$searchInput.value = term;

      if (term) {
        if (term !== this.state.term) {
          window._ks.radio.emit("dsa.search.search", { term, page });
        } else if (page !== this.state.page) {
          window._ks.radio.emit("dsa.search.goToPage", page);
        }
      }
    }
  }

  renderResults(results) {
    this.$results.textContent = "";
    for (const result of results) {
      const $resultClone = this.$resultTemplate.cloneNode(true);
      this.lazyResults.set($resultClone, result);
      this.$results.appendChild($resultClone);
    }
  }

  onRadio(topic, fn) {
    const token = window._ks.radio.on(topic, fn);
    const cleanUp = () => window._ks.radio.off(token);
    this.onDisconnect(cleanUp);
    return cleanUp;
  }

  on(element, type, fn) {
    const cleanUp = () => element.removeventListener(type, fn);
    element.addEventListener(type, fn);
    this.onDisconnect(cleanUp);
    return cleanUp;
  }

  $(selector, element = this.element) {
    return element.querySelector(selector);
  }
}

define(SearchForm.identifier, SearchForm);
