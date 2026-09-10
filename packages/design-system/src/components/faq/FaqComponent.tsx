import { ReactNode } from "react";
import { forwardRef, createContext, useContext, HTMLAttributes } from "react";
import { FaqProps as FaqSchemaProps, Question } from "./FaqProps";
import "./faq.scss";
import { CollapsibleBox } from "@kickstartds/base/lib/collapsible-box";
import { deepMergeDefaults } from "../helpers";
import defaults from "./FaqDefaults";

export type FaqProps = Omit<FaqSchemaProps, "questions"> &
  HTMLAttributes<HTMLDivElement> & {
    questions: ({ children?: ReactNode } & Question)[];
  };

export const FaqContextDefault = forwardRef<HTMLDivElement, FaqProps>(
  ({ questions, children, ...rest }, ref) => (
    <div {...rest} ref={ref} className={`dsa-faq`}>
      {questions.map((question, index) => (
        <CollapsibleBox
          key={index}
          summary={question.question}
          text={question.answer}
        >
          {question.children}
        </CollapsibleBox>
      ))}
    </div>
  )
);

export const FaqContext = createContext(FaqContextDefault);
export const Faq = forwardRef<
  HTMLDivElement,
  FaqProps & HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const Component = useContext(FaqContext);
  return <Component {...deepMergeDefaults(defaults, props)} ref={ref} />;
});
Faq.displayName = "Faq";
