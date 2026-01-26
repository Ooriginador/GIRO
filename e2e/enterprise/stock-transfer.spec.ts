/**
 * E2E Tests - Stock Transfer Flow
 * Playwright tests for complete stock transfer workflow
 */

import { test, expect } from '@playwright/test';

test.describe('Stock Transfer E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Enterprise module
    await page.goto('/enterprise');
    await expect(page.locator('[data-testid="enterprise-dashboard"]')).toBeVisible();
  });

  test('should create a new stock transfer', async ({ page }) => {
    // Go to transfers page
    await page.click('[data-testid="nav-transfers"]');

    // Click new transfer button
    await page.click('[data-testid="new-transfer-btn"]');

    // Select origin location (Central Warehouse)
    await page.selectOption('[data-testid="origin-location"]', { label: 'Almoxarifado Central' });

    // Select destination location (Field)
    await page.selectOption('[data-testid="destination-location"]', { label: 'Frente de Obra 1' });

    // Fill notes
    await page.fill('[data-testid="transfer-notes"]', 'Transferência para início da obra');

    // Add items
    await page.click('[data-testid="add-transfer-item-btn"]');
    await page.fill('[data-testid="product-search"]', 'Cimento CP-II');
    await page.click('[data-testid="product-option-0"]');
    await page.fill('[data-testid="transfer-quantity"]', '100');
    await page.click('[data-testid="confirm-transfer-item-btn"]');

    // Verify item added
    await expect(page.locator('[data-testid="transfer-items-list"]')).toContainText(
      'Cimento CP-II'
    );
    await expect(page.locator('[data-testid="transfer-items-list"]')).toContainText('100');

    // Save transfer
    await page.click('[data-testid="save-transfer-btn"]');

    // Verify success
    await expect(page.locator('[data-testid="toast-success"]')).toContainText(
      'Transferência criada'
    );

    // Verify status is PENDING
    await expect(page.locator('[data-testid="transfer-status"]')).toContainText('PENDENTE');
  });

  test('should validate stock availability when creating transfer', async ({ page }) => {
    await page.click('[data-testid="nav-transfers"]');
    await page.click('[data-testid="new-transfer-btn"]');

    await page.selectOption('[data-testid="origin-location"]', { label: 'Almoxarifado Central' });
    await page.selectOption('[data-testid="destination-location"]', { label: 'Frente de Obra 1' });

    // Try to add more than available stock
    await page.click('[data-testid="add-transfer-item-btn"]');
    await page.fill('[data-testid="product-search"]', 'Produto Escasso');
    await page.click('[data-testid="product-option-0"]');
    await page.fill('[data-testid="transfer-quantity"]', '99999');
    await page.click('[data-testid="confirm-transfer-item-btn"]');

    // Verify stock warning
    await expect(page.locator('[data-testid="stock-warning"]')).toContainText(
      'Estoque insuficiente'
    );
  });

  test('should dispatch a pending transfer', async ({ page }) => {
    await page.click('[data-testid="nav-transfers"]');
    await page.selectOption('[data-testid="status-filter"]', 'PENDING');
    await page.click('[data-testid="transfer-row"]');

    // Click dispatch button
    await page.click('[data-testid="dispatch-transfer-btn"]');

    // Fill vehicle info
    await page.fill('[data-testid="vehicle-plate"]', 'ABC-1234');
    await page.fill('[data-testid="driver-name"]', 'Carlos Motorista');

    // Confirm dispatch
    await page.click('[data-testid="confirm-dispatch-btn"]');

    // Verify status changed
    await expect(page.locator('[data-testid="transfer-status"]')).toContainText('EM TRÂNSITO');

    // Verify dispatch info is visible
    await expect(page.locator('[data-testid="dispatch-info"]')).toContainText('ABC-1234');
    await expect(page.locator('[data-testid="dispatch-info"]')).toContainText('Carlos');
  });

  test('should receive a transfer at destination', async ({ page }) => {
    await page.click('[data-testid="nav-transfers"]');
    await page.selectOption('[data-testid="status-filter"]', 'IN_TRANSIT');
    await page.click('[data-testid="transfer-row"]');

    // Click receive button
    await page.click('[data-testid="receive-transfer-btn"]');

    // Check all items as received
    const checkboxes = page.locator('[data-testid="receive-checkbox"]');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).check();
    }

    // Fill receiver signature/name
    await page.fill('[data-testid="receiver-signature"]', 'Maria Responsável');

    // Confirm receipt
    await page.click('[data-testid="confirm-receive-btn"]');

    // Verify status changed to DELIVERED
    await expect(page.locator('[data-testid="transfer-status"]')).toContainText('ENTREGUE');
  });

  test('should receive transfer with discrepancy', async ({ page }) => {
    await page.click('[data-testid="nav-transfers"]');
    await page.selectOption('[data-testid="status-filter"]', 'IN_TRANSIT');
    await page.click('[data-testid="transfer-row"]');

    await page.click('[data-testid="receive-transfer-btn"]');

    // Report discrepancy on first item
    await page.click('[data-testid="report-discrepancy-btn-0"]');
    await page.fill('[data-testid="received-quantity-0"]', '90');
    await page.fill('[data-testid="discrepancy-reason-0"]', 'Item danificado no transporte');

    // Confirm receipt with discrepancy
    await page.fill('[data-testid="receiver-signature"]', 'Maria Responsável');
    await page.click('[data-testid="confirm-receive-btn"]');

    // Verify status
    await expect(page.locator('[data-testid="transfer-status"]')).toContainText(
      'ENTREGUE COM DIVERGÊNCIA'
    );

    // Verify discrepancy is logged
    await expect(page.locator('[data-testid="discrepancy-log"]')).toContainText('danificado');
  });

  test('should cancel a pending transfer', async ({ page }) => {
    await page.click('[data-testid="nav-transfers"]');
    await page.selectOption('[data-testid="status-filter"]', 'PENDING');
    await page.click('[data-testid="transfer-row"]');

    // Click cancel button
    await page.click('[data-testid="cancel-transfer-btn"]');

    // Fill reason
    await page.fill('[data-testid="cancel-reason"]', 'Obra foi adiada');

    // Confirm cancellation
    await page.click('[data-testid="confirm-cancel-btn"]');

    // Verify status changed
    await expect(page.locator('[data-testid="transfer-status"]')).toContainText('CANCELADO');

    // Verify stock was not affected (no movement)
    await page.click('[data-testid="nav-stock"]');
    await expect(page.locator('[data-testid="stock-movement-log"]')).not.toContainText(
      'Transferência cancelada'
    );
  });

  test('should track transfer in real-time', async ({ page }) => {
    await page.click('[data-testid="nav-transfers"]');
    await page.selectOption('[data-testid="status-filter"]', 'IN_TRANSIT');
    await page.click('[data-testid="transfer-row"]');

    // Click track button
    await page.click('[data-testid="track-transfer-btn"]');

    // Verify tracking info is visible
    await expect(page.locator('[data-testid="transfer-timeline"]')).toBeVisible();

    // Verify timeline entries
    await expect(page.locator('[data-testid="timeline-entry"]').first()).toContainText('Criado');
    await expect(page.locator('[data-testid="timeline-entry"]').nth(1)).toContainText('Despachado');
  });

  test('should show transfer history for a location', async ({ page }) => {
    await page.click('[data-testid="nav-stock"]');
    await page.click('[data-testid="location-row"]');
    await page.click('[data-testid="view-transfer-history-btn"]');

    // Verify history modal opens
    await expect(page.locator('[data-testid="transfer-history-modal"]')).toBeVisible();

    // Verify table shows incoming and outgoing transfers
    await expect(page.locator('[data-testid="history-table"]')).toBeVisible();
  });
});

