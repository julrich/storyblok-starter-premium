/** @type {import('jest').Config} */
export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "tsconfig.test.json",
      },
    ],
    // Transform kickstartDS ESM packages so Jest can parse them
    "node_modules/.+\\.js$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "tsconfig.test.json",
      },
    ],
  },
  // Allow transforming kickstartDS and related ESM-only packages
  transformIgnorePatterns: [
    "node_modules/(?!(@kickstartds|@modelcontextprotocol/ext-apps)/)",
  ],
  testMatch: ["**/test/**/*.test.ts", "**/test/**/*.test.tsx"],
};
