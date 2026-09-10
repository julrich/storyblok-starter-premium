import { Icon } from "@kickstartds/base/lib/icon";
import classnames from "classnames";
import React from "react";

interface PrompterSubmittedTextProps {
  text: string;
}

const PrompterSubmittedText: React.FC<PrompterSubmittedTextProps> = ({
  text,
}) => {
  return (
    <div className={classnames("prompter-submitted-text", {})}>
      <Icon icon="alert-triangle" />
      <span>{text}</span>
    </div>
  );
};

export default PrompterSubmittedText;
