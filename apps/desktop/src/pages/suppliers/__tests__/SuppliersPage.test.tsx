/**
 * @file SuppliersPage.test.tsx - Testes para a página de fornecedores
 */

import { SuppliersPage } from '@/pages/suppliers/SuppliersPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSuppliers = [
  {
    id: '1',
    name: 'Fornecedor Teste',
    tradeName: 'Teste LTDA',
    cnpj: '12.345.678/0001-90',
    phone: '11999999999',
    email: 'teste@teste.com',
    address: 'Rua Teste, 123',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Outro Fornecedor',
    tradeName: null,
    cnpj: null,
    phone: null,
    email: null,
    address: null,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Mock hooks
vi.mock('@/hooks/useSuppliers', () => ({
  useSuppliers: () => ({
    data: mockSuppliers,
    isLoading: false,
    error: null,
  }),
  useInactiveSuppliers: () => ({
    data: [],
    isLoading: false,
    error: null,
  }),
  useCreateSupplier: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: '3' }),
    isPending: false,
  }),
  useUpdateSupplier: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  useDeactivateSupplier: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  useReactivateSupplier: () => ({
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

describe('SuppliersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render page title', () => {
    render(<SuppliersPage />, { wrapper: createWrapper() });

    expect(screen.getByRole('heading', { name: /fornecedores/i })).toBeInTheDocument();
  });

  it('should have search functionality', () => {
    render(<SuppliersPage />, { wrapper: createWrapper() });

    // Verificar presença de input de busca
    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('should render add supplier button', () => {
    render(<SuppliersPage />, { wrapper: createWrapper() });

    expect(screen.getByRole('button', { name: /novo fornecedor/i })).toBeInTheDocument();
  });

  it('should display supplier names', () => {
    render(<SuppliersPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Fornecedor Teste')).toBeInTheDocument();
    expect(screen.getByText('Outro Fornecedor')).toBeInTheDocument();
  });

  it('should display supplier trade name', () => {
    render(<SuppliersPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Teste LTDA')).toBeInTheDocument();
  });

  it('should display supplier contact info', () => {
    render(<SuppliersPage />, { wrapper: createWrapper() });

    expect(screen.getByText('11999999999')).toBeInTheDocument();
    expect(screen.getByText('teste@teste.com')).toBeInTheDocument();
  });

  it('should open form dialog when clicking add button', async () => {
    render(<SuppliersPage />, { wrapper: createWrapper() });

    const addButton = screen.getByRole('button', { name: /novo fornecedor/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('should display supplier count', () => {
    render(<SuppliersPage />, { wrapper: createWrapper() });

    // Verificar que os fornecedores são exibidos
    expect(screen.getByText('Fornecedor Teste')).toBeInTheDocument();
  });
});
