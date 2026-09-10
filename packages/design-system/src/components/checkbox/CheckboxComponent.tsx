import { InputHTMLAttributes, forwardRef, FC, PropsWithChildren } from "react";
import classnames from "classnames";
import { CheckboxProps } from "./CheckboxProps";

import {
  CheckboxContext,
  CheckboxContextDefault,
} from "@kickstartds/form/lib/checkbox";
import { deepMergeDefaults } from "../helpers";
import defaults from "./CheckboxDefaults";
import "./checkbox.scss";

export type { CheckboxProps };

export const CheckboxComponent = forwardRef<
  HTMLInputElement,
  CheckboxProps & InputHTMLAttributes<HTMLInputElement>
>((props, ref) => {
  const { className, ...rest } = deepMergeDefaults(defaults, props);

  return (
    <div className={classnames("dsa-checkbox", className)}>
      <CheckboxContextDefault {...rest} ref={ref} />
    </div>
  );
});
CheckboxComponent.displayName = "CheckboxComponent";

export const CheckboxProvider: FC<PropsWithChildren> = (props) => (
  <CheckboxContext.Provider {...props} value={CheckboxComponent} />
);
