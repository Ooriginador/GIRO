/**
 * @file SuppliersPage.test.tsx - Testes para a página de fornecedores
 */

import {
  useCreateSupplier,
  useDeactivateSupplier,
  useInactiveSuppliers,
  useReactivateSupplier,
  useSuppliers,
  useUpdateSupplier,
} from '@/hooks/useSuppliers';
import { SuppliersPage } from '@/pages/suppliers/SuppliersPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  },
];

const mockInactiveSuppliers = [
  {
    id: '2',
    name: 'Inativo Teste',
    tradeName: 'Inativo LTDA',
    cnpj: '99.888.777/0001-66',
    isActive: false,
  },
];

// Mock hooks
vi.mock('@/hooks/useSuppliers', () => ({
  useSuppliers: vi.fn(),
  useInactiveSuppliers: vi.fn(),
  useCreateSupplier: vi.fn(),
  useUpdateSupplier: vi.fn(),
  useDeactivateSupplier: vi.fn(),
  useReactivateSupplier: vi.fn(),
}));

// Mock Dropdown and Dialog
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogTrigger: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children, open }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
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
  const mockMutateCreate = vi.fn().mockResolvedValue({ id: '3' });
  const mockMutateUpdate = vi.fn().mockResolvedValue({});
  const mockMutateDeactivate = vi.fn().mockResolvedValue({});
  const mockMutateReactivate = vi.fn().mockResolvedValue({});

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSuppliers).mockReturnValue({ data: mockSuppliers, isLoading: false } as any);
    vi.mocked(useInactiveSuppliers).mockReturnValue({
      data: mockInactiveSuppliers,
      isLoading: false,
    } as any);
    vi.mocked(useCreateSupplier).mockReturnValue({
      mutateAsync: mockMutateCreate,
      isPending: false,
    } as any);
    vi.mocked(useUpdateSupplier).mockReturnValue({
      mutateAsync: mockMutateUpdate,
      isPending: false,
    } as any);
    vi.mocked(useDeactivateSupplier).mockReturnValue({
      mutate: mockMutateDeactivate,
      isPending: false,
    } as any);
    vi.mocked(useReactivateSupplier).mockReturnValue({
      mutate: mockMutateReactivate,
      isPending: false,
    } as any);
  });

  it('should render active suppliers by default', () => {
    render(<SuppliersPage />, { wrapper: createWrapper() });
    expect(screen.getByText('Fornecedor Teste')).toBeInTheDocument();
    expect(screen.queryByText('Inativo Teste')).not.toBeInTheDocument();
  });

  it('should show loading state', () => {
    vi.mocked(useSuppliers).mockReturnValue({ data: [], isLoading: true } as any);
    render(<SuppliersPage />, { wrapper: createWrapper() });
    // Assuming Loader2 is rendered when isLoading is true (check lines 450-454 in SuppliersPage.tsx)
    // Actually, I'll just check if no suppliers are rendered and maybe a loading indicator if I can find a test id or class.
    // Based on SuppliersPage.tsx:452, it uses animate-spin
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should create a new supplier', async () => {
    const user = userEvent.setup();
    render(<SuppliersPage />, { wrapper: createWrapper() });

    await user.click(screen.getByRole('button', { name: /novo fornecedor/i }));

    await user.type(screen.getByLabelText(/razão social \*/i), 'Novo Forn');
    await user.type(screen.getByLabelText(/nome fantasia/i), 'Forn Shop');
    await user.type(screen.getByLabelText(/cnpj/i), '12.345.678/0001-90');

    await user.click(screen.getByRole('button', { name: /cadastrar/i }));

    expect(mockMutateCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Novo Forn',
        tradeName: 'Forn Shop',
        cnpj: '12.345.678/0001-90',
      })
    );
  });

  it('should show validation errors for invalid inputs', async () => {
    const user = userEvent.setup();
    render(<SuppliersPage />, { wrapper: createWrapper() });

    await user.click(screen.getByRole('button', { name: /novo fornecedor/i }));

    // Trigger validation with invalid inputs
    await user.type(screen.getByLabelText(/razão social \*/i), 'A');
    await user.type(screen.getByLabelText(/e-mail/i), 'invalid-email');
    await user.type(screen.getByLabelText(/cnpj/i), 'invalid-cnpj');

    await user.click(screen.getByRole('button', { name: /cadastrar/i }));

    expect(await screen.findByText(/pelo menos 2 caracteres/i)).toBeInTheDocument();
    expect(await screen.findByText(/e-mail inválido/i)).toBeInTheDocument();
    expect(await screen.findByText(/cnpj inválido/i)).toBeInTheDocument();
  });

  it('should edit a supplier and handle optional fields omission', async () => {
    const user = userEvent.setup();
    render(<SuppliersPage />, { wrapper: createWrapper() });

    await user.click(screen.getByText(/editar/i));

    const input = screen.getByLabelText(/razão social \*/i);
    await user.clear(input);
    await user.type(input, 'Fornecedor Alterado');

    // Clear optional fields
    await user.clear(screen.getByLabelText(/nome fantasia/i));
    await user.clear(screen.getByLabelText(/cnpj/i));

    await user.click(screen.getByRole('button', { name: /salvar/i }));

    expect(mockMutateUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '1',
        data: expect.objectContaining({
          name: 'Fornecedor Alterado',
          tradeName: undefined,
          cnpj: undefined,
        }),
      })
    );
  });

  it('should filter by search text (name, tradeName, cnpj)', async () => {
    const user = userEvent.setup();
    render(<SuppliersPage />, { wrapper: createWrapper() });

    const searchInput = screen.getByPlaceholderText(/buscar por nome/i);

    // By name
    await user.type(searchInput, 'Fornecedor');
    expect(screen.getByText('Fornecedor Teste')).toBeInTheDocument();

    // By tradeName
    await user.clear(searchInput);
    await user.type(searchInput, 'Teste LTDA');
    expect(screen.getByText('Fornecedor Teste')).toBeInTheDocument();

    // By CNPJ
    await user.clear(searchInput);
    await user.type(searchInput, '12.345.678/0001-90');
    expect(screen.getByText('Fornecedor Teste')).toBeInTheDocument();

    await user.clear(searchInput);
    await user.type(searchInput, 'Inexistente');
    expect(screen.queryByText('Fornecedor Teste')).not.toBeInTheDocument();
    expect(screen.getByText(/nenhum fornecedor encontrado/i)).toBeInTheDocument();
  });

  it('should filter by status', async () => {
    const user = userEvent.setup();
    render(<SuppliersPage />, { wrapper: createWrapper() });

    await user.click(screen.getByText(/inativos/i));
    expect(screen.getByText('Inativo Teste')).toBeInTheDocument();
    expect(screen.queryByText('Fornecedor Teste')).not.toBeInTheDocument();

    await user.click(screen.getByText(/todos/i));
    expect(screen.getByText('Fornecedor Teste')).toBeInTheDocument();
    expect(screen.getByText('Inativo Teste')).toBeInTheDocument();
  });
});
