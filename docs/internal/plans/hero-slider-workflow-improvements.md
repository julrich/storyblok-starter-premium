# Hero Slider Component — Workflow Improvement Notes

> **Historical / reference note.** These notes were captured while building a hero-slider
> component and are generic MCP/tooling feedback (no brand-specific content). Several points
> may already be addressed in the current MCP servers (e.g. auto-schema derivation in the
> Storyblok MCP). Treat as a backlog of ideas to validate, not a live TODO list.

Notes on friction points and improvements that would make this workflow easier for an LLM to perform in the future.

## MCP Tool Discoverability

1. **Parameter discovery is trial-and-error**: Several MCP tools (`get-json-schema-template`, `get-scss-template`, `get-client-behavior-template`) have required parameters (`description`, `cssClassName`, `identifier`) that aren't obvious from the tool name alone. The first call often fails, requiring a retry. **Improvement**: Include required parameter hints in tool descriptions, or make them optional with sensible defaults derived from `componentName`.

2. **Design Tokens MCP parameter naming inconsistency**: `get_component_tokens` expects `component` (not `componentSlug`). `search_tokens` expects `pattern` (not `query`). `list_tokens` expects `category` but doesn't list valid categories upfront. **Improvement**: Standardize parameter naming across tools and provide enumerated valid values in descriptions.

3. **No "get all transition/timing tokens" shortcut**: Had to discover `--ks-duration-*` and `--ks-timing-function-*` tokens through multiple chained calls (`get_token_stats` → `list_tokens` → `get_token`). **Improvement**: Add a `get_animation_tokens` or `get_transition_tokens` convenience tool.

## Schema & Type Generation

4. **Chicken-and-egg with generated files**: The component build order requires the JSON Schema first, then `yarn schema` to generate `Props.ts`, `Defaults.ts`, and `dereffed.json`. But the React component and Storybook story import these generated files. An LLM must manually create placeholder versions of `HeroSliderProps.ts`, `HeroSliderDefaults.ts`, and `hero-slider.schema.dereffed.json` before the build can run. **Improvement**: Either provide a tool that generates these on the fly from a schema, or document that placeholders should be created and regenerated.

5. **Dereferenced schema is identical for leaf components**: When a schema has no `$ref` entries, the dereffed version is identical to the source. The LLM has to duplicate the file content. **Improvement**: If the Component Builder MCP could auto-generate the dereffed schema (or flag that it's unnecessary for leaf components), this step would be eliminated.

## Component Patterns

6. **No clear documentation on Picture component API**: The `Picture` component from `@kickstartds/base/lib/picture` doesn't expose `srcMobile`/`srcTablet`/`srcDesktop` props directly — those exist on the `Visual` component's `media.image` sub-object. An LLM will try to pass responsive image props to `Picture` and get type errors. **Improvement**: Add a tool or documentation that describes the `Picture` component's actual prop interface.

7. **Client-side JS import type resolution**: Importing `.client.js` files in `.tsx` components triggers a TypeScript language server error (`Cannot find module`), even though `allowJs: true` is configured and the same pattern works in the existing Section component. This is confusing for validation. **Improvement**: Either add `.d.ts` stub declarations for `.client.js` files, or document this as a known false positive.

## Registration Steps

8. **Multiple touch points for adding a component**: Adding a new component requires editing at least 4-5 files across 2 packages:
   - `components.ts` (DS export registry)
   - `section.schema.json` (component reference in section's `anyOf`)
   - `packages/website/components/index.tsx` (Storyblok component map)
   - `packages/website/package.json` (create-storyblok-config script)
   - Optionally the slider schema if it should be nestable

   **Improvement**: A Component Builder MCP tool like `register-component` that accepts a component name and automatically patches all required files would dramatically reduce errors and save time.

9. **create-storyblok-config is a single long string**: The component list in the `package.json` script is a space-separated inline list. It's easy to miss the alphabetical ordering or insert a component in the wrong place. **Improvement**: Move the component list to a config file (e.g., `cms/components.json`) so it's easier to maintain and validate.

## Build & Verification

10. **No way to verify without full build**: To confirm the component works end-to-end (schema generation, Rollup bundling, Storybook rendering), a full `pnpm --filter @kickstartds/design-system build` is needed. This is slow and can't be done incrementally during development. **Improvement**: A lightweight `validate-component` tool in the Component Builder MCP that checks schema validity, file structure completeness, and import resolution without a full build.

11. **Token extraction requires build**: Component tokens (`hero-slider-tokens.json`) are auto-generated by running `yarn token`, which is part of the build pipeline. Until then, the Storybook cssprops panel won't show tokens. **Improvement**: Make the token extraction available as a standalone tool call.

## Documentation

12. **Storybook story CSF format subtleties**: The `pack()` utility from kickstartDS core is needed to wrap story args, and `getArgsShared()` generates arg types from schema. These aren't standard Storybook patterns and aren't well-documented outside the MCP template. **Improvement**: Add these patterns to the Storybook template documentation with explanation of _why_ they're needed.

13. **The copilot-instructions.md is comprehensive but dense**: The instructions file is very long. For component creation specifically, a focused "component creation checklist" would help LLMs execute more efficiently. **Improvement**: Add a dedicated skill document for component creation that consolidates the steps from all four MCP servers.
