/**
 * Jest Setup File
 * Mocks and global configuration for tests
 */

import '@testing-library/react-native/extend-expect';

// =============================================================================
// REACT NATIVE TESTING LIBRARY CONFIG (MUST BE FIRST)
// =============================================================================

import { configure } from '@testing-library/react-native';

// Manually configure host component names for RNTL v12+
// This is required when auto-detection fails in Jest environment
configure({
  asyncUtilTimeout: 5000,
  defaultIncludeHiddenElements: false,
});

// =============================================================================
// NATIVEWIND MOCKS
// =============================================================================

// Mock react-native-css-interop to avoid runtime errors
jest.mock('react-native-css-interop', () => ({
  cssInterop: jest.fn((component) => component),
  remapProps: jest.fn((component) => component),
  createInteropElement: jest.fn((element) => element),
  StyleSheet: {
    create: (styles) => styles,
  },
  useColorScheme: jest.fn(() => 'light'),
  vars: {},
}), { virtual: true });

// Mock nativewind
jest.mock('nativewind', () => ({
  styled: (component) => component,
  useColorScheme: jest.fn(() => ({ colorScheme: 'light', setColorScheme: jest.fn(), toggleColorScheme: jest.fn() })),
}), { virtual: true });

// =============================================================================
// EXPO MODULE MOCKS
// =============================================================================

// Mock expo-camera
jest.mock('expo-camera', () => ({
  Camera: 'Camera',
  CameraView: 'CameraView',
  useCameraPermissions: () => [{ granted: true }, jest.fn()],
  PermissionStatus: {
    UNDETERMINED: 'undetermined',
    GRANTED: 'granted',
    DENIED: 'denied',
  },
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Error: 'error',
    Warning: 'warning',
  },
}));

// Mock expo-av
jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn(() =>
        Promise.resolve({
          sound: {
            playAsync: jest.fn().mockResolvedValue(undefined),
            unloadAsync: jest.fn().mockResolvedValue(undefined),
          },
        })
      ),
    },
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  Link: 'Link',
  Tabs: {
    Screen: 'Tabs.Screen',
  },
  Stack: {
    Screen: 'Stack.Screen',
  },
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock expo-network
jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn().mockResolvedValue({
    isConnected: true,
    type: 'wifi',
    isInternetReachable: true,
  }),
}));

// =============================================================================
// REACT NATIVE EXTERNAL LIBRARY MOCKS
// =============================================================================

// Mock react-native-zeroconf (mDNS)
jest.mock('react-native-zeroconf', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    scan: jest.fn(),
    stop: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
  }));
});

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  return {
    GestureHandlerRootView: ({ children }) => children,
    PanGestureHandler: 'PanGestureHandler',
    TapGestureHandler: 'TapGestureHandler',
    ScrollView: ({ children, ...props }) => React.createElement('ScrollView', props, children),
    State: {},
    Directions: {},
    Swipeable: 'Swipeable',
    DrawerLayout: 'DrawerLayout',
    gestureHandlerRootHOC: jest.fn((component) => component),
  };
}, { virtual: true });

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children, ...props }) => React.createElement('View', props, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 375, height: 812 }),
    initialWindowMetrics: {
      frame: { x: 0, y: 0, width: 375, height: 812 },
      insets: { top: 44, left: 0, right: 0, bottom: 34 },
    },
  };
}, { virtual: true });

// =============================================================================
// GLOBAL MOCKS
// =============================================================================

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
}));

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
);

// =============================================================================
// CONSOLE CONFIGURATION
// =============================================================================

// Silence specific console warnings in tests
const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Animated') ||
      args[0].includes('NativeWind') ||
      args[0].includes('ViewPropTypes') ||
      args[0].includes('useNativeDriver'))
  ) {
    return;
  }
  originalWarn(...args);
};

console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: An update to') ||
      args[0].includes('act(...)') ||
      args[0].includes('forwardRef') ||
      args[0].includes('ReactDOMTestUtils.act'))
  ) {
    return;
  }
  originalError(...args);
};

// =============================================================================
// CLEANUP
// =============================================================================

afterEach(() => {
  jest.clearAllMocks();
});
