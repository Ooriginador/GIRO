/**
 * @file ProductCard.test.tsx - Testes para o componente ProductCard
 */

import { ProductCard } from '@/components/pdv/ProductCard';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockProduct = {
  id: '1',
  name: 'Arroz 5kg',
  barcode: '7891234567890',
  internalCode: 'P0001',
  salePrice: 24.9,
  costPrice: 18.0,
  currentStock: 50,
  minStock: 10,
  unit: 'UN',
  isWeighted: false,
  isActive: true,
};

const mockWeightedProduct = {
  ...mockProduct,
  id: '2',
  name: 'Queijo Minas',
  isWeighted: true,
  unit: 'KG',
};

const mockLowStockProduct = {
  ...mockProduct,
  id: '3',
  name: 'Óleo de Soja',
  currentStock: 5,
  minStock: 10,
};

const mockOutOfStockProduct = {
  ...mockProduct,
  id: '4',
  name: 'Café 500g',
  currentStock: 0,
};

describe('ProductCard', () => {
  describe('Compact Variant', () => {
    it('should render product name', async () => {
      await act(async () => {
        render(<ProductCard product={mockProduct} />);
      });

      expect(screen.getByText('Arroz 5kg')).toBeInTheDocument();
    });

    it('should render product price', async () => {
      await act(async () => {
        render(<ProductCard product={mockProduct} />);
      });

      expect(screen.getByText(/R\$\s*24,90/)).toBeInTheDocument();
    });

    it('should show stock when showStock is true', async () => {
      await act(async () => {
        render(<ProductCard product={mockProduct} showStock={true} />);
      });

      expect(screen.getByText(/50\s*UN/)).toBeInTheDocument();
    });

    it('should call onSelect when clicked', async () => {
      const onSelect = vi.fn();
      await act(async () => {
        render(<ProductCard product={mockProduct} onSelect={onSelect} />);
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });
      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('should be disabled when out of stock', async () => {
      await act(async () => {
        render(<ProductCard product={mockOutOfStockProduct} />);
      });

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should show weighted product name', async () => {
      await act(async () => {
        render(<ProductCard product={mockWeightedProduct} />);
      });

      expect(screen.getByText('Queijo Minas')).toBeInTheDocument();
    });

    it('should show low stock product', async () => {
      await act(async () => {
        render(<ProductCard product={mockLowStockProduct} showStock={true} />);
      });

      expect(screen.getByText('Óleo de Soja')).toBeInTheDocument();
    });
  });

  describe('Detailed Variant', () => {
    it('should render detailed view with more info', async () => {
      await act(async () => {
        render(<ProductCard product={mockProduct} variant="detailed" />);
      });

      expect(screen.getByText('Arroz 5kg')).toBeInTheDocument();
      expect(screen.getByText(/R\$\s*24,90/)).toBeInTheDocument();
    });

    it('should show code in detailed variant', async () => {
      await act(async () => {
        render(<ProductCard product={mockProduct} variant="detailed" />);
      });

      expect(screen.getByText(/código/i)).toBeInTheDocument();
    });

    it('should show stock info', async () => {
      await act(async () => {
        render(<ProductCard product={mockProduct} variant="detailed" />);
      });

      expect(screen.getByText(/estoque/i)).toBeInTheDocument();
    });

    it('should show cost price', async () => {
      await act(async () => {
        render(<ProductCard product={mockProduct} variant="detailed" />);
      });

      expect(screen.getByText(/custo/i)).toBeInTheDocument();
    });
  });
});
