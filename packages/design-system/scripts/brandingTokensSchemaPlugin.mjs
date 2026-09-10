/** @import { Plugin } from "rollup" */
import path from "node:path";
import $RefParser from "@apidevtools/json-schema-ref-parser";
import Ajv from "ajv/dist/2020.js";
import standaloneCode from "ajv/dist/standalone/index.js";
import fs from "fs-extra";
import mergeAllOf from "json-schema-merge-allof";

/**
 * @param {string} schemaPath
 * @param {string} [outPath]
 * @returns {Plugin}
 */
export default function brandingTokensSchemaPlugin(schemaPath, outPath = "") {
  const ajv = new Ajv({ code: { source: true, esm: true } });
  return {
    name: "kds-branding-tokens",
    async buildStart() {
      const { name, ext } = path.parse(schemaPath);

      const schema = await fs.readJSON(schemaPath);
      this.emitFile({
        type: "asset",
        fileName: path.join(outPath, name + ext),
        source: JSON.stringify(schema, null, 2),
      });

      const validate = ajv.compile(schema);
      const moduleCode = standaloneCode(ajv, validate);
      this.emitFile({
        type: "asset",
        fileName: path.join(outPath, name + ".validate.mjs"),
        source: moduleCode,
      });

      const dereffed = await $RefParser.dereference(schema);
      const merged = mergeAllOf(dereffed);
      this.emitFile({
        type: "asset",
        fileName: path.join(outPath, name + ".dereffed" + ext),
        source: JSON.stringify(merged, null, 2),
      });
    },
  };
}
