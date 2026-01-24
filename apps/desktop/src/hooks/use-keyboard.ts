/**
 * @file useKeyboard - Hook para atalhos de teclado
 * @description Gerencia atalhos de teclado globais e por contexto
 */

import { useCallback, useEffect } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description?: string;
}

/**
 * Hook para registrar atalhos de teclado
 */
export function useKeyboard(shortcuts: KeyboardShortcut[], enabled = true) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Ignora se estiver digitando em input/textarea
      const target = event.target as HTMLElement;
      const isTyping =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      for (const shortcut of shortcuts) {
        const keyMatch =
          event.key.toUpperCase() === shortcut.key.toUpperCase() || event.code === shortcut.key;

        const ctrlMatch = shortcut.ctrl
          ? event.ctrlKey || event.metaKey
          : !event.ctrlKey && !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        // Para teclas de função (F1-F12), permite mesmo em inputs
        const isFunctionKey = event.key.startsWith('F') && event.key.length <= 3;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          if (!isTyping || isFunctionKey || shortcut.ctrl || shortcut.alt) {
            event.preventDefault();
            shortcut.action();
            break;
          }
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Atalhos padrão do PDV
 */
export const PDV_SHORTCUTS = {
  HELP: 'F1',
  SEARCH: 'F2',
  QUANTITY: 'F4',
  DISCOUNT: 'F6',
  HOLD: 'F8',
  RESUME: 'F9',
  FINALIZE: 'F10',
  DRAWER: 'F11',
  CANCEL_ITEM: 'F12',
  CANCEL: 'Escape',
};

/**
 * Hook para atalhos do PDV
 */
export function usePDVKeyboard(handlers: {
  onHelp?: () => void;
  onSearch?: () => void;
  onQuantity?: () => void;
  onDiscount?: () => void;
  onHold?: () => void;
  onResume?: () => void;
  onFinalize?: () => void;
  onDrawer?: () => void;
  onCancelItem?: () => void;
  onCancel?: () => void;
}) {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: PDV_SHORTCUTS.HELP,
      action: () => handlers.onHelp?.(),
      description: 'Ajuda',
    },
    {
      key: PDV_SHORTCUTS.SEARCH,
      action: () => handlers.onSearch?.(),
      description: 'Buscar produto',
    },
    {
      key: PDV_SHORTCUTS.QUANTITY,
      action: () => handlers.onQuantity?.(),
      description: 'Alterar quantidade',
    },
    {
      key: PDV_SHORTCUTS.DISCOUNT,
      action: () => handlers.onDiscount?.(),
      description: 'Aplicar desconto',
    },
    {
      key: PDV_SHORTCUTS.HOLD,
      action: () => handlers.onHold?.(),
      description: 'Pausar venda',
    },
    {
      key: PDV_SHORTCUTS.RESUME,
      action: () => handlers.onResume?.(),
      description: 'Recuperar venda',
    },
    {
      key: PDV_SHORTCUTS.FINALIZE,
      action: () => handlers.onFinalize?.(),
      description: 'Finalizar venda',
    },
    {
      key: PDV_SHORTCUTS.DRAWER,
      action: () => handlers.onDrawer?.(),
      description: 'Abrir gaveta',
    },
    {
      key: PDV_SHORTCUTS.CANCEL_ITEM,
      action: () => handlers.onCancelItem?.(),
      description: 'Cancelar item',
    },
    {
      key: PDV_SHORTCUTS.CANCEL,
      action: () => handlers.onCancel?.(),
      description: 'Cancelar operação',
    },
  ];

  useKeyboard(shortcuts);

  return { shortcuts };
}
