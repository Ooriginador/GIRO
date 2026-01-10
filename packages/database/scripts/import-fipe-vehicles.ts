#!/usr/bin/env npx ts-node
// ═══════════════════════════════════════════════════════════════════════════
// Script de Importação de Veículos - API FIPE
// ═══════════════════════════════════════════════════════════════════════════
// Importa marcas, modelos e anos de motos da tabela FIPE para o banco local
//
// Uso:
//   npx ts-node scripts/import-fipe-vehicles.ts
//   npx ts-node scripts/import-fipe-vehicles.ts --brand="Honda"
//   npx ts-node scripts/import-fipe-vehicles.ts --dry-run
// ═══════════════════════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';
import axios, { AxiosError } from 'axios';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

const FIPE_API_BASE = 'https://parallelum.com.br/fipe/api/v1';
const BRASIL_API_BASE = 'https://brasilapi.com.br/api/fipe';

// Rate limiting (para não sobrecarregar a API)
const DELAY_BETWEEN_BRANDS = 1000; // 1 segundo entre marcas
const DELAY_BETWEEN_MODELS = 200; // 200ms entre modelos
const DELAY_BETWEEN_YEARS = 100; // 100ms entre anos
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

interface FipeBrand {
  codigo: string;
  nome: string;
}

interface FipeModel {
  codigo: number;
  nome: string;
}

interface FipeModelResponse {
  modelos: FipeModel[];
  anos: FipeYear[];
}

interface FipeYear {
  codigo: string;
  nome: string;
}

interface FipePrice {
  TipoVeiculo: number;
  Valor: string;
  Marca: string;
  Modelo: string;
  AnoModelo: number;
  Combustivel: string;
  CodigoFipe: string;
  MesReferencia: string;
  SiglaCombustivel: string;
}

interface ImportOptions {
  dryRun: boolean;
  specificBrand?: string;
  verbose: boolean;
  useBackupApi: boolean;
}

interface ImportStats {
  brands: { imported: number; skipped: number; errors: number };
  models: { imported: number; skipped: number; errors: number };
  years: { imported: number; skipped: number; errors: number };
  startTime: Date;
  endTime?: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// PRISMA CLIENT
// ═══════════════════════════════════════════════════════════════════════════

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════════════════
// UTILITÁRIOS
// ═══════════════════════════════════════════════════════════════════════════

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
  const prefix = {
    info: '📋',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  }[type];
  console.log(`${prefix} ${message}`);
}

function extractEngineSize(modelName: string): number | null {
  // Extrai cilindrada do nome (ex: "CG 160 Titan" -> 160)
  const match = modelName.match(/\b(\d{2,4})\b/);
  if (match) {
    const size = parseInt(match[1], 10);
    // Validar faixa razoável de cilindrada
    if (size >= 50 && size <= 2000) {
      return size;
    }
  }
  return null;
}

function determineCategory(modelName: string): string {
  const name = modelName.toUpperCase();

  if (
    name.includes('SCOOTER') ||
    name.includes('PCX') ||
    name.includes('BIZ') ||
    name.includes('NMAX') ||
    name.includes('BURGMAN') ||
    name.includes('LEAD')
  ) {
    return 'SCOOTER';
  }
  if (
    name.includes('TRAIL') ||
    name.includes('XRE') ||
    name.includes('LANDER') ||
    name.includes('CROSSER') ||
    name.includes('TENERE')
  ) {
    return 'TRAIL';
  }
  if (
    name.includes('CBR') ||
    name.includes('NINJA') ||
    name.includes('GSX-R') ||
    name.includes('R1') ||
    name.includes('R6') ||
    name.includes('SPORT')
  ) {
    return 'SPORT';
  }
  if (
    name.includes('CRF') ||
    name.includes('XTZ') ||
    name.includes('KX') ||
    name.includes('OFF') ||
    name.includes('MOTOCROSS')
  ) {
    return 'OFFROAD';
  }
  if (
    name.includes('SHADOW') ||
    name.includes('BOULEVARD') ||
    name.includes('CUSTOM') ||
    name.includes('DRAG') ||
    name.includes('VIRAGO') ||
    name.includes('INTRUDER')
  ) {
    return 'CUSTOM';
  }
  if (name.includes('GOLDWING') || name.includes('TOURING') || name.includes('PAN')) {
    return 'TOURING';
  }
  if (
    name.includes('AFRICA') ||
    name.includes('ADVENTURE') ||
    name.includes('GS') ||
    name.includes('VERSYS') ||
    name.includes('TIGER')
  ) {
    return 'ADVENTURE';
  }
  if (name.includes('CARGO') || name.includes('POP') || name.includes('CRYPTON')) {
    return 'UTILITY';
  }

  return 'STREET';
}

function determineFuelType(yearName: string): 'GASOLINE' | 'FLEX' | 'ELECTRIC' | 'DIESEL' {
  const name = yearName.toUpperCase();

  if (name.includes('FLEX') || name.includes('ÁLCOOL')) {
    return 'FLEX';
  }
  if (name.includes('ELÉTRIC') || name.includes('ELECTRIC')) {
    return 'ELECTRIC';
  }
  if (name.includes('DIESEL')) {
    return 'DIESEL';
  }

  return 'GASOLINE';
}

