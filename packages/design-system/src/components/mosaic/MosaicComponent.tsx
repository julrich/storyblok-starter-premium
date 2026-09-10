import { HTMLAttributes, createContext, forwardRef, useContext } from "react";
import { MosaicProps } from "./MosaicProps";
import "./mosaic.scss";
import { Storytelling } from "@kickstartds/content/lib/storytelling";
import { deepMergeDefaults } from "../helpers";
import defaults from "./MosaicDefaults";

export type { MosaicProps };

export const MosaicContextDefault = forwardRef<
  HTMLDivElement,
  MosaicProps & HTMLAttributes<HTMLDivElement>
>(({ layout, largeHeadlines, tile, ...rest }, ref) => (
  <div {...rest} ref={ref} className="dsa-mosaic">
    {tile.map((tile, index) => (
      <Storytelling
        key={index}
        full
        backgroundColor={tile.backgroundColor}
        backgroundImage={tile.backgroundImage}
        box={{
          headline: {
            text: tile?.headline,
            sub: tile?.sub,
            level: "h2",
            style: largeHeadlines ? "h1" : undefined,
          },
          text: tile?.text,
          textColor: tile?.textColor,
          ...(tile?.button?.toggle && {
            link: {
              url: tile?.button?.url,
              label: tile?.button?.label,
              icon: tile?.button?.icon,
            },
          }),
        }}
        image={{
          source: tile?.image?.src,
          alt: tile?.image?.alt,
          order: {
            desktopImageLast:
              layout === "textLeft"
                ? true
                : layout === "textRight"
                ? false
                : index % 2 !== 0,
          },
        }}
      />
    ))}
  </div>
));

export const MosaicContext = createContext(MosaicContextDefault);
export const Mosaic = forwardRef<
  HTMLDivElement,
  MosaicProps & HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const Component = useContext(MosaicContext);
  return <Component {...deepMergeDefaults(defaults, props)} ref={ref} />;
});
Mosaic.displayName = "Mosaic";
