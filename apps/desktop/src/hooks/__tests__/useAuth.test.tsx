/**
 * @file useAuth.test.tsx - Testes para hooks de autenticação
 */

import { useLoginWithPassword, useLoginWithPin, useLogout } from '@/hooks/useAuth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock do Tauri invoke
vi.mock('@/lib/tauri', () => ({
  invoke: vi.fn(),
}));

// Mock do auth store
const mockLogin = vi.fn();
const mockLogout = vi.fn();

vi.mock('@/stores', () => ({
  useAuthStore: () => ({
    login: mockLogin,
    logout: mockLogout,
    employee: null,
    isAuthenticated: false,
  }),
}));

import { invoke } from '@/lib/tauri';
import fixtures from '@/test/fixtures';

// Test constants (non-sensitive placeholders)
const TEST_TOKEN_ABC = 'test-token-abc';
const TEST_TOKEN_XYZ = 'test-token-xyz';
const TEST_PASSWORD = 'test-password';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useAuth Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useLoginWithPin', () => {
    it('should call login on successful PIN login', async () => {
      const mockEmployee = { id: 'emp1', name: 'João', role: 'OPERATOR' };
      vi.mocked(invoke).mockResolvedValue({
        employee: mockEmployee,
        token: fixtures.TEST_TOKEN_USER,
      });

      const { result } = renderHook(() => useLoginWithPin(), { wrapper: createWrapper() });

      result.current.mutate(fixtures.TEST_PIN);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invoke).toHaveBeenCalledWith('login_with_pin', { pin: fixtures.TEST_PIN });
      expect(mockLogin).toHaveBeenCalledWith(mockEmployee);
    });

    it('should handle login error', async () => {
      vi.mocked(invoke).mockRejectedValue(new Error('PIN inválido'));

      const { result } = renderHook(() => useLoginWithPin(), { wrapper: createWrapper() });

      result.current.mutate('0000');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useLoginWithPassword', () => {
    it('should call login on successful password login', async () => {
      const mockEmployee = { id: 'emp2', name: 'Maria', role: 'ADMIN' };
      vi.mocked(invoke).mockResolvedValue({
        employee: mockEmployee,
        token: fixtures.TEST_TOKEN_ADMIN,
      });

      const { result } = renderHook(() => useLoginWithPassword(), { wrapper: createWrapper() });

      result.current.mutate({ cpf: '123.456.789-00', password: TEST_PASSWORD });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invoke).toHaveBeenCalledWith('login_with_password', {
        cpf: '123.456.789-00',
        password: TEST_PASSWORD,
      });
      expect(mockLogin).toHaveBeenCalledWith(mockEmployee);
    });
  });

  describe('useLogout', () => {
    it('should call logout on success', async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      const { result } = renderHook(() => useLogout(), { wrapper: createWrapper() });

      result.current.mutate();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invoke).toHaveBeenCalledWith('logout');
      expect(mockLogout).toHaveBeenCalled();
    });
  });
});
