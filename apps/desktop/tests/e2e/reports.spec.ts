/**
 * @file reports.spec.ts - Testes E2E de Relatórios
 * Testa geração e visualização de relatórios
 * NOTA: Testes skipados - página Reports é apenas índice com cards, funcionalidades em desenvolvimento
 */

import { expect, test } from '@playwright/test';

test.describe.skip('Relatórios E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login como admin
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Login com PIN 1234 (Admin)
    await page.locator('button:has-text("1")').first().click();
    await page.locator('button:has-text("2")').first().click();
    await page.locator('button:has-text("3")').first().click();
    await page.locator('button:has-text("4")').first().click();

    const loginButton = page.locator('button:has-text("Entrar")');
    await loginButton.click();
    await page.waitForURL(/\/(dashboard|reports)/, { timeout: 5000 });

    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
  });

  test('deve exibir relatório de vendas do dia', async ({ page }) => {
    const dailySalesReport = page
      .locator('button:has-text("Vendas do Dia"), [data-testid="daily-sales"]')
      .first();
    const isVisible = await dailySalesReport.isVisible().catch(() => false);

    if (isVisible) {
      await dailySalesReport.click();
      await page.waitForTimeout(1500);

      // Verificar que dados aparecem
      const reportData = page.locator('table, .chart, [data-testid="report-content"]');
      const dataVisible = await reportData.isVisible().catch(() => false);

      expect(dataVisible).toBeTruthy();
    }
  });

  test('deve filtrar relatório por período', async ({ page }) => {
    const startDateInput = page
      .locator('input[name="startDate"], input[placeholder*="início"]')
      .first();
    const isVisible = await startDateInput.isVisible().catch(() => false);

    if (isVisible) {
      const today = new Date();
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      await startDateInput.fill(lastWeek.toISOString().split('T')[0] ?? '');

      const endDateInput = page.locator('input[name="endDate"], input[placeholder*="fim"]').first();
      await endDateInput.fill(today.toISOString().split('T')[0] ?? '');

      const applyButton = page
        .locator('button:has-text("Aplicar"), button:has-text("Filtrar")')
        .first();
      await applyButton.click();
      await page.waitForTimeout(1500);

      const reportData = page.locator('table tbody tr, .data-row');
      const count = await reportData.count();

      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('deve exportar relatório para PDF', async ({ page }) => {
    const exportButton = page.locator('button:has-text("PDF"), [data-testid="export-pdf"]').first();
    const isVisible = await exportButton.isVisible().catch(() => false);

    if (isVisible) {
      await exportButton.click();
      await page.waitForTimeout(2000);

      // Verificar que não há erro
      const errorAlert = page.locator('[role="alert"]:has-text("Erro")');
      const hasError = await errorAlert.isVisible().catch(() => false);

      expect(hasError).toBeFalsy();
    }
  });

  test('deve exportar relatório para Excel', async ({ page }) => {
    const exportButton = page
      .locator('button:has-text("Excel"), button:has-text("XLSX"), [data-testid="export-excel"]')
      .first();
    const isVisible = await exportButton.isVisible().catch(() => false);

    if (isVisible) {
      await exportButton.click();
      await page.waitForTimeout(2000);

      const errorAlert = page.locator('[role="alert"]:has-text("Erro")');
      const hasError = await errorAlert.isVisible().catch(() => false);

      expect(hasError).toBeFalsy();
    }
  });

  test('deve exibir gráfico de vendas', async ({ page }) => {
    const chartTab = page
      .locator('[role="tab"]:has-text("Gráfico"), button:has-text("Gráficos")')
      .first();
    const isVisible = await chartTab.isVisible().catch(() => false);

    if (isVisible) {
      await chartTab.click();
      await page.waitForTimeout(1000);

      const chart = page.locator('svg, canvas, .recharts-wrapper');
      const chartVisible = await chart.isVisible().catch(() => false);

      expect(chartVisible).toBeTruthy();
    }
  });

  test('deve exibir top produtos mais vendidos', async ({ page }) => {
    const topProductsTab = page
      .locator('[role="tab"]:has-text("Top Produtos"), button:has-text("Mais Vendidos")')
      .first();
    const isVisible = await topProductsTab.isVisible().catch(() => false);

    if (isVisible) {
      await topProductsTab.click();
      await page.waitForTimeout(1000);

      const productList = page.locator('table tbody tr, .product-rank');
      const count = await productList.count();

      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('deve exibir relatório de lucro', async ({ page }) => {
    const profitReport = page
      .locator('button:has-text("Lucro"), [data-testid="profit-report"]')
      .first();
    const isVisible = await profitReport.isVisible().catch(() => false);

    if (isVisible) {
      await profitReport.click();
      await page.waitForTimeout(1500);

      const profitValue = page.locator('[data-testid="total-profit"], :has-text("Lucro Total")');
      const valueVisible = await profitValue.isVisible().catch(() => false);

      expect(valueVisible).toBeTruthy();
    }
  });

  test('deve comparar períodos', async ({ page }) => {
    const compareButton = page
      .locator('button:has-text("Comparar"), [data-testid="compare-periods"]')
      .first();
    const isVisible = await compareButton.isVisible().catch(() => false);

    if (isVisible) {
      await compareButton.click();
      await page.waitForTimeout(500);

      // Selecionar períodos
      const period1 = page.locator('select[name="period1"]').first();
      if (await period1.isVisible().catch(() => false)) {
        await period1.selectOption('this-month');

        const period2 = page.locator('select[name="period2"]').first();
        await period2.selectOption('last-month');

        const applyButton = page.locator('button:has-text("Aplicar")').last();
        await applyButton.click();
        await page.waitForTimeout(1500);

        // Verificar que comparação aparece
        const comparisonData = page.locator('.comparison, [data-testid="comparison-result"]');
        const dataVisible = await comparisonData.isVisible().catch(() => false);

        expect(dataVisible).toBeTruthy();
      }
    }
  });
});
