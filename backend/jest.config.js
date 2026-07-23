// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
/** @type {import('jest').Config} */
const config = {
  preset:          'ts-jest',
  testEnvironment: 'node',
  rootDir:         '.',
  testMatch:       ['<rootDir>/src/**/*.test.ts'],
  moduleNameMapper: {
    '^@vride/shared$': '<rootDir>/../shared/src/index.ts',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: { strict: false } }],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',
    '!src/**/*.d.ts',
  ],
  coverageDirectory:  'coverage',
  coverageReporters:  ['text', 'lcov'],
  clearMocks:         true,
  setupFiles:         ['<rootDir>/src/__tests__/setup.ts'],
};

module.exports = config;
