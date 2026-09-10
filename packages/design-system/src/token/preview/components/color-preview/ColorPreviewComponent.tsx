import { HTMLAttributes, createContext, forwardRef, useContext } from "react";
import "./color-preview.scss";
import { TokenPreview } from "../token-preview/TokenPreviewComponent";
import { ColorSwatch } from "../color-swatch/ColorSwatchComponent";

export interface ColorPreviewProps {
  token: string;
  showInverted?: boolean;
  category?: string;
  gradientBackground?: boolean;
  contrastBorder?: boolean;
  invertedBackground?: boolean;
  reference?: string;
  invertedReference?: string;
}

export const ColorPreviewContextDefault = forwardRef<
  HTMLTableRowElement,
  ColorPreviewProps & HTMLAttributes<HTMLTableRowElement>
>(
  (
    {
      token,
      showInverted,
      gradientBackground,
      contrastBorder,
      invertedBackground,
      category,
      reference,
      invertedReference,
    },
    ref
  ) => {
    return (
      <TokenPreview token={token} ref={ref}>
        <td>
          <ColorSwatch
            token={token}
            gradientBackground={gradientBackground}
            invertedBackground={invertedBackground}
            contrastBorder={contrastBorder}
            reference={reference}
            //@ts-expect-error
            category={category}
          />
        </td>
        {showInverted && (
          <td>
            <ColorSwatch
              token={token}
              gradientBackground={gradientBackground}
              contrastBorder={contrastBorder}
              inverted
              invertedBackground={invertedBackground}
              reference={invertedReference}
              //@ts-expect-error
              category={category}
            />
          </td>
        )}
      </TokenPreview>
    );
  }
);

export const ColorPreviewContext = createContext(ColorPreviewContextDefault);
export const ColorPreview = forwardRef<
  HTMLTableRowElement,
  ColorPreviewProps & HTMLAttributes<HTMLTableRowElement>
>((props, ref) => {
  const Component = useContext(ColorPreviewContext);
  return <Component {...props} ref={ref} />;
});
ColorPreview.displayName = "ColorPreview";
