import React, { useState, useCallback, useRef } from "react";
import {
  rootStep,
  componentList,
  Step,
  StepOption,
  TokenResult,
  ComponentInfo,
} from "./tokenTree";
import { componentTokenData, ComponentToken } from "./componentTokenData";
import "./token-picker.scss";

// ------------------------------------------------------------------ types

interface BreadcrumbEntry {
  label: string;
  value: string;
  /** Index in the history stack — used to navigate back */
  stepIndex: number;
}

type Tab = "finder" | "components";

// ------------------------------------------------------------ sub-components

/** A single color swatch that reads the computed CSS value */
function ColorSwatch({
  cssVar,
  label,
  type = "background",
}: {
  cssVar: string;
  label: string;
  type?: "background" | "text" | "border";
}) {
  const ref = useRef<HTMLDivElement>(null);

  const style: React.CSSProperties =
    type === "text"
      ? {
          color: `var(${cssVar})`,
          background: "var(--ks-background-color-default)",
        }
      : type === "border"
      ? { borderColor: `var(${cssVar})`, borderWidth: 3, borderStyle: "solid" }
      : { background: `var(${cssVar})` };

  return (
    <div className="token-picker__swatch">
      <div
        ref={ref}
        className={`token-picker__swatch-preview${
          type === "text" ? " token-picker__swatch-preview--text" : ""
        }`}
        style={style}
      >
        {type === "text" && "Aa"}
      </div>
      <span className="token-picker__swatch-label">{label}</span>
    </div>
  );
}

