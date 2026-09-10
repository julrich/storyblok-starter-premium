import classnames from "classnames";
import React from "react";
import PrompterHeadline from "../prompter-headline/PrompterHeadline";
interface PrompterSectionProps {
  children: React.ReactNode;
  headline?: string;
  text?: string;
}

const PrompterSection: React.FC<PrompterSectionProps> = ({
  children,
  headline,
  text,
}) => {
  return (
    <div className={classnames("prompter-section")}>
      <div className="prompter-section__content">
        <div className="prompter-section__text">
          {headline && <PrompterHeadline text={headline} />}
          {text && (
            <span className="prompter-section__description">{text}</span>
          )}
        </div>
        <div className="prompter-section__children">{children}</div>
      </div>
    </div>
  );
};

export default PrompterSection;
