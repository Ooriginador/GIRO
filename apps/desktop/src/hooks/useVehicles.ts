import { VehicleBrand, VehicleComplete, VehicleModel, VehicleYear } from '@/types/motoparts';
import { invoke } from '@tauri-apps/api/core';
import { useCallback, useEffect, useMemo, useState } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// HOOK: useVehicles
// ═══════════════════════════════════════════════════════════════════════════
// Gerencia busca e seleção de veículos (marca → modelo → ano)
// ═══════════════════════════════════════════════════════════════════════════

interface UseVehiclesOptions {
  /**
   * Se deve carregar as marcas automaticamente
   * @default true
   */
  autoLoadBrands?: boolean;
}

interface UseVehiclesReturn {
  // Dados
  brands: VehicleBrand[];
  models: VehicleModel[];
  years: VehicleYear[];

  // Seleção atual
  selectedBrand: VehicleBrand | null;
  selectedModel: VehicleModel | null;
  selectedYear: VehicleYear | null;
  selectedVehicle: VehicleComplete | null;

  // Estados
  isLoadingBrands: boolean;
  isLoadingModels: boolean;
  isLoadingYears: boolean;
  error: string | null;

  // Ações
  loadBrands: () => Promise<void>;
  selectBrand: (brandId: string | null) => Promise<void>;
  selectModel: (modelId: string | null) => Promise<void>;
  selectYear: (yearId: string | null) => void;
  reset: () => void;

  // Busca
  searchVehicles: (query: string) => Promise<VehicleComplete[]>;
}

