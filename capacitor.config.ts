import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.derrickappah.kart',
  appName: 'KART',
  webDir: 'out',
  server: {
    url: 'https://kart-murex.vercel.app',
    cleartext: true
  }
};

export default config;
