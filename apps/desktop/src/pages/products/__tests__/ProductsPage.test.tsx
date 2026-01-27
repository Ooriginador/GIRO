/**
 * @file ProductsPage.test.tsx - Testes para a listagem de produtos
 */

import {
  useCreateProduct,
  useDeactivateProduct,
  useDeleteProduct,
  useProductsPaginated,
  useReactivateProduct,
} from '@/hooks/use-products';
import { useCategories } from '@/hooks/useCategories';
import { ProductsPage } from '@/pages/products/ProductsPage';
import { createQueryWrapperWithClient } from '@/test/queryWrapper';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Spies for toast
const mockToast = vi.fn();

// Mock hooks
vi.mock('@/hooks/use-products', () => ({
  useProductsPaginated: vi.fn(),
  useCreateProduct: vi.fn(),
  useDeactivateProduct: vi.fn(),
  useDeleteProduct: vi.fn(),
  useReactivateProduct: vi.fn(),
}));

vi.mock('@/hooks/useCategories', () => ({
  useCategories: vi.fn(),
}));

vi.mock('@/hooks/useStock', () => ({
  useAdjustStock: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
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

const mockCategories = [
  { id: '1', name: 'Cat 1' },
  { id: '2', name: 'Cat 2' },
];

const { Wrapper: queryWrapper } = createQueryWrapperWithClient();

describe('ProductsPage', () => {
  // Reactive mock data que é atualizado dinamicamente
  let currentMockData = [...mockProducts];

  beforeEach(() => {
    vi.clearAllMocks();
    currentMockData = [...mockProducts];

    // Mock dinâmico que responde aos parâmetros
    vi.mocked(useProductsPaginated).mockImplementation(
      (page, perPage, search, categoryId, isActive) => {
        let filtered = [...currentMockData];

        // Filtrar por search
        if (search) {
          const searchLower = search.toLowerCase();
          filtered = filtered.filter(
            (p) =>
              p.name.toLowerCase().includes(searchLower) ||
              p.internalCode?.toLowerCase().includes(searchLower) ||
              (p as any).barcode?.includes(searchLower)
          );
        }

        // Filtrar por status
        if (isActive !== undefined) {
          filtered = filtered.filter((p) => p.isActive === isActive);
        }

        return {
          data: { data: filtered, total: filtered.length, totalPages: 1 },
          isLoading: false,
        } as any;
      }
    );

    vi.mocked(useCategories).mockReturnValue({ data: mockCategories, isLoading: false } as any);
    vi.mocked(useCreateProduct).mockReturnValue({ mutateAsync: vi.fn() } as any);
    vi.mocked(useDeleteProduct).mockReturnValue({ mutateAsync: vi.fn() } as any);
    vi.mocked(useDeactivateProduct).mockReturnValue({ mutateAsync: vi.fn() } as any);
    vi.mocked(useReactivateProduct).mockReturnValue({ mutateAsync: vi.fn() } as any);
  });

  const renderPage = () => {
    return render(<ProductsPage />, { wrapper: queryWrapper });
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

    // Adicionar produto com barcode ao mock data
    currentMockData = [
      ...mockProducts,
      { id: '4', name: 'Barcode Product', internalCode: 'BC1', isActive: true, barcode: '789123' },
    ];

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

    // Abrir o combobox de status
    const statusFilter = screen.getByRole('combobox', { name: /filtrar por status/i });
    await user.click(statusFilter);

    // Selecionar "Inativos"
    const inactiveOption = screen.getByRole('option', { name: /inativos/i });
    await user.click(inactiveOption);

    await waitFor(
      () => {
        expect(screen.getByText('Inactive Product')).toBeInTheDocument();
        expect(screen.queryByText('Product A')).not.toBeInTheDocument();
      },
      { timeout: 2000 }
    );
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

    // Abrir filtro de status e selecionar "Todos"
    const statusFilter = screen.getByRole('combobox', { name: /filtrar por status/i });
    await user.click(statusFilter);
    const allOption = screen.getByRole('option', { name: /todos/i });
    await user.click(allOption);

    await waitFor(() => {
      expect(screen.getByText('Inactive Product')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('product-menu-3'));
    await user.click(screen.getByRole('menuitem', { name: /Reativar/i }));

    expect(mockMutate).toHaveBeenCalledWith('3');
  });

  it('should show warning style for low stock', () => {
    renderPage();
    // There may be multiple '1' values in the page; find the one in stock column
    const stockCells = screen.getAllByText('1');
    const stockSpan = stockCells.find((el) => el.closest('span')?.className.includes('text-'));
    expect(stockSpan).toHaveClass('text-warning');
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
    vi.mocked(useProductsPaginated).mockReturnValue({
      data: { data: products, total: products.length, totalPages: 1 },
      isLoading: false,
    } as any);
    renderPage();
    const stockCell = screen.getByText('0').closest('span');
    expect(stockCell!).toHaveClass('text-destructive');
  });

  it('should show loading state', () => {
    vi.mocked(useProductsPaginated).mockReturnValue({
      data: null,
      isLoading: true,
    } as any);
    renderPage();
    expect(screen.getByText(/Carregando produtos/i)).toBeInTheDocument();
  });

  it('should show empty state', () => {
    vi.mocked(useProductsPaginated).mockReturnValue({
      data: { data: [], total: 0, totalPages: 0 },
      isLoading: false,
    } as any);
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
            variant: 'destructive',
          })
        );
      });
    });

    it('should handle reactivation failure', async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn().mockRejectedValue(new Error('Fail'));
      vi.mocked(useReactivateProduct).mockReturnValue({ mutateAsync: mockMutate } as any);

      renderPage();
      // Get status filter select by aria-label
      const statusFilter = screen.getByRole('combobox', { name: /filtrar por status/i });
      await user.click(statusFilter);

      // Select "all" option
      const allOption = await screen.findByRole('option', { name: /todos/i });
      await user.click(allOption);

      await user.click(screen.getByTestId('product-menu-3'));
      await user.click(screen.getByRole('menuitem', { name: /Reativar/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: 'destructive',
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
            variant: 'destructive',
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
            variant: 'destructive',
          })
        );
      });
    });
  });
});
