import { Headline } from "../../../components/headline/HeadlineComponent";
import { FontSizePreview } from "../components/font-size-preview/FontSizePreviewComponent";
import TokenPreviewChart from "../components/token-preview-chart/TokenPreviewChartComponent";

const Page = () => (
  <div className="preview-page">
    <Headline text="Font Size" style="h2" level="h1" />
    <TokenPreviewChart>
      <thead>
        <tr>
          <th>Token</th>
          <th>Preview</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <Headline text="Display" level="h2" style="h3" />
          </td>
        </tr>
        <FontSizePreview token="var(--ks-font-size-display-xxs)" />
        <FontSizePreview token="var(--ks-font-size-display-xs)" />
        <FontSizePreview token="var(--ks-font-size-display-s)" />
        <FontSizePreview token="var(--ks-font-size-display-m)" />
        <FontSizePreview token="var(--ks-font-size-display-l)" />
        <FontSizePreview token="var(--ks-font-size-display-xl)" />
        <FontSizePreview token="var(--ks-font-size-display-xxl)" />

        <tr>
          <td>
            <Headline text="Copy" level="h2" style="h3" />
          </td>
        </tr>
        <FontSizePreview token="var(--ks-font-size-copy-xxs)" />
        <FontSizePreview token="var(--ks-font-size-copy-xs)" />
        <FontSizePreview token="var(--ks-font-size-copy-s)" />
        <FontSizePreview token="var(--ks-font-size-copy-m)" />
        <FontSizePreview token="var(--ks-font-size-copy-l)" />
        <FontSizePreview token="var(--ks-font-size-copy-xl)" />
        <FontSizePreview token="var(--ks-font-size-copy-xxl)" />
        <tr>
          <td>
            <Headline text="Interface" level="h2" style="h3" />
          </td>
        </tr>
        <FontSizePreview token="var(--ks-font-size-interface-xxs)" />
        <FontSizePreview token="var(--ks-font-size-interface-xs)" />
        <FontSizePreview token="var(--ks-font-size-interface-s)" />
        <FontSizePreview token="var(--ks-font-size-interface-m)" />
        <FontSizePreview token="var(--ks-font-size-interface-l)" />
        <FontSizePreview token="var(--ks-font-size-interface-xl)" />
        <FontSizePreview token="var(--ks-font-size-interface-xxl)" />
        <tr>
          <td>
            <Headline text="Mono" level="h2" style="h3" />
          </td>
        </tr>
        <FontSizePreview token="var(--ks-font-size-mono-xxs)" />
        <FontSizePreview token="var(--ks-font-size-mono-xs)" />
        <FontSizePreview token="var(--ks-font-size-mono-s)" />
        <FontSizePreview token="var(--ks-font-size-mono-m)" />
        <FontSizePreview token="var(--ks-font-size-mono-l)" />
        <FontSizePreview token="var(--ks-font-size-mono-xl)" />
        <FontSizePreview token="var(--ks-font-size-mono-xxl)" />
      </tbody>
    </TokenPreviewChart>
  </div>
);

export default {
  title: "Token / Base / Font Size",
  render: Page,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["!manifest"],
};

export const FontSize = {};
