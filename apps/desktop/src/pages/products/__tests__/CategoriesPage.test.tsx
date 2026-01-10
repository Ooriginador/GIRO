/**
 * @file CategoriesPage.test.tsx - Testes para a página de categorias
 */

import { CategoriesPage } from '@/pages/products/CategoriesPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCategories = [
  { id: '1', name: 'Bebidas', color: '#3B82F6', isActive: true, productCount: 10 },
  { id: '2', name: 'Alimentos', color: '#10B981', isActive: true, productCount: 25 },
];

// Mock hooks
vi.mock('@/hooks/useCategories', () => ({
  useCategories: () => ({
    data: mockCategories,
    isLoading: false,
    error: null,
  }),
  useInactiveCategories: () => ({
    data: [],
    isLoading: false,
    error: null,
  }),
  useAllCategories: () => ({
    data: mockCategories,
    isLoading: false,
    error: null,
  }),
  useCreateCategory: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: '3' }),
    isPending: false,
  }),
  useDeactivateCategory: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  useReactivateCategory: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  CATEGORY_COLORS: [
    { name: 'Azul', value: '#3B82F6' },
    { name: 'Verde', value: '#10B981' },
    { name: 'Vermelho', value: '#EF4444' },
  ],
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

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('CategoriesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render page title', () => {
    render(<CategoriesPage />, { wrapper: createWrapper() });

    expect(screen.getByRole('heading', { name: /categorias/i })).toBeInTheDocument();
  });

  it('should render add category button', () => {
    render(<CategoriesPage />, { wrapper: createWrapper() });

    expect(screen.getByRole('button', { name: /nova categoria/i })).toBeInTheDocument();
  });

  it('should display category names', () => {
    render(<CategoriesPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Bebidas')).toBeInTheDocument();
    expect(screen.getByText('Alimentos')).toBeInTheDocument();
  });

  it('should display product count for categories', () => {
    render(<CategoriesPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/10 produtos/i)).toBeInTheDocument();
    expect(screen.getByText(/25 produtos/i)).toBeInTheDocument();
  });

  it('should open dialog when clicking add button', async () => {
    render(<CategoriesPage />, { wrapper: createWrapper() });

    const addButton = screen.getByRole('button', { name: /nova categoria/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