export function useVehicles(options: UseVehiclesOptions = {}): UseVehiclesReturn {
  const { autoLoadBrands = true } = options;

  // Estados
  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [years, setYears] = useState<VehicleYear[]>([]);

  const [selectedBrand, setSelectedBrand] = useState<VehicleBrand | null>(null);
  const [selectedModel, setSelectedModel] = useState<VehicleModel | null>(null);
  const [selectedYear, setSelectedYear] = useState<VehicleYear | null>(null);

  const [isLoadingBrands, setIsLoadingBrands] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isLoadingYears, setIsLoadingYears] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Veículo completo selecionado
  const selectedVehicle = useMemo<VehicleComplete | null>(() => {
    if (!selectedBrand || !selectedModel || !selectedYear) {
      return null;
    }

    return {
      yearId: selectedYear.id,
      year: selectedYear.year,
      yearLabel: selectedYear.yearLabel,
      fuelType: selectedYear.fuelType,
      modelId: selectedModel.id,
      modelName: selectedModel.name,
      modelFipeCode: selectedModel.fipeCode,
      category: selectedModel.category,
      engineSize: selectedModel.engineSize,
      brandId: selectedBrand.id,
      brandName: selectedBrand.name,
      brandFipeCode: selectedBrand.fipeCode,
      brandLogoUrl: selectedBrand.logoUrl,
      displayName: `${selectedBrand.name} ${selectedModel.name} ${selectedYear.year}`,
    };
  }, [selectedBrand, selectedModel, selectedYear]);

  // Carregar marcas
  const loadBrands = useCallback(async () => {
    setIsLoadingBrands(true);
    setError(null);

    try {
      const result = await invoke<VehicleBrand[]>('get_vehicle_brands');
      setBrands(result);
    } catch (err) {
      console.error('Erro ao carregar marcas:', err);
      setError('Não foi possível carregar as marcas de veículos');
    } finally {
      setIsLoadingBrands(false);
    }
  }, []);

  // Selecionar marca e carregar modelos
  const selectBrand = useCallback(
    async (brandId: string | null) => {
      // Reset seleções dependentes
      setSelectedModel(null);
      setSelectedYear(null);
      setModels([]);
      setYears([]);

      if (!brandId) {
        setSelectedBrand(null);
        return;
      }

      const brand = brands.find((b) => b.id === brandId) || null;
      setSelectedBrand(brand);

      if (!brand) return;

      // Carregar modelos da marca
      setIsLoadingModels(true);
      setError(null);

      try {
        const result = await invoke<VehicleModel[]>('get_vehicle_models', { brandId });
        setModels(result);
      } catch (err) {
        console.error('Erro ao carregar modelos:', err);
        setError('Não foi possível carregar os modelos');
      } finally {
        setIsLoadingModels(false);
      }
    },
    [brands]
  );

  // Selecionar modelo e carregar anos
  const selectModel = useCallback(
    async (modelId: string | null) => {
      // Reset seleção dependente
      setSelectedYear(null);
      setYears([]);

      if (!modelId) {
        setSelectedModel(null);
        return;
      }

      const model = models.find((m) => m.id === modelId) || null;
      setSelectedModel(model);

      if (!model) return;

      // Carregar anos do modelo
      setIsLoadingYears(true);
      setError(null);

      try {
        const result = await invoke<VehicleYear[]>('get_vehicle_years', { modelId });
        setYears(result);
      } catch (err) {
        console.error('Erro ao carregar anos:', err);
        setError('Não foi possível carregar os anos');
      } finally {
        setIsLoadingYears(false);
      }
    },
    [models]
  );

  // Selecionar ano
  const selectYear = useCallback(
    (yearId: string | null) => {
      if (!yearId) {
        setSelectedYear(null);
        return;
      }

      const year = years.find((y) => y.id === yearId) || null;
      setSelectedYear(year);
    },
    [years]
  );

  // Reset completo
  const reset = useCallback(() => {
    setSelectedBrand(null);
    setSelectedModel(null);
    setSelectedYear(null);
    setModels([]);
    setYears([]);
    setError(null);
  }, []);

  // Busca de veículos por texto
  const searchVehicles = useCallback(async (query: string): Promise<VehicleComplete[]> => {
    if (!query || query.length < 2) {
      return [];
    }

    try {
      const result = await invoke<VehicleComplete[]>('search_vehicles', { query });
      return result;
    } catch (err) {
      console.error('Erro ao buscar veículos:', err);
      return [];
    }
  }, []);

  // Auto-load brands
  useEffect(() => {
    if (autoLoadBrands && brands.length === 0) {
      void loadBrands();
    }
  }, [autoLoadBrands, loadBrands, brands.length]);

  return {
    // Dados
    brands,
    models,
    years,

    // Seleção
    selectedBrand,
    selectedModel,
    selectedYear,
    selectedVehicle,

    // Estados
    isLoadingBrands,
    isLoadingModels,
    isLoadingYears,
    error,

    // Ações
    loadBrands,
    selectBrand,
    selectModel,
    selectYear,
    reset,
    searchVehicles,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK: useProductCompatibility
// ═══════════════════════════════════════════════════════════════════════════
// Gerencia compatibilidade entre produtos (peças) e veículos
// ═══════════════════════════════════════════════════════════════════════════

interface ProductCompatibilityItem {
  vehicleYearId: string;
  vehicle: VehicleComplete;
  notes?: string;
  position?: string;
}

interface UseProductCompatibilityReturn {
  // Dados
  compatibilities: ProductCompatibilityItem[];

  // Pendências
  pendingChanges: number;
  hasChanges: boolean;

  // Estados
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Ações
  loadCompatibilities: () => Promise<ProductCompatibilityItem[]>;
  addCompatibility: (vehicle: VehicleComplete, notes?: string, position?: string) => void;
  addMultipleCompatibilities: (vehicles: VehicleComplete[], notes?: string) => void;
  removeCompatibility: (vehicleYearId: string) => void;
  saveChanges: () => Promise<ProductCompatibilityItem[] | null>;
  clearAll: () => void;
}

export function useProductCompatibility(productId: string): UseProductCompatibilityReturn {
  const [compatibilities, setCompatibilities] = useState<ProductCompatibilityItem[]>([]);
  const [originalCompatibilities, setOriginalCompatibilities] = useState<
    ProductCompatibilityItem[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar compatibilidades existentes de um produto
  const loadCompatibilities = useCallback(async (): Promise<ProductCompatibilityItem[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await invoke<ProductCompatibilityItem[]>('get_product_compatibilities', {
        productId,
      });
      setCompatibilities(result);
      setOriginalCompatibilities(result);
      return result;
    } catch (err) {
      console.error('Erro ao carregar compatibilidades:', err);
      setError('Não foi possível carregar as compatibilidades');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  // Adicionar uma compatibilidade (local)
  const addCompatibility = useCallback(
    (vehicle: VehicleComplete, notes?: string, position?: string) => {
      setCompatibilities((prev) => {
        // Evitar duplicatas
        if (prev.some((c) => c.vehicleYearId === vehicle.yearId)) {
          return prev;
        }

        return [
          ...prev,
          {
            vehicleYearId: vehicle.yearId,
            vehicle,
            notes,
            position,
          },
        ];
      });
    },
    []
  );

  // Adicionar múltiplas compatibilidades (para seleção de range de anos)
  const addMultipleCompatibilities = useCallback((vehicles: VehicleComplete[], notes?: string) => {
    setCompatibilities((prev) => {
      const existingIds = new Set(prev.map((c) => c.vehicleYearId));
      const newItems = vehicles
        .filter((v) => !existingIds.has(v.yearId))
        .map((v) => ({
          vehicleYearId: v.yearId,
          vehicle: v,
          notes,
        }));

      return [...prev, ...newItems];
    });
  }, []);

  // Remover compatibilidade
  const removeCompatibility = useCallback((vehicleYearId: string) => {
    setCompatibilities((prev) => prev.filter((c) => c.vehicleYearId !== vehicleYearId));
  }, []);

  // Salvar compatibilidades no banco
  const saveChanges = useCallback(async (): Promise<ProductCompatibilityItem[] | null> => {
    if (!productId) return null;
    setIsSaving(true);
    setError(null);

    try {
      await invoke('save_product_compatibilities', {
        productId,
        compatibilities: compatibilities.map((c) => ({
          vehicleYearId: c.vehicleYearId,
          notes: c.notes,
          position: c.position,
        })),
      });

      const reloaded = await loadCompatibilities();
      return reloaded;
    } catch (err) {
      console.error('Erro ao salvar compatibilidades:', err);
      setError('Não foi possível salvar as compatibilidades');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [compatibilities, loadCompatibilities, productId]);

  const pendingChanges = useMemo(() => {
    const originalIds = new Set(originalCompatibilities.map((c) => c.vehicleYearId));
    const currentIds = new Set(compatibilities.map((c) => c.vehicleYearId));

    let additions = 0;
    for (const id of currentIds) {
      if (!originalIds.has(id)) additions += 1;
    }

    let removals = 0;
    for (const id of originalIds) {
      if (!currentIds.has(id)) removals += 1;
    }

    return additions + removals;
  }, [compatibilities, originalCompatibilities]);

  const hasChanges = pendingChanges > 0;

  useEffect(() => {
    void loadCompatibilities();
  }, [loadCompatibilities]);

  // Limpar todas
  const clearAll = useCallback(() => {
    setCompatibilities([]);
    setError(null);
  }, []);

  return {
    compatibilities,
    pendingChanges,
    hasChanges,
    isLoading,
    isSaving,
    error,
    loadCompatibilities,
    addCompatibility,
    addMultipleCompatibilities,
    removeCompatibility,
    saveChanges,
    clearAll,
  };
}
