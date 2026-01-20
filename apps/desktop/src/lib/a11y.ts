/**
 * a11y helpers
 * Pequenos utilitários para tornar elementos interativos acessíveis via teclado
 */

export function clickableByKeyboard(handler: (e?: KeyboardEvent | MouseEvent) => void) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        // normalize to MouseEvent-like call
        handler(e as unknown as KeyboardEvent);
      }
    },
    onClick: (e: React.MouseEvent) => handler(e as unknown as MouseEvent),
  };
}

export function safeRestoreFocus(previous: Element | null) {
  try {
    (previous as HTMLElement | null)?.focus?.();
  } catch {
    // ignore
  }
}

export default { clickableByKeyboard, safeRestoreFocus };
