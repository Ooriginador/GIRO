/**
 * @file ProductsPage.test.tsx - Testes para a listagem de produtos
 */

import {
  useAllProducts,
  useCreateProduct,
  useDeactivateProduct,
  useDeleteProduct,
  useReactivateProduct,
} from '@/hooks/use-products';
import { ProductsPage } from '@/pages/products/ProductsPage';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Spies for toast
const mockToast = vi.fn();

// Mock hooks
vi.mock('@/hooks/use-products', () => ({
  useAllProducts: vi.fn(),
  useCreateProduct: vi.fn(),
  useDeactivateProduct: vi.fn(),
  useDeleteProduct: vi.fn(),
  useReactivateProduct: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  };
});

// Mock UI components
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <button onClick={onClick} role="menuitem">
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <select
      data-testid="status-filter"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: ({ placeholder }: any) => <>{placeholder}</>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
}));

const mockProducts = [
  {
    id: '1',
    name: 'Product A',
    internalCode: 'A1',
    salePrice: 10,
    currentStock: 5,
    minStock: 2,
    isActive: true,
    category: { name: 'Cat 1' },
  },
  {
    id: '2',
    name: 'Product B',
    internalCode: 'B1',
    salePrice: 20,
    currentStock: 1,
    minStock: 5,
    isActive: true,
    category: { name: 'Cat 2' },
  },
  {
    id: '3',
    name: 'Inactive Product',
    internalCode: 'I1',
    isActive: false,
  },
];

