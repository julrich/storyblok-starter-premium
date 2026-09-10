import { Icon } from "@kickstartds/base/lib/icon";
import React from "react";

interface PrompterWarningsProps {
  warnings: string[];
}

const PrompterWarnings: React.FC<PrompterWarningsProps> = ({ warnings }) => {
  if (warnings.length === 0) return null;

  return (
    <div className="prompter-warnings">
      <div className="prompter-warnings__header">
        <Icon icon="alert-triangle" />
        <strong>Quality warnings</strong>
      </div>
      <ul className="prompter-warnings__list">
        {warnings.map((warning, index) => (
          <li key={index} className="prompter-warnings__item">
            {warning}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PrompterWarnings;
