import fs from "fs-extra";
import fg from "fast-glob";
import Ajv from "ajv/dist/2020.js";
import { tokensToCss } from "./tokensToCss.mjs";
import schema from "../src/token/branding-tokens.schema.json" with { type: "json" };

const ajv = new Ajv();
const validate = ajv.compile(schema);

const writeCss = async (tokensPath) => {
  const tokens = await fs.readJSON(tokensPath);

  const isValid = validate(tokens);
  if (!isValid) {
    console.log(validate.errors);
    return;
  }

  const css = tokensToCss(tokens);
  await fs.writeFile(tokensPath.replace(".json", ".css"), css);
};

(async () => {
  const [, , tokensPath] = process.argv;

  if (tokensPath) {
    await writeCss(tokensPath);
  } else {
    const tokensPaths = await fg("src/token/branding-tokens{,-*}.json");
    for (const tokensPath of tokensPaths) {
      await writeCss(tokensPath);
    }
  }
})();
