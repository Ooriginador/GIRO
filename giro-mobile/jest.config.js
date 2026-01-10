/**
 * Jest Configuration for GIRO Mobile
 * @see https://jestjs.io/docs/configuration
 */

module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.(test|spec).(ts|tsx)', '**/?(*.)+(test|spec).(ts|tsx)'],
  transformIgnorePatterns: [
    'node_modules/(?!(.pnpm/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind|react-native-reanimated|react-native-zeroconf))',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/app/$1',
    '^@components/(.*)$': '<rootDir>/app/components/$1',
    '^@hooks/(.*)$': '<rootDir>/app/hooks/$1',
    '^@lib/(.*)$': '<rootDir>/app/lib/$1',
    '^@stores/(.*)$': '<rootDir>/app/stores/$1',
    '^@types/(.*)$': '<rootDir>/app/types/$1',
    '^react-native-css-interop(.*)$': '<rootDir>/app/__tests__/mocks/nativewind.js',
    '^nativewind(.*)$': '<rootDir>/app/__tests__/mocks/nativewind.js',
  },
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    '!app/**/*.d.ts',
    '!app/**/types/*.ts',
    '!app/**/__tests__/**',
    '!app/**/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  verbose: true,
  testTimeout: 10000,
};
