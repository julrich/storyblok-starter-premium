import classnames from "classnames";
import React from "react";

interface PrompterSelectionDisplayProps {
  idea: string;
  text: string;
  children?: React.ReactNode;
}

const PrompterSelectionDisplay: React.FC<PrompterSelectionDisplayProps> = ({
  text,
  idea,
  children,
}) => {
  return (
    <div className={classnames("prompter-selection-display", {})}>
      <div className="prompter-selection-display__text">
        <div className="prompter-selection-display__topic">
          Selected idea:
          {text}
        </div>
        <div className="prompter-selection-display__idea">{idea}</div>
      </div>
      {children}
    </div>
  );
};

export default PrompterSelectionDisplay;
