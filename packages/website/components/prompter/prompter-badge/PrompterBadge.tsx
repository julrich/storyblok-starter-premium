import classnames from "classnames";
import React from "react";

interface PrompterBadgeProps {
  label: string;
  state: "saved" | "unsaved";
}

const PrompterBadge: React.FC<PrompterBadgeProps> = ({ state, label }) => {
  return (
    <span className={classnames("prompter-badge", `prompter-badge--${state}`)}>
      {label}
      {state === "unsaved" && " (unsaved)"}
    </span>
  );
};

export default PrompterBadge;
