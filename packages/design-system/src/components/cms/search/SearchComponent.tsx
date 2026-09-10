import { FC, PropsWithChildren } from "react";
import { SearchProps } from "../SearchProps";

import { Section } from "../../section/SectionComponent";
import { SplitWeighted } from "../../split-weighted/SplitWeightedComponent";
import { SearchFilter } from "../../search-filter/SearchFilterComponent";
import { SearchResult } from "../../search-result/SearchResultComponent";
import { RichText } from "@kickstartds/base/lib/rich-text";
import { Pagination } from "../../pagination/PaginationComponent";
import { SearchBar } from "../../search-bar/SearchBarComponent";
import { Headline } from "../../headline/HeadlineComponent";

export type { SearchProps };

export const Search: FC<PropsWithChildren<SearchProps>> = ({
  headline,
  searchBar,
  searchFilter,
  searchResults,
}) => (
  <>
    <Section
      content={{
        mode: "list",
        gutter: "none",
      }}
      spaceAfter="small"
    >
      <Headline {...headline} />
      <SearchBar {...searchBar} />
    </Section>
    <Section
      width="wide"
      spaceBefore="small"
      content={{
        mode: "list",
      }}
    >
      <SplitWeighted
        verticalAlign="sticky"
        mainLayout={{
          minWidth: "narrow",
          gutter: "large",
        }}
        asideLayout={{
          gutter: "small",
        }}
        order={{
          desktop: "asideFirst",
          mobile: "asideFirst",
        }}
        aside={
          <>
            <SearchFilter {...searchFilter} />
            <RichText text={`Showing 6 out of 18 results`} />
          </>
        }
        main={
          <>
            {searchResults.map((searchResult, index) => (
              <SearchResult key={index} {...searchResult} />
            ))}
            <Pagination
              pages={[
                {
                  url: "https://example.com/page1",
                  active: true,
                },
                {
                  url: "https://example.com/page2",
                },
                {
                  url: "https://example.com/page3",
                },
              ]}
            />
          </>
        }
      />
    </Section>
  </>
);
Search.displayName = "Search";
