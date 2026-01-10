/**
 * @file ProductFormPage.test.tsx - Testes para o formulário de produto
 */

import { ProductFormPage } from '@/pages/products/ProductFormPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCategories = [
  { id: 'cat1', name: 'Bebidas', color: '#3B82F6' },
  { id: 'cat2', name: 'Alimentos', color: '#10B981' },
];

// Mock hooks
vi.mock('@/hooks/useProducts', () => ({
  useProduct: (id?: string) => ({
    data: id
      ? {
          id: '1',
          name: 'Produto Teste',
          barcode: '7891234567890',
          categoryId: 'cat1',
          unit: 'UNIT',
          salePrice: 10.0,
          costPrice: 8.0,
          minStock: 5,
          isWeighted: false,
        }
      : undefined,
    isLoading: false,
    error: null,
  }),
  useCategories: () => ({
    data: mockCategories,
    isLoading: false,
    error: null,
  }),
  useCreateProduct: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: 'new-product' }),
    isPending: false,
  }),
  useUpdateProduct: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock PriceHistoryCard
vi.mock('@/components/shared/PriceHistoryCard', () => ({
  PriceHistoryCard: () => <div data-testid="price-history">Price History</div>,
}));

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const createWrapper = (initialRoute = '/produtos/novo') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/produtos/novo" element={children} />
          <Route path="/produtos/:id/editar" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('ProductFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Create Mode', () => {
    it('should render page title for new product', () => {
      render(<ProductFormPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('heading', { name: /novo produto/i })).toBeInTheDocument();
    });

    it('should render save button', () => {
      render(<ProductFormPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /salvar/i })).toBeInTheDocument();
    });

    it('should render form inputs', () => {
      render(<ProductFormPage />, { wrapper: createWrapper() });

      // Verificar que os inputs principais estão presentes
      const inputs = screen.getAllByRole('textbox');
      expect(inputs.length).toBeGreaterThan(0);
    });
  });

  describe('Validation', () => {
    it('should show error when submitting without name', async () => {
      render(<ProductFormPage />, { wrapper: createWrapper() });

      const saveButton = screen.getByRole('button', { name: /salvar/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/nome é obrigatório/i)).toBeInTheDocument();
      });
    });
  });
});
