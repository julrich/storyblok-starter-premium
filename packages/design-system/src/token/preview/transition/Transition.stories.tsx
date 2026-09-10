const Page = () => (
  <div className="preview-page">
    <h1>Transition</h1>
    <h2>Hover</h2>
    <div
      style={{ transition: "var(--ks-transition-hover)" }}
      className="transition-preview"
    />
    <h2>Fade</h2>
    <div
      style={{ transition: "var(--ks-transition-fade)" }}
      className="transition-preview"
    />
    <h2>Collapse</h2>
    <div
      style={{ transition: "var(--ks-transition-collapse)" }}
      className="transition-preview"
    />
  </div>
);

export default {
  title: "Token / Base / Transition",
  render: Page,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["!manifest"],
};

export const Transition = {};
