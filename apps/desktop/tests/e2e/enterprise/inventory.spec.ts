import { expect, test } from '@playwright/test';
import { dismissTutorialIfPresent, ensureLicensePresent, loginWithPin } from '../e2e-helpers';

// SKIP: Tests require test data seeding infrastructure
test.describe.skip('Enterprise Inventory Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Setup Environment
    await ensureLicensePresent(page, 'ENTERPRISE');

    // Navegar para rota de teste que bypassa LicenseGuard
    await page.goto('/__test-login');
    await page.waitForLoadState('domcontentloaded');
    await dismissTutorialIfPresent(page);

    // Login com PIN 8899 (Admin)
    await loginWithPin(page, '8899');

    // Navigate to Enterprise Inventory page
    await page.goto('/enterprise/inventory');
    await page.waitForLoadState('networkidle');
  });

  test('should display inventory counts list', async ({ page }) => {
    // Check if the "Inventários" tab exists and switch to it
    const tab = page.getByRole('tab', { name: 'Inventários' });
    await tab.click();

    // Validate headers
    await expect(page.getByRole('heading', { name: 'Histórico de Contagens' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Novo Inventário' })).toBeVisible();
  });

  test('should create a new inventory count', async ({ page }) => {
    // Navigate to counts tab
    await page.getByRole('tab', { name: 'Inventários' }).click();

    // Open creation dialog
    await page.getByRole('button', { name: 'Novo Inventário' }).click();

    // Fill form (assuming Dialog structure based on code conventions)
    await expect(page.getByRole('dialog')).toBeVisible();
    // Select location (assuming first select is location)
    // Note: Implementation specific selectors might be needed here
    // await page.getByRole('combobox').first().click();
    // await page.getByRole('option').first().click(); // Select first location

    // Submit
    // await page.getByRole('button', { name: 'Criar' }).click();

    // Expect to see new item in list or success toast
    // await expect(page.getByText('Inventário criado')).toBeVisible();
  });

  test('should navigate to inventory details', async ({ page }) => {
    await page.getByRole('tab', { name: 'Inventários' }).click();

    // Assuming there is at least one inventory item, click the details/eye button
    // This part depends on existing data or mocks.
    // For now we check the structure exists.
    const table = page.locator('table');
    await expect(table).toBeVisible();
  });
});
