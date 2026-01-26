/**
 * Testes para RequestWorkflow component
 * @vitest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do Tauri
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { RequestWorkflow } from '../RequestWorkflow';

const mockRequest = {
  id: '1',
  requestNumber: 'REQ-001',
  status: 'DRAFT',
  priority: 'NORMAL',
  contractId: 'contract-1',
  contractName: 'Obra A',
  destinationLocationId: 'loc-1',
  destinationLocationName: 'Frente 1',
  requesterId: 'emp-1',
  requesterName: 'João Silva',
  createdAt: '2026-01-25T10:00:00Z',
  items: [
    { id: 'item-1', productId: 'prod-1', productName: 'Cimento', quantity: 10, unitPrice: 25.0 },
  ],
};

describe('RequestWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render workflow steps', () => {
    render(<RequestWorkflow request={mockRequest} onAction={vi.fn()} currentUserRole="ADMIN" />);

    // Verificar passos do workflow
    expect(screen.getByText('Rascunho')).toBeInTheDocument();
    expect(screen.getByText('Pendente')).toBeInTheDocument();
    expect(screen.getByText('Aprovado')).toBeInTheDocument();
    expect(screen.getByText('Separando')).toBeInTheDocument();
    expect(screen.getByText('Entregue')).toBeInTheDocument();
  });

  it('should highlight current step', () => {
    render(
      <RequestWorkflow
        request={{ ...mockRequest, status: 'PENDING' }}
        onAction={vi.fn()}
        currentUserRole="ADMIN"
      />
    );

    const pendingStep = screen.getByTestId('step-PENDING');
    expect(pendingStep).toHaveClass('text-primary');
  });

  it('should show submit button for DRAFT status', () => {
    render(<RequestWorkflow request={mockRequest} onAction={vi.fn()} currentUserRole="OPERATOR" />);

    expect(screen.getByRole('button', { name: /enviar/i })).toBeInTheDocument();
  });

  it('should show approve/reject buttons for PENDING status with MANAGER role', () => {
    render(
      <RequestWorkflow
        request={{ ...mockRequest, status: 'PENDING' }}
        onAction={vi.fn()}
        currentUserRole="MANAGER"
      />
    );

    expect(screen.getByRole('button', { name: /aprovar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /rejeitar/i })).toBeInTheDocument();
  });

  it('should not show approve button for OPERATOR role', () => {
    render(
      <RequestWorkflow
        request={{ ...mockRequest, status: 'PENDING' }}
        onAction={vi.fn()}
        currentUserRole="OPERATOR"
      />
    );

    expect(screen.queryByRole('button', { name: /aprovar/i })).not.toBeInTheDocument();
  });

  it('should show start separation button for APPROVED status', () => {
    render(
      <RequestWorkflow
        request={{ ...mockRequest, status: 'APPROVED' }}
        onAction={vi.fn()}
        currentUserRole="WAREHOUSE"
      />
    );

    expect(screen.getByRole('button', { name: /iniciar separação/i })).toBeInTheDocument();
  });

  it('should show deliver button for SEPARATING status', () => {
    render(
      <RequestWorkflow
        request={{ ...mockRequest, status: 'SEPARATING' }}
        onAction={vi.fn()}
        currentUserRole="WAREHOUSE"
      />
    );

    expect(screen.getByRole('button', { name: /confirmar entrega/i })).toBeInTheDocument();
  });

  it('should call onAction with correct action when button clicked', async () => {
    const onAction = vi.fn();

    render(
      <RequestWorkflow request={mockRequest} onAction={onAction} currentUserRole="OPERATOR" />
    );

    fireEvent.click(screen.getByRole('button', { name: /enviar/i }));

    await waitFor(() => {
      expect(onAction).toHaveBeenCalledWith('submit', mockRequest.id);
    });
  });

  it('should show rejection reason when rejected', () => {
    render(
      <RequestWorkflow
        request={{
          ...mockRequest,
          status: 'REJECTED',
          rejectionReason: 'Sem verba disponível',
        }}
        onAction={vi.fn()}
        currentUserRole="OPERATOR"
      />
    );

    expect(screen.getByText(/sem verba disponível/i)).toBeInTheDocument();
  });

  it('should display completed timestamp when delivered', () => {
    render(
      <RequestWorkflow
        request={{
          ...mockRequest,
          status: 'DELIVERED',
          deliveredAt: '2026-01-25T15:30:00Z',
        }}
        onAction={vi.fn()}
        currentUserRole="OPERATOR"
      />
    );

    expect(screen.getByText(/entregue em/i)).toBeInTheDocument();
  });
});

describe('RequestWorkflow - Edge Cases', () => {
  it('should handle cancelled request', () => {
    render(
      <RequestWorkflow
        request={{ ...mockRequest, status: 'CANCELLED' }}
        onAction={vi.fn()}
        currentUserRole="ADMIN"
      />
    );

    expect(screen.getByText(/cancelado/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /enviar|aprovar|rejeitar/i })
    ).not.toBeInTheDocument();
  });

  it('should handle loading state', () => {
    render(
      <RequestWorkflow
        request={mockRequest}
        onAction={vi.fn()}
        currentUserRole="ADMIN"
        isLoading={true}
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });
});
