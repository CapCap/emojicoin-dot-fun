/** @type {import("jest").Config} */
module.exports = {
  preset: "ts-jest",
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  workerThreads: true,
  testEnvironment: "node",
  testEnvironmentOptions: {
    customExportConditions: ["react-server", "node", "node-addons"],
  },
  collectCoverage: false,
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 55,
      lines: 55,
      statements: 55,
    },
  },
  globalSetup: process.env.NO_TEST_SETUP !== "true" ? "./tests/pre-test.ts" : null,
  globalTeardown: process.env.NO_TEST_SETUP !== "true" ? "./tests/post-test.ts" : null,
};
