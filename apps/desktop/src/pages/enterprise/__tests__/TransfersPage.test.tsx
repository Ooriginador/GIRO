/**
 * @file TransfersPage.test.tsx - Testes para página de Transferências
 */

import { useStockTransfers } from '@/hooks/enterprise';
import { TransfersPage } from '@/pages/enterprise/TransfersPage';
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
    transferNumber: 'TRF-2026-0001',
    sourceLocationId: 'loc-1',
    sourceLocationName: 'Almoxarifado Central',
    sourceLocationCode: 'ALM-01',
    destinationLocationId: 'loc-2',
    destinationLocationName: 'Frente de Obra A',
    destinationLocationCode: 'FR-01',
    status: 'IN_TRANSIT',
    priority: 'NORMAL',
    createdAt: '2026-01-20T10:00:00Z',
    shippedAt: '2026-01-21T08:00:00Z',
    requesterName: 'Carlos Oliveira',
    itemCount: 5,
  },
  {
    id: 'trf-2',
    transferNumber: 'TRF-2026-0002',
    sourceLocationId: 'loc-1',
    sourceLocationName: 'Almoxarifado Central',
    sourceLocationCode: 'ALM-01',
    destinationLocationId: 'loc-3',
    destinationLocationName: 'Frente de Obra B',
    destinationLocationCode: 'FR-02',
    status: 'PENDING',
    priority: 'ALTA',
    createdAt: '2026-01-21T14:00:00Z',
    requesterName: 'Ana Paula',
    itemCount: 3,
  },
  {
    id: 'trf-3',
    transferNumber: 'TRF-2026-0003',
    sourceLocationId: 'loc-2',
    sourceLocationName: 'Frente de Obra A',
    sourceLocationCode: 'FR-01',
    destinationLocationId: 'loc-1',
    destinationLocationName: 'Almoxarifado Central',
    destinationLocationCode: 'ALM-01',
    status: 'RECEIVED',
    priority: 'BAIXA',
    createdAt: '2026-01-18T10:00:00Z',
    receivedAt: '2026-01-19T16:00:00Z',
    requesterName: 'Roberto Lima',
    itemCount: 10,
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
      expect(screen.getAllByText(/em trânsito/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/pendente/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/recebida/i).length).toBeGreaterThan(0);
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
