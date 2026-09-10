/** @type {import('jest').Config} */
export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    // Stub out jsdom — its transitive dep @exodus/bytes is ESM-only and
    // breaks Jest's CJS require chain. No tests exercise scraping.
    "^jsdom$": "<rootDir>/test/__mocks__/jsdom.ts",
  },
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "tsconfig.json",
      },
    ],
  },
  testMatch: ["**/test/**/*.test.ts"],
};
