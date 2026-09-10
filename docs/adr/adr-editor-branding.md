# ADR: Editor Branding — Applying Design Token Theming to Editors

> **Status:** Accepted
> **Date:** 2026-03-15
> **Relates to:** [editor-branding-prd.md](../prd/editor-branding-prd.md)

## Context

The Storybook UI is themed with the project's own design tokens via `.storybook/themes.ts`. The Design Tokens Editor (MUI) and Schema Layer Editor (plain CSS) have independent, unbranded appearances. We want all three to share a consistent light-themed, brand-consistent look.

## Decisions

### D1: Token source — JS constants, not CSS custom properties

Both editors consume token values from `@kickstartds/design-system/dist/token/tokens.js` (the generated JS exports). The Design Tokens Editor imports them directly into `createTheme()`. The Schema Layer Editor has no build-time dependency on the design system, so we copy the literal values into its `:root` CSS variables and document the mapping. This avoids adding a workspace dependency for cosmetic values.

### D2: System font stacks, not web fonts

The token values for `KsFontFamilyInterface` and `KsFontFamilyMono` are system font stacks (system-ui, -apple-system, etc.), not web fonts like Mulish. No Google Fonts `<link>` is needed. The PRD's mention of Mulish was based on an incorrect assumption — the actual Storybook implementation also uses the system stack from tokens.

### D3: Favicon/logo via existing publicDir (Design Tokens Editor)

The Design Tokens Editor's Vite config already sets `publicDir` to the design system's `dist/static` directory. This means `/favicon/favicon.ico`, `/logo.svg`, etc. are already accessible at build and dev time. No file copying is needed — just add `<link>` tags in HTML.

### D4: Favicon/logo via new public directory (Schema Layer Editor)

The Schema Layer Editor's Vite root is `src/app/` and has no publicDir set (defaults to `<root>/public`). Rather than adding a workspace dependency, we create `src/app/public/` and copy the favicon and logo files there. This keeps the package self-contained.

### D5: Editor.tsx theme merging via createTheme inheritance

The Design Tokens Editor has two `createTheme()` calls — one in `main.tsx` (root) and one in `Editor.tsx` (form area). MUI's `createTheme(existingTheme, overrides)` pattern is used in `Editor.tsx` to inherit the root theme's palette/typography and only add component overrides. This avoids a second ThemeProvider that resets colors.

### D6: Schema Layer Editor — light theme with token-sourced accent colors

The Schema Layer Editor switches from its dark purple theme to a light theme. Functional colors (danger, success, warning) are kept close to their original values but adjusted for WCAG AA contrast on light backgrounds. The CSS variable mapping is documented inline in `editor.css`.

### D7: Logo placement is minimal — no structural component changes

Both editors get the logo as a small addition to their existing toolbar/header area. For the Design Tokens Editor, it's an `<img>` in the `EditorToolbar` AppBar. For the Schema Layer Editor, it's an `<img>` next to the existing `<h1>`. No component restructuring needed.

### D8: LoginPage inherits MUI theme automatically

The Design Tokens Editor's LoginPage uses MUI components (`Button`, `TextField`, `Typography`) that automatically inherit from the nearest `ThemeProvider`. The branded theme in `main.tsx` wraps the entire app including the login page, so no LoginPage changes are needed.

## Consequences

- Token value changes in the design system propagate to the Design Tokens Editor on rebuild (via JS imports) but require a manual update for the Schema Layer Editor (CSS literals).
- Both editors now use light backgrounds — dark mode is not supported and would require separate work if needed.
- The Schema Layer Editor's `public/` directory contains copies of the favicon/logo — these must be updated manually if branding assets change.
