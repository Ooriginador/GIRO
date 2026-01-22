import { invoke } from '@/lib/tauri';
import { useAuthStore } from '@/stores';
import type { Employee } from '@/types';
import { useMutation } from '@tanstack/react-query';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

interface LoginWithPinResponse {
  employee: Employee;
  token: string;
}

interface LoginWithPasswordResponse {
  employee: Employee;
  token: string;
}

// ────────────────────────────────────────────────────────────────────────────
// MUTATIONS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Login com PIN (operadores)
 */
export function useLoginWithPin() {
  const { login } = useAuthStore();

  return useMutation({
    mutationFn: async (pin: string) => {
      const response = await invoke<LoginWithPinResponse>('login_with_pin', { pin });
      return response;
    },
    onSuccess: (data) => {
      login(data.employee);
    },
  });
}

/**
 * Login com senha (admins)
 */
export function useLoginWithPassword() {
  const { login } = useAuthStore();

  return useMutation({
    mutationFn: async (credentials: { cpf: string; password: string }) => {
      const response = await invoke<LoginWithPasswordResponse>('login_with_password', credentials);
      return response;
    },
    onSuccess: (data) => {
      login(data.employee);
    },
  });
}

/**
 * Logout
 */
export function useLogout() {
  const { logout } = useAuthStore();

  return useMutation({
    mutationFn: () => invoke<void>('logout'),
    onSuccess: () => {
      logout();
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// CUSTOM HOOK - AUTH
// ────────────────────────────────────────────────────────────────────────────

/**
 * Hook principal para autenticação
 */
export function useAuth() {
  const store = useAuthStore();
  const loginWithPin = useLoginWithPin();
  const loginWithPassword = useLoginWithPassword();
  const logoutMutation = useLogout();

  return {
    // Estado
    employee: store.employee,
    currentEmployee: store.employee, // alias
    isAuthenticated: store.isAuthenticated,

    // Loading states
    isLoggingIn: loginWithPin.isPending || loginWithPassword.isPending,
    isLoggingOut: logoutMutation.isPending,
    isRestoring: store.isRestoring,

    // Errors
    loginError: loginWithPin.error || loginWithPassword.error,

    // Actions
    loginWithPin: loginWithPin.mutateAsync,
    loginWithPassword: loginWithPassword.mutateAsync,
    logout: logoutMutation.mutate,
    restoreSession: store.restoreSession,

    // Permissions
    hasPermission: store.hasPermission,
  };
}
