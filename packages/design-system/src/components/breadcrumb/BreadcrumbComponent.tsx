import { HTMLAttributes, createContext, forwardRef, useContext } from "react";
import { Icon } from "@kickstartds/base/lib/icon";
import { BreadcrumbProps } from "./BreadcrumbProps";
import "./breadcrumb.scss";
import { Link } from "@kickstartds/base/lib/link";
import { deepMergeDefaults } from "../helpers";
import defaults from "./BreadcrumbDefaults";

export type { BreadcrumbProps };

export const BreadcrumbContextDefault = forwardRef<
  HTMLDivElement,
  BreadcrumbProps & HTMLAttributes<HTMLDivElement>
>(({ pages }, ref) => {
  return (
    <div className="dsa-breadcrumb" ref={ref}>
      {pages.map((page, index) =>
        index !== pages.length - 1 ? (
          <>
            <Link href={page.url} className={"dsa-breadcrumb__link"}>
              {page.label}
            </Link>
            <Icon className="dsa-breadcrumb__icon" icon={"chevron-right"} />
          </>
        ) : (
          <span className={"dsa-breadcrumb__label"}>{page.label}</span>
        )
      )}
    </div>
  );
});

export const BreadcrumbContext = createContext(BreadcrumbContextDefault);
export const Breadcrumb = forwardRef<
  HTMLDivElement,
  BreadcrumbProps & HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const Component = useContext(BreadcrumbContext);
  return <Component {...deepMergeDefaults(defaults, props)} ref={ref} />;
});
Breadcrumb.displayName = "Breadcrumb";
