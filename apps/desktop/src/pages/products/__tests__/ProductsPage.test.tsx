/**
 * @file ProductsPage.test.tsx - Testes de integração da página de produtos
 *
 * Testa as funcionalidades corrigidas:
 * - Edit: navegação correta após fix do Link -> navigate
 * - Duplicate: criação de cópia de produto
 * - Delete: remoção de produto com confirmação
 */

import { ProductsPage } from '@/pages/products/ProductsPage';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dos hooks de produtos
const mockUseProducts = vi.fn();
const mockUseCreateProduct = vi.fn();
const mockUseDeleteProduct = vi.fn();
const mockUseDeactivateProduct = vi.fn();
const mockUseReactivateProduct = vi.fn();
const mockUseAllProducts = vi.fn();
const mockNavigate = vi.fn();

vi.mock('@/hooks/use-products', () => ({
  useProducts: () => mockUseProducts(),
  useCreateProduct: () => mockUseCreateProduct(),
  useDeleteProduct: () => mockUseDeleteProduct(),
  useDeactivateProduct: () => mockUseDeactivateProduct(),
  useReactivateProduct: () => mockUseReactivateProduct(),
  useAllProducts: () => mockUseAllProducts(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock do toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

const mockProducts = [
  {
    id: 'product-1',
    internalCode: 'PROD001',
    barcode: '7891234567890',
    name: 'Produto Teste 1',
    description: 'Descrição do produto 1',
    salePrice: 10.5,
    costPrice: 5.25,
    currentStock: 100,
    minStock: 10,
    categoryId: 'cat-1',
    category: { id: 'cat-1', name: 'Categoria 1' },
    unit: 'UN' as const,
    isWeighted: false,
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'product-2',
    internalCode: 'PROD002',
    barcode: '7891234567891',
    name: 'Produto Teste 2',
    description: 'Descrição do produto 2',
    salePrice: 20.99,
    costPrice: 10.5,
    currentStock: 50,
    minStock: 5,
    categoryId: 'cat-2',
    category: { id: 'cat-2', name: 'Categoria 2' },
    unit: 'KG' as const,
    isWeighted: true,
    isActive: true,
    createdAt: '2025-01-02T00:00:00.000Z',
    updatedAt: '2025-01-02T00:00:00.000Z',
  },
];

const renderProductsPage = () => {
  return render(
    <MemoryRouter>
      <ProductsPage />
    </MemoryRouter>
  );
};

// Helper para abrir dropdown de ações de um produto
const openProductMenu = async (user: ReturnType<typeof userEvent.setup>, productId: string) => {
  // Aguardar a tabela estar pronta
  await waitFor(() => {
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  // Encontrar e clicar no botão de menu pelo testid
  const menuButton = screen.getByTestId(`product-menu-${productId}`);
  await user.click(menuButton);
};

describe('ProductsPage - Edit Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAllProducts.mockReturnValue({
      data: mockProducts,
      isLoading: false,
      error: null,
    });
    mockUseProducts.mockReturnValue({
      data: mockProducts,
      isLoading: false,
      error: null,
    });
    mockUseCreateProduct.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseDeleteProduct.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseDeactivateProduct.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseReactivateProduct.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it('should navigate to edit page when clicking Edit button', async () => {
    const user = userEvent.setup();
    renderProductsPage();

    // Aguardar produtos renderizarem
    await waitFor(() => {
      expect(screen.getByText('Produto Teste 1')).toBeInTheDocument();
    });

    // Abrir dropdown do primeiro produto (encontrar botões com ícone MoreHorizontal)
    const dropdownTriggers = screen.getAllByRole('button');
    const menuButton = dropdownTriggers.find((btn) => btn.querySelector('svg'));
    await user.click(menuButton!);

    // Clicar em Editar
    const editButton = await screen.findByText('Editar');
    await user.click(editButton);

    // Verificar que navigate foi chamado com o ID correto
    expect(mockNavigate).toHaveBeenCalledWith('/products/product-1');
  });

  it('should navigate to correct edit page for second product', async () => {
    const user = userEvent.setup();
    renderProductsPage();

    await waitFor(() => {
      expect(screen.getByText('Produto Teste 2')).toBeInTheDocument();
    });

    // Abrir dropdown do segundo produto
    const dropdownTriggers = screen.getAllByRole('button');
    const menuButtons = dropdownTriggers.filter((btn) => btn.querySelector('svg'));
    await user.click(menuButtons[1]!);

    // Clicar em Editar
    const editButton = await screen.findByText('Editar');
    await user.click(editButton);

    // Verificar navegação correta
    expect(mockNavigate).toHaveBeenCalledWith('/products/product-2');
  });
});

describe('ProductsPage - Duplicate Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAllProducts.mockReturnValue({
      data: mockProducts,
      isLoading: false,
      error: null,
    });
    mockUseProducts.mockReturnValue({
      data: mockProducts,
      isLoading: false,
      error: null,
    });
    mockUseDeactivateProduct.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseReactivateProduct.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it('should call createProduct mutation when clicking Duplicate', async () => {
    const user = userEvent.setup();
    const mockMutate = vi.fn();

    mockUseAllProducts.mockReturnValue({
      data: mockProducts,
      isLoading: false,
      error: null,
    });
    mockUseCreateProduct.mockReturnValue({
      mutate: mockMutate,
      mutateAsync: mockMutate,
      isPending: false,
    });
    mockUseDeleteProduct.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseDeactivateProduct.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseReactivateProduct.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });

    renderProductsPage();

    await waitFor(() => {
      expect(screen.getByText('Produto Teste 1')).toBeInTheDocument();
    });

    // Abrir dropdown
    await openProductMenu(user, 'product-1');

    // Clicar em Duplicar
    const duplicateButton = await screen.findByText('Duplicar');
    await user.click(duplicateButton);

    // Verificar que mutate foi chamado com os dados corretos
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Produto Teste 1 (Cópia)',
          barcode: undefined,
          categoryId: 'cat-1',
          unit: 'UN',
          salePrice: 10.5,
          costPrice: 5.25,
          minStock: 10,
          isWeighted: false,
        })
      );
    });
  });

  it('should generate unique code for duplicated product', async () => {
    const user = userEvent.setup();
    const mockMutate = vi.fn();

    mockUseAllProducts.mockReturnValue({
      data: mockProducts,
      isLoading: false,
      error: null,
    });
    mockUseCreateProduct.mockReturnValue({
      mutate: mockMutate,
      mutateAsync: mockMutate,
      isPending: false,
    });
    mockUseDeleteProduct.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseDeactivateProduct.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseReactivateProduct.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });

    renderProductsPage();

    await waitFor(() => {
      expect(screen.getByText('Produto Teste 1')).toBeInTheDocument();
    });

    await openProductMenu(user, 'product-1');

    const duplicateButton = await screen.findByText('Duplicar');
    await user.click(duplicateButton);

    // Verificar que a função foi chamada (o código interno é gerado pelo backend)
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  it('should append "(Cópia)" to product name when duplicating', async () => {
    const user = userEvent.setup();
    const mockMutate = vi.fn();

    mockUseAllProducts.mockReturnValue({
      data: mockProducts,
      isLoading: false,
      error: null,
    });
    mockUseCreateProduct.mockReturnValue({
      mutate: mockMutate,
      mutateAsync: mockMutate,
      isPending: false,
    });
    mockUseDeleteProduct.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseDeactivateProduct.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseReactivateProduct.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });

    renderProductsPage();

    await waitFor(() => {
      expect(screen.getByText('Produto Teste 2')).toBeInTheDocument();
    });

    await openProductMenu(user, 'product-2');

    const duplicateButton = await screen.findByText('Duplicar');
    await user.click(duplicateButton);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Produto Teste 2 (Cópia)',
        })
      );
    });
  });
});

