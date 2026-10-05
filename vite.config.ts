import { defineConfig, loadEnv } from 'vite';
import { assertSafeFrontendEnv } from './src/backend/supabaseEnv.ts';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  assertSafeFrontendEnv({ ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env });
  return {
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      // Phase 52: precache the self-hosted Thai font so the app looks the same offline
      workbox: { globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'] },
      manifest: {
        name: 'V2U — Vocational to University',
        short_name: 'V2U',
        description: 'เส้นทางสายอาชีพสู่มหาวิทยาลัย — จากจุดที่คุณอยู่ → สู่มหาวิทยาลัยที่คุณต้องการ',
        theme_color: '#1e3a8a', // blue-900
        background_color: '#f9fafb', // gray-50
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  };
});
