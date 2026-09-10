import { forwardRef, createContext, useContext, HTMLAttributes } from "react";
import { TestimonialProps } from "./TestimonialProps";
import { Quote } from "@kickstartds/content/lib/quote";
import classNames from "classnames";
import { deepMergeDefaults } from "../helpers";
import defaults from "./TestimonialDefaults";

export type { TestimonialProps };

export const TestimonialContextDefault = forwardRef<
  HTMLDivElement,
  { layout: string; index: number } & TestimonialProps &
    HTMLAttributes<HTMLDivElement>
>(
  (
    { image, quote, name, title, layout, index, rating, quoteSigns, ...rest },
    ref
  ) => (
    <Quote
      {...rest}
      ref={ref}
      className={classNames(
        layout === "alternating" && index % 2 === 1 ? "c-quote--reverse" : "",
        quoteSigns === "normal" || quoteSigns === "none"
          ? "c-quote--small-signs"
          : ""
      )}
      text={quoteSigns === "normal" ? `"${quote}"` : quote}
      source={name}
      byline={title}
      image={image && image.src}
      renderSource={() => (
        <>
          {rating ? (
            <div>
              {[...Array(rating)].map((_, index) => (
                <span key={index}>★</span>
              ))}
            </div>
          ) : (
            ""
          )}
          <div className="c-quote__source">{name}</div>
        </>
      )}
    />
  )
);

export const TestimonialContext = createContext(TestimonialContextDefault);
export const Testimonial = forwardRef<
  HTMLDivElement,
  { layout: string; index: number } & TestimonialProps
>((props, ref) => {
  const Component = useContext(TestimonialContext);
  return <Component {...deepMergeDefaults(defaults, props)} ref={ref} />;
});
Testimonial.displayName = "Testimonial";
