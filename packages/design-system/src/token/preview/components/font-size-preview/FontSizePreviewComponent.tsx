import { HTMLAttributes, createContext, forwardRef, useContext } from "react";
import { TokenPreview } from "../token-preview/TokenPreviewComponent";
import { FontSwatch } from "../font-swatch/FontSwatchComponent";
import "./font-size-preview.scss";

export interface FontSizePreviewProps {
  exampleText?: string;
  token: string;
}

export const FontSizePreviewContextDefault = forwardRef<
  HTMLTableRowElement,
  FontSizePreviewProps & HTMLAttributes<HTMLTableRowElement>
>(({ exampleText, token }, ref) => {
  return (
    <TokenPreview token={token} ref={ref}>
      <FontSwatch token={token} exampleText={exampleText} />
    </TokenPreview>
  );
});

export const FontSizePreviewContext = createContext(
  FontSizePreviewContextDefault
);
export const FontSizePreview = forwardRef<
  HTMLTableRowElement,
  FontSizePreviewProps & HTMLAttributes<HTMLTableRowElement>
>((props, ref) => {
  const Component = useContext(FontSizePreviewContext);
  return <Component {...props} ref={ref} />;
});
FontSizePreview.displayName = "FontSizePreview";
