import { PDVPage } from '@/pages/pdv/PDVPage';
import { useAuthStore } from '@/stores/auth-store';
import { usePDVStore } from '@/stores/pdv-store';
import { useCustomers } from '@/hooks/useCustomers';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Increase timeout
vi.setConfig({ testTimeout: 10000 });

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock stores
vi.mock('@/stores/pdv-store', () => ({
  usePDVStore: vi.fn(() => ({
    items: [],
    discount: 0,
    addItem: vi.fn(),
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
    setDiscount: vi.fn(),
    clearCart: vi.fn(),
    getSubtotal: vi.fn(() => 0),
    getTotal: vi.fn(() => 0),
    customerId: null,
    setCustomer: vi.fn(),
    heldSales: [],
    loadHeldSales: vi.fn(),
    holdSale: vi.fn(),
    resumeSale: vi.fn(),
    removeHeldSale: vi.fn(),
  })),
}));

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: vi.fn(),
}));

// Mock hooks
vi.mock('@/hooks/useCustomers', () => ({
  useCustomers: vi.fn(() => ({
    getCustomerById: vi.fn(async () => null),
    searchCustomers: vi.fn(async () => []),
  })),
}));

// Mock sub-components (necessários para testes de integração)
vi.mock('@/components/pdv/CartItemRow', () => ({
  CartItemRow: ({ item, index }: any) => (
    <div data-testid={`cart-row-${item.id}`}>Item {index}</div>
  ),
}));
vi.mock('@/components/pdv/PaymentModal', () => ({
  PaymentModal: ({ open }: any) => (open ? <div data-testid="payment-modal">Payment</div> : null),
}));
vi.mock('@/components/pdv/ProductSearchResults', () => ({
  ProductSearchResults: ({ query, onSelect }: any) =>
    query ? (
      <div data-testid="search-results">
        <button onClick={() => onSelect({ id: 'p1', name: 'P1', salePrice: 10 })}>Select</button>
      </div>
    ) : null,
}));
vi.mock('@/components/motoparts/CustomerSearch', () => ({
  CustomerSearch: () => <div />,
}));

describe('PDVPage Stable', () => {
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
    customerId: null,
    setCustomer: vi.fn(),
    heldSales: [],
    loadHeldSales: vi.fn(),
    holdSale: vi.fn(),
    resumeSale: vi.fn(),
    removeHeldSale: vi.fn(),
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

  it('renders closed state correctly', () => {
    render(
      <MemoryRouter>
        <PDVPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/Caixa Fechado/i)).toBeInTheDocument();
  });

  it('handles search and product selection', async () => {
    vi.mocked(useAuthStore).mockReturnValue({
      ...mockAuthStore,
      currentSession: { id: 's1' },
    } as any);
    render(
      <MemoryRouter>
        <PDVPage />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Buscar produto/i);
    fireEvent.change(input, { target: { value: 'test' } });

    // Aguardar renderização assíncrona dos resultados
    await waitFor(() => {
      expect(screen.getByTestId('search-results')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Select'));
    expect(mockPDVStore.addItem).toHaveBeenCalled();
  });

  it('handles shortcuts (F10 - Payment)', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      ...mockAuthStore,
      currentSession: { id: 's1' },
    } as any);
    vi.mocked(usePDVStore).mockReturnValue({
      ...mockPDVStore,
      items: [{ id: '1', quantity: 1, total: 10 } as any],
    });

    render(
      <MemoryRouter>
        <PDVPage />
      </MemoryRouter>
    );
    fireEvent.keyDown(window, { key: 'F10' });
    expect(screen.getByTestId('payment-modal')).toBeInTheDocument();
  });

  it('handles cart clearing', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      ...mockAuthStore,
      currentSession: { id: 's1' },
    } as any);
    vi.mocked(usePDVStore).mockReturnValue({
      ...mockPDVStore,
      items: [{ id: '1' } as any],
    });

    render(
      <MemoryRouter>
        <PDVPage />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText(/Limpar/i));
    fireEvent.click(screen.getByText(/Sim, cancelar/i));
    expect(mockPDVStore.clearCart).toHaveBeenCalled();
  });

  it('handles F4 (Quantity) and F6 (Discount) modals', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      ...mockAuthStore,
      currentSession: { id: 's1' },
    } as any);
    vi.mocked(usePDVStore).mockReturnValue({
      ...mockPDVStore,
      items: [{ id: '1', quantity: 1, total: 10 } as any],
    });

    render(
      <MemoryRouter>
        <PDVPage />
      </MemoryRouter>
    );

    // F4
    fireEvent.keyDown(window, { key: 'F4' });
    expect(screen.getByText(/Alterar Quantidade/i)).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });

    // F6
    fireEvent.keyDown(window, { key: 'F6' });
    expect(screen.getByText(/Aplicar Desconto/i)).toBeInTheDocument();
  });
});
