/**
 * usePasswordValidation - Hook para validação de senha em tempo real
 */

import { passwordApi, type PasswordPolicy } from '@/lib/auth-api';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  policy: PasswordPolicy | null;
}

export const usePasswordValidation = (password: string) => {
  // Carregar política de senha
  const { data: policy } = useQuery({
    queryKey: ['password-policy'],
    queryFn: passwordApi.getPasswordPolicy,
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
  });

  // Validar senha conforme política
  const validation = useMemo((): PasswordValidationResult => {
    if (!policy || !password) {
      return { isValid: false, errors: [], policy: null };
    }

    const errors: string[] = [];

    // Tamanho mínimo
    if (password.length < policy.minLength) {
      errors.push(`Mínimo de ${policy.minLength} caracteres`);
    }

    // Letra maiúscula
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Pelo menos uma letra maiúscula');
    }

    // Letra minúscula
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Pelo menos uma letra minúscula');
    }

    // Número
    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Pelo menos um número');
    }

    // Caractere especial
    if (policy.requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Pelo menos um caractere especial (!@#$%^&*)');
    }

    return {
      isValid: errors.length === 0,
      errors,
      policy,
    };
  }, [password, policy]);

  return validation;
};
