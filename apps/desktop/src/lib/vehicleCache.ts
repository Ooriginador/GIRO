/**
 * 🗄️ Vehicle Cache Utility - Smart Caching
 *
 * Cache local inteligente para dados de veículos (marcas, modelos, anos).
 * Usa localStorage com TTL de 7 dias e sincronização incremental.
 *
 * Estratégia:
 * - Cache dura 7 dias (dados FIPE são atualizados mensalmente)
 * - Sincronização em background verifica atualizações
 * - Apenas dados alterados são baixados novamente
 * - Metadados de versão para controle de atualizações
 */

import { VehicleBrand, VehicleComplete, VehicleModel, VehicleYear } from '@/types/motoparts';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

const CACHE_PREFIX = 'giro_vehicle_cache_';
const META_KEY = 'giro_vehicle_cache_meta';

// TTL de 7 dias para todos os dados (FIPE é atualizado mensalmente)
const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 dias em ms

// TTL para resultados de busca (mais curto pois são dinâmicos)
const SEARCH_TTL = 24 * 60 * 60 * 1000; // 24 horas

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  version?: string;
}

interface CacheMeta {
  lastFullSync: number;
  lastIncrementalSync: number;
  brandsVersion: string;
  modelsVersions: Record<string, string>; // brandId -> version
  yearsVersions: Record<string, string>; // modelId -> version
  totalEntries: number;
}

type CacheKey = 'brands' | `models_${string}` | `years_${string}` | `search_${string}`;

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════

function getFullKey(key: CacheKey): string {
  return `${CACHE_PREFIX}${key}`;
}

function isExpired<T>(entry: CacheEntry<T>): boolean {
  return Date.now() > entry.expiresAt;
}

function generateVersion(): string {
  return Date.now().toString(36);
}

// ═══════════════════════════════════════════════════════════════════════════
// METADADOS DO CACHE
// ═══════════════════════════════════════════════════════════════════════════

function getDefaultMeta(): CacheMeta {
  return {
    lastFullSync: 0,
    lastIncrementalSync: 0,
    brandsVersion: '',
    modelsVersions: {},
    yearsVersions: {},
    totalEntries: 0,
  };
}

export function getCacheMeta(): CacheMeta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return getDefaultMeta();
    return JSON.parse(raw) as CacheMeta;
  } catch {
    return getDefaultMeta();
  }
}

function saveCacheMeta(meta: CacheMeta): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // Silenciado em produção
  }
}

function updateMetaVersion(type: 'brands' | 'models' | 'years', id?: string): void {
  const meta = getCacheMeta();
  const version = generateVersion();

  if (type === 'brands') {
    meta.brandsVersion = version;
  } else if (type === 'models' && id) {
    meta.modelsVersions[id] = version;
  } else if (type === 'years' && id) {
    meta.yearsVersions[id] = version;
  }

  meta.lastIncrementalSync = Date.now();
  saveCacheMeta(meta);
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
  } catch {
    // Silenciado em produção
    return null;
  }
}

function setInCache<T>(key: CacheKey, data: T, ttl: number = DEFAULT_TTL): void {
  try {
    const fullKey = getFullKey(key);
    const now = Date.now();

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttl,
      version: generateVersion(),
    };

    localStorage.setItem(fullKey, JSON.stringify(entry));

    // Atualizar contagem de entradas
    const meta = getCacheMeta();
    meta.totalEntries = countCacheEntries();
    saveCacheMeta(meta);
  } catch {
    // Silenciado em produção
  }
}

export function removeFromCache(key: CacheKey): void {
  try {
    localStorage.removeItem(getFullKey(key));
  } catch {
    // Silenciado em produção
  }
}

function countCacheEntries(): number {
  let count = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) count++;
  }
  return count;
}

// ═══════════════════════════════════════════════════════════════════════════
// API PÚBLICA - MARCAS
// ═══════════════════════════════════════════════════════════════════════════

export function getCachedBrands(): VehicleBrand[] | null {
  return getFromCache<VehicleBrand[]>('brands');
}

export function setCachedBrands(brands: VehicleBrand[]): void {
  setInCache('brands', brands, DEFAULT_TTL);
  updateMetaVersion('brands');
}

