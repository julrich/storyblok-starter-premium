import React from "react";
import "./BoxShadowSwatch.css";

interface BoxShadowSwatchProps {
  token: string;
  label?: string;
  hover?: boolean;
  inverted?: boolean;
}

export const BoxShadowSwatch: React.FC<BoxShadowSwatchProps> = ({
  token,
  label,
  inverted,
}) => (
  <div
    className="box-shadow-swatch"
    ks-inverted={inverted ? "true" : undefined}
  >
    <div
      className={`box-shadow-swatch__canvas`}
      style={{ boxShadow: `var(${token})` }}
      aria-label={label}
    />
  </div>
);
