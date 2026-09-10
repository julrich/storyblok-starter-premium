import { HTMLAttributes, createContext, forwardRef, useContext } from "react";
import classnames from "classnames";
import CopyTooltip from "../copy-tooltip/CopyTooltipComponent";
import "./font-swatch.scss";

export enum Category {
  BackgroundColor = "backgroundColor",
  BorderColor = "borderColor",
  Color = "color",
}
export interface FontSwatchProps {
  token: string;
  inverted?: boolean;
  category?: Category;
  contrastBorder?: boolean;
  gradientBackground?: boolean;
  invertedBackground?: boolean;
  exampleText?: string;
}

export const FontSwatchContextDefault = forwardRef<
  HTMLButtonElement,
  FontSwatchProps & HTMLAttributes<HTMLButtonElement>
>(({ token, title, exampleText, inverted }, ref) => {
  return (
    <td>
      <button
        ks-inverted={inverted ? "true" : undefined}
        className={classnames("token-color-swatch")}
        ref={ref}
      >
        <CopyTooltip />
        <div
          className="token-font-swatch__canvas"
          style={{
            fontSize: `${token}`,
          }}
        >
          <span>{exampleText || "Aa"}</span>
        </div>
        {title && <div className="token-color-swatch__title">{title}</div>}
      </button>
    </td>
  );
});

export const FontSwatchContext = createContext(FontSwatchContextDefault);
export const FontSwatch = forwardRef<
  HTMLButtonElement,
  FontSwatchProps & HTMLAttributes<HTMLButtonElement>
>((props, ref) => {
  const Component = useContext(FontSwatchContext);
  return <Component {...props} ref={ref} />;
});
FontSwatch.displayName = "FontSwatch";
