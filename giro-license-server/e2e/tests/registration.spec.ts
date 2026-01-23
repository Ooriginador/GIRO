import { test, expect, type Page } from '@playwright/test';

const API_BASE = process.env.API_BASE || 'http://localhost:8001/api/v1';
const PRODUCTION_URL = 'https://giro-website-production.up.railway.app';

test.describe('Registration Flow - Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Enhanced logging for debugging
    page.on('console', msg => console.log(`BROWSER [${msg.type()}]: ${msg.text()}`));
    page.on('pageerror', err => console.log(`BROWSER ERROR: ${err.message}`));
    page.on('response', response => {
      const url = response.url();
      const status = response.status();
      if (url.includes('/api/') || url.includes('register') || url.includes('auth')) {
        console.log(`API RESPONSE: ${status} ${response.request().method()} ${url}`);
      }
      if (status >= 400) {
        console.log(`ERROR RESPONSE: ${status} ${response.statusText()} ${url}`);
      }
    });
  });

  // Helper function to fill registration form
  async function fillRegistrationForm(page: Page, data: {
    name: string;
    email: string;
    company?: string;
    phone?: string;
    password: string;
  }) {
    await page.fill('input[name="name"]', data.name);
    await page.fill('input[name="email"]', data.email);
    if (data.company) {
      await page.fill('input[name="company_name"]', data.company);
    }
    if (data.phone) {
      await page.fill('input[name="phone"]', data.phone);
    }
    await page.fill('input[name="password"]', data.password);
    await page.fill('input[name="confirmPassword"]', data.password);
  }

  test('should display registration page with all required fields', async ({ page }) => {
    await page.goto('/register');
    
    // Verify page title/header
    await expect(page.getByText(/crie sua conta/i)).toBeVisible({ timeout: 5000 });
    
    // Verify all form fields exist
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
    
    // Verify submit button exists
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Verify link to login exists
    await expect(page.getByRole('link', { name: /entrar|login/i })).toBeVisible();
  });

  test('should successfully register a new user', async ({ page }) => {
    const uniqueEmail = `test-reg-${Date.now()}@e2e.giro.com.br`;
    
    await page.goto('/register');
    await expect(page.getByText(/crie sua conta/i)).toBeVisible({ timeout: 5000 });
    
    // Fill form with valid data
    await fillRegistrationForm(page, {
      name: 'E2E Registration Test',
      email: uniqueEmail,
      company: 'Test Company E2E',
      phone: '11999887766',
      password: 'SecurePass123!',
    });
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should show loading state
    await expect(page.getByText(/criando conta/i)).toBeVisible({ timeout: 1000 });
    
    // Should redirect to login on success
    await expect(page).toHaveURL(/\/(login|$)/, { timeout: 15000 });
    await expect(page.getByText(/bem-vindo de volta/i)).toBeVisible();
  });

  test('should show error for duplicate email registration', async ({ page }) => {
    // Use a known existing email (must exist in the database)
    const existingEmail = 'e2e-test@giro.com.br';
    
    await page.goto('/register');
    await expect(page.getByText(/crie sua conta/i)).toBeVisible({ timeout: 5000 });
    
    await fillRegistrationForm(page, {
      name: 'Duplicate Test',
      email: existingEmail,
      password: 'DuplicatePass123!',
    });
    
    await page.click('button[type="submit"]');
    
    // Should show error message and stay on register page
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/register/);
    
    // Should display error (either in toast or inline)
    const hasError = await page.getByText(/email.*exist|já cadastrado|já existe/i).isVisible()
      .catch(() => false);
    expect(hasError).toBe(true);
  });

  test('should validate password mismatch', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByText(/crie sua conta/i)).toBeVisible({ timeout: 5000 });
    
    await page.fill('input[name="name"]', 'Password Mismatch Test');
    await page.fill('input[name="email"]', `mismatch-${Date.now()}@e2e.giro.com.br`);
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword456!');
    
    await page.click('button[type="submit"]');
    
    // Should show password mismatch error
    await expect(page.getByText(/senhas não conferem|passwords don't match/i)).toBeVisible({ timeout: 3000 });
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByText(/crie sua conta/i)).toBeVisible({ timeout: 5000 });
    
    await page.fill('input[name="name"]', 'Invalid Email Test');
    await page.fill('input[name="email"]', 'invalid-email-format');
    await page.fill('input[name="password"]', 'ValidPass123!');
    await page.fill('input[name="confirmPassword"]', 'ValidPass123!');
    
    await page.click('button[type="submit"]');
    
    // Should show email validation error
    await expect(page.getByText(/email.*inválido|invalid email/i)).toBeVisible({ timeout: 3000 });
  });

  test('should require all mandatory fields', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByText(/crie sua conta/i)).toBeVisible({ timeout: 5000 });
    
    // Click submit without filling any fields
    await page.click('button[type="submit"]');
    
    // Should show required field errors
    const errors = await page.locator('.text-red-500, .text-destructive, [class*="error"]').count();
    expect(errors).toBeGreaterThan(0);
  });

  test('should validate password strength', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByText(/crie sua conta/i)).toBeVisible({ timeout: 5000 });
    
    await page.fill('input[name="name"]', 'Weak Password Test');
    await page.fill('input[name="email"]', `weak-${Date.now()}@e2e.giro.com.br`);
    await page.fill('input[name="password"]', '123'); // Too short/weak
    await page.fill('input[name="confirmPassword"]', '123');
    
    await page.click('button[type="submit"]');
    
    // Should show password strength/length error
    await page.waitForTimeout(1000);
    const hasError = await page.getByText(/senha.*curta|senha.*fraca|password.*short|password.*weak|mínimo/i).isVisible()
      .catch(() => false);
    // Either shows error or form doesn't submit
    const stillOnRegister = await page.url().includes('/register');
    expect(hasError || stillOnRegister).toBe(true);
  });

  test('should navigate to login page when clicking login link', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByText(/crie sua conta/i)).toBeVisible({ timeout: 5000 });
    
    // Find and click login link
    await page.click('text=/já tem.*conta|entrar|login/i');
    
    // Should navigate to login page
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});

