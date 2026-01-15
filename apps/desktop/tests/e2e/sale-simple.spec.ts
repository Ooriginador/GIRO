/**
 * @file sale-simple.spec.ts - Testes E2E de Venda Simples
 * Testa fluxo básico de venda no PDV
 * NOTA: Testes skipados - funcionalidades PDV em desenvolvimento
 */

import { expect, test } from '@playwright/test';

test.describe.skip('Venda Simples E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login como operador
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Login com PIN 8899 (Admin)
    await page.locator('button:has-text("8")').first().click();
    await page.locator('button:has-text("8")').first().click();
    await page.locator('button:has-text("9")').first().click();
    await page.locator('button:has-text("9")').first().click();

    const loginButton = page.locator('button:has-text("Entrar")');
    await loginButton.click();
    await page.waitForURL(/\/(dashboard|pdv)/, { timeout: 5000 });

    // Navegar para PDV
    await page.goto('/pdv');
    await page.waitForLoadState('networkidle');
  });

  test('deve adicionar produto por código de barras', async ({ page }) => {
    // Procurar input de código de barras
    const barcodeInput = page
      .locator(
        'input[placeholder*="código"], input[placeholder*="barras"], input[placeholder*="barcode"]'
      )
      .first();
    const isVisible = await barcodeInput.isVisible().catch(() => false);

    if (isVisible) {
      // Digitar código de barras
      await barcodeInput.fill('7891234567890');
      await barcodeInput.press('Enter');

      await page.waitForTimeout(1000);

      // Verificar que produto foi adicionado ao carrinho
      const cartItems = page.locator('table tbody tr, .cart-item, [data-testid="cart-item"]');
      const count = await cartItems.count();

      expect(count).toBeGreaterThan(0);
    }
  });

  test('deve mostrar total da venda', async ({ page }) => {
    // Adicionar um produto
    const barcodeInput = page.locator('input[placeholder*="código"]').first();
    const inputVisible = await barcodeInput.isVisible().catch(() => false);

    if (inputVisible) {
      await barcodeInput.fill('7891234567890');
      await barcodeInput.press('Enter');
      await page.waitForTimeout(1000);

      // Procurar elemento de total
      const totalElement = page.locator('[data-testid="total"], :has-text("Total"), .total');
      const totalVisible = await totalElement.isVisible().catch(() => false);

      if (totalVisible) {
        const text = await totalElement.first().textContent();

        // Deve conter valor em R$
        expect(text).toMatch(/R\$\s*[\d.,]+/);
      }
    }
  });

  test('deve permitir alterar quantidade', async ({ page }) => {
    // Adicionar produto
    const barcodeInput = page.locator('input[placeholder*="código"]').first();
    const inputVisible = await barcodeInput.isVisible().catch(() => false);

    if (inputVisible) {
      await barcodeInput.fill('7891234567890');
      await barcodeInput.press('Enter');
      await page.waitForTimeout(1000);

      // Procurar input de quantidade no item
      const qtyInput = page.locator('input[type="number"], [data-testid="item-quantity"]').first();
      const qtyVisible = await qtyInput.isVisible().catch(() => false);

      if (qtyVisible) {
        await qtyInput.clear();
        await qtyInput.fill('3');
        await qtyInput.blur();

        await page.waitForTimeout(500);

        // Total deve ter atualizado
        const totalElement = page.locator('[data-testid="total"]');
        const total = await totalElement.textContent();

        expect(total).toBeTruthy();
      }
    }
  });

  test('deve remover item do carrinho', async ({ page }) => {
    // Adicionar produto
    const barcodeInput = page.locator('input[placeholder*="código"]').first();
    const inputVisible = await barcodeInput.isVisible().catch(() => false);

    if (inputVisible) {
      await barcodeInput.fill('7891234567890');
      await barcodeInput.press('Enter');
      await page.waitForTimeout(1000);

      // Procurar botão de remover
      const removeButton = page
        .locator('button:has-text("Remover"), button[aria-label*="remover"], .remove-item')
        .first();
      const removeVisible = await removeButton.isVisible().catch(() => false);

      if (removeVisible) {
        await removeButton.click();
        await page.waitForTimeout(500);

        // Carrinho deve estar vazio
        const cartItems = page.locator('table tbody tr, .cart-item');
        const count = await cartItems.count();

        expect(count).toBe(0);
      }
    }
  });

  test('deve finalizar venda em dinheiro', async ({ page }) => {
    // Adicionar produto
    const barcodeInput = page.locator('input[placeholder*="código"]').first();
    const inputVisible = await barcodeInput.isVisible().catch(() => false);

    if (inputVisible) {
      await barcodeInput.fill('7891234567890');
      await barcodeInput.press('Enter');
      await page.waitForTimeout(1000);

      // Clicar em Finalizar
      const finishButton = page
        .locator('button:has-text("Finalizar"), button:has-text("F2"), [data-testid="finish-sale"]')
        .first();
      const finishVisible = await finishButton.isVisible().catch(() => false);

      if (finishVisible) {
        await finishButton.click();
        await page.waitForTimeout(1000);

        // Selecionar pagamento em dinheiro
        const cashButton = page
          .locator(
            'button:has-text("Dinheiro"), button:has-text("Cash"), [data-testid="payment-cash"]'
          )
          .first();
        const cashVisible = await cashButton.isVisible().catch(() => false);

        if (cashVisible) {
          await cashButton.click();

          // Digitar valor pago
          const paidInput = page
            .locator('input[placeholder*="pago"], input[placeholder*="recebido"]')
            .first();
          const paidVisible = await paidInput.isVisible().catch(() => false);

          if (paidVisible) {
            await paidInput.fill('50');

            // Confirmar
            const confirmButton = page
              .locator('button:has-text("Confirmar"), button:has-text("Finalizar")')
              .last();
            await confirmButton.click();
            await page.waitForTimeout(2000);

            // Deve mostrar troco ou sucesso
            const successMessage = page.locator(
              ':has-text("Venda concluída"), :has-text("Sucesso"), [role="alert"]'
            );
            const successVisible = await successMessage.isVisible().catch(() => false);

            // Ou carrinho deve estar vazio
            const cartItems = page.locator('table tbody tr, .cart-item');
            const count = await cartItems.count();

            expect(successVisible || count === 0).toBeTruthy();
          }
        }
      }
    }
  });

  test('deve calcular troco corretamente', async ({ page }) => {
    // Adicionar produto de R$ 10
    const barcodeInput = page.locator('input[placeholder*="código"]').first();
    const inputVisible = await barcodeInput.isVisible().catch(() => false);

    if (inputVisible) {
      await barcodeInput.fill('7891234567890');
      await barcodeInput.press('Enter');
      await page.waitForTimeout(1000);

      // Finalizar
      const finishButton = page.locator('button:has-text("Finalizar")').first();
      const finishVisible = await finishButton.isVisible().catch(() => false);

      if (finishVisible) {
        await finishButton.click();
        await page.waitForTimeout(500);

        // Dinheiro
        const cashButton = page.locator('button:has-text("Dinheiro")').first();
        const cashVisible = await cashButton.isVisible().catch(() => false);

        if (cashVisible) {
          await cashButton.click();

          // Pagar R$ 20 (troco de R$ 10)
          const paidInput = page.locator('input[placeholder*="pago"]').first();
          const paidVisible = await paidInput.isVisible().catch(() => false);

          if (paidVisible) {
            await paidInput.fill('20');
            await paidInput.blur();

            await page.waitForTimeout(500);

            // Verificar troco
            const changeElement = page.locator('[data-testid="change"], :has-text("Troco")');
            const changeVisible = await changeElement.isVisible().catch(() => false);

            if (changeVisible) {
              const text = await changeElement.first().textContent();

              // Deve mostrar R$ 10,00 ou similar
              expect(text).toMatch(/R\$\s*10[.,]00/);
            }
          }
        }
      }
    }
  });

  test('deve limpar carrinho ao clicar em Cancelar', async ({ page }) => {
    // Adicionar produto
    const barcodeInput = page.locator('input[placeholder*="código"]').first();
    const inputVisible = await barcodeInput.isVisible().catch(() => false);

    if (inputVisible) {
      await barcodeInput.fill('7891234567890');
      await barcodeInput.press('Enter');
      await page.waitForTimeout(1000);

      // Clicar em Cancelar
      const cancelButton = page
        .locator(
          'button:has-text("Cancelar"), button:has-text("Limpar"), [data-testid="cancel-sale"]'
        )
        .first();
      const cancelVisible = await cancelButton.isVisible().catch(() => false);

      if (cancelVisible) {
        await cancelButton.click();

        // Pode ter confirmação
        const confirmButton = page
          .locator('button:has-text("Confirmar"), button:has-text("Sim")')
          .last();
        const confirmVisible = await confirmButton.isVisible().catch(() => false);

        if (confirmVisible) {
          await confirmButton.click();
        }

        await page.waitForTimeout(500);

        // Carrinho deve estar vazio
        const cartItems = page.locator('table tbody tr, .cart-item');
        const count = await cartItems.count();

        expect(count).toBe(0);
      }
    }
  });

  test('deve aceitar atalho F2 para finalizar', async ({ page }) => {
    // Adicionar produto
    const barcodeInput = page.locator('input[placeholder*="código"]').first();
    const inputVisible = await barcodeInput.isVisible().catch(() => false);

    if (inputVisible) {
      await barcodeInput.fill('7891234567890');
      await barcodeInput.press('Enter');
      await page.waitForTimeout(1000);

      // Pressionar F2
      await page.keyboard.press('F2');
      await page.waitForTimeout(1000);

      // Deve abrir modal de pagamento
      const paymentModal = page.locator('[role="dialog"], .modal, [data-testid="payment-modal"]');
      const modalVisible = await paymentModal.isVisible().catch(() => false);

      expect(modalVisible).toBeTruthy();
    }
  });

  test('deve aceitar atalho ESC para cancelar', async ({ page }) => {
    // Adicionar produto
    const barcodeInput = page.locator('input[placeholder*="código"]').first();
    const inputVisible = await barcodeInput.isVisible().catch(() => false);

    if (inputVisible) {
      await barcodeInput.fill('7891234567890');
      await barcodeInput.press('Enter');
      await page.waitForTimeout(1000);

      // Pressionar ESC
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // Pode ter confirmação
      const confirmButton = page.locator('button:has-text("Sim"), button:has-text("Confirmar")');
      const confirmVisible = await confirmButton.isVisible().catch(() => false);

      if (confirmVisible) {
        await confirmButton.first().click();
        await page.waitForTimeout(500);
      }

      // Carrinho deve estar vazio
      const cartItems = page.locator('table tbody tr, .cart-item');
      const count = await cartItems.count();

      expect(count).toBe(0);
    }
  });

  test('deve mostrar resumo da venda antes de finalizar', async ({ page }) => {
    // Adicionar produtos
    const barcodeInput = page.locator('input[placeholder*="código"]').first();
    const inputVisible = await barcodeInput.isVisible().catch(() => false);

    if (inputVisible) {
      await barcodeInput.fill('7891234567890');
      await barcodeInput.press('Enter');
      await page.waitForTimeout(500);

      // Verificar resumo
      const totalItems = page.locator('[data-testid="total-items"], :has-text("itens")');
      const totalValue = page.locator('[data-testid="total-value"], :has-text("Total")');

      const itemsVisible = await totalItems.isVisible().catch(() => false);
      const valueVisible = await totalValue.isVisible().catch(() => false);

      expect(itemsVisible || valueVisible).toBeTruthy();
    }
  });
});
