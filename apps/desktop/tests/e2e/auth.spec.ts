import { expect, test } from '@playwright/test';
import { dismissTutorialIfPresent, ensureLicensePresent } from './e2e-helpers';
import fs from 'fs';
import path from 'path';

/**
 * @file auth.spec.ts - Testes E2E de Autenticação
 * Testa fluxo completo de login/logout com diferentes roles
 */

test.describe('Autenticação E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Garantir que a licença esteja presente antes do carregamento da aplicação
    await ensureLicensePresent(page);
    // Navigate directly to test-only login route to avoid LicenseGuard during E2E
    await page.goto('/__test-login');
    // Aguardar app carregar
    await page.waitForLoadState('domcontentloaded');
    await dismissTutorialIfPresent(page);

    // Dump localStorage to test-results for debugging origin/keys
    try {
      const storage = await page.evaluate(() => {
        const out: Record<string, string | null> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k) out[k] = localStorage.getItem(k);
        }
        return out;
      });
      // Print to stdout so Playwright captures it in the run log
      // (helps debugging when file write didn't occur)

      console.log('DEBUG_LOCALSTORAGE:', JSON.stringify(storage));
      const outDir = path.resolve(process.cwd(), 'test-results');
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(
        path.join(outDir, 'debug-localstorage.json'),
        JSON.stringify(storage, null, 2)
      );
    } catch {
      // ignore debug write failures
    }
  });

  test('deve exibir página de login ao iniciar', async ({ page }) => {
    // Verificar título em h3 (CardTitle)
    const loginHeading = page.locator('h3:has-text("GIRO")');
    await expect(loginHeading).toBeVisible({ timeout: 10000 });

    // Verificar instrução
    const instruction = page.locator('p:has-text("Digite seu PIN para entrar")');
    await expect(instruction).toBeVisible({ timeout: 15000 });
  });

  test('deve fazer login com PIN de admin (8899)', async ({ page }) => {
    // Clicar nos botões do teclado numérico
    await page.locator('button:has-text("8")').first().click();
    await page.locator('button:has-text("8")').first().click();
    await page.locator('button:has-text("9")').first().click();
    await page.locator('button:has-text("9")').first().click();

    // Clicar em Entrar
    const loginButton = page.locator('button:has-text("Entrar")');
    await loginButton.click();

    // Aguardar redirecionamento (após login pode redirecionar para dashboard/pdv/cash ou wizard)
    await page.waitForURL(/\/(dashboard|pdv|cash|wizard)/, { timeout: 5000 });

    // Verificar que não está mais na página de login
    await expect(page).not.toHaveURL(/login/);
  });

  test('deve rejeitar PIN inválido', async ({ page }) => {
    // Digitar PIN inválido (8888)
    await page.locator('button:has-text("8")').first().click();
    await page.locator('button:has-text("8")').first().click();
    await page.locator('button:has-text("9")').first().click();
    await page.locator('button:has-text("9")').first().click();

    const loginButton = page.locator('button:has-text("Entrar")');
    await loginButton.click();

    // Aguardar possível resposta e mensagem de erro aparecer
    await page.waitForSelector('p.text-destructive', { timeout: 5000 });

    // Verificar mensagem de erro
    const errorElement = page.locator('p.text-destructive');
    await expect(errorElement).toContainText(/PIN incorreto|Erro/i);

    // Verificar que continua na página de login
    const loginHeading = page.locator('h3:has-text("GIRO")');
    await expect(loginHeading).toBeVisible();
  });

  test('deve limpar PIN ao clicar em Limpar', async ({ page }) => {
    // Digitar algo
    await page.locator('button:has-text("1")').first().click();

    // Verificar se apareceu ponto
    // A classe do ponto muda ou o texto vira '•'
    // LoginPage.tsx: {i < pin.length ? '•' : ''}
    const dot = page.locator('div:has-text("•")').first();
    await expect(dot).toBeVisible();

    // Clicar em C (Limpar)
    await page.locator('button:has-text("C")').first().click();

    // Verificar se limpou (não deve ter pontos)
    await expect(page.locator('div:has-text("•")')).toHaveCount(0);
  });
});
