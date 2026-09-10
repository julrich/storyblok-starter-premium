import { Headline } from "../../../components/headline/HeadlineComponent";
import { ColorPreview } from "../components/color-preview/ColorPreviewComponent";
import TokenPreviewChart from "../components/token-preview-chart/TokenPreviewChartComponent";

const Page = () => (
  <div className="preview-page">
    <Headline text="Background Color" style="h2" level="h1" />
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
            <Headline text="" level="h2" style="h3" />
          </td>
        </tr>

        <tr>
          <td colSpan={3}>
            <Headline text="Accent" level="h2" style="h3" />
          </td>
        </tr>

        <ColorPreview token="--ks-background-color-accent" showInverted />
        <tr>
          <td colSpan={3}>
            <Headline text="Bold" level="h2" style="h3" />
          </td>
        </tr>

        <ColorPreview token="--ks-background-color-bold" showInverted />
        <tr>
          <td colSpan={3}>
            <Headline text="Card" level="h2" style="h3" />
          </td>
        </tr>
        <ColorPreview token="--ks-background-color-card" showInverted />
        <ColorPreview
          token="--ks-background-color-card-interactive"
          showInverted
        />
        <ColorPreview
          token="--ks-background-color-card-interactive-hover"
          showInverted
        />
        <ColorPreview
          token="--ks-background-color-card-interactive-active"
          showInverted
        />
      </tbody>
    </TokenPreviewChart>
  </div>
);

export default {
  title: "Token / Semantic / Background Color",
  render: Page,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["!manifest"],
};

export const BackgroundColor = {};
