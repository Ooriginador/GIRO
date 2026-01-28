/**
 * @file EnterpriseDashboardPage.test.tsx - Testes para Dashboard Enterprise
 */

import {
  useEnterpriseDashboard,
  usePendingRequests,
  useContracts,
  useContractsConsumptionSummary,
} from '@/hooks/enterprise';
import { EnterpriseDashboardPage } from '@/pages/enterprise/EnterpriseDashboardPage';
import { createQueryWrapper } from '@/test/queryWrapper';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock hooks
vi.mock('@/hooks/enterprise', () => ({
  useEnterpriseDashboard: vi.fn(),
  usePendingRequests: vi.fn(),
  useContracts: vi.fn(),
  useContractsConsumptionSummary: vi.fn(),
}));

vi.mock('@/hooks/useEnterprisePermission', () => ({
  useCanDo: () => () => true,
  useEnterprisePermission: () => ({ hasPermission: () => true }),
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

const mockDashboardData = {
  activeContracts: 8,
  pendingRequests: 2,
  inTransitTransfers: 5,
  lowStockItems: 1,
  monthlyConsumption: 0,
  consumptionTrend: 0,
};

const mockRecentRequests = [
  {
    id: 'r1',
    code: 'REQ-001',
    requestNumber: 'REQ-001',
    status: 'PENDING',
    priority: 'NORMAL',
    requesterName: 'João',
    contractCode: 'CNT-001',
    contractName: 'Obra A',
    destinationName: 'Almoxarifado',
    itemCount: 3,
    createdAt: '2024-01-01',
  },
  {
    id: 'r2',
    code: 'REQ-002',
    requestNumber: 'REQ-002',
    status: 'APPROVED',
    priority: 'HIGH',
    requesterName: 'Maria',
    contractCode: 'CNT-002',
    contractName: 'Obra B',
    destinationName: 'Frente de Obra',
    itemCount: 5,
    createdAt: '2024-01-02',
  },
];

const mockContracts = [
  { id: 'c1', code: 'CNT-001', name: 'Obra A', budget: 100000, status: 'ACTIVE' },
  { id: 'c2', code: 'CNT-002', name: 'Obra B', budget: 200000, status: 'ACTIVE' },
];

describe('EnterpriseDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useEnterpriseDashboard).mockReturnValue({
      data: mockDashboardData,
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    vi.mocked(usePendingRequests).mockReturnValue({
      data: mockRecentRequests,
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    vi.mocked(useContracts).mockReturnValue({
      data: mockContracts,
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    vi.mocked(useContractsConsumptionSummary).mockReturnValue({
      data: [],
      isLoading: false,
      refetch: vi.fn(),
    } as any);
  });

  it('should render loading state', () => {
    vi.mocked(useEnterpriseDashboard).mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: vi.fn(),
    } as any);

    render(<EnterpriseDashboardPage />, { wrapper: createQueryWrapper() });

    expect(
      document.querySelector('.animate-pulse') || document.querySelector('.skeleton')
    ).toBeInTheDocument();
  });

  it('should render page title', () => {
    render(<EnterpriseDashboardPage />, { wrapper: createQueryWrapper() });
    expect(screen.getByText('Dashboard Enterprise')).toBeInTheDocument();
  });

  it('should render KPI cards with correct values', async () => {
    render(<EnterpriseDashboardPage />, { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(screen.getByText('8')).toBeInTheDocument(); // activeContracts
      expect(screen.getByText('2')).toBeInTheDocument(); // pendingRequests
      expect(screen.getByText('5')).toBeInTheDocument(); // inTransitTransfers
      expect(screen.getByText('1')).toBeInTheDocument(); // lowStockAlerts
    });
  });

  it('should render recent requests list', async () => {
    render(<EnterpriseDashboardPage />, { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(screen.getByText('REQ-001')).toBeInTheDocument();
      expect(screen.getByText('REQ-002')).toBeInTheDocument();
      expect(screen.getByText(/João/)).toBeInTheDocument();
    });
  });

  it('should render quick actions buttons', async () => {
    render(<EnterpriseDashboardPage />, { wrapper: createQueryWrapper() });

    expect(screen.getByRole('button', { name: /nova requisição/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /nova transferência/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /novo contrato/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /inventário rotativo/i })).toBeInTheDocument();
  });

  it('should call refetch on refresh button click', async () => {
    const user = userEvent.setup();
    const refetchDashboardSpy = vi.fn();
    const refetchRequestsSpy = vi.fn();

    vi.mocked(useEnterpriseDashboard).mockReturnValue({
      data: mockDashboardData,
      isLoading: false,
      refetch: refetchDashboardSpy,
    } as any);

    vi.mocked(usePendingRequests).mockReturnValue({
      data: mockRecentRequests,
      isLoading: false,
      refetch: refetchRequestsSpy,
    } as any);

    render(<EnterpriseDashboardPage />, { wrapper: createQueryWrapper() });

    const refreshBtn = screen.getByRole('button', { name: /atualizar/i });
    await user.click(refreshBtn);

    expect(refetchDashboardSpy).toHaveBeenCalled();
    expect(refetchRequestsSpy).toHaveBeenCalled();
  });
});
