import { invoke } from '@/lib/tauri';
import { Employee } from '@/types';
import { useMutation, useQuery } from '@tanstack/react-query';

interface CreateFirstAdminInput {
  name: string;
  email?: string;
  pin: string;
}

// [Bust Cache] Unique key per session
const SESSION_ID = Math.random().toString(36).substring(7);

export function useHasAdmin() {
  return useQuery({
    queryKey: ['has-admin', SESSION_ID],
    queryFn: async () => {
      const win = window as unknown as { __E2E_HAS_ADMIN?: unknown };
      if (typeof window !== 'undefined' && win.__E2E_HAS_ADMIN !== undefined) {
        return Boolean(win.__E2E_HAS_ADMIN);
      }

      return await invoke<boolean>('has_admin');
    },
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache at all
    refetchOnMount: 'always', // Always refetch when component mounts
  });
}

export function useCreateFirstAdmin() {
  return useMutation({
    mutationFn: async (input: CreateFirstAdminInput) => {
      return await invoke<Employee>('create_first_admin', { input });
    },
  });
}
