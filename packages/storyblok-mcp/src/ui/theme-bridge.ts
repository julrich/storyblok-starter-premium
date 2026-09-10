/**
 * Host-theme-to-kickstartDS CSS variable bridge.
 *
 * Maps host CSS variables (from `HostContext.styles.variables`) to
 * kickstartDS branding and semantic tokens. This allows preview
 * templates to inherit the host application's color scheme, ensuring
 * the preview blends visually into the AI client's UI.
 *
 * The mapping follows the three-layer token architecture:
 * 1. Host variables → kickstartDS branding tokens (--ks-brand-*)
 * 2. kickstartDS branding → semantic tokens (--ks-*)
 * 3. Semantic → component tokens (--dsa-*) [handled by DS CSS]
 *
 * @see PRD Section 3.2 — Theming CSS variable bridge
 */

// ── Theme bridge CSS ───────────────────────────────────────────────

/**
 * CSS that maps host-provided CSS variables to kickstartDS design tokens.
 *
 * Host variables follow the naming convention documented in the ext-apps
 * specification (HostContext.styles.variables). Each mapping provides a
 * sensible fallback so previews look correct even without host theming.
 */
export const THEME_BRIDGE_CSS = `
/* ─── Host → kickstartDS Token Bridge ───────────────────────────── */
/* Maps standardized McpUiStyleVariableKey CSS variables (SEP-1865) */
/* to kickstartDS design tokens. Host-provided values (via          */
/* applyHostStyleVariables) override these fallbacks automatically. */

:root {
  /* Primary brand color — use ring-primary (accent) or background-info */
  --ks-brand-primary: var(--color-ring-primary, var(--color-background-info, #4e63e0));

  /* Background colors */
  --ks-background-color-default: var(--color-background-primary, #ffffff);
  --ks-background-color-bold: var(--color-background-secondary, #f5f5f5);
  --ks-background-color-accent: var(--color-background-info, #4e63e0);

  /* Foreground / text colors */
  --ks-foreground-color-default: var(--color-text-primary, #171717);
  --ks-foreground-color-muted: var(--color-text-secondary, #6b7280);
  --ks-foreground-color-inverted: var(--color-text-inverse, #ffffff);

  /* Typography */
  --ks-font-display-family: var(--font-sans, system-ui, -apple-system, sans-serif);
  --ks-font-copy-family: var(--font-sans, system-ui, -apple-system, sans-serif);
  --ks-font-interface-family: var(--font-sans, system-ui, -apple-system, sans-serif);
  --ks-font-mono-family: var(--font-mono, ui-monospace, monospace);

  /* Border colors */
  --ks-border-color-default: var(--color-border-primary, #e5e7eb);
  --ks-border-color-bold: var(--color-border-secondary, #d1d5db);

  /* Interactive colors */
  --ks-link-color: var(--color-text-info, #4e63e0);
  --ks-link-color-hover: var(--color-text-info, #3b4fd6);

  /* Border radius */
  --ks-border-radius-default: var(--border-radius-md, 4px);
  --ks-border-radius-card: var(--border-radius-lg, 8px);

  /* Shadows */
  --ks-shadow-card: var(--shadow-md, 0 4px 6px -1px rgba(0,0,0,0.1));
}
`;

/**
 * Minimal reset + preview chrome CSS.
 *
 * Applied to all preview templates to ensure consistent rendering.
 * Does NOT import the full kickstartDS CSS — that's handled separately
 * via inlined component CSS.
 */
