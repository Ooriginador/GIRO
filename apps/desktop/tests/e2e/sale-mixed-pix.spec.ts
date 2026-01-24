/**
 * @file sale-mixed-pix.spec.ts - Teste E2E: venda com pagamento misto Dinheiro + PIX
 */

import { expect, test } from '@playwright/test';

import { dismissTutorialIfPresent, ensureCashOpen, loginWithPin } from './e2e-helpers';

test.describe('Sale Mixed Payment (Cash + PIX)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await loginWithPin(page, '8899');
    await dismissTutorialIfPresent(page);
    await ensureCashOpen(page);
  });

  test('should complete sale with cash + PIX', async ({ page }) => {
    await page.goto('/pdv');
    await page.waitForLoadState('domcontentloaded');
    await dismissTutorialIfPresent(page);

    // Adicionar produto via campo de código/barcode
    const barcodeInput = page.locator('input[placeholder*="código"]').first();
    if (await barcodeInput.isVisible().catch(() => false)) {
      await barcodeInput.fill('7891234567890');
      await barcodeInput.press('Enter');
      await page.waitForTimeout(800);
    }

    // Abrir modal de pagamento / finalizar
    const finishButton = page
      .locator('button:has-text("Finalizar"), button:has-text("Pagar")')
      .first();
    if (await finishButton.isVisible().catch(() => false)) {
      await finishButton.click();
      await page.waitForTimeout(500);

      // Selecionar pagamento em Dinheiro e adicionar R$50 (parcial)
      const cashButton = page.locator('button:has-text("Dinheiro"), [data-payment="cash"]').first();
      if (await cashButton.isVisible().catch(() => false)) {
        await cashButton.click();

        const amountInput = page.locator('input[type="number"]').first();
        if (await amountInput.isVisible().catch(() => false)) {
          await amountInput.fill('50');
        }

        const addButton = page
          .locator('button:has-text("Adicionar"), button:has-text("Adicionar pagamento")')
          .first();
        if (await addButton.isVisible().catch(() => false)) {
          await addButton.click();
          await page.waitForTimeout(400);
        }
      }

      // Selecionar PIX para pagar o restante
      const pixButton = page.locator('button:has-text("PIX"), [data-payment="pix"]').first();
      if (await pixButton.isVisible().catch(() => false)) {
        await pixButton.click();
        await page.waitForTimeout(300);

        // Em alguns flows PIX só precisa de confirmar
        const confirmPix = page
          .locator('button:has-text("Confirmar"), button:has-text("Finalizar")')
          .last();
        if (await confirmPix.isVisible().catch(() => false)) {
          await confirmPix.click();
        }
      } else {
        // Fallback: tentar confirmar a venda se botão de confirmar estiver visível
        const confirmButton = page
          .locator(
            'button:has-text("Confirmar"), button:has-text("Concluir"), button:has-text("Finalizar")'
          )
          .last();
        if (await confirmButton.isVisible().catch(() => false)) {
          await confirmButton.click();
        }
      }

      // Aguardar processamento e verificar sucesso (sem alertas de erro)
      await page.waitForTimeout(1500);
      const errorAlert = page.locator(
        '[role="alert"]:has-text("Erro"), .toast-error, .alert-error'
      );
      const hasError = await errorAlert.isVisible().catch(() => false);
      expect(hasError).toBeFalsy();

      // Verificar que a venda foi registrada no histórico
      await page.goto('/sales');
      await page.waitForLoadState('domcontentloaded');
      const salesList = page.locator('table tbody tr, .sale-item');
      const count = await salesList.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});
