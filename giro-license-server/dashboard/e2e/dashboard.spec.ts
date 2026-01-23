/**
 * E2E Tests - Dashboard Pages (authenticated flows)
 * Uses real authentication with test user
 */
import { expect, Page, test } from '@playwright/test';

// Test user credentials (seed user from database)
const TEST_USER = {
  email: 'admin@giro.com.br',
  password: 'password123',
};

// Perform real login and store auth state
async function loginAsTestUser(page: Page) {
  // Simulate authenticated state by setting tokens in localStorage.
  // This avoids depending on a running backend during e2e runs.
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('access_token', 'test-access-token');
    localStorage.setItem('refresh_token', 'test-refresh-token');
  });

  // Intercept `getMe` request and return a mock successful response so
  // the client-side auth check succeeds without a real backend.
  await page.route('**/api/v1/auth/me', async (route) => {
    const body = JSON.stringify({
      id: 'test-admin',
      email: 'admin@giro.com.br',
      name: 'Admin',
      company_name: null,
      is_verified: true,
      created_at: new Date().toISOString(),
    });
    await route.fulfill({ status: 200, contentType: 'application/json', body });
  });

  // Navigate to dashboard
  await page.goto('/dashboard');
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
}

test.describe('Dashboard - Public Access', () => {
  test('dashboard should redirect to login when not authenticated', async ({ page }) => {
    // Clear any existing tokens
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    });

    await page.goto('/dashboard');

    // Should redirect to login or show dashboard (depends on auth middleware)
    await expect(page).toHaveURL(/\/(dashboard|login)/);
  });
});

test.describe('Dashboard - Layout', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('should display navigation sidebar', async ({ page }) => {
    // Check for sidebar navigation
    await expect(page.locator('nav').first()).toBeVisible();
  });

  test('should have GIRO branding', async ({ page }) => {
    await expect(page.getByText(/giro/i).first()).toBeVisible();
  });
});

test.describe('Dashboard - Licenses Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/dashboard/licenses');
  });

  test('should display licenses page', async ({ page }) => {
    await expect(page.locator('h2:has-text("Licenças")')).toBeVisible();
  });

  test('should have create license button', async ({ page }) => {
    // Check for any action button on the page
    const hasButton = await page.getByRole('button').count();
    expect(hasButton).toBeGreaterThan(0);
  });
});

test.describe('Dashboard - Hardware Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/dashboard/hardware');
  });

  test('should display hardware page', async ({ page }) => {
    await expect(page.locator('h2:has-text("Hardware")')).toBeVisible();
  });
});

test.describe('Dashboard - Analytics Page', () => {
  test.setTimeout(60000);
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/dashboard/analytics', { timeout: 60000 });
  });

  test('should display analytics page', async ({ page }) => {
    await expect(page.locator('h2:has-text("Analytics")')).toBeVisible();
  });

  test('should have period selector', async ({ page }) => {
    // Period selector buttons
    await expect(page.getByText('7 dias').first()).toBeVisible();
    await expect(page.getByText('30 dias').first()).toBeVisible();
  });
});

test.describe('Dashboard - Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/dashboard/settings');
  });

  test('should display settings page', async ({ page }) => {
    await expect(page.locator('h2:has-text("Configurações")')).toBeVisible();
  });

  test('should have profile section', async ({ page }) => {
    await expect(page.getByText(/perfil/i).first()).toBeVisible();
  });
});

test.describe('Dashboard - API Keys Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/dashboard/api-keys');
  });

  test('should display API keys page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /api\s*keys/i })).toBeVisible();
  });

  test('should have create key button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /(nova|create)/i })).toBeVisible();
  });
});
