import React from "react";
import { TokenPreview } from "../components/token-preview/TokenPreviewComponent";
import { BoxShadowSwatch } from "../components/box-shadow-swatch/BoxShadowSwatch";
import "./BoxShadowPreview.css";

interface BoxShadowPreviewProps {
  token: string;
  label: string;
  hover?: boolean;
  description?: string;
  category?: string;
  showInverted?: boolean;
  invertedToken?: string;
}

export const BoxShadowPreview: React.FC<BoxShadowPreviewProps> = ({
  token,
  label,
  hover,
  description,
  category,
  showInverted,
  invertedToken,
}) => {
  return (
    <TokenPreview token={token} description={description} category={category}>
      <td>
        <BoxShadowSwatch token={token} label={label} hover={hover} />
      </td>
      {showInverted && invertedToken && (
        <td>
          <BoxShadowSwatch
            token={token}
            label={label + " Inverted"}
            hover={hover}
            inverted
          />
        </td>
      )}
    </TokenPreview>
  );
};
