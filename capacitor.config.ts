import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.capacitor.standard',
  appName: 'CapacitorStandard',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    App: {
      deepLinkingEnabled: true,
      deepLinkingScheme: 'com.capacitor.standard',
    },
  },
  ios: {
    contentInset: 'never',
  },
};

export default config;
