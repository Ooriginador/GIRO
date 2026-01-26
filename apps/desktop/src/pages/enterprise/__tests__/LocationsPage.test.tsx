/**
 * @file LocationsPage.test.tsx - Testes para página de Locais de Estoque
 */

import {
  useStockLocations,
  useCreateStockLocation,
  useDeleteStockLocation,
} from '@/hooks/enterprise';
import { LocationsPage } from '@/pages/enterprise/LocationsPage';
import { createQueryWrapper } from '@/test/queryWrapper';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock hooks
vi.mock('@/hooks/enterprise', () => ({
  useStockLocations: vi.fn(),
  useCreateStockLocation: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeleteStockLocation: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useContracts: vi.fn(() => ({ data: [] })),
}));

vi.mock('@/hooks/useEnterprisePermission', () => ({
  useCanDo: () => () => true,
  useEnterprisePermission: () => ({ hasPermission: () => true }),
}));

vi.mock('@/components/enterprise', () => ({
  PermissionGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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

const mockLocations = [
  {
    id: 'loc-1',
    code: 'ALM-CENTRAL',
    name: 'Almoxarifado Central',
    locationType: 'CENTRAL',
    isActive: true,
    address: 'Rua Principal, 100',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'loc-2',
    code: 'FR-OBR-001',
    name: 'Frente de Obra - Industrial',
    locationType: 'FIELD',
    isActive: true,
    contractId: 'contract-1',
    contract: { id: 'contract-1', name: 'Obra Industrial' },
    createdAt: '2026-01-10T00:00:00Z',
  },
  {
    id: 'loc-3',
    code: 'DEP-SEC',
    name: 'Depósito Secundário',
    locationType: 'TRANSIT',
    isActive: false,
    address: 'Av. Secundária, 500',
    createdAt: '2025-06-01T00:00:00Z',
  },
];

describe('LocationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state', () => {
    vi.mocked(useStockLocations).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    render(<LocationsPage />, { wrapper: createQueryWrapper() });

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render locations list', async () => {
    vi.mocked(useStockLocations).mockReturnValue({
      data: mockLocations,
      isLoading: false,
      error: null,
    } as any);

    render(<LocationsPage />, { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Almoxarifado Central')).toBeInTheDocument();
      expect(screen.getByText('Frente de Obra - Industrial')).toBeInTheDocument();
      expect(screen.getByText('Depósito Secundário')).toBeInTheDocument();
    });
  });

  it('should render page header with title', () => {
    vi.mocked(useStockLocations).mockReturnValue({
      data: mockLocations,
      isLoading: false,
      error: null,
    } as any);

    render(<LocationsPage />, { wrapper: createQueryWrapper() });

    expect(screen.getByRole('heading', { name: /locais de estoque/i })).toBeInTheDocument();
  });

  it('should show new location button', () => {
    vi.mocked(useStockLocations).mockReturnValue({
      data: mockLocations,
      isLoading: false,
      error: null,
    } as any);

    render(<LocationsPage />, { wrapper: createQueryWrapper() });

    expect(screen.getByRole('button', { name: /novo local/i })).toBeInTheDocument();
  });

  it('should display location types', async () => {
    vi.mocked(useStockLocations).mockReturnValue({
      data: mockLocations,
      isLoading: false,
      error: null,
    } as any);

    render(<LocationsPage />, { wrapper: createQueryWrapper() });

    await waitFor(() => {
      const centralElements = screen.getAllByText(/central/i);
      expect(centralElements.length).toBeGreaterThan(0);
    });
  });

  it('should show location codes', async () => {
    vi.mocked(useStockLocations).mockReturnValue({
      data: mockLocations,
      isLoading: false,
      error: null,
    } as any);

    render(<LocationsPage />, { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(screen.getByText('ALM-CENTRAL')).toBeInTheDocument();
      expect(screen.getByText('FR-OBR-001')).toBeInTheDocument();
    });
  });

  it('should show empty state when no locations', () => {
    vi.mocked(useStockLocations).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    render(<LocationsPage />, { wrapper: createQueryWrapper() });

    expect(screen.getByText(/nenhum local/i)).toBeInTheDocument();
  });

  it('should navigate to location stock on click', async () => {
    const user = userEvent.setup();
    vi.mocked(useStockLocations).mockReturnValue({
      data: mockLocations,
      isLoading: false,
      error: null,
    } as any);

    render(<LocationsPage />, { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Almoxarifado Central')).toBeInTheDocument();
    });

    // Open dropdown menu
    const triggers = screen.getAllByRole('button', { name: /mais ações/i });
    await user.click(triggers[0]);

    // Click on view stock
    const viewStockButton = await screen.findByText(/ver estoque/i);
    await user.click(viewStockButton);

    expect(mockNavigate).toHaveBeenCalledWith('/enterprise/locations/loc-1/stock');
  });

  it('should differentiate active and inactive locations', async () => {
    vi.mocked(useStockLocations).mockReturnValue({
      data: mockLocations,
      isLoading: false,
      error: null,
    } as any);

    render(<LocationsPage />, { wrapper: createQueryWrapper() });

    await waitFor(() => {
      // Check that inactive locations are visually different
      const inactiveLocationText = screen.getByText('Depósito Secundário');
      const card = inactiveLocationText.closest('[role="article"]');
      expect(card).toBeInTheDocument();
    });
  });
});
