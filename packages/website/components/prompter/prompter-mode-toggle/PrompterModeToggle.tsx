import React from "react";

interface PrompterModeToggleProps {
  mode: "section" | "page";
  onModeChange: (mode: "section" | "page") => void;
  disabled?: boolean;
}

const PrompterModeToggle: React.FC<PrompterModeToggleProps> = ({
  mode,
  onModeChange,
  disabled = false,
}) => {
  return (
    <div className="prompter-mode-toggle">
      <button
        className={`prompter-mode-toggle__option${
          mode === "section" ? " prompter-mode-toggle__option--active" : ""
        }`}
        onClick={() => onModeChange("section")}
        disabled={disabled}
        type="button"
      >
        <span className="prompter-mode-toggle__icon">◧</span>
        <span className="prompter-mode-toggle__label">Section</span>
        <span className="prompter-mode-toggle__description">
          Add specific sections
        </span>
      </button>
      <button
        className={`prompter-mode-toggle__option${
          mode === "page" ? " prompter-mode-toggle__option--active" : ""
        }`}
        onClick={() => onModeChange("page")}
        disabled={disabled}
        type="button"
      >
        <span className="prompter-mode-toggle__icon">▦</span>
        <span className="prompter-mode-toggle__label">Page</span>
        <span className="prompter-mode-toggle__description">
          AI plans the full page
        </span>
      </button>
    </div>
  );
};

export default PrompterModeToggle;
