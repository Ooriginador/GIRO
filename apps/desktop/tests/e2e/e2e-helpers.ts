import type { Page } from '@playwright/test';
import { seedAll, seedProducts, seedEnterpriseData, clearDatabase } from './seeders/database-seeder';

export const dismissTutorialIfPresent = async (page: Page): Promise<void> => {
  // Tenta fechar/pular o tutorial ou dialogos de onboarding que fiquem sobrepostos
  const skipButton = page.getByRole('button', { name: /Pular/i }).first();
  const closeButton = page.getByRole('button', { name: /Fechar tutorial|Fechar/i }).first();

  try {
    // Tentar esperar o botão por até 3s e clicar se aparecer
    await skipButton.waitFor({ state: 'visible', timeout: 3000 });
    await skipButton.click();
    await page.waitForLoadState('domcontentloaded');
  } catch {
    void 0;
  }

  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click();
    await page.waitForLoadState('domcontentloaded');
    return;
  }

  // Como fallback, fecha dialogs com Escape (se houver)
  try {
    await page.keyboard.press('Escape');
    await page.waitForLoadState('domcontentloaded', { timeout: 1000 }).catch(() => undefined);
  } catch {
    void 0;
  }

  // Se ainda estiver em telas de setup/ativação que bloqueiam o fluxo de login,
  // tentamos forçar a rota de login para estabilizar os testes.
  const activateHeading = page.locator('h3:has-text("Ativar Licença")');
  const firstAdminHeading = page.locator('h3:has-text("Criar Primeiro Administrador")');
  if (
    (await activateHeading.isVisible().catch(() => false)) ||
    (await firstAdminHeading.isVisible().catch(() => false))
  ) {
    try {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
    } catch {
      void 0;
    }
  }
};

export const ensureLicensePresent = async (page: Page, businessType = 'GROCERY'): Promise<void> => {
  const licenseState = {
    licenseKey: 'TEST-LOCAL-KEY',
    licenseInfo: {
      status: 'active',
      expires_at: '2099-01-01T00:00:00.000Z',
      metadata: {},
    },
    lastValidation: new Date().toISOString(),
  };

  // Inject localStorage and test bypass flag before any page scripts run
  await page.context().addInitScript(
    (args) => {
      try {
        // set license key in localStorage and a global bypass flag for test runs
        localStorage.setItem('giro-license', JSON.stringify(args.licenseState));
        try {
          (globalThis as unknown as Record<string, unknown>).__E2E_BYPASS_LICENSE = true;
          // Also signal that an admin exists to avoid the initial setup flow
          (globalThis as unknown as Record<string, unknown>).__E2E_HAS_ADMIN = true;
        } catch {
          void 0;
        }
      } catch {
        void 0;
      }
    },
    { licenseState }
  );

  // Also mark business profile as configured to avoid wizard redirection during E2E
  // And disable tutorials to avoid blocking UI elements
  await page.context().addInitScript((type) => {
    console.log('--- INJECTING PROFILE ---', type);
    try {
      const profileState = {
        state: {
          businessType: type,
          isConfigured: true,
        },
        version: 0,
      };
      localStorage.setItem('giro-business-profile', JSON.stringify(profileState));

      const tutorials = {
        state: {
          settings: {
            enabled: false,
            showWelcomeOnFirstLogin: false,
          },
        },
        version: 0,
      };
      localStorage.setItem('giro-tutorials', JSON.stringify(tutorials));
    } catch {
      void 0;
    }
  }, businessType);
};

export const loginWithPin = async (page: Page, pin: string): Promise<void> => {
  // Garantir que nenhum tutorial esteja bloqueando o teclado numérico
  await dismissTutorialIfPresent(page);

  for (const digit of pin.split('')) {
    await page.locator(`button:has-text("${digit}")`).first().click();
  }

  await page.locator('button:has-text("Entrar")').first().click();

  await page
    .waitForURL(/\/(dashboard|pdv|cash|stock)/, {
      timeout: 15000,
    })
    .catch(() => undefined);

  await page.waitForLoadState('domcontentloaded');
  await dismissTutorialIfPresent(page);
};

export const ensureLoggedIn = async (page: Page, pin: string): Promise<void> => {
  const pinPrompt = page.getByText(/Digite seu PIN/i).first();
  if (await pinPrompt.isVisible().catch(() => false)) {
    await loginWithPin(page, pin);
  }
};

