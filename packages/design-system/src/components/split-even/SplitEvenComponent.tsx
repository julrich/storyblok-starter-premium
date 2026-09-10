import classnames from "classnames";
import React, {
  createContext,
  forwardRef,
  HTMLAttributes,
  useContext,
} from "react";
import { SplitEvenProps as SplitEvenComponentProps } from "./SplitEvenProps";
import "./split-even.scss";
import { deepMergeDefaults } from "../helpers";
import defaults from "./SplitEvenDefaults";

export interface ComponentProps {
  firstComponents?: React.ReactNode;
  secondComponents?: React.ReactNode;
}

// Merge SplitEvenProps and ComponentProps for full prop support
export type SplitEvenProps = Omit<
  SplitEvenComponentProps,
  "firstComponents" | "secondComponents"
> &
  ComponentProps;

export const SplitEvenContextDefault = forwardRef<
  HTMLDivElement,
  SplitEvenProps & HTMLAttributes<HTMLDivElement>
>(
  (
    {
      mobileReverse = false,
      contentMinWidth = "medium",
      verticalAlign = "top",
      horizontalGutter = "small",
      verticalGutter = "small",
      firstLayout = { layout: "list" },
      secondLayout = { layout: "list" },
      firstComponents,
      secondComponents,
    },
    ref
  ) => (
    <div
      ref={ref}
      className={classnames(
        "l-split-even",
        mobileReverse && "l-split-even--mobile-reverse",
        horizontalGutter && `l-split-even--h-gutter-${horizontalGutter}`,
        verticalGutter && `l-split-even--v-gutter-${verticalGutter}`,
        contentMinWidth && `l-split-even--width-${contentMinWidth}`,
        verticalAlign && `l-split-even--align-${verticalAlign}`
      )}
    >
      <div
        className={classnames(
          "l-split-even__content l-split-even__content--first",
          firstLayout?.stretchVertically &&
            "l-split-even__content--stretch-vertically"
        )}
      >
        <div
          className={classnames(
            "l-split-even__content-layout",
            `l-split-even__content-layout--gutter-${
              firstLayout.gutter || "small"
            }`,
            `l-split-even__content-layout--${firstLayout.layout || "list"}`,

            // Add custom class for smallTiles with two children
            firstLayout.layout === "smallTiles" &&
              Array.isArray((firstComponents as any)?.props?.children) &&
              (firstComponents as any)?.props?.children.length === 2 &&
              "l-split-even__content-layout--smallTiles--two"
          )}
        >
          {firstComponents}
        </div>
      </div>

      <div
        className={classnames(
          "l-split-even__content l-split-even__content--second",
          secondLayout?.stretchVertically &&
            "l-split-even__content--stretch-vertically"
        )}
      >
        <div
          className={classnames(
            "l-split-even__content-layout",
            `l-split-even__content-layout--${secondLayout.layout || "list"}`,
            `l-split-even__content-layout--gutter-${
              secondLayout.gutter || "small"
            }`,

            // Add custom class for smallTiles with two children
            secondLayout.layout === "smallTiles" &&
              Array.isArray((secondComponents as any)?.props?.children) &&
              (secondComponents as any)?.props?.children.length === 2 &&
              "l-split-even__content-layout--smallTiles--two"
          )}
        >
          {secondComponents}
        </div>
      </div>
    </div>
  )
);

export const SplitEvenContext = createContext(SplitEvenContextDefault);
export const SplitEven = forwardRef<
  HTMLDivElement,
  SplitEvenProps & HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const Component = useContext(SplitEvenContext);
  return <Component {...deepMergeDefaults(defaults, props)} ref={ref} />;
});
SplitEven.displayName = "SplitEven";
