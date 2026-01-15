/**
 * @file useToast.test.ts - Testes para o hook de toast
 */

import { reducer, toast, toastError, toastSuccess, useToast } from '@/hooks/useToast';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('useToast Reducer', () => {
  it('should add a toast', () => {
    const initialState = { toasts: [] };
    const newToast = { id: '1', title: 'Test', open: true };
    const state = reducer(initialState, { type: 'ADD_TOAST', toast: newToast as any });
    expect(state.toasts).toHaveLength(1);
    expect(state.toasts[0]).toEqual(newToast);
  });

  it('should update a toast', () => {
    const initialState = { toasts: [{ id: '1', title: 'Old', open: true }] };
    const updatedToast = { id: '1', title: 'New' };
    const state = reducer(initialState, { type: 'UPDATE_TOAST', toast: updatedToast as any });
    expect(state.toasts[0].title).toBe('New');
  });

  it('should dismiss a toast', () => {
    const initialState = { toasts: [{ id: '1', title: 'Test', open: true }] };
    const state = reducer(initialState, { type: 'DISMISS_TOAST', toastId: '1' });
    expect(state.toasts[0].open).toBe(false);
  });

  it('should remove a toast', () => {
    const initialState = { toasts: [{ id: '1', title: 'Test', open: true }] };
    const state = reducer(initialState, { type: 'REMOVE_TOAST', toastId: '1' });
    expect(state.toasts).toHaveLength(0);
  });
});

describe('useToast Hook/Helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should add toast via helper', () => {
    act(() => {
      toastSuccess('Success Title', 'Success Desc');
    });

    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Success Title');
    expect(result.current.toasts[0].variant).toBe('default');
  });

  it('should add error toast via helper', () => {
    act(() => {
      toastError('Error Title', 'Error Desc');
    });

    const { result } = renderHook(() => useToast());
    // Note: toasts are added to a global memoryState, so we might have both
    const errorToast = result.current.toasts.find((t) => t.title === 'Error Title');
    expect(errorToast).toBeDefined();
    expect(errorToast?.variant).toBe('destructive');
  });

  it('should dismiss toast and eventually remove it', () => {
    let toastId: string;
    act(() => {
      const { id } = toast({ title: 'Tobe Dismissed' });
      toastId = id;
    });

    const { result } = renderHook(() => useToast());
    expect(result.current.toasts.some((t) => t.id === toastId)).toBe(true);

    act(() => {
      result.current.dismiss(toastId);
    });

    expect(result.current.toasts.find((t) => t.id === toastId)?.open).toBe(false);

    act(() => {
      vi.runAllTimers();
    });

    expect(result.current.toasts.some((t) => t.id === toastId)).toBe(false);
  });
});
