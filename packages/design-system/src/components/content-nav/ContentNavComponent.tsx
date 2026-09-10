import { createContext, forwardRef, useContext, HTMLAttributes } from "react";
import { ContentNavProps } from "./ContentNavProps";
import "./content-nav.scss";
import { Icon } from "@kickstartds/base/lib/icon";
import { deepMergeDefaults } from "../helpers";
import defaults from "./ContentNavDefaults";

export type { ContentNavProps };

export const ContentNavContextDefault = forwardRef<
  HTMLDivElement,
  ContentNavProps & HTMLAttributes<HTMLDivElement>
>(({ image, links, topic, initiallyShown, className, ...rest }, ref) => {
  // `newTab` is resolved at story-processing time from Storyblok's multilink
  // target-blank toggle and isn't part of the generated schema type.
  const linksWithNewTab = links as (NonNullable<
    ContentNavProps["links"]
  >[number] & {
    newTab?: boolean;
  })[];

  return (
    <div
      {...rest}
      className={`dsa-content-nav${className ? ` ${className}` : ""}`}
      ref={ref}
    >
      {image && image?.src && (
        <div className="dsa-content-nav__image">
          <img src={image.src} alt={image.alt} />
        </div>
      )}

      <div className="dsa-content-nav__content">
        {topic && (
          <div className="dsa-content-nav__topic">
            <span>{topic}</span>
          </div>
        )}

        <div className="dsa-content-nav__links dsa-content-nav__links--initial">
          {linksWithNewTab.slice(0, initiallyShown).map((link, index) => (
            <a
              key={index}
              href={link.url}
              className="dsa-content-nav__link"
              target={link.newTab ? "_blank" : undefined}
              rel={link.newTab ? "noopener noreferrer" : undefined}
            >
              {link.label}
              <Icon icon={"chevron-right"} />
            </a>
          ))}
        </div>

        {links.length > initiallyShown && (
          <details className="dsa-content-nav__more">
            <summary className="dsa-content-nav__toggle-more">
              <span className="dsa-content-nav__toggle-label--more">
                Show more
              </span>
              <span className="dsa-content-nav__toggle-label--less">
                Show less
              </span>
              <Icon aria-hidden icon={"chevron-down"} />
            </summary>
            <div className="dsa-content-nav__more-content">
              <div className="dsa-content-nav__links dsa-content-nav__links--more">
                {linksWithNewTab.slice(initiallyShown).map((link, index) => (
                  <a
                    key={index}
                    href={link.url}
                    className="dsa-content-nav__link"
                    target={link.newTab ? "_blank" : undefined}
                    rel={link.newTab ? "noopener noreferrer" : undefined}
                  >
                    {link.label}
                    <Icon icon={"chevron-right"} />
                  </a>
                ))}
              </div>
            </div>
          </details>
        )}
      </div>
    </div>
  );
});

export const ContentNavContext = createContext(ContentNavContextDefault);
export const ContentNav = forwardRef<
  HTMLDivElement,
  ContentNavProps & HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const Component = useContext(ContentNavContext);
  return <Component {...deepMergeDefaults(defaults, props)} ref={ref} />;
});
ContentNav.displayName = "ContentNav";
