import type { DetailedHTMLProps, HTMLAttributes } from "react";

/**
 * `@github/relative-time-element` registers the `<relative-time>` custom
 * element at runtime but ships no JSX typings, so declare it here.
 */
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "relative-time": DetailedHTMLProps<
        HTMLAttributes<HTMLElement> & {
          datetime?: string;
          format?: "auto" | "relative" | "duration" | "datetime" | "elapsed" | "micro";
          threshold?: string;
          prefix?: string;
        },
        HTMLElement
      >;
    }
  }
}

export {};
