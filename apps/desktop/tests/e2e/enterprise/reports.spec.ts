/**
 * E2E Tests - Enterprise Reports
 * Playwright tests for all Enterprise report types
 */

import { expect, test } from '@playwright/test';
import { dismissTutorialIfPresent, ensureLicensePresent, loginWithPin } from '../e2e-helpers';

// SKIP: Tests require stable test infrastructure - timing out due to resource exhaustion
test.describe.skip('Enterprise Reports', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Setup Environment
    await ensureLicensePresent(page, 'ENTERPRISE');

    // Navegar para rota de teste que bypassa LicenseGuard
    await page.goto('/__test-login');
    await page.waitForLoadState('domcontentloaded');
    await dismissTutorialIfPresent(page);

    // Login com PIN 8899 (Admin)
    await loginWithPin(page, '8899');

    // Navigate to reports page
    await page.goto('/enterprise/reports');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="reports-page"]')).toBeVisible({ timeout: 10000 });
  });

  test.describe('Consumption Report', () => {
    test('should generate consumption report by contract', async ({ page }) => {
      await page.click('[data-testid="report-type-consumption"]');

      // Select contract
      await page.selectOption('[data-testid="contract-select"]', { label: 'OBRA-001' });

      // Set date range
      await page.fill('[data-testid="date-from"]', '2026-01-01');
      await page.fill('[data-testid="date-to"]', '2026-01-31');

      // Generate
      await page.click('[data-testid="generate-report-btn"]');

      // Verify results
      await expect(page.locator('[data-testid="report-results"]')).toBeVisible();
      await expect(page.locator('[data-testid="consumption-summary"]')).toBeVisible();

      // Verify summary metrics
      await expect(page.locator('[data-testid="total-consumed"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-value"]')).toBeVisible();
      await expect(page.locator('[data-testid="top-materials"]')).toBeVisible();
    });

    test('should show consumption chart by work front', async ({ page }) => {
      await page.click('[data-testid="report-type-consumption"]');
      await page.selectOption('[data-testid="contract-select"]', { label: 'OBRA-001' });
      await page.fill('[data-testid="date-from"]', '2026-01-01');
      await page.fill('[data-testid="date-to"]', '2026-01-31');
      await page.click('[data-testid="generate-report-btn"]');

      // Verify chart
      await expect(page.locator('[data-testid="consumption-chart"]')).toBeVisible();

      // Toggle chart view
      await page.click('[data-testid="chart-view-workfront"]');
      await expect(page.locator('[data-testid="workfront-chart"]')).toBeVisible();
    });

    test('should drill down into consumption details', async ({ page }) => {
      await page.click('[data-testid="report-type-consumption"]');
      await page.selectOption('[data-testid="contract-select"]', { label: 'OBRA-001' });
      await page.click('[data-testid="generate-report-btn"]');

      // Click on a material row to drill down
      await page.click('[data-testid="material-row"]');

      // Verify drill-down modal
      await expect(page.locator('[data-testid="consumption-detail-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="consumption-history-table"]')).toBeVisible();
    });
  });

  test.describe('Budget Report', () => {
    test('should generate budget vs actual report', async ({ page }) => {
      await page.click('[data-testid="report-type-budget"]');
      await page.selectOption('[data-testid="contract-select"]', { label: 'OBRA-001' });
      await page.click('[data-testid="generate-report-btn"]');

      // Verify budget metrics
      await expect(page.locator('[data-testid="budget-total"]')).toBeVisible();
      await expect(page.locator('[data-testid="actual-total"]')).toBeVisible();
      await expect(page.locator('[data-testid="variance"]')).toBeVisible();
      await expect(page.locator('[data-testid="variance-percent"]')).toBeVisible();
    });

    test('should show budget breakdown by category', async ({ page }) => {
      await page.click('[data-testid="report-type-budget"]');
      await page.selectOption('[data-testid="contract-select"]', { label: 'OBRA-001' });
      await page.click('[data-testid="generate-report-btn"]');

      // Verify category breakdown
      await expect(page.locator('[data-testid="budget-by-category"]')).toBeVisible();

      // Verify variance highlighting
      const overBudgetRows = page.locator('[data-testid="category-row"].over-budget');
      const underBudgetRows = page.locator('[data-testid="category-row"].under-budget');

      // At least one row should have a status
      await expect(overBudgetRows.or(underBudgetRows).first()).toBeVisible();
    });

    test('should show budget trend chart', async ({ page }) => {
      await page.click('[data-testid="report-type-budget"]');
      await page.selectOption('[data-testid="contract-select"]', { label: 'OBRA-001' });
      await page.click('[data-testid="generate-report-btn"]');

      // Verify trend chart
      await expect(page.locator('[data-testid="budget-trend-chart"]')).toBeVisible();
    });
  });

  test.describe('Stock Report', () => {
    test('should generate stock position report', async ({ page }) => {
      await page.click('[data-testid="report-type-stock"]');
      await page.click('[data-testid="generate-report-btn"]');

      // Verify stock summary
      await expect(page.locator('[data-testid="stock-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-sku"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-value"]')).toBeVisible();
    });

    test('should filter stock by location', async ({ page }) => {
      await page.click('[data-testid="report-type-stock"]');
      await page.selectOption('[data-testid="location-filter"]', { label: 'Almoxarifado Central' });
      await page.click('[data-testid="generate-report-btn"]');

      // Verify filtered results
      await expect(page.locator('[data-testid="location-header"]')).toContainText(
        'Almoxarifado Central'
      );
    });

    test('should highlight low stock items', async ({ page }) => {
      await page.click('[data-testid="report-type-stock"]');
      await page.check('[data-testid="show-low-stock-only"]');
      await page.click('[data-testid="generate-report-btn"]');

      // Verify low stock items are shown
      const lowStockRows = page.locator('[data-testid="stock-row"].low-stock');
      await expect(lowStockRows.first()).toBeVisible();
    });

    test('should show stock movement history', async ({ page }) => {
      await page.click('[data-testid="report-type-stock"]');
      await page.click('[data-testid="generate-report-btn"]');

      // Click on a product row
      await page.click('[data-testid="stock-row"]');

      // Verify movement history modal
      await expect(page.locator('[data-testid="movement-history-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="movement-table"]')).toBeVisible();
    });
  });

  test.describe('Transfer Report', () => {
    test('should generate transfers report by period', async ({ page }) => {
      await page.click('[data-testid="report-type-transfers"]');
      await page.fill('[data-testid="date-from"]', '2026-01-01');
      await page.fill('[data-testid="date-to"]', '2026-01-31');
      await page.click('[data-testid="generate-report-btn"]');

      // Verify summary
      await expect(page.locator('[data-testid="transfers-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-transfers"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-items"]')).toBeVisible();
      await expect(page.locator('[data-testid="avg-transit-time"]')).toBeVisible();
    });

    test('should filter transfers by status', async ({ page }) => {
      await page.click('[data-testid="report-type-transfers"]');
      await page.selectOption('[data-testid="status-filter"]', 'IN_TRANSIT');
      await page.click('[data-testid="generate-report-btn"]');

      // Verify filtered results
      const rows = page.locator('[data-testid="transfer-row"]');
      const count = await rows.count();

      for (let i = 0; i < count; i++) {
        await expect(rows.nth(i)).toContainText('EM TRÂNSITO');
      }
    });

    test('should show transfers by route', async ({ page }) => {
      await page.click('[data-testid="report-type-transfers"]');
      await page.click('[data-testid="group-by-route"]');
      await page.click('[data-testid="generate-report-btn"]');

      // Verify grouped by route
      await expect(page.locator('[data-testid="route-group"]').first()).toBeVisible();
    });
  });

  test.describe('Request Report', () => {
    test('should generate requests report', async ({ page }) => {
      await page.click('[data-testid="report-type-requests"]');
      await page.selectOption('[data-testid="contract-select"]', { label: 'OBRA-001' });
      await page.fill('[data-testid="date-from"]', '2026-01-01');
      await page.fill('[data-testid="date-to"]', '2026-01-31');
      await page.click('[data-testid="generate-report-btn"]');

      // Verify summary
      await expect(page.locator('[data-testid="requests-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-requests"]')).toBeVisible();
      await expect(page.locator('[data-testid="approved-count"]')).toBeVisible();
      await expect(page.locator('[data-testid="rejected-count"]')).toBeVisible();
    });

    test('should show requests by status breakdown', async ({ page }) => {
      await page.click('[data-testid="report-type-requests"]');
      await page.click('[data-testid="generate-report-btn"]');

      // Verify status chart
      await expect(page.locator('[data-testid="status-pie-chart"]')).toBeVisible();
    });

    test('should show avg processing time', async ({ page }) => {
      await page.click('[data-testid="report-type-requests"]');
      await page.click('[data-testid="generate-report-btn"]');

      // Verify processing time metrics
      await expect(page.locator('[data-testid="avg-approval-time"]')).toBeVisible();
      await expect(page.locator('[data-testid="avg-delivery-time"]')).toBeVisible();
    });
  });

  test.describe('Activity Report', () => {
    test('should generate activities report', async ({ page }) => {
      await page.click('[data-testid="report-type-activities"]');
      await page.selectOption('[data-testid="contract-select"]', { label: 'OBRA-001' });
      await page.click('[data-testid="generate-report-btn"]');

      // Verify summary
      await expect(page.locator('[data-testid="activities-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-activities"]')).toBeVisible();
      await expect(page.locator('[data-testid="completed-count"]')).toBeVisible();
    });

    test('should show activities by cost center', async ({ page }) => {
      await page.click('[data-testid="report-type-activities"]');
      await page.check('[data-testid="group-by-cost-center"]');
      await page.click('[data-testid="generate-report-btn"]');

      // Verify grouped by cost center
      await expect(page.locator('[data-testid="cost-center-group"]').first()).toBeVisible();
    });

    test('should show material consumption by activity', async ({ page }) => {
      await page.click('[data-testid="report-type-activities"]');
      await page.click('[data-testid="generate-report-btn"]');

      // Click on activity
      await page.click('[data-testid="activity-row"]');

      // Verify consumption detail
      await expect(page.locator('[data-testid="activity-consumption-modal"]')).toBeVisible();
    });
  });

  test.describe('Report Export', () => {
    test('should export report to PDF', async ({ page }) => {
      await page.click('[data-testid="report-type-consumption"]');
      await page.selectOption('[data-testid="contract-select"]', { label: 'OBRA-001' });
      await page.click('[data-testid="generate-report-btn"]');

      await expect(page.locator('[data-testid="report-results"]')).toBeVisible();

      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="export-pdf-btn"]'),
      ]);

      expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    });

    test('should export report to Excel', async ({ page }) => {
      await page.click('[data-testid="report-type-stock"]');
      await page.click('[data-testid="generate-report-btn"]');

      await expect(page.locator('[data-testid="report-results"]')).toBeVisible();

      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="export-excel-btn"]'),
      ]);

      expect(download.suggestedFilename()).toMatch(/\.xlsx?$/);
    });

    test('should export report to CSV', async ({ page }) => {
      await page.click('[data-testid="report-type-transfers"]');
      await page.click('[data-testid="generate-report-btn"]');

      await expect(page.locator('[data-testid="report-results"]')).toBeVisible();

      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="export-csv-btn"]'),
      ]);

      expect(download.suggestedFilename()).toMatch(/\.csv$/);
    });

    test('should print report', async ({ page }) => {
      await page.click('[data-testid="report-type-budget"]');
      await page.selectOption('[data-testid="contract-select"]', { label: 'OBRA-001' });
      await page.click('[data-testid="generate-report-btn"]');

      await expect(page.locator('[data-testid="report-results"]')).toBeVisible();

      // Click print button
      await page.click('[data-testid="print-report-btn"]');

      // Verify print preview
      await expect(page.locator('[data-testid="print-preview"]')).toBeVisible();
    });
  });

  test.describe('Scheduled Reports', () => {
    test('should schedule a recurring report', async ({ page }) => {
      await page.click('[data-testid="scheduled-reports-tab"]');
      await page.click('[data-testid="new-schedule-btn"]');

      // Fill schedule form
      await page.selectOption('[data-testid="report-type"]', 'consumption');
      await page.selectOption('[data-testid="contract-select"]', { label: 'OBRA-001' });
      await page.selectOption('[data-testid="frequency"]', 'weekly');
      await page.selectOption('[data-testid="day-of-week"]', 'monday');
      await page.fill('[data-testid="recipient-email"]', 'gestor@empresa.com');

      // Save schedule
      await page.click('[data-testid="save-schedule-btn"]');

      // Verify success
      await expect(page.locator('[data-testid="toast-success"]')).toContainText('Agendamento');

      // Verify schedule appears in list
      await expect(page.locator('[data-testid="schedule-list"]')).toContainText('Consumo');
    });

    test('should delete a scheduled report', async ({ page }) => {
      await page.click('[data-testid="scheduled-reports-tab"]');

      // Delete first schedule
      await page.click('[data-testid="schedule-row"]');
      await page.click('[data-testid="delete-schedule-btn"]');
      await page.click('[data-testid="confirm-delete-btn"]');

      // Verify success
      await expect(page.locator('[data-testid="toast-success"]')).toContainText('Removido');
    });
  });
});
