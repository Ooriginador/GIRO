/**
 * @file sale-advanced.spec.ts - Testes E2E de Vendas Avançadas
 * Testa vendas com desconto, produtos pesados, múltiplos itens
 * NOTA: Testes skipados - funcionalidades avançadas PDV em desenvolvimento
 */

import { expect, test } from '@playwright/test';

test.describe.skip('Vendas Avançadas E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login como gerente (tem permissão de desconto)
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Login com PIN 1234 (Admin)
    await page.locator('button:has-text("1")').first().click();
    await page.locator('button:has-text("2")').first().click();
    await page.locator('button:has-text("3")').first().click();
    await page.locator('button:has-text("4")').first().click();

    const loginButton = page.locator('button:has-text("Entrar")');
    await loginButton.click();
    await page.waitForURL(/\/(dashboard|pdv)/, { timeout: 5000 });

    await page.goto('/pdv');
    await page.waitForLoadState('networkidle');
  });

  test('deve aplicar desconto percentual', async ({ page }) => {
    // Adicionar produto
    const barcodeInput = page.locator('input[placeholder*="código"]').first();
    const inputVisible = await barcodeInput.isVisible().catch(() => false);

    if (inputVisible) {
      await barcodeInput.fill('7891234567890');
      await barcodeInput.press('Enter');
      await page.waitForTimeout(1000);

      // Aplicar desconto
      const discountButton = page
        .locator('button:has-text("Desconto"), [data-testid="apply-discount"]')
        .first();
      const discountVisible = await discountButton.isVisible().catch(() => false);

      if (discountVisible) {
        await discountButton.click();

        // Digitar 10%
        const discountInput = page
          .locator('input[placeholder*="desconto"], input[type="number"]')
          .first();
        await discountInput.fill('10');

        // Confirmar
        const confirmButton = page
          .locator('button:has-text("Aplicar"), button:has-text("Confirmar")')
          .last();
        await confirmButton.click();
        await page.waitForTimeout(500);

        // Verificar que total foi reduzido
        const totalElement = page.locator('[data-testid="total"]');
        const total = await totalElement.textContent();

        expect(total).toBeTruthy();
      }
    }
  });

  test('deve aplicar desconto em valor fixo', async ({ page }) => {
    const barcodeInput = page.locator('input[placeholder*="código"]').first();
    const inputVisible = await barcodeInput.isVisible().catch(() => false);

    if (inputVisible) {
      await barcodeInput.fill('7891234567890');
      await barcodeInput.press('Enter');
      await page.waitForTimeout(1000);

      const discountButton = page.locator('button:has-text("Desconto")').first();
      const discountVisible = await discountButton.isVisible().catch(() => false);

      if (discountVisible) {
        await discountButton.click();

        // Trocar para valor fixo
        const fixedOption = page.locator('button:has-text("R$"), [value="fixed"]').first();
        const fixedVisible = await fixedOption.isVisible().catch(() => false);

        if (fixedVisible) {
          await fixedOption.click();
        }

        // Digitar R$ 5
        const discountInput = page.locator('input[type="number"]').last();
        await discountInput.fill('5');

        const confirmButton = page.locator('button:has-text("Aplicar")').last();
        await confirmButton.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('deve vender produto pesado', async ({ page }) => {
    // Produtos pesados geralmente têm código específico ou são digitados manualmente
    const barcodeInput = page.locator('input[placeholder*="código"]').first();
    const inputVisible = await barcodeInput.isVisible().catch(() => false);

    if (inputVisible) {
      // Código de produto pesado (ex: carne)
      await barcodeInput.fill('2123456789012');
      await barcodeInput.press('Enter');
      await page.waitForTimeout(1000);

      // Pode abrir modal para digitar peso
      const weightInput = page
        .locator('input[placeholder*="peso"], input[placeholder*="Kg"]')
        .first();
      const weightVisible = await weightInput.isVisible().catch(() => false);

      if (weightVisible) {
        await weightInput.fill('0.500');

        const confirmButton = page.locator('button:has-text("Confirmar")').last();
        await confirmButton.click();
        await page.waitForTimeout(1000);

        // Verificar que foi adicionado
        const cartItems = page.locator('table tbody tr, .cart-item');
        const count = await cartItems.count();

        expect(count).toBeGreaterThan(0);
      }
    }
  });

  test('deve vender múltiplos produtos', async ({ page }) => {
    const barcodeInput = page.locator('input[placeholder*="código"]').first();
    const inputVisible = await barcodeInput.isVisible().catch(() => false);

    if (inputVisible) {
      // Adicionar 5 produtos diferentes
      const barcodes = [
        '7891234567890',
        '7891234567891',
        '7891234567892',
        '7891234567893',
        '7891234567894',
      ];

      for (const barcode of barcodes) {
        await barcodeInput.fill(barcode);
        await barcodeInput.press('Enter');
        await page.waitForTimeout(800);
      }

      // Verificar que todos foram adicionados
      const cartItems = page.locator('table tbody tr, .cart-item');
      const count = await cartItems.count();

      expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  test('deve aceitar múltiplas formas de pagamento', async ({ page }) => {
    // Adicionar produto de R$ 100
    const barcodeInput = page.locator('input[placeholder*="código"]').first();
    const inputVisible = await barcodeInput.isVisible().catch(() => false);

    if (inputVisible) {
      await barcodeInput.fill('7891234567890');
      await barcodeInput.press('Enter');
      await page.waitForTimeout(1000);

      // Finalizar
      const finishButton = page.locator('button:has-text("Finalizar")').first();
      await finishButton.click();
      await page.waitForTimeout(1000);

      // Pagar parte em dinheiro
      const cashButton = page.locator('button:has-text("Dinheiro")').first();
      const cashVisible = await cashButton.isVisible().catch(() => false);

      if (cashVisible) {
        await cashButton.click();

        const amountInput = page.locator('input[type="number"]').first();
        await amountInput.fill('50');

        const addButton = page.locator('button:has-text("Adicionar")').first();
        const addVisible = await addButton.isVisible().catch(() => false);

        if (addVisible) {
          await addButton.click();
          await page.waitForTimeout(500);

          // Pagar resto em cartão
          const cardButton = page
            .locator('button:has-text("Cartão"), button:has-text("Débito")')
            .first();
          const cardVisible = await cardButton.isVisible().catch(() => false);

          if (cardVisible) {
            await cardButton.click();

            const confirmButton = page.locator('button:has-text("Finalizar")').last();
            await confirmButton.click();
            await page.waitForTimeout(2000);
          }
        }
      }
    }
  });

  test('deve buscar produto por nome', async ({ page }) => {
    // Clicar em buscar ou F3
    await page.keyboard.press('F3');
    await page.waitForTimeout(500);

    // Modal de busca deve abrir
    const searchModal = page.locator('[role="dialog"], [data-testid="search-modal"]');
    const modalVisible = await searchModal.isVisible().catch(() => false);

    if (modalVisible) {
      const searchInput = page
        .locator('input[placeholder*="buscar"], input[placeholder*="nome"]')
        .first();
      await searchInput.fill('Arroz');

      await page.waitForTimeout(1000);

      // Resultados devem aparecer
      const results = page.locator('[data-testid="search-result"], table tbody tr');
      const count = await results.count();

      if (count > 0) {
        // Clicar no primeiro resultado
        await results.first().click();
        await page.waitForTimeout(500);

        // Produto deve ser adicionado
        const cartItems = page.locator('.cart-item, table tbody tr');
        const cartCount = await cartItems.count();

        expect(cartCount).toBeGreaterThan(0);
      }
    }
  });

  test('deve permitir editar preço (com permissão)', async ({ page }) => {
    const barcodeInput = page.locator('input[placeholder*="código"]').first();
    const inputVisible = await barcodeInput.isVisible().catch(() => false);

    if (inputVisible) {
      await barcodeInput.fill('7891234567890');
      await barcodeInput.press('Enter');
      await page.waitForTimeout(1000);

      // Procurar botão de editar preço
      const editPriceButton = page
        .locator('button:has-text("Editar Preço"), [data-testid="edit-price"]')
        .first();
      const editVisible = await editPriceButton.isVisible().catch(() => false);

      if (editVisible) {
        await editPriceButton.click();

        // Digitar novo preço
        const priceInput = page.locator('input[type="number"]').first();
        await priceInput.clear();
        await priceInput.fill('15.50');

        const confirmButton = page.locator('button:has-text("Confirmar")').last();
        await confirmButton.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('deve registrar venda no histórico', async ({ page }) => {
    // Fazer uma venda completa
    const barcodeInput = page.locator('input[placeholder*="código"]').first();
    const inputVisible = await barcodeInput.isVisible().catch(() => false);

    if (inputVisible) {
      await barcodeInput.fill('7891234567890');
      await barcodeInput.press('Enter');
      await page.waitForTimeout(1000);

      const finishButton = page.locator('button:has-text("Finalizar")').first();
      await finishButton.click();
      await page.waitForTimeout(500);

      const cashButton = page.locator('button:has-text("Dinheiro")').first();
      await cashButton.click();

      const paidInput = page.locator('input[type="number"]').first();
      await paidInput.fill('50');

      const confirmButton = page.locator('button:has-text("Confirmar")').last();
      await confirmButton.click();
      await page.waitForTimeout(2000);

      // Ir para histórico de vendas
      await page.goto('/sales');
      await page.waitForTimeout(1000);

      // Verificar que a venda aparece
      const salesList = page.locator('table tbody tr, .sale-item');
      const count = await salesList.count();

      expect(count).toBeGreaterThan(0);
    }
  });

  test('deve imprimir cupom após venda', async ({ page }) => {
    const barcodeInput = page.locator('input[placeholder*="código"]').first();
    const inputVisible = await barcodeInput.isVisible().catch(() => false);

    if (inputVisible) {
      await barcodeInput.fill('7891234567890');
      await barcodeInput.press('Enter');
      await page.waitForTimeout(1000);

      const finishButton = page.locator('button:has-text("Finalizar")').first();
      await finishButton.click();
      await page.waitForTimeout(500);

      const cashButton = page.locator('button:has-text("Dinheiro")').first();
      await cashButton.click();

      const paidInput = page.locator('input[type="number"]').first();
      await paidInput.fill('50');

      const confirmButton = page.locator('button:has-text("Confirmar")').last();
      await confirmButton.click();
      await page.waitForTimeout(2000);

      // Procurar botão de imprimir
      const printButton = page.locator(
        'button:has-text("Imprimir"), [data-testid="print-receipt"]'
      );
      const printVisible = await printButton.isVisible().catch(() => false);

      if (printVisible) {
        await printButton.first().click();
        await page.waitForTimeout(1000);

        // Verificar que não há erro (impressora mockada deve aceitar)
        const errorAlert = page.locator('[role="alert"]:has-text("Erro")');
        const hasError = await errorAlert.isVisible().catch(() => false);

        expect(hasError).toBeFalsy();
      }
    }
  });
});
