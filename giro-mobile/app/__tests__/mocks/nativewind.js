/**
 * Mock for NativeWind and react-native-css-interop
 * Required for Jest testing environment
 */

module.exports = {
  cssInterop: jest.fn((component) => component),
  remapProps: jest.fn((component) => component),
  createInteropElement: jest.fn((element) => element),
  styled: (component) => component,
  StyleSheet: {
    create: (styles) => styles,
  },
  useColorScheme: () => 'light',
  vars: {},
};
