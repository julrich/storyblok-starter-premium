/**
 * SEO is a data-only "component" — it defines the shape of page-level
 * SEO metadata (title, description, keywords, images) but has no visual
 * rendering.  This file exists solely so Rollup's entry-point glob
 * (`src/components/**\/*Component.tsx`) discovers the module and bundles
 * the generated types into `dist/components/seo/`.
 */
export type { SeoProps } from "./SeoProps";