export const ensureCashOpen = async (page: Page): Promise<void> => {
  const startUrl = page.url();

  await dismissTutorialIfPresent(page);

  const cashClosedHeading = page.getByRole('heading', { name: 'Caixa Fechado' }).first();
  const isCashClosed = await cashClosedHeading.isVisible().catch(() => false);
  if (!isCashClosed) return;

  const openButton = page.getByRole('button', { name: 'Abrir Caixa' }).first();
  await openButton.click();

  await page.waitForURL(/\/cash/, { timeout: 10000 }).catch(() => undefined);
  await page.waitForLoadState('domcontentloaded');
  await dismissTutorialIfPresent(page);

  const dialog = page.getByRole('dialog', { name: /Abrir Caixa/i });

  // No PDV, o botão apenas navega para /cash; no /cash, é necessário clicar novamente para abrir o dialog.
  if (!(await dialog.isVisible().catch(() => false))) {
    const openButtonOnCash = page.getByRole('button', { name: 'Abrir Caixa' }).first();
    if (await openButtonOnCash.isVisible().catch(() => false)) {
      await openButtonOnCash.click();
    }
  }

  await dialog.waitFor({ state: 'visible', timeout: 10000 });

  const initialInput = dialog.locator('input').first();
  await initialInput.fill('100');

  const confirmButton = dialog.getByRole('button', { name: /Abrir/i }).last();
  await confirmButton.click();

  await dialog.waitFor({ state: 'hidden', timeout: 10000 });
  await page.waitForLoadState('domcontentloaded');

  // Se abrimos o caixa vindo do PDV, voltamos para o PDV para manter o teste no fluxo esperado.
  if (startUrl.includes('/pdv')) {
    await page.goto('/pdv');
    await page.waitForLoadState('domcontentloaded');
    await dismissTutorialIfPresent(page);
  }
};

/**
 * Helper to select a value from a Shadcn UI Select component
 * @param page - Playwright page
 * @param triggerTestId - data-testid of the SelectTrigger
 * @param value - The value to select (text of the option)
 */
export const selectShadcnOption = async (
  page: Page,
  triggerTestId: string,
  value: string
): Promise<void> => {
  // Click the trigger to open the dropdown
  await page.click(`[data-testid="${triggerTestId}"]`);
  // Wait for the dropdown content to appear and click the option
  await page.getByRole('option', { name: value }).click();
};

/**
 * Helper to open the filters panel on list pages
 * @param page - Playwright page
 */
export const openFiltersPanel = async (page: Page): Promise<void> => {
  const filtersButton = page.getByRole('button', { name: /Filtros/i });
  const isExpanded = await filtersButton.getAttribute('aria-expanded');
  if (isExpanded !== 'true') {
    await filtersButton.click();
    // Wait for filters panel to be visible
    await page
      .locator('[id="contract-filters"]')
      .waitFor({ state: 'visible', timeout: 5000 })
      .catch(() => undefined);
  }
};

/**
 * Helper for onboarding tests - sets up license but NOT business profile
 * This allows testing the wizard flow
 * @param page - Playwright page
 */
export const ensureLicenseOnlyForOnboarding = async (page: Page): Promise<void> => {
  const licenseState = {
    licenseKey: 'TEST-LOCAL-KEY',
    licenseInfo: {
      status: 'active',
      expires_at: '2099-01-01T00:00:00.000Z',
      metadata: {},
    },
    lastValidation: new Date().toISOString(),
  };

  await page.context().addInitScript(
    (args) => {
      try {
        localStorage.setItem('giro-license', JSON.stringify(args.licenseState));
        // Mock DB with admin employee for login
        localStorage.setItem(
          '__giro_web_mock_db__',
          JSON.stringify({
            employees: [
              {
                id: 'seed-admin',
                name: 'Administrador Semente',
                role: 'ADMIN',
                pin: '8899',
                isActive: true,
              },
            ],
            currentCashSession: null,
            cashSessionHistory: [],
          })
        );
        try {
          (globalThis as unknown as Record<string, unknown>).__E2E_BYPASS_LICENSE = true;
          (globalThis as unknown as Record<string, unknown>).__E2E_HAS_ADMIN = true;
        } catch {
          void 0;
        }
      } catch {
        void 0;
      }
    },
    { licenseState }
  );

// ========================================
// DATABASE SEEDING HELPERS
// ========================================

/**
 * Seeds all test data (products, employees, contracts, materials)
 */
export async function seedAllTestData(page: Page): Promise<void> {
  await seedAll(page);
}

/**
 * Seeds only products (for sale/stock tests)
 */
export async function seedProductData(page: Page): Promise<void> {
  await seedProducts(page);
}

/**
 * Seeds enterprise data (contracts, materials, work fronts)
 */
export async function seedEnterpriseTestData(page: Page): Promise<void> {
  await seedEnterpriseData(page);
}

/**
 * Clears all test data from database
 */
export async function clearTestData(page: Page): Promise<void> {
  await clearDatabase(page);
}
};
