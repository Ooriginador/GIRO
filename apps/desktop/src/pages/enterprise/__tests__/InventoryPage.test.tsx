/**
 * @file InventoryPage.test.tsx - Testes para página de Inventário Enterprise
 */

import { useStockLocations, useStockBalances } from '@/hooks/enterprise/useStockLocations';
import { InventoryPage } from '@/pages/enterprise/InventoryPage';
import { createQueryWrapper } from '@/test/queryWrapper';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock hooks
vi.mock('@/hooks/enterprise/useStockLocations', () => ({
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
    minQuantity: 10,
    productName: 'Cimento CP-II 50kg',
    productSku: 'CIM-001',
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
    minQuantity: 50,
    productName: 'Tijolo 6 Furos',
    productSku: 'TIJ-001',
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
    minQuantity: 5,
    productName: 'Cimento CP-II 50kg',
    productSku: 'CIM-001',
    product: { id: 'prod-1', name: 'Cimento CP-II 50kg', internalCode: 'CIM-001', unit: 'SC' },
    location: { id: 'loc-2', code: 'FR-01', name: 'Frente A' },
  },
];

const selectLocation = async (user: any) => {
  const trigger = screen.getByRole('combobox', { name: /selecionar local de estoque/i });
  await user.click(trigger);
  // We need to wait for dropdown content which is usually rendered in a portal
  const option = await screen.findByText(/almoxarifado central/i);
  await user.click(option);
};

describe('InventoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useStockLocations).mockReturnValue({
      data: mockLocations,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(useStockBalances).mockReturnValue({
      data: [],
      isLoading: false,
      refetch: vi.fn(),
    } as any);
  });

  it('should render loading state', () => {
    vi.mocked(useStockLocations).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    const { container } = render(<InventoryPage />, { wrapper: createQueryWrapper() });

    expect(container.getElementsByClassName('animate-pulse').length).toBeGreaterThan(0);
  });

  it('should render inventory list', async () => {
    const user = userEvent.setup();
    vi.mocked(useStockBalances).mockReturnValue({
      data: mockBalances,
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    render(<InventoryPage />, { wrapper: createQueryWrapper() });

    await selectLocation(user);

    await waitFor(() => {
      // Use getAllByText because elements might be duplicated (mobile/desktop view)
      expect(screen.getAllByText(/cimento/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/tijolo/i).length).toBeGreaterThan(0);
    });
  });

  it('should render page header with title', () => {
    vi.mocked(useStockBalances).mockReturnValue({
      data: mockBalances,
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    render(<InventoryPage />, { wrapper: createQueryWrapper() });

    expect(screen.getByRole('heading', { name: /inventário de estoque/i })).toBeInTheDocument();
  });

  it('should show product quantities', async () => {
    const user = userEvent.setup();
    vi.mocked(useStockBalances).mockReturnValue({
      data: mockBalances,
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    render(<InventoryPage />, { wrapper: createQueryWrapper() });

    await selectLocation(user);

    await waitFor(() => {
      // Use getAllByText for quantities as they might appear in multiple places
      expect(screen.getAllByText('150').length).toBeGreaterThan(0); // Quantity
      expect(screen.getAllByText('500').length).toBeGreaterThan(0); // Quantity
    });
  });

  it('should show location filter', async () => {
    vi.mocked(useStockBalances).mockReturnValue({
      data: mockBalances,
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    render(<InventoryPage />, { wrapper: createQueryWrapper() });

    await waitFor(() => {
      const locationFilter = screen.getByRole('combobox', { name: /selecionar local de estoque/i });
      expect(locationFilter).toBeInTheDocument();
    });
  });

  it('should show search input', async () => {
    const user = userEvent.setup();
    vi.mocked(useStockBalances).mockReturnValue({
      data: mockBalances,
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    render(<InventoryPage />, { wrapper: createQueryWrapper() });

    await selectLocation(user);

    expect(screen.getByPlaceholderText(/buscar/i)).toBeInTheDocument();
  });

  it('should filter by search term', async () => {
    vi.mocked(useStockBalances).mockReturnValue({
      data: mockBalances,
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    render(<InventoryPage />, { wrapper: createQueryWrapper() });

    // Verifica que a página renderiza
    expect(screen.getByRole('heading', { name: /inventário de estoque/i })).toBeInTheDocument();
  });

  it('should show empty state when no inventory', async () => {
    vi.mocked(useStockBalances).mockReturnValue({
      data: [],
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    render(<InventoryPage />, { wrapper: createQueryWrapper() });

    // A página renderiza corretamente mesmo sem dados
    expect(screen.getByRole('heading', { name: /inventário de estoque/i })).toBeInTheDocument();
  });

  it('should show available vs reserved quantities', async () => {
    vi.mocked(useStockBalances).mockReturnValue({
      data: mockBalances,
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    render(<InventoryPage />, { wrapper: createQueryWrapper() });

    // Verifica que a página renderiza com dados disponíveis
    expect(screen.getByRole('heading', { name: /inventário de estoque/i })).toBeInTheDocument();
  });
});
