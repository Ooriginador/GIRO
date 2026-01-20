/**
 * 🦀 Hook: useServiceOrders
 *
 * Gerenciamento de Ordens de Serviço (Motopeças)
 *
 * Features:
 * - CRUD de ordens de serviço
 * - Gerenciamento de status (Open → InProgress → Completed → Delivered)
 * - Adição/remoção de itens (peças e serviços)
 * - Cálculo automático de totais
 * - Filtros e paginação
 */

import { invoke } from '@/lib/tauri';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type ServiceOrderStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'QUOTE'
  | 'WAITING_PARTS'
  | 'COMPLETED'
  | 'DELIVERED'
  | 'CANCELED'
  | 'QUOTE';

export type ServiceItemType = 'PART' | 'SERVICE';

export interface ServiceOrder {
  id: string;
  order_number: number;
  customer_id: string;
  customer_vehicle_id: string;
  vehicle_year_id: string;
  employee_id: string;
  vehicle_km?: number;
  symptoms?: string;
  diagnosis?: string;
  status: ServiceOrderStatus;
  labor_cost: number;
  parts_cost: number;
  discount: number;
  total: number;
  warranty_days: number;
  warranty_until?: string;
  scheduled_date?: string;
  started_at?: string;
  completed_at?: string;
  payment_method?: string;
  is_paid: boolean;
  notes?: string;
  internal_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceOrderSummary {
  id: string;
  order_number: number;
  status: ServiceOrderStatus;
  customer_name: string;
  vehicle_display_name: string;
  vehicle_plate?: string;
  total: number;
  is_paid: boolean;
  created_at: string;
}

export interface ServiceOrderWithDetails {
  order: ServiceOrder;
  customer_name: string;
  customer_phone?: string;
  vehicle_display_name: string;
  vehicle_plate?: string;
  vehicle_color?: string;
  employee_name: string;
  items: ServiceOrderItem[];
}

export interface ServiceOrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  item_type: ServiceItemType;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
  warranty_days?: number;
  created_at: string;
}

export interface Service {
  id: string;
  code: string;
  name: string;
  description?: string;
  default_price: number;
  estimated_time?: number;
  default_warranty_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateServiceOrderInput {
  [key: string]: unknown;
  customer_id: string;
  customer_vehicle_id: string;
  vehicle_year_id: string;
  employee_id: string;
  vehicle_km?: number;
  symptoms?: string;
  scheduled_date?: string;
  notes?: string;
  internal_notes?: string;
  status?: string;
}

export interface UpdateServiceOrderInput {
  vehicle_km?: number;
  symptoms?: string;
  diagnosis?: string;
  status?: ServiceOrderStatus;
  labor_cost?: number;
  discount?: number;
  warranty_days?: number;
  scheduled_date?: string;
  payment_method?: string;
  is_paid?: boolean;
  notes?: string;
  internal_notes?: string;
}

export interface AddServiceOrderItemInput {
  [key: string]: unknown;
  order_id: string;
  product_id?: string;
  item_type: ServiceItemType;
  description: string;
  quantity: number;
  unit_price: number;
  discount?: number;
  warranty_days?: number;
}

export interface ServiceOrderFilters {
  status?: ServiceOrderStatus;
  customer_id?: string;
  vehicle_id?: string;
  employee_id?: string;
  is_paid?: boolean;
  date_from?: string;
  date_to?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// HOOK: useServiceOrders
// ══════════════════════════════════════════════════════════════════════════════

export function useServiceOrders() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<ServiceOrderFilters>({});

  // Lista ordens abertas (dashboard)
  const {
    data: openOrders,
    isLoading: isLoadingOpen,
    refetch: refetchOpen,
  } = useQuery({
    queryKey: ['service-orders', 'open'],
    queryFn: async () => {
      const result = await invoke<ServiceOrderSummary[]>('get_open_service_orders');
      return result;
    },
  });

