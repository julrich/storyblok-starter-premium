import { InputHTMLAttributes, forwardRef, FC, PropsWithChildren } from "react";
import classnames from "classnames";
import { CheckboxGroupProps } from "./CheckboxGroupProps";

import {
  CheckboxGroupContext,
  CheckboxGroupContextDefault,
} from "@kickstartds/form/lib/checkbox-group";
import { deepMergeDefaults } from "../helpers";
import defaults from "./CheckboxGroupDefaults";
import "./checkbox-group.scss";

export type { CheckboxGroupProps };

export const CheckboxGroupComponent = forwardRef<
  HTMLInputElement,
  CheckboxGroupProps & InputHTMLAttributes<HTMLInputElement>
>((props, ref) => {
  const { className, ...rest } = deepMergeDefaults(defaults, props);

  return (
    <CheckboxGroupContextDefault
      {...rest}
      ref={ref}
      className={classnames("dsa-checkbox-group", className)}
    />
  );
});
CheckboxGroupComponent.displayName = "CheckboxGroupComponent";

export const CheckboxGroupProvider: FC<PropsWithChildren> = (props) => (
  <CheckboxGroupContext.Provider {...props} value={CheckboxGroupComponent} />
);
