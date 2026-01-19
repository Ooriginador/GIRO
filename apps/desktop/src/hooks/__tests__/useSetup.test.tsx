/**
 * @file useSetup.test.tsx - Tests for useSetup hooks
 */

import { useCreateFirstAdmin, useHasAdmin } from '@/hooks/useSetup';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock invoke
const mockInvoke = vi.fn();
vi.mock('@/lib/tauri', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useHasAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true when admin exists', async () => {
    mockInvoke.mockResolvedValue(true);

    const { result } = renderHook(() => useHasAdmin(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(true);
    expect(mockInvoke).toHaveBeenCalledWith('has_admin');
  });

  it('should return false when no admin exists', async () => {
    mockInvoke.mockResolvedValue(false);

    const { result } = renderHook(() => useHasAdmin(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(false);
  });

  it('should be loading initially', () => {
    mockInvoke.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useHasAdmin(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });
});

describe('useCreateFirstAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create first admin successfully', async () => {
    const mockEmployee = {
      id: 'emp-1',
      name: 'Admin',
      email: 'admin@test.com',
      role: 'ADMIN',
      isActive: true,
    };
    mockInvoke.mockResolvedValue(mockEmployee);

    const { result } = renderHook(() => useCreateFirstAdmin(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      name: 'Admin',
      email: 'admin@test.com',
      pin: '1234',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockInvoke).toHaveBeenCalledWith('create_first_admin', {
      input: {
        name: 'Admin',
        email: 'admin@test.com',
        pin: '1234',
      },
    });
    expect(result.current.data).toEqual(mockEmployee);
  });

  it('should create admin without email', async () => {
    const mockEmployee = {
      id: 'emp-1',
      name: 'Admin',
      role: 'ADMIN',
      isActive: true,
    };
    mockInvoke.mockResolvedValue(mockEmployee);

    const { result } = renderHook(() => useCreateFirstAdmin(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      name: 'Admin',
      pin: '5678',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockInvoke).toHaveBeenCalledWith('create_first_admin', {
      input: {
        name: 'Admin',
        pin: '5678',
      },
    });
  });

  it('should handle creation error', async () => {
    mockInvoke.mockRejectedValue(new Error('Admin already exists'));

    const { result } = renderHook(() => useCreateFirstAdmin(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      name: 'Admin',
      pin: '1234',
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Admin already exists');
  });
});
