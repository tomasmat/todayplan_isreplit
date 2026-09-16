import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      build: {
        outDir: 'dist',
        // Keep chunks reasonable for WebView performance
        chunkSizeWarningLimit: 1500,
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
        'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY),
        'process.env.ADMOB_BANNER_ID': JSON.stringify(env.ADMOB_BANNER_ID || ''),
        'process.env.ADMOB_REWARDED_ID': JSON.stringify(env.ADMOB_REWARDED_ID || ''),
        'process.env.ADMOB_USE_TEST_ADS': JSON.stringify(env.ADMOB_USE_TEST_ADS || 'true'),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
