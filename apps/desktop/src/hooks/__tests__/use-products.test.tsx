/**
 * @file use-products.test.tsx - Testes para hooks de produtos
 */

import * as tauriLib from '@/lib/tauri';
import { createQueryWrapper } from '@/test/queryWrapper';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useAllProducts,
  useCreateProduct,
  useDeactivateProduct,
  useDeleteProduct,
  useInactiveProducts,
  useProduct,
  useProductByBarcode,
  useProductSearch,
  useProducts,
  useReactivateProduct,
  useUpdateProduct,
} from '../use-products';

// Mock Tauri library
vi.mock('@/lib/tauri', () => ({
  getProducts: vi.fn(),
  getProductById: vi.fn(),
  getProductByBarcode: vi.fn(),
  searchProducts: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  deactivateProduct: vi.fn(),
  reactivateProduct: vi.fn(),
  getAllProducts: vi.fn(),
  getInactiveProducts: vi.fn(),
}));

// Provide a stable useAuthStore with getState for mutation hooks that call
// `useAuthStore.getState().employee?.id` inside the implementation.
vi.mock('@/stores/auth-store', () => {
  const fn = () => ({ employee: { id: 'admin-1' } });
  (fn as any).getState = () => ({ employee: { id: 'admin-1' } });
  return { useAuthStore: fn };
});

const queryWrapper = createQueryWrapper();

describe('use-products hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockProduct = {
    id: '1',
    name: 'Test Product',
    internalCode: 'P001',
    salePrice: 10,
    costPrice: 5,
    categoryId: 'cat1',
    isActive: true,
    isWeighted: false,
    unit: 'UNIT' as any,
    currentStock: 10,
    minStock: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  describe('Queries', () => {
    it('useProducts should fetch products', async () => {
      vi.mocked(tauriLib.getProducts).mockResolvedValue([mockProduct]);
      const { result } = renderHook(() => useProducts({ search: 'test' }), {
        wrapper: queryWrapper.Wrapper,
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([mockProduct]);
      expect(tauriLib.getProducts).toHaveBeenCalledWith({ search: 'test' });
    });

    it('useProduct should fetch single product', async () => {
      vi.mocked(tauriLib.getProductById).mockResolvedValue(mockProduct);
      const { result } = renderHook(() => useProduct('1'), { wrapper: queryWrapper.Wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockProduct);
      expect(tauriLib.getProductById).toHaveBeenCalledWith('1');
    });

    it('useProductByBarcode should fetch by barcode', async () => {
      vi.mocked(tauriLib.getProductByBarcode).mockResolvedValue(mockProduct);
      const { result } = renderHook(() => useProductByBarcode('12345'), {
        wrapper: queryWrapper.Wrapper,
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(tauriLib.getProductByBarcode).toHaveBeenCalledWith('12345');
    });

    it('useProductSearch should autocomplete', async () => {
      vi.mocked(tauriLib.searchProducts).mockResolvedValue([mockProduct]);
      const { result } = renderHook(() => useProductSearch('apple'), {
        wrapper: queryWrapper.Wrapper,
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(tauriLib.searchProducts).toHaveBeenCalledWith('apple');
    });

    it('useInactiveProducts should fetch inactive', async () => {
      vi.mocked(tauriLib.getInactiveProducts).mockResolvedValue([mockProduct]);
      const { result } = renderHook(() => useInactiveProducts(), { wrapper: queryWrapper.Wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(tauriLib.getInactiveProducts).toHaveBeenCalled();
    });

    it('useAllProducts should fetch all', async () => {
      vi.mocked(tauriLib.getAllProducts).mockResolvedValue([mockProduct]);
      const { result } = renderHook(() => useAllProducts(true), { wrapper: queryWrapper.Wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(tauriLib.getAllProducts).toHaveBeenCalledWith(true);
    });
  });

  describe('Mutations', () => {
    it('useCreateProduct should call createProduct', async () => {
      vi.mocked(tauriLib.createProduct).mockResolvedValue(mockProduct);
      const { result } = renderHook(() => useCreateProduct(), { wrapper: queryWrapper.Wrapper });
      await result.current.mutateAsync({
        name: 'New',
        categoryId: 'cat1',
        salePrice: 15,
        costPrice: 10,
        minStock: 5,
        unit: 'UNIT' as any,
      });
      expect(tauriLib.createProduct).toHaveBeenCalledWith(expect.any(Object));
    });

    it('useUpdateProduct should call updateProduct', async () => {
      vi.mocked(tauriLib.updateProduct).mockResolvedValue(mockProduct);
      const { result } = renderHook(() => useUpdateProduct(), { wrapper: queryWrapper.Wrapper });
      await result.current.mutateAsync({ id: '1', name: 'Updated' });
      expect(tauriLib.updateProduct).toHaveBeenCalledWith({ id: '1', name: 'Updated' });
    });

    it('useDeleteProduct should call deleteProduct', async () => {
      vi.mocked(tauriLib.deleteProduct).mockResolvedValue(undefined);
      const { result } = renderHook(() => useDeleteProduct(), {
        wrapper: queryWrapper.Wrapper,
      });
      await result.current.mutateAsync('1');
      expect(tauriLib.deleteProduct).toHaveBeenCalledWith('1');
    });

    it('useDeactivateProduct should call deactivateProduct', async () => {
      vi.mocked(tauriLib.deactivateProduct).mockResolvedValue(undefined);
      const { result } = renderHook(() => useDeactivateProduct(), {
        wrapper: queryWrapper.Wrapper,
      });
      await result.current.mutateAsync('1');
      expect(tauriLib.deactivateProduct).toHaveBeenCalledWith('1');
    });

    it('useReactivateProduct should call reactivateProduct', async () => {
      vi.mocked(tauriLib.reactivateProduct).mockResolvedValue(mockProduct);
      const { result } = renderHook(() => useReactivateProduct(), {
        wrapper: queryWrapper.Wrapper,
      });
      await result.current.mutateAsync('1');
      expect(tauriLib.reactivateProduct).toHaveBeenCalledWith('1');
    });
  });
});
