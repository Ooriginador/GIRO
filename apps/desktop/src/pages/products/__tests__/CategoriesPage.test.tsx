/**
 * @file CategoriesPage.test.tsx - Testes para a página de categorias
 */

import {
  useAllCategories,
  useCategories,
  useCreateCategory,
  useDeactivateCategory,
  useInactiveCategories,
  useReactivateCategory,
} from '@/hooks/useCategories';
import { CategoriesPage } from '@/pages/products/CategoriesPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCategories = [
  {
    id: '1',
    name: 'Bebidas',
    color: '#3B82F6',
    isActive: true,
    productCount: 10,
    description: 'Sucos e Refrigerantes',
  },
  { id: '2', name: 'Alimentos', color: '#10B981', isActive: true, productCount: 25 },
];

const mockInactiveCategories = [
  { id: '3', name: 'Limpeza', color: '#EF4444', isActive: false, productCount: 5 },
];

// Mock hooks
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/useCategories', () => ({
  useCategories: vi.fn(),
  useInactiveCategories: vi.fn(),
  useAllCategories: vi.fn(),
  useCreateCategory: vi.fn(),
  useDeactivateCategory: vi.fn(),
  useReactivateCategory: vi.fn(),
  CATEGORY_COLORS: [
    { name: 'Azul', value: '#3B82F6' },
    { name: 'Verde', value: '#10B981' },
    { name: 'Vermelho', value: '#EF4444' },
  ],
}));

