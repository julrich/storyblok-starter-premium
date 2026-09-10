import React from "react";
import { BoxShadowPreview } from "./BoxShadowPreview";
import { Headline } from "../../../components/headline/HeadlineComponent";

const shadowTokenGroups = [
  {
    category: "Card",
    tokens: [
      {
        label: "Card",
        token: "--ks-box-shadow-card",
        invertedToken: "--ks-box-shadow-card-inverted",
      },
      {
        label: "Card Hover",
        token: "--ks-box-shadow-card-hover",
        invertedToken: "--ks-box-shadow-card-inverted-hover",
        hover: true,
      },
    ],
  },
  {
    category: "Control",
    tokens: [
      {
        label: "Control",
        token: "--ks-box-shadow-control",
        invertedToken: "--ks-box-shadow-control-inverted",
      },
      {
        label: "Control Hover",
        token: "--ks-box-shadow-control-hover",
        invertedToken: "--ks-box-shadow-control-inverted-hover",
        hover: true,
      },
    ],
  },
  {
    category: "Surface",
    tokens: [
      {
        label: "Surface",
        token: "--ks-box-shadow-surface",
        invertedToken: "--ks-box-shadow-surface-inverted",
      },
      {
        label: "Surface Hover",
        token: "--ks-box-shadow-surface-hover",
        invertedToken: "--ks-box-shadow-surface-inverted-hover",
        hover: true,
      },
    ],
  },
];

const Page = () => (
  <div className="preview-page">
    <Headline text="Box Shadow Tokens" style="h2" level="h1" />
    <table className="token-preview-chart">
      <thead>
        <tr>
          <th>Token</th>
          <th>Preview</th>
          <th>Inverted</th>
        </tr>
      </thead>
      <tbody>
        {shadowTokenGroups.map(({ category, tokens }) => (
          <React.Fragment key={category}>
            <tr>
              <td colSpan={3}>
                <Headline text={category} level="h2" style="h3" />
              </td>
            </tr>
            {tokens.map(({ label, token, invertedToken, hover }) => (
              <BoxShadowPreview
                key={token}
                token={token}
                label={label}
                hover={hover}
                showInverted={true}
                invertedToken={invertedToken}
              />
            ))}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  </div>
);

export default {
  title: "Token / Base / Box Shadow",
  render: Page,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["!manifest"],
};

export const BoxShadow = {};
