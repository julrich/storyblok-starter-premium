import classNames from "classnames";
import {
  FC,
  HTMLAttributes,
  ReactElement,
  createContext,
  forwardRef,
  useContext,
} from "react";
import { Icon } from "@kickstartds/base/lib/icon";
import { PaginationProps } from "./PaginationProps";
import "./pagination.scss";
import { Link } from "@kickstartds/base/lib/link";
import { deepMergeDefaults } from "../helpers";
import defaults from "./PaginationDefaults";

export type { PaginationProps };

export const PageLink: FC<
  HTMLAttributes<HTMLAnchorElement> & {
    active?: boolean;
    url?: string;
    label?: string;
    num?: number;
  }
> = ({ active, url, label, num, ...props }) => (
  <Link
    className={classNames(
      "dsa-pagination__link",
      active && "dsa-pagination__link--active"
    )}
    aria-label={`${label} ${num}` || `Go to page ${num}`}
    aria-current={active ? "page" : "false"}
    href={url}
    {...props}
  >
    {num}
  </Link>
);

export const Placeholder = () => (
  <div className="dsa-pagination__placeholder">
    <span>…</span>
  </div>
);

export const PaginationContextDefault = forwardRef<
  HTMLDivElement,
  PaginationProps & HTMLAttributes<HTMLDivElement>
>(({ pages = [], ariaLabels, truncate, ...props }, ref) => {
  const activeIndex = pages.findIndex((page) => page.active);
  return (
    <div className="dsa-pagination" {...props} ref={ref}>
      <Link
        aria-label={ariaLabels?.skipToFirstPage || "Skip to first page"}
        className="dsa-pagination__link dsa-pagination__link--icon dsa-pagination__link--skip-back"
        href={pages[0]?.url}
        hidden={activeIndex === 0}
      >
        <Icon icon="skip-back" />
      </Link>
      <Link
        aria-label={ariaLabels?.previousPage || "Go to previous page"}
        className="dsa-pagination__link dsa-pagination__link--icon dsa-pagination__link--prev"
        href={
          // Use the url of the next item after the active one
          pages[activeIndex - 1]?.url
        }
        hidden={activeIndex === 0}
      >
        <Icon icon="chevron-left" />
      </Link>

      <div className="dsa-pagination__pages">
        {truncate
          ? pages.reduce<ReactElement[]>((result, page, index) => {
              const isFirst = index === 0;
              const isLast = index === pages.length - 1;
              const isActive = page.active;
              const isBeforeActive = index === activeIndex - 1;
              const isAfterActive = index === activeIndex + 1;
              const prevItem = result[result.length - 1];

              const shouldRender =
                isFirst ||
                isLast ||
                isActive ||
                isBeforeActive ||
                isAfterActive;

              if (shouldRender) {
                result.push(
                  <PageLink
                    {...page}
                    num={index + 1}
                    label={ariaLabels?.goToPage}
                    key={page.url}
                  />
                );
              } else if (prevItem.type !== Placeholder) {
                result.push(
                  <Placeholder key={`dsa-pagination__placeholder-${index}`} />
                );
              }

              return result;
            }, [])
          : pages.map((page, index) => (
              <PageLink
                {...page}
                num={index + 1}
                label={ariaLabels?.goToPage}
                key={page.url}
              />
            ))}
      </div>
      <Link
        className="dsa-pagination__link dsa-pagination__link--icon dsa-pagination__link--next"
        aria-label={ariaLabels?.nextPage || "Go to next page"}
        href={
          // Use the url of the next item after the active one
          pages[activeIndex + 1]?.url
        }
        hidden={activeIndex === pages.length - 1}
      >
        <Icon icon="chevron-right" />
      </Link>

      <Link
        aria-label={ariaLabels?.skipToLastPage || "Skip to last page"}
        className="dsa-pagination__link dsa-pagination__link--icon dsa-pagination__link--skip-forward"
        href={pages[pages.length - 1]?.url}
        hidden={activeIndex === pages.length - 1}
      >
        <Icon icon="skip-forward" />
      </Link>
    </div>
  );
});

export const PaginationContext = createContext(PaginationContextDefault);
export const Pagination = forwardRef<
  HTMLDivElement,
  PaginationProps & HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const Component = useContext(PaginationContext);
  return <Component {...deepMergeDefaults(defaults, props)} ref={ref} />;
});
Pagination.displayName = "Pagination";
