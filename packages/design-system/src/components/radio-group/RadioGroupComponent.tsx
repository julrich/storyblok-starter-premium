import { InputHTMLAttributes, forwardRef, FC, PropsWithChildren } from "react";
import classnames from "classnames";
import { RadioGroupProps } from "./RadioGroupProps";

import {
  RadioGroupContext,
  RadioGroupContextDefault,
} from "@kickstartds/form/lib/radio-group";
import { deepMergeDefaults } from "../helpers";
import defaults from "./RadioGroupDefaults";
import "./radio-group.scss";

export type { RadioGroupProps };

export const RadioGroupComponent = forwardRef<
  HTMLInputElement,
  RadioGroupProps & InputHTMLAttributes<HTMLInputElement>
>((props, ref) => {
  const { className, ...rest } = deepMergeDefaults(defaults, props);

  return (
    <RadioGroupContextDefault
      {...rest}
      ref={ref}
      className={classnames("dsa-radio-group", className)}
    />
  );
});
RadioGroupComponent.displayName = "RadioGroupComponent";

export const RadioGroupProvider: FC<PropsWithChildren> = (props) => (
  <RadioGroupContext.Provider {...props} value={RadioGroupComponent} />
);
