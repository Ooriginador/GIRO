/**
 * SettingsStore Tests
 */

import { useSettingsStore } from '@/stores/settingsStore';
import { act } from '@testing-library/react-native';

describe('settingsStore', () => {
  beforeEach(() => {
    // Reset store before each test
    act(() => {
      useSettingsStore.getState().reset();
    });
  });

  describe('scanner settings', () => {
    it('should have default scanner settings', () => {
      const state = useSettingsStore.getState();
      expect(state.scannerVibration).toBe(true);
      expect(state.scannerSound).toBe(true);
      expect(state.scannerTorch).toBe(false);
      expect(state.continuousScan).toBe(false);
    });

    it('should toggle sound setting', () => {
      act(() => {
        useSettingsStore.getState().setScannerSound(false);
      });

      expect(useSettingsStore.getState().scannerSound).toBe(false);

      act(() => {
        useSettingsStore.getState().setScannerSound(true);
      });

      expect(useSettingsStore.getState().scannerSound).toBe(true);
    });

    it('should toggle vibration setting', () => {
      act(() => {
        useSettingsStore.getState().setScannerVibration(false);
      });

      expect(useSettingsStore.getState().scannerVibration).toBe(false);
    });

    it('should toggle torch setting', () => {
      act(() => {
        useSettingsStore.getState().setScannerTorch(true);
      });

      expect(useSettingsStore.getState().scannerTorch).toBe(true);
    });

    it('should toggle continuous scan setting', () => {
      act(() => {
        useSettingsStore.getState().setContinuousScan(true);
      });

      expect(useSettingsStore.getState().continuousScan).toBe(true);
    });
  });

  describe('UI settings', () => {
    it('should have default UI settings', () => {
      const state = useSettingsStore.getState();
      expect(state.theme).toBe('system');
      expect(state.hapticFeedback).toBe(true);
      expect(state.showStockWarnings).toBe(true);
    });

    it('should change theme', () => {
      act(() => {
        useSettingsStore.getState().setTheme('dark');
      });

      expect(useSettingsStore.getState().theme).toBe('dark');

      act(() => {
        useSettingsStore.getState().setTheme('light');
      });

      expect(useSettingsStore.getState().theme).toBe('light');
    });

    it('should toggle haptic feedback', () => {
      act(() => {
        useSettingsStore.getState().setHapticFeedback(false);
      });

      expect(useSettingsStore.getState().hapticFeedback).toBe(false);
    });
  });

  describe('inventory settings', () => {
    it('should have default inventory settings', () => {
      const state = useSettingsStore.getState();
      expect(state.autoAdvanceOnCount).toBe(true);
      expect(state.confirmInventoryFinish).toBe(true);
    });

    it('should toggle auto advance on count', () => {
      act(() => {
        useSettingsStore.getState().setAutoAdvanceOnCount(false);
      });

      expect(useSettingsStore.getState().autoAdvanceOnCount).toBe(false);
    });
  });

  describe('notification settings', () => {
    it('should have default notification settings', () => {
      const state = useSettingsStore.getState();
      expect(state.stockAlerts).toBe(true);
      expect(state.expirationAlerts).toBe(true);
    });

    it('should toggle stock alerts', () => {
      act(() => {
        useSettingsStore.getState().setStockAlerts(false);
      });

      expect(useSettingsStore.getState().stockAlerts).toBe(false);
    });

    it('should toggle expiration alerts', () => {
      act(() => {
        useSettingsStore.getState().setExpirationAlerts(false);
      });

      expect(useSettingsStore.getState().expirationAlerts).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset all settings to defaults', () => {
      // Change some settings
      act(() => {
        useSettingsStore.getState().setScannerSound(false);
        useSettingsStore.getState().setTheme('dark');
        useSettingsStore.getState().setHapticFeedback(false);
      });

      // Reset
      act(() => {
        useSettingsStore.getState().reset();
      });

      // Verify defaults
      const state = useSettingsStore.getState();
      expect(state.scannerSound).toBe(true);
      expect(state.theme).toBe('system');
      expect(state.hapticFeedback).toBe(true);
    });
  });
});