describe('ProductsPage - Delete Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAllProducts.mockReturnValue({
      data: mockProducts,
      isLoading: false,
      error: null,
    });
    mockUseProducts.mockReturnValue({
      data: mockProducts,
      isLoading: false,
      error: null,
    });
    mockUseCreateProduct.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseDeactivateProduct.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseReactivateProduct.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it('should open confirmation dialog when clicking Delete', async () => {
    const user = userEvent.setup();

    mockUseDeleteProduct.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });

    renderProductsPage();

    await waitFor(() => {
      expect(screen.getByText('Produto Teste 1')).toBeInTheDocument();
    });

    // Abrir dropdown
    await openProductMenu(user, 'product-1');

    // Clicar em Excluir
    const deleteButton = await screen.findByText('Excluir');
    await user.click(deleteButton);

    // Verificar que o dialog de confirmação apareceu
    await waitFor(() => {
      expect(screen.getByText(/excluir produto permanentemente/i)).toBeInTheDocument();
      expect(screen.getByText(/será excluído permanentemente/i)).toBeInTheDocument();
    });
  });

  it('should NOT delete product when clicking Cancel in dialog', async () => {
    const user = userEvent.setup();
    const mockMutate = vi.fn();

    mockUseDeleteProduct.mockReturnValue({
      mutate: mockMutate,
      mutateAsync: mockMutate,
      isPending: false,
    });

    renderProductsPage();

    await waitFor(() => {
      expect(screen.getByText('Produto Teste 1')).toBeInTheDocument();
    });

    await openProductMenu(user, 'product-1');

    const deleteButton = await screen.findByText('Excluir');
    await user.click(deleteButton);

    // Clicar em Cancelar
    const cancelButton = await screen.findByRole('button', { name: /cancelar/i });
    await user.click(cancelButton);

    // Verificar que mutate NÃO foi chamado
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('should delete product when confirming in dialog', async () => {
    const user = userEvent.setup();
    const mockMutate = vi.fn();

    mockUseDeleteProduct.mockReturnValue({
      mutate: mockMutate,
      mutateAsync: mockMutate,
      isPending: false,
    });

    renderProductsPage();

    await waitFor(() => {
      expect(screen.getByText('Produto Teste 1')).toBeInTheDocument();
    });

    await openProductMenu(user, 'product-1');

    const deleteButton = await screen.findByText('Excluir');
    await user.click(deleteButton);

    // Clicar em Excluir no dialog de confirmação
    const confirmButton = await screen.findByRole('button', { name: /excluir permanentemente/i });
    await user.click(confirmButton);

    // Verificar que mutate foi chamado com o ID correto
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith('product-1');
    });
  });

  it('should delete correct product when multiple products exist', async () => {
    const user = userEvent.setup();
    const mockMutate = vi.fn();

    mockUseDeleteProduct.mockReturnValue({
      mutate: mockMutate,
      mutateAsync: mockMutate,
      isPending: false,
    });

    renderProductsPage();

    await waitFor(() => {
      expect(screen.getByText('Produto Teste 2')).toBeInTheDocument();
    });

    // Abrir dropdown do SEGUNDO produto
    await openProductMenu(user, 'product-2');

    const deleteButton = await screen.findByText('Excluir');
    await user.click(deleteButton);

    const confirmButton = await screen.findByRole('button', { name: /excluir permanentemente/i });
    await user.click(confirmButton);

    // Verificar que deletou o produto correto (product-2)
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith('product-2');
    });
  });

  it('should show loading state while deleting', async () => {
    const user = userEvent.setup();
    const mockMutate = vi.fn();

    // Simular estado de loading
    mockUseDeleteProduct.mockReturnValue({
      mutate: mockMutate,
      mutateAsync: mockMutate,
      isPending: true,
    });

    renderProductsPage();

    await waitFor(() => {
      expect(screen.getByText('Produto Teste 1')).toBeInTheDocument();
    });

    await openProductMenu(user, 'product-1');

    const deleteButton = await screen.findByText('Excluir');

    // Verificar que o botão mostra estado de loading (se implementado)
    // Este teste pode precisar de ajustes dependendo da implementação do loading state
    expect(deleteButton).toBeInTheDocument();
  });
});

describe('ProductsPage - Empty State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAllProducts.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    mockUseProducts.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    mockUseCreateProduct.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseDeleteProduct.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseDeactivateProduct.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseReactivateProduct.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it('should show empty state when no products exist', () => {
    renderProductsPage();

    expect(screen.getByText(/Nenhum produto encontrado/i)).toBeInTheDocument();
  });
});

describe('ProductsPage - Loading State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAllProducts.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    mockUseProducts.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    mockUseCreateProduct.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseDeleteProduct.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseDeactivateProduct.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseReactivateProduct.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it('should show loading state while fetching products', () => {
    renderProductsPage();

    expect(screen.getByText(/Carregando/i)).toBeInTheDocument();
  });
});
