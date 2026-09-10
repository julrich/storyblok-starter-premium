import { Headline } from "../../../components/headline/HeadlineComponent";
import TokenPreviewChart from "../components/token-preview-chart/TokenPreviewChartComponent";
import { ColorPreview } from "../components/color-preview/ColorPreviewComponent";

const Page = () => (
  <div className="preview-page">
    <Headline text="Color Pallette" style="h2" level="h1" />
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
          <td>
            <Headline text="Primary" level="h2" style="h3" />
          </td>
        </tr>
        <ColorPreview token="--ks-color-primary" showInverted />
        <td>
          <Headline text="Alpha" level="h3" style="h4" />
        </td>

        <tr>
          <td>
            <Headline text="To Background" level="h3" style="h4" />
          </td>
        </tr>
        <ColorPreview token="--ks-color-primary-to-bg-1" showInverted />
        <ColorPreview token="--ks-color-primary-to-bg-2" showInverted />
        <ColorPreview token="--ks-color-primary-to-bg-3" showInverted />
        <ColorPreview token="--ks-color-primary-to-bg-4" showInverted />
        <ColorPreview token="--ks-color-primary-to-bg-5" showInverted />
        <ColorPreview token="--ks-color-primary-to-bg-6" showInverted />
        <ColorPreview token="--ks-color-primary-to-bg-7" showInverted />
        <ColorPreview token="--ks-color-primary-to-bg-8" showInverted />
        <ColorPreview token="--ks-color-primary-to-bg-9" showInverted />
        <tr>
          <td>
            <Headline text="To Foreground" level="h3" style="h4" />
          </td>
        </tr>
        <ColorPreview token="--ks-color-primary-to-fg-1" showInverted />
        <ColorPreview token="--ks-color-primary-to-fg-2" showInverted />
        <ColorPreview token="--ks-color-primary-to-fg-3" showInverted />
        <ColorPreview token="--ks-color-primary-to-fg-4" showInverted />
        <ColorPreview token="--ks-color-primary-to-fg-5" showInverted />
        <ColorPreview token="--ks-color-primary-to-fg-6" showInverted />
        <ColorPreview token="--ks-color-primary-to-fg-7" showInverted />
        <ColorPreview token="--ks-color-primary-to-fg-8" showInverted />
        <ColorPreview token="--ks-color-primary-to-fg-9" showInverted />
        <tr>
          <td>
            <Headline text="Foreground" level="h2" style="h3" />
          </td>
        </tr>
        <ColorPreview token="--ks-color-fg" showInverted />
        <td>
          <Headline text="Alpha" level="h3" style="h4" />
        </td>
        <ColorPreview token="--ks-color-fg-alpha-1" showInverted />
        <ColorPreview token="--ks-color-fg-alpha-2" showInverted />
        <ColorPreview token="--ks-color-fg-alpha-3" showInverted />
        <ColorPreview token="--ks-color-fg-alpha-4" showInverted />
        <ColorPreview token="--ks-color-fg-alpha-5" showInverted />
        <ColorPreview token="--ks-color-fg-alpha-6" showInverted />
        <ColorPreview token="--ks-color-fg-alpha-7" showInverted />
        <ColorPreview token="--ks-color-fg-alpha-8" showInverted />
        <ColorPreview token="--ks-color-fg-alpha-9" showInverted />
        <tr>
          <td>
            <Headline text="To Background" level="h3" style="h4" />
          </td>
        </tr>
        <ColorPreview token="--ks-color-fg-to-bg-1" showInverted />
        <ColorPreview token="--ks-color-fg-to-bg-2" showInverted />
        <ColorPreview token="--ks-color-fg-to-bg-3" showInverted />
        <ColorPreview token="--ks-color-fg-to-bg-4" showInverted />
        <ColorPreview token="--ks-color-fg-to-bg-5" showInverted />
        <ColorPreview token="--ks-color-fg-to-bg-6" showInverted />
        <ColorPreview token="--ks-color-fg-to-bg-7" showInverted />
        <ColorPreview token="--ks-color-fg-to-bg-8" showInverted />
        <ColorPreview token="--ks-color-fg-to-bg-9" showInverted />
        <tr>
          <td>
            <Headline text="Background" level="h2" style="h3" />
          </td>
        </tr>
        <ColorPreview token="--ks-color-bg" showInverted />
        <td>
          <Headline text="Alpha" level="h3" style="h4" />
        </td>
        <ColorPreview token="--ks-color-bg-alpha-1" showInverted />
        <ColorPreview token="--ks-color-bg-alpha-2" showInverted />
        <ColorPreview token="--ks-color-bg-alpha-3" showInverted />
        <ColorPreview token="--ks-color-bg-alpha-4" showInverted />
        <ColorPreview token="--ks-color-bg-alpha-5" showInverted />
        <ColorPreview token="--ks-color-bg-alpha-6" showInverted />
        <ColorPreview token="--ks-color-bg-alpha-7" showInverted />
        <ColorPreview token="--ks-color-bg-alpha-8" showInverted />
        <ColorPreview token="--ks-color-bg-alpha-9" showInverted />
        <tr>
          <td>
            <Headline text="To Foreground" level="h3" style="h4" />
          </td>
        </tr>
        <ColorPreview token="--ks-color-bg-to-fg-1" showInverted />
        <ColorPreview token="--ks-color-bg-to-fg-2" showInverted />
        <ColorPreview token="--ks-color-bg-to-fg-3" showInverted />
        <ColorPreview token="--ks-color-bg-to-fg-4" showInverted />
        <ColorPreview token="--ks-color-bg-to-fg-5" showInverted />
        <ColorPreview token="--ks-color-bg-to-fg-6" showInverted />
        <ColorPreview token="--ks-color-bg-to-fg-7" showInverted />
        <ColorPreview token="--ks-color-bg-to-fg-8" showInverted />
        <ColorPreview token="--ks-color-bg-to-fg-9" showInverted />
        <tr>
          <td>
            <Headline text="Link" level="h2" style="h3" />
          </td>
        </tr>
        <ColorPreview token="--ks-color-link" showInverted />
        <td>
          <Headline text="Alpha" level="h3" style="h4" />
        </td>
        <ColorPreview token="--ks-color-link-alpha-1" showInverted />
        <ColorPreview token="--ks-color-link-alpha-2" showInverted />
        <ColorPreview token="--ks-color-link-alpha-3" showInverted />
        <ColorPreview token="--ks-color-link-alpha-4" showInverted />
        <ColorPreview token="--ks-color-link-alpha-5" showInverted />
        <ColorPreview token="--ks-color-link-alpha-6" showInverted />
        <ColorPreview token="--ks-color-link-alpha-7" showInverted />
        <ColorPreview token="--ks-color-link-alpha-8" showInverted />
        <ColorPreview token="--ks-color-link-alpha-9" showInverted />
        <tr>
          <td>
            <Headline text="To Background" level="h3" style="h4" />
          </td>
        </tr>
        <ColorPreview token="--ks-color-link-to-bg-1" showInverted />
        <ColorPreview token="--ks-color-link-to-bg-2" showInverted />
        <ColorPreview token="--ks-color-link-to-bg-3" showInverted />
        <ColorPreview token="--ks-color-link-to-bg-4" showInverted />
        <ColorPreview token="--ks-color-link-to-bg-5" showInverted />
        <ColorPreview token="--ks-color-link-to-bg-6" showInverted />
        <ColorPreview token="--ks-color-link-to-bg-7" showInverted />
        <ColorPreview token="--ks-color-link-to-bg-8" showInverted />
        <ColorPreview token="--ks-color-link-to-bg-9" showInverted />
        <tr>
          <td>
            <Headline text="To Foreground" level="h3" style="h4" />
          </td>
        </tr>
        <ColorPreview token="--ks-color-link-to-fg-1" showInverted />
        <ColorPreview token="--ks-color-link-to-fg-2" showInverted />
        <ColorPreview token="--ks-color-link-to-fg-3" showInverted />
        <ColorPreview token="--ks-color-link-to-fg-4" showInverted />
        <ColorPreview token="--ks-color-link-to-fg-5" showInverted />
        <ColorPreview token="--ks-color-link-to-fg-6" showInverted />
        <ColorPreview token="--ks-color-link-to-fg-7" showInverted />
        <ColorPreview token="--ks-color-link-to-fg-8" showInverted />
        <ColorPreview token="--ks-color-link-to-fg-9" showInverted />
      </tbody>
    </TokenPreviewChart>
  </div>
);

export default {
  title: "Token / Base / Color",
  render: Page,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["!manifest"],
};

export const Color = {};
