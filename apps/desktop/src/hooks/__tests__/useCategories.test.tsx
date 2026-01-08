/**
 * @file useCategories.test.tsx - Testes para hooks de categorias
 */

import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '@/hooks/useCategories';
import * as tauriLib from '@/lib/tauri';
import type { Category } from '@/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock completo do Tauri
vi.mock('@/lib/tauri', () => ({
  getCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}));

// Mock do toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    toast: vi.fn(),
  }),
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

const mockCategory: Category = {
  id: 'cat-1',
  name: 'Bebidas',
  color: '#3b82f6',
  icon: 'wine',
  parentId: null,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('useCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch categories successfully', async () => {
    const categories = [mockCategory, { ...mockCategory, id: 'cat-2', name: 'Laticínios' }];
    vi.mocked(tauriLib.getCategories).mockResolvedValue(categories);

    const { result } = renderHook(() => useCategories(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(categories);
    expect(result.current.data).toHaveLength(2);
  });

  it('should cache categories for 10 minutes', async () => {
    const categories = [mockCategory];
    vi.mocked(tauriLib.getCategories).mockResolvedValue(categories);

    const { result, rerender } = renderHook(() => useCategories(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    rerender();

    // Não deve fazer nova chamada (cache)
    expect(tauriLib.getCategories).toHaveBeenCalledTimes(1);
  });

  it('should handle error state', async () => {
    vi.mocked(tauriLib.getCategories).mockRejectedValue(new Error('Database error'));

    const { result } = renderHook(() => useCategories(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });
});

describe('useCreateCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create category successfully', async () => {
    vi.mocked(tauriLib.createCategory).mockResolvedValue(mockCategory);

    const { result } = renderHook(() => useCreateCategory(), {
      wrapper: createWrapper(),
    });

    const input = {
      name: 'Bebidas',
      color: '#3b82f6',
      icon: 'wine',
    };

    result.current.mutate(input);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(tauriLib.createCategory).toHaveBeenCalledWith(input);
    expect(result.current.data).toEqual(mockCategory);
  });

  it('should create subcategory with parentId', async () => {
    const subCategory = { ...mockCategory, id: 'cat-sub', parentId: 'cat-1' };
    vi.mocked(tauriLib.createCategory).mockResolvedValue(subCategory);

    const { result } = renderHook(() => useCreateCategory(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      name: 'Refrigerantes',
      parentId: 'cat-1',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(tauriLib.createCategory).toHaveBeenCalledWith({
      name: 'Refrigerantes',
      parentId: 'cat-1',
    });
  });

  it('should handle duplicate name error', async () => {
    vi.mocked(tauriLib.createCategory).mockRejectedValue(
      new Error('Já existe uma categoria com este nome')
    );

    const { result } = renderHook(() => useCreateCategory(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: 'Bebidas' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useUpdateCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update category successfully', async () => {
    const updatedCategory = { ...mockCategory, name: 'Bebidas Alcoólicas' };
    vi.mocked(tauriLib.updateCategory).mockResolvedValue(updatedCategory);

    const { result } = renderHook(() => useUpdateCategory(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: 'cat-1',
      data: { name: 'Bebidas Alcoólicas' },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(tauriLib.updateCategory).toHaveBeenCalledWith('cat-1', {
      name: 'Bebidas Alcoólicas',
    });
    expect(result.current.data?.name).toBe('Bebidas Alcoólicas');
  });

  it('should update category color and icon', async () => {
    const updatedCategory = { ...mockCategory, color: '#ef4444', icon: 'milk' };
    vi.mocked(tauriLib.updateCategory).mockResolvedValue(updatedCategory);

    const { result } = renderHook(() => useUpdateCategory(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: 'cat-1',
      data: { color: '#ef4444', icon: 'milk' },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.color).toBe('#ef4444');
    expect(result.current.data?.icon).toBe('milk');
  });
});

describe('useDeleteCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete category successfully', async () => {
    vi.mocked(tauriLib.deleteCategory).mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteCategory(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('cat-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(tauriLib.deleteCategory).toHaveBeenCalledWith('cat-1');
  });

  it('should handle delete error when category has products', async () => {
    vi.mocked(tauriLib.deleteCategory).mockRejectedValue(
      new Error('Categoria possui produtos vinculados')
    );

    const { result } = renderHook(() => useDeleteCategory(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('cat-1');

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('Category Constants', () => {
  it('should have predefined colors', () => {
    expect(CATEGORY_COLORS).toHaveLength(11);
    expect(CATEGORY_COLORS[0]).toHaveProperty('name');
    expect(CATEGORY_COLORS[0]).toHaveProperty('value');
    expect(CATEGORY_COLORS[0]?.value).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('should have predefined icons', () => {
    expect(CATEGORY_ICONS).toHaveLength(10);
    expect(CATEGORY_ICONS).toContain('shopping-basket');
    expect(CATEGORY_ICONS).toContain('milk');
  });
});
