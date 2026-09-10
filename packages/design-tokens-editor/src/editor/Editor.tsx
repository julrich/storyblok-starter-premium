import { createAjv } from "@jsonforms/core";
import {
  materialCells,
  materialRenderers,
} from "@jsonforms/material-renderers";
import { JsonForms } from "@jsonforms/react";
import tokenSchema from "@kickstartds/design-system/tokens/branding-tokens.schema.dereffed.json";
import * as categorizationLayout from "../controls/categorizationLayout";
import * as colorRenderer from "../controls/colorRenderer";
import * as dimensionRenderer from "../controls/dimensionRenderer";
import * as fontFamilyRenderer from "../controls/fontFamilyRenderer";
import * as fontWeightRenderer from "../controls/fontWeightRenderer";
import * as numberRenderer from "../controls/numberRenderer";
import { useToken } from "../token/TokenContext";
import { uischema } from "./uiSchema";

const schema = { type: "object", properties: tokenSchema.properties };
const ajv = createAjv({ useDefaults: true });

export const Editor = () => {
  const { tokens, setTokens } = useToken();
  return (
    <>
      <JsonForms
        schema={schema}
        uischema={uischema}
        data={tokens}
        renderers={[
          ...materialRenderers,
          colorRenderer,
          numberRenderer,
          fontFamilyRenderer,
          dimensionRenderer,
          fontWeightRenderer,
          categorizationLayout,
        ]}
        cells={materialCells}
        onChange={({ data }) => {
          setTokens(data);
        }}
        ajv={ajv}
      />
    </>
  );
};
