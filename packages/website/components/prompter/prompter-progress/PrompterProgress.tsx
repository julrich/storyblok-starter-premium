import React from "react";

interface PrompterProgressProps {
  current: number;
  total: number;
  currentType?: string;
}

const PrompterProgress: React.FC<PrompterProgressProps> = ({
  current,
  total,
  currentType,
}) => {
  const pct = total > 0 ? Math.round(((current + 1) / total) * 100) : 0;

  return (
    <div className="prompter-progress">
      <div className="prompter-progress__bar-container">
        <div
          className="prompter-progress__bar-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="prompter-progress__text">
        Generating section {current + 1} of {total}
        {currentType && (
          <span className="prompter-progress__type"> — {currentType}</span>
        )}
      </div>
    </div>
  );
};

export default PrompterProgress;
