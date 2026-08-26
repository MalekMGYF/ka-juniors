import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kajuniors.app',
  appName: 'KA Juniors',
  webDir: 'public',
  server: {
    url: 'https://ka-juniors.vercel.app',
    cleartext: false,
    androidScheme: 'https'
  }
};

export default config;