function extractYear(yearCode: string): number {
  // yearCode pode ser "2020-1" ou "32000-1" (zero km)
  const yearPart = yearCode.split('-')[0];
  const year = parseInt(yearPart, 10);

  // 32000 significa "Zero KM" - retornar ano atual
  if (year === 32000) {
    return new Date().getFullYear();
  }

  return year;
}

// ═══════════════════════════════════════════════════════════════════════════
// API CALLS
// ═══════════════════════════════════════════════════════════════════════════

async function fetchWithRetry<T>(url: string, retries = MAX_RETRIES): Promise<T | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get<T>(url, {
        timeout: 10000,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'GIRO-System/1.0',
        },
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;

      if (attempt === retries) {
        log(`Falha após ${retries} tentativas: ${url}`, 'error');
        return null;
      }

      // Se for rate limiting (429), esperar mais tempo
      if (axiosError.response?.status === 429) {
        log(`Rate limit atingido, aguardando ${RETRY_DELAY * 2}ms...`, 'warning');
        await sleep(RETRY_DELAY * 2);
      } else {
        await sleep(RETRY_DELAY);
      }
    }
  }

  return null;
}

async function fetchBrands(): Promise<FipeBrand[]> {
  log('Buscando marcas de motos...');

  const brands = await fetchWithRetry<FipeBrand[]>(`${FIPE_API_BASE}/motos/marcas`);

  if (!brands) {
    // Tentar API alternativa
    log('Tentando API alternativa (Brasil API)...', 'warning');
    const altBrands = await fetchWithRetry<FipeBrand[]>(`${BRASIL_API_BASE}/marcas/v1/motos`);
    return altBrands || [];
  }

  return brands;
}

async function fetchModels(brandCode: string): Promise<FipeModelResponse | null> {
  return await fetchWithRetry<FipeModelResponse>(
    `${FIPE_API_BASE}/motos/marcas/${brandCode}/modelos`
  );
}

