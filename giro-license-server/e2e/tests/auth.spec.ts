import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:8001/api/v1';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log(`BROWSER LOG [${msg.type()}]: ${msg.text()}`));
    page.on('pageerror', err => console.log(`BROWSER ERROR: ${err.message}`));
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log(`RESPONSE ERROR: ${response.status()} ${response.request().method()} ${response.url()}`);
      }
    });
  });

  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    
    await expect(page.locator('h1').first()).toContainText(/bem-vindo de volta/i);
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should register a new user', async ({ page }) => {
    const uniqueEmail = `test-${Date.now()}@e2e.giro.com.br`;
    
    await page.goto('/register');
    await expect(page.getByText('Crie sua conta')).toBeVisible({ timeout: 5000 });
    const startToken = await page.evaluate(() => localStorage.getItem('token'));
    console.log('\nDEBUG: Token at start:', startToken);
    
    // Fill registration form (only required fields: name, email, password, confirmPassword)
    await page.fill('input[name="name"]', 'E2E Test User');
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.fill('input[name="confirmPassword"]', 'SecurePass123!');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Check logs after submit
    await page.waitForTimeout(2000);
    const endToken = await page.evaluate(() => localStorage.getItem('token'));
    console.log('DEBUG: Token after submit:', endToken);
    
    // Should redirect to login (wait for content)
    await expect(page.getByText('Bem-vindo de volta')).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/\/(login|$)/);
  });

  test('should login with seeded test user', async ({ page }) => {
    // Navigate with redirect param to ensure we go to dashboard
    await page.goto('/login?redirect=/dashboard');
    
    await page.fill('input[type="email"], input[name="email"]', 'e2e-test@giro.com.br');
    await page.fill('input[type="password"]', 'testpassword123');
    
    // Mock window.alert to avoid blocking
    page.on('dialog', dialog => dialog.accept());

    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    
    // Verify dashboard content - the dashboard shows "Olá, [First Name]" not "E2E Test Admin"
    await expect(page.getByText(/Olá, E2E/i)).toBeVisible({ timeout: 10000 });
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"], input[name="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    
    await page.click('button[type="submit"]');
    
    // Should show error message and stay on login page
    await expect(page).toHaveURL(/\/login/);
  });
});
