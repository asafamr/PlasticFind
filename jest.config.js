/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: "ts-jest/presets/js-with-ts",
  roots: ["<rootDir>/src"],
  testMatch: [
    "**/__tests__/**/*.+(ts|tsx|js)",
    "**/?(*.)+(spec|test).+(ts|tsx|js)",
  ],
  globals: { 
    "ts-jest": { tsconfig: "tsconfig.test.json" },
  },
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
};
