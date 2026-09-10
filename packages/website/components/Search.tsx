import { ComponentProps } from "react";
import { SbBlokData, storyblokEditable } from "@storyblok/react";
import { Section } from "@kickstartds/design-system/components/section/index.js";
import { Search as DsaSearch } from "@kickstartds/design-system/components/search/index.js";
import { Headline } from "@kickstartds/design-system/components/headline/index.js";
import { SearchForm } from "@kickstartds/design-system/components/search-form/index.js";
import { unflatten } from "@/helpers/unflatten";

type PageProps = {
  blok: ComponentProps<typeof DsaSearch> & SbBlokData;
};

const Search: React.FC<PageProps> = ({ blok }) => {
  if (blok) {
    // UPSTREAM BUG - deviates from monorepo/main, contribute back and drop.
    // The schema's single `headline` becomes a Storyblok `bloks` field, so it
    // arrives as an array. Spreading that array into `Headline` handed it
    // numeric keys and rendered an empty heading.
    const [headline] = Array.isArray(blok.headline)
      ? blok.headline
      : [blok.headline];

    return (
      <main {...storyblokEditable(blok)}>
        <Section
          content={{
            mode: "list",
            gutter: "none",
          }}
          spaceAfter="small"
        >
          {/* @ts-expect-error */}
          {headline && <Headline {...unflatten(headline)} />}
          <SearchForm component="dsa.search-form.pagefind" />
        </Section>
      </main>
    );
  }
  return null;
};

export default Search;
