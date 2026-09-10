import { forwardRef, createContext, useContext, HTMLAttributes } from "react";
import { PostHead } from "@kickstartds/blog/lib/post-head";
import { BlogHeadProps } from "./BlogHeadProps";
import "./blog-head.scss";
import { deepMergeDefaults } from "../helpers";
import defaults from "./BlogHeadDefaults";

export type { BlogHeadProps };

export const BlogHeadContextDefault = forwardRef<
  HTMLDivElement,
  BlogHeadProps & HTMLAttributes<HTMLDivElement>
>(({ date, tags = [], headline, image, alt, ...rest }, ref) => {
  return (
    <PostHead
      {...rest}
      className="dsa-blog-head"
      date={date}
      headline={{ text: headline, level: "h1", align: "left" }}
      image={{ src: image, alt: alt || headline }}
      categories={tags.map((tag) => {
        return { label: tag.entry };
      })}
      ref={ref}
    />
  );
});

export const BlogHeadContext = createContext(BlogHeadContextDefault);
export const BlogHead = forwardRef<
  HTMLDivElement,
  BlogHeadProps & HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const Component = useContext(BlogHeadContext);
  return <Component {...deepMergeDefaults(defaults, props)} ref={ref} />;
});
BlogHead.displayName = "BlogHead";
