import classnames from "classnames";
import { Link } from "@kickstartds/base/lib/link";
import { Icon } from "@kickstartds/base/lib/icon";
import { NavDropdown } from "../nav-dropdown/NavDropdownComponent";
import "./nav-topbar.scss";
import { createContext, forwardRef, HTMLAttributes, useContext } from "react";
import { NavTopbarProps } from "./NavTopbarProps";
import { deepMergeDefaults } from "../helpers";
import defaults from "./NavTopbarDefaults";

export type { NavTopbarProps };

export const NavTopbarContextDefault = forwardRef<
  HTMLElement,
  NavTopbarProps & HTMLAttributes<HTMLElement>
>(({ items, inverted }, ref) =>
  items && items.length > 0 ? (
    <nav
      className="dsa-nav-topbar"
      id="dsa-nav-topbar"
      aria-label="Hauptnavigation"
      ref={ref}
    >
      <ul className="dsa-nav-topbar__list">
        {items.map(({ label, url, active, items: subItems }) => {
          return (
            <li
              className={classnames(
                "dsa-nav-topbar__item",
                active && "dsa-nav-topbar__item--active",
                subItems?.length && "dsa-nav-topbar__item--dropdown"
              )}
              key={url}
            >
              {subItems?.length ? (
                <span className="dsa-nav-topbar__label">
                  {label}
                  {subItems?.length ? (
                    <Icon
                      className="dsa-nav-topbar__label__icon"
                      icon="chevron-down"
                      role="presentation"
                      aria-hidden
                      focusable={false}
                    />
                  ) : (
                    ""
                  )}
                </span>
              ) : (
                <Link
                  href={url}
                  className={`dsa-nav-topbar__label dsa-nav-topbar__link`}
                >
                  {label}
                </Link>
              )}

              {subItems?.length ? (
                <NavDropdown items={subItems} inverted={inverted} />
              ) : null}
            </li>
          );
        })}
      </ul>
    </nav>
  ) : null
);

export const NavTopbarContext = createContext(NavTopbarContextDefault);
export const NavTopbar = forwardRef<
  HTMLElement,
  NavTopbarProps & HTMLAttributes<HTMLElement>
>((props, ref) => {
  const Component = useContext(NavTopbarContext);
  return <Component {...deepMergeDefaults(defaults, props)} ref={ref} />;
});
NavTopbar.displayName = "NavTopbar";
