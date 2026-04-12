/** @type {import('jest').Config} */
const config = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testEnvironment: "node",
  testRegex: ".*\\.(spec|e2e-spec)\\.ts$",
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.test.json" }]
  },
  roots: ["<rootDir>/src/", "<rootDir>/test/"],  moduleNameMapper: {
    // jwks-rsa uses jose v6 (ESM-only) which jest cannot transform.
    // All tests that need platform exchange override the entire service — the mock is never called.
    "^jwks-rsa$": "<rootDir>/test/__mocks__/jwks-rsa.js"
  },  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts"],
  coverageDirectory: "coverage"
};

module.exports = config;
