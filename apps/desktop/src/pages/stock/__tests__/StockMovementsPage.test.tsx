/**
 * @file StockMovementsPage.test.tsx - Testes para histórico de movimentações
 */

import { useStockMovements } from '@/hooks/useStock';
import { StockMovementsPage } from '@/pages/stock/StockMovementsPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock hooks
vi.mock('@/hooks/useStock', () => ({
  useStockMovements: vi.fn(),
}));

// Mock UI Select
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <select data-testid="type-filter" value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: any) => children,
  SelectValue: ({ placeholder }: any) => placeholder,
  SelectContent: ({ children }: any) => children,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
}));

const mockMovements = [
  {
    id: 'm1',
    type: 'ENTRY',
    quantity: 10,
    previousStock: 0,
    newStock: 10,
    createdAt: new Date().toISOString(),
    product: { name: 'Arroz', internalCode: 'AR001' },
    reason: 'Compra',
  },
  {
    id: 'm2',
    type: 'SALE',
    quantity: 2,
    previousStock: 10,
    newStock: 8,
    createdAt: new Date().toISOString(),
    product: { name: 'Feijão', internalCode: 'FE001' },
    reason: 'Venda #1',
  },
];

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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

describe('StockMovementsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render page contents', () => {
    vi.mocked(useStockMovements).mockReturnValue({
      data: mockMovements,
      isLoading: false,
    } as any);

    render(<StockMovementsPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Movimentações de Estoque')).toBeInTheDocument();
    expect(screen.getByText('Arroz')).toBeInTheDocument();
    expect(screen.getByText('Feijão')).toBeInTheDocument();
  });

  it('should filter movements by product name', async () => {
    const user = userEvent.setup();
    vi.mocked(useStockMovements).mockReturnValue({
      data: mockMovements,
      isLoading: false,
    } as any);

    render(<StockMovementsPage />, { wrapper: createWrapper() });

    const searchInput = screen.getByPlaceholderText(/buscar por produto/i);
    await user.type(searchInput, 'Arroz');

    expect(screen.getByText('Arroz')).toBeInTheDocument();
    expect(screen.queryByText('Feijão')).not.toBeInTheDocument();
  });

  it('should filter movements by type', async () => {
    vi.mocked(useStockMovements).mockReturnValue({
      data: mockMovements,
      isLoading: false,
    } as any);

    render(<StockMovementsPage />, { wrapper: createWrapper() });

    const select = screen.getByTestId('type-filter');
    fireEvent.change(select, { target: { value: 'SALE' } });

    expect(screen.getByText('Feijão')).toBeInTheDocument();
    expect(screen.queryByText('Arroz')).not.toBeInTheDocument();
  });

  it('should navigate back when clicking back button', () => {
    vi.mocked(useStockMovements).mockReturnValue({ data: [], isLoading: false } as any);
    render(<StockMovementsPage />, { wrapper: createWrapper() });

    const backBtn = screen.getByTestId('back-button');
    fireEvent.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('should show loading state', () => {
    vi.mocked(useStockMovements).mockReturnValue({ data: [], isLoading: true } as any);
    const { container } = render(<StockMovementsPage />, { wrapper: createWrapper() });
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should show empty state when no movements', () => {
    vi.mocked(useStockMovements).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    render(<StockMovementsPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/nenhuma movimentação encontrada/i)).toBeInTheDocument();
  });

  it('should handle unknown movement types gracefully', () => {
    vi.mocked(useStockMovements).mockReturnValue({
      data: [
        {
          id: 'm3',
          type: 'UNKNOWN',
          quantity: 5,
          previousStock: 0,
          newStock: 5,
          createdAt: new Date().toISOString(),
          product: { name: 'Unknown', internalCode: 'U01' },
          reason: null,
        },
      ],
      isLoading: false,
    } as any);

    render(<StockMovementsPage />, { wrapper: createWrapper() });
    expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument(); // reason null
  });
});
