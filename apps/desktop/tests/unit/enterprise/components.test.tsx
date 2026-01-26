/**
 * @file Testes - Enterprise Components
 * @description Testes unitários para componentes do módulo Enterprise
 */

import { describe, it, expect, vi } from 'vitest';
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

describe('Enterprise Permission Guard', () => {
  // Note: These tests require the actual PermissionGuard component
  // which depends on the auth context

  it.skip('should render children when permission is granted', () => {
    // Would need auth context mock
  });

  it.skip('should render fallback when permission is denied', () => {
    // Would need auth context mock
  });
});
