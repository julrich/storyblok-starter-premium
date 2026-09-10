const { parse } = require("svg-parser");
const toJsx = require("@mapbox/hast-util-to-jsx");

module.exports = ({ dictionary }) => {
  let result =
    'import React from "react";\n\nconst icons: Record<string, (className?: string) => React.JSX.Element> = {\n';

  for (const icon of Object.values(dictionary.tokens.icons)) {
    const tree = parse(icon.value);
    const svgProperties = (tree.children[0].properties ??= {});
    svgProperties.class = (svgProperties.class ? " " : "") + "REPLACEME";
    const jsx = toJsx(tree);
    result += `  "${icon.name}": (className?: string) => ${jsx.replaceAll(
      '"REPLACEME"',
      '{`${className+" icon"}`}'
    )},\n`;
  }
  result += "};";

  result += `
export const InlineIcon = ({ icon, className }: { icon: string, className?: string }) => icons[icon] ? icons[icon](className) : console.log("WARNING: Icon not found:", icon);
`;
  return result;
};
