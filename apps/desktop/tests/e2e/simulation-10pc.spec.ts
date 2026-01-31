/**
 * @file simulation-10pc.spec.ts
 * @description Simulação de carga de uma rede com 10 PCs operando simultaneamente.
 * Baseado na topologia de rede documentada em docs/NETWORK-TOPOLOGY-10PC.md
 */

import { Page, test } from '@playwright/test';
import { dismissTutorialIfPresent, ensureLicensePresent } from './e2e-helpers';

// Duração da simulação em milissegundos (padrão 1 hora se não definido via env)
// Para "algumas horas", ajuste SIMULATION_DURATION ou via variável de ambiente
const DURATION_MS = process.env.SIMULATION_DURATION
  ? parseInt(process.env.SIMULATION_DURATION)
  : 60 * 60 * 1000;
const END_TIME = Date.now() + DURATION_MS;

// Utilitário para pausas aleatórias (simulando tempo de raciocínio do usuário)
const randomPause = async (page: Page, min = 1000, max = 5000) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  await page.waitForTimeout(delay);
};

// Login Padrão (PIN 8899)
const performLogin = async (page: Page, pcName: string) => {
  console.log(`[${pcName}] Iniciando login...`);
  // Usar rota de teste que bypassa LicenseGuard
  await page.goto('/__test-login');
  await dismissTutorialIfPresent(page);

  // Se já estiver logado (dashboard), retorna
  if ((await page.url().includes('dashboard')) || (await page.url().includes('pdv'))) {
    console.log(`[${pcName}] Já logado.`);
    return;
  }

  // Clica no PIN 8899
  const digit8 = page.locator('button:has-text("8")').first();
  const digit9 = page.locator('button:has-text("9")').first();

  if (await digit8.isVisible()) {
    await digit8.click();
    await digit8.click();
    await digit9.click();
    await digit9.click();

    const loginBtn = page.locator('button:has-text("Entrar")');
    if (await loginBtn.isVisible()) {
      await loginBtn.click();
      await page.waitForURL(/\/(dashboard|pdv)/, { timeout: 10000 }).catch(() => {});
    }
  }

  await dismissTutorialIfPresent(page);
  console.log(`[${pcName}] Login concluído.`);
};

// --- FLUXOS ESPECÍFICOS ---

// fluxo PC-PDV: Venda rápida, pagamento em dinheiro/pix
const runPdvFlow = async (page: Page, pcName: string) => {
  console.log(`[${pcName}] Executando fluxo de PDV`);
  await page.goto('/pdv');
  await page.waitForTimeout(2000); // Carregamento

  // Adicionar produto (simulando busca por código comum)
  const productCodes = ['7891234567890', '7890001112223', 'arroz', 'feijao'];
  const searchInput = page.locator(
    'input[placeholder*="Buscar produto"], input[placeholder*="código"]'
  );

  // Tenta adicionar 1 a 3 produtos por venda
  const itemsCount = Math.floor(Math.random() * 3) + 1;

  for (let i = 0; i < itemsCount; i++) {
    if (await searchInput.isVisible()) {
      const term = productCodes[Math.floor(Math.random() * productCodes.length)];
      await searchInput.fill(term);
      await page.waitForTimeout(500); // debounce

      // Se aparecer resultado na lista dropdown, clica, senão enter
      const firstResult = page.locator('[role="option"], .search-result-item').first();

      if (await firstResult.isVisible()) {
        await firstResult.click();
      } else {
        await searchInput.press('Enter');
      }

      await randomPause(page, 500, 1500);
    }
  }

  // Finalizar Venda (F10 ou botão)
  const finishBtn = page.getByRole('button', { name: /finalizar|pagamento/i });
  if (await finishBtn.isVisible()) {
    await finishBtn.click();
  } else {
    await page.keyboard.press('F10');
  }

  await page.waitForTimeout(1000);

  // Selecionar Pagamento (Dinheiro ou PIX)
  const isPix = Math.random() > 0.5;
  const paymentMethod = isPix ? /pix/i : /dinheiro/i;

  await page
    .getByRole('button', { name: paymentMethod })
    .click()
    .catch(() => {});

  // Confirmar valor (geralmente auto-preenchido, mas clica confirmar)
  const confirmPayment = page.getByRole('button', { name: /confirmar|concluir/i }).last();
  await confirmPayment.click().catch(() => {});

  // Esperar tela de sucesso / recibo
  await page
    .getByText(/venda realizada|sucesso/i)
    .waitFor({ timeout: 5000 })
    .catch(() => {});

  // Nova Venda
  await page.keyboard.press('Escape');
  await page.goto('/pdv'); // Reset for next loop
};

