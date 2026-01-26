/**
 * @file RequestApprovalModal.test.tsx - Testes para modal de aprovação
 */

import { RequestApprovalModal } from '@/components/enterprise/RequestApprovalModal';
import { useApproveRequest, useRejectRequest } from '@/hooks/enterprise';
import { createQueryWrapper } from '@/test/queryWrapper';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock hooks
const mockApprove = vi.fn();
const mockReject = vi.fn();

vi.mock('@/hooks/enterprise', () => ({
  useApproveRequest: vi.fn(() => ({
    mutateAsync: mockApprove,
    isPending: false,
  })),
  useRejectRequest: vi.fn(() => ({
    mutateAsync: mockReject,
    isPending: false,
  })),
}));

const mockRequest = {
  id: 'req-1',
  requestNumber: 'REQ-2026-0001',
  status: 'PENDING',
  priority: 'NORMAL',
  createdAt: '2026-01-20T10:00:00Z',
  requester: { id: 'emp-1', name: 'João Silva', role: 'REQUESTER' },
  contract: { id: 'contract-1', name: 'Obra Industrial' },
  items: [
    { id: 'item-1', productName: 'Cimento', requestedQty: 50, unit: 'SC' },
    { id: 'item-2', productName: 'Areia', requestedQty: 10, unit: 'M3' },
  ],
};

describe('RequestApprovalModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApprove.mockResolvedValue({});
    mockReject.mockResolvedValue({});
  });

  it('should render modal when open', () => {
    render(
      <RequestApprovalModal 
        request={mockRequest as any}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createQueryWrapper() }
    );

    expect(screen.getByText('REQ-2026-0001')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(
      <RequestApprovalModal 
        request={mockRequest as any}
        open={false}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createQueryWrapper() }
    );

    expect(screen.queryByText('REQ-2026-0001')).not.toBeInTheDocument();
  });

  it('should display request details', () => {
    render(
      <RequestApprovalModal 
        request={mockRequest as any}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createQueryWrapper() }
    );

    expect(screen.getByText(/joão silva/i)).toBeInTheDocument();
    expect(screen.getByText(/obra industrial/i)).toBeInTheDocument();
  });

  it('should display items list', () => {
    render(
      <RequestApprovalModal 
        request={mockRequest as any}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createQueryWrapper() }
    );

    expect(screen.getByText(/cimento/i)).toBeInTheDocument();
    expect(screen.getByText(/areia/i)).toBeInTheDocument();
  });

  it('should show approve button', () => {
    render(
      <RequestApprovalModal 
        request={mockRequest as any}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createQueryWrapper() }
    );

    expect(screen.getByRole('button', { name: /aprovar/i })).toBeInTheDocument();
  });

  it('should show reject button', () => {
    render(
      <RequestApprovalModal 
        request={mockRequest as any}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createQueryWrapper() }
    );

    expect(screen.getByRole('button', { name: /rejeitar/i })).toBeInTheDocument();
  });

  it('should call approve on button click', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <RequestApprovalModal 
        request={mockRequest as any}
        open={true}
        onOpenChange={onOpenChange}
      />,
      { wrapper: createQueryWrapper() }
    );

    const approveButton = screen.getByRole('button', { name: /aprovar/i });
    await user.click(approveButton);

    await waitFor(() => {
      expect(mockApprove).toHaveBeenCalledWith('req-1');
    });
  });

  it('should require reason for rejection', async () => {
    const user = userEvent.setup();

    render(
      <RequestApprovalModal 
        request={mockRequest as any}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createQueryWrapper() }
    );

    const rejectButton = screen.getByRole('button', { name: /rejeitar/i });
    await user.click(rejectButton);

    // Should show rejection reason input
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/motivo|razão/i) || 
             screen.getByLabelText(/motivo|razão/i)).toBeInTheDocument();
    });
  });

  it('should call reject with reason', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <RequestApprovalModal 
        request={mockRequest as any}
        open={true}
        onOpenChange={onOpenChange}
      />,
      { wrapper: createQueryWrapper() }
    );

    const rejectButton = screen.getByRole('button', { name: /rejeitar/i });
    await user.click(rejectButton);

    await waitFor(async () => {
      const reasonInput = screen.getByPlaceholderText(/motivo|razão/i) || 
                         screen.getByLabelText(/motivo|razão/i);
      await user.type(reasonInput, 'Material não disponível');
      
      const confirmButton = screen.getByRole('button', { name: /confirmar/i });
      await user.click(confirmButton);
    });

    await waitFor(() => {
      expect(mockReject).toHaveBeenCalledWith({
        id: 'req-1',
        reason: 'Material não disponível',
      });
    });
  });

  it('should close modal after successful action', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <RequestApprovalModal 
        request={mockRequest as any}
        open={true}
        onOpenChange={onOpenChange}
      />,
      { wrapper: createQueryWrapper() }
    );

    const approveButton = screen.getByRole('button', { name: /aprovar/i });
    await user.click(approveButton);

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
