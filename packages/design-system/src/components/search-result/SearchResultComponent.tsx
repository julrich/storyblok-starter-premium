import { createContext, forwardRef, useContext } from "react";
import { SearchResultProps } from "./SearchResultProps";
import "./search-result.scss";
import { Link } from "@kickstartds/base/lib/link";
import { RichText } from "@kickstartds/base/lib/rich-text";
import { deepMergeDefaults } from "../helpers";
import defaults from "./SearchResultDefaults";
import classnames from "classnames";
import { Picture } from "@kickstartds/base/lib/picture";
import { Container } from "@kickstartds/core/lib/container";
import { SearchResultMatch } from "../search-result-match/SearchResultMatchComponent";

export type { SearchResultProps };

export const SearchResultContextDefault = forwardRef<
  HTMLDivElement,
  SearchResultProps
>(
  (
    {
      title,
      previewImage,
      imageColSize = "small",
      initialMatch,
      matches,
      url,
      showLink,
    },
    ref
  ) => (
    <Container name="search-result">
      <div
        ref={ref}
        className={classnames("dsa-search-result", {
          "dsa-search-result--image-row-large": imageColSize === "large",
          "dsa-search-result--image-row-none": imageColSize === "none",
        })}
      >
        <div className="dsa-search-result__content">
          <div className="dsa-search-result__header">
            <Link
              data-result-link
              data-result-title
              href={url}
              className="dsa-search-result__title"
            >
              {title}
            </Link>
          </div>
          <RichText
            className="dsa-search-result__initial-match"
            text={initialMatch}
            data-result-excerpt
          />
          <div className="dsa-search-result__matches" data-result-subresults>
            {matches.map((match, index) => (
              <SearchResultMatch key={index} {...match} />
            ))}
          </div>
          {showLink && (
            <Link
              href={url}
              className="dsa-search-result__link"
              data-result-link
              data-result-url
            >
              {url}
            </Link>
          )}
        </div>
        {imageColSize !== "none" && (
          <div className="dsa-search-result__preview-image-row">
            <Link
              tabIndex={-1}
              aria-hidden
              href={url}
              className="dsa-search-result__preview-image-wrapper"
              data-result-link
            >
              <Picture
                src={previewImage}
                alt=""
                className="dsa-search-result__preview-image"
                data-result-image
              />
            </Link>
          </div>
        )}
      </div>
    </Container>
  )
);

export const SearchResultContext = createContext(SearchResultContextDefault);
export const SearchResult = forwardRef<HTMLDivElement, SearchResultProps>(
  (props, ref) => {
    const Component = useContext(SearchResultContext);
    return <Component {...deepMergeDefaults(defaults, props)} ref={ref} />;
  }
);
SearchResult.displayName = "SearchResult";
