import classnames from "classnames";
import React from "react";

interface PrompterHeadlineProps {
  text: string;
}

const PrompterHeadline: React.FC<PrompterHeadlineProps> = ({ text }) => {
  return <h2 className={classnames("prompter-headline", {})}>{text}</h2>;
};

export default PrompterHeadline;
