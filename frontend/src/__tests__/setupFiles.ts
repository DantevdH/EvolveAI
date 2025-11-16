/**
 * Setup files - runs before Jest environment is set up
 * Used for polyfills and environment setup
 */

// Define React Native globals
(global as any).__DEV__ = true;

// Mock React Native modules that might be needed globally
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
  },
  StyleSheet: {
    create: (styles: any) => styles,
  },
  View: 'View',
  Text: 'Text',
  Animated: {
    View: 'AnimatedView',
    Value: class {
      private _value: number;
      constructor(value: number) {
        this._value = value;
      }
      setValue(value: number) {
        this._value = value;
      }
      interpolate() {
        return '0deg';
      }
    },
    timing: jest.fn(() => ({
      start: jest.fn(),
    })),
    loop: jest.fn(() => ({
      start: jest.fn(),
    })),
  },
}));

// Mock Expo modules
jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    getAllKeys: jest.fn(),
    multiRemove: jest.fn(),
  },
}));