export const PREVIEW_CHROME_CSS = `
/* ─── Preview Chrome ────────────────────────────────────────────── */

*, *::before, *::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  background: var(--ks-background-color-default, #ffffff);
  color: var(--ks-foreground-color-default, #171717);
  font-family: var(--ks-font-copy-family, system-ui, sans-serif);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  /* Prevent auto-resize fit-content measurement from collapsing
     percentage-based kickstartDS component widths to zero.
     600px is the smallest breakpoint where components render well. */
  min-width: 600px;
}

/* ─── Light-theme lockdown for component preview areas ──────────── */
/* kickstartDS component CSS assumes a light background. When the    */
/* host is in dark mode, applyHostStyleVariables() sets CSS vars     */
/* using light-dark() (e.g. --color-background-primary:              */
/* light-dark(white, dark)), and applyDocumentTheme() sets           */
/* color-scheme: dark on the document root. Component tokens like    */
/* --dsa-section--background-color_default chain through the theme   */
/* bridge to these host variables, causing light-dark() to resolve   */
/* to dark values.                                                   */
/*                                                                   */
/* Fix: force color-scheme: light on the preview container. This     */
/* makes ALL inherited light-dark() values resolve to their light    */
/* variant within the preview area — a single rule that covers every */
/* token path, not just the handful we can enumerate explicitly.     */
.kds-preview {
  color-scheme: light;
  --ks-background-color-default: #ffffff;
  --ks-background-color-bold: #f5f5f5;
  --ks-foreground-color-default: #171717;
  --ks-foreground-color-muted: #6b7280;
  --ks-foreground-color-inverted: #ffffff;
  --ks-border-color-default: #e5e7eb;
  --ks-border-color-bold: #d1d5db;
  --ks-link-color: #4e63e0;
  --ks-link-color-hover: #3b4fd6;
  --ks-shadow-card: 0 4px 6px -1px rgba(0,0,0,0.1);
  background: #ffffff;
  color: #171717;
}

/* Fullscreen mode fills the viewport */
body.fullscreen {
  min-width: 0;
  width: 100vw;
  height: 100vh;
  overflow: auto;
}

/* Preview container */
.kds-preview {
  width: 100%;
  overflow-x: hidden;
}

.kds-preview--loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: var(--ks-foreground-color-muted, #6b7280);
  font-style: italic;
}

/* Action bar (approve/reject/modify buttons) */
.kds-preview-actions {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: var(--ks-background-color-bold, #f5f5f5);
  border-top: 1px solid var(--ks-border-color-default, #e5e7eb);
  flex-wrap: wrap;
}

.kds-preview-actions button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid var(--ks-border-color-default, #e5e7eb);
  border-radius: var(--ks-border-radius-default, 4px);
  background: var(--ks-background-color-default, #ffffff);
  color: var(--ks-foreground-color-default, #171717);
  font-family: var(--ks-font-interface-family, system-ui, sans-serif);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.kds-preview-actions button:hover {
  background: var(--ks-background-color-bold, #f5f5f5);
  border-color: var(--ks-border-color-bold, #d1d5db);
}

.kds-preview-actions button.primary {
  color: #16a34a;
  border-color: #bbf7d0;
}

.kds-preview-actions button.primary:hover {
  background: #f0fdf4;
}

.kds-preview-actions button.danger {
  color: #dc2626;
  border-color: #fecaca;
}

.kds-preview-actions button.danger:hover {
  background: #fef2f2;
}

.kds-preview-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.kds-preview-actions.submitted {
  justify-content: center;
}

.kds-preview-actions .kds-action-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-family: var(--ks-font-interface-family, system-ui, sans-serif);
  color: var(--ks-foreground-color-muted, #6b7280);
}

.kds-preview-actions .kds-action-status.success {
  color: #16a34a;
}

.kds-preview-actions .kds-action-status.error {
  color: #dc2626;
}

/* Write result display (create_page_with_content, import) */
.kds-write-result {
  text-align: center;
  padding: 32px 24px;
}

.kds-write-result__icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.kds-write-result__title {
  font-size: 18px;
  font-weight: 600;
  color: var(--ks-foreground-color-default, #171717);
  margin-bottom: 8px;
}

.kds-write-result__meta {
  font-size: 14px;
  color: var(--ks-foreground-color-muted, #6b7280);
  margin-bottom: 4px;
}

.kds-write-result__slug {
  font-size: 13px;
  font-family: var(--ks-font-mono-family, ui-monospace, monospace);
  color: var(--ks-foreground-color-muted, #6b7280);
  margin-top: 4px;
}

.kds-write-result__warnings {
  margin-top: 16px;
  text-align: left;
}

.kds-write-result__warning {
  font-size: 13px;
  color: #b45309;
  padding: 4px 0;
}

/* Plan review list styles */
.kds-plan-list {
  list-style: none;
  margin: 0;
  padding: 16px;
  counter-reset: plan-step;
}

.kds-plan-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 8px;
  background: var(--ks-background-color-default, #ffffff);
  border: 1px solid var(--ks-border-color-default, #e5e7eb);
  border-radius: var(--ks-border-radius-card, 8px);
  counter-increment: plan-step;
  cursor: grab;
  transition: box-shadow 0.15s ease;
}

.kds-plan-item:hover {
  box-shadow: var(--ks-shadow-card, 0 4px 6px -1px rgba(0,0,0,0.1));
}

.kds-plan-item::before {
  content: counter(plan-step);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--ks-background-color-accent, #4e63e0);
  color: var(--ks-foreground-color-inverted, #ffffff);
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.kds-plan-item__content {
  flex: 1;
}

.kds-plan-item__type {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 2px;
}

.kds-plan-item__description {
  font-size: 13px;
  color: var(--ks-foreground-color-muted, #6b7280);
}

.kds-plan-reasoning {
  font-size: 13px;
  color: var(--ks-foreground-color-muted, #6b7280);
  font-style: italic;
  margin-bottom: 12px;
  padding: 8px 12px;
  border-left: 3px solid var(--color-ring-primary, var(--ks-background-color-accent, #4e63e0));
  background: var(--ks-background-color-secondary, #f9fafb);
  border-radius: 4px;
}

.kds-plan-item__drag-handle {
  color: var(--ks-foreground-color-muted, #6b7280);
  cursor: grab;
  user-select: none;
  font-size: 16px;
}

/* Section counter badge for page preview */
.kds-section-badge {
  position: relative;
}

.kds-section-badge::before {
  content: attr(data-section-label);
  position: absolute;
  top: 0;
  right: 0;
  padding: 2px 8px;
  background: var(--ks-background-color-accent, #4e63e0);
  color: var(--ks-foreground-color-inverted, #ffffff);
  font-size: 11px;
  font-weight: 600;
  border-radius: 0 0 0 var(--ks-border-radius-default, 4px);
  z-index: 10;
  opacity: 0.85;
}

/* ─── Page Builder UI ───────────────────────────────────────────── */

/* Builder header bar */
.kds-builder-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: var(--ks-background-color-bold, #f5f5f5);
  border-bottom: 1px solid var(--ks-border-color-default, #e5e7eb);
  font-family: var(--ks-font-interface-family, system-ui, sans-serif);
  font-size: 13px;
  font-weight: 600;
  color: var(--ks-foreground-color-default, #171717);
}

.kds-builder-header__title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.kds-builder-header__count {
  font-weight: 400;
  color: var(--ks-foreground-color-muted, #6b7280);
}

/* Section wrapper in builder */
.kds-builder-section {
  position: relative;
  border: 2px solid transparent;
  transition: border-color 0.3s ease, opacity 0.3s ease;
}

.kds-builder-section--pending {
  border-color: var(--ks-background-color-accent, #4e63e0);
  animation: kds-pending-pulse 2s ease-in-out infinite;
}

.kds-builder-section--removed {
  opacity: 0.3;
  pointer-events: none;
}

@keyframes kds-pending-pulse {
  0%, 100% { border-color: var(--ks-background-color-accent, #4e63e0); }
  50% { border-color: transparent; }
}

/* Per-section controls overlay */
.kds-builder-section__controls {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  gap: 4px;
  z-index: 20;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.kds-builder-section:hover .kds-builder-section__controls {
  opacity: 1;
}

.kds-builder-section__controls button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  border: 1px solid var(--ks-border-color-default, #e5e7eb);
  border-radius: var(--ks-border-radius-default, 4px);
  background: var(--ks-background-color-default, #ffffff);
  color: var(--ks-foreground-color-default, #171717);
  font-family: var(--ks-font-interface-family, system-ui, sans-serif);
  font-size: 12px;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  transition: background 0.15s ease;
}

.kds-builder-section__controls button:hover {
  background: var(--ks-background-color-bold, #f5f5f5);
}

.kds-builder-section__controls button.danger:hover {
  background: #fef2f2;
  color: #dc2626;
  border-color: #fecaca;
}

/* Pending section action bar (Keep / Discard) */
.kds-builder-pending-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  padding: 8px 16px;
  background: var(--ks-background-color-bold, #f5f5f5);
  border-top: 1px solid var(--ks-border-color-default, #e5e7eb);
}

/* NEW badge on pending sections */
.kds-builder-section__badge {
  position: absolute;
  top: 0;
  left: 0;
  padding: 2px 10px;
  background: var(--ks-background-color-accent, #4e63e0);
  color: var(--ks-foreground-color-inverted, #ffffff);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  border-radius: 0 0 var(--ks-border-radius-default, 4px) 0;
  z-index: 20;
}

/* Save bar at bottom */
.kds-builder-save-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: var(--ks-background-color-bold, #f5f5f5);
  border-top: 1px solid var(--ks-border-color-default, #e5e7eb);
}

.kds-builder-save-bar button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: var(--ks-border-radius-default, 4px);
  background: var(--ks-background-color-accent, #4e63e0);
  color: var(--ks-foreground-color-inverted, #ffffff);
  font-family: var(--ks-font-interface-family, system-ui, sans-serif);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.kds-builder-save-bar button:hover {
  opacity: 0.9;
}

.kds-builder-save-bar button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Move buttons */
.kds-builder-section__controls button.move {
  font-size: 14px;
  padding: 2px 6px;
}

/* Edit mode header */
.kds-builder-header--edit {
  background: var(--ks-background-color-accent, #4e63e0);
  color: var(--ks-foreground-color-inverted, #ffffff);
}

.kds-builder-header--edit .kds-builder-header__count {
  color: rgba(255, 255, 255, 0.75);
}

/* Connection error state */
.kds-connection-error {
  text-align: center;
  padding: 32px 24px;
}

.kds-connection-error__icon {
  font-size: 36px;
  margin-bottom: 12px;
}

.kds-connection-error__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--ks-foreground-color-default, #171717);
  margin-bottom: 8px;
}

.kds-connection-error__detail {
  font-size: 13px;
  color: var(--ks-foreground-color-muted, #6b7280);
  font-family: var(--ks-font-mono-family, ui-monospace, monospace);
}

/* Save confirmation overlay */
.kds-builder-save-overlay {
  text-align: center;
  padding: 32px 24px;
  background: var(--ks-background-color-default, #ffffff);
}

/* Builder header actions */
.kds-builder-header__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Fullscreen toggle button */
.kds-builder-header__fullscreen {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--ks-border-color-default, #e5e7eb);
  border-radius: var(--ks-border-radius-default, 4px);
  background: var(--ks-background-color-default, #ffffff);
  color: var(--ks-foreground-color-default, #171717);
  font-size: 16px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.kds-builder-header__fullscreen:hover {
  background: var(--ks-background-color-bold, #f5f5f5);
}

.kds-builder-header--edit .kds-builder-header__fullscreen {
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: var(--ks-foreground-color-inverted, #ffffff);
}

.kds-builder-header--edit .kds-builder-header__fullscreen:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Section add/remove transitions */
.kds-builder-section {
  animation: kds-section-fadein 0.3s ease-out;
}

@keyframes kds-section-fadein {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
`;
