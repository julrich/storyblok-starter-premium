import { rankWith, scopeEndIs } from "@jsonforms/core";
import { renderer as numberRenderer } from "./numberRenderer";

export const renderer = numberRenderer;

export const tester = rankWith(3, (uischema, schema) => {
  return scopeEndIs("/properties/$value") && schema.properties?.$type?.const === "fontWeight";
});
