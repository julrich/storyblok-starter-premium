import classnames from "classnames";
import React, {
  createContext,
  forwardRef,
  HTMLAttributes,
  useContext,
} from "react";
import { SplitWeightedProps as SplitWeightedComponentProps } from "./SplitWeightedProps";
import "./split-weighted.scss";
import { deepMergeDefaults } from "../helpers";
import defaults from "./SplitWeightedDefaults";

export interface ComponentProps {
  main?: React.ReactNode;
  aside?: React.ReactNode;
}

// Merge SplitWeightedProps and ComponentProps for full prop support
export type SplitWeightedProps = Omit<
  SplitWeightedComponentProps,
  "main" | "aside"
> &
  ComponentProps;

export const SplitWeightedContextDefault = forwardRef<
  HTMLDivElement,
  SplitWeightedProps & HTMLAttributes<HTMLDivElement>
>(
  (
    {
      order,
      mainLayout,
      asideLayout,
      horizontalGutter = "default",
      verticalGutter = "default",
      main,
      aside,
      verticalAlign = "top",
    },
    ref
  ) => (
    <div
      ref={ref}
      className={classnames(
        "l-split-weighted",
        order?.desktop === "asideFirst" &&
          "l-split-weighted--desktop-aside-first",
        order?.mobile === "asideFirst" &&
          "l-split-weighted--mobile-aside-first",
        horizontalGutter &&
          `l-split-weighted--h-gutter-${horizontalGutter || "default"}`,
        verticalGutter &&
          `l-split-weighted--v-gutter-${verticalGutter || "default"}`,
        verticalAlign && `l-split-weighted--align-${verticalAlign}`
      )}
    >
      <div
        className={classnames(
          "l-split-weighted__main l-split-weighted__content",
          mainLayout?.minWidth &&
            `l-split-weighted__main--width-${mainLayout.minWidth}`,
          mainLayout?.stretchVertically &&
            "l-split-weighted__content--stretch-vertically"
        )}
      >
        <div
          className={classnames(
            "l-split-weighted__content-layout",
            mainLayout?.gutter &&
              `l-split-weighted__content-layout--gutter-${mainLayout.gutter}`,
            mainLayout?.layout &&
              `l-split-weighted__content-layout--${mainLayout.layout}`,

            // Add custom class for smallTiles with two children
            mainLayout?.layout === "smallTiles" &&
              Array.isArray((main as any)?.props?.children) &&
              (main as any)?.props?.children.length === 2 &&
              "l-split-weighted__content-layout--smallTiles--two"
          )}
        >
          {main}
        </div>
      </div>
      <div
        className={classnames(
          "l-split-weighted__aside l-split-weighted__content",
          asideLayout?.minWidth &&
            `l-split-weighted__aside--width-${asideLayout.minWidth}`,
          asideLayout?.stretchVertically &&
            "l-split-weighted__content--stretch-vertically"
        )}
      >
        <div
          className={classnames(
            "l-split-weighted__content-layout",
            asideLayout?.gutter &&
              `l-split-weighted__content-layout--gutter-${asideLayout.gutter}`,
            asideLayout?.layout &&
              `l-split-weighted__content-layout--${asideLayout.layout}`,

            // Add custom class for smallTiles with two children
            asideLayout?.layout === "smallTiles" &&
              Array.isArray((aside as any)?.props?.children) &&
              (aside as any)?.props?.children.length === 2 &&
              "l-split-weighted__content-layout--smallTiles--two"
          )}
        >
          {aside}
        </div>
      </div>
    </div>
  )
);

export const SplitWeightedContext = createContext(SplitWeightedContextDefault);
export const SplitWeighted = forwardRef<
  HTMLDivElement,
  SplitWeightedProps & HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const Component = useContext(SplitWeightedContext);
  return <Component {...deepMergeDefaults(defaults, props)} ref={ref} />;
});
SplitWeighted.displayName = "SplitWeighted";
