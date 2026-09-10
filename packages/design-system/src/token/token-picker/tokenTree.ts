/**
 * Decision tree data for the Token Picker.
 *
 * Maps the kickstartDS token architecture into a wizard-style navigation:
 *   Branding → Color → Semantic (text / background / border) → Context → State
 *
 * Each node can be a "step" (question + options) or a "result" (final token).
 */

// ------------------------------------------------------------------ types

export interface TokenResult {
  /** CSS custom property name */
  cssVar: string;
  /** Human-readable token path, e.g. "text-color · primary" */
  path: string;
  /** Short usage description */
  description: string;
  /** The raw value expression (var reference or literal) */
  value: string;
  /** Category badge (text-color, background-color, …) */
  category: string;
  /** Whether this is a color token (shows swatches) */
  isColor?: boolean;
  /** Inverted token counterpart, if any */
  invertedCssVar?: string;
}

export interface StepOption {
  label: string;
  description?: string;
  /** If set, selecting this option leads to another step */
  next?: Step;
  /** If set, selecting this option shows the token result */
  result?: TokenResult;
}

export interface Step {
  /** Breadcrumb label shown once selected */
  label: string;
  /** Current question text */
  question: string;
  /** Available answers */
  options: StepOption[];
}

// ------------------------------------------------------------------ helpers

function interactiveStates(
  baseToken: string,
  basePath: string,
  category: string,
  description: string,
  invertedBase?: string
): Step {
  return {
    label: "State",
    question: "Do you need an interactive state?",
    options: [
      {
        label: "Default (no interaction)",
        description: "Resting, non-interactive appearance",
        result: {
          cssVar: baseToken,
          path: basePath,
          description: `${description} — default state.`,
          value: `var(${baseToken})`,
          category,
          isColor: true,
          invertedCssVar: invertedBase,
        },
      },
      {
        label: "Hover",
        description: "When the user hovers over the element",
        result: {
          cssVar: `${baseToken}-interactive-hover`,
          path: `${basePath} · hover`,
          description: `${description} — on hover.`,
          value: `var(${baseToken}-interactive-hover)`,
          category,
          isColor: true,
        },
      },
      {
        label: "Active",
        description: "While the element is being pressed",
        result: {
          cssVar: `${baseToken}-interactive-active`,
          path: `${basePath} · active`,
          description: `${description} — while pressed / active.`,
          value: `var(${baseToken}-interactive-active)`,
          category,
          isColor: true,
        },
      },
      {
        label: "Selected",
        description: "When the element is in a selected / checked state",
        result: {
          cssVar: `${baseToken}-interactive-selected`,
          path: `${basePath} · selected`,
          description: `${description} — selected state.`,
          value: `var(${baseToken}-interactive-selected)`,
          category,
          isColor: true,
        },
      },
      {
        label: "Interactive (base)",
        description: "Base interactive color used for clickable elements",
        result: {
          cssVar: `${baseToken}-interactive`,
          path: `${basePath} · interactive`,
          description: `${description} — base interactive appearance.`,
          value: `var(${baseToken}-interactive)`,
          category,
          isColor: true,
        },
      },
    ],
  };
}

// -------------------------------------------------------- text-color branch

const textColorSemantic: Step = {
  label: "Meaning",
  question: "What is the semantic meaning of the colored text?",
  options: [
    {
      label: "Brand / Primary",
      description: "Reinforces your brand identity",
      result: {
        cssVar: "--ks-text-color-primary",
        path: "text-color · primary",
        description: "Use for text that reinforces your brand.",
        value: "var(--ks-text-color-primary)",
        category: "text-color",
        isColor: true,
        invertedCssVar: "--ks-text-color-primary-inverted",
      },
    },
    {
      label: "Informative",
      description: "Communicates information or in-progress status",
      result: {
        cssVar: "--ks-text-color-informative",
        path: "text-color · informative",
        description: "Use for informative or in-progress text.",
        value: "var(--ks-text-color-informative)",
        category: "text-color",
        isColor: true,
        invertedCssVar: "--ks-text-color-informative-inverted",
      },
    },
    {
      label: "Success / Positive",
      description: "Communicates a favorable outcome",
      result: {
        cssVar: "--ks-text-color-positive",
        path: "text-color · positive",
        description: "Use for success or positive-outcome text.",
        value: "var(--ks-text-color-positive)",
        category: "text-color",
        isColor: true,
        invertedCssVar: "--ks-text-color-positive-inverted",
      },
    },
    {
      label: "Warning / Notice",
      description: "Emphasizes caution or attention needed",
      result: {
        cssVar: "--ks-text-color-notice",
        path: "text-color · notice",
        description: "Use for warning or caution text.",
        value: "var(--ks-text-color-notice)",
        category: "text-color",
        isColor: true,
        invertedCssVar: "--ks-text-color-notice-inverted",
      },
    },
    {
      label: "Danger / Negative",
      description: "Critical text, such as error messages",
      result: {
        cssVar: "--ks-text-color-negative",
        path: "text-color · negative",
        description:
          "Use for error or critical text, e.g. validation messages.",
        value: "var(--ks-text-color-negative)",
        category: "text-color",
        isColor: true,
        invertedCssVar: "--ks-text-color-negative-inverted",
      },
    },
  ],
};

