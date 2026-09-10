import { createContext, forwardRef, useContext } from "react";
import { SearchResultMatchProps } from "./SearchResultMatchProps";
import "./search-result-match.scss";
import { Link } from "@kickstartds/base/lib/link";
import { RichText } from "@kickstartds/base/lib/rich-text";
import { deepMergeDefaults } from "../helpers";
import defaults from "./SearchResultMatchDefaults";

export type { SearchResultMatchProps };

export const SearchResultMatchContextDefault = forwardRef<
  HTMLAnchorElement,
  SearchResultMatchProps
>(({ title, snippet, url, ...props }, ref) => (
  <Link
    ref={ref}
    href={url}
    className="dsa-search-result-match"
    data-result-link
    {...props}
  >
    <div data-result-title className="dsa-search-result-match__title">
      {title}
    </div>
    <RichText
      text={snippet}
      className="dsa-search-result-match__snippet"
      data-result-excerpt
    />
  </Link>
));

export const SearchResultMatchContext = createContext(
  SearchResultMatchContextDefault
);
export const SearchResultMatch = forwardRef<
  HTMLAnchorElement,
  SearchResultMatchProps
>((props, ref) => {
  const Component = useContext(SearchResultMatchContext);
  return <Component {...deepMergeDefaults(defaults, props)} ref={ref} />;
});
SearchResultMatch.displayName = "SearchResultMatch";
