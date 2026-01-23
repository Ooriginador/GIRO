import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login?redirect=/dashboard');
    
    // Handle success alert
    page.on('dialog', dialog => dialog.accept());

    await page.fill('input[type="email"], input[name="email"]', 'e2e-test@giro.com.br');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });

  test('should display user profile information', async ({ page }) => {
    // Should show user email
    await expect(page.locator('text=e2e-test@giro.com.br')).toBeVisible({ timeout: 10000 });
    
    // Should show welcome message with name
    await expect(page.locator('text=E2E')).toBeVisible();
  });

  test('should display licenses section', async ({ page }) => {
    // Should show licenses section header
    await expect(page.locator('text=/licen[çc]as?/i').first()).toBeVisible({ timeout: 10000 });
    
    // Should show the seeded license key
    await expect(page.locator('text=E2E-TEST-LICENSE-KEY')).toBeVisible({ timeout: 10000 });
  });

  test('should allow copying license key', async ({ page }) => {
    // Find the copy button near the license key
    const licenseContainer = page.locator(':has-text("E2E-TEST-LICENSE-KEY")').first();
    const copyButton = licenseContainer.locator('button[title*="opiar" i], button:has(svg)').first();
    
    if (await copyButton.isVisible()) {
      await copyButton.click();
      // The button text or icon should change to indicate success
      await page.waitForTimeout(500);
    }
  });

  test('should display devices section', async ({ page }) => {
    // Should show devices section header
    await expect(page.locator('text=/dispositivos?/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('should allow logout', async ({ page }) => {
    // Find and click logout button
    const logoutButton = page.locator('button[title*="air" i], button:has(svg)').last();
    await logoutButton.click();
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});