async function fetchYears(brandCode: string, modelCode: number): Promise<FipeYear[]> {
  const years = await fetchWithRetry<FipeYear[]>(
    `${FIPE_API_BASE}/motos/marcas/${brandCode}/modelos/${modelCode}/anos`
  );
  return years || [];
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPORTAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

async function importBrand(
  brand: FipeBrand,
  options: ImportOptions,
  stats: ImportStats
): Promise<string | null> {
  const { dryRun, verbose } = options;

  try {
    // Verificar se já existe
    const existing = await prisma.vehicleBrand.findUnique({
      where: { fipeCode: brand.codigo },
    });

    if (existing) {
      if (verbose) log(`Marca já existe: ${brand.nome}`, 'info');
      stats.brands.skipped++;
      return existing.id;
    }

    if (dryRun) {
      log(`[DRY-RUN] Importaria marca: ${brand.nome}`, 'info');
      stats.brands.imported++;
      return `dry-run-${brand.codigo}`;
    }

    // Criar marca
    const created = await prisma.vehicleBrand.create({
      data: {
        fipeCode: brand.codigo,
        name: brand.nome,
        isActive: true,
      },
    });

    log(`Marca importada: ${brand.nome}`, 'success');
    stats.brands.imported++;
    return created.id;
  } catch (error) {
    log(`Erro ao importar marca ${brand.nome}: ${error}`, 'error');
    stats.brands.errors++;
    return null;
  }
}

async function importModel(
  model: FipeModel,
  brandId: string,
  brandCode: string,
  options: ImportOptions,
  stats: ImportStats
): Promise<string | null> {
  const { dryRun, verbose } = options;
  const fipeCode = `${brandCode}-${model.codigo}`;

  try {
    // Verificar se já existe
    const existing = await prisma.vehicleModel.findUnique({
      where: { fipeCode },
    });

    if (existing) {
      if (verbose) log(`Modelo já existe: ${model.nome}`, 'info');
      stats.models.skipped++;
      return existing.id;
    }

    if (dryRun) {
      if (verbose) log(`[DRY-RUN] Importaria modelo: ${model.nome}`, 'info');
      stats.models.imported++;
      return `dry-run-${fipeCode}`;
    }

    // Criar modelo
    const created = await prisma.vehicleModel.create({
      data: {
        fipeCode,
        name: model.nome,
        brandId,
        category: determineCategory(model.nome) as any,
        engineSize: extractEngineSize(model.nome),
        isActive: true,
      },
    });

    if (verbose) log(`Modelo importado: ${model.nome}`, 'success');
    stats.models.imported++;
    return created.id;
  } catch (error) {
    log(`Erro ao importar modelo ${model.nome}: ${error}`, 'error');
    stats.models.errors++;
    return null;
  }
}

async function importYear(
  year: FipeYear,
  modelId: string,
  options: ImportOptions,
  stats: ImportStats
): Promise<void> {
  const { dryRun, verbose } = options;
  const yearNumber = extractYear(year.codigo);
  const fuelType = determineFuelType(year.nome);

  try {
    // Verificar se já existe
    const existing = await prisma.vehicleYear.findFirst({
      where: {
        modelId,
        year: yearNumber,
        fuelType,
      },
    });

    if (existing) {
      stats.years.skipped++;
      return;
    }

    if (dryRun) {
      stats.years.imported++;
      return;
    }

    // Criar ano
    await prisma.vehicleYear.create({
      data: {
        year: yearNumber,
        yearLabel: year.nome,
        fipeCode: year.codigo,
        fuelType,
        modelId,
      },
    });

    stats.years.imported++;
  } catch (error) {
    if (verbose) log(`Erro ao importar ano ${year.nome}: ${error}`, 'error');
    stats.years.errors++;
  }
}

async function runImport(options: ImportOptions): Promise<void> {
  const stats: ImportStats = {
    brands: { imported: 0, skipped: 0, errors: 0 },
    models: { imported: 0, skipped: 0, errors: 0 },
    years: { imported: 0, skipped: 0, errors: 0 },
    startTime: new Date(),
  };

  log('═══════════════════════════════════════════════════════════════');
  log('    IMPORTAÇÃO DE VEÍCULOS - API FIPE                          ');
  log('═══════════════════════════════════════════════════════════════');
  log(`Modo: ${options.dryRun ? 'DRY-RUN (sem alterações)' : 'PRODUÇÃO'}`);
  if (options.specificBrand) {
    log(`Filtrando marca: ${options.specificBrand}`);
  }
  log('');

  // 1. Buscar marcas
  let brands = await fetchBrands();

  if (brands.length === 0) {
    log('Nenhuma marca encontrada!', 'error');
    return;
  }

  log(`Encontradas ${brands.length} marcas`);

  // Filtrar se especificado
  if (options.specificBrand) {
    brands = brands.filter((b) =>
      b.nome.toUpperCase().includes(options.specificBrand!.toUpperCase())
    );
    log(`Após filtro: ${brands.length} marcas`);
  }

  // 2. Processar cada marca
  for (const brand of brands) {
    log('');
    log(`━━━ Processando ${brand.nome} ━━━`);

    // Importar marca
    const brandId = await importBrand(brand, options, stats);
    if (!brandId) continue;

    // Buscar modelos
    const modelResponse = await fetchModels(brand.codigo);
    if (!modelResponse) {
      log(`Não foi possível buscar modelos de ${brand.nome}`, 'warning');
      continue;
    }

    log(`Encontrados ${modelResponse.modelos.length} modelos`);

    // Processar modelos
    for (const model of modelResponse.modelos) {
      const modelId = await importModel(model, brandId, brand.codigo, options, stats);
      if (!modelId) continue;

      // Buscar anos
      const years = await fetchYears(brand.codigo, model.codigo);

      // Importar anos
      for (const year of years) {
        await importYear(year, modelId, options, stats);
        await sleep(DELAY_BETWEEN_YEARS);
      }

      await sleep(DELAY_BETWEEN_MODELS);
    }

    await sleep(DELAY_BETWEEN_BRANDS);
  }

  // Estatísticas finais
  stats.endTime = new Date();
  const duration = (stats.endTime.getTime() - stats.startTime.getTime()) / 1000;

  log('');
  log('═══════════════════════════════════════════════════════════════');
  log('    RESULTADO DA IMPORTAÇÃO                                    ');
  log('═══════════════════════════════════════════════════════════════');
  log(`Duração: ${Math.round(duration)}s`);
  log('');
  log(
    `MARCAS:  ${stats.brands.imported} importadas, ${stats.brands.skipped} já existiam, ${stats.brands.errors} erros`
  );
  log(
    `MODELOS: ${stats.models.imported} importados, ${stats.models.skipped} já existiam, ${stats.models.errors} erros`
  );
  log(
    `ANOS:    ${stats.years.imported} importados, ${stats.years.skipped} já existiam, ${stats.years.errors} erros`
  );
  log('');

  if (options.dryRun) {
    log('⚠️  Modo DRY-RUN: nenhuma alteração foi feita no banco', 'warning');
  } else {
    log('Importação concluída!', 'success');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);

  const options: ImportOptions = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    useBackupApi: args.includes('--backup-api'),
    specificBrand: args.find((a) => a.startsWith('--brand='))?.split('=')[1],
  };

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Importação de Veículos - API FIPE

Uso:
  npx ts-node scripts/import-fipe-vehicles.ts [opções]

Opções:
  --dry-run       Simula a importação sem alterar o banco
  --brand=NOME    Importa apenas uma marca específica
  --verbose, -v   Mostra mais detalhes durante a importação
  --backup-api    Usa a Brasil API como fonte primária
  --help, -h      Mostra esta ajuda

Exemplos:
  npx ts-node scripts/import-fipe-vehicles.ts --dry-run
  npx ts-node scripts/import-fipe-vehicles.ts --brand="Honda"
  npx ts-node scripts/import-fipe-vehicles.ts --brand="Honda" --dry-run -v
    `);
    return;
  }

  try {
    await runImport(options);
  } catch (error) {
    log(`Erro fatal: ${error}`, 'error');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