const textColorStep: Step = {
  label: "Text type",
  question: "What kind of text?",
  options: [
    {
      label: "Default text",
      description: "General UI text and labels",
      next: interactiveStates(
        "--ks-text-color-default",
        "text-color · default",
        "text-color",
        "General default text color",
        "--ks-text-color-default-inverted"
      ),
    },
    {
      label: "Body copy",
      description: "Paragraphs and running text content",
      next: interactiveStates(
        "--ks-text-color-copy",
        "text-color · copy",
        "text-color",
        "Body copy / paragraph text",
        "--ks-text-color-copy-inverted"
      ),
    },
    {
      label: "Headlines / Display",
      description: "Headings, titles, and display text",
      next: interactiveStates(
        "--ks-text-color-display",
        "text-color · display",
        "text-color",
        "Headline / display text",
        "--ks-text-color-display-inverted"
      ),
    },
    {
      label: "Card text",
      description: "Text inside card components",
      next: interactiveStates(
        "--ks-text-color-card",
        "text-color · card",
        "text-color",
        "Text shown on card surfaces",
        "--ks-text-color-card-inverted"
      ),
    },
    {
      label: "Interface / Controls",
      description: "Labels in buttons, inputs, and UI controls",
      next: interactiveStates(
        "--ks-text-color-interface",
        "text-color · interface",
        "text-color",
        "Text in UI controls (buttons, inputs)",
        "--ks-text-color-interface-inverted"
      ),
    },
    {
      label: "Text on primary background",
      description: "Text used on top of the primary brand color",
      result: {
        cssVar: "--ks-text-color-on-primary",
        path: "text-color · on-primary",
        description:
          "Use for text placed on a primary-colored background. Ensures contrast.",
        value: "var(--ks-text-color-on-primary)",
        category: "text-color",
        isColor: true,
        invertedCssVar: "--ks-text-color-on-primary-inverted",
      },
    },
    {
      label: "Colored / Semantic text",
      description: "Text with semantic meaning (brand, success, error, …)",
      next: textColorSemantic,
    },
  ],
};

// ----------------------------------------------------- background-color branch

const bgSemanticStep: Step = {
  label: "Meaning",
  question: "What is the semantic meaning?",
  options: [
    {
      label: "Primary / Brand",
      description: "Primary brand color background",
      next: interactiveStates(
        "--ks-background-color-primary",
        "background-color · primary",
        "background-color",
        "Primary brand background"
      ),
    },
    {
      label: "Informative",
      description: "Informational context",
      next: interactiveStates(
        "--ks-background-color-informative",
        "background-color · informative",
        "background-color",
        "Informative background"
      ),
    },
    {
      label: "Success / Positive",
      description: "Favorable outcome",
      next: interactiveStates(
        "--ks-background-color-positive",
        "background-color · positive",
        "background-color",
        "Positive / success background"
      ),
    },
    {
      label: "Warning / Notice",
      description: "Caution indicator",
      next: interactiveStates(
        "--ks-background-color-notice",
        "background-color · notice",
        "background-color",
        "Notice / warning background"
      ),
    },
    {
      label: "Danger / Negative",
      description: "Error or critical context",
      next: interactiveStates(
        "--ks-background-color-negative",
        "background-color · negative",
        "background-color",
        "Negative / danger background"
      ),
    },
  ],
};

