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
    exclude: ['node_modules/', 'dist/', 'src-tauri/', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      all: true,
      clean: false,
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
        lines: 85,
        branches: 85,
        functions: 85,
        statements: 85,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    pool: 'forks',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@tauri-apps/api/tauri': resolve(__dirname, 'node_modules/@tauri-apps/api/tauri'),
    },
  },
});
