import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.myhouse.app',
  appName: 'My House',
  webDir: 'dist',
  backgroundColor: '#14283f',
  android: { allowMixedContent: false },
  plugins: { Keyboard: { resizeOnFullScreen: true }, SystemBars: { insetsHandling: 'css', initialViewportFitValueHint: 'cover', style: 'LIGHT' } },
};
export default config;
