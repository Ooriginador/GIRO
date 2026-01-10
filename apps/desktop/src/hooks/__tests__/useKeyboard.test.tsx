/**
 * @file useKeyboard.test.tsx - Testes para hook de atalhos de teclado
 */

import { useKeyboard, type KeyboardShortcut } from '@/hooks/use-keyboard';
import { fireEvent, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('useKeyboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const simulateKeyDown = (key: string, options: Partial<KeyboardEventInit> = {}) => {
    fireEvent.keyDown(window, { key, ...options });
  };

  it('should call action when shortcut key is pressed', () => {
    const action = vi.fn();
    const shortcuts: KeyboardShortcut[] = [{ key: 'F1', action }];

    renderHook(() => useKeyboard(shortcuts));

    simulateKeyDown('F1');

    expect(action).toHaveBeenCalledTimes(1);
  });

  it('should not call action when different key is pressed', () => {
    const action = vi.fn();
    const shortcuts: KeyboardShortcut[] = [{ key: 'F1', action }];

    renderHook(() => useKeyboard(shortcuts));

    simulateKeyDown('F2');

    expect(action).not.toHaveBeenCalled();
  });

  it('should handle Ctrl modifier', () => {
    const action = vi.fn();
    const shortcuts: KeyboardShortcut[] = [{ key: 'S', ctrl: true, action }];

    renderHook(() => useKeyboard(shortcuts));

    // Without Ctrl - should not trigger
    simulateKeyDown('S');
    expect(action).not.toHaveBeenCalled();

    // With Ctrl - should trigger
    simulateKeyDown('S', { ctrlKey: true });
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('should handle Shift modifier', () => {
    const action = vi.fn();
    const shortcuts: KeyboardShortcut[] = [{ key: 'A', shift: true, action }];

    renderHook(() => useKeyboard(shortcuts));

    simulateKeyDown('A');
    expect(action).not.toHaveBeenCalled();

    simulateKeyDown('A', { shiftKey: true });
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('should handle Alt modifier', () => {
    const action = vi.fn();
    const shortcuts: KeyboardShortcut[] = [{ key: 'N', alt: true, action }];

    renderHook(() => useKeyboard(shortcuts));

    simulateKeyDown('N');
    expect(action).not.toHaveBeenCalled();

    simulateKeyDown('N', { altKey: true });
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple modifiers', () => {
    const action = vi.fn();
    const shortcuts: KeyboardShortcut[] = [{ key: 'S', ctrl: true, shift: true, action }];

    renderHook(() => useKeyboard(shortcuts));

    // Only Ctrl
    simulateKeyDown('S', { ctrlKey: true });
    expect(action).not.toHaveBeenCalled();

    // Only Shift
    simulateKeyDown('S', { shiftKey: true });
    expect(action).not.toHaveBeenCalled();

    // Both Ctrl and Shift
    simulateKeyDown('S', { ctrlKey: true, shiftKey: true });
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple shortcuts', () => {
    const action1 = vi.fn();
    const action2 = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { key: 'F1', action: action1 },
      { key: 'F2', action: action2 },
    ];

    renderHook(() => useKeyboard(shortcuts));

    simulateKeyDown('F1');
    expect(action1).toHaveBeenCalledTimes(1);
    expect(action2).not.toHaveBeenCalled();

    simulateKeyDown('F2');
    expect(action1).toHaveBeenCalledTimes(1);
    expect(action2).toHaveBeenCalledTimes(1);
  });

  it('should not trigger when disabled', () => {
    const action = vi.fn();
    const shortcuts: KeyboardShortcut[] = [{ key: 'F1', action }];

    renderHook(() => useKeyboard(shortcuts, false));

    simulateKeyDown('F1');

    expect(action).not.toHaveBeenCalled();
  });

  it('should cleanup event listener on unmount', () => {
    const action = vi.fn();
    const shortcuts: KeyboardShortcut[] = [{ key: 'F1', action }];

    const { unmount } = renderHook(() => useKeyboard(shortcuts));

    simulateKeyDown('F1');
    expect(action).toHaveBeenCalledTimes(1);

    unmount();

    // After unmount, action should not be called
    simulateKeyDown('F1');
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('should be case insensitive for key matching', () => {
    const action = vi.fn();
    const shortcuts: KeyboardShortcut[] = [{ key: 'a', action }];

    renderHook(() => useKeyboard(shortcuts));

    simulateKeyDown('A');

    expect(action).toHaveBeenCalledTimes(1);
  });

  it('should handle function keys (F1-F12) even in inputs', () => {
    const action = vi.fn();
    const shortcuts: KeyboardShortcut[] = [{ key: 'F10', action }];

    renderHook(() => useKeyboard(shortcuts));

    // Create and focus an input
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    // F10 should still trigger in input (function keys are allowed)
    fireEvent.keyDown(input, { key: 'F10' });
    expect(action).toHaveBeenCalledTimes(1);

    document.body.removeChild(input);
  });
});
