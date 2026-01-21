/**
 * @file ProductSearchResults.test.tsx - Tests for ProductSearchResults component
 */

import { ProductSearchResults } from '@/components/pdv/ProductSearchResults';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock useProducts hook
const mockProducts = [
  {
    id: 'prod-1',
    name: 'Óleo Motor 10W40',
    internalCode: 'OL001',
    barcode: '7891234567890',
    salePrice: 45.9,
    currentStock: 10,
    minStock: 5,
    isWeighted: false,
    isActive: true,
  },
  {
    id: 'prod-2',
    name: 'Filtro de Ar',
    internalCode: 'FA002',
    barcode: '7891234567891',
    salePrice: 32.5,
    currentStock: 0,
    minStock: 3,
    isWeighted: false,
    isActive: true,
  },
  {
    id: 'prod-3',
    name: 'Pastilha de Freio',
    internalCode: 'PF003',
    barcode: null,
    salePrice: 89.9,
    currentStock: 2,
    minStock: 5,
    isWeighted: true,
    isActive: true,
  },
];

let mockIsLoading = false;
let mockReturnProducts = mockProducts;

vi.mock('@/hooks/use-products', () => ({
  useProducts: () => ({
    data: mockReturnProducts,
    isLoading: mockIsLoading,
  }),
}));

describe('ProductSearchResults', () => {
  const mockOnSelect = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = false;
    mockReturnProducts = mockProducts;
  });

  const renderComponent = (query = 'oleo') => {
    return render(
      <ProductSearchResults query={query} onSelect={mockOnSelect} onClose={mockOnClose} />
    );
  };

  describe('Rendering', () => {
    it('should render loading state', async () => {
      mockIsLoading = true;
      await act(async () => {
        renderComponent();
      });
      expect(screen.getByText('Buscando...')).toBeInTheDocument();
    });

    it('should render empty state when no products found', async () => {
      mockReturnProducts = [];
      await act(async () => {
        renderComponent();
      });
      expect(screen.getByText('Nenhum produto encontrado')).toBeInTheDocument();
    });

    it('should render product list', async () => {
      await act(async () => {
        renderComponent();
      });
      expect(screen.getByText('Óleo Motor 10W40')).toBeInTheDocument();
      expect(screen.getByText('Filtro de Ar')).toBeInTheDocument();
      expect(screen.getByText('Pastilha de Freio')).toBeInTheDocument();
    });

    it('should display product internal code', async () => {
      await act(async () => {
        renderComponent();
      });
      expect(screen.getByText('OL001')).toBeInTheDocument();
      expect(screen.getByText('FA002')).toBeInTheDocument();
    });

    it('should display product barcode when available', async () => {
      await act(async () => {
        renderComponent();
      });
      expect(screen.getByText('7891234567890')).toBeInTheDocument();
    });

    it('should show "Pesável" badge for weighted products', async () => {
      await act(async () => {
        renderComponent();
      });
      expect(screen.getByText('Pesável')).toBeInTheDocument();
    });

    it('should show "Sem estoque" for products with 0 stock', async () => {
      await act(async () => {
        renderComponent();
      });
      expect(screen.getByText('Sem estoque')).toBeInTheDocument();
    });

    it('should show stock count for products with stock', async () => {
      await act(async () => {
        renderComponent();
      });
      expect(screen.getByText('10 em estoque')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onSelect when clicking a product', async () => {
      await act(async () => {
        renderComponent();
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Óleo Motor 10W40'));
      });

      expect(mockOnSelect).toHaveBeenCalledWith(mockProducts[0]);
    });

    it('should highlight first product by default', async () => {
      await act(async () => {
        renderComponent();
      });

      const firstProductButton = screen.getByText('Óleo Motor 10W40').closest('button');
      expect(firstProductButton).toHaveClass('bg-accent');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate down with ArrowDown', async () => {
      await act(async () => {
        renderComponent();
      });

      await act(async () => {
        fireEvent.keyDown(window, { key: 'ArrowDown' });
      });

      const secondProductButton = screen.getByText('Filtro de Ar').closest('button');
      expect(secondProductButton).toHaveClass('bg-accent');
    });

    it('should navigate up with ArrowUp', async () => {
      await act(async () => {
        renderComponent();
      });

      await act(async () => {
        // First go down
        fireEvent.keyDown(window, { key: 'ArrowDown' });
      });

      await act(async () => {
        // Then go back up
        fireEvent.keyDown(window, { key: 'ArrowUp' });
      });

      const firstProductButton = screen.getByText('Óleo Motor 10W40').closest('button');
      expect(firstProductButton).toHaveClass('bg-accent');
    });

    it('should select product with Enter', async () => {
      await act(async () => {
        renderComponent();
      });

      await act(async () => {
        fireEvent.keyDown(window, { key: 'Enter' });
      });

      expect(mockOnSelect).toHaveBeenCalledWith(mockProducts[0]);
    });

    it('should close with Escape', async () => {
      await act(async () => {
        renderComponent();
      });

      await act(async () => {
        fireEvent.keyDown(window, { key: 'Escape' });
      });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not go below last item', async () => {
      await act(async () => {
        renderComponent();
      });

      await act(async () => {
        // Try to go down 10 times (only 3 products)
        for (let i = 0; i < 10; i++) {
          fireEvent.keyDown(window, { key: 'ArrowDown' });
        }
      });

      const lastProductButton = screen.getByText('Pastilha de Freio').closest('button');
      expect(lastProductButton).toHaveClass('bg-accent');
    });

    it('should not go above first item', async () => {
      await act(async () => {
        renderComponent();
      });

      await act(async () => {
        fireEvent.keyDown(window, { key: 'ArrowUp' });
      });

      const firstProductButton = screen.getByText('Óleo Motor 10W40').closest('button');
      expect(firstProductButton).toHaveClass('bg-accent');
    });
  });
});