  // Lista ordens com paginação
  const getOrdersPaginated = useCallback(
    async (page = 1, perPage = 20, customFilters?: ServiceOrderFilters) => {
      const activeFilters = customFilters || filters;

      const result = await invoke<PaginatedResult<ServiceOrderSummary>>(
        'get_service_orders_paginated',
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

  // Busca ordem por ID
  const getOrderById = useCallback(async (id: string) => {
    const result = await invoke<ServiceOrder | null>('get_service_order_by_id', { id });
    return result;
  }, []);

  // Busca ordem por número
  const getOrderByNumber = useCallback(async (orderNumber: number) => {
    const result = await invoke<ServiceOrder | null>('get_service_order_by_number', {
      orderNumber,
    });
    return result;
  }, []);

  // Busca ordem com detalhes
  const getOrderDetails = useCallback(async (id: string) => {
    const result = await invoke<ServiceOrderWithDetails | null>('get_service_order_details', {
      id,
    });
    return result;
  }, []);

  // Criar ordem
  const createOrder = useMutation({
    mutationFn: async (input: CreateServiceOrderInput) => {
      const result = await invoke<ServiceOrder>('create_service_order', input);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
    },
  });

  // Atualizar ordem
  const updateOrder = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateServiceOrderInput }) => {
      const result = await invoke<ServiceOrder>('update_service_order', { id, ...input });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
    },
  });

  // Iniciar ordem
  const startOrder = useMutation({
    mutationFn: async (id: string) => {
      const result = await invoke<ServiceOrder>('start_service_order', { id });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
    },
  });

  // Completar ordem
  const completeOrder = useMutation({
    mutationFn: async ({ id, diagnosis }: { id: string; diagnosis?: string }) => {
      const result = await invoke<ServiceOrder>('complete_service_order', { id, diagnosis });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
    },
  });

