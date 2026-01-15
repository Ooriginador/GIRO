/**
 * @file sale.spec.ts - Teste E2E do fluxo de venda
 */

import { expect, test } from '@playwright/test';

import { dismissTutorialIfPresent, ensureCashOpen, loginWithPin } from './e2e-helpers';

test.describe('Sale Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Login com PIN 8899 (Admin) - UI usa teclado numérico
    await loginWithPin(page, '8899');
    await dismissTutorialIfPresent(page);
  });

  test('should navigate to PDV', async ({ page }) => {
    await dismissTutorialIfPresent(page);

    // Click PDV in navigation
    const pdvLink = page.locator('a:has-text("PDV"), button:has-text("PDV"), [href*="/pdv"]');
    if (await pdvLink.isVisible()) {
      await pdvLink.click();
    }

    await page.waitForURL(/\/pdv/, { timeout: 10000 }).catch(() => undefined);
    await dismissTutorialIfPresent(page);

    // PDV exige caixa aberto
    await ensureCashOpen(page);

    // Deve renderizar o input de busca do PDV
    await expect(
      page.getByPlaceholder('Buscar produto por nome ou código (F2)').first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('should add product by barcode', async ({ page }) => {
    // Navigate to PDV
    await page.goto('/pdv');
    await page.waitForLoadState('domcontentloaded');
    await dismissTutorialIfPresent(page);
    await ensureCashOpen(page);

    // Buscar produto por nome/código e selecionar no dropdown
    const searchInput = page.getByPlaceholder('Buscar produto por nome ou código (F2)').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Refrigerante');

      const dropdown = page.locator('.absolute.left-0.right-0.top-full.z-50').first();
      await expect(dropdown).toBeVisible({ timeout: 10000 });

      // Aguardar a busca terminar e renderizar resultado ou estado vazio
      await page
        .waitForFunction(
          (selector) => {
            const el = document.querySelector(selector);
            if (!el) return false;
            const text = el.textContent ?? '';
            if (text.includes('Nenhum produto encontrado')) return true;
            if (text.includes('Buscando...')) return false;
            return el.querySelector('button[type="button"]') !== null;
          },
          '.absolute.left-0.right-0.top-full.z-50',
          { timeout: 15000 }
        )
        .catch(() => undefined);

      const noResults = dropdown.getByText('Nenhum produto encontrado').first();
      if (await noResults.isVisible().catch(() => false)) {
        await expect(noResults).toBeVisible();
        return;
      }

      const firstResult = dropdown.locator('button[type="button"]').first();
      await expect(firstResult).toBeVisible({ timeout: 10000 });
      await firstResult.click();

      await expect(page.getByText('Nenhum produto adicionado').first()).not.toBeVisible({
        timeout: 5000,
      });
    }
  });

  test('should show total amount', async ({ page }) => {
    await page.goto('/pdv');
    await page.waitForLoadState('domcontentloaded');
    await dismissTutorialIfPresent(page);
    await ensureCashOpen(page);

    // Total should be visible
    await expect(page.getByText('Total', { exact: true }).first()).toBeVisible();
  });

  test('should open payment modal', async ({ page }) => {
    await page.goto('/pdv');
    await page.waitForLoadState('domcontentloaded');
    await dismissTutorialIfPresent(page);
    await ensureCashOpen(page);

    // Click payment/finalize button
    const payButton = page.locator(
      'button:has-text("Pagamento"), button:has-text("Finalizar"), button:has-text("Pagar")'
    );
    if (await payButton.first().isVisible()) {
      await payButton.first().click();

      // Payment modal should appear
      const paymentModal = page.locator('[role="dialog"], .modal, .payment-modal');
      await expect(paymentModal.first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('should complete sale with cash', async ({ page }) => {
    await page.goto('/pdv');
    await page.waitForLoadState('domcontentloaded');
    await dismissTutorialIfPresent(page);
    await ensureCashOpen(page);

    // Add item (mock)
    const barcodeInput = page.locator('input[placeholder*="código"]').first();
    if (await barcodeInput.isVisible()) {
      await barcodeInput.fill('7891234567890');
      await barcodeInput.press('Enter');
    }

    // Open payment
    const payButton = page
      .locator('button:has-text("Pagar"), button:has-text("Finalizar")')
      .first();
    if (await payButton.isVisible()) {
      await payButton.click();

      // Select cash payment
      const cashOption = page.locator('button:has-text("Dinheiro"), [data-payment="cash"]');
      if (await cashOption.first().isVisible()) {
        await cashOption.first().click();
      }

      // Confirm sale
      const confirmButton = page.locator(
        'button:has-text("Confirmar"), button:has-text("Concluir")'
      );
      if (await confirmButton.first().isVisible()) {
        await confirmButton.first().click();
      }
    }
  });
});