// ═══════════════════════════════════════════════════════════════════════════
// API PÚBLICA - MODELOS
// ═══════════════════════════════════════════════════════════════════════════

export function getCachedModels(brandId: string): VehicleModel[] | null {
  return getFromCache<VehicleModel[]>(`models_${brandId}`);
}

export function setCachedModels(brandId: string, models: VehicleModel[]): void {
  setInCache(`models_${brandId}`, models, DEFAULT_TTL);
  updateMetaVersion('models', brandId);
}

// ═══════════════════════════════════════════════════════════════════════════
// API PÚBLICA - ANOS
// ═══════════════════════════════════════════════════════════════════════════

export function getCachedYears(modelId: string): VehicleYear[] | null {
  return getFromCache<VehicleYear[]>(`years_${modelId}`);
}

export function setCachedYears(modelId: string, years: VehicleYear[]): void {
  setInCache(`years_${modelId}`, years, DEFAULT_TTL);
  updateMetaVersion('years', modelId);
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
  setInCache(`search_${normalized}`, results, SEARCH_TTL);
}

// ═══════════════════════════════════════════════════════════════════════════
// VERIFICAÇÃO DE ATUALIZAÇÕES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verifica se o cache precisa ser atualizado (mais de 7 dias)
 */
export function needsSync(): boolean {
  const meta = getCacheMeta();
  const daysSinceSync = (Date.now() - meta.lastFullSync) / (24 * 60 * 60 * 1000);
  return daysSinceSync >= 7;
}

/**
 * Verifica se uma marca específica precisa ser atualizada
 */
export function needsBrandModelsUpdate(brandId: string): boolean {
  const meta = getCacheMeta();
  const version = meta.modelsVersions[brandId];
  if (!version) return true;

  // Verificar se tem mais de 7 dias
  const timestamp = parseInt(version, 36);
  const daysSince = (Date.now() - timestamp) / (24 * 60 * 60 * 1000);
  return daysSince >= 7;
}

/**
 * Verifica se um modelo específico precisa ter anos atualizados
 */
export function needsModelYearsUpdate(modelId: string): boolean {
  const meta = getCacheMeta();
  const version = meta.yearsVersions[modelId];
  if (!version) return true;

  const timestamp = parseInt(version, 36);
  const daysSince = (Date.now() - timestamp) / (24 * 60 * 60 * 1000);
  return daysSince >= 7;
}

/**
 * Registra uma sincronização completa
 */
export function markFullSyncComplete(): void {
  const meta = getCacheMeta();
  meta.lastFullSync = Date.now();
  meta.lastIncrementalSync = Date.now();
  saveCacheMeta(meta);
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
      if (key?.startsWith(CACHE_PREFIX) || key === META_KEY) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
    // Log removido para produção - use getCacheStats() para debug
  } catch {
    // Silenciado em produção
  }
}

/**
 * Limpa apenas resultados de busca (mantém marcas/modelos/anos)
 */
export function clearSearchCache(): void {
  try {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`${CACHE_PREFIX}search_`)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
    // Log removido para produção
  } catch {
    // Silenciado em produção
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

    if (cleaned > 0) {
      // Log removido para produção
    }
  } catch {
    // Silenciado em produção
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
  lastFullSync: Date | null;
  daysSinceSync: number;
  needsSync: boolean;
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

  const meta = getCacheMeta();
  const daysSinceSyncCalc = meta.lastFullSync
    ? (Date.now() - meta.lastFullSync) / (24 * 60 * 60 * 1000)
    : -1;

  return {
    totalEntries,
    totalSizeKB: Math.round(totalSize / 1024),
    brands: hasBrands,
    modelsCount,
    yearsCount,
    searchCount,
    lastFullSync: meta.lastFullSync ? new Date(meta.lastFullSync) : null,
    daysSinceSync: Math.round(daysSinceSyncCalc * 10) / 10,
    needsSync: needsSync(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// INICIALIZAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

// Limpar cache expirado na inicialização (após 2 segundos)
if (typeof window !== 'undefined') {
  setTimeout(() => {
    cleanExpiredCache();
    // Logs removidos para produção - use getCacheStats() para debug
  }, 2000);
}
