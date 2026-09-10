import { Headline } from "../../../components/headline/HeadlineComponent";
import { ColorPreview } from "../components/color-preview/ColorPreviewComponent";
import TokenPreviewChart from "../components/token-preview-chart/TokenPreviewChartComponent";

const Page = () => (
  <div className="preview-page">
    <Headline text="Text Color" style="h2" level="h1" />
    <TokenPreviewChart>
      <thead>
        <tr>
          <th>Token</th>
          <th>Preview</th>
          <th>Inverted</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td colSpan={3}>
            <Headline text="Primary" level="h2" style="h3" />
          </td>
        </tr>

        <ColorPreview
          category="color"
          token="--ks-text-color-primary"
          showInverted
        />
        <tr>
          <td colSpan={3}>
            <Headline text="Interface" level="h2" style="h3" />
          </td>
        </tr>
        <ColorPreview
          category="color"
          token="--ks-text-color-interface"
          showInverted
        />
        <ColorPreview
          category="color"
          token="--ks-text-color-interface-interactive"
          showInverted
        />
      </tbody>
    </TokenPreviewChart>
  </div>
);

export default {
  title: "Token / Semantic / Text Color",
  render: Page,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["!manifest"],
};

export const TextColor = {};
