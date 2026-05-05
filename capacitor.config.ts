/// <reference types="@capawesome/capacitor-android-edge-to-edge-support" />
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.todayplan.app',
  appName: 'TodayPlan',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: true,
    backgroundColor: '#0f172a',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1e40af',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark',
    },
    // Restores pre-Android-15 behavior: the WebView is offset below the status
    // bar and navigation bar on Android 15+, so web content (including the
    // sticky header) never overlaps the system UI. The status bar gets its own
    // opaque background color set here.
    EdgeToEdge: {
      statusBarColor: '#ffffff',
      navigationBarColor: '#ffffff',
    },
  },
};

export default config;
