import { HTMLAttributes, createContext, forwardRef, useContext } from "react";
import classnames from "classnames";
import { SliderProps } from "./SliderProps";
import { Slider as KickstartSlider } from "@kickstartds/content/lib/slider";
import "./slider.scss";
import { deepMergeDefaults } from "../helpers";
import defaults from "./SliderDefaults";

export type { SliderProps };

export const SliderContextDefault = forwardRef<
  HTMLDivElement,
  SliderProps & HTMLAttributes<HTMLDivElement>
>(
  (
    {
      gap,
      variant,
      autoplay,
      arrows,
      teaseNeighbours,
      equalHeight,
      children,
      className,
      ...props
    },
    ref
  ) => (
    <KickstartSlider
      className={classnames(`dsa-slider`, className)}
      gap={gap}
      type={variant}
      arrows={arrows}
      autoplay={autoplay}
      teaseNeighbours={teaseNeighbours}
      equalHeight={equalHeight}
      {...props}
      ref={ref}
    >
      {children}
    </KickstartSlider>
  )
);

export const SliderContext = createContext(SliderContextDefault);
export const Slider = forwardRef<
  HTMLDivElement,
  SliderProps & HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const Component = useContext(SliderContext);
  return <Component {...deepMergeDefaults(defaults, props)} ref={ref} />;
});
Slider.displayName = "Slider";
