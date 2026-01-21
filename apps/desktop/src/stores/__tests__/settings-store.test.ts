/**
 * @file settings-store.test.ts - Testes para Settings store
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useCompany,
  usePDVConfig,
  usePrinter,
  useScale,
  useSettingsStore,
  useSidebar,
  useTheme,
} from '../settings-store';

// Mock do DOM para setTheme
const mockClassList = {
  add: vi.fn(),
  remove: vi.fn(),
};

Object.defineProperty(document, 'documentElement', {
  value: { classList: mockClassList },
  writable: true,
});

// matchMedia is controlled by the global test setup; individual tests override when needed

describe('Settings Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStore.getState().resetSettings();
  });

  describe('theme', () => {
    it('should have default theme as system', () => {
      expect(useSettingsStore.getState().theme).toBe('system');
    });

    it('should set theme to light', () => {
      useSettingsStore.getState().setTheme('light');

      expect(useSettingsStore.getState().theme).toBe('light');
      expect(mockClassList.remove).toHaveBeenCalledWith('light', 'dark');
      expect(mockClassList.add).toHaveBeenCalledWith('light');
    });

    it('should set theme to dark', () => {
      useSettingsStore.getState().setTheme('dark');

      expect(useSettingsStore.getState().theme).toBe('dark');
      expect(mockClassList.add).toHaveBeenCalledWith('dark');
    });

    it('should apply system theme based on preference', () => {
      const originalMatchMedia = (window as any).matchMedia;
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: true,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      try {
        useSettingsStore.getState().setTheme('system');

        expect(useSettingsStore.getState().theme).toBe('system');
        // Mock retorna dark para matchMedia
        expect(mockClassList.add).toHaveBeenCalledWith('dark');
      } finally {
        Object.defineProperty(window, 'matchMedia', { writable: true, value: originalMatchMedia });
      }
    });
  });

  describe('sidebar', () => {
    it('should have sidebar expanded by default', () => {
      expect(useSettingsStore.getState().sidebarCollapsed).toBe(false);
    });

    it('should toggle sidebar state', () => {
      useSettingsStore.getState().toggleSidebar();
      expect(useSettingsStore.getState().sidebarCollapsed).toBe(true);

      useSettingsStore.getState().toggleSidebar();
      expect(useSettingsStore.getState().sidebarCollapsed).toBe(false);
    });

    it('should set sidebar collapsed directly', () => {
      useSettingsStore.getState().setSidebarCollapsed(true);
      expect(useSettingsStore.getState().sidebarCollapsed).toBe(true);

      useSettingsStore.getState().setSidebarCollapsed(false);
      expect(useSettingsStore.getState().sidebarCollapsed).toBe(false);
    });
  });

  describe('company', () => {
    it('should have default company info', () => {
      const company = useSettingsStore.getState().company;

      expect(company.name).toBe('Minha Mercearia');
      expect(company.cnpj).toBe('');
    });

    it('should update company info partially', () => {
      useSettingsStore.getState().setCompany({
        name: 'Nova Mercearia',
        cnpj: '12.345.678/0001-90',
      });

      const company = useSettingsStore.getState().company;
      expect(company.name).toBe('Nova Mercearia');
      expect(company.cnpj).toBe('12.345.678/0001-90');
      // Outros campos devem manter valores padrão
      expect(company.tradeName).toBe('');
    });

    it('should merge company updates', () => {
      useSettingsStore.getState().setCompany({ name: 'Mercearia A' });
      useSettingsStore.getState().setCompany({ phone: '11999999999' });

      const company = useSettingsStore.getState().company;
      expect(company.name).toBe('Mercearia A');
      expect(company.phone).toBe('11999999999');
    });
  });

  describe('printer', () => {
    it('should have printer disabled by default', () => {
      expect(useSettingsStore.getState().printer.enabled).toBe(false);
    });

    it('should update printer config', () => {
      useSettingsStore.getState().setPrinter({
        enabled: true,
        type: 'NETWORK',
        ip: '192.168.1.100',
      });

      const printer = useSettingsStore.getState().printer;
      expect(printer.enabled).toBe(true);
      expect(printer.type).toBe('NETWORK');
      expect(printer.ip).toBe('192.168.1.100');
      // Valores padrão mantidos
      expect(printer.model).toBe('EPSON TM-T20X');
    });

    it('should support USB printer config', () => {
      useSettingsStore.getState().setPrinter({
        enabled: true,
        type: 'USB',
        port: '/dev/usb/lp0',
      });

      const printer = useSettingsStore.getState().printer;
      expect(printer.type).toBe('USB');
      expect(printer.port).toBe('/dev/usb/lp0');
    });
  });

  describe('scale', () => {
    it('should have scale disabled by default', () => {
      expect(useSettingsStore.getState().scale.enabled).toBe(false);
    });

    it('should update scale config', () => {
      useSettingsStore.getState().setScale({
        enabled: true,
        port: 'COM3',
        baudRate: 4800,
      });

      const scale = useSettingsStore.getState().scale;
      expect(scale.enabled).toBe(true);
      expect(scale.port).toBe('COM3');
      expect(scale.baudRate).toBe(4800);
    });
  });
  describe('fiscal config', () => {
    it('should have sensible fiscal defaults', () => {
      const fiscal = useSettingsStore.getState().fiscal;
      expect(fiscal.enabled).toBe(false);
      expect(fiscal.environment).toBe(2);
      expect(fiscal.uf).toBe('SP');
    });

    it('should update fiscal config', () => {
      useSettingsStore.getState().setFiscalConfig({
        enabled: true,
        csc: 'ABCD',
        serie: 2,
      });

      const fiscal = useSettingsStore.getState().fiscal;
      expect(fiscal.enabled).toBe(true);
      expect(fiscal.csc).toBe('ABCD');
      expect(fiscal.serie).toBe(2);
    });
  });

  describe('pdv config', () => {
    it('should have sensible PDV defaults', () => {
      const pdv = useSettingsStore.getState().pdv;

      expect(pdv.allowNegativeStock).toBe(false);
      expect(pdv.autoFocusBarcode).toBe(true);
      expect(pdv.soundEnabled).toBe(true);
      expect(pdv.showStockOnSearch).toBe(true);
    });

    it('should update PDV config', () => {
      useSettingsStore.getState().setPDVConfig({
        allowNegativeStock: true,
        soundEnabled: false,
      });

      const pdv = useSettingsStore.getState().pdv;
      expect(pdv.allowNegativeStock).toBe(true);
      expect(pdv.soundEnabled).toBe(false);
      // Outros mantidos
      expect(pdv.autoFocusBarcode).toBe(true);
    });
  });

  describe('alerts', () => {
    it('should have alerts enabled by default', () => {
      expect(useSettingsStore.getState().alertsEnabled).toBe(true);
    });

    it('should toggle alerts enabled', () => {
      useSettingsStore.getState().setAlertsEnabled(false);
      expect(useSettingsStore.getState().alertsEnabled).toBe(false);

      useSettingsStore.getState().setAlertsEnabled(true);
      expect(useSettingsStore.getState().alertsEnabled).toBe(true);
    });
  });

  describe('resetSettings', () => {
    it('should reset all settings to defaults', () => {
      // Modificar vários settings
      useSettingsStore.getState().setTheme('dark');
      useSettingsStore.getState().setSidebarCollapsed(true);
      useSettingsStore.getState().setCompany({ name: 'Changed' });
      useSettingsStore.getState().setPrinter({ enabled: true });

      // Reset
      useSettingsStore.getState().resetSettings();

      const state = useSettingsStore.getState();
      expect(state.theme).toBe('system');
      expect(state.sidebarCollapsed).toBe(false);
      expect(state.company.name).toBe('Minha Mercearia');
      expect(state.printer.enabled).toBe(false);
    });
  });

  describe('Hooks', () => {
    it('useTheme should return theme and setTheme', () => {
      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('system');
      act(() => {
        result.current.setTheme('dark');
      });
      expect(useSettingsStore.getState().theme).toBe('dark');
    });

    it('useSidebar should return sidebar state', () => {
      const { result } = renderHook(() => useSidebar());

      expect(result.current.collapsed).toBe(false);
      act(() => {
        result.current.toggle();
      });
      expect(result.current.collapsed).toBe(true);
    });

    it('useCompany should return company state', () => {
      const { result } = renderHook(() => useCompany());

      expect(result.current.company.name).toBe('Minha Mercearia');
      act(() => {
        result.current.setCompany({ name: 'Hook Test' });
      });
      expect(result.current.company.name).toBe('Hook Test');
    });

    it('usePrinter should return printer state', () => {
      const { result } = renderHook(() => usePrinter());

      expect(result.current.isEnabled).toBe(false);
      act(() => {
        result.current.setPrinter({ enabled: true });
      });
      expect(result.current.isEnabled).toBe(true);
    });

    it('useScale should return scale state', () => {
      const { result } = renderHook(() => useScale());

      expect(result.current.isEnabled).toBe(false);
      act(() => {
        result.current.setScale({ enabled: true });
      });
      expect(result.current.isEnabled).toBe(true);
    });

    it('usePDVConfig should return pdv config and setConfig', () => {
      const { result } = renderHook(() => usePDVConfig());

      expect(result.current.allowNegativeStock).toBe(false);
      act(() => {
        result.current.setConfig({ allowNegativeStock: true });
      });
      expect(result.current.allowNegativeStock).toBe(true);
    });
  });
});
