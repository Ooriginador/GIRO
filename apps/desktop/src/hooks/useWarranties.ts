/**
 * 🛡️ Hook: useWarranties
 *
 * Gerenciamento de Garantias (Motopeças)
 *
 * Features:
 * - CRUD de garantias
 * - Workflow (Open → InProgress → Approved/Denied → Closed)
 * - Resolução com tipos (Refund, Replacement, Repair, Credit)
 * - Filtros e estatísticas
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { useCallback, useState } from 'react';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type WarrantySourceType = 'SALE' | 'SERVICE_ORDER';

export type WarrantyStatus =
  | 'OPEN' // Recém aberta
  | 'IN_PROGRESS' // Em análise
  | 'APPROVED' // Aprovada
  | 'DENIED' // Negada
  | 'CLOSED'; // Resolvida

export type WarrantyResolutionType =
  | 'REFUND' // Reembolso
  | 'REPLACEMENT' // Troca
  | 'REPAIR' // Reparo
  | 'CREDIT'; // Crédito

export interface WarrantyClaim {
  id: string;
  customer_id: string;
  source_type: WarrantySourceType;
  sale_item_id?: string;
  order_item_id?: string;
  product_id?: string;
  description: string;
  reason: string;
  status: WarrantyStatus;
  resolution?: string;
  resolution_type?: WarrantyResolutionType;
  resolved_by_id?: string;
  resolved_at?: string;
  refund_amount?: number;
  replacement_cost?: number;
  created_at: string;
  updated_at: string;
}

export interface WarrantyClaimSummary {
  id: string;
  customer_name: string;
  product_name?: string;
  source_type: WarrantySourceType;
  source_number?: string;
  status: WarrantyStatus;
  description: string;
  created_at: string;
}

export interface WarrantyClaimWithDetails {
  claim: WarrantyClaim;
  customer_name: string;
  customer_phone?: string;
  product_name?: string;
  product_barcode?: string;
  resolved_by_name?: string;
  source_number?: string;
}

export interface CreateWarrantyClaimInput {
  [key: string]: unknown;
  customer_id: string;
  source_type: WarrantySourceType;
  sale_item_id?: string;
  order_item_id?: string;
  product_id?: string;
  description: string;
  reason: string;
}

export interface UpdateWarrantyClaimInput {
  description?: string;
  reason?: string;
  status?: WarrantyStatus;
  resolution?: string;
  resolution_type?: WarrantyResolutionType;
  resolved_by_id?: string;
  refund_amount?: number;
  replacement_cost?: number;
}

export interface ResolveWarrantyInput {
  resolution_type: WarrantyResolutionType;
  resolution: string;
  resolved_by_id: string;
  refund_amount?: number;
  replacement_cost?: number;
}

export interface WarrantyFilters {
  status?: WarrantyStatus;
  source_type?: WarrantySourceType;
  customer_id?: string;
  product_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface WarrantyStats {
  total_claims: number;
  open_claims: number;
  in_progress_claims: number;
  approved_claims: number;
  denied_claims: number;
  closed_claims: number;
  total_refund_amount: number;
  total_replacement_cost: number;
  avg_resolution_days?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// HOOK: useWarranties
// ══════════════════════════════════════════════════════════════════════════════

export function useWarranties() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<WarrantyFilters>({});

  // Lista garantias ativas
  const {
    data: activeWarranties,
    isLoading: isLoadingActive,
    refetch: refetchActive,
  } = useQuery({
    queryKey: ['warranties', 'active'],
    queryFn: async () => {
      const result = await invoke<WarrantyClaimSummary[]>('get_active_warranties');
      return result;
    },
  });

  // Lista com paginação
  const getWarrantiesPaginated = useCallback(
    async (page = 1, perPage = 20, customFilters?: WarrantyFilters) => {
      const activeFilters = customFilters || filters;

      const result = await invoke<PaginatedResult<WarrantyClaimSummary>>(
        'get_warranties_paginated',
        {
          page,
          perPage,
          ...activeFilters,
        }
      );

      return result;
    },
    [filters]
  );

  // Busca por ID
  const getWarrantyById = useCallback(async (id: string) => {
    const result = await invoke<WarrantyClaim | null>('get_warranty_by_id', { id });
    return result;
  }, []);

  // Busca com detalhes
  const getWarrantyDetails = useCallback(async (id: string) => {
    const result = await invoke<WarrantyClaimWithDetails | null>('get_warranty_details', {
      id,
    });
    return result;
  }, []);

  // Criar garantia
  const createWarranty = useMutation({
    mutationFn: async (input: CreateWarrantyClaimInput) => {
      const result = await invoke<WarrantyClaim>('create_warranty_claim', input);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warranties'] });
    },
  });

  // Atualizar garantia
  const updateWarranty = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateWarrantyClaimInput }) => {
      const result = await invoke<WarrantyClaim>('update_warranty_claim', { id, ...input });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warranties'] });
    },
  });

  // Aprovar garantia
  const approveWarranty = useMutation({
    mutationFn: async ({ id, employeeId }: { id: string; employeeId: string }) => {
      const result = await invoke<WarrantyClaim>('approve_warranty', {
        id,
        employeeId,
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warranties'] });
    },
  });

  // Negar garantia
  const denyWarranty = useMutation({
    mutationFn: async ({
      id,
      employeeId,
      reason,
    }: {
      id: string;
      employeeId: string;
      reason: string;
    }) => {
      const result = await invoke<WarrantyClaim>('deny_warranty', {
        id,
        employeeId,
        reason,
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warranties'] });
    },
  });

  // Resolver garantia
  const resolveWarranty = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: ResolveWarrantyInput }) => {
      const result = await invoke<WarrantyClaim>('resolve_warranty', { id, ...input });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warranties'] });
    },
  });

  return {
    activeWarranties,
    isLoadingActive,
    refetchActive,
    getWarrantiesPaginated,
    getWarrantyById,
    getWarrantyDetails,
    createWarranty,
    updateWarranty,
    approveWarranty,
    denyWarranty,
    resolveWarranty,
    filters,
    setFilters,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// HOOK: useWarrantyDetails
// ══════════════════════════════════════════════════════════════════════════════

export function useWarrantyDetails(warrantyId?: string) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['warranty-details', warrantyId],
    queryFn: async () => {
      if (!warrantyId) return null;
      const result = await invoke<WarrantyClaimWithDetails | null>('get_warranty_details', {
        id: warrantyId,
      });
      return result;
    },
    enabled: !!warrantyId,
  });

  return {
    warrantyDetails: data,
    isLoading,
    refetch,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// HOOK: useWarrantyStats
// ══════════════════════════════════════════════════════════════════════════════

export function useWarrantyStats(dateFrom?: string, dateTo?: string) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['warranty-stats', dateFrom, dateTo],
    queryFn: async () => {
      const result = await invoke<WarrantyStats>('get_warranty_stats', {
        dateFrom,
        dateTo,
      });
      return result;
    },
  });

  return {
    stats: data,
    isLoading,
    refetch,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// HOOK: useCustomerWarranties
// ══════════════════════════════════════════════════════════════════════════════

export function useCustomerWarranties(customerId?: string) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['warranties', 'customer', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const result = await invoke<WarrantyClaimSummary[]>('get_warranties_by_customer', {
        customerId,
      });
      return result;
    },
    enabled: !!customerId,
  });

  return {
    warranties: data || [],
    isLoading,
    refetch,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// HOOK: useProductWarranties
// ══════════════════════════════════════════════════════════════════════════════

export function useProductWarranties(productId?: string) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['warranties', 'product', productId],
    queryFn: async () => {
      if (!productId) return [];
      const result = await invoke<WarrantyClaimSummary[]>('get_warranties_by_product', {
        productId,
      });
      return result;
    },
    enabled: !!productId,
  });

  return {
    warranties: data || [],
    isLoading,
    refetch,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════════════════════════

export const WarrantyUtils = {
  getStatusLabel(status: WarrantyStatus): string {
    const labels: Record<WarrantyStatus, string> = {
      OPEN: 'Aberta',
      IN_PROGRESS: 'Em Análise',
      APPROVED: 'Aprovada',
      DENIED: 'Negada',
      CLOSED: 'Resolvida',
    };
    return labels[status];
  },

  getStatusColor(status: WarrantyStatus): string {
    const colors: Record<WarrantyStatus, string> = {
      OPEN: 'text-blue-600',
      IN_PROGRESS: 'text-yellow-600',
      APPROVED: 'text-green-600',
      DENIED: 'text-red-600',
      CLOSED: 'text-gray-600',
    };
    return colors[status];
  },

  getResolutionTypeLabel(type: WarrantyResolutionType): string {
    const labels: Record<WarrantyResolutionType, string> = {
      REFUND: 'Reembolso',
      REPLACEMENT: 'Troca',
      REPAIR: 'Reparo',
      CREDIT: 'Crédito',
    };
    return labels[type];
  },

  getSourceTypeLabel(type: WarrantySourceType): string {
    return type === 'SALE' ? 'Venda' : 'Ordem de Serviço';
  },

  canEdit(status: WarrantyStatus): boolean {
    return ['OPEN', 'IN_PROGRESS'].includes(status);
  },

  canApprove(status: WarrantyStatus): boolean {
    return ['OPEN', 'IN_PROGRESS'].includes(status);
  },

  canDeny(status: WarrantyStatus): boolean {
    return ['OPEN', 'IN_PROGRESS'].includes(status);
  },

  canResolve(status: WarrantyStatus): boolean {
    return status === 'APPROVED';
  },
};
