import { HTMLAttributes, forwardRef, FC, PropsWithChildren } from "react";
import classnames from "classnames";
import {
  ButtonContextDefault,
  ButtonContext,
} from "@kickstartds/base/lib/button";
import { ButtonProps } from "./ButtonProps";
import "./button.scss";
import { deepMergeDefaults } from "../helpers";
import defaults from "./ButtonDefaults";

export type { ButtonProps };

export const Button = forwardRef<
  HTMLAnchorElement | HTMLButtonElement,
  ButtonProps &
    HTMLAttributes<HTMLElement> & {
      /**
       * Open the link in a new tab. Resolved at story-processing time from
       * Storyblok's multilink target-blank toggle - not part of the
       * generated schema type, since it isn't an editable Button field.
       */
      newTab?: boolean;
    }
>((props, ref) => {
  const {
    label,
    url,
    size = "medium",
    variant = "secondary",
    icon,
    disabled = false,
    className,
    newTab,
    ...rest
  } = deepMergeDefaults(defaults, props);

  return (
    <ButtonContextDefault
      {...rest}
      className={classnames("dsa-button", className)}
      href={url}
      label={label}
      size={size}
      variant={
        variant === "primary"
          ? "solid"
          : variant === "secondary"
            ? "clear"
            : variant === "tertiary"
              ? "outline"
              : "solid"
      }
      disabled={disabled}
      newTab={newTab}
      iconAfter={{
        icon: icon,
      }}
      ref={ref}
    />
  );
});
Button.displayName = "Button";

export const ButtonProvider: FC<PropsWithChildren> = (props) => (
  <ButtonContext.Provider {...props} value={Button} />
);
