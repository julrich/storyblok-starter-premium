import dynamic from "next/dynamic";
import { SbBlokData, storyblokEditable } from "@storyblok/react";
import {
  FeatureContext,
  FeatureContextDefault,
} from "@kickstartds/design-system/feature";
import {
  StatContext,
  StatContextDefault,
} from "@kickstartds/design-system/stat";
import {
  BlogAuthorContext,
  BlogAuthorContextDefault,
} from "@kickstartds/design-system/blog-author";

const ColorDemo = dynamic(
  () => import("@kickstartds/design-system/playground/color-demo"),
  { ssr: false },
);

type TokenThemePreviewProps = {
  blok: SbBlokData & {
    name?: string;
    tokens?: string;
    css?: string;
  };
};

/**
 * Reset sub-component contexts to DS defaults so pure DS components
 * render correctly — the website's ComponentProviders overrides these
 * to StoryblokSubComponent which can't handle DS-format props.
 */
const TokenThemePreview: React.FC<TokenThemePreviewProps> = ({ blok }) => (
  <main {...storyblokEditable(blok)}>
    {blok.css && (
      <style data-tokens dangerouslySetInnerHTML={{ __html: blok.css }} />
    )}
    <FeatureContext.Provider value={FeatureContextDefault}>
      <StatContext.Provider value={StatContextDefault}>
        <BlogAuthorContext.Provider value={BlogAuthorContextDefault}>
          <ColorDemo />
        </BlogAuthorContext.Provider>
      </StatContext.Provider>
    </FeatureContext.Provider>
  </main>
);

export default TokenThemePreview;
