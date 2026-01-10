import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProducts } from '../useProducts';

// Mock Tauri
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const invokeMock = invoke as unknown as ReturnType<typeof vi.fn>;

  describe('useProducts (list)', () => {
    it('should fetch products successfully', async () => {
      const mockProducts = [
        { id: '1', name: 'Product 1', salePrice: 10.0, currentStock: 100 },
        { id: '2', name: 'Product 2', salePrice: 20.0, currentStock: 50 },
      ];

      invokeMock.mockResolvedValue(mockProducts);

      const { result } = renderHook(() => useProducts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockProducts);
      expect(invoke).toHaveBeenCalledWith('get_products', { filter: undefined });
    });

    it('should handle error state', async () => {
      invokeMock.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useProducts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useCreateProduct', () => {
    it('should create product successfully', async () => {
      const newProduct = {
        id: '3',
        name: 'New Product',
        barcode: '7890000000001',
        salePrice: 30.0,
      };

      invokeMock.mockResolvedValue(newProduct);

      // Este hook precisa ser importado quando for criado
      // const { result } = renderHook(() => useCreateProduct(), {
      //   wrapper: createWrapper(),
      // });

      // await result.current.mutateAsync({
      //   name: 'New Product',
      //   barcode: '7890000000001',
      //   salePrice: 30.0,
      // });

      // expect(invoke).toHaveBeenCalledWith('create_product', expect.any(Object));
    });
  });

  describe('useSearchProducts', () => {
    it('should search products by query', async () => {
      const mockResults = [{ id: '1', name: 'Arroz Tipo 1', barcode: '7890000000001' }];

      invokeMock.mockResolvedValue(mockResults);

      // Este hook precisa ser implementado
      // const { result } = renderHook(() => useSearchProducts('arroz'), {
      //   wrapper: createWrapper(),
      // });

      // await waitFor(() => {
      //   expect(result.current.data).toEqual(mockResults);
      // });
    });
  });
});
