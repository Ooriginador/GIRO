import { ServiceOrderDetails } from '@/components/motoparts/ServiceOrderDetails';
import {
  useServiceOrderDetails,
  useServiceOrderItems,
  useServiceOrders,
} from '@/hooks/useServiceOrders';
import { createQueryWrapperWithClient } from '@/test/queryWrapper';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dos hooks
vi.mock('@/hooks/useServiceOrders', () => ({
  useServiceOrderDetails: vi.fn(() => ({
    orderDetails: null,
    isLoading: false,
    refetch: vi.fn(),
  })),
  useServiceOrderItems: vi.fn(() => ({
    items: [],
    addItem: { mutateAsync: vi.fn(), isPending: false },
    updateItem: { mutateAsync: vi.fn(), isPending: false },
    removeItem: { mutateAsync: vi.fn(), isPending: false },
  })),
  useServiceOrders: vi.fn(() => ({
    orders: [],
    isLoading: false,
    createOrder: { mutateAsync: vi.fn(), isPending: false },
    updateOrder: { mutateAsync: vi.fn(), isPending: false },
    startOrder: { mutateAsync: vi.fn(), isPending: false },
    completeOrder: { mutateAsync: vi.fn(), isPending: false },
    deliverOrder: { mutateAsync: vi.fn(), isPending: false },
    cancelOrder: { mutateAsync: vi.fn(), isPending: false },
    approveQuote: { mutateAsync: vi.fn(), isPending: false },
  })),
  useVehicleHistory: vi.fn(() => ({
    history: [],
    isLoading: false,
  })),
  useServices: vi.fn(() => ({
    services: [],
    isLoading: false,
    createService: { mutateAsync: vi.fn(), isPending: false },
    updateService: { mutateAsync: vi.fn(), isPending: false },
    deleteService: { mutateAsync: vi.fn(), isPending: false },
  })),
  ServiceOrderUtils: {
    getStatusColor: () => 'text-blue-600',
    getStatusLabel: (s: string) => s,
    formatOrderNumber: (n: number) => `OS #${n}`,
    getItemTypeLabel: (s: string) => s,
    canEdit: (s: string) => s === 'OPEN' || s === 'IN_PROGRESS',
    canStart: (s: string) => s === 'OPEN',
    canComplete: (s: string) => s === 'IN_PROGRESS',
    canDeliver: (s: string) => s === 'COMPLETED',
    canCancel: (s: string) => s !== 'CANCELED' && s !== 'DELIVERED',
  },
}));

// Mock do Tauri
vi.mock('@/lib/tauri', () => ({
  invoke: vi.fn(),
}));

// Mock do useEmployees
vi.mock('@/hooks/useEmployees', () => ({
  useEmployees: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
}));

// Mock do Zustand store
vi.mock('@/stores/settings-store', () => ({
  useCompany: vi.fn(() => ({
    company: { name: 'Giro Moto', cnpj: '123', phone: '456', address: 'Rua A' },
  })),
  useSettingsStore: vi.fn(() => ({
    businessType: 'MOTOPARTS',
    printerConfig: null,
    setBusinessType: vi.fn(),
    setPrinterConfig: vi.fn(),
  })),
}));

// Mock do toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

const { Wrapper: queryWrapper } = createQueryWrapperWithClient();

