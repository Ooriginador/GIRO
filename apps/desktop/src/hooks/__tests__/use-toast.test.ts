/**
 * @file use-toast.test.ts - Testes para o hook de toast (versão padronizada)
 */

import { reducer, useToast } from '@/hooks/use-toast';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('use-toast Reducer', () => {
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
    expect(state.toasts[0]?.title).toBe('New');
  });

  it('should dismiss a toast', () => {
    const initialState = { toasts: [{ id: '1', title: 'Test', open: true }] };
    const state = reducer(initialState, { type: 'DISMISS_TOAST', toastId: '1' });
    expect(state.toasts[0]?.open).toBe(false);
  });

  it('should remove all toasts if toastId is undefined', () => {
    const initialState = {
      toasts: [
        { id: '1', title: 'T1' },
        { id: '2', title: 'T2' },
      ],
    };
    const state = reducer(initialState as any, { type: 'REMOVE_TOAST', toastId: undefined });
    expect(state.toasts).toHaveLength(0);
  });
});

describe('use-toast Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should update toast', () => {
    const { result } = renderHook(() => useToast());
    let toastRef: any;

    act(() => {
      toastRef = result.current.toast({ title: 'Initial' });
    });

    act(() => {
      toastRef.update({ id: toastRef.id, title: 'Updated' });
    });

    expect(result.current.toasts.find((t) => t.id === toastRef.id)?.title).toBe('Updated');
  });

  it('should call dismiss when onOpenChange is called with false', () => {
    const { result } = renderHook(() => useToast());
    let toastRef: any;

    act(() => {
      toastRef = result.current.toast({ title: 'Test' });
    });

    const addedToast = result.current.toasts.find((t) => t.id === toastRef.id);
    expect(addedToast?.open).toBe(true);

    act(() => {
      if (addedToast?.onOpenChange) {
        addedToast.onOpenChange(false);
      }
    });

    expect(result.current.toasts.find((t) => t.id === toastRef.id)?.open).toBe(false);
  });

  it('should add toast via success method', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.success('Success Title', 'Success Desc');
    });

    expect(result.current.toasts).toContainEqual(
      expect.objectContaining({
        title: 'Success Title',
        description: 'Success Desc',
        variant: 'default',
      })
    );
  });

  it('should add toast via error method', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.error('Error Title', 'Error Desc');
    });

    const errorToast = result.current.toasts.find((t) => t.title === 'Error Title');
    expect(errorToast).toBeDefined();
    expect(errorToast?.variant).toBe('destructive');
  });

  it('should dismiss toast', () => {
    const { result } = renderHook(() => useToast());
    let toastId: string;

    act(() => {
      const { id } = result.current.toast({ title: 'Tobe Dismissed' });
      toastId = id;
    });

    expect(result.current.toasts.some((t) => t.id === toastId)).toBe(true);

    act(() => {
      result.current.dismiss(toastId);
    });

    expect(result.current.toasts.find((t) => t.id === toastId)?.open).toBe(false);
  });
});