// fluxo PC-ESTQ: Ajuste de estoque, consulta
const runStockFlow = async (page: Page, pcName: string) => {
  console.log(`[${pcName}] Executando fluxo de Estoque`);
  await page.goto('/stock');

  // Filtra produtos
  const filterInput = page.locator('input[placeholder*="Buscar"]');
  await filterInput.fill('a');
  await page.waitForTimeout(1000);

  // Seleciona um produto aleatório para editar
  const editButtons = page.locator('tr button[aria-label="Editar"], tr .edit-btn');
  const count = await editButtons.count();

  if (count > 0) {
    const randomIndex = Math.floor(Math.random() * Math.min(count, 5));
    await editButtons.nth(randomIndex).click();
    await randomPause(page, 2000, 4000); // Simulando conferência

    // Fecha modal
    await page.keyboard.press('Escape');
  }
};

// fluxo PC-GER: Dashboard e Relatórios
const runManagerFlow = async (page: Page, pcName: string) => {
  console.log(`[${pcName}] Executando fluxo Gerencial`);

  // Ver Dashboard
  await page.goto('/dashboard');
  await randomPause(page, 3000, 6000); // Analisando gráficos

  // Ver Relatórios
  await page.goto('/reports');
  const reportTab = page.getByRole('tab', { name: /vendas|faturamento/i }).first();
  if (await reportTab.isVisible()) {
    await reportTab.click();
    await randomPause(page, 2000, 5000);
  }
};

// fluxo PC-VEN: Orçamentos
const runSalesFlow = async (page: Page, pcName: string) => {
  console.log(`[${pcName}] Executando fluxo de Orçamentos`);
  await page.goto('/sales/quotes'); // Rota hipotética de orçamentos ou vendas balcão
  await randomPause(page, 1000, 3000);

  // Se rota não existir, vai pro PDV mas não finaliza (só consulta preço)
  if (page.url().includes('404')) {
    await page.goto('/pdv');
    await page.locator('input[placeholder*="Buscar"]').fill('consulta preço');
    await page.waitForTimeout(2000);
  }
};

// --- DEFINIÇÃO DOS 10 PCs ---

const simulationConfig = [
  { id: 'PC-PDV-01', type: 'PDV', role: 'Frente de Caixa' },
  { id: 'PC-PDV-02', type: 'PDV', role: 'Frente de Caixa' },
  { id: 'PC-ESTQ', type: 'STOCK', role: 'Estoquista' },
  { id: 'PC-GER', type: 'MANAGER', role: 'Gerente' },
  { id: 'PC-CAD', type: 'STOCK', role: 'Cadastrador' },
  { id: 'PC-FIN', type: 'MANAGER', role: 'Financeiro' },
  { id: 'PC-VEN-01', type: 'SALES', role: 'Vendedor' },
  { id: 'PC-VEN-02', type: 'SALES', role: 'Vendedor' },
  { id: 'PC-ADM', type: 'MANAGER', role: 'Administrador' },
  { id: 'PC-RESERVA', type: 'PDV', role: 'Caixa Reserva' }, // 10º PC
];

// SKIP: Simulation tests are resource-intensive and require dedicated environment
test.describe.skip('Simulação de Rede 10 PCs', () => {
  test.beforeEach(async ({ page }) => {
    // Setup inicial de ambiente limpo simulado
    await ensureLicensePresent(page);
  });

  // Cria um teste dinâmico para cada PC
  for (const pc of simulationConfig) {
    test(`[${pc.id}] Simulação ${pc.role}`, async ({ page }) => {
      // 1. Login
      await performLogin(page, pc.id);

      console.log(`[${pc.id}] Iniciando ciclo de simulação de ${DURATION_MS / 1000 / 60} minutos.`);

      // 2. Loop Infinito (até timeout)
      let cycles = 0;
      while (Date.now() < END_TIME) {
        cycles++;
        console.log(`[${pc.id}] Ciclo #${cycles}`);

        try {
          switch (pc.type) {
            case 'PDV':
              await runPdvFlow(page, pc.id);
              break;
            case 'STOCK':
              await runStockFlow(page, pc.id);
              break;
            case 'MANAGER':
              await runManagerFlow(page, pc.id);
              break;
            case 'SALES':
              await runSalesFlow(page, pc.id);
              break;
          }
        } catch (e) {
          console.error(`[${pc.id}] Erro no ciclo ${cycles}:`, e);
          // Recupera de erro indo para home (via rota de teste)
          await page.goto('/__test-login');
          await page.waitForTimeout(2000);
        }

        await randomPause(page, 1000, 3000);
      }

      console.log(`[${pc.id}] Simulação Finalizada. Ciclos completados: ${cycles}`);
    });
  }
});
