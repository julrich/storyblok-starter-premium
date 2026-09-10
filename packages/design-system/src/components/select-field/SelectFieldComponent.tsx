import { SelectHTMLAttributes, forwardRef, FC, PropsWithChildren } from "react";
import classnames from "classnames";
import { SelectFieldProps } from "./SelectFieldProps";

import {
  SelectFieldContext,
  SelectFieldContextDefault,
} from "@kickstartds/form/lib/select-field";
import { deepMergeDefaults } from "../helpers";
import defaults from "./SelectFieldDefaults";
import "./select-field.scss";

export type { SelectFieldProps };

export const SelectFieldComponent = forwardRef<
  HTMLSelectElement,
  SelectFieldProps & SelectHTMLAttributes<HTMLSelectElement>
>((props, ref) => {
  const { className, ...rest } = deepMergeDefaults(defaults, props);

  return (
    <div className={classnames("dsa-select-field", className)}>
      <SelectFieldContextDefault {...rest} ref={ref} />
    </div>
  );
});
SelectFieldComponent.displayName = "SelectFieldComponent";

export const SelectFieldProvider: FC<PropsWithChildren> = (props) => (
  <SelectFieldContext.Provider {...props} value={SelectFieldComponent} />
);
