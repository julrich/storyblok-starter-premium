import { HTMLAttributes, forwardRef, createContext, useContext } from "react";
import { StatsProps } from "./StatsProps";
import "./stats.scss";
import { Stat } from "../stat/StatComponent";
import { deepMergeDefaults } from "../helpers";
import defaults from "./StatsDefaults";
import classnames from "classnames";

export type { StatsProps };

export const StatsContextDefault = forwardRef<
  HTMLDivElement,
  StatsProps & HTMLAttributes<HTMLDivElement>
>(({ stat: stats = [], align, ...rest }, ref) => {
  return (
    <div
      {...rest}
      ref={ref}
      className={classnames(
        "dsa-stats",
        align === "left" && `dsa-stats--align-${align}`
      )}
    >
      {stats.map((item, index) => (
        <Stat {...item} key={index} />
      ))}
    </div>
  );
});

export const StatsContext = createContext(StatsContextDefault);
export const Stats = forwardRef<
  HTMLDivElement,
  StatsProps & HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const Component = useContext(StatsContext);
  return <Component {...deepMergeDefaults(defaults, props)} ref={ref} />;
});
Stats.displayName = "Stats";
