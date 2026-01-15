import { WarrantyDetails } from '@/components/motoparts/WarrantyDetails';
import { useWarranties, useWarrantyDetails } from '@/hooks/useWarranties';
import { useAuthStore } from '@/stores/auth-store';
import { createQueryWrapper } from '@/test/queryWrapper';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dos hooks
vi.mock('@/hooks/useWarranties', () => ({
  useWarranties: vi.fn(),
  useWarrantyDetails: vi.fn(),
  WarrantyUtils: {
    getStatusColor: () => 'text-blue-600',
    getStatusLabel: (s: string) => s,
    getSourceTypeLabel: (s: string) => s,
    getResolutionTypeLabel: (s: string) => s,
    canApprove: (s: string) => s === 'OPEN',
    canResolve: (s: string) => s === 'APPROVED',
  },
}));

// Mock do auth store
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: vi.fn(),
}));

// Mock do toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

const { Wrapper: queryWrapper } = createQueryWrapper();

describe('WarrantyDetails', () => {
  const mockWarrantyDetails = {
    claim: {
      id: 'w-1',
      status: 'OPEN',
      reason: 'Defeito de fábrica',
      description: 'Bateria não segura carga',
      source_type: 'SALE',
      source_id: 's-1',
      created_at: '2023-10-27T20:00:00Z',
    },
    customer_name: 'João Silva',
    product_name: 'Bateria Heliar 5Ah',
    source_number: '123',
  };

  const approveAsync = vi.fn();
  const denyAsync = vi.fn();
  const resolveAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthStore).mockReturnValue({
      employee: { id: 'emp-1', name: 'Carlos Teste' },
    } as any);

    vi.mocked(useWarranties).mockReturnValue({
      approveWarranty: { mutateAsync: approveAsync },
      denyWarranty: { mutateAsync: denyAsync },
      resolveWarranty: { mutateAsync: resolveAsync },
    } as any);
  });

  const renderComponent = () => {
    return render(<WarrantyDetails warrantyId="w-1" onBack={vi.fn()} />, {
      wrapper: queryWrapper,
    });
  };

  it('should render warranty details in OPEN status', () => {
    vi.mocked(useWarrantyDetails).mockReturnValue({
      warrantyDetails: mockWarrantyDetails,
      isLoading: false,
    } as any);

    renderComponent();

    expect(screen.getByText(/João Silva/)).toBeInTheDocument();
    expect(screen.getByText(/Bateria Heliar 5Ah/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Aprovar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Negar/i })).toBeInTheDocument();
  });

  it('should handle approve action', async () => {
    vi.mocked(useWarrantyDetails).mockReturnValue({
      warrantyDetails: mockWarrantyDetails,
      isLoading: false,
    } as any);

    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: /Aprovar/i }));
    expect(approveAsync).toHaveBeenCalledWith({ id: 'w-1', employeeId: 'emp-1' });
  });

  it('should handle deny action through dialog', async () => {
    vi.mocked(useWarrantyDetails).mockReturnValue({
      warrantyDetails: mockWarrantyDetails,
      isLoading: false,
    } as any);

    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: /Negar/i }));

    const textarea = screen.getByPlaceholderText(/Ex: Mal uso constatado/i);
    fireEvent.change(textarea, { target: { value: 'Motivo de teste' } });

    fireEvent.click(screen.getByRole('button', { name: /Confirmar Recusa/i }));

    expect(denyAsync).toHaveBeenCalledWith({
      id: 'w-1',
      employeeId: 'emp-1',
      reason: 'Motivo de teste',
    });
  });

  it('should render resolution card for DENIED status', () => {
    vi.mocked(useWarrantyDetails).mockReturnValue({
      warrantyDetails: {
        ...mockWarrantyDetails,
        claim: { ...mockWarrantyDetails.claim, status: 'DENIED', resolution: 'Recusado por teste' },
      },
      isLoading: false,
    } as any);

    renderComponent();

    expect(screen.getByText(/Resolução/i)).toBeInTheDocument();
    expect(screen.getByText(/Recusado por teste/i)).toBeInTheDocument();
  });

  it('should render resolution card for CLOSED status', () => {
    vi.mocked(useWarrantyDetails).mockReturnValue({
      warrantyDetails: {
        ...mockWarrantyDetails,
        claim: {
          ...mockWarrantyDetails.claim,
          status: 'CLOSED',
          resolution: 'Resolvido com troca',
          resolution_type: 'REPLACEMENT',
          refund_amount: 150.0,
        },
      },
      isLoading: false,
    } as any);

    renderComponent();

    expect(screen.getByText(/Resolução/i)).toBeInTheDocument();
    expect(screen.getByText(/Resolvido com troca/i)).toBeInTheDocument();
    expect(screen.getByText(/R\$ 150,00/)).toBeInTheDocument();
  });

  it('should handle resolve action for APPROVED status', async () => {
    vi.mocked(useWarrantyDetails).mockReturnValue({
      warrantyDetails: {
        ...mockWarrantyDetails,
        claim: { ...mockWarrantyDetails.claim, status: 'APPROVED' },
      },
      isLoading: false,
    } as any);

    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: /Resolver & Finalizar/i }));

    const textarea = screen.getByPlaceholderText(/Ex: Produto trocado/i);
    fireEvent.change(textarea, { target: { value: 'Nota de resolução' } });

    fireEvent.click(screen.getByRole('button', { name: /Finalizar Garantia/i }));

    expect(resolveAsync).toHaveBeenCalledWith({
      id: 'w-1',
      input: expect.objectContaining({
        resolution: 'Nota de resolução',
        resolved_by_id: 'emp-1',
      }),
    });
  });

  it('should show error toast if not authenticated on approve', async () => {
    vi.mocked(useAuthStore).mockReturnValue({ employee: null } as any);
    vi.mocked(useWarrantyDetails).mockReturnValue({
      warrantyDetails: mockWarrantyDetails,
      isLoading: false,
    } as any);

    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: /Aprovar/i }));

    expect(approveAsync).not.toHaveBeenCalled();
  });

  it('should render correct icon for IN_PROGRESS status', () => {
    vi.mocked(useWarrantyDetails).mockReturnValue({
      warrantyDetails: {
        ...mockWarrantyDetails,
        claim: { ...mockWarrantyDetails.claim, status: 'IN_PROGRESS' },
      },
      isLoading: false,
    } as any);

    renderComponent();
    expect(document.querySelector('.lucide-shield-question')).toBeInTheDocument();
  });

  it('should handle resolve error gracefully', async () => {
    resolveAsync.mockRejectedValueOnce(new Error('Fail'));
    vi.mocked(useWarrantyDetails).mockReturnValue({
      warrantyDetails: {
        ...mockWarrantyDetails,
        claim: { ...mockWarrantyDetails.claim, status: 'APPROVED' },
      },
      isLoading: false,
    } as any);

    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: /Resolver & Finalizar/i }));
    fireEvent.change(screen.getByPlaceholderText(/Ex: Produto trocado/i), {
      target: { value: 'Nota' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Finalizar Garantia/i }));

    await waitFor(() => {
      expect(resolveAsync).toHaveBeenCalled();
    });
  });
});
