import type { Config } from "jest";

export default async (): Promise<Config> => {
  return {
    preset: "ts-jest",
    testEnvironment: "node",
    moduleNameMapper: {
      "^@/(.*)$": "<rootDir>/src/$1",
      "^~/(.*)$": "<rootDir>/tests/$1",
    },
    testPathIgnorePatterns: ["build", "data"],
    restoreMocks: true,
    resetMocks: true,
    clearMocks: true,
    resetModules: true,
    collectCoverageFrom: ["src/monitor/*.ts*"],
    testTimeout: 6000,
    cache: false,
  };
};