test.describe('Stock Transfer Reports', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/enterprise/reports');
  });

  test('should generate transfers report by period', async ({ page }) => {
    await page.click('[data-testid="report-type-transfers"]');

    // Set date range
    await page.fill('[data-testid="report-date-from"]', '2026-01-01');
    await page.fill('[data-testid="report-date-to"]', '2026-01-31');

    // Generate report
    await page.click('[data-testid="generate-report-btn"]');

    // Wait for report
    await expect(page.locator('[data-testid="report-results"]')).toBeVisible();

    // Verify summary metrics
    await expect(page.locator('[data-testid="total-transfers"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-value"]')).toBeVisible();
  });

  test('should export transfers report to Excel', async ({ page }) => {
    await page.click('[data-testid="report-type-transfers"]');
    await page.fill('[data-testid="report-date-from"]', '2026-01-01');
    await page.fill('[data-testid="report-date-to"]', '2026-01-31');
    await page.click('[data-testid="generate-report-btn"]');

    await expect(page.locator('[data-testid="report-results"]')).toBeVisible();

    // Export to Excel
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="export-excel-btn"]'),
    ]);

    expect(download.suggestedFilename()).toContain('transferencias');
    expect(download.suggestedFilename()).toMatch(/\.(xlsx|xls)$/);
  });
});
