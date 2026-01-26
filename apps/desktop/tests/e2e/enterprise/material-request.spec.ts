/**
 * E2E Tests - Material Request Flow
 * Playwright tests for complete material request workflow
 */

import { test, expect } from '@playwright/test';

test.describe('Material Request E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Enterprise module
    await page.goto('/enterprise');

    // Wait for module to load
    await expect(page.locator('[data-testid="enterprise-dashboard"]')).toBeVisible();
  });

  test('should create a new material request from scratch', async ({ page }) => {
    // Go to requests page
    await page.click('[data-testid="nav-requests"]');

    // Click new request button
    await page.click('[data-testid="new-request-btn"]');

    // Fill request form
    await page.selectOption('[data-testid="contract-select"]', { label: 'OBRA-001' });
    await page.selectOption('[data-testid="work-front-select"]', { label: 'Frente de Obra 1' });
    await page.selectOption('[data-testid="priority-select"]', 'HIGH');

    // Add first item
    await page.click('[data-testid="add-item-btn"]');
    await page.fill('[data-testid="product-search"]', 'Cimento');
    await page.click('[data-testid="product-option-cimento"]');
    await page.fill('[data-testid="item-quantity"]', '50');
    await page.click('[data-testid="confirm-item-btn"]');

    // Add second item
    await page.click('[data-testid="add-item-btn"]');
    await page.fill('[data-testid="product-search"]', 'Areia');
    await page.click('[data-testid="product-option-areia"]');
    await page.fill('[data-testid="item-quantity"]', '100');
    await page.click('[data-testid="confirm-item-btn"]');

    // Verify items were added
    await expect(page.locator('[data-testid="request-items-list"]')).toContainText('Cimento');
    await expect(page.locator('[data-testid="request-items-list"]')).toContainText('Areia');

    // Save as draft
    await page.click('[data-testid="save-draft-btn"]');

    // Verify success message
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('Requisição salva');

    // Verify request appears in list with DRAFT status
    await expect(page.locator('[data-testid="request-row"]').first()).toContainText('RASCUNHO');
  });

  test('should submit a draft request for approval', async ({ page }) => {
    // Go to requests page
    await page.click('[data-testid="nav-requests"]');

    // Filter by draft status
    await page.selectOption('[data-testid="status-filter"]', 'DRAFT');

    // Click on first draft request
    await page.click('[data-testid="request-row"]');

    // Click submit button
    await page.click('[data-testid="submit-request-btn"]');

    // Confirm submission
    await page.click('[data-testid="confirm-submit-btn"]');

    // Verify status changed to PENDING
    await expect(page.locator('[data-testid="request-status"]')).toContainText('PENDENTE');

    // Verify submit button is no longer visible
    await expect(page.locator('[data-testid="submit-request-btn"]')).not.toBeVisible();
  });

  test('should approve a pending request as manager', async ({ page }) => {
    // Simulate manager login (if not already)
    await page.evaluate(() => {
      localStorage.setItem('user_role', 'MANAGER');
    });
    await page.reload();

    // Go to requests page
    await page.click('[data-testid="nav-requests"]');

    // Filter by pending status
    await page.selectOption('[data-testid="status-filter"]', 'PENDING');

    // Click on first pending request
    await page.click('[data-testid="request-row"]');

    // Verify approve button is visible for manager
    await expect(page.locator('[data-testid="approve-request-btn"]')).toBeVisible();

    // Click approve
    await page.click('[data-testid="approve-request-btn"]');

    // Confirm approval
    await page.click('[data-testid="confirm-approve-btn"]');

    // Verify status changed to APPROVED
    await expect(page.locator('[data-testid="request-status"]')).toContainText('APROVADO');
  });

  test('should reject a pending request with reason', async ({ page }) => {
    // Simulate manager login
    await page.evaluate(() => {
      localStorage.setItem('user_role', 'MANAGER');
    });
    await page.reload();

    // Go to requests page
    await page.click('[data-testid="nav-requests"]');
    await page.selectOption('[data-testid="status-filter"]', 'PENDING');
    await page.click('[data-testid="request-row"]');

    // Click reject
    await page.click('[data-testid="reject-request-btn"]');

    // Fill rejection reason
    await page.fill(
      '[data-testid="rejection-reason"]',
      'Sem orçamento disponível para este período'
    );

    // Confirm rejection
    await page.click('[data-testid="confirm-reject-btn"]');

    // Verify status changed to REJECTED
    await expect(page.locator('[data-testid="request-status"]')).toContainText('REJEITADO');

    // Verify rejection reason is visible
    await expect(page.locator('[data-testid="rejection-reason-display"]')).toContainText(
      'Sem orçamento'
    );
  });

  test('should start separation of approved request', async ({ page }) => {
    // Simulate warehouse operator login
    await page.evaluate(() => {
      localStorage.setItem('user_role', 'WAREHOUSE_OPERATOR');
    });
    await page.reload();

    // Go to requests page
    await page.click('[data-testid="nav-requests"]');
    await page.selectOption('[data-testid="status-filter"]', 'APPROVED');
    await page.click('[data-testid="request-row"]');

    // Click start separation
    await page.click('[data-testid="start-separation-btn"]');

    // Verify status changed to SEPARATING
    await expect(page.locator('[data-testid="request-status"]')).toContainText('EM SEPARAÇÃO');

    // Verify separation checklist is visible
    await expect(page.locator('[data-testid="separation-checklist"]')).toBeVisible();
  });

  test('should complete delivery of request', async ({ page }) => {
    // Simulate warehouse operator
    await page.evaluate(() => {
      localStorage.setItem('user_role', 'WAREHOUSE_OPERATOR');
    });
    await page.reload();

    // Go to requests page
    await page.click('[data-testid="nav-requests"]');
    await page.selectOption('[data-testid="status-filter"]', 'SEPARATING');
    await page.click('[data-testid="request-row"]');

    // Check all items as separated
    const checkboxes = page.locator('[data-testid="separation-checkbox"]');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).check();
    }

    // Click deliver button
    await page.click('[data-testid="deliver-request-btn"]');

    // Fill receiver name
    await page.fill('[data-testid="receiver-name"]', 'João Silva');

    // Confirm delivery
    await page.click('[data-testid="confirm-deliver-btn"]');

    // Verify status changed to DELIVERED
    await expect(page.locator('[data-testid="request-status"]')).toContainText('ENTREGUE');

    // Verify delivery info is visible
    await expect(page.locator('[data-testid="delivery-info"]')).toContainText('João Silva');
  });

  test('should cancel a draft request', async ({ page }) => {
    // Go to requests page
    await page.click('[data-testid="nav-requests"]');
    await page.selectOption('[data-testid="status-filter"]', 'DRAFT');
    await page.click('[data-testid="request-row"]');

    // Click cancel button
    await page.click('[data-testid="cancel-request-btn"]');

    // Fill cancellation reason
    await page.fill('[data-testid="cancel-reason"]', 'Requisição duplicada');

    // Confirm cancellation
    await page.click('[data-testid="confirm-cancel-btn"]');

    // Verify status changed to CANCELLED
    await expect(page.locator('[data-testid="request-status"]')).toContainText('CANCELADO');
  });

  test('should filter requests by multiple criteria', async ({ page }) => {
    // Go to requests page
    await page.click('[data-testid="nav-requests"]');

    // Apply multiple filters
    await page.selectOption('[data-testid="contract-filter"]', 'OBRA-001');
    await page.selectOption('[data-testid="status-filter"]', 'APPROVED');
    await page.selectOption('[data-testid="priority-filter"]', 'HIGH');

    // Apply date range
    await page.fill('[data-testid="date-from"]', '2026-01-01');
    await page.fill('[data-testid="date-to"]', '2026-01-31');

    // Click apply filters
    await page.click('[data-testid="apply-filters-btn"]');

    // Wait for results
    await page.waitForLoadState('networkidle');

    // Verify filtered results
    const rows = page.locator('[data-testid="request-row"]');
    const count = await rows.count();

    // All visible rows should match filter criteria
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i)).toContainText('OBRA-001');
      await expect(rows.nth(i)).toContainText('APROVADO');
    }
  });

  test('should export requests to CSV', async ({ page }) => {
    // Go to requests page
    await page.click('[data-testid="nav-requests"]');

    // Click export button
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="export-csv-btn"]'),
    ]);

    // Verify download
    expect(download.suggestedFilename()).toContain('requisicoes');
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('should print request document', async ({ page }) => {
    // Go to requests page
    await page.click('[data-testid="nav-requests"]');
    await page.click('[data-testid="request-row"]');

    // Click print button
    await page.click('[data-testid="print-request-btn"]');

    // Verify print preview opens
    await expect(page.locator('[data-testid="print-preview"]')).toBeVisible();

    // Verify document contains required info
    await expect(page.locator('[data-testid="print-preview"]')).toContainText(
      'Requisição de Material'
    );
    await expect(page.locator('[data-testid="print-preview"]')).toContainText('REQ-');
  });
});
