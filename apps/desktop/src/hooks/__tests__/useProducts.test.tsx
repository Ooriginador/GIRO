import { invoke } from '@/lib/tauri';
import { createQueryWrapper } from '@/test/queryWrapper';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useAllProducts,
  useCategories,
  useCategory,
  useCreateCategory,
  useCreateProduct,
  useDeactivateProduct,
  useDeleteCategory,
  useInactiveProducts,
  useProduct,
  useProductByBarcode,
  useProducts,
  useProductSearch,
  useReactivateProduct,
  useUpdateCategory,
  useUpdateProduct,
} from '../useProducts';

// Mock Tauri invoke
vi.mock('@/lib/tauri', () => ({
  invoke: vi.fn(),
}));

const queryWrapper = createQueryWrapper();

describe('useProducts hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockProduct = { id: '1', name: 'Test Product', salePrice: 10, categoryId: 'cat1' };
  const mockCategory = { id: 'cat1', name: 'Test Category' };

  describe('Queries', () => {
    it('useProducts should fetch products', async () => {
      vi.mocked(invoke).mockResolvedValue([mockProduct]);
      const { result } = renderHook(() => useProducts({ search: 'test' }), {
        wrapper: queryWrapper.Wrapper,
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([mockProduct]);
      expect(invoke).toHaveBeenCalledWith('get_products', { filter: { search: 'test' } });
    });

    it('useProduct should fetch single product', async () => {
      vi.mocked(invoke).mockResolvedValue(mockProduct);
      const { result } = renderHook(() => useProduct('1'), { wrapper: queryWrapper.Wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockProduct);
      expect(invoke).toHaveBeenCalledWith('get_product', { id: '1' });
    });

    it('useProductByBarcode should fetch by barcode', async () => {
      vi.mocked(invoke).mockResolvedValue(mockProduct);
      const { result } = renderHook(() => useProductByBarcode('12345'), {
        wrapper: queryWrapper.Wrapper,
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(invoke).toHaveBeenCalledWith('get_product_by_barcode', { barcode: '12345' });
    });

    it('useProductSearch should autocomplete', async () => {
      vi.mocked(invoke).mockResolvedValue([mockProduct]);
      const { result } = renderHook(() => useProductSearch('te'), {
        wrapper: queryWrapper.Wrapper,
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(invoke).toHaveBeenCalledWith('search_products', { search: 'te', limit: 10 });
    });

    it('useCategories should fetch categories', async () => {
      vi.mocked(invoke).mockResolvedValue([mockCategory]);
      const { result } = renderHook(() => useCategories(), { wrapper: queryWrapper.Wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(invoke).toHaveBeenCalledWith('get_categories');
    });

    it('useCategory should fetch single category', async () => {
      vi.mocked(invoke).mockResolvedValue(mockCategory);
      const { result } = renderHook(() => useCategory('cat1'), { wrapper: queryWrapper.Wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(invoke).toHaveBeenCalledWith('get_category', { id: 'cat1' });
    });

    it('useInactiveProducts should fetch inactive', async () => {
      vi.mocked(invoke).mockResolvedValue([mockProduct]);
      const { result } = renderHook(() => useInactiveProducts(), { wrapper: queryWrapper.Wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(invoke).toHaveBeenCalledWith('get_inactive_products');
    });

    it('useAllProducts should fetch all', async () => {
      vi.mocked(invoke).mockResolvedValue([mockProduct]);
      const { result } = renderHook(() => useAllProducts(true), { wrapper: queryWrapper.Wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(invoke).toHaveBeenCalledWith('get_all_products', { includeInactive: true });
    });
  });

  describe('Mutations', () => {
    it('useCreateProduct should call create_product', async () => {
      vi.mocked(invoke).mockResolvedValue(mockProduct);
      const { result } = renderHook(() => useCreateProduct(), { wrapper: queryWrapper.Wrapper });
      await result.current.mutateAsync({
        name: 'New',
        categoryId: 'cat1',
        salePrice: 15,
        unit: 'un',
      });
      expect(invoke).toHaveBeenCalledWith('create_product', expect.any(Object));
    });

    it('useUpdateProduct should call update_product', async () => {
      vi.mocked(invoke).mockResolvedValue(mockProduct);
      const { result } = renderHook(() => useUpdateProduct(), { wrapper: queryWrapper.Wrapper });
      await result.current.mutateAsync({ id: '1', name: 'Updated' });
      expect(invoke).toHaveBeenCalledWith('update_product', {
        input: { id: '1', name: 'Updated' },
      });
    });

    it('useDeactivateProduct should call deactivate_product', async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);
      const { result } = renderHook(() => useDeactivateProduct(), {
        wrapper: queryWrapper.Wrapper,
      });
      await result.current.mutateAsync('1');
      expect(invoke).toHaveBeenCalledWith('deactivate_product', { id: '1' });
    });

    it('useReactivateProduct should call reactivate_product', async () => {
      vi.mocked(invoke).mockResolvedValue(mockProduct);
      const { result } = renderHook(() => useReactivateProduct(), {
        wrapper: queryWrapper.Wrapper,
      });
      await result.current.mutateAsync('1');
      expect(invoke).toHaveBeenCalledWith('reactivate_product', { id: '1' });
    });

    it('useCreateCategory should call create_category', async () => {
      vi.mocked(invoke).mockResolvedValue(mockCategory);
      const { result } = renderHook(() => useCreateCategory(), { wrapper: queryWrapper.Wrapper });
      await result.current.mutateAsync({ name: 'New Cat' });
      expect(invoke).toHaveBeenCalledWith('create_category', expect.any(Object));
    });

    it('useUpdateCategory should call update_category', async () => {
      vi.mocked(invoke).mockResolvedValue(mockCategory);
      const { result } = renderHook(() => useUpdateCategory(), { wrapper: queryWrapper.Wrapper });
      await result.current.mutateAsync({ id: 'cat1', name: 'Updated' });
      expect(invoke).toHaveBeenCalledWith('update_category', {
        input: { id: 'cat1', name: 'Updated' },
      });
    });

    it('useDeleteCategory should call delete_category', async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);
      const { result } = renderHook(() => useDeleteCategory(), { wrapper: queryWrapper.Wrapper });
      await result.current.mutateAsync('cat1');
      expect(invoke).toHaveBeenCalledWith('delete_category', { id: 'cat1' });
    });
  });
});
