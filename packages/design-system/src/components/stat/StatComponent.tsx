import { forwardRef, createContext, useContext, HTMLAttributes } from "react";
import { StatProps } from "./StatProps";
import { CountUp } from "@kickstartds/content/lib/count-up";
import { deepMergeDefaults } from "../helpers";
import defaults from "./StatDefaults";

export type { StatProps };

export const StatContextDefault = forwardRef<
  HTMLDivElement,
  StatProps & HTMLAttributes<HTMLDivElement>
>(({ number, title, description, icon, ...rest }, ref) => {
  const parts = number ? number.toString().split(/(\d+)/).filter(Boolean) : [];
  const numberIndex = parts.findIndex((part) => !isNaN(Number(part)));
  const value = numberIndex !== -1 ? parseInt(parts[numberIndex], 10) : 0;
  const prefix =
    numberIndex !== -1 && numberIndex > 0 ? parts[numberIndex - 1] : "";
  const suffix =
    numberIndex !== -1 && numberIndex < parts.length - 1
      ? parts[numberIndex + 1]
      : "";

  return (
    <CountUp
      {...rest}
      ref={ref}
      className="dsa-stats__item"
      to={value}
      prefix={prefix}
      suffix={suffix}
      icon={{
        icon: icon,
      }}
      text={description}
      topic={title}
    />
  );
});

export const StatContext = createContext(StatContextDefault);
export const Stat = forwardRef<
  HTMLDivElement,
  StatProps & HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const Component = useContext(StatContext);
  return <Component {...deepMergeDefaults(defaults, props)} ref={ref} />;
});
Stat.displayName = "Stat";
