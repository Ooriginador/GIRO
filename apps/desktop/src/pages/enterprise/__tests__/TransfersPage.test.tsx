/**
 * @file TransfersPage.test.tsx - Testes para página de Transferências
 */

import { useStockTransfers } from '@/hooks/enterprise';
import { TransfersPage } from '@/pages/enterprise/TransfersPage';
import { createQueryWrapper } from '@/test/queryWrapper';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock hooks
vi.mock('@/hooks/enterprise', () => ({
  useStockTransfers: vi.fn(),
  useStockLocations: vi.fn(() => ({ data: [], isLoading: false })),
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

const mockTransfers = [
  {
    id: 'trf-1',
    code: 'TRF-2026-0001',
    sourceLocationId: 'loc-1',
    destinationLocationId: 'loc-2',
    status: 'IN_TRANSIT',
    priority: 'NORMAL',
    createdAt: '2026-01-20T10:00:00Z',
    shippedAt: '2026-01-21T08:00:00Z',
    sourceLocation: { id: 'loc-1', code: 'ALM-01', name: 'Almoxarifado Central' },
    destinationLocation: { id: 'loc-2', code: 'FR-01', name: 'Frente de Obra A' },
    requester: { id: 'emp-1', name: 'Carlos Oliveira', role: 'WAREHOUSE' },
  },
  {
    id: 'trf-2',
    code: 'TRF-2026-0002',
    sourceLocationId: 'loc-1',
    destinationLocationId: 'loc-3',
    status: 'PENDING',
    priority: 'ALTA',
    createdAt: '2026-01-21T14:00:00Z',
    sourceLocation: { id: 'loc-1', code: 'ALM-01', name: 'Almoxarifado Central' },
    destinationLocation: { id: 'loc-3', code: 'FR-02', name: 'Frente de Obra B' },
    requester: { id: 'emp-2', name: 'Ana Paula', role: 'SUPERVISOR' },
  },
  {
    id: 'trf-3',
    code: 'TRF-2026-0003',
    sourceLocationId: 'loc-2',
    destinationLocationId: 'loc-1',
    status: 'RECEIVED',
    priority: 'BAIXA',
    createdAt: '2026-01-18T10:00:00Z',
    receivedAt: '2026-01-19T16:00:00Z',
    sourceLocation: { id: 'loc-2', code: 'FR-01', name: 'Frente de Obra A' },
    destinationLocation: { id: 'loc-1', code: 'ALM-01', name: 'Almoxarifado Central' },
    requester: { id: 'emp-3', name: 'Roberto Lima', role: 'REQUESTER' },
  },
];

describe('TransfersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state', () => {
    vi.mocked(useStockTransfers).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    render(<TransfersPage />, { wrapper: createQueryWrapper() });
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render transfers list', async () => {
    vi.mocked(useStockTransfers).mockReturnValue({
      data: mockTransfers,
      isLoading: false,
      error: null,
    } as any);

    render(<TransfersPage />, { wrapper: createQueryWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('TRF-2026-0001')).toBeInTheDocument();
      expect(screen.getByText('TRF-2026-0002')).toBeInTheDocument();
      expect(screen.getByText('TRF-2026-0003')).toBeInTheDocument();
    });
  });

  it('should render page header with title', () => {
    vi.mocked(useStockTransfers).mockReturnValue({
      data: mockTransfers,
      isLoading: false,
      error: null,
    } as any);

    render(<TransfersPage />, { wrapper: createQueryWrapper() });
    
    expect(screen.getByRole('heading', { name: /transferências/i })).toBeInTheDocument();
  });

  it('should show new transfer button', () => {
    vi.mocked(useStockTransfers).mockReturnValue({
      data: mockTransfers,
      isLoading: false,
      error: null,
    } as any);

    render(<TransfersPage />, { wrapper: createQueryWrapper() });
    
    expect(screen.getByRole('button', { name: /nova transferência/i })).toBeInTheDocument();
  });

  it('should navigate to new transfer page on button click', async () => {
    const user = userEvent.setup();
    vi.mocked(useStockTransfers).mockReturnValue({
      data: mockTransfers,
      isLoading: false,
      error: null,
    } as any);

    render(<TransfersPage />, { wrapper: createQueryWrapper() });
    
    const newButton = screen.getByRole('button', { name: /nova transferência/i });
    await user.click(newButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('/enterprise/transfers/new');
  });

  it('should display status badges correctly', async () => {
    vi.mocked(useStockTransfers).mockReturnValue({
      data: mockTransfers,
      isLoading: false,
      error: null,
    } as any);

    render(<TransfersPage />, { wrapper: createQueryWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText(/em trânsito/i)).toBeInTheDocument();
      expect(screen.getByText(/pendente/i)).toBeInTheDocument();
      expect(screen.getByText(/recebida/i)).toBeInTheDocument();
    });
  });

  it('should show locations names', async () => {
    vi.mocked(useStockTransfers).mockReturnValue({
      data: mockTransfers,
      isLoading: false,
      error: null,
    } as any);

    render(<TransfersPage />, { wrapper: createQueryWrapper() });
    
    await waitFor(() => {
      expect(screen.getAllByText(/almoxarifado central/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/frente de obra/i).length).toBeGreaterThan(0);
    });
  });

  it('should show empty state when no transfers', () => {
    vi.mocked(useStockTransfers).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    render(<TransfersPage />, { wrapper: createQueryWrapper() });
    
    expect(screen.getByText(/nenhuma transferência/i)).toBeInTheDocument();
  });

  it('should navigate to transfer detail on row click', async () => {
    const user = userEvent.setup();
    vi.mocked(useStockTransfers).mockReturnValue({
      data: mockTransfers,
      isLoading: false,
      error: null,
    } as any);

    render(<TransfersPage />, { wrapper: createQueryWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('TRF-2026-0001')).toBeInTheDocument();
    });
    
    const firstRow = screen.getByText('TRF-2026-0001').closest('tr');
    if (firstRow) {
      await user.click(firstRow);
      expect(mockNavigate).toHaveBeenCalledWith('/enterprise/transfers/trf-1');
    }
  });
});
