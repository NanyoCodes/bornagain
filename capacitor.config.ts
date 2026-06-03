import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.testifyglobal.app',
  appName: 'Testify',
  webDir: 'out',
  server: {
    // We point directly to your production URL to support Next.js Server Actions (AI Flows)
    url: 'https://testifyglobal.com',
    allowNavigation: [
      'testifyglobal.com',
      'studio-6220967431-56fe2.firebaseapp.com',
      'studio-6220967431-56fe2.web.app'
    ]
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  }
};

export default config;
