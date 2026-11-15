import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.myhouse.app',
  appName: 'My House',
  webDir: 'dist',
  backgroundColor: '#14283f',
  android: { allowMixedContent: false },
  plugins: { StatusBar: { overlaysWebView: false, style: 'LIGHT', backgroundColor: '#ffffff' } },
};
export default config;
