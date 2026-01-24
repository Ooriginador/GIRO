/**
 * @file KeyboardShortcut.tsx - Componente de display de atalho de teclado
 *
 * Exibe atalhos de teclado de forma visual
 * Usado em botões e tooltips
 */

import { cn } from '@/lib/utils';
import React from 'react';

interface KeyboardShortcutProps {
  keys: string[];
  className?: string;
  size?: 'sm' | 'md';
}

export function KeyboardShortcut({ keys, className, size = 'sm' }: KeyboardShortcutProps) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {keys.map((key, index) => (
        <React.Fragment key={index}>
          <kbd
            className={cn(
              'inline-flex items-center justify-center rounded border',
              'bg-muted border-border font-sans font-medium',
              'shadow-[0_1px_0_1px_hsl(var(--border))]',
              size === 'sm' && 'px-1.5 py-0.5 text-[10px] min-w-[1.25rem]',
              size === 'md' && 'px-2 py-1 text-xs min-w-[1.5rem]'
            )}
          >
            {formatKey(key)}
          </kbd>
          {index < keys.length - 1 && (
            <span className="text-muted-foreground text-[10px] mx-0.5">+</span>
          )}
        </React.Fragment>
      ))}
    </span>
  );
}

/**
 * Formata teclas especiais para símbolos mais legíveis
 */
function formatKey(key: string): string {
  const keyMap: Record<string, string> = {
    ctrl: 'Ctrl',
    control: 'Ctrl',
    alt: 'Alt',
    shift: 'Shift',
    meta: '⌘',
    cmd: '⌘',
    command: '⌘',
    enter: '↵',
    return: '↵',
    escape: 'Esc',
    esc: 'Esc',
    backspace: '⌫',
    delete: 'Del',
    tab: 'Tab',
    space: '␣',
    up: '↑',
    down: '↓',
    left: '←',
    right: '→',
    home: 'Home',
    end: 'End',
    pageup: 'PgUp',
    pagedown: 'PgDn',
  };

  const lowerKey = key.toLowerCase();
  return keyMap[lowerKey] || key.toUpperCase();
}

/**
 * Hook para parsear string de atalho em array
 */
export function parseShortcut(shortcut: string): string[] {
  return shortcut.split('+').map((k) => k.trim());
}

/**
 * Componente de atalho com label
 */
interface LabeledShortcutProps {
  label: string;
  shortcut: string;
  className?: string;
}

export function LabeledShortcut({ label, shortcut, className }: LabeledShortcutProps) {
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <span className="text-sm">{label}</span>
      <KeyboardShortcut keys={parseShortcut(shortcut)} />
    </div>
  );
}

/**
 * Lista de atalhos comuns do PDV
 */
export const pdvShortcuts = [
  { label: 'Ajuda', shortcut: 'F1' },
  { label: 'Buscar produto', shortcut: 'F2' },
  { label: 'Alterar quantidade', shortcut: 'F4' },
  { label: 'Aplicar desconto', shortcut: 'F6' },
  { label: 'Pausar venda', shortcut: 'F8' },
  { label: 'Recuperar venda', shortcut: 'F9' },
  { label: 'Finalizar venda', shortcut: 'F10' },
  { label: 'Abrir gaveta', shortcut: 'F11' },
  { label: 'Remover último item', shortcut: 'F12' },
  { label: 'Limpar carrinho', shortcut: 'Esc' },
] as const;

/**
 * Atalhos padrão para módulos do ERP (Produtos, Clientes, OS, etc.)
 */
export const erpShortcuts = [
  { label: 'Ajuda', shortcut: 'F1' },
  { label: 'Novo / Criar', shortcut: 'F2' },
  { label: 'Focar Busca', shortcut: 'F3' },
  { label: 'Atualizar', shortcut: 'F5' },
  { label: 'Voltar / Fechar', shortcut: 'Esc' },
] as const;

export default KeyboardShortcut;
