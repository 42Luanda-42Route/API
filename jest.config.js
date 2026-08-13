/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  clearMocks: true,
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "src/application/**/*.ts",
    "src/domain/**/*.ts",
    "src/infrastructure/**/*.ts",
    "src/utils/**/*.ts",
    "!src/**/*.d.ts",
  ],
  setupFiles: ["<rootDir>/src/__tests__/setup.ts"],
}
