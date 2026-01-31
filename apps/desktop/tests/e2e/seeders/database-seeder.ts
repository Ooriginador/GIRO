/**
 * Database Seeder for E2E Tests
 * Seeds test data into localStorage (mock database)
 */

import { Page } from '@playwright/test';
import { productFixtures, categoryFixtures } from '../fixtures/products.fixture';
import { employeeFixtures } from '../fixtures/employees.fixture';
import {
  contractFixtures,
  workFrontFixtures,
  materialFixtures,
} from '../fixtures/contracts.fixture';

export interface SeedOptions {
  products?: boolean;
  employees?: boolean;
  contracts?: boolean;
  materials?: boolean;
  clearExisting?: boolean;
}

/**
 * Seeds test data into the application's localStorage mock database
 */
export async function seedDatabase(page: Page, options: SeedOptions = {}) {
  const {
    products = false,
    employees = false,
    contracts = false,
    materials = false,
    clearExisting = true,
  } = options;

  // Get current mock DB state
  const currentDb = await page.evaluate(() => {
    const dbStr = localStorage.getItem('__giro_web_mock_db__');
    return dbStr ? JSON.parse(dbStr) : {};
  });

  // Clear existing data if requested
  if (clearExisting) {
    currentDb.products = [];
    currentDb.categories = [];
    currentDb.employees = employeeFixtures; // Always keep employees for auth
    currentDb.contracts = [];
    currentDb.workFronts = [];
    currentDb.materials = [];
    currentDb.stockMovements = [];
    currentDb.materialRequests = [];
    currentDb.stockTransfers = [];
    currentDb.inventoryCounts = [];
  }

  // Seed products
  if (products) {
    currentDb.products = [...(currentDb.products || []), ...productFixtures];
    currentDb.categories = [...(currentDb.categories || []), ...categoryFixtures];
  }

  // Seed employees
  if (employees) {
    currentDb.employees = [...(currentDb.employees || []), ...employeeFixtures];
  }

  // Seed contracts
  if (contracts) {
    currentDb.contracts = [...(currentDb.contracts || []), ...contractFixtures];
    currentDb.workFronts = [...(currentDb.workFronts || []), ...workFrontFixtures];
  }

  // Seed materials
  if (materials) {
    currentDb.materials = [...(currentDb.materials || []), ...materialFixtures];
  }

  // Save updated DB
  await page.evaluate((db) => {
    localStorage.setItem('__giro_web_mock_db__', JSON.stringify(db));
  }, currentDb);
}

/**
 * Seeds all test data
 */
export async function seedAll(page: Page) {
  await seedDatabase(page, {
    products: true,
    employees: true,
    contracts: true,
    materials: true,
    clearExisting: true,
  });
}

/**
 * Clears all test data
 */
export async function clearDatabase(page: Page) {
  await page.evaluate(() => {
    const minimalDb = {
      employees: [
        {
          id: 'seed-admin',
          name: 'Administrador Semente',
          role: 'ADMIN',
          pin: '8899',
          isActive: true,
        },
      ],
      products: [],
      categories: [],
      contracts: [],
      workFronts: [],
      materials: [],
      stockMovements: [],
      materialRequests: [],
      stockTransfers: [],
      inventoryCounts: [],
      currentCashSession: null,
      cashSessionHistory: [],
    };
    localStorage.setItem('__giro_web_mock_db__', JSON.stringify(minimalDb));
  });
}

/**
 * Seeds products only (for sale/stock tests)
 */
export async function seedProducts(page: Page) {
  await seedDatabase(page, {
    products: true,
    clearExisting: false,
  });
}

/**
 * Seeds enterprise data (contracts, materials, work fronts)
 */
export async function seedEnterpriseData(page: Page) {
  await seedDatabase(page, {
    contracts: true,
    materials: true,
    clearExisting: false,
  });
}

/**
 * Gets current database state
 */
export async function getDatabaseState(page: Page): Promise<any> {
  return await page.evaluate(() => {
    const dbStr = localStorage.getItem('__giro_web_mock_db__');
    return dbStr ? JSON.parse(dbStr) : null;
  });
}

/**
 * Adds a single product to the database
 */
export async function addProduct(page: Page, product: any) {
  await page.evaluate((prod) => {
    const dbStr = localStorage.getItem('__giro_web_mock_db__');
    const db = dbStr ? JSON.parse(dbStr) : { products: [] };
    db.products = db.products || [];
    db.products.push(prod);
    localStorage.setItem('__giro_web_mock_db__', JSON.stringify(db));
  }, product);
}

/**
 * Adds a single contract to the database
 */
export async function addContract(page: Page, contract: any) {
  await page.evaluate((cont) => {
    const dbStr = localStorage.getItem('__giro_web_mock_db__');
    const db = dbStr ? JSON.parse(dbStr) : { contracts: [] };
    db.contracts = db.contracts || [];
    db.contracts.push(cont);
    localStorage.setItem('__giro_web_mock_db__', JSON.stringify(db));
  }, contract);
}
