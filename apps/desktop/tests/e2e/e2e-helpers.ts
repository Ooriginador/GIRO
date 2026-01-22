import type { Page } from '@playwright/test';

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

export const ensureLicensePresent = async (page: Page): Promise<void> => {
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
  await page.context().addInitScript((state) => {
    try {
      // set license key in localStorage and a global bypass flag for test runs
      localStorage.setItem('giro-license', JSON.stringify(state));
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
  }, licenseState);

  // Also mark business profile as configured to avoid wizard redirection during E2E
  await page.context().addInitScript(() => {
    try {
      const profile = { businessType: 'RETAIL', isConfigured: true };
      localStorage.setItem('giro-business-profile', JSON.stringify(profile));
    } catch {
      void 0;
    }
  });
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
