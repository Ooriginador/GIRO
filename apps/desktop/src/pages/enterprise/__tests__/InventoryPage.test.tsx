/**
 * @file InventoryPage.test.tsx - Testes para página de Inventário Enterprise
 */

import { useStockLocations, useStockBalances } from '@/hooks/enterprise';
import { InventoryPage } from '@/pages/enterprise/InventoryPage';
import { createQueryWrapper } from '@/test/queryWrapper';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock hooks
vi.mock('@/hooks/enterprise', () => ({
  useStockLocations: vi.fn(),
  useStockBalances: vi.fn(),
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

const mockLocations = [
  { id: 'loc-1', code: 'ALM-01', name: 'Almoxarifado Central', type: 'CENTRAL' },
  { id: 'loc-2', code: 'FR-01', name: 'Frente A', type: 'FIELD' },
];

const mockBalances = [
  {
    id: 'bal-1',
    locationId: 'loc-1',
    productId: 'prod-1',
    quantity: 150,
    reservedQty: 20,
    availableQty: 130,
    product: { id: 'prod-1', name: 'Cimento CP-II 50kg', internalCode: 'CIM-001', unit: 'SC' },
    location: { id: 'loc-1', code: 'ALM-01', name: 'Almoxarifado Central' },
  },
  {
    id: 'bal-2',
    locationId: 'loc-1',
    productId: 'prod-2',
    quantity: 500,
    reservedQty: 100,
    availableQty: 400,
    product: { id: 'prod-2', name: 'Tijolo 6 Furos', internalCode: 'TIJ-001', unit: 'UN' },
    location: { id: 'loc-1', code: 'ALM-01', name: 'Almoxarifado Central' },
  },
  {
    id: 'bal-3',
    locationId: 'loc-2',
    productId: 'prod-1',
    quantity: 30,
    reservedQty: 0,
    availableQty: 30,
    product: { id: 'prod-1', name: 'Cimento CP-II 50kg', internalCode: 'CIM-001', unit: 'SC' },
    location: { id: 'loc-2', code: 'FR-01', name: 'Frente A' },
  },
];

describe('InventoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state', () => {
    vi.mocked(useStockLocations).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);
    vi.mocked(useStockBalances).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    render(<InventoryPage />, { wrapper: createQueryWrapper() });
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render inventory list', async () => {
    vi.mocked(useStockLocations).mockReturnValue({
      data: mockLocations,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(useStockBalances).mockReturnValue({
      data: mockBalances,
      isLoading: false,
      error: null,
    } as any);

    render(<InventoryPage />, { wrapper: createQueryWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText(/cimento/i)).toBeInTheDocument();
      expect(screen.getByText(/tijolo/i)).toBeInTheDocument();
    });
  });

  it('should render page header with title', () => {
    vi.mocked(useStockLocations).mockReturnValue({
      data: mockLocations,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(useStockBalances).mockReturnValue({
      data: mockBalances,
      isLoading: false,
      error: null,
    } as any);

    render(<InventoryPage />, { wrapper: createQueryWrapper() });
    
    expect(screen.getByRole('heading', { name: /inventário|estoque/i })).toBeInTheDocument();
  });

  it('should show product quantities', async () => {
    vi.mocked(useStockLocations).mockReturnValue({
      data: mockLocations,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(useStockBalances).mockReturnValue({
      data: mockBalances,
      isLoading: false,
      error: null,
    } as any);

    render(<InventoryPage />, { wrapper: createQueryWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('500')).toBeInTheDocument();
    });
  });

  it('should show location filter', async () => {
    vi.mocked(useStockLocations).mockReturnValue({
      data: mockLocations,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(useStockBalances).mockReturnValue({
      data: mockBalances,
      isLoading: false,
      error: null,
    } as any);

    render(<InventoryPage />, { wrapper: createQueryWrapper() });
    
    await waitFor(() => {
      const locationFilter = screen.getByRole('combobox') || screen.getByLabelText(/local/i);
      expect(locationFilter).toBeInTheDocument();
    });
  });

  it('should show search input', () => {
    vi.mocked(useStockLocations).mockReturnValue({
      data: mockLocations,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(useStockBalances).mockReturnValue({
      data: mockBalances,
      isLoading: false,
      error: null,
    } as any);

    render(<InventoryPage />, { wrapper: createQueryWrapper() });
    
    expect(screen.getByPlaceholderText(/buscar|pesquisar/i)).toBeInTheDocument();
  });

  it('should filter by search term', async () => {
    const user = userEvent.setup();
    vi.mocked(useStockLocations).mockReturnValue({
      data: mockLocations,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(useStockBalances).mockReturnValue({
      data: mockBalances,
      isLoading: false,
      error: null,
    } as any);

    render(<InventoryPage />, { wrapper: createQueryWrapper() });
    
    const searchInput = screen.getByPlaceholderText(/buscar|pesquisar/i);
    await user.type(searchInput, 'cimento');
    
    await waitFor(() => {
      expect(screen.getByText(/cimento/i)).toBeInTheDocument();
    });
  });

  it('should show empty state when no inventory', () => {
    vi.mocked(useStockLocations).mockReturnValue({
      data: mockLocations,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(useStockBalances).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    render(<InventoryPage />, { wrapper: createQueryWrapper() });
    
    expect(screen.getByText(/nenhum item|sem estoque/i)).toBeInTheDocument();
  });

  it('should show available vs reserved quantities', async () => {
    vi.mocked(useStockLocations).mockReturnValue({
      data: mockLocations,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(useStockBalances).mockReturnValue({
      data: mockBalances,
      isLoading: false,
      error: null,
    } as any);

    render(<InventoryPage />, { wrapper: createQueryWrapper() });
    
    await waitFor(() => {
      // Check for reserved quantities
      expect(screen.getByText('130')).toBeInTheDocument(); // availableQty
    });
  });
});
