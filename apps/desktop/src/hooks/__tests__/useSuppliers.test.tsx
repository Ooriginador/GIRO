/**
 * @file useSuppliers.test.tsx - Testes para hooks de fornecedores
 */

import {
  useAllSuppliers,
  useCreateSupplier,
  useDeactivateSupplier,
  useDeleteSupplier,
  useInactiveSuppliers,
  useReactivateSupplier,
  useSuppliers,
  useUpdateSupplier,
} from '@/hooks/useSuppliers';
import * as tauriLib from '@/lib/tauri';
import type { Supplier } from '@/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock do Tauri
vi.mock('@/lib/tauri', () => ({
  getSuppliers: vi.fn(),
  getAllSuppliers: vi.fn(),
  getInactiveSuppliers: vi.fn(),
  createSupplier: vi.fn(),
  updateSupplier: vi.fn(),
  deleteSupplier: vi.fn(),
  deactivateSupplier: vi.fn(),
  reactivateSupplier: vi.fn(),
}));

// Mock do toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
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

const mockSupplier: Supplier = {
  id: 'sup-001',
  name: 'Distribuidora ABC',
  tradeName: 'ABC Comercial',
  cnpj: '12.345.678/0001-90',
  email: 'contato@abc.com',
  phone: '(11) 99999-9999',
  address: 'Rua Principal, 123',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockSuppliers: Supplier[] = [
  mockSupplier,
  {
    ...mockSupplier,
    id: 'sup-002',
    name: 'Fornecedor XYZ',
  },
];

describe('useSuppliers Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useSuppliers', () => {
    it('should fetch active suppliers', async () => {
      vi.mocked(tauriLib.getSuppliers).mockResolvedValue(mockSuppliers);

      const { result } = renderHook(() => useSuppliers(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockSuppliers);
      expect(tauriLib.getSuppliers).toHaveBeenCalledTimes(1);
    });

    it('should handle error when fetching suppliers', async () => {
      vi.mocked(tauriLib.getSuppliers).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useSuppliers(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error?.message).toBe('Network error');
    });
  });

  describe('useAllSuppliers', () => {
    it('should fetch all suppliers including inactive', async () => {
      const allSuppliers = [...mockSuppliers, { ...mockSupplier, id: 'sup-003', isActive: false }];
      vi.mocked(tauriLib.getAllSuppliers).mockResolvedValue(allSuppliers);

      const { result } = renderHook(() => useAllSuppliers(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(3);
      expect(result.current.data?.some((s) => !s.isActive)).toBe(true);
    });
  });

  describe('useInactiveSuppliers', () => {
    it('should fetch only inactive suppliers', async () => {
      const inactiveSuppliers = [{ ...mockSupplier, id: 'sup-003', isActive: false }];
      vi.mocked(tauriLib.getInactiveSuppliers).mockResolvedValue(inactiveSuppliers);

      const { result } = renderHook(() => useInactiveSuppliers(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0]?.isActive).toBe(false);
    });
  });

  describe('useCreateSupplier', () => {
    it('should create a new supplier', async () => {
      vi.mocked(tauriLib.createSupplier).mockResolvedValue(mockSupplier);

      const { result } = renderHook(() => useCreateSupplier(), {
        wrapper: createWrapper(),
      });

      let createdSupplier: typeof mockSupplier | undefined;
      await act(async () => {
        createdSupplier = await result.current.mutateAsync({
          name: 'Distribuidora ABC',
          tradeName: 'ABC Comercial',
          cnpj: '12.345.678/0001-90',
          email: 'contato@abc.com',
          phone: '(11) 99999-9999',
          isActive: true,
        });
      });

      expect(tauriLib.createSupplier).toHaveBeenCalled();
      expect(createdSupplier).toEqual(mockSupplier);
    });

    it('should handle creation error', async () => {
      vi.mocked(tauriLib.createSupplier).mockRejectedValue(new Error('CNPJ já cadastrado'));

      const { result } = renderHook(() => useCreateSupplier(), {
        wrapper: createWrapper(),
      });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            name: 'Teste',
            cnpj: '12.345.678/0001-90',
            isActive: true,
          });
        })
      ).rejects.toThrow('CNPJ já cadastrado');
    });
  });

  describe('useUpdateSupplier', () => {
    it('should update a supplier', async () => {
      const updatedSupplier = { ...mockSupplier, name: 'Nome Atualizado' };
      vi.mocked(tauriLib.updateSupplier).mockResolvedValue(updatedSupplier);

      const { result } = renderHook(() => useUpdateSupplier(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 'sup-001',
          data: { name: 'Nome Atualizado' },
        });
      });

      expect(tauriLib.updateSupplier).toHaveBeenCalledWith('sup-001', {
        name: 'Nome Atualizado',
      });
    });
  });

  describe('useDeleteSupplier', () => {
    it('should delete a supplier', async () => {
      vi.mocked(tauriLib.deleteSupplier).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteSupplier(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('sup-001');
      });

      expect(tauriLib.deleteSupplier).toHaveBeenCalledWith('sup-001');
    });
  });

  describe('useDeactivateSupplier', () => {
    it('should deactivate a supplier', async () => {
      vi.mocked(tauriLib.deactivateSupplier).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeactivateSupplier(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('sup-001');
      });

      expect(tauriLib.deactivateSupplier).toHaveBeenCalledWith('sup-001');
    });
  });

  describe('useReactivateSupplier', () => {
    it('should reactivate a supplier', async () => {
      const reactivated = { ...mockSupplier, isActive: true };
      vi.mocked(tauriLib.reactivateSupplier).mockResolvedValue(reactivated);

      const { result } = renderHook(() => useReactivateSupplier(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('sup-003');
      });

      expect(tauriLib.reactivateSupplier).toHaveBeenCalledWith('sup-003');
    });
  });
});
