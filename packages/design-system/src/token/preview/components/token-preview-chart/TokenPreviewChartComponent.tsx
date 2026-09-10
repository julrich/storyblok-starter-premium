import React from "react";
import "./token-preview-chart.scss";

export interface TokenPreviewChartProps {
  children?: React.ReactNode;
}

const TokenPreviewChart: React.FC<TokenPreviewChartProps> = ({ children }) => (
  <table className="token-preview-chart">{children}</table>
);

export default TokenPreviewChart;
