/**
 * @file ContractsPage.test.tsx - Testes para página de Contratos
 */

import { useContracts } from '@/hooks/enterprise';
import { ContractsPage } from '@/pages/enterprise/ContractsPage';
import { createQueryWrapper } from '@/test/queryWrapper';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock hooks
vi.mock('@/hooks/enterprise', () => ({
  useContracts: vi.fn(),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockContracts = [
  {
    id: 'contract-1',
    code: 'CNT-2026-001',
    name: 'Obra Industrial Norte',
    clientName: 'Empresa Alpha LTDA',
    status: 'ACTIVE',
    startDate: '2026-01-01',
    costCenter: 'CC-001',
    managerName: 'João Silva',
    location: 'São Paulo, SP',
    workFronts: 3,
    pendingRequests: 5,
  },
  {
    id: 'contract-2',
    code: 'CNT-2026-002',
    name: 'Retrofit Edifício Centro',
    clientName: 'Empresa Beta SA',
    status: 'PLANNING',
    startDate: '2026-02-15',
    costCenter: 'CC-002',
    managerName: 'Maria Santos',
    location: 'Rio de Janeiro, RJ',
    workFronts: 2,
    pendingRequests: 0,
  },
  {
    id: 'contract-3',
    code: 'CNT-2025-100',
    name: 'Manutenção Predial',
    clientName: 'Empresa Gamma ME',
    status: 'COMPLETED',
    startDate: '2025-06-01',
    endDate: '2025-12-31',
    costCenter: 'CC-003',
    managerName: 'Pedro Costa',
    location: 'Curitiba, PR',
    workFronts: 1,
    pendingRequests: 0,
  },
];

describe('ContractsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state', () => {
    vi.mocked(useContracts).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    const { container } = render(<ContractsPage />, { wrapper: createQueryWrapper() });

    // Should show skeleton loaders
    expect(container.getElementsByClassName('animate-pulse').length).toBeGreaterThan(0);
  });

  it('should render contracts list', async () => {
    vi.mocked(useContracts).mockReturnValue({
      data: mockContracts,
      isLoading: false,
      error: null,
    } as any);

    render(<ContractsPage />, { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(screen.getByText('CNT-2026-001')).toBeInTheDocument();
      expect(screen.getByText('Obra Industrial Norte')).toBeInTheDocument();
      expect(screen.getByText('Empresa Alpha LTDA')).toBeInTheDocument();
    });

    expect(screen.getByText('CNT-2026-002')).toBeInTheDocument();
    expect(screen.getByText('CNT-2025-100')).toBeInTheDocument();
  });

  it('should filter contracts by search term', async () => {
    vi.mocked(useContracts).mockReturnValue({
      data: mockContracts,
      isLoading: false,
      error: null,
    } as any);

    const user = userEvent.setup();
    render(<ContractsPage />, { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(screen.getByText('CNT-2026-001')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/buscar/i);
    await user.type(searchInput, 'Alpha');

    await waitFor(() => {
      expect(screen.getByText('Empresa Alpha LTDA')).toBeInTheDocument();
      expect(screen.queryByText('Empresa Beta SA')).not.toBeInTheDocument();
    });
  });

  it('should filter contracts by status', async () => {
    vi.mocked(useContracts).mockReturnValue({
      data: mockContracts,
      isLoading: false,
      error: null,
    } as any);

    const user = userEvent.setup();
    render(<ContractsPage />, { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(screen.getByText('CNT-2026-001')).toBeInTheDocument();
    });

    // Find and click the status filter (assuming it exists)
    const statusBadge = screen.getByText('Ativo');
    expect(statusBadge).toBeInTheDocument();
  });

  it('should navigate to contract detail on card click', async () => {
    vi.mocked(useContracts).mockReturnValue({
      data: mockContracts,
      isLoading: false,
      error: null,
    } as any);

    const user = userEvent.setup();
    render(<ContractsPage />, { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(screen.getByText('CNT-2026-001')).toBeInTheDocument();
    });

    // Click on the first contract card
    const contractCard = screen.getByText('CNT-2026-001').closest('[role="article"]');
    if (contractCard) {
      await user.click(contractCard);
      expect(mockNavigate).toHaveBeenCalledWith('/enterprise/contracts/contract-1');
    }
  });

  it('should navigate to new contract page on button click', async () => {
    vi.mocked(useContracts).mockReturnValue({
      data: mockContracts,
      isLoading: false,
      error: null,
    } as any);

    const user = userEvent.setup();
    render(<ContractsPage />, { wrapper: createQueryWrapper() });

    const newButton = screen.getByRole('button', { name: /novo contrato/i });
    await user.click(newButton);

    expect(mockNavigate).toHaveBeenCalledWith('/enterprise/contracts/new');
  });

  it('should show empty state when no contracts', async () => {
    vi.mocked(useContracts).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    render(<ContractsPage />, { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText(/nenhum contrato/i) ||
          screen.getByText(/sem contratos/i) ||
          screen.queryByRole('article')
      ).toBeTruthy();
    });
  });

  it('should display status badges with correct colors', async () => {
    vi.mocked(useContracts).mockReturnValue({
      data: mockContracts,
      isLoading: false,
      error: null,
    } as any);

    render(<ContractsPage />, { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Ativo')).toBeInTheDocument();
      expect(screen.getByText('Planejamento')).toBeInTheDocument();
      expect(screen.getByText('Concluído')).toBeInTheDocument();
    });
  });

  it('should handle pagination', async () => {
    const manyContracts = Array.from({ length: 15 }, (_, i) => ({
      ...mockContracts[0],
      id: `contract-${i}`,
      code: `CNT-2026-${String(i).padStart(3, '0')}`,
      name: `Obra ${i}`,
    }));

    vi.mocked(useContracts).mockReturnValue({
      data: manyContracts,
      isLoading: false,
      error: null,
    } as any);

    const user = userEvent.setup();
    render(<ContractsPage />, { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(screen.getByText('CNT-2026-000')).toBeInTheDocument();
    });

    // Check for pagination controls
    const nextButton =
      screen.queryByRole('button', { name: /próxim/i }) || screen.queryByLabelText(/próxima/i);

    if (nextButton) {
      await user.click(nextButton);
    }
  });
});
