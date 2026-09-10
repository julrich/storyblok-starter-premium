import { FC } from "react";
import classnames from "classnames";

export interface BookADemoProps {
  enabled?: boolean;
  label?: string;
  url?: string;
  variant?: "primary" | "secondary" | "tertiary";
}

export const BookADemo: FC<BookADemoProps> = ({
  enabled = false,
  label = "Book a Demo",
  url,
  variant = "primary",
}) => {
  if (!enabled || !url) return null;

  return (
    <a
      href={url}
      className={classnames(
        "dsa-book-a-demo",
        "dsa-button",
        `dsa-book-a-demo--${variant}`,
      )}
      target="_blank"
      rel="noopener noreferrer"
    >
      {label}
    </a>
  );
};
