/**
 * @file useAlerts.test.tsx - Testes para hooks de alertas
 */

import {
  useAlertsQuery,
  useDismissAlert,
  useMarkAlertAsRead,
  useRefreshAlerts,
  useUnreadAlertsCount,
} from '@/hooks/useAlerts';
import * as tauriLib from '@/lib/tauri';
import type { Alert } from '@/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock completo do Tauri
vi.mock('@/lib/tauri', () => ({
  getAlerts: vi.fn(),
  getUnreadAlertsCount: vi.fn(),
  markAlertAsRead: vi.fn(),
  dismissAlert: vi.fn(),
  refreshAlerts: vi.fn(),
}));

// Mock do alert store
const mockSetAlerts = vi.fn();
const mockSetLoading = vi.fn();
const mockSetUnreadCount = vi.fn();
const mockMarkAsRead = vi.fn();
const mockDismissAlert = vi.fn();

vi.mock('@/stores', () => ({
  useAlertStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      setAlerts: mockSetAlerts,
      setLoading: mockSetLoading,
      setUnreadCount: mockSetUnreadCount,
      markAsRead: mockMarkAsRead,
      dismissAlert: mockDismissAlert,
    };
    return selector ? selector(state) : state;
  },
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

const mockAlert: Alert = {
  id: 'alert-1',
  type: 'LOW_STOCK',
  severity: 'WARNING',
  title: 'Estoque Baixo',
  message: 'Produto X está com estoque baixo',
  productId: 'prod-1',
  productName: 'Produto Teste',
  isRead: false,
  isDismissed: false,
  createdAt: new Date().toISOString(),
};

describe('useAlertsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch alerts successfully', async () => {
    const alerts = [mockAlert];
    vi.mocked(tauriLib.getAlerts).mockResolvedValue(alerts);

    const { result } = renderHook(() => useAlertsQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(alerts);
    expect(mockSetAlerts).toHaveBeenCalledWith(alerts);
  });

  it('should set loading state during fetch', async () => {
    vi.mocked(tauriLib.getAlerts).mockResolvedValue([]);

    const { result } = renderHook(() => useAlertsQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockSetLoading).toHaveBeenCalledWith(true);
    expect(mockSetLoading).toHaveBeenCalledWith(false);
  });

  it('should handle fetch error', async () => {
    vi.mocked(tauriLib.getAlerts).mockRejectedValue(new Error('Database error'));

    const { result } = renderHook(() => useAlertsQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(mockSetLoading).toHaveBeenCalledWith(false);
  });
});

describe('useUnreadAlertsCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch unread count', async () => {
    vi.mocked(tauriLib.getUnreadAlertsCount).mockResolvedValue(5);

    const { result } = renderHook(() => useUnreadAlertsCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(5);
    expect(mockSetUnreadCount).toHaveBeenCalledWith(5);
  });

  it('should return zero when no unread alerts', async () => {
    vi.mocked(tauriLib.getUnreadAlertsCount).mockResolvedValue(0);

    const { result } = renderHook(() => useUnreadAlertsCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(0);
  });
});

describe('useMarkAlertAsRead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should mark alert as read', async () => {
    vi.mocked(tauriLib.markAlertAsRead).mockResolvedValue(undefined);

    const { result } = renderHook(() => useMarkAlertAsRead(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('alert-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(tauriLib.markAlertAsRead).toHaveBeenCalledWith('alert-1');
    expect(mockMarkAsRead).toHaveBeenCalledWith('alert-1');
  });
});

describe('useDismissAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should dismiss alert', async () => {
    vi.mocked(tauriLib.dismissAlert).mockResolvedValue(undefined);

    const { result } = renderHook(() => useDismissAlert(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('alert-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(tauriLib.dismissAlert).toHaveBeenCalledWith('alert-1');
    expect(mockDismissAlert).toHaveBeenCalledWith('alert-1');
  });
});

describe('useRefreshAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should refresh alerts', async () => {
    vi.mocked(tauriLib.refreshAlerts).mockResolvedValue(undefined);

    const { result } = renderHook(() => useRefreshAlerts(), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(tauriLib.refreshAlerts).toHaveBeenCalled();
  });
});
