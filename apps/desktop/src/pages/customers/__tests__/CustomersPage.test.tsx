/**
 * @file CustomersPage.test.tsx - Tests for CustomersPage
 */

import { CustomersPage } from '@/pages/customers/CustomersPage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock useCustomers hook
const mockLoadCustomers = vi.fn();
const mockCreateCustomer = vi.fn();
const mockUpdateCustomer = vi.fn();
const mockDeactivateCustomer = vi.fn();

vi.mock('@/hooks/useCustomers', () => ({
  useCustomers: () => ({
    customers: mockCustomers,
    isLoading: mockIsLoading,
    loadCustomers: mockLoadCustomers,
    createCustomer: mockCreateCustomer,
    updateCustomer: mockUpdateCustomer,
    deactivateCustomer: mockDeactivateCustomer,
  }),
}));

// Mock CustomerCreateDialog
vi.mock('@/components/motoparts/CustomerSearch', () => ({
  CustomerCreateDialog: ({ open, onOpenChange, onSubmit }: any) =>
    open ? (
      <div data-testid="customer-dialog">
        <button onClick={() => onSubmit({ name: 'Test' })}>Submit</button>
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null,
}));

let mockCustomers: any[] = [];
let mockIsLoading = false;

const mockCustomer1 = {
  id: 'cust-1',
  name: 'João Silva',
  cpf: '12345678900',
  phone: '11999999999',
  email: 'joao@test.com',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockCustomer2 = {
  id: 'cust-2',
  name: 'Maria Santos',
  cpf: '98765432100',
  phone: '11888888888',
  isActive: false,
  createdAt: '2024-01-02T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
};

const renderPage = () => {
  return render(
    <MemoryRouter>
      <CustomersPage />
    </MemoryRouter>
  );
};

describe('CustomersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCustomers = [mockCustomer1, mockCustomer2];
    mockIsLoading = false;
  });

  describe('Rendering', () => {
    it('should render page title', () => {
      renderPage();
      expect(screen.getByText('Clientes')).toBeInTheDocument();
      expect(screen.getByText(/Gerencie o cadastro/)).toBeInTheDocument();
    });

    it('should render "Novo Cliente" button', () => {
      renderPage();
      expect(screen.getByRole('button', { name: /Novo Cliente/i })).toBeInTheDocument();
    });

    it('should render search input', () => {
      renderPage();
      expect(screen.getByPlaceholderText(/Buscar por nome, CPF ou telefone/i)).toBeInTheDocument();
    });

    it('should render customer table headers', () => {
      renderPage();
      expect(screen.getByText('Cliente')).toBeInTheDocument();
      expect(screen.getByText('Contato')).toBeInTheDocument();
      expect(screen.getByText('CPF')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Ações')).toBeInTheDocument();
    });

    it('should call loadCustomers on mount', () => {
      renderPage();
      expect(mockLoadCustomers).toHaveBeenCalled();
    });
  });

  describe('Customer List', () => {
    it('should display customers in table', () => {
      renderPage();
      expect(screen.getByText('João Silva')).toBeInTheDocument();
      expect(screen.getByText('Maria Santos')).toBeInTheDocument();
    });

    it('should show customer phone', () => {
      renderPage();
      expect(screen.getByText('11999999999')).toBeInTheDocument();
    });

    it('should show customer CPF', () => {
      renderPage();
      expect(screen.getByText('12345678900')).toBeInTheDocument();
    });

    it('should show active badge for active customers', () => {
      renderPage();
      expect(screen.getByText('Ativo')).toBeInTheDocument();
    });

    it('should show inactive badge for inactive customers', () => {
      renderPage();
      expect(screen.getByText('Inativo')).toBeInTheDocument();
    });

    it('should show loading state', () => {
      mockIsLoading = true;
      mockCustomers = [];
      renderPage();
      expect(screen.getByText('Carregando...')).toBeInTheDocument();
    });

    it('should show empty state when no customers', () => {
      mockCustomers = [];
      renderPage();
      expect(screen.getByText('Nenhum cliente encontrado.')).toBeInTheDocument();
    });
  });

  describe('Search', () => {
    it('should filter customers by name', () => {
      renderPage();

      const searchInput = screen.getByPlaceholderText(/Buscar/i);
      fireEvent.change(searchInput, { target: { value: 'João' } });

      expect(screen.getByText('João Silva')).toBeInTheDocument();
      expect(screen.queryByText('Maria Santos')).not.toBeInTheDocument();
    });

    it('should filter customers by CPF', () => {
      renderPage();

      const searchInput = screen.getByPlaceholderText(/Buscar/i);
      fireEvent.change(searchInput, { target: { value: '987654' } });

      expect(screen.queryByText('João Silva')).not.toBeInTheDocument();
      expect(screen.getByText('Maria Santos')).toBeInTheDocument();
    });

    it('should filter customers by phone', () => {
      renderPage();

      const searchInput = screen.getByPlaceholderText(/Buscar/i);
      fireEvent.change(searchInput, { target: { value: '888888' } });

      expect(screen.queryByText('João Silva')).not.toBeInTheDocument();
      expect(screen.getByText('Maria Santos')).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should open create dialog when clicking "Novo Cliente"', () => {
      renderPage();

      fireEvent.click(screen.getByRole('button', { name: /Novo Cliente/i }));

      expect(screen.getByTestId('customer-dialog')).toBeInTheDocument();
    });

    it('should call createCustomer on dialog submit', async () => {
      mockCreateCustomer.mockResolvedValueOnce(mockCustomer1);
      renderPage();

      fireEvent.click(screen.getByRole('button', { name: /Novo Cliente/i }));
      fireEvent.click(screen.getByText('Submit'));

      await waitFor(() => {
        expect(mockCreateCustomer).toHaveBeenCalled();
      });
    });
  });
});
