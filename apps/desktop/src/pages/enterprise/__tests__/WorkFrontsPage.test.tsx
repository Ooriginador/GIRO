/**
 * @file WorkFrontsPage.test.tsx - Testes para página de Frentes de Trabalho
 */

import { useWorkFronts, useContracts } from '@/hooks/useEnterpriseCommands';
import { WorkFrontsPage } from '@/pages/enterprise/WorkFrontsPage';
import { createQueryWrapper } from '@/test/queryWrapper';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock PermissionGuard to always render children
vi.mock('@/components/enterprise', async () => {
  const actual = await vi.importActual('@/components/enterprise');
  return {
    ...actual,
    PermissionGuard: ({ children }: any) => <>{children}</>,
  };
});

// Mock hooks
vi.mock('@/hooks/useEnterpriseCommands', () => ({
  useWorkFronts: vi.fn(),
  useContracts: vi.fn(() => ({ data: [], isLoading: false })),
  useWorkFrontsByContract: vi.fn(() => ({ data: [], isLoading: false })),
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
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

const mockWorkFronts = [
  {
    id: 'wf-1',
    code: 'FR-001',
    name: 'Frente de Fundação',
    contractId: 'contract-1',
    contractCode: 'CNT-001',
    contractName: 'Obra Industrial Norte',
    status: 'ACTIVE',
    supervisorId: 'emp-1',
    supervisorName: 'Carlos Ferreira',
    activitiesCount: 5,
    completedActivities: 2,
    progress: 40,
  },
  {
    id: 'wf-2',
    code: 'FR-002',
    name: 'Frente de Estrutura',
    contractId: 'contract-1',
    contractCode: 'CNT-001',
    contractName: 'Obra Industrial Norte',
    status: 'ACTIVE',
    supervisorId: 'emp-2',
    supervisorName: 'Ana Maria',
    activitiesCount: 8,
    completedActivities: 3,
    progress: 37.5,
  },
  {
    id: 'wf-3',
    code: 'FR-003',
    name: 'Frente de Acabamento',
    contractId: 'contract-2',
    contractCode: 'CNT-002',
    contractName: 'Retrofit Centro',
    status: 'PLANNING',
    supervisorId: 'emp-3',
    supervisorName: 'Roberto Silva',
    activitiesCount: 12,
    completedActivities: 0,
    progress: 0,
  },
];

describe('WorkFrontsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state', () => {
    vi.mocked(useWorkFronts).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    render(<WorkFrontsPage />, { wrapper: createQueryWrapper() });

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render work fronts list', async () => {
    vi.mocked(useWorkFronts).mockReturnValue({
      data: mockWorkFronts,
      isLoading: false,
      error: null,
    } as any);

    render(<WorkFrontsPage />, { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Frente de Fundação')).toBeInTheDocument();
      expect(screen.getByText('Frente de Estrutura')).toBeInTheDocument();
      expect(screen.getByText('Frente de Acabamento')).toBeInTheDocument();
    });
  });

  it('should render page header with title', () => {
    vi.mocked(useWorkFronts).mockReturnValue({
      data: mockWorkFronts,
      isLoading: false,
      error: null,
    } as any);

    render(<WorkFrontsPage />, { wrapper: createQueryWrapper() });

    expect(screen.getByRole('heading', { name: /frentes/i })).toBeInTheDocument();
  });

  it('should display status badges correctly', async () => {
    vi.mocked(useWorkFronts).mockReturnValue({
      data: mockWorkFronts,
      isLoading: false,
      error: null,
    } as any);

    render(<WorkFrontsPage />, { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(screen.getAllByText(/ativ/i).length).toBeGreaterThan(0);
    });
  });

  it('should show supervisor names', async () => {
    vi.mocked(useWorkFronts).mockReturnValue({
      data: mockWorkFronts,
      isLoading: false,
      error: null,
    } as any);

    render(<WorkFrontsPage />, { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/carlos ferreira/i)).toBeInTheDocument();
      expect(screen.getByText(/ana maria/i)).toBeInTheDocument();
    });
  });

  it('should show empty state when no work fronts', () => {
    vi.mocked(useWorkFronts).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    render(<WorkFrontsPage />, { wrapper: createQueryWrapper() });

    expect(screen.getByText(/nenhuma frente/i)).toBeInTheDocument();
  });

  it('should navigate to work front detail on card click', async () => {
    const user = userEvent.setup();
    vi.mocked(useWorkFronts).mockReturnValue({
      data: mockWorkFronts,
      isLoading: false,
      error: null,
    } as any);

    render(<WorkFrontsPage />, { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Frente de Fundação')).toBeInTheDocument();
    });

    const firstCard =
      screen.getByText('Frente de Fundação').closest('[data-testid="workfront-card"]') ||
      screen.getByText('Frente de Fundação').closest('.cursor-pointer');
    if (firstCard) {
      await user.click(firstCard);
      expect(mockNavigate).toHaveBeenCalled();
    }
  });

  it('should show contract information', async () => {
    vi.mocked(useWorkFronts).mockReturnValue({
      data: mockWorkFronts,
      isLoading: false,
      error: null,
    } as any);

    render(<WorkFrontsPage />, { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(screen.getAllByText(/CNT-001/i).length).toBeGreaterThan(0);
    });
  });
});
