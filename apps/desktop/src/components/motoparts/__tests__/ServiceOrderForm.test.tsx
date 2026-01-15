import { createQueryWrapper } from '@/test/queryWrapper';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dos hooks
const mockCreateOrder = vi.fn().mockResolvedValue({ id: 'os-1', order_number: 101 });

vi.mock('@/hooks/useServiceOrders', () => ({
  useServiceOrders: () => ({
    createOrder: { mutateAsync: mockCreateOrder, isPending: false },
    updateOrder: { mutateAsync: vi.fn(), isPending: false },
  }),
  useServices: () => ({
    data: [],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useCustomers', () => {
  const customers = [{ id: 'cust-1', name: 'João Silva' }];
  const vehicles = [
    {
      id: 'veh-1',
      plate: 'ABC-1234',
      displayName: 'Honda CG',
      vehicleYearId: 'year-1',
      currentKm: 1500,
    },
  ];

  return {
    useCustomers: () => ({
      customers,
      isLoading: false,
      createCustomer: vi.fn().mockResolvedValue({ id: 'c-new', name: 'Novo Cliente' }),
    }),
    useCustomerSearch: () => ({
      query: '',
      setQuery: vi.fn(),
      results: customers,
      isSearching: false,
      reset: vi.fn(),
    }),
    useCustomerVehicles: (customerId: string) => ({
      vehicles: customerId === 'cust-1' ? vehicles : [],
      isLoading: false,
    }),
  };
});

vi.mock('@/hooks/useVehicles', () => ({
  useVehicles: () => ({
    brands: [],
    models: [],
    years: [],
    selectBrand: vi.fn(),
    selectModel: vi.fn(),
    isLoadingBrands: false,
  }),
}));

// Mock do toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock do auth store
const mockEmployee = { id: 'emp-1', name: 'Mecânico Teste' };
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: vi.fn((selector) => selector({ employee: mockEmployee })),
}));

// Mock de sub-componentes para simplificar
vi.mock('../CustomerSearch', () => ({
  CustomerSearch: ({ onSelect }: any) => (
    <button onClick={() => onSelect({ id: 'cust-1', name: 'João Silva' })}>Select Customer</button>
  ),
}));

// Mock simplificado para Popover e Command para evitar problemas com JSDOM
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/command', () => ({
  Command: ({ children }: any) => <div>{children}</div>,
  CommandInput: ({ onValueChange, placeholder }: any) => (
    <input
      data-testid="mock-command-input"
      placeholder={placeholder}
      onChange={(e) => onValueChange(e.target.value)}
    />
  ),
  CommandList: ({ children }: any) => <div>{children}</div>,
  CommandEmpty: ({ children }: any) => <div>{children}</div>,
  CommandGroup: ({ children }: any) => <div>{children}</div>,
  CommandItem: ({ children, onSelect, value }: any) => (
    <div data-testid={`item-${value}`} onClick={() => onSelect(value)}>
      {children}
    </div>
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value, disabled }: any) => (
    <div data-testid="mock-select" data-disabled={disabled}>
      {children}
      <select
        data-testid="hidden-select"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      >
        <option value="">Select...</option>
        <option value="veh-1">ABC-1234 - Honda CG</option>
      </select>
    </div>
  ),
  SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectGroup: ({ children }: any) => <div>{children}</div>,
}));

import { ServiceOrderForm } from '@/components/motoparts/ServiceOrderForm';
import { useAuthStore } from '@/stores/auth-store';

