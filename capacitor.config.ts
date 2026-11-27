import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ci.savaa.app',
  appName: 'SAVAA',
  webDir: 'apps/mobile/dist',
  server: {
    androidScheme: 'https',
  },
  backgroundColor: '#145C3A',
};

export default config;
