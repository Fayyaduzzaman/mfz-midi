const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './'
});

/** @type {import('jest').Config} */
const customJestConfig = {
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: ['<rootDir>/e2e/', '<rootDir>/playwright.config.ts']
};

module.exports = createJestConfig(customJestConfig);
