/** @import { TraverseContext } from "traverse" */
import traverse from "traverse";
import tinycolor from "tinycolor2";

/**
 *
 * @param {TraverseContext | undefined} ctx
 * @returns {string | undefined}
 */
const getType = (ctx) => {
  while ((ctx = ctx?.parent)) {
    if (ctx.node.$type) return ctx.node.$type;
  }
};
/**
 *
 * @param {string} name
 * @param {string | undefined} $type
 * @param {*} $value
 * @returns {string}
 */
const getValue = (name, $type, $value) => {
  switch ($type) {
    case "color":
      return (
        "#" +
        tinycolor({
          r: $value.components[0] * 255,
          g: $value.components[1] * 255,
          b: $value.components[2] * 255,
        }).toHex()
      );

    case "fontFamily":
      return $value
        .map((f) => {
          const clean = f.replace(/^["']|["']$/g, "").trim();
          return clean.includes(" ") ? `"${clean}"` : clean;
        })
        .join();

    case "dimension":
      return $value.value + $value.unit;

    case "number":
      if (name.startsWith("color-scale-")) {
        return Math.round($value * 100) + "%";
      }
      return $value;

    default:
      return $value;
  }
};
/**
 *
 * @param {*} tokens
 * @returns {string}
 */
export const tokensToCss = (tokens) =>
  traverse(tokens).reduce(function (acc, $value) {
    if (this.key === "$value") {
      const name = this.parent.path.filter((seg) => seg !== "$root").join("-");
      const $type = getType(this);
      const value = getValue(name, $type, $value);

      acc += `  --ks-brand-${name}: ${value};\n`;
    }
    return acc;
  }, ":root {\n") + "}\n";
