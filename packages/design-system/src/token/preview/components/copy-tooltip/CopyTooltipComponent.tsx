import React from "react";
import "./copy-tooltip.scss";

export interface CopyTooltipProps {
  label?: string;
}

const CopyTooltip: React.FC<CopyTooltipProps> = ({ label }) => (
  <div className="copy-tooltip">{label || "Copy to clipboard"}</div>
);

export default CopyTooltip;
