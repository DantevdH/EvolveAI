/**
 * Setup files - runs before Jest environment is set up
 * Used for polyfills and environment setup
 */

// Define React Native globals
(global as any).__DEV__ = true;

// Mock react-native-url-polyfill to avoid ES module import errors in Jest
jest.mock('react-native-url-polyfill/auto', () => ({}));

// Mock React Native modules that might be needed globally
jest.mock('react-native', () => {
  const React = require('react');
  return {
    Platform: {
      OS: 'ios',
      select: jest.fn((obj) => obj.ios),
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 812 })),
    },
    useWindowDimensions: jest.fn(() => ({ width: 375, height: 812 })),
    StyleSheet: {
      create: (styles: any) => styles,
    },
    View: 'View',
    Text: 'Text',
    Modal: ({ children, visible, ...props }: any) => {
      return visible ? React.createElement('View', { testID: 'modal', ...props }, children) : null;
    },
    ScrollView: ({ children, ...props }: any) => {
      return React.createElement('View', { ...props }, children);
    },
    SafeAreaView: ({ children, ...props }: any) => {
      return React.createElement('View', { testID: 'safe-area-view', ...props }, children);
    },
    ActivityIndicator: ({ ...props }: any) => {
      return React.createElement('View', { testID: 'activity-indicator', ...props });
    },
    TouchableOpacity: ({ children, onPress, disabled, ...props }: any) => {
      return React.createElement(
        'Pressable',
        { onPress, disabled, ...props },
        children
      );
    },
    Pressable: 'Pressable',
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
  };
});

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

// Mock Expo modules that cause ES module import errors
// Best Practice: Centralize mocks here for consistency and easier maintenance
jest.mock('expo-notifications', () => ({
  __esModule: true,
  default: {
    setNotificationHandler: jest.fn(),
    scheduleNotificationAsync: jest.fn(),
    cancelScheduledNotificationAsync: jest.fn(),
    getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
    requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  },
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {},
    manifest: {},
  },
}));

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => false),
  })),
  useSegments: jest.fn(() => []),
  usePathname: jest.fn(() => '/'),
}));

jest.mock('expo-symbols', () => ({
  __esModule: true,
  SymbolWeight: {},
  SymbolViewProps: {},
}));

jest.mock('@expo/vector-icons', () => ({
  __esModule: true,
  Ionicons: 'Ionicons',
  MaterialIcons: 'MaterialIcons',
  FontAwesome: 'FontAwesome',
  AntDesign: 'AntDesign',
}));

// Mock specific icon imports that use ES modules
// This handles imports like: import MaterialIcons from '@expo/vector-icons/MaterialIcons'
jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: React.forwardRef((props: any, ref: any) => React.createElement('MaterialIcons', { ...props, ref })),
  };
});

jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: 'Svg',
  Svg: 'Svg',
  Path: 'Path',
  Circle: 'Circle',
  G: 'G',
}));

jest.mock('react-native-circular-progress', () => ({
  __esModule: true,
  AnimatedCircularProgress: 'AnimatedCircularProgress',
}));

// Mock IconSymbol component to avoid ES module issues with MaterialIcons
// Note: IconSymbol is in components/ui (relative to frontend root)
// From src/__tests__/setupFiles.ts, path is: ../../components/ui/IconSymbol
jest.mock('../../components/ui/IconSymbol', () => ({
  IconSymbol: ({ name, size, color, style }: any) => {
    const React = require('react');
    return React.createElement('MaterialIcons', { name, size, color, style });
  },
}));

