/**
 * @file useCustomers.test.tsx - Tests for useCustomers hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useCustomers, useCustomerVehicles, useCustomerSearch } from '../useCustomers';

// Mock tauri invoke
const { mockInvoke } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
}));

vi.mock('@/lib/tauri', async () => {
  const actual = await vi.importActual<any>('@/lib/tauri');
  return {
    ...actual,
    invoke: mockInvoke,
    tauriInvoke: mockInvoke,
  };
});

// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

const mockCustomer = {
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
  isActive: true,
  createdAt: '2024-01-02T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
};

describe('useCustomers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadCustomers', () => {
    it('should load customers successfully', async () => {
      mockInvoke.mockResolvedValueOnce([mockCustomer, mockCustomer2]);

      const { result } = renderHook(() => useCustomers());

      expect(result.current.customers).toEqual([]);
      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        await result.current.loadCustomers();
      });

      expect(mockInvoke).toHaveBeenCalledWith('get_customers');
      expect(result.current.customers).toEqual([mockCustomer, mockCustomer2]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle load error', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Database error'));

      const { result } = renderHook(() => useCustomers());

      await act(async () => {
        await result.current.loadCustomers();
      });

      expect(result.current.error).toBe('Database error');
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Erro',
          variant: 'destructive',
        })
      );
    });
  });

  describe('searchCustomers', () => {
    it('should return empty array for short query', async () => {
      const { result } = renderHook(() => useCustomers());

      const found = await result.current.searchCustomers('a');

      expect(found).toEqual([]);
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('should search customers with valid query', async () => {
      mockInvoke.mockResolvedValueOnce([mockCustomer]);

      const { result } = renderHook(() => useCustomers());

      const found = await result.current.searchCustomers('João');

      expect(mockInvoke).toHaveBeenCalledWith('search_customers', { query: 'João', limit: 20 });
      expect(found).toEqual([mockCustomer]);
    });

    it('should return empty array on search error', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Search failed'));

      const { result } = renderHook(() => useCustomers());

      const found = await result.current.searchCustomers('test');

      expect(found).toEqual([]);
    });
  });

  describe('getCustomerById', () => {
    it('should get customer by id', async () => {
      mockInvoke.mockResolvedValueOnce(mockCustomer);

      const { result } = renderHook(() => useCustomers());

      const customer = await result.current.getCustomerById('cust-1');

      expect(mockInvoke).toHaveBeenCalledWith('get_customer_by_id', { id: 'cust-1' });
      expect(customer).toEqual(mockCustomer);
    });

    it('should return null on error', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Not found'));

      const { result } = renderHook(() => useCustomers());

      const customer = await result.current.getCustomerById('invalid-id');

      expect(customer).toBeNull();
    });
  });

  describe('getCustomerByCpf', () => {
    it('should get customer by CPF', async () => {
      mockInvoke.mockResolvedValueOnce(mockCustomer);

      const { result } = renderHook(() => useCustomers());

      const customer = await result.current.getCustomerByCpf('12345678900');

      expect(mockInvoke).toHaveBeenCalledWith('get_customer_by_cpf', { cpf: '12345678900' });
      expect(customer).toEqual(mockCustomer);
    });
  });

  describe('createCustomer', () => {
    it('should create customer and update state', async () => {
      mockInvoke.mockResolvedValueOnce(mockCustomer);

      const { result } = renderHook(() => useCustomers());

      const created = await act(async () => {
        return await result.current.createCustomer({
          name: 'João Silva',
          cpf: '12345678900',
        });
      });

      expect(mockInvoke).toHaveBeenCalledWith('create_customer', {
        input: { name: 'João Silva', cpf: '12345678900' },
      });
      expect(created).toEqual(mockCustomer);
      expect(result.current.customers).toContain(mockCustomer);
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Cliente criado',
        })
      );
    });

    it('should show error toast on create failure', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('CPF já cadastrado'));

      const { result } = renderHook(() => useCustomers());

      const created = await result.current.createCustomer({ name: 'Test' });

      expect(created).toBeNull();
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Erro',
          description: 'CPF já cadastrado',
          variant: 'destructive',
        })
      );
    });
  });

  describe('updateCustomer', () => {
    it('should update customer and refresh state', async () => {
      const updatedCustomer = { ...mockCustomer, name: 'João Silva Jr' };
      mockInvoke.mockResolvedValueOnce([mockCustomer]); // loadCustomers
      mockInvoke.mockResolvedValueOnce(updatedCustomer); // updateCustomer

      const { result } = renderHook(() => useCustomers());

      await act(async () => {
        await result.current.loadCustomers();
      });

      const updated = await act(async () => {
        return await result.current.updateCustomer('cust-1', { name: 'João Silva Jr' });
      });

      expect(mockInvoke).toHaveBeenCalledWith('update_customer', {
        id: 'cust-1',
        input: { name: 'João Silva Jr' },
      });
      expect(updated).toEqual(updatedCustomer);
      expect(result.current.customers[0].name).toBe('João Silva Jr');
    });
  });

  describe('deactivateCustomer', () => {
    it('should deactivate customer and remove from state', async () => {
      mockInvoke.mockResolvedValueOnce([mockCustomer, mockCustomer2]); // loadCustomers
      mockInvoke.mockResolvedValueOnce(undefined); // deactivateCustomer

      const { result } = renderHook(() => useCustomers());

      await act(async () => {
        await result.current.loadCustomers();
      });

      expect(result.current.customers).toHaveLength(2);

      const success = await act(async () => {
        return await result.current.deactivateCustomer('cust-1');
      });

      expect(success).toBe(true);
      expect(result.current.customers).toHaveLength(1);
      expect(result.current.customers[0].id).toBe('cust-2');
    });

    it('should return false on deactivate error', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Cannot deactivate'));

      const { result } = renderHook(() => useCustomers());

      const success = await result.current.deactivateCustomer('cust-1');

      expect(success).toBe(false);
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
        })
      );
    });
  });
});

describe('useCustomerVehicles', () => {
  const mockVehicle = {
    id: 'veh-1',
    customerId: 'cust-1',
    vehicleYearId: 'year-1',
    plate: 'ABC1234',
    brandName: 'Honda',
    modelName: 'CG 160',
    year: 2020,
    yearLabel: '2020',
    displayName: 'Honda CG 160 2020',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load vehicles on mount', async () => {
    mockInvoke.mockResolvedValueOnce([mockVehicle]);

    const { result } = renderHook(() => useCustomerVehicles('cust-1'));

    await waitFor(() => {
      expect(result.current.vehicles).toEqual([mockVehicle]);
    });

    expect(mockInvoke).toHaveBeenCalledWith('get_customer_vehicles', { customerId: 'cust-1' });
  });

  it('should not load if customerId is null', async () => {
    const { result } = renderHook(() => useCustomerVehicles(null));

    expect(result.current.vehicles).toEqual([]);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('should add vehicle', async () => {
    mockInvoke.mockResolvedValueOnce([]); // initial load
    mockInvoke.mockResolvedValueOnce(mockVehicle); // create
    mockInvoke.mockResolvedValueOnce([mockVehicle]); // reload

    const { result } = renderHook(() => useCustomerVehicles('cust-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let vehicle: any;
    await act(async () => {
      vehicle = await result.current.addVehicle({
        customerId: 'cust-1',
        vehicleYearId: 'year-1',
        plate: 'ABC1234',
      });
    });

    expect(vehicle).toEqual(mockVehicle);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Veículo adicionado',
      })
    );
  });

  it('should update km', async () => {
    mockInvoke.mockResolvedValueOnce([mockVehicle]); // load
    mockInvoke.mockResolvedValueOnce(undefined); // update km

    const { result } = renderHook(() => useCustomerVehicles('cust-1'));

    await waitFor(() => expect(result.current.vehicles).toHaveLength(1));

    const success = await act(async () => {
      return await result.current.updateKm('veh-1', 15000);
    });

    expect(success).toBe(true);
    expect(result.current.vehicles[0].currentKm).toBe(15000);
  });

  it('should remove vehicle', async () => {
    mockInvoke.mockResolvedValueOnce([mockVehicle]); // load
    mockInvoke.mockResolvedValueOnce(undefined); // deactivate

    const { result } = renderHook(() => useCustomerVehicles('cust-1'));

    await waitFor(() => expect(result.current.vehicles).toHaveLength(1));

    await act(async () => {
      const success = await result.current.removeVehicle('veh-1');
      expect(success).toBe(true);
    });

    expect(result.current.vehicles).toHaveLength(0);
  });
});

describe('useCustomerSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useCustomerSearch());

    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.isSearching).toBe(false);
    expect(result.current.selectedCustomer).toBeNull();
  });

  it('should not search for short queries', async () => {
    const { result } = renderHook(() => useCustomerSearch());

    act(() => {
      result.current.setQuery('a');
    });

    await act(async () => {
      vi.runAllTimers();
    });

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([]);
  });

  it('should search with debounce', async () => {
    mockInvoke.mockResolvedValueOnce([mockCustomer]);

    const { result } = renderHook(() => useCustomerSearch());

    await act(async () => {
      result.current.setQuery('João');
    });

    // Before debounce
    expect(mockInvoke).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    // After debounce, search should have been triggered
    expect(mockInvoke).toHaveBeenCalledWith('search_customers', expect.any(Object));
  });

  it('should reset search state', () => {
    const { result } = renderHook(() => useCustomerSearch());

    act(() => {
      result.current.setQuery('test');
      result.current.setSelectedCustomer(mockCustomer);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.selectedCustomer).toBeNull();
  });
});