// API Tests for Registration endpoint
test.describe('Registration API - Direct Tests', () => {
  const API_URL = process.env.API_URL || 'http://backend:8080/api/v1';

  test('should return 201 for valid registration', async ({ request }) => {
    const uniqueEmail = `api-test-${Date.now()}@e2e.giro.com.br`;
    
    const response = await request.post(`${API_URL}/auth/register`, {
      data: {
        name: 'API Test User',
        email: uniqueEmail,
        password: 'SecureApiPass123!',
        company_name: 'API Test Company',
        phone: '11988776655',
      },
    });
    
    const status = response.status();
    console.log(`Registration API response: ${status}`);
    
    // Should return 201 Created or 200 OK
    expect([200, 201]).toContain(status);
    
    const body = await response.json();
    expect(body).toHaveProperty('message');
  });

  test('should return 400/409 for duplicate email', async ({ request }) => {
    const existingEmail = 'e2e-test@giro.com.br';
    
    const response = await request.post(`${API_URL}/auth/register`, {
      data: {
        name: 'Duplicate API Test',
        email: existingEmail,
        password: 'DuplicateApiPass123!',
      },
    });
    
    const status = response.status();
    console.log(`Duplicate registration response: ${status}`);
    
    // Should return 400 Bad Request or 409 Conflict
    expect([400, 409]).toContain(status);
  });

  test('should return 400 for missing required fields', async ({ request }) => {
    const response = await request.post(`${API_URL}/auth/register`, {
      data: {
        // Missing name and password
        email: 'incomplete@test.com',
      },
    });
    
    const status = response.status();
    console.log(`Missing fields response: ${status}`);
    
    // Should return 400 Bad Request or 422 Unprocessable Entity
    expect([400, 422]).toContain(status);
  });
});
