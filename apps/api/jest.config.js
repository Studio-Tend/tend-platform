module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/../test/jest-setup.ts'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/$1',
    '^@tend/core$': '<rootDir>/../../../packages/core/src/index.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|@prisma|jose)/)',
  ],
  preset: 'ts-jest',
  extensionsToTreatAsEsm: [],
  globals: {
    'ts-jest': {
      useESM: false,
    },
  },
};
