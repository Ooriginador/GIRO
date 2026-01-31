/**
 * @file seeding-test.spec.ts - Teste isolado de seeding
 * Valida que o seeding de dados está funcionando
 */

import { expect, test } from '@playwright/test';
import { seedProductData } from './e2e-helpers';

test.describe('Seeding Validation', () => {
  test('should seed product data into localStorage', async ({ page }) => {
    // Navigate to app
    await page.goto('/__test-login');
    await page.waitForLoadState('domcontentloaded');

    // Seed products
    await seedProductData(page);

    // Verify seeding worked
    const dbState = await page.evaluate(() => {
      const dbStr = localStorage.getItem('__giro_web_mock_db__');
      return dbStr ? JSON.parse(dbStr) : null;
    });

    expect(dbState).not.toBeNull();
    expect(dbState.products).toBeDefined();
    expect(dbState.products.length).toBeGreaterThan(0);
    expect(dbState.categories).toBeDefined();
    expect(dbState.categories.length).toBeGreaterThan(0);

    console.log(`✓ Seeded ${dbState.products.length} products`);
    console.log(`✓ Seeded ${dbState.categories.length} categories`);
  });
});
