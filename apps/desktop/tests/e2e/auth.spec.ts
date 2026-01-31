import { expect, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { dismissTutorialIfPresent, ensureLicensePresent } from './e2e-helpers';

/**
 * @file auth.spec.ts - Testes E2E de Autenticação
 * Testa fluxo completo de login/logout com diferentes roles e métodos (PIN/Senha)
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
  });

  test('deve exibir página de login (modo PIN) ao iniciar', async ({ page }) => {
    const loginHeading = page.locator('h3:has-text("GIRO")');
    await expect(loginHeading).toBeVisible({ timeout: 10000 });

    const instruction = page.locator('p:has-text("Digite seu PIN para entrar")').first();
    await expect(instruction).toBeVisible({ timeout: 15000 });
  });

  test('deve fazer login com PIN de admin (8899)', async ({ page }) => {
    await page.locator('button:has-text("8")').first().click();
    await page.locator('button:has-text("8")').first().click();
    await page.locator('button:has-text("9")').first().click();
    await page.locator('button:has-text("9")').first().click();

    await page.locator('button:has-text("Entrar")').click();

    await page.waitForURL(/\/(dashboard|pdv|cash|wizard)/, { timeout: 5000 });
    await expect(page).not.toHaveURL(/login/);
  });

  test('deve rejeitar PIN inválido', async ({ page }) => {
    await page.locator('button:has-text("1")').first().click();
    await page.locator('button:has-text("2")').first().click();
    await page.locator('button:has-text("3")').first().click();
    await page.locator('button:has-text("4")').first().click();

    await page.locator('button:has-text("Entrar")').click();
    await expect(page.locator('p.text-destructive')).toContainText(/PIN incorreto|Erro/i);
  });

  // --- NOVOS TESTES (Dual Auth) ---

  test('deve alternar para modo Senha', async ({ page }) => {
    const switchButton = page.locator('button:has-text("Sou Administrador/Gerente")');
    await expect(switchButton).toBeVisible();
    await switchButton.click();

    // Verificar se mudou para o formulário de senha
    await expect(page.locator('label:has-text("Usuário ou CPF")')).toBeVisible();
    await expect(page.locator('button:has-text("Entrar com Senha")')).toBeVisible();
    
    // Verificar botão voltar
    const backButton = page.locator('button:has-text("Voltar")');
    await expect(backButton).toBeVisible();
    await backButton.click();
    
    // Confirma que voltou para PIN
    await expect(page.locator('p:has-text("Digite seu PIN para entrar")')).toBeVisible();
  });

  test('deve fazer login com Senha (admin/admin)', async ({ page }) => {
    await page.locator('button:has-text("Sou Administrador/Gerente")').click();

    await page.fill('input[placeholder="Digite seu usuário"]', 'admin');
    await page.fill('input[placeholder="Digite sua senha"]', 'admin'); // Assumindo default seed
    await page.locator('button:has-text("Entrar com Senha")').click();

    await page.waitForURL(/\/(dashboard|pdv|cash|wizard)/, { timeout: 5000 });
    await expect(page).not.toHaveURL(/login/);
  });

  test('deve validar campos obrigatórios no modo Senha', async ({ page }) => {
    await page.locator('button:has-text("Sou Administrador/Gerente")').click();
    await page.locator('button:has-text("Entrar com Senha")').click();

    await expect(page.locator('text=Por favor, preencha todos os campos')).toBeVisible();
  });

  test('deve navegar para Recuperação de Senha', async ({ page }) => {
    await page.locator('button:has-text("Sou Administrador/Gerente")').click();
    await page.locator('button:has-text("Esqueceu a senha?")').click();

    await expect(page).toHaveURL(/\/auth\/forgot-password/);
    await expect(page.locator('h3:has-text("Esqueceu a Senha?")')).toBeVisible();
    
    // Testar botão voltar
    await page.locator('button:has-text("Voltar")').click();
    await expect(page).toHaveURL(/\/(login|__test-login)/);
  });
});
