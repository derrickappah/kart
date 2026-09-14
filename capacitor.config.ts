import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.derrickappah.kart',
  appName: 'KART',
  webDir: 'out',
  server: {
    url: 'https://www.kart.cx',
    errorPath: 'offline.html',
    allowNavigation: [
      'kart.cx',
      '*.kart.cx',
      'kart-murex.vercel.app'
    ]
  },
  android: {
    overrideUserAgent: "Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36"
  }
};

export default config;
