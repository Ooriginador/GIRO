/**
 * @file CartItemRow.test.tsx - Testes para o componente CartItemRow
 */

import { CartItemRow } from '@/components/pdv/CartItemRow';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock do PDV Store
const mockUpdateQuantity = vi.fn();
const mockRemoveItem = vi.fn();

vi.mock('@/stores/pdv-store', () => ({
  usePDVStore: () => ({
    updateQuantity: mockUpdateQuantity,
    removeItem: mockRemoveItem,
  }),
}));

const mockItem = {
  id: 'item1',
  productId: 'prod1',
  productName: 'Arroz 5kg',
  barcode: '7891234567890',
  quantity: 2,
  unitPrice: 24.9,
  discount: 0,
  unit: 'UN',
  isWeighted: false,
};

const mockWeightedItem = {
  ...mockItem,
  id: 'item2',
  productName: 'Queijo Minas',
  quantity: 0.5,
  unit: 'KG',
  isWeighted: true,
};

describe('CartItemRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render product name', () => {
    render(<CartItemRow item={mockItem} index={1} />);

    expect(screen.getByText('Arroz 5kg')).toBeInTheDocument();
  });

  it('should render item index', () => {
    render(<CartItemRow item={mockItem} index={3} />);

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should render barcode badge', () => {
    render(<CartItemRow item={mockItem} index={1} />);

    expect(screen.getByText('7891234567890')).toBeInTheDocument();
  });

  it('should render unit price', () => {
    render(<CartItemRow item={mockItem} index={1} />);

    expect(screen.getByText(/R\$\s*24,90/)).toBeInTheDocument();
  });

  it('should render quantity for non-weighted item', () => {
    render(<CartItemRow item={mockItem} index={1} />);

    // Quantity is shown in the quantity display area
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should render weighted quantity with decimals', () => {
    render(<CartItemRow item={mockWeightedItem} index={1} />);

    expect(screen.getByText('0.500')).toBeInTheDocument();
  });

  it('should call updateQuantity when incrementing', () => {
    render(<CartItemRow item={mockItem} index={1} />);

    const buttons = screen.getAllByRole('button');
    // Find the increment button (has + icon)
    const incrementButton = buttons[1] ?? null;
    expect(incrementButton).not.toBeNull();
    fireEvent.click(incrementButton!);

    expect(mockUpdateQuantity).toHaveBeenCalledWith('item1', 3);
  });

  it('should call updateQuantity when decrementing', () => {
    render(<CartItemRow item={mockItem} index={1} />);

    const buttons = screen.getAllByRole('button');
    const decrementButton = buttons[0] ?? null;
    expect(decrementButton).not.toBeNull();
    fireEvent.click(decrementButton!);

    expect(mockUpdateQuantity).toHaveBeenCalledWith('item1', 1);
  });

  it('should disable decrement when quantity is 1', () => {
    const singleItem = { ...mockItem, quantity: 1 };
    render(<CartItemRow item={singleItem} index={1} />);

    const buttons = screen.getAllByRole('button');
    const decrementButton = buttons[0];
    expect(decrementButton).toBeDisabled();
  });

  it('should show discount when present', () => {
    const itemWithDiscount = { ...mockItem, discount: 5 };
    render(<CartItemRow item={itemWithDiscount} index={1} />);

    expect(screen.getByText(/\(-R\$\s*5,00\)/)).toBeInTheDocument();
  });
});