const backgroundColorStep: Step = {
  label: "Surface type",
  question: "What kind of background or surface?",
  options: [
    {
      label: "Page background",
      description: "Default page / content area background",
      result: {
        cssVar: "--ks-background-color-default",
        path: "background-color · default",
        description: "The default page background color.",
        value: "var(--ks-background-color-default)",
        category: "background-color",
        isColor: true,
        invertedCssVar: "--ks-background-color-default-inverted",
      },
    },
    {
      label: "Bold / Emphasis",
      description: "Strong emphasis surface with high contrast",
      result: {
        cssVar: "--ks-background-color-bold",
        path: "background-color · bold",
        description:
          "A bold, high-emphasis background for sections that need to stand out.",
        value: "var(--ks-background-color-bold)",
        category: "background-color",
        isColor: true,
        invertedCssVar: "--ks-background-color-bold-inverted",
      },
    },
    {
      label: "Accent",
      description: "Subtle accent surface for visual separation",
      result: {
        cssVar: "--ks-background-color-accent",
        path: "background-color · accent",
        description:
          "A subtle accent background to differentiate sections or areas.",
        value: "var(--ks-background-color-accent)",
        category: "background-color",
        isColor: true,
        invertedCssVar: "--ks-background-color-accent-inverted",
      },
    },
    {
      label: "Card surface",
      description: "Card or elevated surface background",
      next: interactiveStates(
        "--ks-background-color-card",
        "background-color · card",
        "background-color",
        "Card surface background",
        "--ks-background-color-card-inverted"
      ),
    },
    {
      label: "Interface / Controls",
      description: "Background for buttons, inputs, and form controls",
      next: interactiveStates(
        "--ks-background-color-interface",
        "background-color · interface",
        "background-color",
        "Interface / control background",
        "--ks-background-color-interface-inverted"
      ),
    },
    {
      label: "Clear / Transparent",
      description: "Transparent background (with optional interactive states)",
      next: interactiveStates(
        "--ks-background-color-clear",
        "background-color · clear",
        "background-color",
        "Transparent / clear background",
        "--ks-background-color-clear-inverted"
      ),
    },
    {
      label: "Semantic (colored)",
      description: "Background with semantic meaning (success, error, …)",
      next: bgSemanticStep,
    },
  ],
};

// --------------------------------------------------------- border-color branch

const borderSemanticStep: Step = {
  label: "Meaning",
  question: "What is the semantic meaning?",
  options: [
    {
      label: "Primary / Brand",
      next: interactiveStates(
        "--ks-border-color-primary",
        "border-color · primary",
        "border-color",
        "Primary brand border"
      ),
    },
    {
      label: "Informative",
      next: interactiveStates(
        "--ks-border-color-informative",
        "border-color · informative",
        "border-color",
        "Informative border"
      ),
    },
    {
      label: "Success / Positive",
      next: interactiveStates(
        "--ks-border-color-positive",
        "border-color · positive",
        "border-color",
        "Positive / success border"
      ),
    },
    {
      label: "Warning / Notice",
      next: interactiveStates(
        "--ks-border-color-notice",
        "border-color · notice",
        "border-color",
        "Notice / warning border"
      ),
    },
    {
      label: "Danger / Negative",
      next: interactiveStates(
        "--ks-border-color-negative",
        "border-color · negative",
        "border-color",
        "Negative / danger border"
      ),
    },
  ],
};

const borderColorStep: Step = {
  label: "Border type",
  question: "What kind of border?",
  options: [
    {
      label: "Default border",
      description: "General-purpose default border",
      result: {
        cssVar: "--ks-border-color-default",
        path: "border-color · default",
        description: "The default border color for general elements.",
        value: "var(--ks-border-color-default)",
        category: "border-color",
        isColor: true,
        invertedCssVar: "--ks-border-color-default-inverted",
      },
    },
    {
      label: "Accent border",
      description: "Emphasized or accented border",
      result: {
        cssVar: "--ks-border-color-accent",
        path: "border-color · accent",
        description: "An accent border for visual emphasis.",
        value: "var(--ks-border-color-accent)",
        category: "border-color",
        isColor: true,
        invertedCssVar: "--ks-border-color-accent-inverted",
      },
    },
    {
      label: "Card border",
      description: "Border for card components",
      next: interactiveStates(
        "--ks-border-color-card",
        "border-color · card",
        "border-color",
        "Card border",
        "--ks-border-color-card-inverted"
      ),
    },
    {
      label: "Interface / Controls",
      description: "Borders for buttons, inputs, and form controls",
      next: interactiveStates(
        "--ks-border-color-interface",
        "border-color · interface",
        "border-color",
        "Interface / control border",
        "--ks-border-color-interface-inverted"
      ),
    },
    {
      label: "Clear (transparent)",
      description: "Invisible border with optional interactive states",
      next: interactiveStates(
        "--ks-border-color-clear",
        "border-color · clear",
        "border-color",
        "Transparent border",
        "--ks-border-color-clear-inverted"
      ),
    },
    {
      label: "Semantic (colored)",
      description: "Border with semantic meaning",
      next: borderSemanticStep,
    },
  ],
};

