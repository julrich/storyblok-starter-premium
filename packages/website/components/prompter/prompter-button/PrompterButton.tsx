import { Icon } from "@kickstartds/base/lib/icon";
import classnames from "classnames";
import React from "react";

interface PrompterButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon?: string;
  spacingTop?: boolean;
  variant?: "primary" | "secondary";
}

const PrompterButton: React.FC<PrompterButtonProps> = ({
  label,
  icon,
  spacingTop,
  variant = "primary",
  className,
  ...props
}) => {
  return (
    <button
      className={classnames(
        "prompter-button",
        `prompter-button--${variant}`,
        { "prompter-button--spacing-top": spacingTop },
        className
      )}
      {...props}
    >
      {label}
      {icon && <Icon icon={icon} />}
    </button>
  );
};

export default PrompterButton;
