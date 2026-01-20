/// <reference types="vitest" />
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tauri-apps/api/tauri': path.resolve(__dirname, 'node_modules/@tauri-apps/api/tauri'),
    },
  },

  optimizeDeps: {
    entries: ['index.html'],
  },

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    clearMocks: true,
    exclude: ['node_modules', 'dist', 'tests/e2e/**'],
  },

  // Configurações específicas para Tauri
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },

  // Variáveis de ambiente
  envPrefix: ['VITE_', 'TAURI_'],

  build: {
    // Tauri suporta es2021
    target: process.env.TAURI_PLATFORM == 'windows' ? 'chrome105' : 'safari13',
    // Não minificar em debug
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    // Sourcemaps para debug
    sourcemap: !!process.env.TAURI_DEBUG,
    // Output directory
    outDir: 'dist',
  },
});
