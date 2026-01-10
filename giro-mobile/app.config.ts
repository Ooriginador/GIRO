import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: process.env.EXPO_PUBLIC_APP_VARIANT === 'production' ? 'GIRO Mobile' : 'GIRO Mobile (Dev)',
  slug: 'giro-mobile',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  scheme: 'giro-mobile',

  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },

  assetBundlePatterns: ['**/*'],

  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.giro.mobile',
    infoPlist: {
      NSCameraUsageDescription: 'Usado para escanear códigos de barras',
      NSLocalNetworkUsageDescription: 'Usado para encontrar o GIRO Desktop na rede local',
      NSBonjourServices: ['_giro._tcp'],
    },
  },

  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'com.giro.mobile',
    permissions: ['CAMERA', 'ACCESS_NETWORK_STATE', 'ACCESS_WIFI_STATE', 'VIBRATE'],
  },

  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/favicon.png',
  },

  plugins: [
    'expo-router',
    [
      'expo-camera',
      {
        cameraPermission:
          'Permitir $(PRODUCT_NAME) acessar a câmera para escanear códigos de barras.',
      },
    ],
    [
      'expo-barcode-scanner',
      {
        cameraPermission:
          'Permitir $(PRODUCT_NAME) acessar a câmera para escanear códigos de barras.',
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
  },

  extra: {
    wsPort: process.env.EXPO_PUBLIC_WS_PORT || '3847',
    mdnsServiceType: process.env.EXPO_PUBLIC_MDNS_SERVICE_TYPE || '_giro._tcp',
    eas: {
      projectId: 'your-project-id',
    },
  },
});
