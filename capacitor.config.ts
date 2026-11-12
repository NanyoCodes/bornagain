import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bornagainglobal.app',
  appName: 'Born Again',
  webDir: 'out',
  server: {
    // We point directly to your production URL to support Next.js Server Actions (AI Flows)
    url: 'https://bornagainglobal.com',
    allowNavigation: [
      'bornagainglobal.com',
      'studio-6220967431-56fe2.firebaseapp.com',
      'studio-6220967431-56fe2.web.app'
    ]
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
    backgroundColor: "#f97416"
  },
  ios: {
    contentInset: 'always'
  }
};

export default config;
