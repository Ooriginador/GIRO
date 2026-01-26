/**
 * @file EnterpriseDashboardPage.test.tsx - Testes para Dashboard Enterprise
 */

import { useContracts, useMaterialRequests, useStockTransfers } from '@/hooks/enterprise';
import { EnterpriseDashboardPage } from '@/pages/enterprise/EnterpriseDashboardPage';
import { createQueryWrapper } from '@/test/queryWrapper';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock hooks
vi.mock('@/hooks/enterprise', () => ({
  useContracts: vi.fn(),
  useMaterialRequests: vi.fn(),
  useStockTransfers: vi.fn(),
  usePendingRequests: vi.fn(() => ({ data: [], isLoading: false })),
  useStockLocations: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('@/hooks/useEnterprisePermission', () => ({
  useCanDo: () => () => true,
  useEnterprisePermission: () => ({ hasPermission: () => true }),
}));

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({
    employee: { id: 'emp-1', name: 'Test User', role: 'MANAGER' },
    isAuthenticated: true,
  }),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  };
});

const mockContracts = [
  { id: 'c1', code: 'CNT-001', name: 'Obra A', status: 'ACTIVE' },
  { id: 'c2', code: 'CNT-002', name: 'Obra B', status: 'ACTIVE' },
  { id: 'c3', code: 'CNT-003', name: 'Obra C', status: 'PLANNING' },
];

const mockRequests = [
  { id: 'r1', requestNumber: 'REQ-001', status: 'PENDING' },
  { id: 'r2', requestNumber: 'REQ-002', status: 'PENDING' },
  { id: 'r3', requestNumber: 'REQ-003', status: 'APPROVED' },
];

const mockTransfers = [
  { id: 't1', code: 'TRF-001', status: 'IN_TRANSIT' },
  { id: 't2', code: 'TRF-002', status: 'PENDING' },
];

describe('EnterpriseDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state', () => {
    vi.mocked(useContracts).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);
    vi.mocked(useMaterialRequests).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);
    vi.mocked(useStockTransfers).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    render(<EnterpriseDashboardPage />, { wrapper: createQueryWrapper() });
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render dashboard with KPIs', async () => {
    vi.mocked(useContracts).mockReturnValue({
      data: mockContracts,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(useMaterialRequests).mockReturnValue({
      data: mockRequests,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(useStockTransfers).mockReturnValue({
      data: mockTransfers,
      isLoading: false,
      error: null,
    } as any);

    render(<EnterpriseDashboardPage />, { wrapper: createQueryWrapper() });
    
    await waitFor(() => {
      // Check for KPI cards
      expect(screen.getByText(/contratos/i)).toBeInTheDocument();
      expect(screen.getByText(/requisições/i)).toBeInTheDocument();
      expect(screen.getByText(/transferências/i)).toBeInTheDocument();
    });
  });

  it('should show contracts count', async () => {
    vi.mocked(useContracts).mockReturnValue({
      data: mockContracts,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(useMaterialRequests).mockReturnValue({
      data: mockRequests,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(useStockTransfers).mockReturnValue({
      data: mockTransfers,
      isLoading: false,
      error: null,
    } as any);

    render(<EnterpriseDashboardPage />, { wrapper: createQueryWrapper() });
    
    await waitFor(() => {
      // Should show count of active contracts (2 ACTIVE)
      expect(screen.getByText('2') || screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('should show pending requests count', async () => {
    vi.mocked(useContracts).mockReturnValue({
      data: mockContracts,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(useMaterialRequests).mockReturnValue({
      data: mockRequests,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(useStockTransfers).mockReturnValue({
      data: mockTransfers,
      isLoading: false,
      error: null,
    } as any);

    render(<EnterpriseDashboardPage />, { wrapper: createQueryWrapper() });
    
    await waitFor(() => {
      // Should show pending requests count (2 PENDING)
      const pendingBadges = screen.getAllByText('2');
      expect(pendingBadges.length).toBeGreaterThan(0);
    });
  });

  it('should render quick action buttons', async () => {
    vi.mocked(useContracts).mockReturnValue({
      data: mockContracts,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(useMaterialRequests).mockReturnValue({
      data: mockRequests,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(useStockTransfers).mockReturnValue({
      data: mockTransfers,
      isLoading: false,
      error: null,
    } as any);

    render(<EnterpriseDashboardPage />, { wrapper: createQueryWrapper() });
    
    await waitFor(() => {
      // Check for quick action links/buttons
      expect(screen.getByRole('link', { name: /nova requisição/i }) || 
             screen.getByText(/nova requisição/i)).toBeInTheDocument();
    });
  });

  it('should show recent activity section', async () => {
    vi.mocked(useContracts).mockReturnValue({
      data: mockContracts,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(useMaterialRequests).mockReturnValue({
      data: mockRequests,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(useStockTransfers).mockReturnValue({
      data: mockTransfers,
      isLoading: false,
      error: null,
    } as any);

    render(<EnterpriseDashboardPage />, { wrapper: createQueryWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText(/atividade|recentes/i)).toBeInTheDocument();
    });
  });

  it('should render page title', () => {
    vi.mocked(useContracts).mockReturnValue({
      data: mockContracts,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(useMaterialRequests).mockReturnValue({
      data: mockRequests,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(useStockTransfers).mockReturnValue({
      data: mockTransfers,
      isLoading: false,
      error: null,
    } as any);

    render(<EnterpriseDashboardPage />, { wrapper: createQueryWrapper() });
    
    expect(screen.getByRole('heading', { name: /dashboard|painel|enterprise/i })).toBeInTheDocument();
  });
});
