/**
 * @file useCashSession.test.tsx - Testes para hooks de sessão de caixa
 */

import {
  useAddCashMovement,
  useCashSession,
  useCloseCashSession,
  useOpenCashSession,
} from '@/hooks/use-cash-session';
import { createWrapper } from '@/test/test-utils';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock do Tauri
vi.mock('@/lib/tauri', () => ({
  getCurrentCashSession: vi.fn(),
  openCashSession: vi.fn(),
  closeCashSession: vi.fn(),
  addCashMovement: vi.fn(),
}));

const { getCurrentCashSession, openCashSession, closeCashSession, addCashMovement } = await import(
  '@/lib/tauri'
);

describe('Cash Session Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useCashSession', () => {
    it('should fetch current cash session', async () => {
      const mockSession = {
        id: 'session-1',
        employeeId: 'emp-1',
        openingBalance: 200,
        status: 'OPEN' as const,
        openedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(getCurrentCashSession).mockResolvedValue(mockSession);

      const { result } = renderHook(() => useCashSession(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockSession);
      expect(getCurrentCashSession).toHaveBeenCalled();
    });

    it('should return null when no session is open', async () => {
      vi.mocked(getCurrentCashSession).mockResolvedValue(null);

      const { result } = renderHook(() => useCashSession(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe('useOpenCashSession', () => {
    it('should open a new cash session', async () => {
      const mockSession = {
        id: 'session-new',
        employeeId: 'emp-1',
        openingBalance: 500,
        status: 'OPEN' as const,
        openedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(openCashSession).mockResolvedValue(mockSession);

      const { result } = renderHook(() => useOpenCashSession(), {
        wrapper: createWrapper(),
      });

      const input = {
        employeeId: 'emp-1',
        openingBalance: 500,
      };

      result.current.mutate(input);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(openCashSession).toHaveBeenCalledWith(input);
      expect(result.current.data).toEqual(mockSession);
    });

    it('should handle error when opening session fails', async () => {
      vi.mocked(openCashSession).mockRejectedValue(new Error('Session already open'));

      const { result } = renderHook(() => useOpenCashSession(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        employeeId: 'emp-1',
        openingBalance: 200,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useCloseCashSession', () => {
    it('should close cash session successfully', async () => {
      const closedSession = {
        id: 'session-1',
        employeeId: 'emp-1',
        openedAt: new Date().toISOString(),
        closedAt: new Date().toISOString(),
        openingBalance: 500,
        actualBalance: 750,
        status: 'CLOSED' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(closeCashSession).mockResolvedValue(closedSession);

      const { result } = renderHook(() => useCloseCashSession(), {
        wrapper: createWrapper(),
      });

      const input = {
        id: 'session-1',
        actualBalance: 750,
      };

      result.current.mutate(input);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(closeCashSession).toHaveBeenCalledWith(input);
    });
  });

  describe('useAddCashMovement', () => {
    it('should add cash withdrawal (sangria)', async () => {
      vi.mocked(addCashMovement).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAddCashMovement(), {
        wrapper: createWrapper(),
      });

      const input = {
        type: 'WITHDRAWAL' as const,
        amount: 100,
        description: 'Sangria de caixa',
      };

      result.current.mutate(input);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(addCashMovement).toHaveBeenCalledWith(input);
    });

    it('should add cash deposit (suprimento)', async () => {
      vi.mocked(addCashMovement).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAddCashMovement(), {
        wrapper: createWrapper(),
      });

      const input = {
        type: 'DEPOSIT' as const,
        amount: 200,
        description: 'Suprimento de troco',
      };

      result.current.mutate(input);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(addCashMovement).toHaveBeenCalledWith(input);
    });
  });
});
