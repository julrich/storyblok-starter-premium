import { forwardRef, createContext, useContext, HTMLAttributes } from "react";
import classnames from "classnames";

import { LogosProps } from "./LogosProps";
import "./logos.scss";
import { LogoTiles } from "@kickstartds/content/lib/logo-tiles";
import { Button } from "@kickstartds/base/lib/button";
import { Link } from "@kickstartds/base/lib/link";
import { Container } from "@kickstartds/core/lib/container";
import { deepMergeDefaults } from "../helpers";
import defaults from "./LogosDefaults";

export type { LogosProps };

export const LogosContextDefault = forwardRef<
  HTMLDivElement,
  LogosProps & HTMLAttributes<HTMLDivElement>
>(
  (
    {
      logo: logos = [],
      tagline,
      align = "center",
      cta,
      logosPerRow = "6",
      ...rest
    },
    ref,
  ) => {
    // `newTab` is resolved at story-processing time from Storyblok's
    // multilink target-blank toggle and isn't part of the generated schema type.
    const ctaWithNewTab = cta as LogosProps["cta"] & { newTab?: boolean };

    return (
      <div {...rest} ref={ref}>
        <Container name="logos">
          <div className={classnames(`dsa-logos dsa-logos--align-${align}`)}>
            {tagline && <div className="dsa-logos__tagline">{tagline}</div>}

            <LogoTiles
              className={classnames(
                `dsa-logo-tiles dsa-logo-tiles--cols-${logosPerRow}`,
              )}
              logos={logos}
            />
            {cta?.toggle ? (
              <div className="dsa-logos__cta">
                <div className="dsa-logos__cta__text">
                  {cta?.text}
                  {cta?.style === "text" && (
                    <>
                      &#32;
                      <Link
                        className="dsa-logos__cta__link"
                        href={cta.link}
                        target={ctaWithNewTab?.newTab ? "_blank" : undefined}
                        rel={
                          ctaWithNewTab?.newTab
                            ? "noopener noreferrer"
                            : undefined
                        }
                      >
                        {cta.label}
                      </Link>
                    </>
                  )}
                </div>
                {cta?.style === "button" && (
                  <Button
                    href={cta.link}
                    label={cta.label}
                    {...({ newTab: ctaWithNewTab?.newTab } as any)}
                  />
                )}
              </div>
            ) : (
              ""
            )}
          </div>
        </Container>
      </div>
    );
  },
);

export const LogosContext = createContext(LogosContextDefault);
export const Logos = forwardRef<
  HTMLDivElement,
  LogosProps & HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const Component = useContext(LogosContext);
  return <Component {...deepMergeDefaults(defaults, props)} ref={ref} />;
});
Logos.displayName = "Logos";
