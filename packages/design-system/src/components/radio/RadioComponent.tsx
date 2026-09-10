import { InputHTMLAttributes, forwardRef, FC, PropsWithChildren } from "react";
import classnames from "classnames";
import { RadioProps } from "./RadioProps";
import "./radio.scss";

import { RadioContext, RadioContextDefault } from "@kickstartds/form/lib/radio";
import { deepMergeDefaults } from "../helpers";
import defaults from "./RadioDefaults";

export type { RadioProps };

export const RadioComponent = forwardRef<
  HTMLInputElement,
  RadioProps & InputHTMLAttributes<HTMLInputElement>
>((props, ref) => {
  const { className, ...rest } = deepMergeDefaults(defaults, props);

  return (
    <div className={classnames("dsa-radio", className)}>
      <RadioContextDefault {...rest} ref={ref} />
    </div>
  );
});
RadioComponent.displayName = "RadioComponent";

export const RadioProvider: FC<PropsWithChildren> = (props) => (
  <RadioContext.Provider {...props} value={RadioComponent} />
);
