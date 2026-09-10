import {
  forwardRef,
  FC,
  PropsWithChildren,
  TextareaHTMLAttributes,
} from "react";
import classnames from "classnames";
import { TextAreaProps } from "./TextAreaProps";

import {
  TextAreaContext,
  TextAreaContextDefault,
} from "@kickstartds/form/lib/text-area";
import { deepMergeDefaults } from "../helpers";
import defaults from "./TextAreaDefaults";
import "./text-area.scss";

export type { TextAreaProps };

export const TextAreaComponent = forwardRef<
  HTMLTextAreaElement,
  TextAreaProps & TextareaHTMLAttributes<HTMLTextAreaElement>
>((props, ref) => {
  const { className, ...rest } = deepMergeDefaults(defaults, props);

  return (
    <div className={classnames("dsa-text-area", className)}>
      <TextAreaContextDefault {...rest} ref={ref} />
    </div>
  );
});
TextAreaComponent.displayName = "TextAreaComponent";

export const TextAreaProvider: FC<PropsWithChildren> = (props) => (
  <TextAreaContext.Provider {...props} value={TextAreaComponent} />
);