// ------------------------------------------------------------ shadow branch

const shadowStep: Step = {
  label: "Shadow type",
  question: "What kind of elevation / shadow?",
  options: [
    {
      label: "Card shadow",
      description: "Shadow for card-level elevation",
      result: {
        cssVar: "--ks-box-shadow-card",
        path: "box-shadow · card",
        description: "Default elevation shadow for card components.",
        value: "var(--ks-box-shadow-card)",
        category: "box-shadow",
      },
    },
    {
      label: "Card shadow (hover)",
      description: "Elevated shadow on hover",
      result: {
        cssVar: "--ks-box-shadow-card-hover",
        path: "box-shadow · card · hover",
        description: "Elevated card shadow on hover interaction.",
        value: "var(--ks-box-shadow-card-hover)",
        category: "box-shadow",
      },
    },
    {
      label: "Control shadow",
      description: "Shadow for form controls (inputs, selects)",
      result: {
        cssVar: "--ks-box-shadow-control",
        path: "box-shadow · control",
        description: "Shadow for form control elements.",
        value: "var(--ks-box-shadow-control)",
        category: "box-shadow",
      },
    },
    {
      label: "Control shadow (hover)",
      description: "Elevated control shadow on hover",
      result: {
        cssVar: "--ks-box-shadow-control-hover",
        path: "box-shadow · control · hover",
        description: "Elevated control shadow on hover.",
        value: "var(--ks-box-shadow-control-hover)",
        category: "box-shadow",
      },
    },
    {
      label: "Surface shadow",
      description: "Shadow for floating surfaces (modals, popovers)",
      result: {
        cssVar: "--ks-box-shadow-surface",
        path: "box-shadow · surface",
        description: "Shadow for floating surfaces like dialogs or popovers.",
        value: "var(--ks-box-shadow-surface)",
        category: "box-shadow",
      },
    },
    {
      label: "Surface shadow (hover)",
      description: "Elevated surface shadow on hover",
      result: {
        cssVar: "--ks-box-shadow-surface-hover",
        path: "box-shadow · surface · hover",
        description: "Elevated surface shadow on hover.",
        value: "var(--ks-box-shadow-surface-hover)",
        category: "box-shadow",
      },
    },
  ],
};

// --------------------------------------------------------- typography branch

const fontFamilyStep: Step = {
  label: "Font category",
  question: "Which font category?",
  options: [
    {
      label: "Display",
      description: "Headlines, hero text, and prominent display typography",
      result: {
        cssVar: "--ks-font-family-display",
        path: "font-family · display",
        description: "Font family for display / headline text.",
        value: "var(--ks-font-family-display)",
        category: "font",
      },
    },
    {
      label: "Copy",
      description: "Body text, paragraphs, and running content",
      result: {
        cssVar: "--ks-font-family-copy",
        path: "font-family · copy",
        description: "Font family for body copy / paragraph text.",
        value: "var(--ks-font-family-copy)",
        category: "font",
      },
    },
    {
      label: "Interface",
      description: "UI controls, buttons, labels, and navigation",
      result: {
        cssVar: "--ks-font-family-interface",
        path: "font-family · interface",
        description: "Font family for interface / UI control text.",
        value: "var(--ks-font-family-interface)",
        category: "font",
      },
    },
    {
      label: "Mono",
      description: "Code snippets, technical values, and monospace text",
      result: {
        cssVar: "--ks-font-family-mono",
        path: "font-family · mono",
        description: "Monospace font family for code and technical content.",
        value: "var(--ks-font-family-mono)",
        category: "font",
      },
    },
  ],
};

const sizes = ["xxs", "xs", "s", "m", "l", "xl", "xxl"] as const;

