import classnames from "classnames";
import React, { useRef, useLayoutEffect, useState } from "react";

interface PrompterSectionProps {
  children: React.ReactNode;
  headline?: string;
  text?: string;
}

const PrompterSection: React.FC<PrompterSectionProps> = ({ children }) => {
  const [height, setHeight] = useState<number | undefined>(undefined);
  const innerRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (innerRef.current) {
      const newHeight = innerRef.current.offsetHeight;
      setHeight(newHeight);
    }
  }, [children]);

  return (
    <div
      className={classnames("prompter-section-input")}
      ref={outerRef}
      style={{
        height: height !== undefined ? height : "auto",
        transition: "height 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        overflow: "hidden",
      }}
    >
      <div ref={innerRef}>{children}</div>
    </div>
  );
};

export default PrompterSection;
