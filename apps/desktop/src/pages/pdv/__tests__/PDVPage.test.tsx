/**
 * @file PDVPage.test.tsx - Testes de integração do PDV
 */

import { PDVPage } from '@/pages/pdv/PDVPage';
import { useAuthStore } from '@/stores/auth-store';
import { usePDVStore } from '@/stores/pdv-store';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock do useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock dos stores
vi.mock('@/stores/pdv-store', () => ({
  usePDVStore: vi.fn(),
}));

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: vi.fn(),
}));

// Mock dos componentes internos
vi.mock('@/components/pdv/ProductSearchResults', () => ({
  ProductSearchResults: ({ onSelect }: any) => (
    <div data-testid="search-results">
      <button
        onClick={() =>
          onSelect({
            id: 'p1',
            name: 'Product 1',
            salePrice: 10,
            barcode: '123',
            isWeighted: false,
            unit: 'UN',
          })
        }
      >
        Select Product
      </button>
      <button
        onClick={() =>
          onSelect({
            id: 'p2',
            name: 'Weighted Product',
            salePrice: 5,
            barcode: '456',
            isWeighted: true,
            unit: 'KG',
          })
        }
      >
        Select Weighted Product
      </button>
    </div>
  ),
}));

vi.mock('@/components/pdv/PaymentModal', () => ({
  PaymentModal: ({ open, onClose }: any) =>
    open ? (
      <div data-testid="payment-modal">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.mock('@/components/pdv/CartItemRow', () => ({
  CartItemRow: ({ item, index }: any) => (
    <div data-testid={`cart-row-${item.id}`}>
      Item {index}: {item.productName}
    </div>
  ),
}));

const renderPDV = () => {
  return render(
    <MemoryRouter>
      <PDVPage />
    </MemoryRouter>
  );
};

describe('PDVPage', () => {
  const mockPDVStore = {
    items: [],
    discount: 0,
    addItem: vi.fn(),
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
    setDiscount: vi.fn(),
    clearCart: vi.fn(),
    getSubtotal: vi.fn(() => 0),
    getTotal: vi.fn(() => 0),
  };

  const mockAuthStore = {
    currentSession: null,
    currentUser: { id: 'u1', name: 'Admin' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePDVStore).mockReturnValue(mockPDVStore);
    vi.mocked(useAuthStore).mockReturnValue(mockAuthStore as any);
  });

  it('should show closed message when no session and allow opening cash', async () => {
    const user = userEvent.setup();
    renderPDV();
    expect(screen.getByText(/Caixa Fechado/i)).toBeInTheDocument();

    await user.click(screen.getByText(/Abrir Caixa/i));
    expect(mockNavigate).toHaveBeenCalledWith('/cash');
  });

  it('should render PDV and handle search interactions', async () => {
    const user = userEvent.setup();
    vi.mocked(useAuthStore).mockReturnValue({
      ...mockAuthStore,
      currentSession: { id: 's1' },
    } as any);

    renderPDV();
    const input = screen.getByPlaceholderText(/Buscar produto/i);

    // Test empty search
    await user.clear(input);
    expect(screen.queryByTestId('search-results')).not.toBeInTheDocument();

    // Test search with text
    await user.type(input, 'P');
    expect(screen.getByTestId('search-results')).toBeInTheDocument();

    // Select product
    await user.click(screen.getByText('Select Product'));
    expect(mockPDVStore.addItem).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'p1',
        productName: 'Product 1',
      })
    );
    expect(screen.queryByTestId('search-results')).not.toBeInTheDocument();
  });

  it('should handle weighted product selection', async () => {
    const user = userEvent.setup();
    vi.mocked(useAuthStore).mockReturnValue({
      ...mockAuthStore,
      currentSession: { id: 's1' },
    } as any);

    renderPDV();
    const input = screen.getByPlaceholderText(/Buscar produto/i);
    await user.type(input, 'W');

    await user.click(screen.getByText('Select Weighted Product'));
    expect(mockPDVStore.addItem).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'p2',
        isWeighted: true,
      })
    );
  });

  it('should handle F shortcuts', async () => {
    vi.mocked(useAuthStore).mockReturnValue({
      ...mockAuthStore,
      currentSession: { id: 's1' },
    } as any);
    vi.mocked(usePDVStore).mockReturnValue({
      ...mockPDVStore,
      items: [
        { id: 'i1', productId: 'p1', productName: 'P1', quantity: 1, unitPrice: 10, total: 10 },
      ],
    });

    renderPDV();

    // F2
    fireEvent.keyDown(window, { key: 'F2' });
    expect(screen.getByPlaceholderText(/Buscar produto/i)).toHaveFocus();

    // F4
    fireEvent.keyDown(window, { key: 'F4' });
    expect(screen.getByText(/Alterar Quantidade/i)).toBeInTheDocument();

    // F6
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.keyDown(window, { key: 'F6' });
    expect(screen.getByText(/Aplicar Desconto/i)).toBeInTheDocument();

    // F10
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.keyDown(window, { key: 'F10' });
    expect(screen.getByTestId('payment-modal')).toBeInTheDocument();

    // F12
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.keyDown(window, { key: 'F12' });
    expect(mockPDVStore.removeItem).toHaveBeenCalledWith('i1');
  });

  it('should ignore shortcuts when no items are present', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      ...mockAuthStore,
      currentSession: { id: 's1' },
    } as any);
    vi.mocked(usePDVStore).mockReturnValue({
      ...mockPDVStore,
      items: [],
    });

    renderPDV();

    // F4 should not open modal
    fireEvent.keyDown(window, { key: 'F4' });
    expect(screen.queryByText(/Alterar Quantidade/i)).not.toBeInTheDocument();

    // F6 should not open modal
    fireEvent.keyDown(window, { key: 'F6' });
    expect(screen.queryByText(/Aplicar Desconto/i)).not.toBeInTheDocument();

    // F10 should not open modal
    fireEvent.keyDown(window, { key: 'F10' });
    expect(screen.queryByTestId('payment-modal')).not.toBeInTheDocument();
  });

  it('should handle quantity and discount confirmations via mouse with comma/dot logic', async () => {
    const user = userEvent.setup();
    vi.mocked(useAuthStore).mockReturnValue({
      ...mockAuthStore,
      currentSession: { id: 's1' },
    } as any);
    vi.mocked(usePDVStore).mockReturnValue({
      ...mockPDVStore,
      items: [
        { id: 'i1', productId: 'p1', productName: 'P1', quantity: 1, unitPrice: 10, total: 10 },
      ],
    });

    renderPDV();

    // Quantity with comma
    fireEvent.keyDown(window, { key: 'F4' });
    const qtyInput = screen.getByPlaceholderText('0');
    fireEvent.change(qtyInput, { target: { value: '2,5' } });
    await user.click(screen.getByRole('button', { name: /Confirmar/i }));
    expect(mockPDVStore.updateQuantity).toHaveBeenCalledWith('i1', 2.5);

    // Discount with comma
    fireEvent.keyDown(window, { key: 'F6' });
    const discountInput = screen.getByPlaceholderText('0,00');
    fireEvent.change(discountInput, { target: { value: '5,50' } });
    await user.click(screen.getByRole('button', { name: /Aplicar/i }));
    expect(mockPDVStore.setDiscount).toHaveBeenCalledWith(5.5);
  });

  it('should handle invalid quantity/discount inputs', async () => {
    const user = userEvent.setup();
    vi.mocked(useAuthStore).mockReturnValue({
      ...mockAuthStore,
      currentSession: { id: 's1' },
    } as any);
    vi.mocked(usePDVStore).mockReturnValue({
      ...mockPDVStore,
      items: [
        { id: 'i1', productId: 'p1', productName: 'P1', quantity: 1, unitPrice: 10, total: 10 },
      ],
    });

    renderPDV();

    // Invalid quantity (not a number) should be ignored
    fireEvent.keyDown(window, { key: 'F4' });
    let qtyInput = await screen.findByLabelText(/Nova quantidade/i);
    fireEvent.change(qtyInput, { target: { value: 'abc' } });
    await user.click(screen.getByRole('button', { name: /Confirmar/i }));
    // Modal closes even on invalid input in current implementation
    expect(mockPDVStore.updateQuantity).not.toHaveBeenCalled();

    // Re-open for negative quantity test
    fireEvent.keyDown(window, { key: 'F4' });
    qtyInput = await screen.findByLabelText(/Nova quantidade/i);
    fireEvent.change(qtyInput, { target: { value: '-10' } });
    await user.click(screen.getByRole('button', { name: /Confirmar/i }));
    expect(mockPDVStore.updateQuantity).not.toHaveBeenCalled();

    // Closing modal via Cancelar
    fireEvent.keyDown(window, { key: 'F4' });
    await screen.findByLabelText(/Nova quantidade/i);
    await user.click(screen.getByRole('button', { name: /Cancelar/i }));
    await waitFor(() => {
      expect(screen.queryByLabelText(/Nova quantidade/i)).not.toBeInTheDocument();
    });

    // Non-numeric discount should result in setDiscount(0)
    fireEvent.keyDown(window, { key: 'F6' });
    const discountInput = await screen.findByLabelText(/Valor do desconto/i);
    fireEvent.change(discountInput, { target: { value: 'xyz' } });
    await user.click(screen.getByRole('button', { name: /Aplicar/i }));
    expect(mockPDVStore.setDiscount).toHaveBeenCalledWith(0);
  });

  it('should open payment modal via buttons', async () => {
    const user = userEvent.setup();
    vi.mocked(useAuthStore).mockReturnValue({
      ...mockAuthStore,
      currentSession: { id: 's1' },
    } as any);
    vi.mocked(usePDVStore).mockReturnValue({
      ...mockPDVStore,
      items: [
        { id: 'i1', productId: 'p1', productName: 'P1', quantity: 1, unitPrice: 10, total: 10 },
      ],
    });

    renderPDV();

    await user.click(screen.getByText(/Dinheiro/i));
    expect(screen.getByTestId('payment-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Close'));
    expect(screen.queryByTestId('payment-modal')).not.toBeInTheDocument();

    await user.click(screen.getByText(/PIX/i));
    expect(screen.getByTestId('payment-modal')).toBeInTheDocument();
  });

  it('should clear cart when clicking clear button', async () => {
    const user = userEvent.setup();
    vi.mocked(useAuthStore).mockReturnValue({
      ...mockAuthStore,
      currentSession: { id: 's1' },
    } as any);
    vi.mocked(usePDVStore).mockReturnValue({
      ...mockPDVStore,
      items: [{ id: 'i1', productName: 'P1' }],
    });

    renderPDV();
    await user.click(screen.getByText(/Limpar/i));
    expect(mockPDVStore.clearCart).toHaveBeenCalled();
  });
});
