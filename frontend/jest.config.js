module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup.ts',
  ],
  testMatch: [
    '**/__tests__/**/*.(test|spec).(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/**/index.ts',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/src/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|expo|@expo|@unimodules|unimodules|@react-native-community|@react-native-async-storage|@expo/vector-icons))',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  setupFiles: ['<rootDir>/src/__tests__/setupFiles.ts'],
};
