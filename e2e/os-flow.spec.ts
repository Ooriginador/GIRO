import { test, expect } from '@playwright/test';

// Fluxo de Ordens de Serviço — criar, editar, adicionar item e imprimir
// Ajuste seletores e rotas conforme o app local.

test.describe('Ordens de Serviço - Fluxo principal', () => {
  test('cria OS, adiciona produto/serviço, finaliza e visualiza impressão', async ({ page }) => {
    await page.goto('/os');

    // Novo OS
    await page.getByRole('button', { name: /nova ord(e|em) de serviço|nova os/i }).click();

    // Preencher cliente
    await page.getByLabel('Cliente').fill('João Silva');

    // Adicionar produto
    const prodSearch = page.getByPlaceholder('Buscar produto');
    await prodSearch.fill('parafuso');
    await page.getByText('Parafuso 1/4').click();

    // Adicionar serviço
    await page.getByLabel('Serviço').fill('Troca de óleo');
    await page.getByRole('button', { name: /adicionar serviço/i }).click();

    // Salvar OS
    await page.getByRole('button', { name: /salvar|finalizar os/i }).click();

    // Visualizar impressão (preview)
    await page.getByRole('button', { name: /imprimir|visualizar impressão/i }).click();

    await expect(page.getByText(/comprovante|ordem de serviço/i)).toBeVisible();
  });
});
import { test, expect } from '@playwright/test';

// Fluxo de Ordens de Serviço — criar, editar, adicionar item, finalizar e imprimir
// Observação: ajuste seletores / baseURL conforme a configuração do projeto.

test.describe('Ordens de Serviço - Fluxo básico', () => {
  test('cria OS, adiciona produto/serviço e finaliza com impressão', async ({ page }) => {
    await page.goto('/os');

    // Criar nova OS
    await page.getByRole('button', { name: /nova os|nova ordem/i }).click();

    // Preencher campos principais
    await page.getByLabel('Cliente').fill('João Silva');
    await page.getByLabel('Descrição').fill('Manutenção preventiva');

    // Adicionar produto
    const prodSearch = page.getByPlaceholder('Buscar produto');
    await prodSearch.fill('bateria');
    await page.getByText('Bateria 12V').click();

    // Salvar OS
    await page.getByRole('button', { name: /salvar|finalizar os/i }).click();

    // Verificar impressão/layout (pode abrir modal ou gerar PDF)
    await page.getByRole('button', { name: /imprimir|gerar comprovante/i }).click();

    await expect(page.getByText(/Comprovante|Ordem de Serviço/i)).toBeVisible();
  });
});
