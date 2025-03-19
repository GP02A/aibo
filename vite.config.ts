/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy()
  ],
  build: {
    // Increase the warning limit to avoid unnecessary warnings
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Configure manual chunks for better code splitting
        manualChunks: (id) => {
          // Vendor chunks - use dynamic path matching instead of explicit lists
          if (id.includes('node_modules')) {
            if (id.includes('@ionic/react')) return 'vendor-ionic';
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) return 'vendor-react';
            if (id.includes('i18next')) return 'vendor-i18n';
            return 'vendor'; // Other vendor modules
          }
          
          // App code chunks - use dynamic path matching for better compatibility
          if (id.includes('/components/ChatInput') || 
              id.includes('/components/MessageBubble') || 
              id.includes('/components/ChatSidebar')) {
            return 'app-chat';
          }
          if (id.includes('/components/ApiSettings') || id.includes('/pages/Tab2')) {
            return 'app-settings';
          }
          if (id.includes('/services/ChatService')) {
            return 'app-services';
          }
          if (id.includes('/contexts/ConfigContext')) {
            return 'app-contexts';
          }
          
          // Default - no chunking for other files
          return null;
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
})
