const Page = () => (
  <div className="preview-page">
    <h1>Borders</h1>
    <h2>Border Width</h2>
    <h3>Default</h3>
    <div
      style={{ border: "var(--ks-border-width-default) solid black" }}
      className="border-preview"
    />
    <h3>Emphasized</h3>
    <div
      style={{ border: "var(--ks-border-width-emphasized) solid black" }}
      className="border-preview"
    />
    <h2>Border Radius</h2>
    <h3>Control</h3>
    <div
      style={{ borderRadius: "var(--ks-border-radius-control)" }}
      className="border-preview border-preview-radius"
    />
    <h3>Card</h3>
    <div
      style={{ borderRadius: "var(--ks-border-radius-card)" }}
      className="border-preview border-preview-radius"
    />
    <h3>Surface</h3>
    <div
      style={{ borderRadius: "var(--ks-border-radius-surface)" }}
      className="border-preview border-preview-radius"
    />
    <h3>Pill</h3>
    <div
      style={{ borderRadius: "var(--ks-border-radius-pill)" }}
      className="border-preview border-preview-radius"
    />
    <h3>Circle</h3>
    <div
      style={{ borderRadius: "var(--ks-border-radius-circle)" }}
      className="border-preview border-preview-radius"
    />
  </div>
);

export default {
  title: "Token / Base / Border",
  render: Page,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["!manifest"],
};

export const Border = {};
