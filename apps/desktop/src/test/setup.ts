/**
 * @file setup.ts - Configuração global dos testes Vitest
 */

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup após cada teste
afterEach(() => {
  cleanup();
});

// Mock do Tauri invoke (não disponível no ambiente de teste)
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock do crypto.randomUUID para stores que usam
if (!globalThis.crypto) {
  globalThis.crypto = {
    randomUUID: () => Math.random().toString(36).substring(7),
  } as Crypto;
}

// Mock do window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Polyfill para scrollIntoView (usado pelo Radix UI / cmdk)
if (!window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
}

// Polyfill para PointerEvent (usado pelo Radix UI)
if (!window.PointerEvent) {
  class PointerEvent extends MouseEvent {
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
    }
  }
  window.PointerEvent = PointerEvent as any;
}

// Mock Pointer Capture methods (Radix UI)
window.HTMLElement.prototype.hasPointerCapture = vi.fn();
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();

// Silenciar logs de erro esperados durante os testes para reduzir ruído
const originalError = console.error;
console.error = (...args: unknown[]) => {
  const message = typeof args[0] === 'string' ? args[0] : '';
  if (
    message.includes('Erro ao buscar clientes') ||
    message.includes('Erro ao buscar cliente') ||
    message.includes('Error: Open Fail') ||
    message.includes('Error: API Fail') ||
    message.includes('License initialization timed out') ||
    message.includes('License validation failed') ||
    message.includes('Falha ao inicializar verificação de licença')
  ) {
    return;
  }
  originalError.apply(console, args);
};

// Mock ResizeObserver (usado pelo Radix UI)
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