function fontShorthandStep(category: string, desc: string): Step {
  return {
    label: "Size",
    question: "What size?",
    options: sizes.map((size) => ({
      label: size.toUpperCase(),
      description: `${desc} at ${size} scale`,
      result: {
        cssVar: `--ks-font-${category}-${size}`,
        path: `font · ${category} · ${size}`,
        description: `Complete font shorthand (size/line-height family) for ${desc} at ${size} scale.`,
        value: `var(--ks-font-${category}-${size})`,
        category: "font",
      },
    })),
  };
}

const fontShorthandCategory: Step = {
  label: "Font category",
  question: "Which font category?",
  options: [
    {
      label: "Display",
      description: "Headlines and display text",
      next: fontShorthandStep("display", "display"),
    },
    {
      label: "Copy",
      description: "Body / paragraph text",
      next: fontShorthandStep("copy", "copy"),
    },
    {
      label: "Interface",
      description: "UI controls and labels",
      next: fontShorthandStep("interface", "interface"),
    },
    {
      label: "Mono",
      description: "Monospace / code text",
      next: fontShorthandStep("mono", "mono"),
    },
  ],
};

const fontWeightStep: Step = {
  label: "Weight",
  question: "Which font weight?",
  options: [
    {
      label: "Light (300)",
      result: {
        cssVar: "--ks-font-weight-light",
        path: "font-weight · light",
        description: "Light font weight (300).",
        value: "var(--ks-font-weight-light)",
        category: "font",
      },
    },
    {
      label: "Regular (400)",
      result: {
        cssVar: "--ks-font-weight-regular",
        path: "font-weight · regular",
        description: "Regular font weight (400).",
        value: "var(--ks-font-weight-regular)",
        category: "font",
      },
    },
    {
      label: "Medium (500)",
      result: {
        cssVar: "--ks-font-weight-medium",
        path: "font-weight · medium",
        description: "Medium font weight (500).",
        value: "var(--ks-font-weight-medium)",
        category: "font",
      },
    },
    {
      label: "Semi-bold (600)",
      result: {
        cssVar: "--ks-font-weight-semi-bold",
        path: "font-weight · semi-bold",
        description: "Semi-bold font weight (600).",
        value: "var(--ks-font-weight-semi-bold)",
        category: "font",
      },
    },
    {
      label: "Bold (700)",
      result: {
        cssVar: "--ks-font-weight-bold",
        path: "font-weight · bold",
        description: "Bold font weight (700).",
        value: "var(--ks-font-weight-bold)",
        category: "font",
      },
    },
  ],
};

const typographyStep: Step = {
  label: "Typography aspect",
  question: "What typography aspect are you looking for?",
  options: [
    {
      label: "Font shorthand",
      description:
        "Complete font value (size / line-height family) — most commonly used",
      next: fontShorthandCategory,
    },
    {
      label: "Font family",
      description: "Just the font family (display, copy, interface, mono)",
      next: fontFamilyStep,
    },
    {
      label: "Font weight",
      description: "Font weight values (light → bold)",
      next: fontWeightStep,
    },
  ],
};

// ----------------------------------------------------------- spacing branch

function spacingSizeStep(prefix: string, category: string, desc: string): Step {
  return {
    label: "Size",
    question: "What size?",
    options: sizes.map((size) => ({
      label: size.toUpperCase(),
      result: {
        cssVar: `--ks-spacing-${prefix}-${size}`,
        path: `spacing · ${category} · ${size}`,
        description: `${desc} at ${size} scale.`,
        value: `var(--ks-spacing-${prefix}-${size})`,
        category: "spacing",
      },
    })),
  };
}

const spacingStep: Step = {
  label: "Spacing type",
  question: "What type of spacing?",
  options: [
    {
      label: "Stack (vertical margin)",
      description: "Vertical spacing between stacked elements",
      next: spacingSizeStep("stack", "stack", "Vertical stack spacing"),
    },
    {
      label: "Inline (horizontal)",
      description: "Horizontal spacing between inline elements",
      next: spacingSizeStep("inline", "inline", "Horizontal inline spacing"),
    },
    {
      label: "Inset (even padding)",
      description: "Equal padding on all sides",
      next: spacingSizeStep("inset", "inset", "Even inset padding"),
    },
    {
      label: "Inset squish (horiz. emphasis)",
      description:
        "Padding with more horizontal than vertical space (e.g. buttons)",
      next: spacingSizeStep(
        "inset-squish",
        "inset-squish",
        "Squished inset padding (wider than tall)"
      ),
    },
    {
      label: "Inset stretch (vert. emphasis)",
      description: "Padding with more vertical than horizontal space",
      next: spacingSizeStep(
        "inset-stretch",
        "inset-stretch",
        "Stretched inset padding (taller than wide)"
      ),
    },
    {
      label: "Raw spacing scale",
      description: "Base spacing values (xxs → xxl) for custom use",
      next: {
        label: "Size",
        question: "What size?",
        options: sizes.map((size) => ({
          label: size.toUpperCase(),
          result: {
            cssVar: `--ks-spacing-${size}`,
            path: `spacing · ${size}`,
            description: `Base spacing value at ${size} scale.`,
            value: `var(--ks-spacing-${size})`,
            category: "spacing",
          },
        })),
      },
    },
  ],
};