/** Renders swatches for a token result */
function TokenSwatches({ result }: { result: TokenResult }) {
  if (!result.isColor) return null;

  const swatchType = result.category.includes("text-color")
    ? "text"
    : result.category.includes("border-color")
    ? "border"
    : "background";

  return (
    <div className="token-picker__swatches">
      <ColorSwatch cssVar={result.cssVar} label="Value" type={swatchType} />
      {result.invertedCssVar && (
        <ColorSwatch
          cssVar={result.invertedCssVar}
          label="Inverted"
          type={swatchType}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------ main component

export function TokenPicker() {
  const [activeTab, setActiveTab] = useState<Tab>("finder");

  // --- Finder state ---
  const [stepHistory, setStepHistory] = useState<Step[]>([rootStep]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([]);
  const [selectedResult, setSelectedResult] = useState<TokenResult | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  // --- Component browser state ---
  const [selectedComponent, setSelectedComponent] =
    useState<ComponentInfo | null>(null);
  const [componentTokens, setComponentTokens] = useState<ComponentToken[]>([]);
  const [componentSearch, setComponentSearch] = useState("");
  const [componentTokenSearch, setComponentTokenSearch] = useState("");

  const currentStep = stepHistory[stepHistory.length - 1];

  // -------- handlers: finder --------

  const handleOptionSelect = useCallback(
    (option: StepOption) => {
      if (option.result) {
        // final result
        setBreadcrumbs((prev) => [
          ...prev,
          {
            label: currentStep.label,
            value: option.label,
            stepIndex: stepHistory.length - 1,
          },
        ]);
        setSelectedResult(option.result);
      } else if (option.next) {
        // drill deeper
        setBreadcrumbs((prev) => [
          ...prev,
          {
            label: currentStep.label,
            value: option.label,
            stepIndex: stepHistory.length - 1,
          },
        ]);
        setStepHistory((prev) => [...prev, option.next!]);
        setSelectedResult(null);
      }
    },
    [currentStep, stepHistory.length]
  );

  const handleBreadcrumbClick = useCallback((entry: BreadcrumbEntry) => {
    // navigate back to that step
    setStepHistory((prev) => prev.slice(0, entry.stepIndex + 1));
    setBreadcrumbs((prev) => prev.filter((b) => b.stepIndex < entry.stepIndex));
    setSelectedResult(null);
  }, []);

  const handleStartOver = useCallback(() => {
    setStepHistory([rootStep]);
    setBreadcrumbs([]);
    setSelectedResult(null);
    setCopied(false);
  }, []);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  // -------- handlers: components --------

  const handleComponentSelect = useCallback((comp: ComponentInfo) => {
    setSelectedComponent(comp);
    setComponentTokens(componentTokenData[comp.slug] || []);
  }, []);

  const handleComponentBack = useCallback(() => {
    setSelectedComponent(null);
    setComponentTokens([]);
    setComponentTokenSearch("");
  }, []);

  // -------- filtered data --------

  const filteredComponents = componentSearch
    ? componentList.filter(
        (c) =>
          c.name.toLowerCase().includes(componentSearch.toLowerCase()) ||
          c.category.toLowerCase().includes(componentSearch.toLowerCase())
      )
    : componentList;

  const filteredComponentTokens = componentTokenSearch
    ? componentTokens.filter(
        (t) =>
          t.name.toLowerCase().includes(componentTokenSearch.toLowerCase()) ||
          (t.variant ?? "")
            .toLowerCase()
            .includes(componentTokenSearch.toLowerCase()) ||
          t.cssProperty
            .toLowerCase()
            .includes(componentTokenSearch.toLowerCase())
      )
    : componentTokens;

  // -------- render --------

  return (
    <div className="token-picker">
      {/* Header */}
      <div className="token-picker__header">
        <h2 className="token-picker__title">🎨 Token Picker</h2>
      </div>

      {/* Tabs */}
      <div className="token-picker__tabs">
        <button
          className={`token-picker__tab${
            activeTab === "finder" ? " token-picker__tab--active" : ""
          }`}
          onClick={() => setActiveTab("finder")}
        >
          Find a Token
        </button>
        <button
          className={`token-picker__tab${
            activeTab === "components" ? " token-picker__tab--active" : ""
          }`}
          onClick={() => setActiveTab("components")}
        >
          Component Tokens
        </button>
      </div>

      {/* =================== FINDER TAB =================== */}
      {activeTab === "finder" && (
        <div className="token-picker__body">
          {/* Sidebar: breadcrumbs + current question */}
          <div className="token-picker__sidebar">
            {breadcrumbs.map((entry, i) => (
              <button
                key={i}
                className="token-picker__breadcrumb"
                onClick={() => handleBreadcrumbClick(entry)}
                title={`Go back to "${entry.label}"`}
              >
                <span className="token-picker__breadcrumb-label">
                  {entry.label}
                </span>
                <span className="token-picker__breadcrumb-value">
                  {entry.value}
                  <span className="token-picker__breadcrumb-arrow">›</span>
                </span>
              </button>
            ))}

            {!selectedResult && (
              <div className="token-picker__question">
                {currentStep.question}
              </div>
            )}
          </div>

          {/* Main panel: options or result */}
          <div className="token-picker__main">
            {selectedResult ? (
              /* ---------- RESULT ---------- */
              <div className="token-picker__result">
                <div className="token-picker__result-header">
                  <div className="token-picker__result-title">
                    <span className="token-picker__result-icon">🔗</span>
                    Your token is:
                  </div>
                  <button
                    className="token-picker__start-over"
                    onClick={handleStartOver}
                  >
                    Start again
                  </button>
                </div>

                <code
                  className={`token-picker__token-name${
                    copied ? " token-picker__token-name--copied" : ""
                  }`}
                  onClick={() => handleCopy(`var(${selectedResult.cssVar})`)}
                  title="Click to copy"
                >
                  {selectedResult.cssVar}
                </code>

                <TokenSwatches result={selectedResult} />

                <div className="token-picker__description">
                  <strong>Description</strong>
                  {selectedResult.description}
                </div>

                <div className="token-picker__value-ref">
                  <strong>Usage: </strong>
                  {selectedResult.value}
                </div>

                <div className="token-picker__value-ref">
                  <strong>Category: </strong>
                  {selectedResult.category}
                </div>

                {selectedResult.invertedCssVar && (
                  <div className="token-picker__value-ref">
                    <strong>Inverted variant: </strong>
                    {selectedResult.invertedCssVar}
                  </div>
                )}
              </div>
            ) : (
              /* ---------- OPTIONS ---------- */
              <>
                <div className="token-picker__options-label">
                  Select an answer
                </div>
                <div className="token-picker__options">
                  {currentStep.options.map((option, i) => (
                    <button
                      key={i}
                      className="token-picker__option"
                      onClick={() => handleOptionSelect(option)}
                    >
                      <span className="token-picker__option-title">
                        {option.label}
                      </span>
                      {option.description && (
                        <span className="token-picker__option-description">
                          {option.description}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ================ COMPONENT TOKENS TAB ================ */}
      {activeTab === "components" && (
        <div className="token-picker__body token-picker__body--stacked">
          {!selectedComponent ? (
            /* ---------- Component grid ---------- */
            <>
              <div className="token-picker__search">
                <input
                  className="token-picker__search-input"
                  type="text"
                  placeholder="Search components…"
                  value={componentSearch}
                  onChange={(e) => setComponentSearch(e.target.value)}
                />
              </div>
              <div className="token-picker__main">
                <div className="token-picker__component-grid">
                  {filteredComponents.map((comp) => (
                    <button
                      key={comp.slug}
                      className="token-picker__component-card"
                      onClick={() => handleComponentSelect(comp)}
                    >
                      <span className="token-picker__component-card-name">
                        {comp.name}
                      </span>
                      <span className="token-picker__component-card-meta">
                        {comp.tokenCount} tokens
                      </span>
                      <span className="token-picker__component-card-category">
                        {comp.category}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* ---------- Component detail ---------- */
            <>
              <div className="token-picker__search">
                <input
                  className="token-picker__search-input"
                  type="text"
                  placeholder={`Search ${selectedComponent.name} tokens…`}
                  value={componentTokenSearch}
                  onChange={(e) => setComponentTokenSearch(e.target.value)}
                />
              </div>
              <div className="token-picker__main">
                <div className="token-picker__component-detail">
                  <div className="token-picker__component-detail-header">
                    <div>
                      <div className="token-picker__component-detail-title">
                        {selectedComponent.name}
                      </div>
                      <div className="token-picker__component-detail-desc">
                        {selectedComponent.description}
                      </div>
                    </div>
                    <button
                      className="token-picker__component-back"
                      onClick={handleComponentBack}
                    >
                      ← All components
                    </button>
                  </div>

                  {componentTokens.length > 0 ? (
                    <table className="token-picker__token-table">
                      <thead>
                        <tr>
                          <th>Token</th>
                          <th>Property</th>
                          <th>Variant</th>
                          <th>State</th>
                          <th>Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredComponentTokens.map((token) => (
                          <tr key={token.name}>
                            <td
                              className="token-picker__token-cell--name"
                              onClick={() => handleCopy(`var(${token.name})`)}
                              title="Click to copy"
                            >
                              {token.name}
                            </td>
                            <td className="token-picker__token-cell--variant">
                              {token.cssProperty}
                            </td>
                            <td className="token-picker__token-cell--variant">
                              {token.variant ?? "—"}
                            </td>
                            <td>
                              {token.state ? (
                                <span
                                  className={`token-picker__state-badge token-picker__state-badge--${token.state}`}
                                >
                                  {token.state}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="token-picker__token-cell--value">
                              {token.value}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="token-picker__description">
                      <strong>Component tokens</strong>
                      This component has {selectedComponent.tokenCount} design
                      tokens defined in its SCSS token file (
                      <code>--dsa-{selectedComponent.slug}-*</code>). The tokens
                      control CSS properties like color, font, spacing,
                      border-radius, and more for each variant and state.
                      <br />
                      <br />
                      To view the full token list, check the{" "}
                      <strong>Component Tokens</strong> panel in the component's
                      Storybook story, or inspect the{" "}
                      <code>{selectedComponent.slug}-tokens.scss</code> file.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default TokenPicker;
