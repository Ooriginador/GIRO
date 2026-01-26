/**
 * @file RequestsPage.test.tsx - Testes para página de Requisições de Material
 */

import { useMaterialRequests, useMaterialRequestsByContract } from '@/hooks/enterprise';
import { RequestsPage } from '@/pages/enterprise/RequestsPage';
import { createQueryWrapper } from '@/test/queryWrapper';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock PermissionGuard to always allow
vi.mock('@/components/enterprise', async () => {
  const actual = await vi.importActual('@/components/enterprise');
  return {
    ...actual,
    PermissionGuard: ({ children }: any) => <>{children}</>,
  };
});

// Mock hooks
vi.mock('@/hooks/enterprise', () => ({
  useMaterialRequests: vi.fn(),
  useMaterialRequestsByContract: vi.fn(),
  useContracts: vi.fn(() => ({ data: [], isLoading: false })),
  usePendingRequests: vi.fn(),
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

const mockRequests = [
  {
    id: 'req-1',
    code: 'REQ-2026-0001',
    requestNumber: 'REQ-2026-0001',
    contractId: 'contract-1',
    contractCode: 'CNT-001',
    contractName: 'Obra Industrial',
    status: 'PENDING',
    priority: 'NORMAL',
    createdAt: '2026-01-20T10:00:00Z',
    neededByDate: '2026-01-25T10:00:00Z',
    requesterName: 'João Silva',
    destinationName: 'Almoxarifado Central',
    itemCount: 5,
  },
  {
    id: 'req-2',
    code: 'REQ-2026-0002',
    requestNumber: 'REQ-2026-0002',
    contractId: 'contract-1',
    contractCode: 'CNT-001',
    contractName: 'Obra Industrial',
    status: 'APPROVED',
    priority: 'HIGH',
    createdAt: '2026-01-19T10:00:00Z',
    neededByDate: '2026-01-22T10:00:00Z',
    requesterName: 'Maria Santos',
    destinationName: 'Frente de Obra 1',
    itemCount: 3,
  },
  {
    id: 'req-3',
    code: 'REQ-2026-0003',
    requestNumber: 'REQ-2026-0003',
    contractId: 'contract-2',
    contractCode: 'CNT-002',
    contractName: 'Retrofit Centro',
    status: 'DRAFT',
    priority: 'URGENT',
    createdAt: '2026-01-21T10:00:00Z',
    requesterName: 'João Silva',
    destinationName: 'Almoxarifado Regional',
    itemCount: 8,
  },
];

describe('RequestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state', () => {
    vi.mocked(useMaterialRequests).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    render(<RequestsPage />, { wrapper: createQueryWrapper() });

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render requests list', async () => {
    vi.mocked(useMaterialRequests).mockReturnValue({
      data: mockRequests,
      isLoading: false,
      error: null,
    } as any);

    render(<RequestsPage />, { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(screen.getByText('REQ-2026-0001')).toBeInTheDocument();
      expect(screen.getByText('REQ-2026-0002')).toBeInTheDocument();
      expect(screen.getByText('REQ-2026-0003')).toBeInTheDocument();
    });
  });

  it('should render page header with title', () => {
    vi.mocked(useMaterialRequests).mockReturnValue({
      data: mockRequests,
      isLoading: false,
      error: null,
    } as any);

    render(<RequestsPage />, { wrapper: createQueryWrapper() });

    expect(screen.getByRole('heading', { name: /requisições/i })).toBeInTheDocument();
  });

  it('should show new request button', () => {
    vi.mocked(useMaterialRequests).mockReturnValue({
      data: mockRequests,
      isLoading: false,
      error: null,
    } as any);

    render(<RequestsPage />, { wrapper: createQueryWrapper() });

    expect(screen.getByRole('button', { name: /nova requisição/i })).toBeInTheDocument();
  });

  it('should navigate to new request page on button click', async () => {
    const user = userEvent.setup();
    vi.mocked(useMaterialRequests).mockReturnValue({
      data: mockRequests,
      isLoading: false,
      error: null,
    } as any);

    render(<RequestsPage />, { wrapper: createQueryWrapper() });

    const newButton = screen.getByRole('button', { name: /nova requisição/i });
    await user.click(newButton);

    expect(mockNavigate).toHaveBeenCalledWith('/enterprise/requests/new');
  });

  it('should display status badges correctly', async () => {
    vi.mocked(useMaterialRequests).mockReturnValue({
      data: mockRequests,
      isLoading: false,
      error: null,
    } as any);

    render(<RequestsPage />, { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/pendente/i)).toBeInTheDocument();
      expect(screen.getByText(/aprovada/i)).toBeInTheDocument();
      expect(screen.getByText(/rascunho/i)).toBeInTheDocument();
    });
  });

  it('should show empty state when no requests', () => {
    vi.mocked(useMaterialRequests).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    render(<RequestsPage />, { wrapper: createQueryWrapper() });

    expect(screen.getByText(/nenhuma requisição/i)).toBeInTheDocument();
  });

  it('should navigate to request detail on row click', async () => {
    const user = userEvent.setup();
    vi.mocked(useMaterialRequests).mockReturnValue({
      data: mockRequests,
      isLoading: false,
      error: null,
    } as any);

    render(<RequestsPage />, { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(screen.getByText('REQ-2026-0001')).toBeInTheDocument();
    });

    const firstRow = screen.getByText('REQ-2026-0001').closest('tr');
    if (firstRow) {
      await user.click(firstRow);
      expect(mockNavigate).toHaveBeenCalledWith('/enterprise/requests/req-1');
    }
  });
});
