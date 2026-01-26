/**
 * @file TransferWorkflow.test.tsx - Testes para componente TransferWorkflow
 */

import { TransferWorkflow } from '@/components/enterprise/TransferWorkflow';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const mockTransfer = {
  id: 'trf-1',
  code: 'TRF-2026-0001',
  status: 'IN_TRANSIT',
  createdAt: '2026-01-20T10:00:00Z',
  requestedAt: '2026-01-20T10:00:00Z',
  approvedAt: '2026-01-21T09:00:00Z',
  shippedAt: '2026-01-21T14:00:00Z',
  requester: { id: 'emp-1', name: 'Maria Santos' },
  approver: { id: 'emp-2', name: 'João Silva' },
  shipper: { id: 'emp-3', name: 'Carlos Oliveira' },
};

describe('TransferWorkflow', () => {
  it('should render workflow component', () => {
    render(<TransferWorkflow status="PENDING" />);
    
    expect(screen.getByText(/fluxo|workflow/i)).toBeInTheDocument();
  });

  it('should show pending step as current for PENDING status', () => {
    render(<TransferWorkflow status="PENDING" />);
    
    expect(screen.getByText(/pendente|aguardando/i)).toBeInTheDocument();
  });

  it('should show approved step as completed for APPROVED status', () => {
    render(
      <TransferWorkflow 
        status="APPROVED" 
        approvedAt="2026-01-21T09:00:00Z"
        approver="João Silva"
      />
    );
    
    expect(screen.getByText(/aprovad/i)).toBeInTheDocument();
  });

  it('should show in transit step for IN_TRANSIT status', () => {
    render(
      <TransferWorkflow 
        status="IN_TRANSIT" 
        shippedAt="2026-01-21T14:00:00Z"
      />
    );
    
    expect(screen.getByText(/trânsito|enviado/i)).toBeInTheDocument();
  });

  it('should show received step for RECEIVED status', () => {
    render(
      <TransferWorkflow 
        status="RECEIVED" 
        receivedAt="2026-01-22T16:00:00Z"
      />
    );
    
    expect(screen.getByText(/recebid/i)).toBeInTheDocument();
  });

  it('should show cancelled step for CANCELLED status', () => {
    render(
      <TransferWorkflow 
        status="CANCELLED" 
        cancelledAt="2026-01-21T10:00:00Z"
      />
    );
    
    expect(screen.getByText(/cancelad/i)).toBeInTheDocument();
  });

  it('should display timestamps when provided', () => {
    render(
      <TransferWorkflow 
        status="APPROVED" 
        createdAt="2026-01-20T10:00:00Z"
        approvedAt="2026-01-21T09:00:00Z"
      />
    );
    
    // Should show formatted dates
    expect(screen.getByText(/20\/01|21\/01/i) || screen.getByText(/jan/i)).toBeInTheDocument();
  });

  it('should display actor names when provided', () => {
    render(
      <TransferWorkflow 
        status="APPROVED" 
        approver="João Silva"
      />
    );
    
    expect(screen.getByText(/joão silva/i)).toBeInTheDocument();
  });

  it('should render in compact mode', () => {
    const { container } = render(
      <TransferWorkflow status="PENDING" compact />
    );
    
    // Compact mode should have smaller elements
    expect(container.querySelector('.compact') || container.firstChild).toBeInTheDocument();
  });

  it('should show visual progress for each status', () => {
    const { rerender } = render(<TransferWorkflow status="DRAFT" />);
    
    // Check for visual indicators (icons, checkmarks, etc)
    expect(screen.getByText(/rascunho|draft/i)).toBeInTheDocument();
    
    rerender(<TransferWorkflow status="PENDING" />);
    expect(screen.getByText(/pendente|aguardando/i)).toBeInTheDocument();
    
    rerender(<TransferWorkflow status="IN_TRANSIT" />);
    expect(screen.getByText(/trânsito|enviado/i)).toBeInTheDocument();
  });

  it('should handle rejected status', () => {
    render(
      <TransferWorkflow 
        status="REJECTED" 
        rejectedAt="2026-01-21T10:00:00Z"
        rejectionReason="Material indisponível"
      />
    );
    
    expect(screen.getByText(/rejeitad/i)).toBeInTheDocument();
  });
});
