/**
 * 🎨 useThemeEffect - Aplica tema no DOM
 *
 * Este hook deve ser chamado no App.tsx para garantir
 * que o tema é aplicado corretamente no load inicial
 */

import { useEffect } from 'react';
import { useSettingsStore } from '@/stores/settings-store';

/**
 * Aplica a classe do tema no elemento root do documento
 */
function applyTheme(theme: 'light' | 'dark' | 'system') {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');

  if (theme === 'system') {
    const systemTheme = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches
      ? 'dark'
      : 'light';
    root.classList.add(systemTheme);
  } else {
    root.classList.add(theme);
  }
}

/**
 * Hook para inicializar e sincronizar o tema
 * Deve ser chamado uma vez no App.tsx
 */
export function useThemeEffect() {
  const theme = useSettingsStore((state) => state.theme);

  // Aplica tema no mount e quando muda
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Escuta mudanças no tema do sistema
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyTheme('system');

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);
}

export default useThemeEffect;
