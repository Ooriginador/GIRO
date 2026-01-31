/**
 * E2E Tests - Material Request Flow
 * Playwright tests for complete material request workflow
 */

import { expect, test } from '@playwright/test';
import { dismissTutorialIfPresent, ensureLicensePresent, loginWithPin } from '../e2e-helpers';

// SKIP: Tests require test data seeding infrastructure
test.describe.skip('Material Request E2E Flow', () => {
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

    // 3. Seed Mock DB for Dependencies
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
        workFronts: [
          {
            id: 'ft-001',
            code: 'FT-01',
            name: 'Frente de Obra 1',
            status: 'ACTIVE',
            contractId: 'cnt-001',
            supervisorId: 'admin-1',
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
        ],
        materialRequests: [],
        stockTransfers: [],
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

    try {
      await expect(page.locator('[data-testid="enterprise-dashboard"]')).toBeVisible({
        timeout: 10000,
      });
    } catch (e) {
      console.log('Dashboard not visible. Body text:', await page.textContent('body'));
      throw e;
    }
  });

  test('should navigate to requests page and see new request button', async ({ page }) => {
    // Go to requests page via sidebar
    await page.click('[data-testid="nav-requests"]');

    // Wait for the requests page to load
    await page.waitForURL('**/enterprise/requests');

    // Verify we're on the requests page
    await expect(page.getByRole('heading', { name: /Requisições/i })).toBeVisible();

    // Verify new request button is visible
    await expect(page.locator('[data-testid="new-request-btn"]')).toBeVisible();
  });

  test('should open new request form when clicking new request button', async ({ page }) => {
    // Navigate directly to requests page
    await page.goto('/enterprise/requests');

    // Click new request button
    await page.locator('[data-testid="new-request-btn"]').click();

    // Wait for navigation to new request page
    await page.waitForURL('**/enterprise/requests/new**');

    // Verify form is displayed
    await expect(page.getByRole('heading', { name: /Nova Requisição/i })).toBeVisible();

    // Verify contract selector is present
    await expect(page.getByText(/Contrato\/Obra/i)).toBeVisible();
  });

  test('should filter requests by status', async ({ page }) => {
    // Navigate to requests page
    await page.goto('/enterprise/requests');

    // Wait for page to load
    await expect(page.getByText(/Requisições de Material/i)).toBeVisible();

    // Click on status filter (ShadCN Select)
    await page.locator('[data-testid="status-filter"]').click();

    // Select "Rascunho" option
    await page.getByRole('option', { name: /Rascunho/i }).click();

    // Verify filter is applied (the select should show the value)
    await expect(page.locator('[data-testid="status-filter"]')).toContainText(/Rascunho/i);
  });

  test('should show empty state when no requests exist', async ({ page }) => {
    // Navigate to requests page
    await page.goto('/enterprise/requests');

    // Wait for page to load
    await expect(page.getByText(/Requisições de Material/i)).toBeVisible();

    // Since we haven't created any requests, should show empty state
    await expect(page.getByText(/Nenhuma requisição encontrada/i)).toBeVisible();
  });

  test('should navigate to request detail when clicking on a request row', async ({ page }) => {
    // First, seed a request in the mock DB
    await page.evaluate(() => {
      const db = JSON.parse(localStorage.getItem('__giro_web_mock_db__') || '{}');
      db.materialRequests = [
        {
          id: 'req-001',
          code: 'REQ-2026-001',
          status: 'DRAFT',
          priority: 'NORMAL',
          contractId: 'cnt-001',
          workFrontId: 'ft-001',
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

    // Navigate to requests page
    await page.goto('/enterprise/requests');

    // Wait for the request row to be visible
    await page.locator('[data-testid="request-row"]').first().waitFor({ state: 'visible' });

    // Click on the request row
    await page.locator('[data-testid="request-row"]').first().click();

    // Verify navigation to detail page
    await page.waitForURL('**/enterprise/requests/**');
    await expect(page.getByText(/REQ-2026-001/i)).toBeVisible();
  });
});
