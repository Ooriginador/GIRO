/**
 * @file vitest.config.ts - Configuração do Vitest
 */

import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/', 'dist/', 'src-tauri/', 'tests/e2e/**', 'tests/debug/**'],
    coverage: {
      provider: 'istanbul', // Alterado de v8 para istanbul (mais estável com imports dinâmicos)
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      all: false,
      clean: true,
      exclude: [
        'node_modules/',
        'dist/**',
        'tests/**',
        'src/test/**',
        'src-tauri/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/**',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/__tests__/**',
        'playwright-report/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
      thresholds: {
        lines: 50,
        branches: 40,
        functions: 45,
        statements: 50,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    pool: 'threads', // Alterado de forks para threads (melhor para coverage)
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@tauri-apps/api/tauri': resolve(__dirname, 'node_modules/@tauri-apps/api/tauri'),
    },
  },
});