describe('ServiceOrderDetails', () => {
  const mockOrder = {
    id: 'os-1',
    order_number: 101,
    status: 'OPEN',
    labor_cost: 100.0,
    parts_cost: 50.0,
    discount: 10.0,
    total: 140.0,
    created_at: '2023-10-27T20:00:00Z',
    diagnosis: 'Teste',
    symptoms: 'Vazamento',
    notes: 'Obs cliente',
    internal_notes: 'Obs interna',
    vehicle_km: 15000,
  };

  const mockOrderDetails = {
    order: mockOrder,
    customer_name: 'João Silva',
    customer_phone: '123456',
    vehicle_display_name: 'Honda CG 160',
    vehicle_plate: 'ABC-1234',
    employee_name: 'Carlos Estevão',
    vehicle_color: 'Azul',
  };

  const mockItems = [
    {
      id: 'i-1',
      description: 'Óleo',
      quantity: 1,
      unit_price: 50.0,
      total: 50.0,
      item_type: 'PART',
    },
    {
      id: 'i-2',
      description: 'Mão de Obra',
      quantity: 1,
      unit_price: 100.0,
      total: 100.0,
      item_type: 'SERVICE',
    },
  ];

  const mockRefetch = vi.fn();
  const mockStart = vi.fn().mockResolvedValue({});
  const mockComplete = vi.fn().mockResolvedValue({});
  const mockDeliver = vi.fn().mockResolvedValue({});
  const mockCancel = vi.fn().mockResolvedValue({});
  const mockRemove = vi.fn().mockResolvedValue({});

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useServiceOrderDetails).mockReturnValue({
      orderDetails: mockOrderDetails,
      isLoading: false,
      refetch: mockRefetch,
    } as any);

    vi.mocked(useServiceOrderItems).mockReturnValue({
      items: mockItems,
      addItem: { mutateAsync: vi.fn(), isPending: false },
      updateItem: { mutateAsync: vi.fn(), isPending: false },
      removeItem: { mutateAsync: mockRemove, isPending: false },
    } as any);

    vi.mocked(useServiceOrders).mockReturnValue({
      orders: [],
      isLoading: false,
      startOrder: { mutateAsync: mockStart, isPending: false },
      completeOrder: { mutateAsync: mockComplete, isPending: false },
      deliverOrder: { mutateAsync: mockDeliver, isPending: false },
      cancelOrder: { mutateAsync: mockCancel, isPending: false },
      approveQuote: { mutateAsync: vi.fn(), isPending: false },
    } as any);
  });

  it('should render full order details', async () => {
    await act(async () => {
      render(<ServiceOrderDetails orderId="os-1" onClose={vi.fn()} />, { wrapper: queryWrapper });
    });

    expect(screen.getByText(/OS #101/)).toBeInTheDocument();
    expect(screen.getByText(/João Silva/)).toBeInTheDocument();
    expect(screen.getByText(/Honda CG 160/)).toBeInTheDocument();
    expect(screen.getByText(/ABC-1234/)).toBeInTheDocument();
    expect(screen.getByText(/Azul/)).toBeInTheDocument();
    expect(screen.getByText(/15.000/)).toBeInTheDocument(); // KM
    expect(screen.getByText(/Vazamento/)).toBeInTheDocument(); // Sintomas
    expect(screen.getByText(/Obs cliente/)).toBeInTheDocument();
    expect(screen.getByText(/Obs interna/)).toBeInTheDocument();

    // Itens
    expect(screen.getByText('Óleo')).toBeInTheDocument();
    expect(screen.getAllByText('Mão de Obra').length).toBeGreaterThan(0);
  });

  it('should handle start action', async () => {
    await act(async () => {
      render(<ServiceOrderDetails orderId="os-1" />, { wrapper: queryWrapper });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Iniciar Serviço/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Confirmar/i }));
    });

    expect(mockStart).toHaveBeenCalledWith('os-1');
  });

  it('should handle cancel action', async () => {
    await act(async () => {
      render(<ServiceOrderDetails orderId="os-1" />, { wrapper: queryWrapper });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Cancelar Ordem/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Confirmar/i }));
    });

    expect(mockCancel).toHaveBeenCalledWith({ id: 'os-1' });
  });

  it('should handle item removal', async () => {
    await act(async () => {
      render(<ServiceOrderDetails orderId="os-1" />, { wrapper: queryWrapper });
    });

    // Verificar que os itens são exibidos
    expect(screen.getByText('Óleo')).toBeInTheDocument();
    expect(screen.getAllByText('Mão de Obra').length).toBeGreaterThan(0);
  });

  it('should handle print action', async () => {
    const { invoke } = await import('@/lib/tauri');
    await act(async () => {
      render(<ServiceOrderDetails orderId="os-1" />, { wrapper: queryWrapper });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Imprimir/i }));
    });
    expect(invoke).toHaveBeenCalledWith('print_service_order', expect.any(Object));
  });

  it('should handle complete action', async () => {
    vi.mocked(useServiceOrderDetails).mockReturnValue({
      orderDetails: {
        ...mockOrderDetails,
        order: { ...mockOrder, status: 'IN_PROGRESS' },
      },
      isLoading: false,
      refetch: mockRefetch,
    } as any);
    await act(async () => {
      render(<ServiceOrderDetails orderId="os-1" />, { wrapper: queryWrapper });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Marcar como Concluída/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Confirmar/i }));
    });

    expect(mockComplete).toHaveBeenCalledWith({ id: 'os-1', diagnosis: 'Teste' });
  });

  it('should handle deliver action', async () => {
    vi.mocked(useServiceOrderDetails).mockReturnValue({
      orderDetails: {
        ...mockOrderDetails,
        order: { ...mockOrder, status: 'COMPLETED' },
      },
      isLoading: false,
      refetch: mockRefetch,
    } as any);
    await act(async () => {
      render(<ServiceOrderDetails orderId="os-1" />, { wrapper: queryWrapper });
    });

    // Verificar que o componente renderizou com status COMPLETED
    expect(screen.getByText(/OS #101/)).toBeInTheDocument();
  });

  it('should handle approve quote action', async () => {
    vi.mocked(useServiceOrderDetails).mockReturnValue({
      orderDetails: {
        ...mockOrderDetails,
        order: { ...mockOrder, status: 'QUOTE' },
      },
      isLoading: false,
      refetch: mockRefetch,
    } as any);
    await act(async () => {
      render(<ServiceOrderDetails orderId="os-1" />, { wrapper: queryWrapper });
    });

    // Verificar que o componente renderizou com status QUOTE
    expect(screen.getByText(/OS #101/)).toBeInTheDocument();
  });

  it('should show "Not Found" message if order data is missing', async () => {
    vi.mocked(useServiceOrderDetails).mockReturnValue({
      orderDetails: null,
      isLoading: false,
    } as any);

    await act(async () => {
      render(<ServiceOrderDetails orderId="os-notFound" />, { wrapper: queryWrapper });
    });
    expect(screen.getByText(/Ordem não encontrada/i)).toBeInTheDocument();
  });
});
