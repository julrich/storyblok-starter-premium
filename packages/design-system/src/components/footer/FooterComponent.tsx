import classnames from "classnames";
import { Link } from "@kickstartds/base/lib/link";
import { Icon } from "@kickstartds/base/lib/icon";
import { Picture } from "@kickstartds/base/lib/picture";
import { FooterProps } from "./FooterProps";
import { Logo } from "../logo/LogoComponent";
import "./footer.scss";
import { createContext, forwardRef, HTMLAttributes, useContext } from "react";
import { deepMergeDefaults } from "../helpers";
import defaults from "./FooterDefaults";

export type { FooterProps };

export const FooterContextDefault = forwardRef<
  HTMLDivElement,
  FooterProps & HTMLAttributes<HTMLDivElement>
>(
  (
    { logo, badge, inverted, navGroups, socialLinks, copyright, legalLink },
    ref,
  ) => {
    // When not a single group has a second level, the headings are not column
    // labels above a list of links - they are the menu. Lay them out as a flat,
    // one-dimensional row instead of as columns, and style them accordingly.
    const flat = !navGroups?.some(
      (group) => group.items && group.items.length > 0,
    );

    return (
      <div
        className={classnames("dsa-footer")}
        ks-inverted={(inverted ?? false).toString()}
        ref={ref}
      >
        <div className="dsa-footer__content">
          {navGroups?.length || socialLinks?.length ? (
            <div
              className={classnames("dsa-footer__columns", {
                "dsa-footer__columns--flat": flat,
              })}
            >
              {navGroups?.map((group, groupIdx) => (
                <div
                  className="dsa-footer__column"
                  key={group.heading ?? groupIdx}
                >
                  {group.heading && (
                    <h3 className="dsa-footer__column-heading">
                      {group.headingUrl ? (
                        <Link
                          className="dsa-footer__column-heading-link"
                          href={group.headingUrl}
                        >
                          {group.heading}
                        </Link>
                      ) : (
                        group.heading
                      )}
                    </h3>
                  )}
                  {group.items && group.items.length > 0 && (
                    <ul className="dsa-footer__nav-list">
                      {group.items.map((item, itemIdx) => (
                        <li
                          className="dsa-footer__nav-item"
                          key={item.url + item.label + itemIdx}
                        >
                          <Link
                            className="dsa-footer__link"
                            href={item.url}
                            {...(item.newTab && {
                              target: "_blank",
                              rel: "noopener noreferrer",
                            })}
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}

              {socialLinks && socialLinks.length > 0 && (
                <div className="dsa-footer__column dsa-footer__column--social">
                  <ul className="dsa-footer__social">
                    {socialLinks.map((social, socialIdx) => (
                      <li
                        className="dsa-footer__social-item"
                        key={social.url + socialIdx}
                      >
                        <Link
                          className="dsa-footer__social-link"
                          href={social.url}
                          aria-label={social.ariaLabel}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Icon
                            role="presentation"
                            focusable="false"
                            aria-hidden
                            icon={social.icon}
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}

          <div className="dsa-footer__bottom">
            <Logo {...logo} inverted={inverted} />
            {(copyright || legalLink?.url) && (
              <p className="dsa-footer__copyright">
                {copyright}
                {legalLink?.url ? (
                  <>
                    {" "}
                    <Link
                      className="dsa-footer__legal-link"
                      href={legalLink.url}
                    >
                      {legalLink.label || "Legal"}
                    </Link>
                  </>
                ) : null}
              </p>
            )}
          </div>

          {badge?.src && (
            <Picture
              className="dsa-footer__badge"
              src={badge.src}
              alt={badge.alt}
            />
          )}
        </div>
      </div>
    );
  },
);

export const FooterContext = createContext(FooterContextDefault);
export const Footer = forwardRef<
  HTMLDivElement,
  FooterProps & HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const Component = useContext(FooterContext);
  return <Component {...deepMergeDefaults(defaults, props)} ref={ref} />;
});
Footer.displayName = "Footer";
