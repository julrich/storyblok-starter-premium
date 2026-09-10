import { FC, HTMLAttributes } from "react";
import classNames from "classnames";
import { Button } from "@kickstartds/base/lib/button";
import { SearchBar } from "../search-bar/SearchBarComponent";
import { SearchResult } from "../search-result/SearchResultComponent";
import { SearchResultMatch } from "../search-result-match/SearchResultMatchComponent";
import { Pagination, PageLink } from "../pagination/PaginationComponent";
import { SearchFormProps } from "./SearchFormProps";
import "./SearchForm.client";
import "./search-form.scss";

export const SearchForm: FC<
  SearchFormProps & HTMLAttributes<HTMLFormElement>
> = ({
  className,
  component = "dsa.search-form",
  result = {},
  resultPerPage,
  moreButtonLabel = "View all results",
  ...props
}) => (
  <form
    className={classNames("dsa-search-form", className)}
    ks-component={component}
    data-max-subresults={result.maxSubresults}
    data-results-per-page={resultPerPage}
    {...props}
  >
    <SearchBar />
    <div hidden>
      <li data-template="result" className="lazyload">
        <SearchResult
          showLink={result.showLink}
          imageColSize={result.imageColSize}
        />
      </li>
      <SearchResultMatch data-template="subresult" />
      <PageLink data-template="pagination-link" />
    </div>
    <ol className="dsa-search-form__results" />
    <div className="dsa-search-form__nav">
      <Pagination hidden />
      <Button
        variant="primary"
        hidden
        label={moreButtonLabel}
        type="submit"
        renderLabel={(label) => (
          <>
            {label} (<span></span>)
          </>
        )}
      />
    </div>
  </form>
);
