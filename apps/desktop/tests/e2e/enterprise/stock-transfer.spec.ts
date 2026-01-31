/**
 * E2E Tests - Stock Transfer Flow
 * Playwright tests for complete stock transfer workflow
 */

import { expect, test } from '@playwright/test';
import { dismissTutorialIfPresent, ensureLicensePresent, loginWithPin } from '../e2e-helpers';

// SKIP: Tests require test data seeding infrastructure
test.describe.skip('Stock Transfer E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Setup Environment
    await ensureLicensePresent(page, 'ENTERPRISE');

    // Navegar para rota de teste que bypassa LicenseGuard
    await page.goto('/__test-login');

    // 2. Force Business Profile
    await page.evaluate(() => {
      localStorage.setItem(
        'giro-business-profile',
        JSON.stringify({
          state: { businessType: 'ENTERPRISE', isConfigured: true },
          version: 0,
        })
      );
    });

    // 3. Seed Mock DB
    await page.evaluate(() => {
      const mockDb = {
        employees: [
          {
            id: 'admin-1',
            name: 'Admin',
            pin: '8899',
            role: 'ADMIN',
            isActive: true,
            createdAt: new Date().toISOString(),
          },
        ],
        contracts: [
          {
            id: 'cnt-001',
            code: 'OBRA-001',
            name: 'Obra Principal',
            status: 'ACTIVE',
            clientName: 'Cliente Teste',
            startDate: new Date().toISOString(),
            managerId: 'admin-1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        stockLocations: [
          {
            id: 'loc-001',
            name: 'Almoxarifado Central',
            locationType: 'CENTRAL',
            contractId: null,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'loc-002',
            name: 'Frente de Obra 1',
            locationType: 'PROJECT_SITE',
            contractId: 'cnt-001',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        stockTransfers: [],
        materialRequests: [],
        workFronts: [],
        currentCashSession: null,
        cashSessionHistory: [],
      };
      localStorage.setItem('__giro_web_mock_db__', JSON.stringify(mockDb));
    });

    // 4. Reload and Login
    await page.reload();
    await loginWithPin(page, '8899');

    // 5. Navigate to Enterprise Dashboard
    await page.goto('/enterprise');
    await dismissTutorialIfPresent(page);
    await expect(page.locator('[data-testid="enterprise-dashboard"]')).toBeVisible({
      timeout: 10000,
    });
  });

  test('should navigate to transfers page and see new transfer button', async ({ page }) => {
    // Go to transfers page via sidebar
    await page.click('[data-testid="nav-transfers"]');

    // Wait for the transfers page to load
    await page.waitForURL('**/enterprise/transfers');

    // Verify we're on the transfers page
    await expect(page.getByRole('heading', { name: /Transferências/i })).toBeVisible();

    // Verify new transfer button is visible
    await expect(page.locator('[data-testid="new-transfer-btn"]')).toBeVisible();
  });

  test('should open new transfer form when clicking new transfer button', async ({ page }) => {
    // Navigate directly to transfers page
    await page.goto('/enterprise/transfers');

    // Click new transfer button
    await page.locator('[data-testid="new-transfer-btn"]').click();

    // Wait for navigation to new transfer page
    await page.waitForURL('**/enterprise/transfers/new**');

    // Verify form is displayed
    await expect(page.getByRole('heading', { name: /Nova Transferência/i })).toBeVisible();
  });

  test('should show empty state when no transfers exist', async ({ page }) => {
    // Navigate to transfers page
    await page.goto('/enterprise/transfers');

    // Wait for page to load
    await expect(page.getByText(/Transferências de Estoque/i)).toBeVisible();

    // Since we haven't created any transfers, should show empty state
    await expect(page.getByText(/Nenhuma transferência encontrada/i)).toBeVisible();
  });

  test('should navigate to transfer detail when clicking on a transfer row', async ({ page }) => {
    // First, seed a transfer in the mock DB
    await page.evaluate(() => {
      const db = JSON.parse(localStorage.getItem('__giro_web_mock_db__') || '{}');
      db.stockTransfers = [
        {
          id: 'trf-001',
          transferNumber: 'TRF-2026-001',
          status: 'DRAFT',
          originLocationId: 'loc-001',
          destinationLocationId: 'loc-002',
          requesterId: 'admin-1',
          items: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          history: [],
        },
      ];
      localStorage.setItem('__giro_web_mock_db__', JSON.stringify(db));
    });

    // Reload to pick up the seeded data
    await page.reload();
    await loginWithPin(page, '8899');

    // Navigate to transfers page
    await page.goto('/enterprise/transfers');

    // Wait for the transfer row to be visible
    await page.locator('[data-testid="transfer-row"]').first().waitFor({ state: 'visible' });

    // Click on the transfer row
    await page.locator('[data-testid="transfer-row"]').first().click();

    // Verify navigation to detail page
    await page.waitForURL('**/enterprise/transfers/**');
    await expect(page.getByText(/TRF-2026-001/i)).toBeVisible();
  });
});
