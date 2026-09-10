declare module "@kickstartds/design-system/tokens/tokens.js" {
  export const KsBackgroundColorDefaultBase: string;
  export const KsBorderRadiusControl: string;
  export const KsColorFgAlpha3Base: string;
  export const KsColorFgToBg7Base: string;
  export const KsColorPrimaryBase: string;
  export const KsColorPrimaryToBg9Base: string;
  export const KsFontFamilyInterface: string;
  export const KsTextColorDefaultBase: string;
}
declare module "@kickstartds/design-system/tokens/tokensToCss.mjs";
declare module "@kickstartds/design-system/tokens/componentTokensToCss.mjs" {
  export function componentTokensToCss(
    componentTokens: Record<string, unknown>,
    catalog: Record<string, unknown>,
  ): string;
}
declare module "@kickstartds/design-system/tokens/component-token-catalog.json" {
  const catalog: Record<
    string,
    {
      displayName: string;
      selector: string;
      tokens: Record<
        string,
        {
          defaultValue: string;
          valueType: "literal" | "semantic-ref" | "component-ref";
          referencedToken: string | null;
        }
      >;
      responsiveTokens: Record<
        string,
        Record<
          string,
          {
            defaultValue: string;
            valueType: "literal" | "semantic-ref" | "component-ref";
            referencedToken: string | null;
          }
        >
      >;
    }
  >;
  export default catalog;
}
declare module "@kickstartds/design-system/tokens/semantic-token-catalog.json" {
  const catalog: Record<
    string,
    Record<
      string,
      {
        value: string;
        valueType:
          | "reference"
          | "color"
          | "dimension"
          | "percentage"
          | "number"
          | "duration"
          | "string";
      }
    >
  >;
  export default catalog;
}
declare module "@kickstartds/design-system/tokens/branding-tokens.schema.validate.mjs";
declare module "@kickstartds/design-system/playground/color-demo";
declare module "@kickstartds/design-system/playground/font-demo";
declare module "@kickstartds/design-system/playground/spacing-demo";
declare module "@kickstartds/design-system/playground/border-demo";
declare module "@kickstartds/design-system/playground/shadow-demo";
declare module "@kickstartds/design-system/playground/transition-demo";
declare module "@kickstartds/design-system/pages/landingpage";
declare module "@kickstartds/design-system/pages/about";
declare module "@kickstartds/design-system/pages/jobs";
declare module "@kickstartds/design-system/pages/jobs-detail";
declare module "@kickstartds/design-system/pages/overview";