  // Entregar ordem
  const deliverOrder = useMutation({
    mutationFn: async ({ id, paymentMethod }: { id: string; paymentMethod: string }) => {
      const result = await invoke<ServiceOrder>('deliver_service_order', {
        id,
        paymentMethod,
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
    },
  });

  // Cancelar ordem
  const cancelOrder = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const result = await invoke<ServiceOrder>('cancel_service_order', { id, notes });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
    },
  });

  return {
    openOrders,
    isLoadingOpen,
    refetchOpen,
    getOrdersPaginated,
    getOrderById,
    getOrderByNumber,
    getOrderDetails,
    createOrder,
    updateOrder,
    startOrder,
    completeOrder,
    deliverOrder,
    cancelOrder,
    filters,
    setFilters,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// HOOK: useServiceOrderItems
// ══════════════════════════════════════════════════════════════════════════════

export function useServiceOrderItems(orderId?: string) {
  const queryClient = useQueryClient();

  // Lista itens da ordem
  const {
    data: items,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['service-order-items', orderId],
    queryFn: async () => {
      if (!orderId) return [];
      const result = await invoke<ServiceOrderItem[]>('get_service_order_items', {
        orderId,
      });
      return result;
    },
    enabled: !!orderId,
  });

  // Adicionar item
  const addItem = useMutation({
    mutationFn: async (input: AddServiceOrderItemInput) => {
      const result = await invoke<ServiceOrderItem>('add_service_order_item', input);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-order-items', orderId] });
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
    },
  });

  // Remover item
  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      await invoke('remove_service_order_item', { itemId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-order-items', orderId] });
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
    },
  });

  // Atualizar item
  const updateItem = useMutation({
    mutationFn: async (vars: {
      itemId: string;
      quantity?: number;
      unitPrice?: number;
      discount?: number;
      notes?: string;
      employeeId?: string;
    }) => {
      const result = await invoke<ServiceOrderItem>('update_service_order_item', {
        itemId: vars.itemId,
        quantity: vars.quantity,
        unitPrice: vars.unitPrice,
        discount: vars.discount,
        notes: vars.notes,
        employeeId: vars.employeeId,
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-order-items', orderId] });
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
    },
  });

  return {
    items: items || [],
    isLoading,
    refetch,
    addItem,
    removeItem,
    updateItem,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// HOOK: useServices (pré-cadastrados)
// ══════════════════════════════════════════════════════════════════════════════

export function useServices() {
  const queryClient = useQueryClient();

  // Lista todos os serviços ativos
  const {
    data: services,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const result = await invoke<Service[]>('get_services');
      return result;
    },
  });

  // Busca serviço por ID
  const getServiceById = useCallback(async (id: string) => {
    const result = await invoke<Service | null>('get_service_by_id', { id });
    return result;
  }, []);

  // Busca serviço por código
  const getServiceByCode = useCallback(async (code: string) => {
    const result = await invoke<Service | null>('get_service_by_code', { code });
    return result;
  }, []);

  // Criar serviço
  const createService = useMutation({
    mutationFn: async (input: {
      code: string;
      name: string;
      description?: string;
      default_price: number;
      estimated_time?: number;
      default_warranty_days?: number;
    }) => {
      const result = await invoke<Service>('create_service', input);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });

  // Atualizar serviço
  const updateService = useMutation({
    mutationFn: async ({
      id,
      ...input
    }: {
      id: string;
      code?: string;
      name?: string;
      description?: string;
      default_price?: number;
      estimated_time?: number;
      default_warranty_days?: number;
      is_active?: boolean;
    }) => {
      const result = await invoke<Service>('update_service', { id, ...input });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });

  return {
    services: services || [],
    isLoading,
    refetch,
    getServiceById,
    getServiceByCode,
    createService,
    updateService,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// UTILITY HOOKS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Hook para gerenciar ordem específica com detalhes completos
 */
export function useServiceOrderDetails(orderId?: string) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['service-order-details', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const result = await invoke<ServiceOrderWithDetails | null>('get_service_order_details', {
        id: orderId,
      });
      return result;
    },
    enabled: !!orderId,
  });

  return {
    orderDetails: data,
    isLoading,
    refetch,
  };
}

/**
 * Utilitários de formatação e validação
 */
export const ServiceOrderUtils = {
  getStatusLabel(status: ServiceOrderStatus): string {
    const labels: Record<ServiceOrderStatus, string> = {
      OPEN: 'Aberta',
      QUOTE: 'Orçamento',
      IN_PROGRESS: 'Em Andamento',
      WAITING_PARTS: 'Aguardando Peças',
      COMPLETED: 'Concluída',
      DELIVERED: 'Entregue',
      CANCELED: 'Cancelada',
    };
    return labels[status];
  },

  getStatusColor(status: ServiceOrderStatus): string {
    const colors: Record<ServiceOrderStatus, string> = {
      OPEN: 'text-blue-600',
      QUOTE: 'text-indigo-600',
      IN_PROGRESS: 'text-yellow-600',
      WAITING_PARTS: 'text-orange-600',
      COMPLETED: 'text-green-600',
      DELIVERED: 'text-gray-600',
      CANCELED: 'text-red-600',
    };
    return colors[status];
  },

  getItemTypeLabel(type: ServiceItemType): string {
    return type === 'PART' ? 'Peça' : 'Serviço';
  },

  formatOrderNumber(number: number): string {
    return `OS #${String(number).padStart(5, '0')}`;
  },

  canEdit(status: ServiceOrderStatus): boolean {
    return ['OPEN', 'QUOTE', 'IN_PROGRESS', 'WAITING_PARTS'].includes(status);
  },

  canStart(status: ServiceOrderStatus): boolean {
    return status === 'OPEN';
  },

  canComplete(status: ServiceOrderStatus): boolean {
    return status === 'IN_PROGRESS';
  },

  canDeliver(status: ServiceOrderStatus): boolean {
    return status === 'COMPLETED';
  },

  canCancel(status: ServiceOrderStatus): boolean {
    return !['DELIVERED', 'CANCELED'].includes(status);
  },
};
