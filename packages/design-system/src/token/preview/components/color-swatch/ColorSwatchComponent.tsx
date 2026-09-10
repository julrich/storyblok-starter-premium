import {
  HTMLAttributes,
  createContext,
  forwardRef,
  useContext,
  useRef,
} from "react";
import classnames from "classnames";
import "./color-swatch.scss";
import CopyTooltip from "../copy-tooltip/CopyTooltipComponent";
import { useCssValue } from "../useCssValue";

export enum Category {
  BackgroundColor = "backgroundColor",
  BorderColor = "borderColor",
  Color = "color",
}
export interface ColorSwatchProps {
  token: string;
  reference?: string;
  inverted?: boolean;
  category?: Category;
  contrastBorder?: boolean;
  gradientBackground?: boolean;
  invertedBackground?: boolean;
}

const cssPropertyByCategory = (category: Category) => {
  switch (category) {
    case Category.BorderColor:
      return "borderColor";

    case Category.Color:
      return "color";

    case Category.BackgroundColor:
    default:
      return "backgroundColor";
  }
};

export const ColorSwatchContextDefault = forwardRef<
  HTMLButtonElement,
  ColorSwatchProps & HTMLAttributes<HTMLButtonElement>
>(
  (
    {
      token,
      reference,
      inverted,
      invertedBackground,
      contrastBorder,
      gradientBackground,
      category = Category.BackgroundColor,
    },
    ref
  ) => {
    const swatchRef = useRef<HTMLDivElement>();
    const cssProperty = cssPropertyByCategory(category);
    const style: React.CSSProperties = { [cssProperty]: `var(${token})` };
    const computedValue = useCssValue(cssProperty, swatchRef);

    return (
      <button
        ks-inverted={inverted ? "true" : undefined}
        className={classnames(
          "token-color-swatch",
          `token-color-swatch--${category}`,
          contrastBorder && `token-color-swatch--contrast-border`,
          gradientBackground && `token-color-swatch--gradient-background`,
          invertedBackground && `token-color-swatch--inverted-background`
        )}
        ref={ref}
      >
        <CopyTooltip />
        <div
          className="token-color-swatch__canvas"
          style={style}
          ref={swatchRef}
        >
          {category === Category.Color && <span>Aa</span>}
        </div>
        {computedValue && (
          <div className="token-color-swatch__title">{computedValue}</div>
        )}
        {reference && (
          <div className="token-color-swatch__reference">{reference}</div>
        )}
      </button>
    );
  }
);

export const ColorSwatchContext = createContext(ColorSwatchContextDefault);
export const ColorSwatch = forwardRef<
  HTMLButtonElement,
  ColorSwatchProps & HTMLAttributes<HTMLButtonElement>
>((props, ref) => {
  const Component = useContext(ColorSwatchContext);
  return <Component {...props} ref={ref} />;
});
ColorSwatch.displayName = "ColorSwatch";
