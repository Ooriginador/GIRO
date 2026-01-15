/**
 * @file StockEntryPage.test.tsx - Testes para a página de entrada de estoque
 */

import { useProductSearch } from '@/hooks';
import { useAddStockEntry } from '@/hooks/useStock';
import { StockEntryPage } from '@/pages/stock/StockEntryPage';
import { createQueryWrapper } from '@/test/queryWrapper';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock hooks
vi.mock('@/hooks', () => ({
  useProductSearch: vi.fn(),
}));

vi.mock('@/hooks/useStock', () => ({
  useAddStockEntry: vi.fn(),
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

// Mock Calendar to simplify date selection
vi.mock('@/components/ui/calendar', () => ({
  Calendar: ({ onSelect }: any) => (
    <button data-testid="calendar-day" onClick={() => onSelect(new Date('2026-12-31T12:00:00Z'))}>
      31
    </button>
  ),
}));

const mockProducts = [
  { id: '1', name: 'Product A', internalCode: 'A1', salePrice: 10, currentStock: 5, costPrice: 5 },
];

describe('StockEntryPage', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useProductSearch).mockReturnValue({ data: mockProducts, isLoading: false } as any);
    vi.mocked(useAddStockEntry).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isLoading: false,
    } as any);
  });

  const setup = () => {
    const { Wrapper } = createQueryWrapper();
    return render(<StockEntryPage />, { wrapper: Wrapper });
  };

  it('should allow searching and selecting a product', async () => {
    setup();

    const searchInput = screen.getByPlaceholderText(/buscar por nome ou código/i);
    await user.type(searchInput, 'Product');

    const productBtn = await screen.findByText('Product A');
    await user.click(productBtn);

    expect(screen.getByText('Estoque atual: 5')).toBeInTheDocument();
  });

  it('should submit stock entry with all fields', async () => {
    const mockMutate = vi.fn().mockResolvedValue({});
    vi.mocked(useAddStockEntry).mockReturnValue({
      mutateAsync: mockMutate,
      isLoading: false,
    } as any);

    setup();

    // Select product
    await user.type(screen.getByPlaceholderText(/buscar por nome ou código/i), 'Product');
    await user.click(await screen.findByText('Product A'));

    // Fill fields
    await user.clear(screen.getByLabelText(/quantidade/i));
    await user.type(screen.getByLabelText(/quantidade/i), '10');

    await user.type(screen.getByLabelText(/número do lote/i), 'LOT-123');

    // Select date
    await user.click(screen.getByText(/selecionar data/i));
    await user.click(screen.getByTestId('calendar-day'));

    // Submit
    await user.click(screen.getByText(/registrar entrada/i));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: '1',
          quantity: 10,
          lotNumber: 'LOT-123',
          expirationDate: expect.any(String),
        })
      );
      expect(mockNavigate).toHaveBeenCalledWith('/stock');
    });
  });

  it('should navigate back on cancel', async () => {
    setup();

    await user.click(screen.getByText(/cancelar/i));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('should navigate back on arrow click', async () => {
    setup();

    // The button with ArrowLeft icon is the first button usually
    await user.click(screen.getAllByRole('button')[0]);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
