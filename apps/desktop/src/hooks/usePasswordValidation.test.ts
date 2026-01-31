import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePasswordValidation } from './usePasswordValidation';

// Mock dependencies
const mockPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecial: false,
  expiryDays: 90,
  preventReuseCount: 3,
};

// Partial mock for react-query
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: mockPolicy,
    isLoading: false,
    error: null,
  }),
}));

// Mock auth-api
vi.mock('@/lib/auth-api', () => ({
  passwordApi: {
    getPasswordPolicy: vi.fn(),
  },
}));

describe('usePasswordValidation', () => {
  it('should validate valid password', () => {
    const { result } = renderHook(() => usePasswordValidation('Valid123'));

    expect(result.current.isValid).toBe(true);
    expect(result.current.errors).toHaveLength(0);
  });

  it('should fail on short password', () => {
    const { result } = renderHook(() => usePasswordValidation('Short1'));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toContain('Mínimo de 8 caracteres');
  });

  it('should fail on missing uppercase', () => {
    const { result } = renderHook(() => usePasswordValidation('lowercase123'));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toContain('Pelo menos uma letra maiúscula');
  });

  it('should fail on missing lowercase', () => {
    const { result } = renderHook(() => usePasswordValidation('UPPERCASE123'));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toContain('Pelo menos uma letra minúscula');
  });

  it('should fail on missing number', () => {
    const { result } = renderHook(() => usePasswordValidation('NoNumbersHere'));

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toContain('Pelo menos um número');
  });
});
