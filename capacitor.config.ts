import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.derrickappah.kart',
  appName: 'KART',
  webDir: 'out',
  server: {
    url: 'https://kart-murex.vercel.app',
    cleartext: true
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '619280398298-k61jk3980dbvd0b9k15ai63l6pp56v4g.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
  android: {
    overrideUserAgent: "Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36"
  }
};

export default config;