describe('ProductsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAllProducts).mockReturnValue({ data: mockProducts, isLoading: false } as any);
    vi.mocked(useCreateProduct).mockReturnValue({ mutateAsync: vi.fn() } as any);
    vi.mocked(useDeleteProduct).mockReturnValue({ mutateAsync: vi.fn() } as any);
    vi.mocked(useDeactivateProduct).mockReturnValue({ mutateAsync: vi.fn() } as any);
    vi.mocked(useReactivateProduct).mockReturnValue({ mutateAsync: vi.fn() } as any);
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <ProductsPage />
      </MemoryRouter>
    );
  };

  it('should render products and handle search with debounce', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByText('Product A')).toBeInTheDocument();
    expect(screen.getByText('Product B')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/buscar por nome/i);
    await user.type(searchInput, 'Product A');

    // Should not filter immediately due to 500ms debounce
    expect(screen.getByText('Product B')).toBeInTheDocument();

    await waitFor(
      () => {
        expect(screen.getByText('Product A')).toBeInTheDocument();
        expect(screen.queryByText('Product B')).not.toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it('should handle search with barcode', async () => {
    const user = userEvent.setup();
    const productsWithBarcode = [
      ...mockProducts,
      { id: '4', name: 'Barcode Product', internalCode: 'BC1', isActive: true, barcode: '789123' },
    ];
    vi.mocked(useAllProducts).mockReturnValue({
      data: productsWithBarcode,
      isLoading: false,
    } as any);

    renderPage();

    const searchInput = screen.getByPlaceholderText(/buscar por nome/i);
    await user.type(searchInput, '789123');

    await waitFor(
      () => {
        expect(screen.getByText('Barcode Product')).toBeInTheDocument();
        expect(screen.queryByText('Product A')).not.toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it('should filter by status', async () => {
    const user = userEvent.setup();
    renderPage();

    const select = screen.getByTestId('status-filter');

    // Show all
    await user.selectOptions(select, 'all');
    expect(screen.getByText('Product A')).toBeInTheDocument();
    expect(screen.getByText('Inactive Product')).toBeInTheDocument();

    // Show inactive
    await user.selectOptions(select, 'inactive');
    expect(screen.queryByText('Product A')).not.toBeInTheDocument();
    expect(screen.getByText('Inactive Product')).toBeInTheDocument();
  });

  it('should handle product actions: Edit', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByTestId('product-menu-1'));
    await user.click(screen.getAllByRole('menuitem', { name: /Editar/i })[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/products/1');
  });

  it('should handle product actions: Duplicate', async () => {
    const user = userEvent.setup();
    const mockMutate = vi.fn().mockResolvedValue({});
    vi.mocked(useCreateProduct).mockReturnValue({ mutateAsync: mockMutate } as any);

    renderPage();

    await user.click(screen.getByTestId('product-menu-1'));
    await user.click(screen.getAllByRole('menuitem', { name: /Duplicar/i })[0]);

    expect(mockMutate).toHaveBeenCalled();
  });

  it('should handle product actions: Deactivate', async () => {
    const user = userEvent.setup();
    const mockMutate = vi.fn().mockResolvedValue({});
    vi.mocked(useDeactivateProduct).mockReturnValue({ mutateAsync: mockMutate } as any);

    renderPage();

    await user.click(screen.getByTestId('product-menu-1'));
    await user.click(screen.getAllByRole('menuitem', { name: /Desativar/i })[0]);

    // Confirm dialog
    const confirmBtn = screen.getByRole('button', { name: 'Desativar' });
    await user.click(confirmBtn);

    expect(mockMutate).toHaveBeenCalledWith('1');
  });

  it('should handle product actions: Delete', async () => {
    const user = userEvent.setup();
    const mockMutate = vi.fn().mockResolvedValue({});
    vi.mocked(useDeleteProduct).mockReturnValue({ mutateAsync: mockMutate } as any);

    renderPage();

    await user.click(screen.getByTestId('product-menu-1'));
    await user.click(screen.getAllByRole('menuitem', { name: /^Excluir$/i })[0]);

    // Confirm dialog
    await user.click(screen.getByRole('button', { name: /Excluir Permanentemente/i }));

    expect(mockMutate).toHaveBeenCalledWith('1');
  });

  it('should handle reactivate for inactive products', async () => {
    const user = userEvent.setup();
    const mockMutate = vi.fn().mockResolvedValue({});
    vi.mocked(useReactivateProduct).mockReturnValue({ mutateAsync: mockMutate } as any);

    renderPage();

    // Switch to all to see inactive
    await user.selectOptions(screen.getByTestId('status-filter'), 'all');

    await user.click(screen.getByTestId('product-menu-3'));
    await user.click(screen.getByRole('menuitem', { name: /Reativar/i }));

    expect(mockMutate).toHaveBeenCalledWith('3');
  });

  it('should show warning style for low stock', () => {
    renderPage();
    const stockCell = screen.getByText('1').closest('span');
    expect(stockCell!).toHaveClass('text-warning');
  });

  it('should show error style for out of stock', () => {
    const products = [
      {
        id: '1',
        name: 'No Stock',
        internalCode: 'N1',
        salePrice: 10,
        currentStock: 0,
        minStock: 2,
        isActive: true,
      },
    ];
    vi.mocked(useAllProducts).mockReturnValue({ data: products, isLoading: false } as any);
    renderPage();
    const stockCell = screen.getByText('0').closest('span');
    expect(stockCell!).toHaveClass('text-destructive');
  });

  it('should show loading state', () => {
    vi.mocked(useAllProducts).mockReturnValue({ data: null, isLoading: true } as any);
    renderPage();
    expect(screen.getByText(/Carregando produtos/i)).toBeInTheDocument();
  });

  it('should show empty state', () => {
    vi.mocked(useAllProducts).mockReturnValue({ data: [], isLoading: false } as any);
    renderPage();
    expect(screen.getByText(/Nenhum produto encontrado/i)).toBeInTheDocument();
  });

  it('should show empty state when search returns nothing', async () => {
    const user = userEvent.setup();
    renderPage();
    const searchInput = screen.getByPlaceholderText(/buscar por nome/i);
    await user.type(searchInput, 'NonExistentProduct');

    await waitFor(
      () => {
        expect(screen.getByText(/Nenhum produto encontrado/i)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  describe('Error States', () => {
    it('should handle deactivation failure', async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn().mockRejectedValue(new Error('Fail'));
      vi.mocked(useDeactivateProduct).mockReturnValue({ mutateAsync: mockMutate } as any);

      renderPage();
      await user.click(screen.getByTestId('product-menu-1'));
      await user.click(screen.getAllByRole('menuitem', { name: /Desativar/i })[0]);
      await user.click(screen.getByRole('button', { name: 'Desativar' }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            description: expect.stringMatching(/Não foi possível desativar o produto/i),
          })
        );
      });
    });

    it('should handle reactivation failure', async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn().mockRejectedValue(new Error('Fail'));
      vi.mocked(useReactivateProduct).mockReturnValue({ mutateAsync: mockMutate } as any);

      renderPage();
      await user.selectOptions(screen.getByTestId('status-filter'), 'all');
      await user.click(screen.getByTestId('product-menu-3'));
      await user.click(screen.getByRole('menuitem', { name: /Reativar/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            description: expect.stringMatching(/Não foi possível reativar o produto/i),
          })
        );
      });
    });

    it('should handle duplication failure', async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn().mockRejectedValue(new Error('Fail'));
      vi.mocked(useCreateProduct).mockReturnValue({ mutateAsync: mockMutate } as any);

      renderPage();
      await user.click(screen.getByTestId('product-menu-1'));
      await user.click(screen.getAllByRole('menuitem', { name: /Duplicar/i })[0]);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            description: expect.stringMatching(/Não foi possível duplicar o produto/i),
          })
        );
      });
    });

    it('should handle deletion failure', async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn().mockRejectedValue(new Error('Fail'));
      vi.mocked(useDeleteProduct).mockReturnValue({ mutateAsync: mockMutate } as any);

      renderPage();
      await user.click(screen.getByTestId('product-menu-1'));
      await user.click(screen.getAllByRole('menuitem', { name: /^Excluir$/i })[0]);
      await user.click(screen.getByRole('button', { name: /Excluir Permanentemente/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            description: expect.stringMatching(/Não foi possível excluir o produto/i),
          })
        );
      });
    });
  });
});
