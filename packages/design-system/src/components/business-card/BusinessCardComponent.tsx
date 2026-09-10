import classnames from "classnames";
import { createContext, forwardRef, useContext, HTMLAttributes } from "react";
import { BusinessCardProps } from "./BusinessCardProps";
import "./business-card.scss";
import { Icon } from "@kickstartds/base/lib/icon";
import { Picture } from "@kickstartds/base/lib/picture";
import Markdown from "markdown-to-jsx";
import { Button } from "../button/ButtonComponent";
import { Link } from "@kickstartds/base/lib/link";
import { Container } from "@kickstartds/core/lib/container";
import { deepMergeDefaults } from "../helpers";
import defaults from "./BusinessCardDefaults";

export type { BusinessCardProps };

export const BusinessCardContextDefault = forwardRef<
  HTMLDivElement,
  BusinessCardProps & HTMLAttributes<HTMLDivElement>
>(
  (
    {
      centered,
      image,
      logo,
      topic,
      address,
      avatar,
      contactLinks,
      buttons,
      className,
      ...rest
    },
    ref,
  ) => {
    // `newTab` is resolved at story-processing time from Storyblok's
    // multilink target-blank toggle and isn't part of the generated schema type.
    const logoWithNewTab = logo as BusinessCardProps["logo"] & {
      newTab?: boolean;
    };
    const contactLinksWithNewTab = contactLinks as (NonNullable<
      BusinessCardProps["contactLinks"]
    >[number] & { newTab?: boolean })[];
    const buttonsWithNewTab = buttons as (NonNullable<
      BusinessCardProps["buttons"]
    >[number] & { newTab?: boolean })[];

    return (
      <Container name="business-card">
        <div
          {...rest}
          className={classnames(
            "dsa-business-card",
            centered && "dsa-business-card--centered",
            className,
          )}
          ref={ref}
        >
          {image.src && (
            <div className="dsa-business-card__image">
              <Picture src={image.src} alt={image.alt} />
            </div>
          )}
          <div className="dsa-business-card__content">
            {logo && (
              <>
                {logo.url ? (
                  <Link
                    href={logo.url}
                    className="dsa-business-card__logo dsa-business-card__logo-link"
                    target={logoWithNewTab?.newTab ? "_blank" : undefined}
                    rel={
                      logoWithNewTab?.newTab ? "noopener noreferrer" : undefined
                    }
                  >
                    <Picture src={logo.src} alt={logo.alt} />
                  </Link>
                ) : (
                  <Picture
                    className="dsa-business-card__logo"
                    src={logo.src}
                    alt={logo.alt}
                  />
                )}
              </>
            )}

            <address
              className={classnames(
                "dsa-business-card__address",
                centered && "dsa-business-card__address--centered",
              )}
            >
              <div className="dsa-business-card__infos">
                {topic && (
                  <div className="dsa-business-card__topic">
                    <span>{topic}</span>
                  </div>
                )}
                <Markdown className="dsa-business-card__location">
                  {address}
                </Markdown>
              </div>
              <div className="dsa-business-card__contact">
                {avatar && (
                  <Picture
                    className="dsa-business-card__avatar"
                    src={avatar?.src}
                    alt={avatar?.alt}
                  />
                )}
                {contactLinks && (
                  <div className="dsa-business-card__contact-items">
                    {contactLinksWithNewTab.map((item, index) => (
                      <>
                        <Link
                          key={index}
                          href={item?.url}
                          className="dsa-business-card__contact-item"
                          target={item?.newTab ? "_blank" : undefined}
                          rel={item?.newTab ? "noopener noreferrer" : undefined}
                        >
                          {item?.icon && <Icon icon={item?.icon} />}
                          <span>{item.label}</span>
                        </Link>
                      </>
                    ))}
                  </div>
                )}
              </div>
            </address>
            {buttons && buttons.length > 0 && (
              <div className="dsa-business-card__buttons">
                {buttonsWithNewTab.map((button, index) => (
                  <Button
                    key={index}
                    label={button.label}
                    url={button.url}
                    className="dsa-business-card__button"
                    variant="primary"
                    newTab={button.newTab}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </Container>
    );
  },
);

export const BusinessCardContext = createContext(BusinessCardContextDefault);
export const BusinessCard = forwardRef<
  HTMLDivElement,
  BusinessCardProps & HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const Component = useContext(BusinessCardContext);
  return <Component {...deepMergeDefaults(defaults, props)} ref={ref} />;
});
BusinessCard.displayName = "BusinessCard";
