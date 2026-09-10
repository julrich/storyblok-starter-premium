import { InputHTMLAttributes, forwardRef, FC, PropsWithChildren } from "react";
import classnames from "classnames";
import { TextFieldProps } from "./TextFieldProps";

import {
  TextFieldContext,
  TextFieldContextDefault,
} from "@kickstartds/form/lib/text-field";
import { deepMergeDefaults } from "../helpers";
import defaults from "./TextFieldDefaults";

import "./text-field.scss";

export type { TextFieldProps };

export const TextFieldComponent = forwardRef<
  HTMLInputElement,
  TextFieldProps & InputHTMLAttributes<HTMLInputElement>
>((props, ref) => {
  const { className, ...rest } = deepMergeDefaults(defaults, props);

  return (
    <div className={classnames("dsa-text-field", className)}>
      <TextFieldContextDefault {...rest} ref={ref} />
    </div>
  );
});
TextFieldComponent.displayName = "TextFieldComponent";

export const TextFieldProvider: FC<PropsWithChildren> = (props) => (
  <TextFieldContext.Provider {...props} value={TextFieldComponent} />
);
