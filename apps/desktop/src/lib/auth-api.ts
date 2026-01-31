/**
 * API de Autenticação - Wrapper para comandos Tauri
 *
 * Centraliza todas as chamadas de autenticação do sistema
 */

import { invoke } from '@tauri-apps/api/core';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface LoginCredentials {
  username?: string;
  pin?: string;
  password?: string;
  cpf?: string;
}

export interface AuthResult {
  employee: SafeEmployee;
  token?: string;
  expiresAt?: string;
  authMethod: 'pin' | 'password';
  requiresPasswordChange: boolean;
}

export interface SafeEmployee {
  id: string;
  name: string;
  email?: string;
  cpf?: string;
  role: EmployeeRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type EmployeeRole =
  | 'ADMIN'
  | 'MANAGER'
  | 'CASHIER'
  | 'STOCKER'
  | 'CONTRACT_MANAGER'
  | 'SUPERVISOR';

export interface PasswordStrength {
  score: number; // 0-4
  feedback: string[];
  isValid: boolean;
  crackTimeDisplay: string;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecial: boolean;
  expiryDays: number;
  preventReuseCount: number;
}

export interface AccountStatus {
  isLocked: boolean;
  lockedUntil?: string;
  failedAttempts: number;
  maxAttempts: number;
  lockoutRemainingSeconds?: number;
}

export interface PasswordResetResponse {
  token: string;
  sentTo?: string;
  expiresAt: string;
}

export interface ChangePasswordRequest {
  employeeId: string;
  currentPassword?: string;
  newPassword: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

// ════════════════════════════════════════════════════════════════════════════
// LOGIN API
// ════════════════════════════════════════════════════════════════════════════

export const authApi = {
  /**
   * Login flexível com múltiplos métodos
   */
  login: (credentials: LoginCredentials): Promise<AuthResult> => {
    return invoke('login', { credentials });
  },

  /**
   * Login rápido com PIN (operadores)
   */
  loginWithPin: (pin: string): Promise<AuthResult> => {
    return invoke('login_with_pin', { pin });
  },

  /**
   * Login administrativo com username + senha
   */
  loginWithPassword: (username: string, password: string): Promise<AuthResult> => {
    return invoke('login_with_password', { username, password });
  },

  /**
   * Login alternativo com CPF + senha
   */
  loginWithCpf: (cpf: string, password: string): Promise<AuthResult> => {
    return invoke('login_with_cpf', { cpf, password });
  },

  /**
   * Logout (limpa sessão)
   */
  logout: (employeeId: string): Promise<void> => {
    return invoke('logout', { employeeId });
  },
};

// ════════════════════════════════════════════════════════════════════════════
// PASSWORD MANAGEMENT API
// ════════════════════════════════════════════════════════════════════════════

export const passwordApi = {
  /**
   * Altera senha do funcionário
   */
  changePassword: (request: ChangePasswordRequest): Promise<void> => {
    return invoke('change_password', { request });
  },

  /**
   * Solicita reset de senha por email
   */
  requestPasswordReset: (request: PasswordResetRequest): Promise<PasswordResetResponse> => {
    return invoke('request_password_reset', { request });
  },

  /**
   * Confirma reset de senha com token
   */
  resetPasswordWithToken: (request: PasswordResetConfirm): Promise<void> => {
    return invoke('reset_password_with_token', { request });
  },

  /**
   * Valida força da senha em tempo real
   */
  validatePassword: (password: string): Promise<PasswordStrength> => {
    return invoke('validate_password', { password });
  },

  /**
   * Obtém política de senha configurada
   */
  getPasswordPolicy: (): Promise<PasswordPolicy> => {
    return invoke('get_password_policy');
  },

  /**
   * Verifica se senha atual está correta
   */
  verifyCurrentPassword: (employeeId: string, password: string): Promise<boolean> => {
    return invoke('verify_current_password', { employeeId, password });
  },
};

// ════════════════════════════════════════════════════════════════════════════
// SECURITY API
// ════════════════════════════════════════════════════════════════════════════

export const securityApi = {
  /**
   * Verifica se conta está bloqueada
   */
  isAccountLocked: (employeeId: string): Promise<boolean> => {
    return invoke('is_account_locked', { employeeId });
  },

  /**
   * Obtém status completo da conta
   */
  getAccountStatus: (employeeId: string): Promise<AccountStatus> => {
    return invoke('get_account_status', { employeeId });
  },

  /**
   * Força desbloqueio de conta (apenas ADMIN)
   */
  unlockAccount: (employeeId: string, adminId: string): Promise<void> => {
    return invoke('unlock_account', { employeeId, adminId });
  },

  /**
   * Verifica se funcionário precisa trocar senha
   */
  requiresPasswordChange: (employeeId: string): Promise<boolean> => {
    return invoke('requires_password_change', { employeeId });
  },

  /**
   * Lista funcionários administrativos
   */
  listAdminEmployees: (): Promise<SafeEmployee[]> => {
    return invoke('list_admin_employees');
  },
};
