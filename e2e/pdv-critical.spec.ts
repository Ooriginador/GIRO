import { test, expect } from '@playwright/test';

// PDV crítico — fluxo de venda com pagamento misto
// Observação: ajuste seletores / baseURL conforme a configuração do projeto.

test.describe('PDV - Fluxo crítico (adicionar produto → pagamento misto)', () => {
  test('adiciona item, aplica pagamento misto e confirma recibo', async ({ page }) => {
    // Ajuste: use baseURL no playwright.config.ts (ex: http://localhost:3000)
    await page.goto('/pdv');

    // Buscar produto por nome ou barcode
    const search = page.getByPlaceholder('Buscar produto');
    await search.fill('arroz');
    await page.waitForTimeout(200); // debounce

    // Selecionar resultado (ajustar selector conforme app)
    await page.getByText('Arroz 5kg').click();

    // Abrir finalização (tecla F10 ou botão)
    await page.keyboard.press('F10');

    // Selecionar pagamento Dinheiro e informar valor
    await page.getByRole('button', { name: /dinheiro/i }).click();
    await page.getByLabel('Valor pago').fill('30');

    // Adicionar pagamento PIX
    await page.getByRole('button', { name: /pix/i }).click();
    await page.getByLabel('Valor pago').fill('20');

    // Confirmar pagamento
    await page.getByRole('button', { name: /confirmar/i }).click();

    // Esperar confirmação de venda
    await expect(page.getByText(/venda realizada|recibo/i)).toBeVisible();
  });
});