// Mock UI Select
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="status-filter-wrapper">
      <select
        data-testid="status-filter"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      >
        {children}
      </select>
    </div>
  ),
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: ({ placeholder }: any) => <>{placeholder}</>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
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
  const mockMutateCreate = vi.fn().mockResolvedValue({ id: 'new' });
  const mockMutateDeactivate = vi.fn().mockResolvedValue({});
  const mockMutateReactivate = vi.fn().mockResolvedValue({});

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCategories).mockReturnValue({ data: mockCategories, isLoading: false } as any);
    vi.mocked(useInactiveCategories).mockReturnValue({
      data: mockInactiveCategories,
      isLoading: false,
    } as any);
    vi.mocked(useAllCategories).mockReturnValue({
      data: [...mockCategories, ...mockInactiveCategories],
      isLoading: false,
    } as any);
    vi.mocked(useCreateCategory).mockReturnValue({
      mutateAsync: mockMutateCreate,
      isPending: false,
    } as any);
    vi.mocked(useDeactivateCategory).mockReturnValue({
      mutateAsync: mockMutateDeactivate,
      isPending: false,
    } as any);
    vi.mocked(useReactivateCategory).mockReturnValue({
      mutateAsync: mockMutateReactivate,
      isPending: false,
    } as any);
  });

  it('should render active categories by default', () => {
    render(<CategoriesPage />, { wrapper: createWrapper() });
    expect(screen.getByText('Bebidas')).toBeInTheDocument();
    expect(screen.getByText('Sucos e Refrigerantes')).toBeInTheDocument();
  });

  it('should create a new category', async () => {
    const user = userEvent.setup();
    render(<CategoriesPage />, { wrapper: createWrapper() });

    await user.click(screen.getByRole('button', { name: /nova categoria/i }));

    const input = screen.getByLabelText(/nome da categoria/i);
    await user.type(input, 'Brinquedos');

    const colorBtn = screen.getByTitle('Verde');
    await user.click(colorBtn);

    await user.click(screen.getByRole('button', { name: /criar categoria/i }));

    expect(mockMutateCreate).toHaveBeenCalledWith({
      name: 'Brinquedos',
      color: '#10B981',
    });
  });

  it('should closeModal when clicking cancel in create dialog', async () => {
    const user = userEvent.setup();
    render(<CategoriesPage />, { wrapper: createWrapper() });

    await user.click(screen.getByRole('button', { name: /nova categoria/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancelar/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('should deactivate a category', async () => {
    const user = userEvent.setup();
    render(<CategoriesPage />, { wrapper: createWrapper() });

    const card = screen.getByText('Bebidas').closest('.group')!;
    const deactivateBtn = card.querySelector('.text-destructive')!;
    await user.click(deactivateBtn);

    expect(screen.getByText(/tem certeza que deseja desativar/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Desativar' }));

    expect(mockMutateDeactivate).toHaveBeenCalledWith('1');
  });

  it('should close confirm dialog when clicking cancel', async () => {
    const user = userEvent.setup();
    render(<CategoriesPage />, { wrapper: createWrapper() });

    const card = screen.getByText('Bebidas').closest('.group')!;
    const deactivateBtn = card.querySelector('.text-destructive')!;
    await user.click(deactivateBtn);

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() =>
      expect(screen.queryByText(/tem certeza que deseja desativar/i)).not.toBeInTheDocument()
    );
  });

  it('should filter by status', async () => {
    render(<CategoriesPage />, { wrapper: createWrapper() });

    const select = screen.getByTestId('status-filter');
    fireEvent.change(select, { target: { value: 'inactive' } });

    expect(screen.getByText('Limpeza')).toBeInTheDocument();
    expect(screen.queryByText('Bebidas')).not.toBeInTheDocument();

    fireEvent.change(select, { target: { value: 'all' } });
    expect(screen.getByText('Bebidas')).toBeInTheDocument();
    expect(screen.getByText('Limpeza')).toBeInTheDocument();
  });

  it('should reactivate an inactive category', async () => {
    const user = userEvent.setup();
    render(<CategoriesPage />, { wrapper: createWrapper() });

    const select = screen.getByTestId('status-filter');
    fireEvent.change(select, { target: { value: 'inactive' } });

    const card = screen.getByText('Limpeza').closest('.group')!;
    const reactivateBtn = card.querySelector('.text-green-600')!;
    await user.click(reactivateBtn);

    await user.click(screen.getByRole('button', { name: 'Reativar' }));

    expect(mockMutateReactivate).toHaveBeenCalledWith('3');
  });

  it('should navigate back', () => {
    render(<CategoriesPage />, { wrapper: createWrapper() });
    const backBtn = screen.getByTestId('back-button');
    fireEvent.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('should show loading state', () => {
    vi.mocked(useCategories).mockReturnValue({ data: [], isLoading: true } as any);
    const { container } = render(<CategoriesPage />, { wrapper: createWrapper() });
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();

    const select = screen.getByTestId('status-filter');
    fireEvent.change(select, { target: { value: 'all' } });
    vi.mocked(useAllCategories).mockReturnValue({ data: [], isLoading: true } as any);
  });

  it('should show empty state and allow opening create dialog', async () => {
    const user = userEvent.setup();
    vi.mocked(useCategories).mockReturnValue({ data: [], isLoading: false } as any);
    render(<CategoriesPage />, { wrapper: createWrapper() });
    expect(screen.getByText(/Nenhuma categoria/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Criar Categoria/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  describe('Error States', () => {
    it('should handle creation failure', async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn().mockRejectedValue(new Error('Fail'));
      vi.mocked(useCreateCategory).mockReturnValue({
        mutateAsync: mockMutate,
        isPending: false,
      } as any);

      render(<CategoriesPage />, { wrapper: createWrapper() });
      await user.click(screen.getByRole('button', { name: /nova categoria/i }));
      await user.type(screen.getByLabelText(/nome da categoria/i), 'Fail Cat');
      await user.click(screen.getByRole('button', { name: /criar categoria/i })).catch(() => {});

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled();
      });
    });

    it('should handle deactivation failure', async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn().mockRejectedValue(new Error('Fail'));
      vi.mocked(useDeactivateCategory).mockReturnValue({
        mutateAsync: mockMutate,
        isPending: false,
      } as any);

      render(<CategoriesPage />, { wrapper: createWrapper() });
      const card = screen.getByText('Bebidas').closest('.group')!;
      await user.click(card.querySelector('.text-destructive')!);
      await user.click(screen.getByRole('button', { name: 'Desativar' })).catch(() => {});
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled();
      });
    });

    it('should handle reactivation failure', async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn().mockRejectedValue(new Error('Fail'));
      vi.mocked(useReactivateCategory).mockReturnValue({
        mutateAsync: mockMutate,
        isPending: false,
      } as any);

      render(<CategoriesPage />, { wrapper: createWrapper() });
      fireEvent.change(screen.getByTestId('status-filter'), { target: { value: 'inactive' } });
      const card = screen.getByText('Limpeza').closest('.group')!;
      await user.click(card.querySelector('.text-green-600')!);
      await user.click(screen.getByRole('button', { name: 'Reativar' })).catch(() => {});
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled();
      });
    });
  });
});
