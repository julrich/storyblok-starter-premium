import { rankWith, ControlProps, scopeEndIs } from "@jsonforms/core";
import { MaterialInputControl, MuiInputText, Unwrapped } from "@jsonforms/material-renderers";
import { withJsonFormsControlProps } from "@jsonforms/react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { ComponentProps } from "react";
import tinycolor, { type ColorInput } from "tinycolor2";

const { MaterialTextControl } = Unwrapped;

const round = (value: number, digits = 4) => {
  value = value * Math.pow(10, digits);
  value = Math.round(value);
  value = value / Math.pow(10, digits);
  return value;
};

const color2token = (color: ColorInput) => {
  const { r, g, b } = tinycolor(color).toRgb();
  return {
    $type: "color",
    $value: {
      colorSpace: "srgb",
      components: [round(r / 255), round(g / 255), round(b / 255)],
    },
  };
};

const token2hex = (token?: any) =>
  token
    ? "#" +
      tinycolor({
        r: token.$value.components[0] * 255,
        g: token.$value.components[1] * 255,
        b: token.$value.components[2] * 255,
      }).toHex()
    : undefined;

const ColorInput = (props: ComponentProps<typeof MuiInputText>) => {
  return <MuiInputText {...props} muiInputProps={{ type: "color" }} />;
};
export const renderer = withJsonFormsControlProps((props: ControlProps) => {
  return (
    <Stack direction="row" spacing={0}>
      <Box
        sx={{
          "& fieldset": { borderTopRightRadius: 0, borderBottomRightRadius: 0 },
        }}
      >
        <MaterialTextControl
          {...props}
          data={token2hex(props.data)}
          handleChange={(p, v) => props.handleChange(p, color2token(v))}
        />
      </Box>
      <Box
        sx={{
          width: "30%",
          "& fieldset": { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },
          "& button": { display: "none" },
        }}
      >
        <MaterialInputControl
          {...props}
          label=""
          input={ColorInput}
          data={token2hex(props.data)}
          handleChange={(p, v) => props.handleChange(p, color2token(v))}
        />
      </Box>
    </Stack>
  );
});

export const tester = rankWith(3, (uischema, schema) => {
  return scopeEndIs("/properties/$value") && schema.properties?.$type?.const === "color";
});