// ----------------------------------------------------------- border branch

const borderStep: Step = {
  label: "Border aspect",
  question: "What border property are you looking for?",
  options: [
    {
      label: "Border color",
      description: "Just the border color value",
      next: borderColorStep,
    },
    {
      label: "Border shorthand",
      description: "Complete border (width + style + color)",
      next: {
        label: "Border type",
        question: "Which border shorthand?",
        options: [
          {
            label: "Card border",
            result: {
              cssVar: "--ks-border-card",
              path: "border · card",
              description: "Complete border shorthand for card elements.",
              value: "var(--ks-border-card)",
              category: "border",
            },
          },
          {
            label: "Card border (interactive)",
            result: {
              cssVar: "--ks-border-card-interactive",
              path: "border · card · interactive",
              description: "Interactive card border shorthand.",
              value: "var(--ks-border-card-interactive)",
              category: "border",
            },
          },
          {
            label: "Control border",
            result: {
              cssVar: "--ks-border-control",
              path: "border · control",
              description: "Border for form controls (inputs, selects).",
              value: "var(--ks-border-control)",
              category: "border",
            },
          },
          {
            label: "Divider",
            result: {
              cssVar: "--ks-border-divider",
              path: "border · divider",
              description: "Border used as a visual divider / separator.",
              value: "var(--ks-border-divider)",
              category: "border",
            },
          },
          {
            label: "Surface border",
            result: {
              cssVar: "--ks-border-surface",
              path: "border · surface",
              description: "Border for elevated surface containers.",
              value: "var(--ks-border-surface)",
              category: "border",
            },
          },
        ],
      },
    },
    {
      label: "Border radius",
      description: "Corner rounding values",
      next: {
        label: "Radius type",
        question: "Which border radius?",
        options: [
          {
            label: "Control",
            description: "For buttons, inputs, and small UI controls",
            result: {
              cssVar: "--ks-border-radius-control",
              path: "border-radius · control",
              description: "Border radius for form controls and buttons.",
              value: "var(--ks-border-radius-control)",
              category: "border",
            },
          },
          {
            label: "Card",
            description: "For card-level containers",
            result: {
              cssVar: "--ks-border-radius-card",
              path: "border-radius · card",
              description: "Border radius for card components.",
              value: "var(--ks-border-radius-card)",
              category: "border",
            },
          },
          {
            label: "Surface",
            description: "For large surface containers (sections, modals)",
            result: {
              cssVar: "--ks-border-radius-surface",
              path: "border-radius · surface",
              description: "Border radius for surface-level containers.",
              value: "var(--ks-border-radius-surface)",
              category: "border",
            },
          },
          {
            label: "Circle",
            description: "Fully rounded (50%)",
            result: {
              cssVar: "--ks-border-radius-circle",
              path: "border-radius · circle",
              description: "Circle border radius (50%).",
              value: "var(--ks-border-radius-circle)",
              category: "border",
            },
          },
          {
            label: "Pill",
            description: "Pill shape (999px)",
            result: {
              cssVar: "--ks-border-radius-pill",
              path: "border-radius · pill",
              description: "Pill-shaped border radius (999px).",
              value: "var(--ks-border-radius-pill)",
              category: "border",
            },
          },
        ],
      },
    },
    {
      label: "Border width",
      description: "Border width / thickness",
      next: {
        label: "Width type",
        question: "Which border width?",
        options: [
          {
            label: "Default",
            result: {
              cssVar: "--ks-border-width-default",
              path: "border-width · default",
              description: "Default border width.",
              value: "var(--ks-border-width-default)",
              category: "border",
            },
          },
          {
            label: "Emphasized",
            result: {
              cssVar: "--ks-border-width-emphasized",
              path: "border-width · emphasized",
              description: "Emphasized / thicker border width.",
              value: "var(--ks-border-width-emphasized)",
              category: "border",
            },
          },
        ],
      },
    },
  ],
};

