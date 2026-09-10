/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  moduleFileExtensions: ["ts", "js", "json"],
  moduleNameMapper: {
    // Stub out jsdom — its transitive dep @exodus/bytes is ESM-only and
    // breaks Jest's CJS require chain via storyblok-services → scrape.ts.
    "^jsdom$": "<rootDir>/test/__mocks__/jsdom.ts",
  },
};
