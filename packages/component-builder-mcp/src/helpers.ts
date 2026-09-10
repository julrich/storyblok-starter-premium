/**
 * Shared utility functions for the component-builder MCP server.
 */

/**
 * Convert a PascalCase or camelCase name to kebab-case.
 *
 * @example toKebabCase("HeroSection") // "hero-section"
 */
export function toKebabCase(name: string): string {
  return name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}
