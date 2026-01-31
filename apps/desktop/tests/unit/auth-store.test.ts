import { authApi } from '@/lib/auth-api';
import { useAuthStore } from '@/stores/auth-store';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock do auth-api
vi.mock('@/lib/auth-api', () => ({
  authApi: {
    loginWithPassword: vi.fn(),
    loginWithPin: vi.fn(),
    logout: vi.fn(),
  },
  passwordApi: {
    changePassword: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPasswordWithToken: vi.fn(),
    validatePassword: vi.fn(),
    getPasswordPolicy: vi.fn(),
    verifyCurrentPassword: vi.fn(),
  },
}));

describe('useAuthStore', () => {
  beforeEach(() => {
    // Resetar estado da store (persistência pode complicar, mas useAuthStore.setState limpa)
    useAuthStore.setState({
      employee: null,
      currentUser: null,
      currentSession: null,
      isAuthenticated: false,
      mustChangePassword: false,
      authMethod: null,
    });
    vi.clearAllMocks();
  });

  it('loginWithPassword deve autenticar usuário e salvar estado', async () => {
    const mockEmployee = {
      id: '1',
      name: 'Admin User',
      role: 'ADMIN',
    };

    vi.mocked(authApi.loginWithPassword).mockResolvedValueOnce({
      employee: mockEmployee,
      authMethod: 'password',
      requiresPasswordChange: false,
    });

    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.loginWithPassword('admin', '123456');
    });

    expect(authApi.loginWithPassword).toHaveBeenCalledWith('admin', '123456');

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.employee).toEqual(mockEmployee);
    expect(result.current.authMethod).toBe('PASSWORD');
    expect(result.current.mustChangePassword).toBe(false);
  });

  it('loginWithPassword deve setar mustChangePassword se backend exigir', async () => {
    const mockEmployee = {
      id: '2',
      name: 'New User',
      role: 'CASHIER',
    };

    vi.mocked(authApi.loginWithPassword).mockResolvedValueOnce({
      employee: mockEmployee,
      authMethod: 'password',
      requiresPasswordChange: true,
    });

    const { result } = renderHook(() => useAuthStore());

    // Expecting logic to throw error or handle it - store throws 'PASSWORD_CHANGE_REQUIRED'
    let error;
    try {
      await act(async () => {
        await result.current.loginWithPassword('newuser', '1234');
      });
    } catch (e: any) {
      error = e;
    }

    expect(error).toBeDefined();
    expect(error.message).toBe('PASSWORD_CHANGE_REQUIRED');

    // Verify state directly to avoid issues with renderHook updates after thrown errors
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.mustChangePassword).toBe(true);
  });

  it('hasPermission deve validar hierarquia corretamente', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      useAuthStore.setState({
        employee: { id: '1', name: 'Gerente', role: 'MANAGER' },
      });
    });

    // MANAGER tem acesso a MANAGER e abaixo
    expect(result.current.hasPermission('MANAGER')).toBe(true);
    expect(result.current.hasPermission('CASHIER')).toBe(true);

    // MANAGER não tem acesso a ADMIN
    expect(result.current.hasPermission('ADMIN')).toBe(false);
  });

  it('hasPermission deve validar permissões granulares', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      useAuthStore.setState({
        employee: { id: '1', name: 'Caixa', role: 'CASHIER' },
      });
    });

    // CASHIER pode vender
    expect(result.current.hasPermission('pdv.sell')).toBe(true);

    // CASHIER não pode dar desconto ilimitado
    expect(result.current.hasPermission('pdv.discount.unlimited')).toBe(false);
  });
});
