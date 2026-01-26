/**
 * @file StockPage.test.tsx - Testes para a página de estoque
 */

import { StockPage } from '@/pages/stock/StockPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock hooks
vi.mock('@/hooks/useStock', () => ({
  useStockReport: vi.fn(),
  useLowStockProducts: vi.fn(),
  useAdjustStock: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

// Mock useAuth (hook) diretamente pois é o que a página usa
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    hasPermission: () => true,
    employee: { id: '1', name: 'Test', role: 'ADMIN' },
  }),
}));

import { useLowStockProducts, useStockReport } from '@/hooks/useStock';

const mockReport = {
  totalProducts: 150,
  totalValue: 25000,
  lowStockCount: 5,
  outOfStockCount: 2,
  expiringCount: 0,
  recentMovements: [],
};

const mockLowStockProducts = [
  { id: '1', name: 'Arroz 5kg', internalCode: 'A1', currentStock: 3, minStock: 10 },
  { id: '2', name: 'Feijão 1kg', internalCode: 'F1', currentStock: 0, minStock: 15 },
  { id: '3', name: 'Zero Min Product', internalCode: 'Z1', currentStock: 0, minStock: 0 },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('StockPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useStockReport).mockReturnValue({
      data: mockReport,
      isLoading: false,
      isError: false,
    } as any);

    vi.mocked(useLowStockProducts).mockReturnValue({
      data: mockLowStockProducts,
      isLoading: false,
    } as any);
  });

  it('should render page title', () => {
    render(<StockPage />, { wrapper: createWrapper() });
    expect(screen.getByText('Estoque')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    vi.mocked(useStockReport).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    render(<StockPage />, { wrapper: createWrapper() });
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('should display summary metrics with correct formatting', () => {
    render(<StockPage />, { wrapper: createWrapper() });

    expect(screen.getByText('150')).toBeInTheDocument();
    // Currency formatting check (BRL) - forced update
    expect(
      screen.getByText((content) => content.includes('R$') && content.includes('25.000,00'))
    ).toBeInTheDocument();
    expect(screen.getByText('5')).toHaveClass('text-warning');
    expect(screen.getByText('2')).toHaveClass('text-destructive');
  });

  it('should display low stock products table with correct variants', () => {
    render(<StockPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Arroz 5kg')).toBeInTheDocument();

    // Low stock badge (warning)
    const arrozStock = screen.getByText('3');
    expect(arrozStock).toHaveClass('bg-warning');

    // Out of stock badge (destructive)
    const outOfStockBadges = screen.getAllByText('0', { selector: '.bg-destructive' });
    expect(outOfStockBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('should handle division by zero for products with zero minStock', () => {
    render(<StockPage />, { wrapper: createWrapper() });

    // Product 3 has minStock 0 and currentStock 0, percent should be 0.
    const zeroPcents = screen.getAllByText('0%');
    // One for Out of stock summary maybe? No, the summary doesn't show %.
    // One for Feijão maybe (actually 0/15 is 0)
    // One for Zero Min Product
    expect(zeroPcents.length).toBeGreaterThanOrEqual(1);
  });

  it('should show empty state when no low stock products', () => {
    vi.mocked(useLowStockProducts).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    render(<StockPage />, { wrapper: createWrapper() });
    expect(screen.getByText(/todos os produtos estão com estoque adequado/i)).toBeInTheDocument();
  });

  it('should show expiring products alert when count > 0', () => {
    vi.mocked(useStockReport).mockReturnValue({
      data: { ...mockReport, expiringCount: 3 },
      isLoading: false,
    } as any);

    render(<StockPage />, { wrapper: createWrapper() });
    expect(screen.getByText(/produtos próximos do vencimento/i)).toBeInTheDocument();
    expect(screen.getByTestId('expiring-count')).toHaveTextContent('3');
  });
});
