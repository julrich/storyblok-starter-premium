import { HTMLAttributes, createContext, forwardRef, useContext } from "react";
import { TestimonialsProps } from "./TestimonialsProps";
import "./testimonials.scss";
import { Slider } from "../slider/SliderComponent";
import { SliderProps } from "../slider/SliderProps";
import { Testimonial } from "../testimonial/TestimonialComponent";
import { deepMergeDefaults } from "../helpers";
import defaults from "./TestimonialsDefaults";

export type { TestimonialsProps };

interface ConditionalSliderProps extends SliderProps {
  layout: "slider" | "list" | "alternating";
}

export const ConditionalSlider = forwardRef<
  HTMLDivElement,
  ConditionalSliderProps & HTMLAttributes<HTMLDivElement>
>(({ layout, children, arrows, nav, ...props }, ref) => {
  if (layout === "slider") {
    return (
      <Slider
        className="dsa-testimonials dsa-testimonials--slider"
        arrows={arrows}
        nav={nav}
        {...props}
        ref={ref}
      >
        {children}
      </Slider>
    );
  } else {
    return (
      <div
        className="dsa-testimonials dsa-testimonials--list"
        {...props}
        ref={ref}
      >
        {children}
      </div>
    );
  }
});

export const TestimonialsContextDefault = forwardRef<
  HTMLDivElement,
  TestimonialsProps & HTMLAttributes<HTMLDivElement>
>(
  (
    {
      testimonial: testimonials = [],
      layout = "slider",
      quoteSigns = "normal",
      ...props
    },
    ref
  ) => {
    return (
      <ConditionalSlider layout={layout} arrows nav {...props} ref={ref}>
        {testimonials.map((testimonial, index) => (
          <Testimonial
            {...testimonial}
            quoteSigns={quoteSigns}
            index={index}
            layout={layout}
            key={index}
          />
        ))}
      </ConditionalSlider>
    );
  }
);

export const TestimonialsContext = createContext(TestimonialsContextDefault);
export const Testimonials = forwardRef<
  HTMLDivElement,
  TestimonialsProps & HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const Component = useContext(TestimonialsContext);
  return <Component {...deepMergeDefaults(defaults, props)} ref={ref} />;
});
Testimonials.displayName = "Testimonials";
