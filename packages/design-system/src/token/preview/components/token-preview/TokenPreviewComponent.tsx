import classnames from "classnames";
import { HTMLAttributes, createContext, forwardRef, useContext } from "react";
import "./token-preview.scss";
import CopyTooltip from "../copy-tooltip/CopyTooltipComponent";

export interface TokenPreviewProps {
  token: string;
  description?: string;
  category?: string;
  children?: React.ReactNode;
}

export const TokenPreviewContextDefault = forwardRef<
  HTMLTableRowElement,
  TokenPreviewProps & HTMLAttributes<HTMLTableRowElement>
>(({ token, description, category, children }, ref) => {
  return (
    <tr className={classnames("token-preview", category)} ref={ref}>
      <td className="token-preview__info">
        <button className="token-preview__name">
          <CopyTooltip />
          <span>{token}</span>
        </button>
        {description && (
          <div className="token-preview__description">{description}</div>
        )}
      </td>
      {children}
    </tr>
  );
});

export const TokenPreviewContext = createContext(TokenPreviewContextDefault);
export const TokenPreview = forwardRef<
  HTMLTableRowElement,
  TokenPreviewProps & HTMLAttributes<HTMLTableRowElement>
>((props, ref) => {
  const Component = useContext(TokenPreviewContext);
  return <Component {...props} ref={ref} />;
});
TokenPreview.displayName = "TokenPreview";
