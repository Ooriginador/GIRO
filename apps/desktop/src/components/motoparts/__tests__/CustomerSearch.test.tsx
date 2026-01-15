import {
  CustomerCard,
  CustomerCreateDialog,
  CustomerSearch,
} from '@/components/motoparts/CustomerSearch';
import { createQueryWrapper } from '@/test/queryWrapper';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Constantes de mock
const mockCustomer = {
  id: 'c-1',
  name: 'João Silva',
  phone: '1199999999',
  cpf: '12345678901',
  city: 'São Paulo',
  state: 'SP',
  isActive: true,
};

// Mock do hooks
const mockCreateCustomer = vi.fn();
const mockSetQuery = vi.fn();
const mockReset = vi.fn();

vi.mock('@/hooks/useCustomers', () => ({
  useCustomers: () => ({
    createCustomer: mockCreateCustomer,
  }),
  useCustomerSearch: () => ({
    query: '',
    setQuery: mockSetQuery,
    results: [mockCustomer],
    isSearching: false,
    reset: mockReset,
  }),
}));

const { Wrapper: queryWrapper } = createQueryWrapper();

describe('CustomerSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render and show search results', () => {
    render(<CustomerSearch onSelect={vi.fn()} />, { wrapper: queryWrapper });
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByText('João Silva')).toBeInTheDocument();
  });

  it('should handle clearing selection', () => {
    const onSelect = vi.fn();
    render(<CustomerSearch onSelect={onSelect} selectedCustomer={mockCustomer} />, {
      wrapper: queryWrapper,
    });

    expect(screen.getByText('João Silva')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button')); // Botão X

    expect(onSelect).toHaveBeenCalledWith(null);
    expect(mockReset).toHaveBeenCalled();
  });
});

describe('CustomerCard', () => {
  it('should render full card info', () => {
    render(<CustomerCard customer={mockCustomer} />);
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('1199999999')).toBeInTheDocument();
    expect(screen.getByText(/São Paulo/i)).toBeInTheDocument();
  });

  it('should render compact card info', () => {
    render(<CustomerCard customer={mockCustomer} compact />);
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    // No compact mode, phone or cpf is shown
    expect(screen.getByText('1199999999')).toBeInTheDocument();
  });
});

describe('CustomerCreateDialog', () => {
  it('should handle form submission', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <CustomerCreateDialog
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
        initialName="Novo Cliente"
      />
    );

    const nameInput = screen.getByLabelText(/Nome/i);
    expect(nameInput).toHaveValue('Novo Cliente');

    fireEvent.change(screen.getByLabelText(/CPF/i), { target: { value: '98765432100' } });
    fireEvent.change(screen.getByLabelText(/Telefone/i), { target: { value: '1188888888' } });

    fireEvent.submit(screen.getByRole('button', { name: /Cadastrar/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Novo Cliente',
          cpf: '98765432100',
          phone: '1188888888',
        })
      );
    });
  });
});
