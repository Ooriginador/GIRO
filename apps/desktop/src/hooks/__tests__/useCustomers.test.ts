import { createQueryWrapper } from '@/test/queryWrapper';
import { invoke } from '@tauri-apps/api/core';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCustomers, useCustomerSearch, useCustomerVehicles } from '../useCustomers';

// Mock useToast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

const queryWrapper = createQueryWrapper();

describe('useCustomers hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation to avoid errors
    vi.mocked(invoke).mockImplementation(async (cmd) => {
      if (
        cmd === 'get_customers' ||
        cmd === 'search_customers' ||
        cmd === 'get_customer_vehicles'
      ) {
        return [];
      }
      return null;
    });
  });

  describe('useCustomers', () => {
    const mockCustomers = [
      { id: '1', name: 'John Doe', isActive: true },
      { id: '2', name: 'Jane Smith', isActive: true },
    ];

    it('should load customers successfully', async () => {
      vi.mocked(invoke).mockResolvedValue(mockCustomers);

      const { result } = renderHook(() => useCustomers(), { wrapper: queryWrapper.Wrapper });

      await act(async () => {
        await result.current.loadCustomers();
      });

      expect(result.current.customers).toEqual(mockCustomers);
      expect(result.current.isLoading).toBe(false);
      expect(invoke).toHaveBeenCalledWith('get_customers');
    });

    it('should handle load error', async () => {
      vi.mocked(invoke).mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useCustomers(), { wrapper: queryWrapper.Wrapper });

      await act(async () => {
        await result.current.loadCustomers();
      });

      expect(result.current.error).toBe('API Error');
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
    });

    it('should search customers', async () => {
      vi.mocked(invoke).mockResolvedValue([mockCustomers[0]]);

      const { result } = renderHook(() => useCustomers(), { wrapper: queryWrapper.Wrapper });

      let searchResults;
      await act(async () => {
        searchResults = await result.current.searchCustomers('John');
      });

      expect(searchResults).toEqual([mockCustomers[0]]);
      expect(invoke).toHaveBeenCalledWith('search_customers', { query: 'John', limit: 20 });
    });

    it('should not search if query too short', async () => {
      const { result } = renderHook(() => useCustomers(), { wrapper: queryWrapper.Wrapper });

      let searchResults;
      await act(async () => {
        searchResults = await result.current.searchCustomers('J');
      });

      expect(searchResults).toEqual([]);
      expect(invoke).not.toHaveBeenCalled();
    });

    it('should create customer', async () => {
      const newCustomer = { id: '3', name: 'New User' };
      vi.mocked(invoke).mockResolvedValue(newCustomer);

      const { result } = renderHook(() => useCustomers(), { wrapper: queryWrapper.Wrapper });

      await act(async () => {
        const created = await result.current.createCustomer({ name: 'New User' });
        expect(created).toEqual(newCustomer);
      });

      expect(result.current.customers).toContainEqual(newCustomer);
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Cliente criado' }));
    });

    it('should update customer', async () => {
      const updatedCustomer = { id: '1', name: 'John Updated' };
      vi.mocked(invoke).mockResolvedValue(updatedCustomer);

      const { result } = renderHook(() => useCustomers(), { wrapper: queryWrapper.Wrapper });

      await act(async () => {
        const updated = await result.current.updateCustomer('1', { name: 'John Updated' });
        expect(updated).toEqual(updatedCustomer);
      });

      expect(invoke).toHaveBeenCalledWith('update_customer', {
        id: '1',
        input: { name: 'John Updated' },
      });
    });

    it('should deactivate customer', async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      const { result } = renderHook(() => useCustomers(), { wrapper: queryWrapper.Wrapper });

      await act(async () => {
        const success = await result.current.deactivateCustomer('1');
        expect(success).toBe(true);
      });

      expect(invoke).toHaveBeenCalledWith('deactivate_customer', { id: '1' });
    });
  });

  describe('useCustomerVehicles', () => {
    const customerId = 'cust-1';
    const mockVehicles = [
      { id: 'v1', customerId, modelName: 'Bike A', year: 2020, currentKm: 1000 },
    ];

    it('should load vehicles on mount', async () => {
      vi.mocked(invoke).mockResolvedValue(mockVehicles);

      renderHook(() => useCustomerVehicles(customerId), { wrapper: queryWrapper.Wrapper });

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith('get_customer_vehicles', { customerId });
      });
    });

    it('should update km', async () => {
      // Mock list call first, then update call
      vi.mocked(invoke).mockImplementation(async (cmd) => {
        if (cmd === 'get_customer_vehicles') return mockVehicles;
        if (cmd === 'update_vehicle_km') return undefined;
        return null;
      });

      const { result } = renderHook(() => useCustomerVehicles(customerId), {
        wrapper: queryWrapper.Wrapper,
      });

      await waitFor(() => expect(result.current.vehicles.length).toBe(1));

      await act(async () => {
        const success = await result.current.updateKm('v1', 5000);
        expect(success).toBe(true);
      });

      expect(result.current.vehicles[0].currentKm).toBe(5000);
    });

    it('should remove vehicle', async () => {
      vi.mocked(invoke).mockImplementation(async (cmd) => {
        if (cmd === 'get_customer_vehicles') return mockVehicles;
        if (cmd === 'deactivate_customer_vehicle') return undefined;
        return null;
      });

      const { result } = renderHook(() => useCustomerVehicles(customerId), {
        wrapper: queryWrapper.Wrapper,
      });

      await waitFor(() => expect(result.current.vehicles.length).toBe(1));

      await act(async () => {
        const success = await result.current.removeVehicle('v1');
        expect(success).toBe(true);
      });

      expect(result.current.vehicles.length).toBe(0);
    });
  });

  describe('useCustomerSearch', () => {
    it('should perform debounced search', async () => {
      const mockResults = [{ id: '1', name: 'Search Result' }];
      vi.mocked(invoke).mockResolvedValue(mockResults);

      const { result } = renderHook(() => useCustomerSearch(), { wrapper: queryWrapper.Wrapper });

      act(() => {
        result.current.setQuery('Sear');
      });

      expect(result.current.query).toBe('Sear');

      // Wait for debounce (300ms)
      await waitFor(
        () => {
          expect(result.current.results).toEqual(mockResults);
        },
        { timeout: 1500 }
      );

      expect(invoke).toHaveBeenCalledWith('search_customers', expect.any(Object));
    });
  });
});
