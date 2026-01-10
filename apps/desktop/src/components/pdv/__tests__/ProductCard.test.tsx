/**
 * @file ProductCard.test.tsx - Testes para o componente ProductCard
 */

import { ProductCard } from '@/components/pdv/ProductCard';
import { fireEvent, render, screen } from '@testing-library/react';
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
    it('should render product name', () => {
      render(<ProductCard product={mockProduct} />);

      expect(screen.getByText('Arroz 5kg')).toBeInTheDocument();
    });

    it('should render product price', () => {
      render(<ProductCard product={mockProduct} />);

      expect(screen.getByText(/R\$\s*24,90/)).toBeInTheDocument();
    });

    it('should show stock when showStock is true', () => {
      render(<ProductCard product={mockProduct} showStock={true} />);

      expect(screen.getByText(/50\s*UN/)).toBeInTheDocument();
    });

    it('should call onSelect when clicked', () => {
      const onSelect = vi.fn();
      render(<ProductCard product={mockProduct} onSelect={onSelect} />);

      fireEvent.click(screen.getByRole('button'));
      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('should be disabled when out of stock', () => {
      render(<ProductCard product={mockOutOfStockProduct} />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should show weighted product name', () => {
      render(<ProductCard product={mockWeightedProduct} />);

      expect(screen.getByText('Queijo Minas')).toBeInTheDocument();
    });

    it('should show low stock product', () => {
      render(<ProductCard product={mockLowStockProduct} showStock={true} />);

      expect(screen.getByText('Óleo de Soja')).toBeInTheDocument();
    });
  });

  describe('Detailed Variant', () => {
    it('should render detailed view with more info', () => {
      render(<ProductCard product={mockProduct} variant="detailed" />);

      expect(screen.getByText('Arroz 5kg')).toBeInTheDocument();
      expect(screen.getByText(/R\$\s*24,90/)).toBeInTheDocument();
    });

    it('should show code in detailed variant', () => {
      render(<ProductCard product={mockProduct} variant="detailed" />);

      expect(screen.getByText(/código/i)).toBeInTheDocument();
    });

    it('should show stock info', () => {
      render(<ProductCard product={mockProduct} variant="detailed" />);

      expect(screen.getByText(/estoque/i)).toBeInTheDocument();
    });

    it('should show cost price', () => {
      render(<ProductCard product={mockProduct} variant="detailed" />);

      expect(screen.getByText(/custo/i)).toBeInTheDocument();
    });
  });
});
