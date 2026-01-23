/**
 * Hook para feedback háptico
 */

import { useSettingsStore } from '@stores/settingsStore';
import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

interface UseHapticsResult {
  trigger: (type?: HapticType) => Promise<void>;
  success: () => Promise<void>;
  warning: () => Promise<void>;
  error: () => Promise<void>;
  selection: () => Promise<void>;
  impact: (style?: 'light' | 'medium' | 'heavy') => Promise<void>;
}

export function useHaptics(): UseHapticsResult {
  const { hapticFeedback } = useSettingsStore();

  const trigger = useCallback(
    async (type: HapticType = 'medium') => {
      if (!hapticFeedback) return;

      try {
        switch (type) {
          case 'light':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            break;
          case 'medium':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            break;
          case 'heavy':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            break;
          case 'success':
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            break;
          case 'warning':
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            break;
          case 'error':
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            break;
          case 'selection':
            await Haptics.selectionAsync();
            break;
        }
      } catch {
        // Ignorar erros de haptics (pode não estar disponível no dispositivo)
      }
    },
    [hapticFeedback]
  );

  const success = useCallback(() => trigger('success'), [trigger]);
  const warning = useCallback(() => trigger('warning'), [trigger]);
  const error = useCallback(() => trigger('error'), [trigger]);
  const selection = useCallback(() => trigger('selection'), [trigger]);

  const impact = useCallback(
    async (style: 'light' | 'medium' | 'heavy' = 'medium') => {
      await trigger(style);
    },
    [trigger]
  );

  return {
    trigger,
    success,
    warning,
    error,
    selection,
    impact,
  };
}