describe('ServiceOrderForm', () => {
  let queryWrapper: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const { Wrapper } = createQueryWrapper();
    queryWrapper = Wrapper;
    vi.mocked(useAuthStore).mockImplementation((selector: any) =>
      selector({ employee: mockEmployee })
    );
  });

  it('should render the form and allow submission', async () => {
    const onSuccess = vi.fn();
    render(<ServiceOrderForm onCancel={vi.fn()} onSuccess={onSuccess} />, {
      wrapper: queryWrapper,
    });

    expect(screen.getByText(/Nova Ordem de Serviço/i)).toBeInTheDocument();

    // 1. Select Customer
    fireEvent.click(screen.getByText(/Select Customer/i));

    await waitFor(() => {
      expect(screen.getByText('Selecione o veículo')).toBeInTheDocument();
    });

    // 2. Fill Symptoms
    fireEvent.change(screen.getByLabelText(/Relato \/ Sintomas/i), {
      target: { value: 'Moto não liga' },
    });

    expect(screen.getByDisplayValue('Moto não liga')).toBeInTheDocument();
  });

  it('should complete full successful flow', async () => {
    const onSuccess = vi.fn();
    render(<ServiceOrderForm onCancel={vi.fn()} onSuccess={onSuccess} />, {
      wrapper: queryWrapper,
    });

    // 1. Select Customer
    fireEvent.click(screen.getByText(/Select Customer/i));

    // 2. Select Vehicle
    fireEvent.change(screen.getByTestId('hidden-select'), { target: { value: 'veh-1' } });

    // 3. Fill Symptoms
    fireEvent.change(screen.getByLabelText(/Relato \/ Sintomas/i), {
      target: { value: 'Barulho no motor' },
    });

    // 4. Submit
    fireEvent.click(screen.getByText('Abrir OS'));

    await waitFor(() => {
      expect(mockCreateOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_id: 'cust-1',
          customer_vehicle_id: 'veh-1',
          symptoms: 'Barulho no motor',
        })
      );
      expect(onSuccess).toHaveBeenCalledWith('os-1');
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'OS Criada',
        })
      );
    });
  });

  it('should auto-populate KM when vehicle is selected', async () => {
    render(<ServiceOrderForm onCancel={vi.fn()} onSuccess={vi.fn()} />, {
      wrapper: queryWrapper,
    });

    // 1. Select Customer
    fireEvent.click(screen.getByText(/Select Customer/i));

    // 2. Select Vehicle (mocked vehicles include currentKm in the handleValueChange)
    // In our mock for Select, we simulate the onChange.
    // The component logic at Line 158-161 of ServiceOrderForm.tsx:
    // if (v?.currentKm != null) { form.setValue('vehicle_km', v.currentKm); }

    fireEvent.change(screen.getByTestId('hidden-select'), { target: { value: 'veh-1' } });

    await waitFor(() => {
      // veh-1 currentKm is 1500
      expect(screen.getByLabelText(/KM Atual/i)).toHaveValue(1500);
    });
  });

  it('should show toast if employee is not logged in', async () => {
    vi.mocked(useAuthStore).mockImplementation((selector: any) => selector({ employee: null }));

    render(<ServiceOrderForm onCancel={vi.fn()} onSuccess={vi.fn()} />, {
      wrapper: queryWrapper,
    });

    // Validar form para chegar no onSubmit
    fireEvent.click(screen.getByText(/Select Customer/i));
    fireEvent.change(screen.getByTestId('hidden-select'), { target: { value: 'veh-1' } });
    fireEvent.change(screen.getByLabelText(/Relato \/ Sintomas/i), {
      target: { value: 'Moto não liga' },
    });

    fireEvent.click(screen.getByText('Abrir OS'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Operador não identificado' })
      );
    });
  });

  it('should show toast on submission error', async () => {
    mockCreateOrder.mockRejectedValueOnce(new Error('API Fail'));

    render(<ServiceOrderForm onCancel={vi.fn()} onSuccess={vi.fn()} />, {
      wrapper: queryWrapper,
    });

    // Validar form para chegar no onSubmit
    fireEvent.click(screen.getByText(/Select Customer/i));
    fireEvent.change(screen.getByTestId('hidden-select'), { target: { value: 'veh-1' } });
    fireEvent.change(screen.getByLabelText(/Relato \/ Sintomas/i), {
      target: { value: 'Moto não liga' },
    });

    fireEvent.click(screen.getByText('Abrir OS'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Erro ao criar OS' })
      );
    });
  });
});
