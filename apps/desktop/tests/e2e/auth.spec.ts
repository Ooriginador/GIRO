/**
 * @file auth.spec.ts - Testes E2E de Autenticação
 * Testa fluxo completo de login/logout com diferentes roles
 */

import { expect, test } from '@playwright/test';

test.describe('Autenticação E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Aguardar app carregar
    await page.waitForLoadState('domcontentloaded');
  });

  test('deve exibir página de login ao iniciar', async ({ page }) => {
    // Verificar título em h3 (CardTitle)
    const loginHeading = page.locator('h3:has-text("GIRO")');
    await expect(loginHeading).toBeVisible({ timeout: 10000 });

    // Verificar instrução
    const instruction = page.locator('p:has-text("Digite seu PIN para entrar")');
    await expect(instruction).toBeVisible();
  });

  test('deve fazer login com PIN de admin (1234)', async ({ page }) => {
    // Clicar nos botões do teclado numérico
    await page.locator('button:has-text("1")').first().click();
    await page.locator('button:has-text("2")').first().click();
    await page.locator('button:has-text("3")').first().click();
    await page.locator('button:has-text("4")').first().click();

    // Clicar em Entrar
    const loginButton = page.locator('button:has-text("Entrar")');
    await loginButton.click();

    // Aguardar redirecionamento (após login redireciona para dashboard/pdv/cash)
    await page.waitForURL(/\/(dashboard|pdv|cash)/, { timeout: 5000 });

    // Verificar que não está mais na página de login
    await expect(page).not.toHaveURL(/login/);
  });

  test('deve rejeitar PIN inválido', async ({ page }) => {
    // Digitar PIN inválido (8888)
    await page.locator('button:has-text("8")').first().click();
    await page.locator('button:has-text("8")').first().click();
    await page.locator('button:has-text("8")').first().click();
    await page.locator('button:has-text("8")').first().click();

    const loginButton = page.locator('button:has-text("Entrar")');
    await loginButton.click();

    // Aguardar possível resposta
    await page.waitForTimeout(1000);

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
