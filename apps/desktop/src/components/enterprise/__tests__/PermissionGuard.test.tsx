/**
 * @file PermissionGuard.test.tsx - Testes para componente PermissionGuard
 */

import { PermissionGuard } from '@/components/enterprise/PermissionGuard';
import { useEnterprisePermission } from '@/hooks/useEnterprisePermission';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock hooks
vi.mock('@/hooks/useEnterprisePermission', () => ({
  useEnterprisePermission: vi.fn(),
}));

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({
    employee: { id: 'emp-1', name: 'Test User', role: 'MANAGER' },
    isAuthenticated: true,
  }),
}));

describe('PermissionGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render children when user has permission', () => {
    vi.mocked(useEnterprisePermission).mockReturnValue({
      hasPermission: () => true,
      isLoading: false,
    } as any);

    render(
      <PermissionGuard permission="contracts.read">
        <div>Protected Content</div>
      </PermissionGuard>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should not render children when user lacks permission', () => {
    vi.mocked(useEnterprisePermission).mockReturnValue({
      hasPermission: () => false,
      isLoading: false,
    } as any);

    render(
      <PermissionGuard permission="contracts.delete">
        <div>Protected Content</div>
      </PermissionGuard>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should render fallback when provided and permission denied', () => {
    vi.mocked(useEnterprisePermission).mockReturnValue({
      hasPermission: () => false,
      isLoading: false,
    } as any);

    render(
      <PermissionGuard 
        permission="contracts.delete" 
        fallback={<div>Access Denied</div>}
      >
        <div>Protected Content</div>
      </PermissionGuard>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it('should show loading state while checking permissions', () => {
    vi.mocked(useEnterprisePermission).mockReturnValue({
      hasPermission: () => false,
      isLoading: true,
    } as any);

    render(
      <PermissionGuard permission="contracts.read">
        <div>Protected Content</div>
      </PermissionGuard>
    );

    // Should not render content while loading
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should handle multiple permissions with AND logic', () => {
    vi.mocked(useEnterprisePermission).mockReturnValue({
      hasPermission: (perm: string) => perm === 'contracts.read',
      isLoading: false,
    } as any);

    render(
      <PermissionGuard permissions={['contracts.read', 'contracts.write']} requireAll>
        <div>Protected Content</div>
      </PermissionGuard>
    );

    // Should not render because user doesn't have all permissions
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should handle multiple permissions with OR logic', () => {
    vi.mocked(useEnterprisePermission).mockReturnValue({
      hasPermission: (perm: string) => perm === 'contracts.read',
      isLoading: false,
    } as any);

    render(
      <PermissionGuard permissions={['contracts.read', 'contracts.write']} requireAll={false}>
        <div>Protected Content</div>
      </PermissionGuard>
    );

    // Should render because user has at least one permission
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should handle role-based permissions', () => {
    vi.mocked(useEnterprisePermission).mockReturnValue({
      hasPermission: () => true,
      isLoading: false,
    } as any);

    render(
      <PermissionGuard roles={['MANAGER', 'ADMIN']}>
        <div>Manager Content</div>
      </PermissionGuard>
    );

    expect(screen.getByText('Manager Content')).toBeInTheDocument();
  });
});
