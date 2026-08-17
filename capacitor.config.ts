import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'errand-runner-app',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: [
      'gateway.errandly.site',
      '*.errandly.site',
      'errandly.site',
      'ais-dev-sfwiwu2qvvdcyzjabft4um-22650132817.europe-west1.run.app',
      'action-backend-api-798918228047.us-west1.run.app'
    ]
  }
};

export default config;
