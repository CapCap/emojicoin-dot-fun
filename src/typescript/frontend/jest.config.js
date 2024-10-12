// cspell:word mizuwallet
const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

/** @type {import("ts-jest").JestConfigWithTsJest} */
const customJestConfig = {
  testPathIgnorePatterns: ["tests/playwright", "./dist"],
  verbose: true,
  globals: {
    fetch: global.fetch,
    WebSocket: global.WebSocket,
    TextEncoder: global.TextEncoder,
    TextDecoder: global.TextDecoder,
    Request: global.Request,
    Response: global.Response
  },
  testEnvironment: "jsdom",
  testEnvironmentOptions: {
    customExportConditions: ["node", "node-addons"],
  },
  moduleDirectories: ['node_modules', '.pnpm', 'src'],
  setupFilesAfterEnv: ["<rootDir>/tests/jest/pre-test.js"],
  testPathIgnorePatterns: ["tests/playwright", "./dist", '<rootDir>/node_modules/', '<rootDir>/.next/'],
  transformIgnorePatterns: [
    '/node_modules/(?!(@mizuwallet-sdk|@aptos-labs|graphql-request))',
  ],
};

module.exports = createJestConfig(customJestConfig);
