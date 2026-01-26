/**
 * @file useEmployees - Hooks para gerenciamento de funcionários
 */

import {
  createEmployee,
  deactivateEmployee,
  getEmployees,
  getInactiveEmployees,
  reactivateEmployee,
  updateEmployee,
} from '@/lib/tauri';
import { type Employee } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ────────────────────────────────────────────────────────────────────────────
// QUERY KEYS
// ────────────────────────────────────────────────────────────────────────────

export const employeeKeys = {
  all: ['employees'] as const,
  lists: () => [...employeeKeys.all, 'list'] as const,
  listInactive: () => [...employeeKeys.all, 'listInactive'] as const,
  detail: (id: string) => [...employeeKeys.all, 'detail', id] as const,
};

// ────────────────────────────────────────────────────────────────────────────
// QUERIES
// ────────────────────────────────────────────────────────────────────────────

export function useEmployees() {
  return useQuery({
    queryKey: employeeKeys.lists(),
    queryFn: getEmployees,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useInactiveEmployees() {
  return useQuery({
    queryKey: employeeKeys.listInactive(),
    queryFn: getInactiveEmployees,
    staleTime: 1000 * 60 * 5,
  });
}

// ────────────────────────────────────────────────────────────────────────────
// MUTATIONS
// ────────────────────────────────────────────────────────────────────────────

/** Input para criar funcionário */
export type CreateEmployeeInput = {
  name: string;
  role: string; // Aceita todos os roles incluindo Enterprise
  pin?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
  cpf?: string | null;
  password?: string | null;
  commissionRate?: number | null;
};

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateEmployeeInput) =>
      createEmployee(input as unknown as Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; data: Partial<Employee> }) =>
      updateEmployee(input.id, input.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
    },
  });
}

export function useDeactivateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deactivateEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
    },
  });
}

export function useReactivateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => reactivateEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
    },
  });
}
