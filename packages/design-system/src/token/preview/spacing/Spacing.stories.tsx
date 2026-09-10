const Page = () => (
  <div className="preview-page">
    <div className="spacings">
      <h1>Spacings</h1>
      <span>XXS</span>
      <div className="spacing spacing-xxs" />
      <span>XS</span>
      <div className="spacing spacing-xs" />
      <span>S</span>
      <div className="spacing spacing-s" />
      <span>M</span>
      <div className="spacing spacing-m" />
      <span>L</span>
      <div className="spacing spacing-l" />
      <span>XL</span>
      <div className="spacing spacing-xl" />
      <span>XXL</span>
      <div className="spacing spacing-xxl" />
    </div>

    <div className="spacings mobile">
      <h1>Spacings Mobile</h1>
      <span>XXS</span>
      <div
        style={{ width: "var(--ks-spacing-xxs-base)" }}
        className="spacing"
      />
      <span>XS</span>
      <div style={{ width: "var(--ks-spacing-xs-base)" }} className="spacing" />
      <span>S</span>
      <div style={{ width: "var(--ks-spacing-s-base)" }} className="spacing" />
      <span>M</span>
      <div style={{ width: "var(--ks-spacing-m-base)" }} className="spacing" />
      <span>L</span>
      <div style={{ width: "var(--ks-spacing-l-base)" }} className="spacing" />
      <span>XL</span>
      <div style={{ width: "var(--ks-spacing-xl-base)" }} className="spacing" />
      <span>XXL</span>
      <div
        style={{ width: "var(--ks-spacing-xxl-base)" }}
        className="spacing"
      />
    </div>
  </div>
);

export default {
  title: "Token / Base / Spacing",
  render: Page,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["!manifest"],
};

export const Spacing = {};
