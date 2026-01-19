/**
 * 🗄️ Vehicle Cache Utility
 *
 * Cache local para dados de veículos (marcas, modelos, anos).
 * Usa localStorage com TTL para evitar chamadas repetidas ao backend.
 *
 * Estratégia:
 * - Marcas: cache por 24 horas (raramente mudam)
 * - Modelos por marca: cache por 12 horas
 * - Anos por modelo: cache por 12 horas
 * - Resultados de busca: cache por 1 hora
 */

import { VehicleBrand, VehicleComplete, VehicleModel, VehicleYear } from '@/types/motoparts';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

const CACHE_PREFIX = 'giro_vehicle_cache_';

// TTL em milissegundos
const TTL = {
  brands: 24 * 60 * 60 * 1000, // 24 horas
  models: 12 * 60 * 60 * 1000, // 12 horas
  years: 12 * 60 * 60 * 1000, // 12 horas
  search: 1 * 60 * 60 * 1000, // 1 hora
};

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

type CacheKey =
  | 'brands'
  | `models_${string}`
  | `years_${string}`
  | `search_${string}`;

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════

function getFullKey(key: CacheKey): string {
  return `${CACHE_PREFIX}${key}`;
}

function isExpired<T>(entry: CacheEntry<T>): boolean {
  return Date.now() > entry.expiresAt;
}

// ═══════════════════════════════════════════════════════════════════════════
// OPERAÇÕES GENÉRICAS
// ═══════════════════════════════════════════════════════════════════════════

function getFromCache<T>(key: CacheKey): T | null {
  try {
    const fullKey = getFullKey(key);
    const raw = localStorage.getItem(fullKey);

    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);

    if (isExpired(entry)) {
      localStorage.removeItem(fullKey);
      return null;
    }

    return entry.data;
  } catch (err) {
    console.warn('[VehicleCache] Erro ao ler cache:', err);
    return null;
  }
}

function setInCache<T>(key: CacheKey, data: T, ttl: number): void {
  try {
    const fullKey = getFullKey(key);
    const now = Date.now();

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    };

    localStorage.setItem(fullKey, JSON.stringify(entry));
  } catch (err) {
    console.warn('[VehicleCache] Erro ao salvar cache:', err);
  }
}

export function removeFromCache(key: CacheKey): void {
  try {
    localStorage.removeItem(getFullKey(key));
  } catch (err) {
    console.warn('[VehicleCache] Erro ao remover cache:', err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// API PÚBLICA - MARCAS
// ═══════════════════════════════════════════════════════════════════════════

export function getCachedBrands(): VehicleBrand[] | null {
  return getFromCache<VehicleBrand[]>('brands');
}

export function setCachedBrands(brands: VehicleBrand[]): void {
  setInCache('brands', brands, TTL.brands);
}

// ═══════════════════════════════════════════════════════════════════════════
// API PÚBLICA - MODELOS
// ═══════════════════════════════════════════════════════════════════════════

export function getCachedModels(brandId: string): VehicleModel[] | null {
  return getFromCache<VehicleModel[]>(`models_${brandId}`);
}

export function setCachedModels(brandId: string, models: VehicleModel[]): void {
  setInCache(`models_${brandId}`, models, TTL.models);
}

// ═══════════════════════════════════════════════════════════════════════════
// API PÚBLICA - ANOS
// ═══════════════════════════════════════════════════════════════════════════

export function getCachedYears(modelId: string): VehicleYear[] | null {
  return getFromCache<VehicleYear[]>(`years_${modelId}`);
}

export function setCachedYears(modelId: string, years: VehicleYear[]): void {
  setInCache(`years_${modelId}`, years, TTL.years);
}

// ═══════════════════════════════════════════════════════════════════════════
// API PÚBLICA - BUSCA
// ═══════════════════════════════════════════════════════════════════════════

function normalizeQuery(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, '_');
}

export function getCachedSearch(query: string): VehicleComplete[] | null {
  const normalized = normalizeQuery(query);
  return getFromCache<VehicleComplete[]>(`search_${normalized}`);
}

export function setCachedSearch(query: string, results: VehicleComplete[]): void {
  const normalized = normalizeQuery(query);
  setInCache(`search_${normalized}`, results, TTL.search);
}

// ═══════════════════════════════════════════════════════════════════════════
// GERENCIAMENTO DE CACHE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Limpa todo o cache de veículos
 */
export function clearVehicleCache(): void {
  try {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
    console.log(`[VehicleCache] Cache limpo: ${keysToRemove.length} entradas removidas`);
  } catch (err) {
    console.warn('[VehicleCache] Erro ao limpar cache:', err);
  }
}

/**
 * Limpa entradas expiradas do cache
 */
export function cleanExpiredCache(): number {
  let cleaned = 0;

  try {
    const keysToCheck: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        keysToCheck.push(key);
      }
    }

    for (const key of keysToCheck) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      try {
        const entry = JSON.parse(raw) as CacheEntry<unknown>;
        if (isExpired(entry)) {
          localStorage.removeItem(key);
          cleaned++;
        }
      } catch {
        // Entrada corrompida, remover
        localStorage.removeItem(key);
        cleaned++;
      }
    }
  } catch (err) {
    console.warn('[VehicleCache] Erro ao limpar cache expirado:', err);
  }

  return cleaned;
}

/**
 * Retorna estatísticas do cache
 */
export function getCacheStats(): {
  totalEntries: number;
  totalSizeKB: number;
  brands: boolean;
  modelsCount: number;
  yearsCount: number;
  searchCount: number;
} {
  let totalEntries = 0;
  let totalSize = 0;
  let hasBrands = false;
  let modelsCount = 0;
  let yearsCount = 0;
  let searchCount = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(CACHE_PREFIX)) continue;

    totalEntries++;
    const value = localStorage.getItem(key);
    if (value) {
      totalSize += value.length * 2; // Aproximação em bytes (UTF-16)
    }

    const suffix = key.replace(CACHE_PREFIX, '');
    if (suffix === 'brands') hasBrands = true;
    else if (suffix.startsWith('models_')) modelsCount++;
    else if (suffix.startsWith('years_')) yearsCount++;
    else if (suffix.startsWith('search_')) searchCount++;
  }

  return {
    totalEntries,
    totalSizeKB: Math.round(totalSize / 1024),
    brands: hasBrands,
    modelsCount,
    yearsCount,
    searchCount,
  };
}

// Limpar cache expirado na inicialização
if (typeof window !== 'undefined') {
  setTimeout(() => cleanExpiredCache(), 1000);
}
