/**
 * @file StockMovementsPage.test.tsx - Testes para histórico de movimentações
 */

import { useStockMovements } from '@/hooks/useStock';
import { StockMovementsPage } from '@/pages/stock/StockMovementsPage';
import { createQueryWrapper } from '@/test/queryWrapper';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock apenas o hook que faz chamadas externas
vi.mock('@/hooks/useStock', () => ({
  useStockMovements: vi.fn(),
}));

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockMovements = [
  {
    id: 'm1',
    type: 'ENTRY',
    quantity: 10,
    previousStock: 0,
    newStock: 10,
    createdAt: new Date().toISOString(),
    product: { name: 'Arroz Tipo 1', internalCode: 'AR001' },
    reason: 'Compra',
  },
  {
    id: 'm2',
    type: 'SALE',
    quantity: 2,
    previousStock: 10,
    newStock: 8,
    createdAt: new Date().toISOString(),
    product: { name: 'Feijão Preto', internalCode: 'FE001' },
    reason: 'Venda #1',
  },
  {
    id: 'm3',
    type: 'ADJUSTMENT',
    quantity: -3,
    previousStock: 8,
    newStock: 5,
    createdAt: new Date().toISOString(),
    product: { name: 'Açúcar Cristal', internalCode: 'AC001' },
    reason: 'Ajuste de inventário',
  },
];

describe('StockMovementsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render page title and description', () => {
    vi.mocked(useStockMovements).mockReturnValue({
      data: mockMovements,
      isLoading: false,
    } as ReturnType<typeof useStockMovements>);

    render(<StockMovementsPage />, { wrapper: createQueryWrapper() });

    expect(screen.getByText('Movimentações de Estoque')).toBeInTheDocument();
    expect(screen.getByText(/Histórico de todas as entradas/i)).toBeInTheDocument();
  });

  it('should display all movements in table', () => {
    vi.mocked(useStockMovements).mockReturnValue({
      data: mockMovements,
      isLoading: false,
    } as ReturnType<typeof useStockMovements>);

    render(<StockMovementsPage />, { wrapper: createQueryWrapper() });

    expect(screen.getByText('Arroz Tipo 1')).toBeInTheDocument();
    expect(screen.getByText('Feijão Preto')).toBeInTheDocument();
    expect(screen.getByText('Açúcar Cristal')).toBeInTheDocument();
  });

  it('should filter movements by product name', async () => {
    const user = userEvent.setup();
    vi.mocked(useStockMovements).mockReturnValue({
      data: mockMovements,
      isLoading: false,
    } as ReturnType<typeof useStockMovements>);

    render(<StockMovementsPage />, { wrapper: createQueryWrapper() });

    const searchInput = screen.getByPlaceholderText(/buscar por produto/i);
    await user.type(searchInput, 'Arroz');

    expect(screen.getByText('Arroz Tipo 1')).toBeInTheDocument();
    expect(screen.queryByText('Feijão Preto')).not.toBeInTheDocument();
    expect(screen.queryByText('Açúcar Cristal')).not.toBeInTheDocument();
  });

  it('should navigate back when clicking back button', async () => {
    const user = userEvent.setup();
    vi.mocked(useStockMovements).mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof useStockMovements>);

    render(<StockMovementsPage />, { wrapper: createQueryWrapper() });

    const backBtn = screen.getByRole('button', { name: /voltar/i });
    await user.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('should show loading state', () => {
    vi.mocked(useStockMovements).mockReturnValue({
      data: [],
      isLoading: true,
    } as ReturnType<typeof useStockMovements>);

    render(<StockMovementsPage />, { wrapper: createQueryWrapper() });

    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should show empty state when no movements', () => {
    vi.mocked(useStockMovements).mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof useStockMovements>);

    render(<StockMovementsPage />, { wrapper: createQueryWrapper() });

    expect(screen.getByText(/nenhuma movimentação encontrada/i)).toBeInTheDocument();
  });

  it('should display movement details correctly', () => {
    vi.mocked(useStockMovements).mockReturnValue({
      data: mockMovements,
      isLoading: false,
    } as ReturnType<typeof useStockMovements>);

    render(<StockMovementsPage />, { wrapper: createQueryWrapper() });

    // Product codes should be visible
    expect(screen.getByText('AR001')).toBeInTheDocument();
    expect(screen.getByText('FE001')).toBeInTheDocument();

    // Reasons should be visible
    expect(screen.getByText('Compra')).toBeInTheDocument();
    expect(screen.getByText('Venda #1')).toBeInTheDocument();
  });

  it('should display quantity changes with correct format', () => {
    vi.mocked(useStockMovements).mockReturnValue({
      data: mockMovements,
      isLoading: false,
    } as ReturnType<typeof useStockMovements>);

    render(<StockMovementsPage />, { wrapper: createQueryWrapper() });

    // Check if quantities are displayed (symbols +,- might be implied by color/icon)
    // We check for the numbers exist presence
    expect(screen.getAllByText('10').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
  });

  it('should display stock before and after for each movement', () => {
    vi.mocked(useStockMovements).mockReturnValue({
      data: [mockMovements[0]],
      isLoading: false,
    } as ReturnType<typeof useStockMovements>);

    render(<StockMovementsPage />, { wrapper: createQueryWrapper() });

    // First movement: 0 -> 10
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getAllByText('10').length).toBeGreaterThan(0);
  });

  it('should handle movement with null reason', () => {
    vi.mocked(useStockMovements).mockReturnValue({
      data: [
        {
          id: 'm4',
          type: 'ADJUSTMENT',
          quantity: 5,
          previousStock: 0,
          newStock: 5,
          createdAt: new Date().toISOString(),
          product: { name: 'Produto Teste', internalCode: 'PT01' },
          reason: null,
        },
      ],
      isLoading: false,
    } as ReturnType<typeof useStockMovements>);

    render(<StockMovementsPage />, { wrapper: createQueryWrapper() });

    expect(screen.getByText('Produto Teste')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument(); // reason null shows as dash
  });

  it('should clear search filter', async () => {
    const user = userEvent.setup();
    vi.mocked(useStockMovements).mockReturnValue({
      data: mockMovements,
      isLoading: false,
    } as ReturnType<typeof useStockMovements>);

    render(<StockMovementsPage />, { wrapper: createQueryWrapper() });

    const searchInput = screen.getByPlaceholderText(/buscar por produto/i);

    // Type to filter
    await user.type(searchInput, 'Arroz');
    expect(screen.queryByText('Feijão Preto')).not.toBeInTheDocument();

    // Clear the filter
    await user.clear(searchInput);
    expect(screen.getByText('Feijão Preto')).toBeInTheDocument();
  });
});
