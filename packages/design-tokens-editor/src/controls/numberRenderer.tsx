import { ControlProps, rankWith, scopeEndIs } from "@jsonforms/core";
import { Unwrapped } from "@jsonforms/material-renderers";
import { withJsonFormsControlProps } from "@jsonforms/react";

const { MaterialNumberControl, MaterialSliderControl } = Unwrapped;

export const renderer = withJsonFormsControlProps((props: ControlProps) => {
  const valueSchema = props.schema?.properties?.$value!;
  const shouldRenderSlider = "minimum" in valueSchema && "maximum" in valueSchema;
  const Control = shouldRenderSlider ? MaterialSliderControl : MaterialNumberControl;
  if (shouldRenderSlider) {
    valueSchema.multipleOf = 0.01;
  }
  return (
    <Control
      {...props}
      schema={valueSchema}
      data={props.data?.$value}
      handleChange={(p, v) => props.handleChange(p, { $type: "number", $value: v })}
    />
  );
});

export const tester = rankWith(3, (uischema, schema) => {
  return scopeEndIs("/properties/$value") && schema.properties?.$type?.const === "number";
});
