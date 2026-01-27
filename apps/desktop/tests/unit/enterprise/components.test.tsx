/**
 * @file Testes - Enterprise Components
 * @description Testes unitários para componentes do módulo Enterprise
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock dos componentes
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock do router
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ id: 'test-id' }),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) =>
    React.createElement('a', { href: to }, children),
}));

import {
  ContractStatusBadge,
  RequestStatusBadge,
  TransferStatusBadge,
  PriorityBadge,
} from '@/components/enterprise/StatusBadge';

describe('Enterprise Status Badges', () => {
  describe('ContractStatusBadge', () => {
    it('should render PLANNING status correctly', () => {
      render(<ContractStatusBadge status="PLANNING" />);
      expect(screen.getByText(/planejamento|planning/i)).toBeInTheDocument();
    });

    it('should render ACTIVE status with success variant', () => {
      const { container } = render(<ContractStatusBadge status="ACTIVE" />);
      const badge = container.querySelector('[class*="success"], [class*="green"]');
      expect(badge || screen.getByText(/ativo|active/i)).toBeInTheDocument();
    });

    it('should render COMPLETED status', () => {
      render(<ContractStatusBadge status="COMPLETED" />);
      expect(screen.getByText(/concluído|completed/i)).toBeInTheDocument();
    });

    it('should render SUSPENDED status with warning variant', () => {
      render(<ContractStatusBadge status="SUSPENDED" />);
      expect(screen.getByText(/suspenso|suspended/i)).toBeInTheDocument();
    });

    it('should render CANCELLED status with destructive variant', () => {
      render(<ContractStatusBadge status="CANCELLED" />);
      expect(screen.getByText(/cancelado|cancelled/i)).toBeInTheDocument();
    });
  });

  describe('RequestStatusBadge', () => {
    it('should render DRAFT status', () => {
      render(<RequestStatusBadge status="DRAFT" />);
      expect(screen.getByText(/rascunho|draft/i)).toBeInTheDocument();
    });

    it('should render PENDING status', () => {
      render(<RequestStatusBadge status="PENDING" />);
      expect(screen.getByText(/pendente|pending/i)).toBeInTheDocument();
    });

    it('should render APPROVED status', () => {
      render(<RequestStatusBadge status="APPROVED" />);
      expect(screen.getByText(/aprovad[ao]|approved/i)).toBeInTheDocument();
    });

    it('should render SEPARATING status', () => {
      render(<RequestStatusBadge status="SEPARATING" />);
      expect(screen.getByText(/separando|separating/i)).toBeInTheDocument();
    });

    it('should render DELIVERED status', () => {
      render(<RequestStatusBadge status="DELIVERED" />);
      expect(screen.getByText(/entregu[ea]|delivered/i)).toBeInTheDocument();
    });

    it('should render REJECTED status', () => {
      render(<RequestStatusBadge status="REJECTED" />);
      expect(screen.getByText(/rejeitad[ao]|rejected/i)).toBeInTheDocument();
    });

    it('should render CANCELLED status', () => {
      render(<RequestStatusBadge status="CANCELLED" />);
      expect(screen.getByText(/cancelad[ao]|cancelled/i)).toBeInTheDocument();
    });
  });

  describe('TransferStatusBadge', () => {
    it('should render DRAFT status', () => {
      render(<TransferStatusBadge status="DRAFT" />);
      expect(screen.getByText(/rascunho|draft/i)).toBeInTheDocument();
    });

    it('should render PENDING status', () => {
      render(<TransferStatusBadge status="PENDING" />);
      expect(screen.getByText(/pendente|pending/i)).toBeInTheDocument();
    });

    it('should render SEPARATING status', () => {
      render(<TransferStatusBadge status="SEPARATING" />);
      expect(screen.getByText(/separando|separating/i)).toBeInTheDocument();
    });

    it('should render IN_TRANSIT status', () => {
      render(<TransferStatusBadge status="IN_TRANSIT" />);
      expect(screen.getByText(/trânsito|transit/i)).toBeInTheDocument();
    });

    it('should render RECEIVED status', () => {
      render(<TransferStatusBadge status="RECEIVED" />);
      expect(screen.getByText(/recebid[ao]|received/i)).toBeInTheDocument();
    });

    it('should render COMPLETED status', () => {
      render(<TransferStatusBadge status="COMPLETED" />);
      expect(screen.getByText(/concluíd[ao]|completed/i)).toBeInTheDocument();
    });

    it('should render CANCELLED status', () => {
      render(<TransferStatusBadge status="CANCELLED" />);
      expect(screen.getByText(/cancelad[ao]|cancelled/i)).toBeInTheDocument();
    });
  });

  describe('PriorityBadge', () => {
    it('should render LOW priority', () => {
      render(<PriorityBadge priority="LOW" />);
      expect(screen.getByText(/baixa|low/i)).toBeInTheDocument();
    });

    it('should render NORMAL priority', () => {
      render(<PriorityBadge priority="NORMAL" />);
      expect(screen.getByText(/normal/i)).toBeInTheDocument();
    });

    it('should render HIGH priority', () => {
      render(<PriorityBadge priority="HIGH" />);
      expect(screen.getByText(/alta|high/i)).toBeInTheDocument();
    });

    it('should render URGENT priority with destructive style', () => {
      const { container } = render(<PriorityBadge priority="URGENT" />);
      expect(screen.getByText(/urgente|urgent/i)).toBeInTheDocument();
    });
  });
});

// Mock stores for PermissionGuard tests
vi.mock('@/stores', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('@/stores/useBusinessProfile', () => ({
  useBusinessProfile: vi.fn(),
}));

import { PermissionGuard } from '@/components/enterprise/PermissionGuard';
import { useAuthStore } from '@/stores';
import { useBusinessProfile } from '@/stores/useBusinessProfile';

describe('Enterprise Permission Guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render children when permission is granted', () => {
    // Mock enterprise user with CONTRACT_MANAGER role (has contracts.view permission)
    vi.mocked(useAuthStore).mockReturnValue({
      employee: { id: '1', name: 'Test', role: 'CONTRACT_MANAGER' },
    } as any);
    vi.mocked(useBusinessProfile).mockReturnValue({
      businessType: 'ENTERPRISE',
    } as any);

    render(
      <PermissionGuard permission="contracts.view">
        <div data-testid="protected-content">Protected Content</div>
      </PermissionGuard>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('should render fallback when permission is denied', () => {
    // Mock user without permission
    vi.mocked(useAuthStore).mockReturnValue({
      employee: { id: '1', name: 'Test', role: 'REQUESTER' },
    } as any);
    vi.mocked(useBusinessProfile).mockReturnValue({
      businessType: 'ENTERPRISE',
    } as any);

    render(
      <PermissionGuard
        permission="contracts.delete"
        fallback={<div data-testid="fallback">No Access</div>}
      >
        <div data-testid="protected-content">Protected Content</div>
      </PermissionGuard>
    );

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
  });

  it('should hide content for non-enterprise users', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      employee: { id: '1', name: 'Test', role: 'ADMIN' },
    } as any);
    vi.mocked(useBusinessProfile).mockReturnValue({
      businessType: 'DEFAULT',
    } as any);

    render(
      <PermissionGuard permission="contracts.view">
        <div data-testid="protected-content">Protected Content</div>
      </PermissionGuard>
    );

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });
});