// ========================================================== ROOT STEP

export const rootStep: Step = {
  label: "Property",
  question: "What are you looking for?",
  options: [
    {
      label: "Text color",
      description: "Color for text, labels, and headings",
      next: textColorStep,
    },
    {
      label: "Background / Surface",
      description: "Background color for pages, cards, and controls",
      next: backgroundColorStep,
    },
    {
      label: "Border",
      description: "Border colors, widths, radii, and shorthands",
      next: borderStep,
    },
    {
      label: "Shadow / Elevation",
      description: "Box shadows for cards, controls, and surfaces",
      next: shadowStep,
    },
    {
      label: "Typography",
      description: "Font families, sizes, weights, and shorthands",
      next: typographyStep,
    },
    {
      label: "Spacing",
      description: "Margins, padding, and gaps",
      next: spacingStep,
    },
  ],
};

// ========================================================= COMPONENT DATA

export interface ComponentInfo {
  name: string;
  slug: string;
  category: string;
  description: string;
  tokenCount: number;
}

export const componentList: ComponentInfo[] = [
  {
    name: "Blog Aside",
    slug: "blog-aside",
    category: "blog",
    description: "Blog sidebar with author info, metadata, and share bar",
    tokenCount: 14,
  },
  {
    name: "Blog Head",
    slug: "blog-head",
    category: "blog",
    description: "Blog article header with date, headline, and spacing",
    tokenCount: 7,
  },
  {
    name: "Blog Teaser",
    slug: "blog-teaser",
    category: "blog",
    description:
      "Blog teaser card with image, topic, copy, and author metadata",
    tokenCount: 17,
  },
  {
    name: "Breadcrumb",
    slug: "breadcrumb",
    category: "navigation",
    description: "Breadcrumb navigation with icon separators",
    tokenCount: 7,
  },
  {
    name: "Business Card",
    slug: "business-card",
    category: "cards",
    description: "Business card with image, contact info, avatar, and links",
    tokenCount: 24,
  },
  {
    name: "Button",
    slug: "button",
    category: "forms",
    description: "Button with primary/secondary/tertiary variants and sizes",
    tokenCount: 28,
  },
  {
    name: "Checkbox",
    slug: "checkbox",
    category: "forms",
    description: "Checkbox input with checked/hover/focus states",
    tokenCount: 16,
  },
  {
    name: "Checkbox Group",
    slug: "checkbox-group",
    category: "forms",
    description: "Checkbox group container with label styling",
    tokenCount: 4,
  },
  {
    name: "Contact",
    slug: "contact",
    category: "cards",
    description: "Contact card with image, title, copy, and linked items",
    tokenCount: 26,
  },
  {
    name: "Content Nav",
    slug: "content-nav",
    category: "navigation",
    description: "Content navigation panel with links and toggle",
    tokenCount: 18,
  },
  {
    name: "Cookie Consent",
    slug: "cookie-consent",
    category: "utility",
    description: "Cookie consent banner/dialog with options and toggles",
    tokenCount: 50,
  },
  {
    name: "CTA",
    slug: "cta",
    category: "heroes",
    description: "Call-to-action section with headline, copy, and image",
    tokenCount: 15,
  },
  {
    name: "Divider",
    slug: "divider",
    category: "utility",
    description: "Visual divider/separator with accent variant",
    tokenCount: 3,
  },
  {
    name: "Downloads",
    slug: "downloads",
    category: "data-display",
    description: "Downloads list with file items, icons, and hover states",
    tokenCount: 30,
  },
  {
    name: "FAQ",
    slug: "faq",
    category: "data-display",
    description: "FAQ accordion with summary/answer styling",
    tokenCount: 10,
  },
  {
    name: "Features",
    slug: "features",
    category: "data-display",
    description: "Features list with icons, titles, copy, and links",
    tokenCount: 23,
  },
  {
    name: "Footer",
    slug: "footer",
    category: "utility",
    description: "Page footer with logo, byline, and navigation links",
    tokenCount: 14,
  },
  {
    name: "Gallery",
    slug: "gallery",
    category: "layout",
    description: "Image gallery with configurable tile sizes",
    tokenCount: 7,
  },
  {
    name: "Header",
    slug: "header",
    category: "navigation",
    description: "Page header with logo and responsive spacing",
    tokenCount: 10,
  },
  {
    name: "Headline",
    slug: "headline",
    category: "content",
    description: "Headline with h1–h4 levels, subheadline, and highlight",
    tokenCount: 38,
  },
  {
    name: "Hero",
    slug: "hero",
    category: "heroes",
    description: "Hero banner with textbox, overlay, and responsive min-height",
    tokenCount: 24,
  },
  {
    name: "HTML",
    slug: "html",
    category: "utility",
    description: "HTML embed container with consent overlay",
    tokenCount: 4,
  },
  {
    name: "Image Story",
    slug: "image-story",
    category: "content",
    description: "Image-story layout with copy and spacing",
    tokenCount: 5,
  },
  {
    name: "Image Text",
    slug: "image-text",
    category: "content",
    description: "Image-text block with highlight variant",
    tokenCount: 4,
  },
  {
    name: "Lightbox",
    slug: "lightbox",
    category: "utility",
    description: "Lightbox overlay with counter and navigation",
    tokenCount: 7,
  },
  {
    name: "Logos",
    slug: "logos",
    category: "data-display",
    description: "Logo grid with tagline and responsive columns",
    tokenCount: 8,
  },
  {
    name: "Mosaic",
    slug: "mosaic",
    category: "layout",
    description: "Mosaic layout with headline and content",
    tokenCount: 7,
  },
  {
    name: "Nav Flyout",
    slug: "nav-flyout",
    category: "navigation",
    description: "Flyout navigation menu with sublist and transitions",
    tokenCount: 26,
  },
  {
    name: "Nav Toggle",
    slug: "nav-toggle",
    category: "navigation",
    description: "Navigation hamburger toggle",
    tokenCount: 7,
  },
  {
    name: "Nav Topbar",
    slug: "nav-topbar",
    category: "navigation",
    description: "Top navigation bar with labels and icons",
    tokenCount: 21,
  },
  {
    name: "Pagination",
    slug: "pagination",
    category: "navigation",
    description: "Pagination controls with active state",
    tokenCount: 15,
  },
  {
    name: "Radio",
    slug: "radio",
    category: "forms",
    description: "Radio button with checked/hover/focus states",
    tokenCount: 16,
  },
  {
    name: "Radio Group",
    slug: "radio-group",
    category: "forms",
    description: "Radio button group container",
    tokenCount: 4,
  },
  {
    name: "Rich Text",
    slug: "rich-text",
    category: "content",
    description: "Rich text block with headline and body styling",
    tokenCount: 6,
  },
  {
    name: "Section",
    slug: "section",
    category: "layout",
    description: "Section layout with columns, gutters, and backgrounds",
    tokenCount: 35,
  },
  {
    name: "Select Field",
    slug: "select-field",
    category: "forms",
    description: "Select dropdown with border states and label",
    tokenCount: 18,
  },
  {
    name: "Slider",
    slug: "slider",
    category: "utility",
    description: "Content slider with arrow and bullet navigation",
    tokenCount: 13,
  },
  {
    name: "Split Even",
    slug: "split-even",
    category: "layout",
    description: "Even-split layout with configurable gutters",
    tokenCount: 13,
  },
  {
    name: "Split Weighted",
    slug: "split-weighted",
    category: "layout",
    description: "Weighted-split layout with main/aside areas",
    tokenCount: 19,
  },
  {
    name: "Stats",
    slug: "stats",
    category: "data-display",
    description: "Statistics display with icon, number, and copy",
    tokenCount: 14,
  },
  {
    name: "Teaser Card",
    slug: "teaser-card",
    category: "cards",
    description: "Teaser card with image, topic, and compact variant",
    tokenCount: 27,
  },
  {
    name: "Testimonials",
    slug: "testimonials",
    category: "data-display",
    description: "Testimonial quotes with source and byline",
    tokenCount: 22,
  },
  {
    name: "Text",
    slug: "text",
    category: "content",
    description: "Text block with highlight and multi-column support",
    tokenCount: 6,
  },
  {
    name: "Text Area",
    slug: "text-area",
    category: "forms",
    description: "Textarea input with border states and label",
    tokenCount: 16,
  },
  {
    name: "Text Field",
    slug: "text-field",
    category: "forms",
    description: "Text input field with border states and shadow",
    tokenCount: 18,
  },
  {
    name: "Video Curtain",
    slug: "video-curtain",
    category: "heroes",
    description: "Video curtain hero with headline and overlay",
    tokenCount: 12,
  },
];
