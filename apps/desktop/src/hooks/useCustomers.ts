import { useToast } from '@/hooks/use-toast';
import { invoke } from '@/lib/tauri';
import { useCallback, useEffect, useState } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface Customer {
  id: string;
  name: string;
  cpf?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  zipCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerWithStats extends Customer {
  vehicleCount: number;
  orderCount: number;
  totalSpent: number;
  lastVisit?: string;
}

export interface CustomerVehicle {
  id: string;
  customerId: string;
  vehicleYearId: string;
  plate?: string;
  chassis?: string;
  renavam?: string;
  color?: string;
  currentKm?: number;
  nickname?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerVehicleWithDetails extends CustomerVehicle {
  brandName: string;
  modelName: string;
  year: number;
  yearLabel: string;
  category?: string;
  engineSize?: number;
  displayName: string;
}

export interface CreateCustomerInput {
  name: string;
  cpf?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  zipCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  notes?: string;
}

export interface UpdateCustomerInput {
  name?: string;
  cpf?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  zipCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  isActive?: boolean;
  notes?: string;
}

export interface CreateCustomerVehicleInput {
  customerId: string;
  vehicleYearId: string;
  plate?: string;
  chassis?: string;
  renavam?: string;
  color?: string;
  currentKm?: number;
  nickname?: string;
  notes?: string;
}

export interface CustomerFilters {
  search?: string;
  city?: string;
  state?: string;
  isActive?: boolean;
  hasVehicles?: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK: useCustomers
// ═══════════════════════════════════════════════════════════════════════════

export function useCustomers() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar todos os clientes
  const loadCustomers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await invoke<Customer[]>('get_customers');
      setCustomers(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar clientes';
      setError(message);
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Buscar clientes
  const searchCustomers = useCallback(async (query: string, limit = 20): Promise<Customer[]> => {
    if (!query || query.length < 2) return [];

    try {
      return await invoke<Customer[]>('search_customers', { query, limit });
    } catch (err) {
      console.error('Erro ao buscar clientes:', (err as Error)?.message ?? String(err));
      return [];
    }
  }, []);

  // Buscar cliente por ID
  const getCustomerById = useCallback(async (id: string): Promise<Customer | null> => {
    try {
      return await invoke<Customer | null>('get_customer_by_id', { id });
    } catch (err) {
      console.error('Erro ao buscar cliente:', (err as Error)?.message ?? String(err));
      return null;
    }
  }, []);

  // Buscar cliente por CPF
  const getCustomerByCpf = useCallback(async (cpf: string): Promise<Customer | null> => {
    try {
      return await invoke<Customer | null>('get_customer_by_cpf', { cpf });
    } catch (err) {
      console.error('Erro ao buscar cliente:', (err as Error)?.message ?? String(err));
      return null;
    }
  }, []);

  // Criar cliente
  const createCustomer = useCallback(
    async (input: CreateCustomerInput): Promise<Customer | null> => {
      try {
        const customer = await invoke<Customer>('create_customer', { input });
        setCustomers((prev) => [...prev, customer]);
        toast({
          title: 'Cliente criado',
          description: `${customer.name} foi cadastrado com sucesso.`,
        });
        return customer;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao criar cliente';
        toast({
          title: 'Erro',
          description: message,
          variant: 'destructive',
        });
        return null;
      }
    },
    [toast]
  );

  // Atualizar cliente
  const updateCustomer = useCallback(
    async (id: string, input: UpdateCustomerInput): Promise<Customer | null> => {
      try {
        const customer = await invoke<Customer>('update_customer', { id, input });
        setCustomers((prev) => prev.map((c) => (c.id === id ? customer : c)));
        toast({
          title: 'Cliente atualizado',
          description: `${customer.name} foi atualizado com sucesso.`,
        });
        return customer;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar cliente';
        toast({
          title: 'Erro',
          description: message,
          variant: 'destructive',
        });
        return null;
      }
    },
    [toast]
  );

  // Desativar cliente
  const deactivateCustomer = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await invoke('deactivate_customer', { id });
        setCustomers((prev) => prev.filter((c) => c.id !== id));
        toast({
          title: 'Cliente desativado',
          description: 'O cliente foi desativado com sucesso.',
        });
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao desativar cliente';
        toast({
          title: 'Erro',
          description: message,
          variant: 'destructive',
        });
        return false;
      }
    },
    [toast]
  );

  return {
    customers,
    isLoading,
    error,
    loadCustomers,
    searchCustomers,
    getCustomerById,
    getCustomerByCpf,
    createCustomer,
    updateCustomer,
    deactivateCustomer,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK: useCustomerVehicles
// ═══════════════════════════════════════════════════════════════════════════

export function useCustomerVehicles(customerId: string | null) {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<CustomerVehicleWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar veículos do cliente
  const loadVehicles = useCallback(async () => {
    if (!customerId) {
      setVehicles([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await invoke<CustomerVehicleWithDetails[]>('get_customer_vehicles', {
        customerId,
      });
      setVehicles(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar veículos';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  // Carregar ao mudar o cliente
  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  // Adicionar veículo
  const addVehicle = useCallback(
    async (input: CreateCustomerVehicleInput): Promise<CustomerVehicle | null> => {
      try {
        const vehicle = await invoke<CustomerVehicle>('create_customer_vehicle', { input });
        await loadVehicles(); // Recarregar para ter os detalhes
        toast({
          title: 'Veículo adicionado',
          description: 'O veículo foi vinculado ao cliente.',
        });
        return vehicle;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao adicionar veículo';
        toast({
          title: 'Erro',
          description: message,
          variant: 'destructive',
        });
        return null;
      }
    },
    [loadVehicles, toast]
  );

  // Atualizar quilometragem
  const updateKm = useCallback(
    async (vehicleId: string, km: number): Promise<boolean> => {
      try {
        await invoke('update_vehicle_km', { id: vehicleId, km });
        setVehicles((prev) => prev.map((v) => (v.id === vehicleId ? { ...v, currentKm: km } : v)));
        toast({
          title: 'KM atualizada',
          description: `Quilometragem atualizada para ${km.toLocaleString()} km.`,
        });
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar KM';
        toast({
          title: 'Erro',
          description: message,
          variant: 'destructive',
        });
        return false;
      }
    },
    [toast]
  );

  // Remover veículo
  const removeVehicle = useCallback(
    async (vehicleId: string): Promise<boolean> => {
      try {
        await invoke('deactivate_customer_vehicle', { id: vehicleId });
        setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
        toast({
          title: 'Veículo removido',
          description: 'O veículo foi removido do cliente.',
        });
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao remover veículo';
        toast({
          title: 'Erro',
          description: message,
          variant: 'destructive',
        });
        return false;
      }
    },
    [toast]
  );

  return {
    vehicles,
    isLoading,
    error,
    loadVehicles,
    addVehicle,
    updateKm,
    removeVehicle,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK: useCustomerSearch (para campos de busca)
// ═══════════════════════════════════════════════════════════════════════════

export function useCustomerSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const { searchCustomers } = useCustomers();

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setIsSearching(true);
      const found = await searchCustomers(query);
      setResults(found);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, searchCustomers]);

  const reset = useCallback(() => {
    setQuery('');
    setResults([]);
    setSelectedCustomer(null);
  }, []);

  return {
    query,
    setQuery,
    results,
    isSearching,
    selectedCustomer,
    setSelectedCustomer,
    reset,
  };
}

export default useCustomers;
