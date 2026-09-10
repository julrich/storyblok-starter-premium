import { ControlProps, rankWith, scopeEndIs } from "@jsonforms/core";
import { Unwrapped } from "@jsonforms/material-renderers";
import { withJsonFormsControlProps } from "@jsonforms/react";

const { MaterialIntegerControl } = Unwrapped;

export const renderer = withJsonFormsControlProps((props: ControlProps) => {
  return (
    <MaterialIntegerControl
      {...props}
      schema={props.schema.properties!.$value!.properties!.value!}
      data={props.data?.$value?.value}
      handleChange={(p, v) =>
        props.handleChange(p, {
          $type: "dimension",
          $value: { value: v, unit: "px" },
        })
      }
    />
  );
});

export const tester = rankWith(3, (uischema, schema) => {
  return scopeEndIs("/properties/$value") && schema.properties?.$type?.const === "dimension";
});
