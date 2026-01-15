import { invoke } from '@/lib/tauri';
import { Employee } from '@/types';
import { useMutation, useQuery } from '@tanstack/react-query';

interface CreateFirstAdminInput {
  name: string;
  email?: string;
  pin: string;
}

export function useHasAdmin() {
  return useQuery({
    queryKey: ['has-admin'],
    queryFn: async () => {
      return await invoke<boolean>('has_admin');
    },
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useCreateFirstAdmin() {
  return useMutation({
    mutationFn: async (input: CreateFirstAdminInput) => {
      return await invoke<Employee>('create_first_admin', { input });
    },
  });
}
