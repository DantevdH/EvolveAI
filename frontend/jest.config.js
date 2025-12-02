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
    // Transform all Expo and React Native modules to handle ES modules
    // Include @expo/vector-icons submodules (like MaterialIcons) to handle ES module imports
    'node_modules/(?!(react-native|@react-native|@react-navigation|expo|@expo|@unimodules|unimodules|@react-native-community|@react-native-async-storage|@expo/vector-icons|expo-web-browser|expo-secure-store|expo-notifications|expo-constants|expo-router|expo-symbols|react-native-svg|react-native-circular-progress))',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  setupFiles: ['<rootDir>/src/__tests__/setupFiles.ts'],
};
