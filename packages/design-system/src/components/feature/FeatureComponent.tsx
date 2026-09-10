import { forwardRef, createContext, useContext, HTMLAttributes } from "react";
import classnames from "classnames";
import { Icon } from "@kickstartds/base/lib/icon";
import { Button } from "../button/ButtonComponent";
import { FeatureProps, CallToAction } from "./FeatureProps";
import { Link } from "@kickstartds/base/lib/link";
import { deepMergeDefaults } from "../helpers";
import defaults from "./FeatureDefaults";
import Markdown from "markdown-to-jsx";

export type { FeatureProps };

export const FeatureContextDefault = forwardRef<
  HTMLDivElement,
  FeatureProps & Omit<HTMLAttributes<HTMLDivElement>, "style">
>(({ style = "stack", title, text, icon, cta, ...rest }, ref) => {
  // `newTab` is resolved at story-processing time from Storyblok's multilink
  // target-blank toggle and isn't part of the generated schema type.
  const ctaWithNewTab = cta as CallToAction & { newTab?: boolean };

  return (
    <div
      {...rest}
      ref={ref}
      className={classnames(
        `dsa-feature dsa-feature--${
          style === `stack`
            ? `stack dsa-feature--large`
            : style === `besideSmall`
              ? `beside dsa-feature--small`
              : style === `besideLarge`
                ? `beside dsa-feature--medium`
                : style === `intext`
                  ? `intext dsa-feature--small`
                  : style === `centered`
                    ? `centered dsa-feature--large`
                    : `${style}`
        }`,
      )}
    >
      <div className="dsa-feature__header">
        {icon && (
          <Icon
            className="dsa-feature__icon"
            icon={icon}
            role="presentation"
            aria-hidden
            focusable={false}
          />
        )}
        <span className="dsa-feature__title">{title}</span>
      </div>
      {text || cta.style === "intext" ? (
        <p className="dsa-feature__text">
          <Markdown>{text}</Markdown>
          {cta.style === "intext" && cta.toggle ? (
            <>
              &#32;{" "}
              <Link
                href={cta.url}
                target={ctaWithNewTab.newTab ? "_blank" : undefined}
                rel={ctaWithNewTab.newTab ? "noopener noreferrer" : undefined}
              >
                {cta.label ? cta.label : "See more"}
              </Link>
            </>
          ) : (
            ""
          )}
        </p>
      ) : (
        ""
      )}

      {cta.toggle && (cta.style === "link" || cta.style === "button") && (
        <div className="dsa-feature__cta">
          {cta.style === "link" ? (
            <Link
              className="dsa-feature__link"
              href={cta.url}
              target={ctaWithNewTab.newTab ? "_blank" : undefined}
              rel={ctaWithNewTab.newTab ? "noopener noreferrer" : undefined}
            >
              {cta.label ? cta.label : "See more"}
              <Icon
                aria-hidden
                role="presentation"
                focusable={false}
                icon={cta.icon || "arrow-right"}
              />
            </Link>
          ) : cta.style === "button" ? (
            <Button
              className="dsa-feature__button"
              size="small"
              url={cta.url}
              label={cta.label ? cta.label : "See more"}
              newTab={ctaWithNewTab.newTab}
            />
          ) : (
            ""
          )}
        </div>
      )}
    </div>
  );
});

export const FeatureContext = createContext(FeatureContextDefault);
export const Feature = forwardRef<
  HTMLDivElement,
  FeatureProps & Omit<HTMLAttributes<HTMLDivElement>, "style">
>((props, ref) => {
  const Component = useContext(FeatureContext);
  return <Component {...deepMergeDefaults(defaults, props)} ref={ref} />;
});
Feature.displayName = "Feature";
